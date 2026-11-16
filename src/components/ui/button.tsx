import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover shadow-sm border border-transparent",
  secondary:
    "bg-surface-2 text-ink hover:bg-surface-3 border border-line",
  outline:
    "bg-transparent text-ink-muted hover:text-ink hover:bg-surface-2 border border-line-strong",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-surface-2 border border-transparent",
  danger:
    "bg-danger-soft text-danger hover:bg-danger hover:text-white border border-danger/30",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm gap-2 rounded-lg",
};

/**
 * Standard button. Always renders a real `<button>` so keyboard
 * activation and form semantics work; use `asChild`-style patterns via
 * wrapping elements when a link is required instead.
 */
export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "inline-flex items-center justify-center font-semibold",
        "transition-colors duration-150 ease-out",
        "disabled:opacity-50 disabled:pointer-events-none",
        "select-none whitespace-nowrap",
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}
