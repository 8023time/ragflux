import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const DURATION: Record<ToastKind, number> = {
  success: 3200,
  error: 5600,
  info: 4000,
};

let sequence = 0;
const timers = new Map<number, number>();

interface ToastState {
  items: ToastItem[];
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  fromError: (error: unknown, fallback: string) => void;
  dismiss: (id: number) => void;
}

export const useToastStore = create<ToastState>((set, get) => {
  const dismiss = (id: number) => {
    const timer = timers.get(id);
    if (timer) window.clearTimeout(timer);
    timers.delete(id);
    set({ items: get().items.filter((item) => item.id !== id) });
  };
  const push = (kind: ToastKind, message: string) => {
    const text = message.trim();
    if (!text) return;
    const id = ++sequence;
    set({ items: [...get().items.slice(-4), { id, kind, message: text }] });
    timers.set(
      id,
      window.setTimeout(() => dismiss(id), DURATION[kind]),
    );
  };
  return {
    items: [],
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
    fromError: (error, fallback) => push('error', error instanceof Error ? error.message : fallback),
    dismiss,
  };
});

export function useToast() {
  return useToastStore(
    useShallow((state) => ({
      success: state.success,
      error: state.error,
      info: state.info,
      fromError: state.fromError,
      dismiss: state.dismiss,
    })),
  );
}
