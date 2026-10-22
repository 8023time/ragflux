import type { ApiResponse } from '@ragflux/shared/common';
import axios, { type AxiosRequestConfig, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { refresh } from '@/apis/auth';
import { appConfig } from '@/common/configs/globalInfo';
import { getAccessToken, saveAccessToken } from '@/common/hooks/use-access-token';
import { useAuthStore } from '@/common/stores/auth';
import { isExplicitLogout, useUserInfoStore } from '@/common/stores/userInfoStore';

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const instance = axios.create({
  baseURL: appConfig.apiBase,
  timeout: 100000,
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (!config.skipAuth && token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

function errorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return '网络连接失败，请检查网络';
  const data = error.response?.data;
  if (data && typeof data === 'object' && 'msg' in data && typeof data.msg === 'string' && data.msg) {
    return data.msg;
  }
  return error.response ? '请求失败' : '网络连接失败，请检查网络';
}

instance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<unknown>>) => {
    const body = response.data;
    if (body?.code === 0) return body as unknown as typeof response;
    return Promise.reject(new ApiError(body?.msg || '请求失败'));
  },
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const config = error.config as (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
      if (config && error.response?.status === 401 && !config.skipAuth && !config.retried && !isExplicitLogout()) {
        config.retried = true;
        try {
          const body = await refresh();
          const accessToken = body.data?.accessToken;
          if (!accessToken || isExplicitLogout()) throw new ApiError(body.msg || '登录已过期');
          saveAccessToken(accessToken);
          config.headers.set('Authorization', `Bearer ${accessToken}`);
          return instance.request(config);
        } catch {
          useUserInfoStore.getState().clearUserInfo();
          useAuthStore.getState().setSettingsOpen(false);
        }
      }
    }
    return Promise.reject(new ApiError(errorMessage(error)));
  },
);

export const http = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return instance.get<ApiResponse<T>, ApiResponse<T>>(url, config);
  },
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return instance.post<ApiResponse<T>, ApiResponse<T>>(url, data, config);
  },
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    return instance.put<ApiResponse<T>, ApiResponse<T>>(url, data, config);
  },
  delete<T>(url: string, config?: AxiosRequestConfig) {
    return instance.delete<ApiResponse<T>, ApiResponse<T>>(url, config);
  },
};
