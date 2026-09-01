"use client";

// "Start game" panel: choose who is in the round and the score multiplier,
// then hand off to the score-entry step. This component owns the round-setup
// state and the two-step ('setup' -> 'entry') switch. Nothing in this file
// touches Firebase.
import { useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { MULTIPLIERS, MultiplierPicker } from "@/components/MultiplierPicker";
import { RoundPlayerSelect } from "@/components/RoundPlayerSelect";
import { ScoreEntry } from "@/components/ScoreEntry";
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
  const [step, setStep] = useState<"setup" | "entry">("setup");
  // Frozen copy of the chosen players, taken when the round starts so a
  // roster edit during score entry cannot add or remove a scored player.
  const [roundPlayers, setRoundPlayers] = useState<Player[]>([]);

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
    // Snapshot in selection order. isRandom stays in this component's state
    // and is read by phase 2d when it writes the history row; the score-entry
    // step does not need it.
    const snapshot = validSelectedIds
      .map((id) => players.find((player) => player.id === id))
      .filter((player): player is Player => player !== undefined);
    if (snapshot.length < MIN_PLAYERS) return;
    setRoundPlayers(snapshot);
    setStep("entry");
  }

  if (step === "entry") {
    return (
      <ScoreEntry
        players={roundPlayers}
        multiplier={multiplier}
        onBack={() => setStep("setup")}
      />
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Play className="size-5 text-accent" />
        เริ่มเกม
      </h2>

      <div className="@container flex flex-col gap-2">
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
