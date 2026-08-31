"use client";

// Multi-select grid of players for the current round. The roster and the
// selection array are both owned by the parent (RoundSetup); this component
// only renders and reports taps. It never reads or writes Firebase.
import { Check, Loader2 } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { Player } from "@/types/models";

export function RoundPlayerSelect({
  players,
  loading,
  selectedIds,
  onToggle,
}: {
  players: Player[];
  loading: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <Loader2 className="size-4 animate-spin" />
        กำลังโหลดรายชื่อผู้เล่น...
      </p>
    );
  }

  if (players.length === 0) {
    return (
      <p className="rounded-md border border-border bg-bg p-3 text-sm text-text-muted">
        ยังไม่มีผู้เล่น สร้างโปรไฟล์ก่อนเริ่มเกม
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3">
      {players.map((player) => {
        const selected = selectedIds.includes(player.id);
        return (
          <li key={player.id}>
            <button
              type="button"
              onClick={() => onToggle(player.id)}
              aria-pressed={selected}
              className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                selected
                  ? "border-border-strong bg-surface-raised"
                  : "border-border bg-surface hover:border-border-strong"
              }`}
            >
              <PlayerAvatar player={player} className="size-10 text-base" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {player.name}
              </span>
              <span
                aria-hidden
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  selected
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border text-transparent"
                }`}
              >
                <Check className="size-3.5" />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
