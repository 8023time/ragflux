import type { AxiosRequestConfig } from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * 是否跳过身份验证,携带对应的 token 到请求头
     */
    skipAuth?: boolean;
  }
}
