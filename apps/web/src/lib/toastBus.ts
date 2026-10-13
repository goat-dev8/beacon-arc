export type ToastKind = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  detail?: string;
}

export type ToastListener = (item: ToastItem) => void;

/**
 * Framework-free toast bus. Any module — components, lib code, wallet flows —
 * can call `toast.success(...)` without needing React context. The
 * ToastProvider subscribes and renders.
 */
export function createToastBus() {
  const listeners = new Set<ToastListener>();
  let nextId = 1;

  function emit(kind: ToastKind, title: string, detail?: string): number {
    const item: ToastItem = { id: nextId++, kind, title, detail };
    listeners.forEach((l) => l(item));
    return item.id;
  }

  return {
    subscribe(listener: ToastListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    success: (title: string, detail?: string) => emit("success", title, detail),
    error: (title: string, detail?: string) => emit("error", title, detail),
    info: (title: string, detail?: string) => emit("info", title, detail),
  };
}

export type ToastBus = ReturnType<typeof createToastBus>;

/** App-wide singleton. Mount <ToastProvider /> once in App. */
export const toast: ToastBus = createToastBus();
