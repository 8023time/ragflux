import type { CitationView } from '@ragflux/shared/session';
import { ArrowUp, Bot, ChevronRight, Square, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/common/utils/class-name';
import { renderAssistantMarkdown } from '@/common/utils/markdown';

export interface PanelMessage {
  id: string;
  role: string;
  content: string;
  createdAt?: string;
  citations?: CitationView[];
}

export function ChatPanel({
  datasetName,
  sessionTitle,
  messages,
  draft,
  isStreaming,
  canSend,
  onDraft,
  onSend,
  onStop,
}: {
  datasetName: string;
  sessionTitle: string;
  messages: PanelMessage[];
  draft: string;
  isStreaming: boolean;
  canSend: boolean;
  onDraft: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    messageId: string;
    position: number;
    top: number;
    left: number;
  } | null>(null);
  const started = messages.length > 0;

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages]);

  const citation = hover
    ? messages.find((item) => item.id === hover.messageId)?.citations?.find((item) => item.position === hover.position)
    : null;

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-gray-50 dark:bg-gray-900">
      <header className="flex h-14 shrink-0 items-center border-b border-gray-200 bg-white pr-14 pl-6 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="truncate text-gray-500">{datasetName || '未选择知识库'}</span>
          {sessionTitle ? <ChevronRight className="size-4 shrink-0 text-gray-400" /> : null}
          {sessionTitle ? (
            <span className="truncate font-medium text-gray-900 dark:text-white">{sessionTitle}</span>
          ) : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {started ? (
          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={cn('message-enter flex gap-3', message.role === 'user' && 'flex-row-reverse')}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                      message.role === 'user'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
                    )}
                  >
                    {message.role === 'user' ? (
                      <UserRound className="size-4" aria-hidden="true" />
                    ) : (
                      <Bot className="size-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className={cn('min-w-0 flex-1', message.role === 'user' && 'text-right')}>
                    <div className="mb-2 text-xs font-semibold text-gray-400">
                      {message.role === 'user' ? '你' : 'Ragflux 助手'}
                    </div>
                    {message.role === 'user' ? (
                      <div className="inline-block max-w-[90%] rounded-[28px] bg-blue-50 px-6 py-5 text-left text-sm leading-6 text-gray-900 dark:bg-blue-950/60 dark:text-blue-50">
                        {message.content}
                      </div>
                    ) : (
                      <div
                        onMouseOver={(event) => {
                          const target = event.target instanceof Element ? event.target.closest('.cite-ref') : null;
                          if (!(target instanceof HTMLElement)) return;
                          const position = Number(target.dataset.cite);
                          const rect = target.getBoundingClientRect();
                          setHover({
                            messageId: message.id,
                            position,
                            top: rect.bottom + 8,
                            left: rect.left,
                          });
                        }}
                        onMouseLeave={() => setHover(null)}
                      >
                        <div
                          className={cn(
                            'md-body text-sm leading-7',
                            isStreaming && message.id === messages[messages.length - 1]?.id && 'is-streaming',
                          )}
                          dangerouslySetInnerHTML={{
                            __html: renderAssistantMarkdown(
                              message.content,
                              message.citations?.map((item) => item.position) ?? [],
                            ),
                          }}
                        />
                        {message.citations && message.citations.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="text-xs text-gray-400">来源：</span>
                            {message.citations.map((item) => (
                              <button
                                key={item.position}
                                type="button"
                                className="cite-ref rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500"
                                data-cite={item.position}
                              >
                                [{item.position}] {item.chunkId}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
        <div
          className={
            started ? 'shrink-0 px-6 pt-2 pb-5' : 'flex flex-1 flex-col items-center justify-center px-6 pb-16'
          }
        >
          <div className="mx-auto w-full max-w-3xl">
            {!started ? (
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  向「{datasetName || '知识库'}」提问
                </h2>
                <p className="mt-2 text-sm text-gray-500">基于向量检索增强生成，答案附引用溯源</p>
              </div>
            ) : null}
            <div className="flex items-center gap-2 rounded-[28px] border border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <textarea
                rows={1}
                value={draft}
                disabled={!canSend && !isStreaming}
                placeholder="输入问题，Enter 发送，Shift+Enter 换行"
                className="max-h-40 min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 outline-none"
                onChange={(event) => onDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (canSend && draft.trim()) onSend();
                  }
                }}
              />
              {isStreaming ? (
                <button
                  type="button"
                  aria-label="停止生成"
                  className="flex size-9 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  onClick={onStop}
                >
                  <Square className="size-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  aria-label="发送"
                  disabled={!draft.trim() || !canSend}
                  className="flex size-9 items-center justify-center rounded-full bg-gray-900 text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
                  onClick={onSend}
                >
                  <ArrowUp className="size-4" />
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-xs text-gray-400">
              答案由大模型基于检索片段生成，可能存在偏差，请核对引用原文
            </p>
          </div>
        </div>
      </div>
      {hover && citation ? (
        <div
          className="fixed z-50 max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          style={{ top: hover.top, left: hover.left }}
        >
          <div className="text-sm font-medium">
            [{citation.position}] {citation.chunkId}
          </div>
          <div className="mt-0.5 text-xs text-gray-400">相似度 {citation.score.toFixed(3)}</div>
        </div>
      ) : null}
    </section>
  );
}
