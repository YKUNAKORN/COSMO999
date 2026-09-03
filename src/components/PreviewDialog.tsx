"use client";

// Round preview. Confirmation step between score entry and the write:
// shows every player's raw and net score plus the net total, which is 0 by
// construction. Built on the native <dialog> element so Esc-to-close, the
// modal backdrop, focus containment, and focus return are handled by the
// platform rather than hand-rolled. Mounted only while the preview is open
// (ScoreEntry gates it); the confirm button triggers ScoreEntry's atomic
// save, this component itself touches no Firebase.
import { useEffect, useRef } from "react";
import { Check, X } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { RoundScoreResult } from "@/lib/scoring";
import type { Player } from "@/types/models";

// Colour + sign for a net figure. Gold is deliberately not used here: it is
// the control colour, so a plus score must not look like a button.
function netTone(net: number): string {
  if (net > 0) return "text-success";
  if (net < 0) return "text-danger";
  return "text-text-muted";
}

export function PreviewDialog({
  players,
  rawScores,
  result,
  multiplier,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  players: Player[];
  rawScores: Record<string, number>;
  result: RoundScoreResult;
  multiplier: number;
  // True while the atomic save is in flight - disables both buttons.
  saving: boolean;
  // Inline error from a failed/uncommitted save, or null when none.
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // showModal() grants the top layer, backdrop and focus trap. The guard and
  // the cleanup keep it correct when React re-runs the effect in development;
  // `close` is intentionally not wired to onClose (see dismiss()).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // Every dismiss path runs this: close() first, while the <dialog> is still
  // in the DOM, so the browser hands focus back to the trigger; then ask the
  // parent to unmount us. Doing it in this order (rather than letting the
  // effect cleanup call close() after the unmount) is what makes focus return
  // work. Esc arrives here via onCancel with the native close suppressed.
  // A save in flight must not be dismissable, matching the legacy disabled
  // cancel button while confirmAndSaveRound runs.
  function dismiss() {
    if (saving) return;
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      // Click on the ::backdrop lands on the dialog element itself; clicks on
      // the panel below do not bubble up to here as currentTarget.
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
      aria-labelledby="preview-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border-strong bg-surface p-0 text-text shadow-gold backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="preview-title" className="text-lg font-semibold">
              ตรวจสอบคะแนนก่อนบันทึก
            </h2>
            <p className="mt-0.5 text-sm text-text-muted tabular-nums">
              ตัวคูณรอบนี้ x{multiplier}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="ปิด"
            className="-m-1.5 shrink-0 rounded-md p-1.5 text-text-muted transition-all hover:bg-surface-raised hover:text-text active:scale-90"
          >
            <X className="size-5" />
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {players.map((player) => {
            const net = result.netScores[player.id] ?? 0;
            const raw = rawScores[player.id] ?? 0;
            const sign = net > 0 ? "+" : "";
            return (
              <li
                key={player.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2.5"
              >
                <PlayerAvatar player={player} className="size-9 text-sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {player.name}
                </span>
                <span className="shrink-0 text-right text-xs text-text-muted tabular-nums">
                  ดิบ {raw}
                </span>
                <span
                  className={`w-16 shrink-0 text-right text-sm font-semibold tabular-nums ${netTone(net)}`}
                >
                  {sign}
                  {net}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between rounded-md border border-border-strong bg-surface-raised px-3 py-2.5">
          <span className="text-sm font-medium">รวมสุทธิ</span>
          <span className="text-base font-bold tabular-nums text-text-muted">
            {result.totalNetScore}
          </span>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-on-accent transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            <Check className="size-4" />
            {saving ? "กำลังบันทึก..." : "ปิดจ๊อบ! ประจานเลย"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            disabled={saving}
            className="flex flex-1 items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 font-medium text-text transition-all hover:border-border-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            กลับไปแก้
          </button>
        </div>
      </div>
    </dialog>
  );
}
