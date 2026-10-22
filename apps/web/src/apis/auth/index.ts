import type { AuthUser, LoginRequest, LoginResponse, RefreshResponse, SendCodeRequest } from '@ragflux/shared/auth';
import type { ApiResponse } from '@ragflux/shared/common';
import { http } from '@/common/utils/api-request';

/**
 * 向邮箱发送登录验证码。请求不携带访问令牌。
 * @param body 邮箱地址
 * @returns 统一响应，成功时 data 为 null
 */
export async function sendCode(body: SendCodeRequest): Promise<ApiResponse<null>> {
  return http.post<null>('/auth/send-code', body, { skipAuth: true });
}

/**
 * 使用邮箱验证码登录，并取得访问令牌。请求不携带访问令牌。
 * @param body 邮箱与验证码
 * @returns 当前用户与访问令牌；刷新令牌由服务端写入 Cookie
 */
export async function login(body: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  return http.post<LoginResponse>('/auth/login', body, { skipAuth: true });
}

/**
 * 退出当前登录，清除服务端刷新令牌 Cookie。
 * @returns 统一响应，成功时 data 为 null
 */
export async function logout(): Promise<ApiResponse<null>> {
  return http.post<null>('/auth/logout', null, { skipAuth: true });
}

/**
 * 获取当前登录用户信息。
 * @returns 当前用户的公开信息
 */
export async function fetchMe(): Promise<ApiResponse<AuthUser>> {
  return http.get<AuthUser>('/auth/me');
}

let refreshing: Promise<ApiResponse<RefreshResponse>> | null = null;

/**
 * 使用 Cookie 中的刷新令牌换取新的访问令牌。
 * 并发调用会复用同一次进行中的请求，避免重复刷新。
 * @returns 新的访问令牌，不包含用户信息
 */
export function refresh(): Promise<ApiResponse<RefreshResponse>> {
  if (!refreshing) {
    refreshing = http.post<RefreshResponse>('/auth/refresh', null, { skipAuth: true }).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}
