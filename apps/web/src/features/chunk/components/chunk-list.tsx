"use client";

import type { ChunkView } from "@ragflux/shared/chunk";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chunkContentSchema } from "@/features/chunk/schemas";
import { listChunks, updateChunk } from "@/features/chunk/services/chunks";
import { getDocument } from "@/features/document/services/documents";
import { formError } from "@/lib/form";
import { renderMarkdown } from "@/lib/markdown";
import { useToast } from "@/stores/toast";

const TYPE_LABEL: Record<string, string> = {
  text: "文本",
  title: "标题",
  table: "表格",
  formula: "公式",
  image: "图片",
  chart: "图表",
  code: "代码",
  list: "列表",
};

export function ChunkList({ documentId }: { documentId: number }) {
  const toast = useToast();
  const [items, setItems] = useState<ChunkView[]>([]);
  const [name, setName] = useState("");
  const [datasetId, setDatasetId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getDocument(documentId), listChunks(documentId)])
      .then(([document, chunks]) => {
        if (cancelled) return;
        setName(document.name);
        setDatasetId(document.datasetId);
        setItems(chunks);
      })
      .catch((error) => toast.fromError(error, "加载分块失败"))
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

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-gray-950">
      <header className="mx-auto flex w-full max-w-4xl shrink-0 items-center gap-1.5 px-8 py-4 text-sm">
        <Link
          href={datasetId ? `/datasets/${datasetId}` : "/datasets"}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" />
          文档
        </Link>
        <ChevronRight className="size-4 text-gray-300" />
        <span className="truncate font-medium">
          {name ? `${name} 的分块` : "分块"}
        </span>
      </header>
      <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-400">
            加载中...
          </div>
        ) : null}
        {!loading && items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-gray-800">
            暂无分块
          </div>
        ) : null}
        <div className="space-y-2">
          {items.map((chunk) => {
            const structured = chunk.elementType !== "text";
            const open = structured || expanded.has(chunk.id);
            return (
              <div
                key={chunk.id}
                className={`rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900 ${chunk.enabled ? "" : "opacity-60"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {chunk.chunkIndex}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>约 {chunk.tokenNum} tokens</span>
                    {chunk.elementType !== "text" ? (
                      <span>
                        {TYPE_LABEL[chunk.elementType] ?? chunk.elementType}
                      </span>
                    ) : null}
                    {chunk.pageNumber > 0 ? (
                      <span>第 {chunk.pageNumber} 页</span>
                    ) : null}
                    {!chunk.enabled ? <span>不参与检索</span> : null}
                  </div>
                  <button
                    type="button"
                    className="ml-auto rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => {
                      setEditingId(chunk.id);
                      setDraft(chunk.content);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    title={
                      chunk.enabled ? "点击禁用，禁用后不参与检索" : "点击启用"
                    }
                    className={`relative h-5 w-9 rounded-full ${chunk.enabled ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}
                    onClick={() =>
                      void updateChunk(chunk.id, { enabled: !chunk.enabled })
                        .then((next) => {
                          setItems((current) =>
                            current.map((item) =>
                              item.id === chunk.id ? next : item,
                            ),
                          );
                          toast.success(
                            next.enabled ? "分块已启用" : "分块已停用",
                          );
                        })
                        .catch((error) => toast.fromError(error, "更新失败"))
                    }
                  >
                    <span
                      className={`absolute top-0.5 size-4 rounded-full bg-white shadow ${chunk.enabled ? "left-[18px]" : "left-0.5"}`}
                    />
                  </button>
                </div>
                {editingId === chunk.id ? (
                  <>
                    <Textarea
                      value={draft}
                      rows={6}
                      onChange={(event) => setDraft(event.target.value)}
                      className="mt-2 min-h-32 resize-y"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingId(null)}
                      >
                        取消
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        disabled={saving}
                        onClick={() => {
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
                          void updateChunk(chunk.id, { content: parsed.data })
                            .then((next) => {
                              setItems((current) =>
                                current.map((item) =>
                                  item.id === chunk.id ? next : item,
                                ),
                              );
                              setEditingId(null);
                              toast.success("分块已保存");
                            })
                            .catch((error) =>
                              toast.fromError(error, "保存失败"),
                            )
                            .finally(() => setSaving(false));
                        }}
                      >
                        {saving ? "保存中..." : "保存"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div
                    className={`md-body chunk-markdown mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300 ${open ? "" : "max-h-[4.5rem] cursor-pointer overflow-hidden"}`}
                    onClick={() => {
                      if (!structured) toggle(chunk.id);
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(chunk.content),
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
