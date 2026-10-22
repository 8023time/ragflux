import type { DocumentView } from '@ragflux/shared/document';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listDatasets } from '@/apis/dataset';
import {
  batchDocumentStatus,
  createUploadUrl,
  deleteDocument,
  downloadDocument,
  listDocuments,
  parseDocument,
  previewDocument,
  putToStorage,
  registerDocument,
  stopDocument,
  updateDocument,
} from '@/apis/document';
import { useToast } from '@/common/stores/toast';
import { ApiError } from '@/common/utils/api-request';
import { contentTypeForName, fileExtension, hashFile } from '@/common/utils/format';
import { PIPELINE } from '@/pages/document/status';

export interface DocumentPreview {
  name: string;
  url: string;
  text?: string;
  kind: 'image' | 'pdf' | 'text' | 'markdown' | 'file';
}

export function useDocuments(datasetId: number, datasetName = '') {
  const toast = useToast();
  const [items, setItems] = useState<DocumentView[]>([]);
  const [resolvedName, setResolvedName] = useState('');
  const title = datasetName || resolvedName;
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentView | null>(null);
  const [preview, setPreview] = useState<DocumentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const timer = useRef<number | null>(null);

  const hasActive = useMemo(() => items.some((item) => PIPELINE.has(item.status)), [items]);

  const reload = useCallback(async () => {
    try {
      setItems((await listDocuments(datasetId)).data ?? []);
    } catch (error) {
      toast.fromError(error, '加载文档失败');
    } finally {
      setLoading(false);
    }
  }, [datasetId, toast]);

  useEffect(() => {
    if (datasetName) return;
    let cancelled = false;
    listDatasets()
      .then((body) => {
        const found = body.data?.find((item) => item.id === datasetId);
        if (!cancelled && found) setResolvedName(found.name);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [datasetId, datasetName]);

  useEffect(() => {
    void reload();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [reload]);

  useEffect(() => {
    if (!hasActive) return;
    let cancelled = false;
    const tick = async () => {
      const active = items.filter((item) => PIPELINE.has(item.status));
      if (active.length === 0) return;
      try {
        const progress =
          (
            await batchDocumentStatus({
              documentIds: active.map((item) => item.id),
            })
          ).data ?? [];
        if (cancelled) return;
        const finished = progress.some(
          (item) => item.status === 'done' || item.status === 'failed' || item.status === 'cancelled',
        );
        if (finished) {
          await reload();
          return;
        }
        setItems((current) =>
          current.map((item) => {
            const next = progress.find((row) => row.id === item.id);
            return next
              ? {
                  ...item,
                  status: next.status,
                  progress: next.progress,
                  lastError: next.lastError,
                }
              : item;
          }),
        );
      } catch {
        // 单轮进度失败时下一轮再试。
      }
      const cancelling = active.some((item) => item.status === 'cancelling');
      timer.current = window.setTimeout(() => void tick(), cancelling ? 400 : 1500);
    };
    timer.current = window.setTimeout(() => void tick(), 1500);
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [hasActive, items, reload]);

  async function uploadFiles(files: File[]) {
    if (uploading || files.length === 0) return;
    setUploading(true);
    setDragOver(false);
    try {
      for (const file of files) {
        try {
          const fileHash = await hashFile(file);
          const token = (
            await createUploadUrl({
              fileName: file.name,
              contentType: file.type || contentTypeForName(file.name),
              sizeBytes: file.size,
            })
          ).data;
          if (!token) throw new ApiError('获取上传地址失败');
          await putToStorage(token, file);
          await registerDocument(datasetId, {
            name: file.name,
            r2Key: token.r2Key,
            fileHash,
            sizeBytes: file.size,
          });
          toast.success(`「${file.name}」已上传`);
        } catch (error) {
          toast.fromError(error, `上传 ${file.name} 失败`);
        }
      }
      await reload();
    } finally {
      setUploading(false);
    }
  }

  async function openPreview(doc: DocumentView) {
    setPreviewLoading(true);
    try {
      const link = (await previewDocument(doc.id)).data;
      if (!link) throw new ApiError('预览失败');
      const ext = fileExtension(doc.name);
      if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
        setPreview({ name: doc.name, url: link.url, kind: 'image' });
      } else if (ext === 'pdf') {
        setPreview({ name: doc.name, url: link.url, kind: 'pdf' });
      } else if (['txt', 'csv', 'md', 'markdown'].includes(ext)) {
        const text = await fetch(link.url).then((res) => res.text());
        setPreview({
          name: doc.name,
          url: link.url,
          text,
          kind: ext === 'md' || ext === 'markdown' ? 'markdown' : 'text',
        });
      } else {
        setPreview({ name: doc.name, url: link.url, kind: 'file' });
      }
    } catch (error) {
      toast.fromError(error, '预览失败');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function stop(doc: DocumentView) {
    await stopDocument(doc.id);
    toast.success('正在停止解析');
    await reload();
  }

  async function retry(doc: DocumentView) {
    await parseDocument(doc.id);
    toast.success('已重新解析');
    await reload();
  }

  async function download(doc: DocumentView) {
    const link = (await downloadDocument(doc.id)).data;
    if (!link) throw new ApiError('下载失败');
    window.open(link.url, '_blank', 'noopener');
  }

  async function toggleEnabled(doc: DocumentView) {
    const next = (await updateDocument(doc.id, { enabled: !doc.enabled })).data;
    if (!next) throw new ApiError('更新失败');
    setItems((current) => current.map((item) => (item.id === doc.id ? next : item)));
    toast.success(next.enabled ? '文档已启用' : '文档已停用');
  }

  async function remove(doc: DocumentView) {
    await deleteDocument(doc.id);
    toast.success('文档已删除');
    await reload();
  }

  return {
    datasetId,
    items,
    title,
    loading,
    dragOver,
    setDragOver,
    uploading,
    pendingDelete,
    setPendingDelete,
    preview,
    setPreview,
    previewLoading,
    uploadFiles,
    openPreview,
    stop,
    retry,
    download,
    toggleEnabled,
    remove,
    toast,
  };
}

export type DocumentListProps = ReturnType<typeof useDocuments>;
