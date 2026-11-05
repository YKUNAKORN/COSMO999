"use client";

// Per-group leaderboard dialog. Ported from legacy showGroupScore
// (reference/legacy-prototype.sanitized.html L1484-1526).
// Mobile-first iOS guidelines: min 44px+ touch targets on close button, min 48px close action,
// active:scale-95 feedback, and iOS Grouped List.
import { useEffect, useMemo, useRef } from "react";
import { Gamepad2, X } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { formatNumber, scoreTone } from "@/lib/format";
import { computeGroupStats } from "@/lib/groupStats";
import type { Group, HistoryEntry, Player } from "@/types/models";

function formatScore(score: number): string {
  if (score > 0) return `+${score}`;
  return `${score}`;
}

function rankTone(rank: number): string {
  if (rank === 1) return "text-yellow-500 font-bold";
  if (rank === 2) return "text-gray-400 font-semibold";
  if (rank === 3) return "text-amber-700 dark:text-amber-500 font-semibold";
  return "text-[#8E8E93] dark:text-[#98989D]";
}

export function GroupScoreDialog({
  group,
  players,
  history,
  onClose,
}: {
  group: Group;
  players: Player[];
  history: HistoryEntry[] | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stats = useMemo(
    () => (history ? computeGroupStats(group, history) : null),
    [group, history],
  );

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
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-[20px] border border-black/[0.04] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-0 text-[#1C1C1E] dark:text-[#F2F2F7] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-50 dark:bg-blue-500/15 text-[#007AFF] dark:text-[#2E8BFF] shadow-xs">
              <Gamepad2 className="size-4 shrink-0" aria-hidden />
            </span>
            <h2 id="group-score-title" className="text-base font-semibold leading-snug text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
              {stats ? `ดวลกันไปแล้วทั้งหมด ${formatNumber(stats.totalRounds)} รอบ` : "สถิติกลุ่ม"}
            </h2>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="ปิด"
            className="flex size-11 min-h-[44px] min-w-[44px] items-center justify-center -mr-2 rounded-full text-[#8E8E93] dark:text-[#98989D] transition-all duration-200 ease-out active:scale-[0.97] hover:bg-black/[0.04] hover:text-[#1C1C1E] dark:hover:bg-white/[0.06] dark:hover:text-[#F2F2F7]"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Ranked iOS Grouped List */}
        <ol className="rounded-[16px] border border-black/[0.04] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] shadow-2xs overflow-hidden divide-y divide-gray-100/80 dark:divide-[#38383A]">
          {ranked.map(({ pId, player, score }, index) => {
            const rank = index + 1;
            const record = stats?.records[pId];
            return (
              <li
                key={pId}
                className="flex min-h-[52px] items-center gap-3 p-3.5 transition-colors hover:bg-gray-50/60 active:bg-gray-100/60 dark:hover:bg-white/[0.04] dark:active:bg-white/[0.08]"
              >
                {/* Rank number */}
                <span
                  className={`w-5 shrink-0 text-center text-sm tabular-nums ${rankTone(rank)}`}
                >
                  {rank}
                </span>

                {/* Avatar */}
                {player ? (
                  <PlayerAvatar player={player} className="size-9 text-xs shrink-0" />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-black/[0.06] dark:border-[#38383A] bg-black/[0.04] dark:bg-white/[0.04] text-xs text-[#8E8E93] dark:text-[#98989D]">
                    ?
                  </span>
                )}

                {/* Name, win/loss record */}
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                    {player ? player.name : "(ถูกลบ)"}
                  </span>
                  {record ? (
                    <p className="mt-0.5 text-xs tabular-nums text-[#8E8E93] dark:text-[#98989D]">
                      ชนะ {record.wins}
                    </p>
                  ) : null}
                </div>

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

        {stats && stats.playedTogetherRounds > stats.totalRounds ? (
          <p className="text-center text-xs tabular-nums text-[#8E8E93] dark:text-[#98989D]">
            เล่นด้วยกันทั้งหมด {formatNumber(stats.playedTogetherRounds)} รอบ (รวมรอบที่มีผู้เล่นคนอื่นร่วมด้วย)
          </p>
        ) : null}

        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          className="flex min-h-[44px] sm:min-h-[48px] w-full items-center justify-center rounded-full border border-black/[0.06] dark:border-[#38383A] bg-white dark:bg-[#2C2C2E] px-5 py-2.5 sm:px-6 sm:py-3 text-sm sm:text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] shadow-xs transition-all duration-200 ease-out active:scale-[0.97] hover:bg-gray-50 dark:hover:bg-[#38383A]"
        >
          ปิด
        </button>
      </div>
    </dialog>
  );
}
