"use client";

import { create } from "zustand";
import { COLOR_MODE_STORAGE_KEY } from "@/config/theme";

export type ColorMode = "system" | "light" | "dark";

function isNightTime(date = new Date()) {
  const hour = date.getHours();
  return hour >= 19 || hour < 7;
}

export function resolveDark(mode: ColorMode) {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  return (
    mode === "dark" || (mode === "system" && (media.matches || isNightTime()))
  );
}

export function applyColorMode(mode: ColorMode) {
  document.documentElement.classList.toggle("dark", resolveDark(mode));
}

interface ThemeState {
  preference: ColorMode;
  setPreference: (mode: ColorMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: "system",
  setPreference: (mode) => {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    set({ preference: mode });
    applyColorMode(mode);
  },
}));

export function useTheme() {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);
  return { preference, setPreference };
}
