"use client";

import { useEffect } from "react";
import { bootstrapSession } from "@/features/auth/services/auth";
import { AUTH_REQUIRED_EVENT, subscribeAuth } from "@/lib/http";
import { useAuthStore } from "@/stores/auth";

export function useAuthBootstrap() {
  const setUser = useAuthStore((state) => state.setUser);
  const setBooted = useAuthStore((state) => state.setBooted);
  const setAuthOpen = useAuthStore((state) => state.setAuthOpen);

  useEffect(() => {
    let cancelled = false;
    bootstrapSession()
      .then((next) => {
        if (!cancelled) setUser(next);
      })
      .finally(() => {
        if (!cancelled) setBooted(true);
      });
    return () => {
      cancelled = true;
    };
  }, [setBooted, setUser]);

  useEffect(() => {
    const unsubscribe = subscribeAuth(setUser);
    const onRequired = () => setAuthOpen(true);
    window.addEventListener(AUTH_REQUIRED_EVENT, onRequired);
    return () => {
      unsubscribe();
      window.removeEventListener(AUTH_REQUIRED_EVENT, onRequired);
    };
  }, [setAuthOpen, setUser]);
}
