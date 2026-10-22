import { Suspense, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { Loading } from '@/components/common/loading';
import { GithubIcon } from '@/components/common/github-icon';
import { ToastHost } from '@/components/common/toast-host';
import { Sidebar } from '@/components/layout/sidebar';
import { GITHUB_URL } from '@/common/configs/site';
import { cn } from '@/common/utils/class-name';
import { logout as logoutRequest } from '@/apis/auth';
import { useAuth } from '@/common/stores/auth';
import { useUserInfo } from '@/common/stores/userInfoStore';
import { useToast } from '@/common/stores/toast';
import { SettingsModal } from '@/pages/settings/settings-modal';

function PageOutlet() {
  return (
    <Suspense fallback={<Loading className="h-full min-h-40 w-full" />}>
      <Outlet />
    </Suspense>
  );
}

export function AppShell() {
  const navigate = useNavigate();
  const { booted, setSettingsOpen } = useAuth();
  const { isLogin, clearUserInfo } = useUserInfo();
  const toast = useToast();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const showWorkbench = booted && isLogin;

  return (
    <div className="relative flex h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
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
        </>
      ) : null}
      <div className={cn('flex h-full min-h-0 min-w-0 flex-1 flex-col', showWorkbench && 'overflow-hidden')}>
        <PageOutlet />
      </div>
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
          void logoutRequest().finally(() => {
            clearUserInfo();
            setSettingsOpen(false);
            toast.success('已退出登录');
            navigate('/login');
          });
        }}
      />
      <ToastHost />
    </div>
  );
}
