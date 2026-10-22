import { useUserInfoStore } from '@/common/stores/userInfoStore';

/**
 * 保存校验 token。
 * 交给 userInfoStore 写入内存，并由 store 单独持久化到 localStorage。
 * @param accessToken 登录或刷新接口返回的访问令牌
 */
export function saveAccessToken(accessToken: string) {
  useUserInfoStore.getState().setAccessToken(accessToken);
}

/**
 * 读取校验 token。
 * 先读 store，store 没有再读 localStorage，都没有则返回 null。
 * 请求拦截器等组件外的调用使用这个函数。
 */
export function getAccessToken(): string | null {
  return useUserInfoStore.getState().getAccessToken();
}

/**
 * 在组件中订阅校验 token。读取顺序与 getAccessToken 相同。
 */
export function useAccessToken(): string | null {
  const accessToken = useUserInfoStore((state) => state.accessToken);
  if (accessToken) return accessToken;
  return getAccessToken();
}
