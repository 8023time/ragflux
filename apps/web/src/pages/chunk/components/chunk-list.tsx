import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Loading } from '@/components/common/loading';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/common/utils/class-name';
import { renderMarkdown } from '@/common/utils/markdown';
import type { ChunkListProps } from '@/pages/chunk/hooks/use-chunks';

const TYPE_LABEL: Record<string, string> = {
  text: '文本',
  title: '标题',
  table: '表格',
  formula: '公式',
  image: '图片',
  chart: '图表',
  code: '代码',
  list: '列表',
};

export function ChunkList({
  items,
  name,
  datasetId,
  loading,
  expanded,
  editingId,
  draft,
  setDraft,
  saving,
  toggle,
  startEdit,
  cancelEdit,
  toggleEnabled,
  save,
  toast,
}: ChunkListProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-gray-950">
      <header className="mx-auto flex w-full max-w-4xl shrink-0 items-center gap-1.5 px-8 py-4 text-sm">
        <Link
          to={datasetId ? `/datasets/${datasetId}` : '/datasets'}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="size-4" />
          文档
        </Link>
        <ChevronRight className="size-4 text-gray-300" />
        <span className="truncate font-medium">{name ? `${name} 的分块` : '分块'}</span>
      </header>
      <div className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-y-auto px-8 py-6">
        {loading ? <Loading className="py-20" /> : null}
        {!loading && items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 py-16 text-center text-sm text-gray-400 dark:border-gray-800">
            暂无分块
          </div>
        ) : null}
        <div className="space-y-2">
          {items.map((chunk) => {
            const structured = chunk.elementType !== 'text';
            const open = structured || expanded.has(chunk.id);
            return (
              <div
                key={chunk.id}
                className={cn(
                  'rounded-xl border border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900',
                  !chunk.enabled && 'opacity-60',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-md bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {chunk.chunkIndex}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>约 {chunk.tokenNum} tokens</span>
                    {chunk.elementType !== 'text' ? (
                      <span>{TYPE_LABEL[chunk.elementType] ?? chunk.elementType}</span>
                    ) : null}
                    {chunk.pageNumber > 0 ? <span>第 {chunk.pageNumber} 页</span> : null}
                    {!chunk.enabled ? <span>不参与检索</span> : null}
                  </div>
                  <button
                    type="button"
                    className="ml-auto rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => startEdit(chunk)}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    title={chunk.enabled ? '点击禁用，禁用后不参与检索' : '点击启用'}
                    className={cn(
                      'relative h-5 w-9 rounded-full',
                      chunk.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600',
                    )}
                    onClick={() => void toggleEnabled(chunk).catch((error) => toast.fromError(error, '更新失败'))}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 size-4 rounded-full bg-white shadow',
                        chunk.enabled ? 'left-[18px]' : 'left-0.5',
                      )}
                    />
                  </button>
                </div>
                {editingId === chunk.id ? (
                  <>
                    <Textarea
                      value={draft}
                      rows={6}
                      onChange={(event) => setDraft(event.target.value)}
                      className="mt-2 min-h-32 resize-y"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="xs" onClick={cancelEdit}>
                        取消
                      </Button>
                      <Button type="button" size="xs" disabled={saving} onClick={() => void save(chunk)}>
                        {saving ? '保存中...' : '保存'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div
                    className={cn(
                      'md-body chunk-markdown mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300',
                      !open && 'max-h-[4.5rem] cursor-pointer overflow-hidden',
                    )}
                    onClick={() => {
                      if (!structured) toggle(chunk.id);
                    }}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(chunk.content),
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
