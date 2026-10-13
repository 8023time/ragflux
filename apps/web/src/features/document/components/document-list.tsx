"use client";

import type { DocumentView } from "@ragflux/shared/document";
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  FlaskConical,
  Layers,
  Play,
  RefreshCw,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { listDatasets } from "@/features/dataset/services/datasets";
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
} from "@/features/document/services/documents";
import {
  ACCEPT_FILES,
  contentTypeForName,
  fileExtension,
  formatBytes,
  formatRelativeTime,
  hashFile,
} from "@/lib/format";
import { renderMarkdown } from "@/lib/markdown";
import { useToast } from "@/stores/toast";

const PIPELINE = new Set([
  "pending",
  "parsing",
  "chunking",
  "embedding",
  "cancelling",
]);

const STATUS_TEXT: Record<string, string> = {
  pending: "排队中",
  parsing: "解析中",
  chunking: "分块中",
  embedding: "向量化",
  done: "已完成",
  failed: "失败",
  cancelling: "正在停止",
  cancelled: "已停止",
};

export function DocumentList({
  datasetId,
  datasetName,
}: {
  datasetId: number;
  datasetName: string;
}) {
  const toast = useToast();
  const [items, setItems] = useState<DocumentView[]>([]);
  const [title, setTitle] = useState(datasetName);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentView | null>(null);
  const [preview, setPreview] = useState<{
    name: string;
    url: string;
    text?: string;
    kind: "image" | "pdf" | "text" | "markdown" | "file";
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const timer = useRef<number | null>(null);

  const hasActive = useMemo(
    () => items.some((item) => PIPELINE.has(item.status)),
    [items],
  );

  async function reload() {
    try {
      setItems(await listDocuments(datasetId));
    } catch (error) {
      toast.fromError(error, "加载文档失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setTitle(datasetName);
    if (datasetName) return;
    let cancelled = false;
    listDatasets()
      .then((datasets) => {
        const found = datasets.find((item) => item.id === datasetId);
        if (!cancelled && found) setTitle(found.name);
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
    // 进入文档页时拉取列表。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId]);

  useEffect(() => {
    if (!hasActive) return;
    let cancelled = false;
    const tick = async () => {
      const active = items.filter((item) => PIPELINE.has(item.status));
      if (active.length === 0) return;
      try {
        const progress = await batchDocumentStatus({
          documentIds: active.map((item) => item.id),
        });
        if (cancelled) return;
        const finished = progress.some(
          (item) =>
            item.status === "done" ||
            item.status === "failed" ||
            item.status === "cancelled",
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
      const cancelling = active.some((item) => item.status === "cancelling");
      timer.current = window.setTimeout(
        () => void tick(),
        cancelling ? 400 : 1500,
      );
    };
    timer.current = window.setTimeout(() => void tick(), 1500);
    return () => {
      cancelled = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [hasActive, items]);

  async function uploadFiles(files: File[]) {
    if (uploading || files.length === 0) return;
    setUploading(true);
    setDragOver(false);
    try {
      for (const file of files) {
        try {
          const fileHash = await hashFile(file);
          const token = await createUploadUrl({
            fileName: file.name,
            contentType: file.type || contentTypeForName(file.name),
            sizeBytes: file.size,
          });
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

  async function onPreview(doc: DocumentView) {
    setPreviewLoading(true);
    try {
      const link = await previewDocument(doc.id);
      const ext = fileExtension(doc.name);
      if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) {
        setPreview({ name: doc.name, url: link.url, kind: "image" });
      } else if (ext === "pdf") {
        setPreview({ name: doc.name, url: link.url, kind: "pdf" });
      } else if (["txt", "csv", "md", "markdown"].includes(ext)) {
        const text = await fetch(link.url).then((res) => res.text());
        setPreview({
          name: doc.name,
          url: link.url,
          text,
          kind: ext === "md" || ext === "markdown" ? "markdown" : "text",
        });
      } else {
        setPreview({ name: doc.name, url: link.url, kind: "file" });
      }
    } catch (error) {
      toast.fromError(error, "预览失败");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-gray-950">
      <header className="mx-auto flex w-full max-w-5xl shrink-0 items-center justify-between px-8 py-4">
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link
            href="/datasets"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="size-4" />
            知识库
          </Link>
          <ChevronRight className="size-4 shrink-0 text-gray-300" />
          <span className="truncate font-medium text-gray-900 dark:text-white">
            {title || "文档"}
          </span>
        </div>
        <Link
          href={`/datasets/${datasetId}/retrieval`}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <FlaskConical className="size-4" />
          检索测试
        </Link>
      </header>
      <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-8 py-6">
        <label
          className={`relative mb-6 block overflow-hidden rounded-xl border border-dashed px-6 py-8 text-center ${
            uploading
              ? "cursor-wait border-gray-300"
              : dragOver
                ? "border-blue-400 bg-blue-50 dark:bg-blue-950/40"
                : "cursor-pointer border-gray-300 text-gray-400 hover:border-gray-400 dark:border-gray-700"
          }`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!uploading) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            void uploadFiles([...event.dataTransfer.files]);
          }}
        >
          <input
            type="file"
            multiple
            accept={ACCEPT_FILES}
            disabled={uploading}
            className="hidden"
            onChange={(event) => {
              const files = event.target.files ? [...event.target.files] : [];
              event.target.value = "";
              void uploadFiles(files);
            }}
          />
          <Upload className="mx-auto mb-2 size-8" />
          <p className="text-sm">
            拖拽 txt / csv / md / pdf / docx / xlsx / 图片到此处，或点击上传
          </p>
          <p className="mt-1 text-xs">
            文件经预签名地址直传对象存储，登记后再解析
          </p>
          {uploading ? (
            <p className="mt-3 text-sm text-gray-500">努力上传中...</p>
          ) : null}
        </label>

        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">
            加载中...
          </div>
        ) : null}
        {!loading && items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-gray-800">
            暂无文档
          </div>
        ) : null}
        <div className="space-y-2">
          {items.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center gap-3">
                <FileText className="size-5 shrink-0 text-gray-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {doc.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {STATUS_TEXT[doc.status] ?? doc.status}
                    </span>
                    {doc.status === "done" && !doc.enabled ? (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">
                        已停用
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex min-w-0 items-center gap-3 text-xs text-gray-400">
                    <span>{formatBytes(doc.sizeBytes)}</span>
                    <span>{formatRelativeTime(doc.createdAt)}</span>
                    {doc.lastError ? (
                      <span
                        className="min-w-0 flex-1 truncate text-red-400"
                        title={doc.lastError}
                      >
                        {doc.lastError}
                      </span>
                    ) : null}
                  </div>
                  {PIPELINE.has(doc.status) ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${doc.progress}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {PIPELINE.has(doc.status) && doc.status !== "cancelling" ? (
                    <button
                      type="button"
                      title="停止解析"
                      className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-amber-600"
                      onClick={() =>
                        void stopDocument(doc.id)
                          .then(() => {
                            toast.success("正在停止解析");
                            return reload();
                          })
                          .catch((error) => toast.fromError(error, "停止失败"))
                      }
                    >
                      <Square className="size-4" />
                    </button>
                  ) : null}
                  {doc.status === "cancelled" || doc.status === "failed" ? (
                    <button
                      type="button"
                      title={doc.status === "failed" ? "重试解析" : "继续解析"}
                      className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                      onClick={() =>
                        void parseDocument(doc.id)
                          .then(() => {
                            toast.success("已重新解析");
                            return reload();
                          })
                          .catch((error) => toast.fromError(error, "重试失败"))
                      }
                    >
                      {doc.status === "failed" ? (
                        <RefreshCw className="size-4" />
                      ) : (
                        <Play className="size-4" />
                      )}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    title="预览"
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-100"
                    onClick={() => void onPreview(doc)}
                  >
                    <Eye className="size-4" />
                  </button>
                  <button
                    type="button"
                    title="下载"
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-100"
                    onClick={() =>
                      void downloadDocument(doc.id)
                        .then((link) =>
                          window.open(link.url, "_blank", "noopener"),
                        )
                        .catch((error) => toast.fromError(error, "下载失败"))
                    }
                  >
                    <Download className="size-4" />
                  </button>
                  {doc.status === "done" ? (
                    <Link
                      href={`/documents/${doc.id}/chunks`}
                      title="查看分块"
                      className="rounded-md p-2 text-gray-400 hover:bg-gray-100"
                    >
                      <Layers className="size-4" />
                    </Link>
                  ) : null}
                  {doc.status === "done" ? (
                    <button
                      type="button"
                      title={
                        doc.enabled ? "停用后不参与检索" : "启用后参与检索"
                      }
                      className={`relative h-5 w-9 shrink-0 rounded-full ${doc.enabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
                      onClick={() =>
                        void updateDocument(doc.id, { enabled: !doc.enabled })
                          .then((next) => {
                            setItems((current) =>
                              current.map((item) =>
                                item.id === doc.id ? next : item,
                              ),
                            );
                            toast.success(
                              next.enabled ? "文档已启用" : "文档已停用",
                            );
                          })
                          .catch((error) => toast.fromError(error, "更新失败"))
                      }
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full bg-white shadow ${doc.enabled ? "left-[18px]" : "left-0.5"}`}
                      />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    title="删除"
                    className="rounded-md p-2 text-gray-400 hover:bg-gray-100"
                    onClick={() => setPendingDelete(doc)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {preview || previewLoading ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="关闭"
            onClick={() => setPreview(null)}
          />
          <div className="relative z-10 flex h-[80vh] w-[720px] max-w-[92vw] flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800">
              <h3 className="truncate text-sm font-semibold">
                {preview?.name || "预览"}
              </h3>
              <button
                type="button"
                aria-label="关闭"
                className="rounded-lg p-1.5 text-gray-400"
                onClick={() => setPreview(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            {previewLoading ? (
              <p className="py-16 text-center text-sm text-gray-400">
                加载中...
              </p>
            ) : null}
            {preview?.kind === "markdown" && preview.text ? (
              <div
                className="md-body min-h-0 flex-1 overflow-y-auto p-5 text-sm"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(preview.text),
                }}
              />
            ) : null}
            {preview?.kind === "text" ? (
              <pre className="min-h-0 flex-1 overflow-y-auto p-5 text-sm whitespace-pre-wrap">
                {preview.text}
              </pre>
            ) : null}
            {preview?.kind === "pdf" ? (
              <iframe
                title="PDF 预览"
                src={preview.url}
                className="min-h-0 w-full flex-1 border-0"
              />
            ) : null}
            {preview?.kind === "image" ? (
              <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}
            {preview?.kind === "file" ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-gray-500">
                <p>该格式请下载后查看</p>
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  打开文件
                </a>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="删除文档"
        message={
          pendingDelete
            ? `确定删除「${pendingDelete.name}」吗？相关分块与存储文件将一并删除，且不可恢复。`
            : ""
        }
        confirmText="删除"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const doc = pendingDelete;
          setPendingDelete(null);
          if (!doc) return;
          void deleteDocument(doc.id)
            .then(() => {
              toast.success("文档已删除");
              return reload();
            })
            .catch((error) => toast.fromError(error, "删除失败"));
        }}
      />
    </div>
  );
}
