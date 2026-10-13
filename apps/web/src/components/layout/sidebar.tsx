"use client";

import { Database, MessageSquare, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { nameInitial } from "@/lib/format";
import { useAuth } from "@/stores/auth";
import appIcon from "@/app/icon0.svg";

export function Sidebar() {
  const pathname = usePathname();
  const { user, setSettingsOpen } = useAuth();
  const onChat = pathname.startsWith("/chat");
  const initial = nameInitial(user?.nickname || user?.email || "?");

  return (
    <aside className="flex w-16 flex-col items-center border-r border-gray-200 py-4 dark:border-gray-800">
      <Link
        href="/chat"
        className="mb-6 flex size-10 items-center justify-center text-sm font-semibold text-gray-900 dark:text-white"
        title="返回首页"
      >
        <img src={appIcon.src} alt="Ragflux" />
      </Link>
      <nav className="flex flex-1 flex-col items-center gap-2">
        <Link
          href="/chat"
          title="对话"
          className={`flex size-10 items-center justify-center rounded-lg ${
            onChat
              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
              : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          }`}
        >
          <MessageSquare className="size-5" />
        </Link>
        <Link
          href="/datasets"
          title="知识库"
          className={`flex size-10 items-center justify-center rounded-lg ${
            onChat
              ? "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              : "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
          }`}
        >
          <Database className="size-5" />
        </Link>
      </nav>
      <div
        className="mb-2 flex size-10 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-200"
        title={user?.email}
      >
        {initial}
      </div>
      <button
        type="button"
        title="设置"
        className="flex size-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings className="size-5" />
      </button>
    </aside>
  );
}
