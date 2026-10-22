import { useEffect } from 'react';
import { resolveColorMode, useThemeStore, type ColorMode } from '@/common/stores/theme';

export type { ColorMode };

/**
 * 读取并修改主题。全站只通过这个 hook 改变主题。
 * 已保存的偏好优先；选择跟随系统时，系统深浅色变化会写回 store。
 */
export function useTheme() {
  const preference = useThemeStore((state) => state.preference);
  const systemDark = useThemeStore((state) => state.systemDark);
  const setPreference = useThemeStore((state) => state.setPreference);
  const setSystemDark = useThemeStore((state) => state.setSystemDark);
  const resolved = resolveColorMode(preference, systemDark);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [setSystemDark]);

  return { preference, resolved, setPreference };
}
