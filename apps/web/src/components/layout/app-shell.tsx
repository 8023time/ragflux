"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { GithubIcon } from "@/components/shared/github-icon";
import { ToastHost } from "@/components/shared/toast-host";
import { GITHUB_URL } from "@/config/site";
import { SettingsModal } from "@/features/settings/components/settings-modal";
import { isWorkbenchRoute } from "@/lib/routes";
import { useAuth } from "@/stores/auth";
import { useToast } from "@/stores/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, booted, logout } = useAuth();
  const toast = useToast();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const unknown = pathname !== "/" && !isWorkbenchRoute(pathname);
  const atRoot = pathname === "/";
  const showWorkbench = !unknown && booted && Boolean(user) && pathname !== "/";

  useEffect(() => {
    if (!booted || !atRoot) return;

    router.replace(user ? "/datasets" : "/login");
  }, [atRoot, booted, router, user]);

  const shellHeight = showWorkbench || unknown ? "h-screen" : "min-h-screen";

  return (
    <div
      className={`relative flex bg-white text-gray-900 dark:bg-gray-950 dark:text-white ${shellHeight}`}
    >
      {showWorkbench ? (
        <>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            className="absolute top-3 right-3 z-40 flex size-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <GithubIcon className="size-5" />
          </a>
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        </>
      ) : null}
      {unknown ? (
        <div className="flex h-full min-h-0 w-full flex-1">{children}</div>
      ) : null}
      <SettingsModal
        onLogout={() => {
          setLogoutOpen(true);
        }}
      />
      <ConfirmModal
        open={logoutOpen}
        title="退出登录"
        message="确定要退出当前账号吗？未发送的内容不会保存。"
        confirmText="退出"
        danger
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          void logout().then(() => {
            toast.success("已退出登录");
            router.push("/");
          });
        }}
      />
      <ToastHost />
    </div>
  );
}
