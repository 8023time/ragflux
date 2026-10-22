import { Link } from 'react-router';
import emoji from '@/assets/img/emoji.png';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-6 py-16 text-[#232323] dark:bg-gray-950 dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[min(80vw,38rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-50 blur-3xl dark:bg-orange-950/20"
      />

      <div className="relative w-full max-w-xl text-center">
        <div className="flex h-[clamp(7.25rem,22vw,11.875rem)] items-center justify-center font-[family-name:var(--font-not-found)] text-[clamp(5.5rem,17vw,9.125rem)] leading-none font-bold tracking-[-0.08em]">
          <span>4</span>
          <img src={emoji} alt="" className="mx-2 size-[clamp(5.5rem,14vw,7.5rem)] scale-[1.15] object-cover sm:mx-3" />
          <span>4</span>
        </div>

        <h1 className="mt-5 font-[family-name:var(--font-not-found)] text-xl font-bold tracking-[0.02em] sm:text-[22px]">
          这页暂时走丢了
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-500 sm:text-[15px] dark:text-gray-400">
          你要找的地址不存在，可能已经被移动或暂时不可用。
          <br className="hidden sm:block" />
          回到首页，我们继续探索。
        </p>

        <Button asChild size="lg" className="mt-8">
          <Link to="/">返回首页</Link>
        </Button>
      </div>
    </main>
  );
}
