"use client";

import type { SessionView } from "@ragflux/shared/session";
import {
  Archive,
  Check,
  ChevronDown,
  MessageSquare,
  Pencil,
  Plus,
} from "lucide-react";
import { useState } from "react";
import type { DatasetRow } from "@/types/dataset";
import { formatRelativeTime } from "@/lib/format";

export function SessionSidebar({
  datasets,
  selectedDatasetId,
  sessions,
  activeSessionId,
  canCreateSession,
  onSelectDataset,
  onSelectSession,
  onCreateSession,
  onRenameSession,
}: {
  datasets: DatasetRow[];
  selectedDatasetId: number;
  sessions: SessionView[];
  activeSessionId: number;
  canCreateSession: boolean;
  onSelectDataset: (id: number) => void;
  onSelectSession: (id: number) => void;
  onCreateSession: () => void;
  onRenameSession: (id: number, title: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const selected = datasets.find((item) => item.id === selectedDatasetId);

  return (
    <aside className="flex w-[clamp(8.5rem,28%,16rem)] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="border-b border-gray-100 p-3 dark:border-gray-800">
        <div className="relative">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="min-w-0 flex-1 truncate text-left font-medium">
              {selected?.name || "选择知识库"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-gray-400" />
          </button>
          {menuOpen ? (
            <div className="absolute top-full left-0 z-30 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {datasets.map((dataset) => (
                <button
                  key={dataset.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    onSelectDataset(dataset.id);
                    setMenuOpen(false);
                  }}
                >
                  <span className="truncate">{dataset.name}</span>
                  {dataset.id === selectedDatasetId ? (
                    <Check className="size-4 text-blue-600" />
                  ) : null}
                </button>
              ))}
              {datasets.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">
                  请先在知识库页创建
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          disabled={!selectedDatasetId || !canCreateSession}
          title={
            canCreateSession
              ? undefined
              : "请先在当前空会话中发送消息"
          }
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-gray-900"
          onClick={onCreateSession}
        >
          <Plus className="size-4" />
          新建会话
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-gray-400">
            暂无会话，发送问题即自动创建
          </p>
        ) : null}
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group mb-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 ${session.id === activeSessionId ? "bg-gray-100 dark:bg-gray-800" : "hover:bg-gray-50 dark:hover:bg-gray-800/60"}`}
            onClick={() => onSelectSession(session.id)}
          >
            <MessageSquare className="size-4 shrink-0 text-gray-400" />
            <div className="min-w-0 flex-1">
              {editingId === session.id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={() => {
                    const title = draft.trim();
                    setEditingId(null);
                    if (title) onRenameSession(session.id, title);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter")
                      (event.target as HTMLInputElement).blur();
                    if (event.key === "Escape") setEditingId(null);
                  }}
                  className="w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-sm dark:bg-gray-900"
                />
              ) : (
                <>
                  <p className="truncate text-sm">
                    {session.title || "新会话"}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {formatRelativeTime(session.updatedAt)}
                  </p>
                </>
              )}
            </div>
            <div
              className="hidden shrink-0 items-center group-hover:flex"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                title="重命名"
                className="rounded p-1 text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setEditingId(session.id);
                  setDraft(session.title);
                }}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                disabled
                title="当前后端没有归档接口"
                className="rounded p-1 text-gray-300"
              >
                <Archive className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
