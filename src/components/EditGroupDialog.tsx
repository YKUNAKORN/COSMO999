"use client";

// Edit group dialog: rename or delete a group shortcut. Ported from the
// legacy editGroup (reference/legacy-prototype.sanitized.html L1530-1546)
// which used prompt()/confirm() - replaced here with an accessible native
// <dialog> matching the PreviewDialog pattern.
// Deletion keeps history entries intact (per legacy behaviour); only the
// groups array entry is removed.
import { useEffect, useRef, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import type { Group } from "@/types/models";

export function EditGroupDialog({
  group,
  busy,
  error,
  onRename,
  onDelete,
  onClose,
}: {
  group: Group;
  // True while the async write is in flight - disables all controls.
  busy: boolean;
  // Inline error from a failed write, or null when none.
  error: string | null;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [nameValue, setNameValue] = useState(group.name);
  // Track which action triggered the busy state so the right button shows
  // the spinner: "rename" | "delete" | null.
  const [activeAction, setActiveAction] = useState<"rename" | "delete" | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function dismiss() {
    if (busy) return;
    dialogRef.current?.close();
    onClose();
  }

  function handleRename() {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === group.name) return;
    setActiveAction("rename");
    onRename(trimmed);
  }

  function handleDelete() {
    setActiveAction("delete");
    onDelete();
  }

  const nameChanged = nameValue.trim() !== "" && nameValue.trim() !== group.name;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
      aria-labelledby="edit-group-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-border-strong bg-surface p-0 text-text shadow-gold backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-5 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h2
            id="edit-group-title"
            className="text-base font-semibold leading-snug"
          >
            แก้ไขกลุ่ม
          </h2>
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

        {/* Inline error */}
        {error ? (
          <p
            role="alert"
            className="rounded-md border border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        {/* Rename section */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="edit-group-name"
            className="text-sm font-medium"
          >
            ชื่อกลุ่ม
          </label>
          <input
            id="edit-group-name"
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            disabled={busy}
            maxLength={80}
            className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text placeholder-text-muted transition-colors focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleRename}
            disabled={busy || !nameChanged}
            className="flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && activeAction === "rename" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {busy && activeAction === "rename" ? "กำลังบันทึก..." : "บันทึกชื่อใหม่"}
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Delete section */}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">
            ลบทางลัดกลุ่มนี้ออกจากรายการ — ประวัติการเล่นเดิมยังคงอยู่
          </p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-md border border-danger bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger hover:text-on-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && activeAction === "delete" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            {busy && activeAction === "delete"
              ? "กำลังลบ..."
              : "ลบทางลัดกลุ่มนี้"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
