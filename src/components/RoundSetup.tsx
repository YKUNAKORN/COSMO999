"use client";

// "Start game" panel: choose who is in the round and the score multiplier,
// then hand off to the score-entry step. This component owns the round-setup
// state and the two-step ('setup' -> 'entry') switch. Nothing in this file
// touches Firebase.
//
// Preset selection:
// 1. If the URL contains ?preset=id1,id2,id3 (set by Groups.tsx when
//    "เล่นกลุ่มนี้" is tapped), RoundSetup pre-selects those player ids on
//    first mount and then replaces the URL to remove the param.
// 2. If `presetTrigger` is passed from the parent page (e.g. LatestRoundCard
//    tapping "เล่นกลุ่มเดิมอีกครั้ง"), RoundSetup immediately selects those
//    player ids and returns to setup mode.
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Play } from "lucide-react";
import { MULTIPLIERS, MultiplierPicker } from "@/components/MultiplierPicker";
import { RoundPlayerSelect } from "@/components/RoundPlayerSelect";
import { ScoreEntry } from "@/components/ScoreEntry";
import type { Player } from "@/types/models";

// A round needs at least two players to compute score differences.
const MIN_PLAYERS = 2;

export interface PresetTrigger {
  ids: string[];
  timestamp: number;
}

// Inner component that uses useSearchParams (requires Suspense boundary in
// the parent, provided by the RoundSetup export below).
function RoundSetupInner({
  players,
  loading,
  presetTrigger,
}: {
  players: Player[];
  loading: boolean;
  presetTrigger?: PresetTrigger | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [isRandom, setIsRandom] = useState(false);
  const [step, setStep] = useState<"setup" | "entry">("setup");
  // Frozen copy of the chosen players, taken when the round starts so a
  // roster edit during score entry cannot add or remove a scored player.
  const [roundPlayers, setRoundPlayers] = useState<Player[]>([]);

  // Apply ?preset=id1,id2 on first mount. Filter to ids that are actually
  // in the current players list (guard: a player deleted since the group
  // was saved must not appear selected). Then clean the URL immediately so
  // the param does not persist on refresh or back-navigation.
  useEffect(() => {
    const raw = searchParams.get("preset");
    if (!raw) return;
    const requestedIds = raw.split(",").filter(Boolean);
    // players may not be loaded yet on first mount; accept the ids that are
    // already present and let the normal roster filter handle the rest.
    const validIds = requestedIds.filter((id) =>
      players.some((p) => p.id === id),
    );
    if (validIds.length > 0) {
      setSelectedIds(validIds);
    }
    // Remove the param from the URL without adding a history entry so the
    // user's back button goes to /groups, not back to /?preset=...
    router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount only; searchParams/players/router are stable refs.

  // In-page preset trigger (e.g. from LatestRoundCard "เล่นกลุ่มเดิมอีกครั้ง")
  useEffect(() => {
    if (!presetTrigger || !presetTrigger.ids.length) return;
    const validIds = presetTrigger.ids.filter((id) =>
      players.some((p) => p.id === id),
    );
    if (validIds.length > 0) {
      setSelectedIds(validIds);
      setMultiplier(1);
      setIsRandom(false);
      setRoundPlayers([]);
      setStep("setup");
    }
  }, [presetTrigger, players]);

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
    // Snapshot in selection order. isRandom is not persisted anywhere
    // (HistoryEntry has no field for it); it only decides the multiplier
    // picker's "random" mark in this component.
    const snapshot = validSelectedIds
      .map((id) => players.find((player) => player.id === id))
      .filter((player): player is Player => player !== undefined);
    if (snapshot.length < MIN_PLAYERS) return;
    setRoundPlayers(snapshot);
    setStep("entry");
  }

  // After a round is saved: clear the selection and multiplier and return to
  // setup, matching the legacy reset (selectedPlayerIds = [], multiplier
  // back to 1, isRandom cleared) - distinct from onBack, which keeps the
  // current selection so the player can go correct a mistake.
  function resetRound() {
    setSelectedIds([]);
    setMultiplier(1);
    setIsRandom(false);
    setRoundPlayers([]);
    setStep("setup");
  }

  if (step === "entry") {
    return (
      <ScoreEntry
        players={roundPlayers}
        multiplier={multiplier}
        onBack={() => setStep("setup")}
        onReset={resetRound}
      />
    );
  }

  return (
    <section
      id="round-setup-section"
      className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-card transition-colors hover:border-border-strong"
    >
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
          className="flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-on-accent transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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

// Exported wrapper provides the Suspense boundary required by useSearchParams.
// The fallback renders the same section shell so layout does not shift while
// the param is read; null would cause a brief collapse.
export function RoundSetup({
  players,
  loading,
  presetTrigger,
}: {
  players: Player[];
  loading: boolean;
  presetTrigger?: PresetTrigger | null;
}) {
  return (
    <Suspense
      fallback={
        <section className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 opacity-50 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Play className="size-5 text-accent" />
            เริ่มเกม
          </h2>
        </section>
      }
    >
      <RoundSetupInner
        players={players}
        loading={loading}
        presetTrigger={presetTrigger}
      />
    </Suspense>
  );
}
