"use client";

import { useEffect } from "react";
import { COLOR_MODE_STORAGE_KEY } from "@/config/theme";
import { applyColorMode, useThemeStore, type ColorMode } from "@/stores/theme";

export function useThemeSync() {
  const preference = useThemeStore((state) => state.preference);

  useEffect(() => {
    const stored = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    const next: ColorMode =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    useThemeStore.setState({ preference: next });
    applyColorMode(next);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (useThemeStore.getState().preference === "system")
        applyColorMode("system");
    };
    media.addEventListener("change", onChange);
    const timer = window.setInterval(onChange, 60_000);
    return () => {
      media.removeEventListener("change", onChange);
      window.clearInterval(timer);
    };
  }, [preference]);
}
