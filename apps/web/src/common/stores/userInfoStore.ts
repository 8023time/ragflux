import type { AuthUser } from '@ragflux/shared/auth';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { localStore } from '@/common/utils/local-store';

const USER_STORAGE_KEY = 'ragflux-user';
const LOGIN_STORAGE_KEY = 'ragflux-is-login';
const ACCESS_TOKEN_STORAGE_KEY = 'ragflux-access-token';
const LEGACY_AUTH_STORAGE_KEY = 'ragflux-auth';

interface LegacyAuthStorage {
  state?: {
    user?: unknown;
    accessToken?: string | null;
  };
}

function readLegacyAuth() {
  return localStore.getJSON<LegacyAuthStorage>(LEGACY_AUTH_STORAGE_KEY)?.state;
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<AuthUser>;
  return typeof user.id === 'number' && typeof user.email === 'string' && typeof user.nickname === 'string';
}

/** 用户信息单独存放。旧版整包记录里的用户会迁到当前键。 */
function readStoredUser(): AuthUser | null {
  const current = localStore.getJSON<unknown>(USER_STORAGE_KEY);
  if (isAuthUser(current)) return current;

  const legacyUser = readLegacyAuth()?.user;
  if (!isAuthUser(legacyUser)) return null;
  localStore.setJSON(USER_STORAGE_KEY, legacyUser);
  return legacyUser;
}

/** 校验 token 单独存放。先读当前键，没有再从旧版整包记录迁移。 */
function readStoredAccessToken(): string | null {
  const current = localStore.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (current) return current;

  const legacyToken = readLegacyAuth()?.accessToken;
  if (!legacyToken) return null;
  localStore.setItem(ACCESS_TOKEN_STORAGE_KEY, legacyToken);
  return legacyToken;
}

/**
 * 登录标记单独存放。
 * 没有记录时只根据本地用户或 token 推断，不写入，避免把“未选择”写成“已退出”。
 */
function readStoredIsLogin(): boolean {
  const current = localStore.getItem(LOGIN_STORAGE_KEY);
  if (current === '1') return true;
  if (current === '0') return false;
  return Boolean(readStoredUser() || readStoredAccessToken());
}

/** 用户主动退出后会留下 0。这时不能再用刷新令牌把登录态写回来。 */
export function isExplicitLogout() {
  return localStore.getItem(LOGIN_STORAGE_KEY) === '0';
}

interface UserInfoState {
  user: AuthUser | null;
  isLogin: boolean;
  accessToken: string | null;
  setUser: (user: AuthUser) => void;
  setIsLogin: (isLogin: boolean) => void;
  setAccessToken: (accessToken: string) => void;
  getAccessToken: () => string | null;
  clearUserInfo: () => void;
}

export const useUserInfoStore = create<UserInfoState>((set, get) => ({
  user: readStoredUser(),
  isLogin: readStoredIsLogin(),
  accessToken: readStoredAccessToken(),
  setUser: (user) => {
    localStore.setJSON(USER_STORAGE_KEY, user);
    set({ user });
  },
  setIsLogin: (isLogin) => {
    localStore.setItem(LOGIN_STORAGE_KEY, isLogin ? '1' : '0');
    set({ isLogin });
  },
  setAccessToken: (accessToken) => {
    localStore.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
    set({ accessToken });
  },
  getAccessToken: () => {
    const current = get().accessToken;
    if (current) return current;
    return readStoredAccessToken();
  },
  clearUserInfo: () => {
    localStore.setItem(LOGIN_STORAGE_KEY, '0');
    localStore.removeItem(USER_STORAGE_KEY);
    localStore.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStore.removeItem(LEGACY_AUTH_STORAGE_KEY);
    set({ user: null, isLogin: false, accessToken: null });
  },
}));

export function useUserInfo() {
  return useUserInfoStore(
    useShallow((state) => ({
      user: state.user,
      isLogin: state.isLogin,
      setUser: state.setUser,
      setIsLogin: state.setIsLogin,
      clearUserInfo: state.clearUserInfo,
    })),
  );
}
