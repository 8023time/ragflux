import Image from "next/image";
import Link from "next/link";
import localFont from "next/font/local";
import type { Metadata } from "next";
import emoji from "@/asset/img/emoji.png";
import { Button } from "@/components/ui/button";

const montserrat = localFont({
  src: [
    {
      path: "../asset/fonts/montserrat-300-latin.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../asset/fonts/montserrat-700-latin.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-not-found",
  display: "swap",
});

export const metadata: Metadata = {
  title: "页面不存在",
};

export default function NotFound() {
  return (
    <main
      className={`${montserrat.variable} relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-6 py-16 text-[#232323] dark:bg-gray-950 dark:text-white`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(80vw,38rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-50 blur-3xl dark:bg-orange-950/20"
      />

      <div className="relative w-full max-w-xl text-center">
        <div className="flex h-[clamp(7.25rem,22vw,11.875rem)] items-center justify-center font-[var(--font-not-found)] text-[clamp(5.5rem,17vw,9.125rem)] font-bold leading-none tracking-[-0.08em]">
          <span>4</span>
          <Image
            src={emoji}
            alt=""
            priority
            className="mx-2 size-[clamp(5.5rem,14vw,7.5rem)] scale-[1.15] object-cover sm:mx-3"
          />
          <span>4</span>
        </div>

        <h1 className="mt-5 font-[var(--font-not-found)] text-xl font-bold tracking-[0.02em] sm:text-[22px]">
          这页暂时走丢了
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-500 dark:text-gray-400 sm:text-[15px]">
          你要找的地址不存在，可能已经被移动或暂时不可用。
          <br className="hidden sm:block" />
          回到首页，我们继续探索。
        </p>

        <Button asChild size="lg" className="mt-8">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </main>
  );
}
