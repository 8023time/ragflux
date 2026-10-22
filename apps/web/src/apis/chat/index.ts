import { fetchEventSource } from '@microsoft/fetch-event-source';
import type {
  ChatCompletionRequest,
  ChatStreamEvent,
  CreateSessionRequest,
  ListSessionsRequest,
  MessageView,
  SessionView,
  UpdateSessionRequest,
} from '@ragflux/shared/session';
import type { ApiResponse } from '@ragflux/shared/common';
import { refresh } from '@/apis/auth';
import { appConfig } from '@/common/configs/globalInfo';
import { getAccessToken, saveAccessToken } from '@/common/hooks/use-access-token';
import { useAuthStore } from '@/common/stores/auth';
import { isExplicitLogout, useUserInfoStore } from '@/common/stores/userInfoStore';
import { ApiError, http } from '@/common/utils/api-request';

/**
 * 列出当前用户的会话。
 * @param datasetId 按知识库筛选；省略时返回全部会话
 * @returns 会话列表
 */
export async function listSessions(datasetId?: number): Promise<ApiResponse<SessionView[]>> {
  const params: ListSessionsRequest = datasetId === undefined ? {} : { datasetId };
  return http.get<SessionView[]>('/sessions', { params });
}

/**
 * 创建会话。
 * @param body 所属知识库与可选标题
 * @returns 新建的会话
 */
export async function createSession(body: CreateSessionRequest): Promise<ApiResponse<SessionView>> {
  return http.post<SessionView>('/sessions', body);
}

/**
 * 修改会话标题。
 * @param sessionId 会话编号
 * @param body 新标题
 * @returns 更新后的会话
 */
export async function updateSession(sessionId: number, body: UpdateSessionRequest): Promise<ApiResponse<SessionView>> {
  return http.put<SessionView>(`/sessions/${sessionId}`, body);
}

/**
 * 删除会话。
 * @param sessionId 会话编号
 * @returns 统一响应，成功时 data 为 null
 */
export async function deleteSession(sessionId: number): Promise<ApiResponse<null>> {
  return http.delete<null>(`/sessions/${sessionId}`);
}

/**
 * 列出会话中的消息。
 * @param sessionId 会话编号
 * @returns 消息列表，包含引用分块
 */
export async function listMessages(sessionId: number): Promise<ApiResponse<MessageView[]>> {
  return http.get<MessageView[]>(`/sessions/${sessionId}/messages`);
}

/**
 * 以 SSE 发起问答。回答不走统一 JSON 包装。
 * 遇到 401 时会刷新访问令牌并重试一次。
 * @param body 会话编号与提问内容
 * @param handlers.signal 取消本次问答
 * @param handlers.onEvent 收到一条流式事件时调用
 * @returns 流结束时完成；失败时抛出错误
 */
export async function streamChat(
  body: ChatCompletionRequest,
  handlers: {
    signal: AbortSignal;
    onEvent: (event: ChatStreamEvent) => void;
  },
) {
  await fetchEventSource(`${appConfig.apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal: handlers.signal,
    credentials: 'include',
    openWhenHidden: true,
    fetch: async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const send = (token: string | null) => {
        const headers = new Headers(init?.headers);
        if (token) headers.set('Authorization', `Bearer ${token}`);
        return fetch(url, { ...init, headers, credentials: 'include' });
      };
      const first = await send(getAccessToken());
      if (first.status !== 401 || isExplicitLogout()) return first;
      try {
        const body = await refresh();
        const accessToken = body.data?.accessToken;
        if (!accessToken || isExplicitLogout()) throw new ApiError(body.msg || '请先登录');
        saveAccessToken(accessToken);
        return send(accessToken);
      } catch {
        useUserInfoStore.getState().clearUserInfo();
        useAuthStore.getState().setSettingsOpen(false);
        return first;
      }
    },
    async onopen(res) {
      if (res.status === 401) {
        useUserInfoStore.getState().clearUserInfo();
        useAuthStore.getState().setSettingsOpen(false);
        throw new ApiError('请先登录');
      }
      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || !contentType.includes('text/event-stream')) {
        const text = await res.text();
        let message = '回答失败';
        try {
          const body = JSON.parse(text) as ApiResponse<null>;
          if (body.msg) message = body.msg;
        } catch {
          message = '回答失败';
        }
        throw new ApiError(message);
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
