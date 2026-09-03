"use client";

// Per-group leaderboard dialog. Ported from legacy showGroupScore
// (reference/legacy-prototype.sanitized.html L1484-1526).
// Read-only: shows each member's accumulated score within this group,
// sorted highest-first. Deleted players are shown as "(ถูกลบ)".
// Built on native <dialog> (same pattern as PreviewDialog).
import { useEffect, useRef } from "react";
import { BarChart2, X } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { Group, Player } from "@/types/models";

// Colour token for a numeric score value.
function scoreTone(score: number): string {
  if (score > 0) return "text-success";
  if (score < 0) return "text-danger";
  return "text-text-muted";
}

function formatScore(score: number): string {
  if (score > 0) return `+${score}`;
  return `${score}`;
}

// Rank badge colour: gold / silver / bronze / plain for the rest.
function rankTone(rank: number): string {
  if (rank === 1) return "text-accent font-bold";
  if (rank === 2) return "text-rank-silver font-semibold";
  if (rank === 3) return "text-rank-bronze font-semibold";
  return "text-text-muted";
}

export function GroupScoreDialog({
  group,
  players,
  onClose,
}: {
  group: Group;
  players: Player[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function dismiss() {
    dialogRef.current?.close();
    onClose();
  }

  // Build ranked list: map playerIds to score + player data, sort by score
  // descending. Guard: scores object may be sparse if player was added late.
  const ranked = group.playerIds
    .map((pId) => {
      const player = players.find((p) => p.id === pId) ?? null;
      const score = group.scores[pId] ?? 0;
      return { pId, player, score };
    })
    .sort((a, b) => b.score - a.score);

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
      aria-labelledby="group-score-title"
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg border border-border-strong bg-surface p-0 text-text shadow-gold backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="size-5 shrink-0 text-accent" aria-hidden />
            <h2 id="group-score-title" className="text-base font-semibold leading-snug">
              คะแนนรวมกลุ่ม: {group.name}
            </h2>
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

        {/* Ranked list */}
        <ol className="flex flex-col gap-2">
          {ranked.map(({ pId, player, score }, index) => {
            const rank = index + 1;
            return (
              <li
                key={pId}
                className="flex items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2.5"
              >
                {/* Rank number */}
                <span
                  className={`w-5 shrink-0 text-center text-sm tabular-nums ${rankTone(rank)}`}
                >
                  {rank}
                </span>

                {/* Avatar or placeholder for deleted player */}
                {player ? (
                  <PlayerAvatar player={player} className="size-8 text-xs" />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-xs text-text-muted">
                    ?
                  </span>
                )}

                {/* Name */}
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {player ? player.name : "(ถูกลบ)"}
                </span>

                {/* Score */}
                <span
                  className={`shrink-0 text-sm font-bold tabular-nums ${scoreTone(score)}`}
                >
                  {formatScore(score)}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          className="flex w-full items-center justify-center rounded-md border border-border bg-surface px-4 py-2.5 font-medium text-text transition-all hover:border-border-strong active:scale-[0.98]"
        >
          ปิด
        </button>
      </div>
    </dialog>
  );
}
