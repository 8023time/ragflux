import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  SendCodeRequest,
} from "@ragflux/shared/auth";
import { apiJSON, refreshSession } from "@/lib/http";

export function sendCode(body: SendCodeRequest) {
  return apiJSON<null>(
    "/auth/send-code",
    { method: "POST", body: JSON.stringify(body) },
    { auth: false },
  );
}

export function login(body: LoginRequest) {
  return apiJSON<LoginResponse>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(body) },
    { auth: false },
  );
}

export function logout() {
  return apiJSON<null>("/auth/logout", { method: "POST" }, { auth: false });
}

export function fetchMe() {
  return apiJSON<AuthUser>("/auth/me");
}

export async function bootstrapSession(): Promise<AuthUser | null> {
  const data = await refreshSession();
  return data?.user ?? null;
}
