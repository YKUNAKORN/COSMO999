"use client";

// Generic accessible confirm dialog. Built on the native <dialog> element
// (same pattern as PreviewDialog) so Esc-to-close, backdrop, focus trap,
// and focus return are handled by the platform. Never uses confirm() /
// alert() / prompt(). Destructive variant renders the primary button in
// --color-danger so irreversible actions are visually distinct.
import { useEffect, useRef } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "ยกเลิก",
  destructive = false,
  busy = false,
  error = null,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  // When true the confirm button uses the danger colour palette to signal
  // that the action cannot be undone (e.g. undo a round).
  destructive?: boolean;
  // True while the async action is in flight - disables both buttons.
  busy?: boolean;
  // Inline error message from a failed write, or null when none.
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // showModal() grants the top layer, backdrop, and focus trap. The guard
  // prevents the double-invoke in React Strict Mode double-effect.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // Every dismiss path runs dismiss(): close() first so the browser hands
  // focus back to the trigger element, then call onClose to unmount.
  function dismiss() {
    if (busy) return;
    dialogRef.current?.close();
    onClose();
  }

  const confirmButtonClass = destructive
    ? "flex flex-1 items-center justify-center gap-2 rounded-md bg-danger px-4 py-2.5 font-semibold text-on-danger transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    : "flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      // Click on the ::backdrop lands on the <dialog> element itself; clicks
      // on the panel content do not bubble up here as currentTarget.
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-border-strong bg-surface p-0 text-text shadow-gold backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {destructive && (
              <AlertTriangle className="size-5 shrink-0 text-danger" aria-hidden />
            )}
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold leading-snug"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            aria-label="ปิด"
            className="-m-1.5 shrink-0 rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <p
          id="confirm-dialog-desc"
          className="text-sm text-text-muted leading-relaxed"
        >
          {description}
        </p>

        {/* Inline error from a failed write */}
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={confirmButtonClass}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {busy ? "กำลังดำเนินการ..." : confirmLabel}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={busy}
            className="flex flex-1 items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 font-medium text-text transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
