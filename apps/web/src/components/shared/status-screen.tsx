import Image from "next/image";
import Link from "next/link";
import errorImage from "@/asset/img/error.png";
import { Button } from "@/components/ui/button";

export function StatusScreen({
  title,
  description,
  extra,
  primary,
  secondary,
}: {
  title: string;
  description: string;
  extra?: string;
  primary: { href: string; label: string };
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-6 py-16 text-gray-900 dark:bg-gray-950 dark:text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[min(80vw,38rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-50 blur-3xl dark:bg-orange-950/20"
      />

      <div className="relative w-full max-w-xl text-center">
        <Image
          src={errorImage}
          alt=""
          priority
          className="mx-auto size-[clamp(7rem,25vw,10rem)] object-contain"
        />
        <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-[22px]">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-500 dark:text-gray-400 sm:text-[15px]">
          {description}
        </p>
        {extra ? (
          <p className="mt-3 text-xs text-gray-400">编号 {extra}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {secondary ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={secondary.onClick}
            >
              {secondary.label}
            </Button>
          ) : null}
          <Button asChild size="lg">
            <Link href={primary.href}>{primary.label}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
