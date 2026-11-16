import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Softer variant for use inside an already-populated panel. */
  compact?: boolean;
}

/**
 * Honest empty state. Explains what belongs here and offers a real next
 * action — never a dead control, never a fake statistic.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-6",
        "rounded-xl border border-dashed border-line-strong bg-surface-2/50",
      ].join(" ")}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="mb-3 text-ink-subtle [&>svg]:size-8"
        >
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {description && (
        <p className="text-xs text-ink-muted mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
