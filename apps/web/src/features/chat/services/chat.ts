import { fetchEventSource } from "@microsoft/fetch-event-source";
import type {
  ChatCompletionRequest,
  ChatStreamEvent,
  CreateSessionRequest,
  ListSessionsRequest,
  MessageView,
  SessionView,
  UpdateSessionRequest,
} from "@ragflux/shared/session";
import { appConfig } from "@/config/global";
import { ApiError, apiFetch, apiJSON, readEnvelope } from "@/lib/http";

export function listSessions(datasetId?: number) {
  const request: ListSessionsRequest = datasetId === undefined ? {} : { datasetId };
  const query = request.datasetId ? `?datasetId=${request.datasetId}` : "";
  return apiJSON<SessionView[]>(`/sessions${query}`);
}

export function createSession(body: CreateSessionRequest) {
  return apiJSON<SessionView>("/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateSession(sessionId: number, body: UpdateSessionRequest) {
  return apiJSON<SessionView>(`/sessions/${sessionId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function deleteSession(sessionId: number) {
  return apiJSON<null>(`/sessions/${sessionId}`, { method: "DELETE" });
}

export function listMessages(sessionId: number) {
  return apiJSON<MessageView[]>(`/sessions/${sessionId}/messages`);
}

export async function streamChat(
  body: ChatCompletionRequest,
  handlers: {
    signal: AbortSignal;
    onEvent: (event: ChatStreamEvent) => void;
  },
) {
  await fetchEventSource(`${appConfig.apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal: handlers.signal,
    credentials: "include",
    openWhenHidden: true,
    fetch: (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      return apiFetch(url, init);
    },
    async onopen(res) {
      if (res.status === 401) throw new ApiError("请先登录");
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("text/event-stream")) {
        const envelope = await readEnvelope<null>(res);
        throw new ApiError(envelope.msg || "回答失败");
      }
    },
    onmessage(message) {
      if (!message.data) return;
      handlers.onEvent(JSON.parse(message.data) as ChatStreamEvent);
    },
    onerror(error) {
      throw error;
    },
  });
}
