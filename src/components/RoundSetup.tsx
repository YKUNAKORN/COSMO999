"use client";

// "Start game" panel: choose who is in the round and the score multiplier.
// This component owns the round-setup state; phase 2c reads validSelectedIds
// / multiplier / isRandom from here to build the score-entry step. Nothing
// in this file touches Firebase.
import { useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { MULTIPLIERS, MultiplierPicker } from "@/components/MultiplierPicker";
import { RoundPlayerSelect } from "@/components/RoundPlayerSelect";
import type { Player } from "@/types/models";

// A round needs at least two players to compute score differences.
const MIN_PLAYERS = 2;

export function RoundSetup({
  players,
  loading,
}: {
  players: Player[];
  loading: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [isRandom, setIsRandom] = useState(false);

  function togglePlayer(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((existing) => existing !== id)
        : [...current, id],
    );
  }

  function pickMultiplier(value: number) {
    setMultiplier(value);
    // An explicit pick clears the randomised mark, like the legacy
    // onchange="currentRoundIsRandom = false".
    setIsRandom(false);
  }

  function randomizeMultiplier() {
    const next = MULTIPLIERS[Math.floor(Math.random() * MULTIPLIERS.length)];
    setMultiplier(next);
    setIsRandom(true);
  }

  // Ignore ids whose player was deleted from the roster below while still
  // selected, so the counter and the min-players guard never count someone
  // who is gone. Legacy prunes the same way on delete and on group replay.
  const validSelectedIds = selectedIds.filter((id) =>
    players.some((player) => player.id === id),
  );
  const enoughPlayers = validSelectedIds.length >= MIN_PLAYERS;

  function handleProceed() {
    // TODO(phase-2c): advance to the score-entry step using validSelectedIds,
    // multiplier and isRandom. Phase 2b performs no navigation and no write.
  }

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Play className="size-5 text-accent" />
        เริ่มเกม
      </h2>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-muted">1. เลือกผู้เล่นในรอบนี้</p>
        <RoundPlayerSelect
          players={players}
          loading={loading}
          selectedIds={validSelectedIds}
          onToggle={togglePlayer}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-text-muted">2. ตัวคูณคะแนนรอบนี้</p>
        <MultiplierPicker
          value={multiplier}
          onChange={pickMultiplier}
          onRandomize={randomizeMultiplier}
          isRandom={isRandom}
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="text-sm text-text-muted tabular-nums">
          เลือกแล้ว {validSelectedIds.length} คน | ตัวคูณ x{multiplier}
        </p>
        <button
          type="button"
          onClick={handleProceed}
          disabled={!enoughPlayers}
          className="flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ไปกรอกคะแนน
          <ArrowRight className="size-4" />
        </button>
        {!enoughPlayers ? (
          <p className="text-xs text-text-muted">
            เลือกผู้เล่นอย่างน้อย {MIN_PLAYERS} คน
          </p>
        ) : null}
      </div>
    </section>
  );
}
