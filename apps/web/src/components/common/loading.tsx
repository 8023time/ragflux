import { LoaderCircle } from 'lucide-react';
import { cn } from '@/common/utils/class-name';

export function Loading({ label = '加载中 . . .', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-lg text-gray-400', className)} role="status">
      <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
