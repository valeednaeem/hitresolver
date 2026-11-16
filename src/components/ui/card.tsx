import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover elevation — use only for genuinely interactive cards. */
  interactive?: boolean;
  /** Removes inner padding, for cards that manage their own layout. */
  flush?: boolean;
}

export function Card({
  interactive = false,
  flush = false,
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        "bg-surface border border-line rounded-xl shadow-sm",
        flush ? "" : "p-5",
        interactive
          ? "transition-all duration-150 hover:border-line-strong hover:shadow-md cursor-pointer"
          : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Section heading inside a card, with an optional trailing element. */
export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="shrink-0 mt-0.5 text-primary">{icon}</span>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink leading-tight">{title}</h3>
          {description && (
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
