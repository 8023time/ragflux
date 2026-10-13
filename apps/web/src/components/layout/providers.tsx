"use client";

import { useAuthBootstrap } from "@/features/auth/hooks/use-auth-bootstrap";
import { useThemeSync } from "@/hooks/use-theme-sync";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useAuthBootstrap();
  useThemeSync();
  return children;
}
