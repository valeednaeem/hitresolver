"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Button } from "./button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Footer actions; typically cancel + confirm. */
  footer?: ReactNode;
}

/**
 * Accessible modal dialog.
 *
 * - `role="dialog"` + `aria-modal`
 * - focus moves into the dialog on open and is restored on close
 * - Escape and backdrop click both close
 * - background scroll is locked while open
 * - Tab is trapped inside the dialog
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    // Focus the first interactive element, falling back to the dialog.
    const frame = requestAnimationFrame(() => {
      const target =
        dialogRef.current?.querySelector<HTMLElement>(
          '[data-autofocus], button, input, select, textarea',
        ) ?? dialogRef.current;
      target?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] animate-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
        tabIndex={-1}
        className="relative w-full max-w-md bg-surface border border-line rounded-xl shadow-lg p-6 animate-in"
      >
        <h2 id="modal-title" className="text-base font-bold text-ink">
          {title}
        </h2>
        {description && (
          <p
            id="modal-description"
            className="text-sm text-ink-muted mt-2 leading-relaxed"
          >
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}

        {footer && (
          <div className="flex flex-wrap justify-end gap-2 mt-6">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** Convenience footer pair for confirmations. */
export function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  confirmDisabled = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  confirmDisabled?: boolean;
}) {
  return (
    <>
      <Button variant="ghost" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        variant={tone === "danger" ? "danger" : "primary"}
        onClick={onConfirm}
        disabled={confirmDisabled}
      >
        {confirmLabel}
      </Button>
    </>
  );
}
