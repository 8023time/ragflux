import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

interface AuthState {
  booted: boolean;
  settingsOpen: boolean;
  setBooted: (booted: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

/** 启动完成和设置弹窗。用户信息、登录态和校验 token 在 userInfoStore。 */
export const useAuthStore = create<AuthState>((set) => ({
  booted: false,
  settingsOpen: false,
  setBooted: (booted) => set({ booted }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));

export function useAuth() {
  return useAuthStore(
    useShallow((state) => ({
      booted: state.booted,
      settingsOpen: state.settingsOpen,
      setSettingsOpen: state.setSettingsOpen,
    })),
  );
}
