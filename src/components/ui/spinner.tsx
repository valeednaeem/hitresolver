interface SpinnerProps {
  className?: string;
  label?: string;
}

/** Indeterminate activity indicator. Honours reduced-motion via CSS. */
export function Spinner({ className = "size-5", label }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      role={label ? "status" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-90"
      />
    </svg>
  );
}

/** Full-panel loading state with an accessible status message. */
export function LoadingState({ message = "Loading" }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-20 text-ink-muted"
      role="status"
    >
      <Spinner className="size-7 text-primary" />
      <p className="text-sm">{message}…</p>
    </div>
  );
}
