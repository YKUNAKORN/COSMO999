"use client";

// Step two of starting a round: type each player's raw score, check it, then
// confirm to atomically save it (players + group + history) to Firebase.
// The player list here is a snapshot taken when the round began (see
// RoundSetup.handleProceed) - deleting someone from the roster mid-entry can
// no longer drop a stray id into the scores.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ClipboardCheck, Flame, PartyPopper, RotateCcw } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PreviewDialog } from "@/components/PreviewDialog";
import { generateRoundCommentary } from "@/lib/commentary";
import { saveRound } from "@/lib/rounds";
import { calculateRoundScores, type RoundScoreResult } from "@/lib/scoring";
import { useHistory } from "@/hooks/useHistory";
import type { Player } from "@/types/models";

// Confetti only runs client-side and only for a committed save with a
// positive score, so it is loaded on demand rather than bundled up front.
async function fireConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; commentary: string }
  | { status: "error"; message: string };

// Empty, "-", or anything non-numeric counts as 0, matching the legacy
// `parseInt(input.value) || 0`.
function parseScore(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

interface CheckedRound {
  rawScores: Record<string, number>;
  result: RoundScoreResult;
}

export function ScoreEntry({
  players,
  multiplier,
  onBack,
  onReset,
}: {
  players: Player[];
  multiplier: number;
  onBack: () => void;
  // Clears the round selection and returns to setup, called from the
  // "เริ่มรอบใหม่" button after a successful save.
  onReset: () => void;
}) {
  // Keyed by player id; absent means the field is still empty.
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<CheckedRound | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  // Commentary needs the round history that predates this save, to detect a
  // comeback; this is a live subscription so it stays current.
  const { history } = useHistory();

  // Land the cursor in the first field, like the legacy setupScoreInput.
  useEffect(() => {
    const firstId = players[0]?.id;
    if (firstId) inputRefs.current[firstId]?.focus();
  }, [players]);

  function updateScore(id: string, value: string) {
    setRawInputs((current) => ({ ...current, [id]: value }));
    // Any edit invalidates a previous failed check.
    if (error) setError(null);
  }

  // Enter moves to the next player; the last field just blurs.
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const nextId = players[index + 1]?.id;
    if (nextId) inputRefs.current[nextId]?.focus();
    else event.currentTarget.blur();
  }

  function handleCheck() {
    const rawScores: Record<string, number> = {};
    for (const player of players) {
      rawScores[player.id] = parseScore(rawInputs[player.id] ?? "");
    }

    const result = calculateRoundScores(
      players.map((player) => player.id),
      rawScores,
      multiplier,
    );

    // Zero-sum is guaranteed by the maths for integer input; this is the
    // legacy defensive assertion kept in place, not an error players hit in
    // normal use.
    if (result.totalNetScore !== 0) {
      setError(
        `ผลรวมคะแนนสุทธิไม่เท่ากับ 0 (ได้ ${result.totalNetScore}) กรุณาตรวจสอบคะแนนอีกครั้ง`,
      );
      return;
    }

    setError(null);
    setChecked({ rawScores, result });
  }

  async function handleConfirm() {
    if (!checked || saveState.status === "saving") return;

    setSaveState({ status: "saving" });
    const commentary = generateRoundCommentary(checked.result.netScores, players, history);

    const outcome = await saveRound({
      playerIds: players.map((player) => player.id),
      netScores: checked.result.netScores,
      multiplier,
      commentary,
    });

    if (!outcome.committed) {
      setSaveState({
        status: "error",
        message: "บันทึกไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
      });
      return;
    }

    if (checked.result.hasPositive) void fireConfetti();
    setChecked(null);
    setSaveState({ status: "saved", commentary });
  }

  if (saveState.status === "saved") {
    return (
      <section className="reveal flex flex-col items-center gap-4 rounded-lg border border-border bg-surface p-8 text-center shadow-card">
        <PartyPopper className="size-10 text-accent" />
        <h2 className="text-lg font-semibold">บันทึกรอบแล้ว</h2>
        {saveState.commentary ? (
          <p className="flex items-center gap-2 rounded-md border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
            <Flame className="size-4 shrink-0" />
            {saveState.commentary}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          <RotateCcw className="size-4" />
          เริ่มรอบใหม่
        </button>
      </section>
    );
  }

  return (
    <section className="reveal flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardCheck className="size-5 text-accent" />
          กรอกคะแนนดิบ
        </h2>
        <p className="text-sm text-text-muted tabular-nums">
          {players.length} คน | ตัวคูณ x{multiplier}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {players.map((player, index) => (
          <li
            key={player.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2.5 focus-within:border-border-strong"
          >
            <PlayerAvatar player={player} className="size-9 text-sm" />
            <label
              htmlFor={`score-${player.id}`}
              className="min-w-0 flex-1 truncate text-sm font-medium"
            >
              {player.name}
            </label>
            {/*
              type="text" + inputMode="numeric" rather than type="number": a
              controlled number input drops a lone "-" in several browsers,
              which would block entering a negative score. parseScore does the
              validation instead.
            */}
            <input
              id={`score-${player.id}`}
              ref={(node) => {
                inputRefs.current[player.id] = node;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={rawInputs[player.id] ?? ""}
              onChange={(event) => updateScore(player.id, event.target.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className="w-24 rounded-md border border-border bg-bg px-3 py-2 text-right text-sm tabular-nums text-text outline-none transition-colors placeholder:text-text-muted focus:border-border-strong"
            />
          </li>
        ))}
      </ul>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row-reverse">
        <button
          type="button"
          onClick={handleCheck}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          <ClipboardCheck className="size-4" />
          เช็กบิล!
        </button>
        <button
          type="button"
          onClick={onBack}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2.5 font-medium text-text transition-colors hover:border-border-strong"
        >
          <ArrowLeft className="size-4" />
          ย้อนกลับไปแก้การเลือก
        </button>
      </div>

      {checked ? (
        <PreviewDialog
          players={players}
          rawScores={checked.rawScores}
          result={checked.result}
          multiplier={multiplier}
          saving={saveState.status === "saving"}
          error={saveState.status === "error" ? saveState.message : null}
          onClose={() => {
            setChecked(null);
            setSaveState({ status: "idle" });
          }}
          onConfirm={handleConfirm}
        />
      ) : null}
    </section>
  );
}
