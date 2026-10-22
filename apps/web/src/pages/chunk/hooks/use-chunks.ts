import type { ChunkView } from '@ragflux/shared/chunk';
import { useEffect, useState } from 'react';
import { chunkContentSchema } from '@/apis/chunk/schema';
import { listChunks, updateChunk } from '@/apis/chunk';
import { getDocument } from '@/apis/document';
import { useToast } from '@/common/stores/toast';
import { ApiError } from '@/common/utils/api-request';
import { formError } from '@/common/utils/form';

export function useChunks(documentId: number) {
  const toast = useToast();
  const [items, setItems] = useState<ChunkView[]>([]);
  const [name, setName] = useState('');
  const [datasetId, setDatasetId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDocument(documentId), listChunks(documentId)])
      .then(([document, chunks]) => {
        if (cancelled || !document.data) return;
        setName(document.data.name);
        setDatasetId(document.data.datasetId);
        setItems(chunks.data ?? []);
      })
      .catch((error) => toast.fromError(error, '加载分块失败'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId, toast]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEdit(chunk: ChunkView) {
    setEditingId(chunk.id);
    setDraft(chunk.content);
  }

  async function toggleEnabled(chunk: ChunkView) {
    const next = (await updateChunk(chunk.id, { enabled: !chunk.enabled })).data;
    if (!next) throw new ApiError('更新失败');
    setItems((current) => current.map((item) => (item.id === chunk.id ? next : item)));
    toast.success(next.enabled ? '分块已启用' : '分块已停用');
  }

  async function save(chunk: ChunkView) {
    const parsed = chunkContentSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      return;
    }
    if (parsed.data === chunk.content) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    try {
      const next = (await updateChunk(chunk.id, { content: parsed.data })).data;
      if (!next) throw new ApiError('保存失败');
      setItems((current) => current.map((item) => (item.id === chunk.id ? next : item)));
      setEditingId(null);
      toast.success('分块已保存');
    } catch (error) {
      toast.fromError(error, '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return {
    items,
    name,
    datasetId,
    loading,
    expanded,
    editingId,
    draft,
    setDraft,
    saving,
    toggle,
    startEdit,
    cancelEdit() {
      setEditingId(null);
    },
    toggleEnabled,
    save,
    toast,
  };
}

export type ChunkListProps = ReturnType<typeof useChunks>;
