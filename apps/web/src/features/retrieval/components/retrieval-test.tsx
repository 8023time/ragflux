"use client";

import type { RetrievalHit } from "@ragflux/shared/retrieval";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listDatasets } from "@/features/dataset/services/datasets";
import { retrievalSchema } from "@/features/retrieval/schemas";
import { retrievalTest } from "@/features/retrieval/services/retrieval";
import { formError } from "@/lib/form";
import { useToast } from "@/stores/toast";

export function RetrievalTest({
  datasetId,
  datasetName,
}: {
  datasetId: number;
  datasetName: string;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(datasetName);
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(6);
  const [hits, setHits] = useState<RetrievalHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  async function run() {
    const parsed = retrievalSchema.safeParse({ query, topK });
    if (!parsed.success) {
      toast.error(formError(parsed.error));
      return;
    }
    setSearching(true);
    try {
      setHits(
        await retrievalTest({
          datasetId,
          query: parsed.data.query,
          topK: parsed.data.topK,
        }),
      );
      setSearched(true);
    } catch (error) {
      toast.fromError(error, "检索失败");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-gray-950">
      <header className="mx-auto flex w-full max-w-5xl shrink-0 items-center px-8 py-4">
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <Link
            href={`/datasets/${datasetId}`}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="size-4" />
            {title || "文档"}
          </Link>
          <ChevronRight className="size-4 text-gray-300" />
          <span className="font-medium">检索测试</span>
        </div>
      </header>
      <div className="mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-8 py-6">
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void run();
              }}
              placeholder="输入测试问题，只召回分块，不调用大模型"
              className="h-9 flex-1"
            />
            <Button
              type="button"
              disabled={searching || !query.trim()}
              onClick={() => void run()}
            >
              <Search className="size-4" />
              {searching ? "检索中..." : "检索"}
            </Button>
          </div>
          <label className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            TopK
            <input
              type="range"
              min={1}
              max={20}
              value={topK}
              onChange={(event) => setTopK(Number(event.target.value))}
              className="w-28"
            />
            <span className="w-6 text-center font-medium text-gray-700 dark:text-gray-200">
              {topK}
            </span>
          </label>
          <p className="mt-3 text-xs text-gray-400">仅召回已启用的文档分块</p>
        </div>
        {searched && hits.length === 0 ? (
          <div className="rounded-xl border border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-gray-800">
            无命中分块
          </div>
        ) : null}
        <div className="space-y-2">
          {hits.map((hit) => {
            const open = expanded.has(hit.chunkId);
            const tone =
              hit.score >= 0.6
                ? "text-green-600"
                : hit.score >= 0.4
                  ? "text-blue-600"
                  : "text-gray-500";
            const bar =
              hit.score >= 0.6
                ? "bg-green-500"
                : hit.score >= 0.4
                  ? "bg-blue-500"
                  : "bg-gray-400";
            return (
              <div
                key={hit.chunkId}
                className="rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center gap-3 text-xs">
                  <span className={`font-mono font-semibold ${tone}`}>
                    {hit.score.toFixed(3)}
                  </span>
                  <span className="truncate text-gray-500">
                    {hit.documentName}
                  </span>
                  <span className="ml-auto text-gray-300">
                    chunk #{hit.chunkId}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={`h-full ${bar}`}
                    style={{ width: `${Math.min(100, hit.score * 100)}%` }}
                  />
                </div>
                <p
                  className={`mt-2 cursor-pointer text-sm leading-6 whitespace-pre-wrap text-gray-600 dark:text-gray-300 ${open ? "" : "line-clamp-3"}`}
                  onClick={() =>
                    setExpanded((current) => {
                      const next = new Set(current);
                      if (next.has(hit.chunkId)) next.delete(hit.chunkId);
                      else next.add(hit.chunkId);
                      return next;
                    })
                  }
                >
                  {hit.content}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
