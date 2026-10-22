import { AppErrorBoundary } from '@/components/common/error-boundary';
import { AppShell } from '@/components/layout/app-shell';

export function RootLayout() {
  return (
    <AppErrorBoundary>
      <AppShell />
    </AppErrorBoundary>
  );
}
