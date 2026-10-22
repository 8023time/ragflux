import { Link } from 'react-router';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/common/hooks/use-theme';
import { appConfig } from '@/common/configs/globalInfo';

export default function LoginHeader() {
  const { resolved, setPreference } = useTheme();

  return (
    <header className="absolute inset-x-0 top-0 z-10 flex h-16 items-center justify-between px-5 sm:px-8">
      <Link
        to="/"
        className="text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-900 dark:focus-visible:outline-white"
        aria-label={`返回 ${appConfig.appName} 首页`}
      >
        {appConfig.appName}
      </Link>
      <button
        type="button"
        aria-label="切换主题"
        title="切换主题"
        className="flex size-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:hover:bg-gray-800 dark:hover:text-white dark:focus-visible:outline-white"
        onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')}
      >
        {resolved === 'dark' ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </button>
    </header>
  );
}
