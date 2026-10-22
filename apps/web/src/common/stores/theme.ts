import { create } from 'zustand';
import { COLOR_MODE_STORAGE_KEY } from '@/common/configs/theme';
import { localStore } from '@/common/utils/local-store';

export type ColorMode = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ColorMode;
  systemDark: boolean;
  setPreference: (mode: ColorMode) => void;
  setSystemDark: (systemDark: boolean) => void;
}

/** 本地没有合法记录时使用 system，由系统深色偏好决定背景。 */
function readPreference(): ColorMode {
  const stored = localStore.getItem(COLOR_MODE_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function readSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveColorMode(preference: ColorMode, systemDark: boolean): 'light' | 'dark' {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemDark ? 'dark' : 'light';
}

function applyTheme(preference: ColorMode, systemDark: boolean) {
  document.documentElement.classList.toggle('dark', resolveColorMode(preference, systemDark) === 'dark');
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: readPreference(),
  systemDark: readSystemDark(),
  setPreference: (mode) => {
    localStore.setItem(COLOR_MODE_STORAGE_KEY, mode);
    set({ preference: mode });
    applyTheme(mode, get().systemDark);
  },
  setSystemDark: (systemDark) => {
    if (get().systemDark === systemDark) return;
    set({ systemDark });
    applyTheme(get().preference, systemDark);
  },
}));

applyTheme(useThemeStore.getState().preference, useThemeStore.getState().systemDark);
