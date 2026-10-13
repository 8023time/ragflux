"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useToastStore, type ToastKind } from "@/stores/toast";

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const TONE: Record<ToastKind, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-600 dark:text-red-400",
  info: "text-gray-500 dark:text-gray-400",
};

export function ToastHost() {
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[200] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => {
        const Icon = ICONS[item.kind];
        return (
          <div
            key={item.id}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3 shadow-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <Icon className={`mt-0.5 size-4 shrink-0 ${TONE[item.kind]}`} />
            <p className="min-w-0 flex-1 text-sm leading-5 text-gray-800 dark:text-gray-100">
              {item.message}
            </p>
            <button
              type="button"
              className="shrink-0 rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              aria-label="关闭"
              onClick={() => dismiss(item.id)}
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
