"use client";

import type {
  ChatStreamEvent,
  MessageView,
  SessionView,
} from "@ragflux/shared/session";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChatPanel,
  type PanelMessage,
} from "@/features/chat/components/chat-panel";
import { SessionSidebar } from "@/features/chat/components/session-sidebar";
import { chatMessageSchema } from "@/features/chat/schemas";
import {
  createSession,
  listMessages,
  listSessions,
  streamChat,
  updateSession,
} from "@/features/chat/services/chat";
import { listDatasets } from "@/features/dataset/services/datasets";
import type { DatasetRow } from "@/types/dataset";
import { useToast } from "@/stores/toast";

function toPanel(message: MessageView): PanelMessage {
  return {
    id: String(message.id),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    citations: message.citations,
  };
}

export function ChatView({ sessionId }: { sessionId?: number }) {
  const router = useRouter();
  const toast = useToast();
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [sessions, setSessions] = useState<SessionView[]>([]);
  const [datasetId, setDatasetId] = useState(0);
  const [activeId, setActiveId] = useState(sessionId ?? 0);
  const [messages, setMessages] = useState<PanelMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [emptySessionIds, setEmptySessionIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [sessionsLoadedDatasetId, setSessionsLoadedDatasetId] = useState(0);
  const [checkingSessions, setCheckingSessions] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sessionCheckVersion = useRef(0);

  const dataset = datasets.find((item) => item.id === datasetId);
  const session = sessions.find((item) => item.id === activeId);
  const visibleSessions = useMemo(
    () =>
      sessions.filter(
        (item) => item.status === 1 && item.datasetId === datasetId,
      ),
    [sessions, datasetId],
  );
  const skipLoad = useRef(false);

  useEffect(() => {
    let cancelled = false;
    listDatasets()
      .then((items) => {
        if (cancelled) return;
        setDatasets(items);
        setDatasetId((current) => current || items[0]?.id || 0);
      })
      .catch((error) => toast.fromError(error, "加载知识库失败"));
    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!datasetId) return;
    let cancelled = false;
    listSessions(datasetId)
      .then((items) => {
        if (!cancelled) {
          setSessions(items);
          setSessionsLoadedDatasetId(datasetId);
          setCheckingSessions(true);
        }
      })
      .catch((error) => toast.fromError(error, "加载会话失败"));
    return () => {
      cancelled = true;
    };
  }, [datasetId, toast]);

  useEffect(() => {
    if (!datasetId) return;
    const currentSessions = sessions.filter(
      (item) => item.status === 1 && item.datasetId === datasetId,
    );

    const checkVersion = ++sessionCheckVersion.current;
    let cancelled = false;
    void Promise.all(
      currentSessions.map(async (item) => ({
        id: item.id,
        hasMessages: (await listMessages(item.id)).length > 0,
      })),
    )
      .then((results) => {
        if (cancelled || checkVersion !== sessionCheckVersion.current) return;
        setEmptySessionIds(
          new Set(
            results.filter((item) => !item.hasMessages).map((item) => item.id),
          ),
        );
      })
      .catch((error) => {
        if (
          !cancelled &&
          checkVersion === sessionCheckVersion.current
        ) {
          toast.fromError(error, "检查会话状态失败");
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
      .then((items) => {
        if (!cancelled) setMessages(items.map(toPanel));
      })
      .catch((error) => toast.fromError(error, "加载消息失败"));
    listSessions()
      .then((items) => {
        const found = items.find((item) => item.id === sessionId);
        if (found) setDatasetId(found.datasetId);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessionId, toast]);

  async function selectSession(id: number) {
    if (streaming) return;
    const found = sessions.find((item) => item.id === id);
    if (found) setDatasetId(found.datasetId);
    router.push(`/chat/${id}`);
  }

  async function createAndSelect() {
    if (!datasetId) return;
    if (checkingSessions || emptySessionIds.size > 0) {
      toast.error("请先完成当前空会话，再新建会话");
      return;
    }
    try {
      const created = await createSession({ datasetId });
      setCheckingSessions(true);
      setSessions((current) => [created, ...current]);
      router.push(`/chat/${created.id}`);
    } catch (error) {
      toast.fromError(error, "新建会话失败");
    }
  }

  async function send() {
    const parsed = chatMessageSchema.safeParse(draft);
    if (!parsed.success || streaming || !datasetId) return;
    const content = parsed.data;
    setDraft("");
    let currentId = activeId;
    if (!currentId) {
      if (emptySessionIds.size > 0) {
        toast.error("请先完成当前空会话，再新建会话");
        return;
      }
      try {
        const created = await createSession({ datasetId });
        setCheckingSessions(true);
        setSessions((current) => [created, ...current]);
        currentId = created.id;
        setActiveId(created.id);
        skipLoad.current = true;
        router.push(`/chat/${created.id}`);
      } catch (error) {
        toast.fromError(error, "创建会话失败");
        return;
      }
    }
    const now = new Date().toISOString();
    const assistantId = `a-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", content, createdAt: now },
      { id: assistantId, role: "assistant", content: "", createdAt: now },
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
            if (event.type === "delta") {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId
                    ? { ...item, content: item.content + event.content }
                    : item,
                ),
              );
            }
            if (event.type === "done") {
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
            if (event.type === "error") {
              setMessages((current) =>
                current.map((item) =>
                  item.id === assistantId
                    ? {
                        ...item,
                        content: item.content
                          ? `${item.content}\n\n⚠ ${event.message}`
                          : `⚠ ${event.message}`,
                      }
                    : item,
                ),
              );
            }
          },
        },
      );
      const next = await listSessions(datasetId);
      setSessions(next);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.fromError(error, "回答失败");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="flex h-full min-h-0">
      <SessionSidebar
        datasets={datasets}
        selectedDatasetId={datasetId}
        sessions={visibleSessions}
        activeSessionId={activeId}
        onSelectDataset={(id) => {
          setDatasetId(id);
          setActiveId(0);
          setMessages([]);
          setEmptySessionIds(new Set());
          router.push("/chat");
        }}
        onSelectSession={(id) => void selectSession(id)}
        canCreateSession={
          sessionsLoadedDatasetId === datasetId &&
          !checkingSessions &&
          emptySessionIds.size === 0
        }
        onCreateSession={() => void createAndSelect()}
        onRenameSession={(id, title) => {
          void updateSession(id, { title })
            .then((next) => {
              setSessions((current) =>
                current.map((item) => (item.id === id ? next : item)),
              );
            })
            .catch((error) => toast.fromError(error, "重命名失败"));
        }}
      />
      <ChatPanel
        datasetName={dataset?.name ?? ""}
        sessionTitle={session?.title ?? ""}
        messages={messages}
        draft={draft}
        isStreaming={streaming}
        canSend={Boolean(dataset) && !streaming}
        onDraft={setDraft}
        onSend={() => void send()}
        onStop={() => abortRef.current?.abort()}
      />
    </div>
  );
}
