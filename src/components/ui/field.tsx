"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

const FIELD_BASE =
  "w-full bg-canvas border rounded-lg px-3 text-sm text-ink " +
  "placeholder:text-ink-subtle transition-colors duration-150 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

function fieldState(invalid: boolean) {
  return invalid
    ? "border-danger focus:border-danger focus:ring-2 focus:ring-danger/25"
    : "border-line focus:border-primary focus:ring-2 focus:ring-primary/20";
}

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  /** Presence marks the field invalid and wires up aria-describedby. */
  error?: string | null;
}

/**
 * Labelled text input with hint and error wiring.
 * Errors are announced via `aria-describedby` and `aria-invalid`.
 */
export function TextField({
  label,
  hint,
  error,
  id,
  className = "",
  ...rest
}: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy =
    [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="text-xs font-semibold text-ink-muted"
        >
          {label}
        </label>
      )}
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[FIELD_BASE, fieldState(Boolean(error)), "h-10", className].join(" ")}
        {...rest}
      />
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${fieldId}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

export interface TextAreaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
}

/** Labelled textarea with the same accessible wiring as `TextField`. */
export function TextAreaField({
  label,
  hint,
  error,
  id,
  className = "",
  ...rest
}: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy =
    [error ? `${fieldId}-error` : null, hint ? `${fieldId}-hint` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="text-xs font-semibold text-ink-muted"
        >
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          FIELD_BASE,
          fieldState(Boolean(error)),
          "py-2.5 leading-relaxed resize-y min-h-20",
          className,
        ].join(" ")}
        {...rest}
      />
      {error && (
        <p id={`${fieldId}-error`} className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${fieldId}-hint`} className="text-xs text-ink-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

export interface SelectFieldProps
  extends Omit<InputHTMLAttributes<never>, "size"> {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Rendered before the native control as a visual label. */
  ariaLabel?: string;
}

/**
 * Compact native select. Uses a real `<select>` so keyboard and screen
 * reader behaviour is native rather than reimplemented.
 */
export function SelectField({
  value,
  onValueChange,
  options,
  ariaLabel,
  className = "",
  ...rest
}: SelectFieldProps & { children?: ReactNode }) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={[FIELD_BASE, fieldState(false), "h-10 cursor-pointer", className].join(" ")}
      {...(rest as object)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
