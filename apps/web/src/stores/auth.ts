"use client";

import type { AuthUser } from "@ragflux/shared/auth";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { logout as logoutRequest } from "@/features/auth/services/auth";
import { setAccessToken } from "@/lib/http";

interface AuthState {
  user: AuthUser | null;
  booted: boolean;
  authOpen: boolean;
  settingsOpen: boolean;
  setUser: (user: AuthUser | null) => void;
  setBooted: (booted: boolean) => void;
  setAuthOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  applyUser: (user: AuthUser, accessToken: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  booted: false,
  authOpen: false,
  settingsOpen: false,
  setUser: (user) => set({ user }),
  setBooted: (booted) => set({ booted }),
  setAuthOpen: (authOpen) => set({ authOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  applyUser: (user, accessToken) => {
    setAccessToken(accessToken);
    set({ user, authOpen: false });
  },
  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      set({ user: null, settingsOpen: false });
    }
  },
}));

export function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      user: state.user,
      booted: state.booted,
      authOpen: state.authOpen,
      settingsOpen: state.settingsOpen,
      setAuthOpen: state.setAuthOpen,
      setSettingsOpen: state.setSettingsOpen,
      applyUser: state.applyUser,
      logout: state.logout,
    })),
  );
}
