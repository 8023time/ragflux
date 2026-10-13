import type { AuthUser, LoginResponse } from "@ragflux/shared/auth";
import { appConfig } from "@/config/global";

export const AUTH_REQUIRED_EVENT = "ragflux:auth-required";

interface Envelope<T> {
  code: number;
  msg?: string;
  data?: T;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
const authListeners = new Set<(user: AuthUser | null) => void>();

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function subscribeAuth(listener: (user: AuthUser | null) => void) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function notifyAuth(user: AuthUser | null) {
  if (!user) setAccessToken(null);
  for (const listener of authListeners) listener(user);
}

export function emitAuthRequired() {
  notifyAuth(null);
  window.dispatchEvent(new CustomEvent(AUTH_REQUIRED_EVENT));
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function readEnvelope<T>(res: Response): Promise<Envelope<T>> {
  const text = await res.text();
  if (!text) return { code: res.ok ? 0 : res.status, msg: res.statusText };
  try {
    return JSON.parse(text) as Envelope<T>;
  } catch {
    throw new ApiError("响应无法解析");
  }
}

export async function refreshSession(): Promise<LoginResponse | null> {
  const res = await fetch(`${appConfig.apiBase}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  const body = await readEnvelope<LoginResponse>(res);
  if (!res.ok || body.code !== 0 || !body.data?.accessToken) return null;
  setAccessToken(body.data.accessToken);
  return body.data;
}

async function ensureFreshToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = refreshSession()
      .then((data) => {
        if (data) notifyAuth(data.user);
        return Boolean(data);
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiFetch(
  input: string,
  init?: RequestInit,
  options?: { auth?: boolean; retry?: boolean },
) {
  const headers = new Headers(init?.headers);
  const useAuth = options?.auth !== false;
  if (useAuth && accessToken)
    headers.set("Authorization", `Bearer ${accessToken}`);
  const res = await fetch(input, { ...init, headers, credentials: "include" });
  if (res.status === 401 && useAuth && options?.retry !== false) {
    const ok = await ensureFreshToken();
    if (!ok) {
      emitAuthRequired();
      return res;
    }
    return apiFetch(input, init, { ...options, retry: false });
  }
  return res;
}

export async function apiJSON<T>(
  path: string,
  init?: RequestInit,
  options?: { auth?: boolean },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  const res = await apiFetch(
    `${appConfig.apiBase}${path}`,
    { ...init, headers },
    options,
  );
  const body = await readEnvelope<T>(res);
  if (res.status === 401) throw new ApiError(body.msg || "请先登录");
  if (!res.ok || body.code !== 0) throw new ApiError(body.msg || "请求失败");
  return body.data as T;
}
