import type { ReactNode } from 'react';
import { useAuthBootstrap } from '@/common/hooks/use-auth-bootstrap';
import { useTheme } from '@/common/hooks/use-theme';

export function AppProviders({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  useTheme();
  return children;
}
