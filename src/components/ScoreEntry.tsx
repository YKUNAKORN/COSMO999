"use client";

// Step two of starting a round: pops up over a blurred backdrop (on iPad/PC:
// left = player score list, right = numpad; on iPhone: stacked).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardCheck,
  Crown,
  Dices,
  Flame,
  Home,
  Loader2,
  PartyPopper,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Button } from "@/components/Button";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ScoreKeypad } from "@/components/ScoreKeypad";
import { generateRoundCommentary } from "@/lib/commentary";
import { formatSignedScore, scoreTone } from "@/lib/format";
import { newMatchId, saveRound } from "@/lib/rounds";
import { calculateRoundScores, getRandomMultiplier } from "@/lib/scoring";
import { useHistory } from "@/hooks/useHistory";
import type { Player } from "@/types/models";

const MULTIPLIER_CANDIDATES = [1, 2, 4, 5, 8, 10, 20];

function getMultiplierTheme(m: number) {
  if (m >= 50) return { name: "x50", Icon: Crown };
  if (m >= 10) return { name: `x${m}`, Icon: Flame };
  if (m >= 4) return { name: `x${m}`, Icon: Zap };
  if (m >= 2) return { name: `x${m}`, Icon: Sparkles };
  return { name: "ปกติ", Icon: Target };
}

async function fireConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, zIndex: 9999 });
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; commentary: string; netScores: Record<string, number> }
  | { status: "error"; message: string };

function parseScore(value: string, isNegative = false): number {
  const digits = value.replace(/\D+/g, "");
  const parsed = Number.parseInt(digits, 10);
  if (Number.isNaN(parsed) || parsed === 0) return 0;
  return isNegative ? -parsed : parsed;
}

export function ScoreEntry({
  players,
  multiplier,
  triggerReveal = false,
  onBack,
  onReset,
}: {
  players: Player[];
  multiplier: number;
  triggerReveal?: boolean;
  onBack: () => void;
  onReset: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingMatchIdRef = useRef<{ id: string; signature: string } | null>(null);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(multiplier);
  const [revealCount, setRevealCount] = useState<number>(triggerReveal ? 1 : 0);
  const [displayMultiplier, setDisplayMultiplier] = useState<number>(
    triggerReveal ? 1 : multiplier,
  );
  const [isRevealing, setIsRevealing] = useState<boolean>(Boolean(triggerReveal));
  const [isLanded, setIsLanded] = useState<boolean>(!triggerReveal);
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({});
  const [negatives, setNegatives] = useState<Record<string, boolean>>({});
  const [activePlayerId, setActivePlayerId] = useState<string>(
    () => players[0]?.id ?? "",
  );
  const [isMobileKeypadOpen, setIsMobileKeypadOpen] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const { history } = useHistory();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // Multiplier Reveal Suspense Animation
  useEffect(() => {
    if (revealCount === 0) {
      setDisplayMultiplier(currentMultiplier);
      setIsRevealing(false);
      setIsLanded(true);
      return;
    }

    setIsRevealing(true);
    setIsLanded(false);

    const steps = [
      { delay: 100 },
      { delay: 220 },
      { delay: 360 },
      { delay: 520 },
      { delay: 700 },
      { delay: 900 },
      { delay: 1120 },
      { delay: 1360, isFinal: true },
    ];

    const timers: NodeJS.Timeout[] = [];

    steps.forEach((step) => {
      const t = setTimeout(() => {
        if (step.isFinal) {
          setDisplayMultiplier(currentMultiplier);
          setIsRevealing(false);
          setIsLanded(true);
        } else {
          const rand =
            MULTIPLIER_CANDIDATES[
              Math.floor(Math.random() * MULTIPLIER_CANDIDATES.length)
            ];
          setDisplayMultiplier(rand);
        }
      }, step.delay);
      timers.push(t);
    });

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [revealCount, currentMultiplier]);

  const theme = getMultiplierTheme(displayMultiplier);

  function selectPlayer(id: string) {
    setActivePlayerId(id);
    setIsMobileKeypadOpen(true);
  }

  function updateScore(id: string, value: string) {
    const digits = value.replace(/\D+/g, "").replace(/^0+(?=\d)/, "");
    setRawInputs((current) => ({ ...current, [id]: digits }));
    if (error) setError(null);
  }

  function toggleSign(id: string) {
    setNegatives((current) => ({ ...current, [id]: !current[id] }));
    if (error) setError(null);
  }

  function goToPrevPlayer(index: number) {
    const prevId = players[index - 1]?.id;
    if (prevId) {
      setActivePlayerId(prevId);
      setIsMobileKeypadOpen(true);
    }
  }

  async function handleSave() {
    if (saveState.status === "saving" || saveState.status === "saved") return;

    const rawScores: Record<string, number> = {};
    for (const player of players) {
      rawScores[player.id] = parseScore(
        rawInputs[player.id] ?? "",
        Boolean(negatives[player.id]),
      );
    }

    const result = calculateRoundScores(
      players.map((player) => player.id),
      rawScores,
      currentMultiplier,
    );

    if (result.totalNetScore !== 0) {
      setError(
        `ผลรวมคะแนนสุทธิไม่เท่ากับ 0 (ได้ ${result.totalNetScore}) กรุณาตรวจสอบคะแนนอีกครั้ง`,
      );
      return;
    }

    setError(null);
    setSaveState({ status: "saving" });
    const commentary = generateRoundCommentary(result.netScores, players, history);

    // Reuse the same id across retries of this round: if an earlier attempt
    // timed out on the client but still committed, the retry is a no-op
    // instead of recording the round twice.
    // The id is only reused when the scores are unchanged: if the user edits
    // the numbers before retrying, that is a different round and gets a new id.
    const signature = JSON.stringify([result.netScores, currentMultiplier]);
    if (pendingMatchIdRef.current?.signature !== signature) {
      pendingMatchIdRef.current = { id: newMatchId(), signature };
    }
    const outcome = await saveRound({
      playerIds: players.map((player) => player.id),
      netScores: result.netScores,
      multiplier: currentMultiplier,
      commentary,
      matchId: pendingMatchIdRef.current.id,
    });

    if (outcome.committed) pendingMatchIdRef.current = null;

    if (!outcome.committed) {
      setSaveState({
        status: "error",
        message: "บันทึกไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
      });
      return;
    }

    if (result.hasPositive) void fireConfetti();
    setSaveState({ status: "saved", commentary, netScores: result.netScores });
  }

  function handlePlaySameGroupAgain() {
    const rolled = getRandomMultiplier();
    setCurrentMultiplier(rolled);
    setRevealCount((c) => c + 1);
    setRawInputs({});
    setNegatives({});
    setActivePlayerId(players[0]?.id ?? "");
    setIsMobileKeypadOpen(true);
    setError(null);
    setSaveState({ status: "idle" });
  }

  function handleGoToLeaderboard() {
    dialogRef.current?.close();
    onReset();
    router.push("/leaderboard");
  }

  function handleReturnHome() {
    dialogRef.current?.close();
    onReset();
  }

  function advanceFromPlayer(index: number) {
    const nextId = players[index + 1]?.id;
    if (nextId) {
      setActivePlayerId(nextId);
      setIsMobileKeypadOpen(true);
    }
  }

  // Physical keyboard support on desktop without triggering iOS focus-scroll jumps
  useEffect(() => {
    if (!activePlayerId || saveState.status === "saving" || saveState.status === "saved") return;
    function onWindowKeyDown(event: KeyboardEvent) {
      const index = players.findIndex((p) => p.id === activePlayerId);
      if (index < 0) return;
      const id = players[index].id;

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        const currentDigits = rawInputs[id] ?? "";
        const digits = `${currentDigits}${event.key}`
          .replace(/\D+/g, "")
          .replace(/^0+(?=\d)/, "");
        setRawInputs((current) => ({ ...current, [id]: digits }));
        if (error) setError(null);
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        const currentDigits = rawInputs[id] ?? "";
        setRawInputs((current) => ({
          ...current,
          [id]: currentDigits.slice(0, -1),
        }));
        if (error) setError(null);
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        setNegatives((current) => ({ ...current, [id]: !current[id] }));
        if (error) setError(null);
        return;
      }
      if (event.key === "+") {
        event.preventDefault();
        setNegatives((current) => ({ ...current, [id]: false }));
        if (error) setError(null);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const prevId = players[index - 1]?.id;
        if (prevId) setActivePlayerId(prevId);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextId = players[index + 1]?.id;
        if (nextId) setActivePlayerId(nextId);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const nextId = players[index + 1]?.id;
        if (nextId) setActivePlayerId(nextId);
        else void handleSave();
      }
    }
    window.addEventListener("keydown", onWindowKeyDown);
    return () => window.removeEventListener("keydown", onWindowKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayerId, saveState.status, error, players, rawInputs, negatives, currentMultiplier]);

  const activeIndex = Math.max(
    0,
    players.findIndex((p) => p.id === activePlayerId),
  );
  const activePlayer = players[activeIndex] ?? players[0];
  const nextPlayer = players[activeIndex + 1];
  const currentDigits = activePlayer ? (rawInputs[activePlayer.id] ?? "") : "";
  const activeIsNegative = activePlayer
    ? Boolean(negatives[activePlayer.id])
    : false;
  const activeDisplay =
    currentDigits && currentDigits !== "0"
      ? activeIsNegative
        ? `-${currentDigits}`
        : currentDigits
      : currentDigits;

  const keypadElement = activePlayer ? (
    <ScoreKeypad
      activePlayer={activePlayer}
      activePlayerName={activePlayer.name}
      displayValue={activeDisplay}
      hasPrev={activeIndex > 0}
      hasNext={Boolean(nextPlayer)}
      isNegative={activeIsNegative}
      onDigit={(digit) =>
        updateScore(activePlayer.id, `${currentDigits}${digit}`)
      }
      onBackspace={() =>
        updateScore(activePlayer.id, currentDigits.slice(0, -1))
      }
      onToggleSign={() => toggleSign(activePlayer.id)}
      onPrev={() => goToPrevPlayer(activeIndex)}
      onNext={() => advanceFromPlayer(activeIndex)}
    />
  ) : null;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (saveState.status === "saved") handleReturnHome();
        else onBack();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && saveState.status === "saved") {
          handleReturnHome();
        }
      }}
      aria-label="กรอกคะแนน"
      className={`m-auto max-h-[92dvh] overflow-y-auto rounded-[24px] border border-black/[0.04] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-0 text-[#1C1C1E] dark:text-[#F2F2F7] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-md transition-[width] duration-200 ${
        saveState.status === "saved"
          ? "w-[min(24rem,calc(100vw-2rem))]"
          : "w-[min(26rem,calc(100vw-1.5rem))] md:w-[min(46rem,calc(100vw-3rem))]"
      }`}
    >
      {saveState.status === "saved" ? (
        <div className="reveal flex flex-col items-center gap-4 p-6 sm:p-7 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#007AFF] shadow-xs">
            <PartyPopper className="size-7" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">
              บันทึกรอบแล้ว!
            </h2>
            <p className="text-sm text-[#8E8E93] dark:text-[#98989D]">
              {saveState.commentary}
            </p>
          </div>

          <ul className="w-full overflow-hidden rounded-2xl border border-black/[0.05] dark:border-[#38383A] divide-y divide-gray-100/80 dark:divide-[#38383A] bg-gray-50/60 dark:bg-[#2C2C2E]/60 text-left">
            {[...players]
              .sort(
                (a, b) =>
                  (saveState.netScores[b.id] ?? 0) -
                  (saveState.netScores[a.id] ?? 0),
              )
              .map((player) => {
                const netScore = saveState.netScores[player.id] ?? 0;
                return (
                  <li
                    key={player.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PlayerAvatar
                        player={player}
                        className="size-8 text-xs shrink-0"
                      />
                      <span className="truncate text-sm font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">
                        {player.name}
                      </span>
                    </div>
                    <span
                      className={`text-base font-bold tabular-nums shrink-0 ${scoreTone(
                        netScore,
                      )}`}
                    >
                      {formatSignedScore(netScore)}
                    </span>
                  </li>
                );
              })}
          </ul>

          <div className="flex flex-col gap-2.5 w-full mt-1">
            <Button onClick={handlePlaySameGroupAgain}>
              <RotateCcw className="size-4.5" />
              เริ่มรอบใหม่
            </Button>
            <Button variant="secondary" onClick={handleGoToLeaderboard}>
              <Trophy className="size-4.5" />
              อันดับ
            </Button>
            <Button variant="secondary" onClick={handleReturnHome}>
              <Home className="size-4.5" />
              กลับหน้าหลัก
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          {/* 1. Full-Width Top Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid size-9 sm:size-10 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#007AFF] shadow-xs shrink-0">
                <ClipboardCheck className="size-4.5 sm:size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] truncate">
                  กรอกคะแนน
                </h2>
                <p className="text-xs text-[#8E8E93] dark:text-[#98989D]">
                  ผู้เล่น {players.length} คน
                </p>
              </div>
            </div>

            <div
              className={`flex items-center gap-2 rounded-2xl border border-black/[0.06] dark:border-[#38383A] bg-black/[0.03] dark:bg-white/[0.05] px-3 sm:px-3.5 py-1.5 shadow-xs transition-all duration-300 shrink-0 ${
                isLanded ? "ring-2 ring-blue-500/25 dark:ring-blue-500/30" : ""
              } ${revealCount > 0 && isLanded && displayMultiplier === 20 ? "animate-shake" : ""}`}
            >
              <span className="grid size-7 sm:size-8 place-items-center rounded-xl bg-white dark:bg-[#1C1C1E] text-[#007AFF] dark:text-[#2E8BFF] border border-black/[0.04] dark:border-white/5 shadow-xs">
                {isRevealing ? (
                  <Dices className="size-3.5 sm:size-4 animate-spin text-[#007AFF]" />
                ) : (
                  <theme.Icon className="size-3.5 sm:size-4 text-[#007AFF] dark:text-[#2E8BFF]" />
                )}
              </span>
              <span
                className={`text-base sm:text-lg font-black tabular-nums tracking-tight text-[#007AFF] dark:text-[#2E8BFF] transition-transform duration-300 ${
                  isLanded ? "scale-105" : "scale-100"
                }`}
              >
                x{displayMultiplier}
              </span>
            </div>
          </div>

          {/* 2. Symmetrical 2-Column Body on iPad/PC (Equal Height) */}
          <div className="grid gap-4 md:grid-cols-[1.08fr_1fr] md:items-stretch">
            <ul className="flex h-full flex-col overflow-hidden rounded-[18px] border border-black/[0.05] dark:border-[#38383A] divide-y divide-gray-100/80 dark:divide-[#38383A] bg-white dark:bg-[#1C1C1E]">
              {players.map((player) => {
                const isNegative = Boolean(negatives[player.id]);
                const isActive = activePlayer?.id === player.id;
                const digits = rawInputs[player.id] ?? "";
                const displayValue =
                  digits && digits !== "0"
                    ? isNegative
                      ? `-${digits}`
                      : digits
                    : digits;
                return (
                  <li
                    key={player.id}
                    onClick={() => selectPlayer(player.id)}
                    className={`flex flex-1 min-h-[58px] items-center gap-2.5 sm:gap-3.5 px-3.5 sm:px-4 py-3 transition-colors cursor-pointer ${
                      isActive
                        ? "bg-blue-50/40 dark:bg-blue-950/25"
                        : "hover:bg-gray-50/60 dark:hover:bg-[#2C2C2E]/40"
                    }`}
                  >
                    <PlayerAvatar player={player} className="size-10 text-sm shrink-0" />
                    <label
                      htmlFor={`score-${player.id}`}
                      className="min-w-0 flex-1 truncate text-base font-semibold text-[#1C1C1E] dark:text-[#F2F2F7] cursor-pointer"
                    >
                      {player.name}
                    </label>
                    <input
                      id={`score-${player.id}`}
                      type="text"
                      readOnly
                      inputMode="none"
                      autoComplete="off"
                      placeholder={isNegative ? "-0" : "0"}
                      value={displayValue}
                      onClick={() => selectPlayer(player.id)}
                      className={`h-11 w-28 rounded-xl border bg-white dark:bg-[#2C2C2E] px-3.5 py-1.5 text-right text-lg font-bold tabular-nums outline-none shadow-xs transition-all cursor-pointer select-none shrink-0 ${
                        isNegative
                          ? `border-[#FF3B30]/45 dark:border-[#FF453A]/50 text-[#FF3B30] dark:text-[#FF453A] placeholder:text-[#FF3B30]/45 dark:placeholder:text-[#FF453A]/45 ${
                              isActive ? "border-[#FF3B30] ring-2 ring-red-500/20" : ""
                            }`
                          : `border-black/[0.06] dark:border-[#38383A] text-[#1C1C1E] dark:text-[#F2F2F7] placeholder:text-[#8E8E93]/60 dark:placeholder:text-[#98989D]/60 ${
                              isActive ? "border-[#007AFF] ring-2 ring-blue-500/20" : ""
                            }`
                      }`}
                    />
                  </li>
                );
              })}
            </ul>

            {/* Mobile Keypad (stacked below players on iPhone) */}
            {isMobileKeypadOpen ? (
              <div className="md:hidden">{keypadElement}</div>
            ) : null}

            {/* iPad / PC Keypad (Right Column, Equal Height with Player List) */}
            <div className="hidden md:block h-full">{keypadElement}</div>
          </div>

          {error || saveState.status === "error" ? (
            <p
              role="alert"
              className="rounded-2xl border border-red-200/80 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/30 p-4 text-sm font-medium text-[#FF3B30] backdrop-blur-sm"
            >
              {error ?? (saveState.status === "error" ? saveState.message : "")}
            </p>
          ) : null}

          {/* 3. Full-Width Symmetrical Footer */}
          <div className="flex flex-col-reverse gap-2.5 sm:grid sm:grid-cols-2 sm:gap-4 border-t border-black/[0.04] dark:border-[#38383A] pt-4">
            <Button
              variant="secondary"
              onClick={onBack}
              disabled={saveState.status === "saving"}
            >
              <ArrowLeft className="size-4.5" />
              ย้อนกลับ
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveState.status === "saving"}
            >
              {saveState.status === "saving" ? (
                <Loader2 className="size-4.5 animate-spin" aria-hidden />
              ) : (
                <ClipboardCheck className="size-4.5" />
              )}
              {saveState.status === "saving" ? "กำลังบันทึก..." : "บันทึกคะแนน"}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
