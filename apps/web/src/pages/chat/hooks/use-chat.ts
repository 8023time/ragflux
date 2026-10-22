import type { ChatStreamEvent, MessageView, SessionView } from '@ragflux/shared/session';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { chatMessageSchema } from '@/apis/chat/schema';
import { createSession, listMessages, listSessions, streamChat, updateSession } from '@/apis/chat';
import { listDatasets, type DatasetRow } from '@/apis/dataset';
import { useToast } from '@/common/stores/toast';
import { ApiError } from '@/common/utils/api-request';
import type { PanelMessage } from '@/pages/chat/chat-panel';

function toPanel(message: MessageView): PanelMessage {
  return {
    id: String(message.id),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    citations: message.citations,
  };
}

export function useChat(sessionId?: number) {
  const navigate = useNavigate();
  const toast = useToast();
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [datasetId, setDatasetId] = useState(0);
  const [activeId, setActiveId] = useState(sessionId ?? 0);
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [emptySessionIds, setEmptySessionIds] = useState<Set<number>>(() => new Set());
  const [sessionsLoadedDatasetId, setSessionsLoadedDatasetId] = useState(0);
  const [checkingSessions, setCheckingSessions] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sessionCheckVersion = useRef(0);
  const skipLoad = useRef(false);

  const dataset = datasets.find((item) => item.id === datasetId);
  const session = sessions.find((item) => item.id === activeId);
  const visibleSessions = useMemo(
    () => sessions.filter((item) => item.status === 1 && item.datasetId === datasetId),
    [sessions, datasetId],
  );

  useEffect(() => {
    let cancelled = false;
    listDatasets()
      .then((body) => {
        if (cancelled) return;
        const items = body.data ?? [];
        setDatasets(items);
        setDatasetId((current) => current || items[0]?.id || 0);
      })
      .catch((error) => toast.fromError(error, '加载知识库失败'));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!datasetId) return;
    let cancelled = false;
    listSessions(datasetId)
      .then((body) => {
        if (!cancelled) {
          setSessions(body.data ?? []);
          setSessionsLoadedDatasetId(datasetId);
          setCheckingSessions(true);
        }
      })
      .catch((error) => toast.fromError(error, '加载会话失败'));
    return () => {
      cancelled = true;
    };
  }, [datasetId, toast]);

  useEffect(() => {
    if (!datasetId) return;
    const currentSessions = sessions.filter((item) => item.status === 1 && item.datasetId === datasetId);
    const checkVersion = ++sessionCheckVersion.current;
    let cancelled = false;
    void Promise.all(
      currentSessions.map(async (item) => ({
        id: item.id,
        hasMessages: ((await listMessages(item.id)).data ?? []).length > 0,
      })),
    )
      .then((results) => {
        if (cancelled || checkVersion !== sessionCheckVersion.current) return;
        setEmptySessionIds(new Set(results.filter((item) => !item.hasMessages).map((item) => item.id)));
      })
      .catch((error) => {
        if (!cancelled && checkVersion === sessionCheckVersion.current) {
          toast.fromError(error, '检查会话状态失败');
        }
      })
      .finally(() => {
        if (!cancelled && checkVersion === sessionCheckVersion.current) {
          setCheckingSessions(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [datasetId, sessions, toast]);

  useEffect(() => {
    if (!sessionId) {
      setActiveId(0);
      if (!skipLoad.current) setMessages([]);
      return;
    }
    setActiveId(sessionId);
    if (skipLoad.current) {
      skipLoad.current = false;
      return;
    }
    let cancelled = false;
    listMessages(sessionId)
      .then((body) => {
        if (!cancelled) setMessages((body.data ?? []).map(toPanel));
      })
      .catch((error) => toast.fromError(error, '加载消息失败'));
    listSessions()
      .then((body) => {
        const found = body.data?.find((item) => item.id === sessionId);
        if (found) setDatasetId(found.datasetId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessionId, toast]);

  function selectSession(id: number) {
    if (streaming) return;
    const found = sessions.find((item) => item.id === id);
    if (found) setDatasetId(found.datasetId);
    navigate(`/chat/${id}`);
  }

  async function createAndSelect() {
    if (!datasetId) return;
    if (checkingSessions || emptySessionIds.size > 0) {
      toast.error('请先完成当前空会话，再新建会话');
      return;
    }
    try {
      const created = (await createSession({ datasetId })).data;
      if (!created) throw new ApiError('新建会话失败');
      setCheckingSessions(true);
      setSessions((current) => [created, ...current]);
      navigate(`/chat/${created.id}`);
    } catch (error) {
      toast.fromError(error, '新建会话失败');
    }
  }

  async function send() {
    const parsed = chatMessageSchema.safeParse(draft);
    if (!parsed.success || streaming || !datasetId) return;
    const content = parsed.data;
    setDraft('');
    let currentId = activeId;
    if (!currentId) {
      if (emptySessionIds.size > 0) {
        toast.error('请先完成当前空会话，再新建会话');
        return;
      }
      try {
        const created = (await createSession({ datasetId })).data;
        if (!created) throw new ApiError('创建会话失败');
        setCheckingSessions(true);
        setSessions((current) => [created, ...current]);
        currentId = created.id;
        setActiveId(created.id);
        skipLoad.current = true;
        navigate(`/chat/${created.id}`);
      } catch (error) {
        toast.fromError(error, '创建会话失败');
        return;
      }
    }
    const now = new Date().toISOString();
    const assistantId = `a-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: 'user', content, createdAt: now },
      { id: assistantId, role: 'assistant', content: '', createdAt: now },
    ]);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat(
        { sessionId: currentId, content },
        {
          signal: controller.signal,
          onEvent: (event: ChatStreamEvent) => {
            if (event.type === 'delta') {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId ? { ...item, content: item.content + event.content } : item,
                ),
              );
            }
            if (event.type === 'done') {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId
                    ? {
                        ...item,
                        id: String(event.messageId),
                        citations: event.citations,
                      }
                    : item,
                ),
              );
            }
            if (event.type === 'error') {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId
                    ? {
                        ...item,
                        content: item.content ? `${item.content}\n\n⚠ ${event.message}` : `⚠ ${event.message}`,
                      }
                    : item,
                ),
              );
            }
          },
        },
      );
      setSessions((await listSessions(datasetId)).data ?? []);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        toast.fromError(error, '回答失败');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return {
    datasets,
    datasetId,
    visibleSessions,
    activeId,
    datasetName: dataset?.name ?? '',
    sessionTitle: session?.title ?? '',
    messages,
    draft,
    streaming,
    canSend: Boolean(dataset) && !streaming,
    canCreateSession: sessionsLoadedDatasetId === datasetId && !checkingSessions && emptySessionIds.size === 0,
    setDraft,
    selectDataset(id: number) {
      setDatasetId(id);
      setActiveId(0);
      setMessages([]);
      setEmptySessionIds(new Set());
      navigate('/chat');
    },
    selectSession,
    createAndSelect,
    renameSession(id: number, title: string) {
      void updateSession(id, { title })
        .then((body) => {
          const next = body.data;
          if (!next) return;
          setSessions((current) => current.map((item) => (item.id === id ? next : item)));
        })
        .catch((error) => toast.fromError(error, '重命名失败'));
    },
    send,
    stop() {
      abortRef.current?.abort();
    },
  };
}
