import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  toast,
  type ToastItem,
  type ToastKind,
} from "@/lib/toastBus";

const AUTO_DISMISS_MS: Record<ToastKind, number> = {
  success: 4500,
  info: 5000,
  error: 8000,
};

const MAX_VISIBLE = 3;

const KIND_META: Record<
  ToastKind,
  { icon: typeof Info; dot: string; label: string }
> = {
  success: { icon: CheckCircle2, dot: "text-signal", label: "Success" },
  error: { icon: AlertTriangle, dot: "text-danger", label: "Error" },
  info: { icon: Info, dot: "text-ink-faint", label: "Notice" },
};

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  return (
    <div
      role="status"
      className="toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line-strong bg-dusk px-4 py-3 text-paper shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)]"
    >
      <Icon
        className={cn("mt-0.5 size-[18px] shrink-0", meta.dot)}
        strokeWidth={2}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight">
          <span className="sr-only">{meta.label}: </span>
          {item.title}
        </p>
        {item.detail ? (
          <p className="mt-0.5 break-words text-[13px] leading-snug text-paper/75">
            {item.detail}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="grid size-7 shrink-0 place-items-center rounded-full text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Mount once at the app root. Renders toasts above all chrome. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const pending = timers.current;
    const unsubscribe = toast.subscribe((item) => {
      setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), item]);
      pending.set(
        item.id,
        setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS[item.kind]),
      );
    });
    return () => {
      unsubscribe();
      pending.forEach((t) => clearTimeout(t));
      pending.clear();
    };
  }, [dismiss]);

  return (
    <>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom,0px)] md:bottom-6"
      >
        {items.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            onDismiss={() => dismiss(item.id)}
          />
        ))}
      </div>
    </>
  );
}
