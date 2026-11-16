"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  success: "bg-success text-white",
  error: "bg-danger text-white",
  info: "bg-ink text-surface",
};

let nextId = 0;

/**
 * Toast host.
 *
 * Announced via a visually-hidden `aria-live` region so screen readers
 * receive the message even though the visual pill is transient.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++nextId;
      setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Live region — always present so announcements are registered. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className="sr-only"
      >
        {items.map((t) => (
          <span key={t.id}>{t.message}</span>
        ))}
      </div>

      {/* Visual stack */}
      <div
        className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 items-end pointer-events-none"
        aria-hidden="true"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={[
              "px-4 py-2.5 rounded-lg text-sm font-semibold shadow-lg",
              "pointer-events-auto max-w-xs break-words animate-in",
              TONE_STYLES[t.tone],
            ].join(" ")}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/** Auto-dismiss helper kept here so consumers never deal with timers. */
export function useToastDismiss(delayMs: number) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => force((n) => n + 1), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);
}
