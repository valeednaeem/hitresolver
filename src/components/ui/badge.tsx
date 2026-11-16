import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "danger"
  | "warning"
  | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-ink-muted border-line",
  primary: "bg-primary-soft text-primary border-primary/25",
  success: "bg-success-soft text-success border-success/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  warning: "bg-warning-soft text-warning border-warning/30",
  info: "bg-info-soft text-info border-info/25",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  /** Adds a leading dot — useful for status semantics. */
  dot?: boolean;
}

/** Compact status/label pill. Always carries text, never colour alone. */
export function Badge({
  tone = "neutral",
  children,
  className = "",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border",
        "px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide",
        "whitespace-nowrap",
        TONES[tone],
        className,
      ].join(" ")}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current shrink-0"
        />
      )}
      {children}
    </span>
  );
}
