"use client";

import type { SessionView } from "@ragflux/shared/session";
import {
  Archive,
  Check,
  LogOut,
  Monitor,
  Moon,
  Palette,
  SlidersHorizontal,
  Sun,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listSessions } from "@/features/chat/services/chat";
import { formatRelativeTime, nameInitial } from "@/lib/format";
import { useAuth } from "@/stores/auth";
import { useTheme, type ColorMode } from "@/stores/theme";
import { useToast } from "@/stores/toast";

type Tab = "general" | "personalization" | "archive" | "account";

const TABS: Array<{ id: Tab; label: string; icon: typeof SlidersHorizontal }> =
  [
    { id: "general", label: "通用", icon: SlidersHorizontal },
    { id: "personalization", label: "个性化", icon: Palette },
    { id: "archive", label: "归档", icon: Archive },
    { id: "account", label: "账户", icon: User },
  ];

const THEMES: Array<{
  value: ColorMode;
  label: string;
  icon: typeof Sun;
  tip: string;
}> = [
  { value: "light", label: "浅色", icon: Sun, tip: "" },
  { value: "dark", label: "深色", icon: Moon, tip: "" },
  {
    value: "system",
    label: "跟随系统",
    icon: Monitor,
    tip: "读取系统深色/浅色偏好；19:00-07:00 自动深色",
  },
];

export function SettingsModal({ onLogout }: { onLogout: () => void }) {
  const { settingsOpen, setSettingsOpen, user } = useAuth();
  const { preference, setPreference } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("general");
  const [archived, setArchived] = useState<SessionView[]>([]);
  const [customOpen, setCustomOpen] = useState(false);

  useEffect(() => {
    if (!settingsOpen) return;
    let cancelled = false;
    listSessions()
      .then((items) => {
        if (!cancelled) setArchived(items.filter((item) => item.status !== 1));
      })
      .catch((error) => {
        if (cancelled) return;
        setArchived([]);
        toast.fromError(error, "加载归档失败");
      });
    return () => {
      cancelled = true;
    };
  }, [settingsOpen, toast]);

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(480px,85vh)] w-[min(640px,92vw)] max-w-none flex-row gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">设置</DialogTitle>
        <div className="w-[180px] border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            设置
          </h2>
          <nav className="space-y-1">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    active
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => setTab(item.id)}
                >
                  <Icon className="size-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {TABS.find((item) => item.id === tab)?.label}
            </h3>
            <button
              type="button"
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="关闭"
              onClick={() => setSettingsOpen(false)}
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {tab === "general" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    问答模型
                  </h4>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded-md border border-gray-900 bg-white px-2.5 py-1 text-xs text-gray-900 dark:border-white dark:bg-gray-800 dark:text-white"
                      onClick={() => setCustomOpen(false)}
                    >
                      默认 <Check className="ml-1 inline size-3" />
                    </button>
                    <button
                      type="button"
                      className={`rounded-md border px-2.5 py-1 text-xs ${customOpen ? "border-gray-900 dark:border-white" : "border-gray-200 text-gray-500 dark:border-gray-700"}`}
                      onClick={() => setCustomOpen(true)}
                    >
                      自定义
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  服务端默认模型。仅用于生成回答；检索嵌入由知识库绑定的模型完成。
                </p>
                {customOpen ? (
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                    {[
                      ["名称", "仅方便自己查看"],
                      ["模型 ID", "例如 deepseek-chat"],
                      ["接口", "https://api.example.com/v1"],
                      ["密钥", "sk-…"],
                    ].map(([label, placeholder]) => (
                      <label key={label} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 text-xs text-gray-500">
                          {label}
                        </span>
                        <Input
                          disabled
                          placeholder={placeholder}
                          type={label === "密钥" ? "password" : "text"}
                          className="flex-1"
                        />
                      </label>
                    ))}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled
                        title="当前后端没有对话模型连通测试接口"
                        className="rounded-md border border-gray-200 px-3 py-1 text-xs disabled:opacity-50 dark:border-gray-600"
                      >
                        测试连接
                      </button>
                      <button
                        type="button"
                        disabled
                        title="当前后端没有自定义对话模型接口"
                        className="rounded-md bg-gray-900 px-3 py-1 text-xs text-white disabled:opacity-50 dark:bg-white dark:text-gray-900"
                      >
                        保存并启用
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "personalization" ? (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  主题模式
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  选择适合你的界面主题
                </p>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  {THEMES.map((option) => {
                    const Icon = option.icon;
                    const active = preference === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={option.tip || option.label}
                        className={`relative flex flex-col items-center gap-2 rounded-lg border px-4 py-3 ${
                          active
                            ? "border-gray-900 bg-white text-gray-900 dark:border-white dark:bg-gray-800 dark:text-white"
                            : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400"
                        }`}
                        onClick={() => setPreference(option.value)}
                      >
                        <Icon className="size-6" />
                        <span className="text-sm">{option.label}</span>
                        {active ? (
                          <Check className="absolute top-2 right-2 size-4" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {tab === "archive" ? (
              archived.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                  <Archive className="size-10" />
                  <p className="mt-2 text-sm">暂无归档会话</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {archived.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg px-3 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {item.title || "新会话"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(item.updatedAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled
                        title="当前后端没有恢复归档接口"
                        className="rounded-lg px-3 py-1.5 text-xs text-gray-400"
                      >
                        恢复
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : null}

            {tab === "account" ? (
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="flex size-16 items-center justify-center rounded-full bg-gray-900 text-xl font-medium text-white dark:bg-gray-100 dark:text-gray-900">
                    {nameInitial(user?.nickname || user?.email || "?")}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {user?.nickname || "未设置昵称"}
                    </h4>
                    <p className="mt-0.5 truncate text-sm text-gray-500">
                      {user?.email || "未绑定邮箱"}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                  <h4 className="font-medium text-red-600 dark:text-red-400">
                    注销用户
                  </h4>
                  <p className="mt-2 text-sm text-red-600/80 dark:text-red-300/80">
                    注销后将删除账号及全部知识库、文档、分块与会话。该操作不可恢复。
                  </p>
                  <button
                    type="button"
                    disabled
                    title="当前后端没有账号注销接口"
                    className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    注销用户
                  </button>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  onClick={onLogout}
                >
                  <LogOut className="size-4" />
                  退出登录
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
