"use client";

// Latest round recap card on the play page. Ported from the legacy prototype's
// renderLatestRoundInfo (reference/legacy-prototype.sanitized.html L1129-1170)
// and playLastGroupAgain (L657-675).
// Shows the most recently saved round's breakdown: group name, multiplier,
// timestamp, per-player score breakdown, commentary roast, and an instant
// "เล่นกลุ่มเดิมอีกครั้ง" shortcut button with inline player count guards.
import { useState } from "react";
import { Clock, Flame, RotateCcw, Sparkles, Dices } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { HistoryEntry, Player } from "@/types/models";

function scoreTone(score: number): string {
  if (score > 0) return "text-success";
  if (score < 0) return "text-danger";
  return "text-text-muted";
}

function formatScore(score: number): string {
  if (score > 0) return `+${score}`;
  return `${score}`;
}

export function LatestRoundCard({
  history,
  players,
  onPlayAgain,
}: {
  history: HistoryEntry[];
  players: Player[];
  onPlayAgain: (playerIds: string[]) => void;
}) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [penalty, setPenalty] = useState<string | null>(null);

  // Sort history newest-first by matchId (Date.now().toString() timestamp).
  const latestMatch =
    history.length > 0
      ? [...history].sort((a, b) => Number(b.id) - Number(a.id))[0]
      : null;

  if (!latestMatch) return null;

  const playerScores = latestMatch.playerScores || {};
  const entries = Object.entries(playerScores);

  function handlePlayAgain() {
    setErrorMsg(null);
    const roundPlayerIds = Object.keys(playerScores);
    // Filter to players that still exist in the active roster.
    const validIds = roundPlayerIds.filter((id) =>
      players.some((p) => p.id === id),
    );

    if (validIds.length < 2) {
      setErrorMsg("สมาชิกกลุ่มเดิมไม่ครบหรือเหลือน้อยกว่า 2 คน");
      return;
    }

    onPlayAgain(validIds);
  }

  const timeString = new Date(latestMatch.timestamp).toLocaleString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });

  return (
    <section
      aria-labelledby="latest-round-title"
      className="reveal flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card transition-colors hover:border-border-strong"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-accent" aria-hidden />
          <h2 id="latest-round-title" className="text-lg font-bold tracking-tight">
            สรุปรอบล่าสุด
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Clock className="size-3.5" aria-hidden />
            {timeString}
          </span>
          <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs font-semibold text-accent">
            x{latestMatch.multiplier}
          </span>
        </div>
      </div>

      {/* Group Name */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3 text-sm">
        <span className="text-text-muted">กลุ่ม:</span>
        <span className="font-semibold text-text">{latestMatch.groupName}</span>
      </div>

      {/* Player Scores Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {entries.map(([pId, score]) => {
          const player = players.find((p) => p.id === pId);
          const maxScore = Math.max(...entries.map((e) => e[1]));
          const isWinner = score === maxScore;
          const isLoser = score < 0;

          return (
            <div
              key={pId}
              className={`flex items-center gap-2.5 rounded-md border p-2.5 transition-transform active:scale-[0.98] ${
                isWinner
                  ? "border-success/30 bg-success/5"
                  : isLoser
                    ? "border-danger/30 bg-danger/5"
                    : "border-border bg-surface-raised"
              }`}
            >
              {player ? (
                <PlayerAvatar player={player} className="size-8 text-xs" />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-xs text-text-muted">
                  ?
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                  {player ? player.name : "(ถูกลบ)"}
                </p>
                <p
                  className={`text-sm font-bold tabular-nums ${scoreTone(
                    score,
                  )}`}
                >
                  {formatScore(score)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Commentary Roast Box */}
      {latestMatch.commentary && latestMatch.commentary.trim() !== "" ? (
        <div className="flex items-start gap-2.5 rounded-md border border-accent/30 bg-accent/10 p-3 text-xs text-accent">
          <Flame className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <p className="font-medium leading-relaxed">
            {latestMatch.commentary}
          </p>
        </div>
      ) : null}

      {/* Error Message */}
      {errorMsg ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {errorMsg}
        </p>
      ) : null}

      {/* Random Penalty Box */}
      {penalty ? (
        <div className="flex flex-col gap-2 rounded-md border border-danger/30 bg-danger/10 p-3 text-danger">
          <div className="flex items-start gap-2.5 text-xs">
            <Dices className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
            <p className="font-medium leading-relaxed">{penalty}</p>
          </div>
          <img
            src="/memes/meme_penalty.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full max-h-32 object-cover rounded-sm border border-danger/20"
          />
        </div>
      ) : null}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            const PENALTIES = [
              "โดนปรับไปเต้นติ๊กต็อกหน้าเซเว่น",
              "ต้องเลี้ยงชาบูเพื่อนมื้อหน้า",
              "ให้เป็นทาสรับใช้ 1 วันเต็ม",
              "ซิทอัพ 50 ทีเดี๋ยวนี้!",
              "พูดจ๊ะจ๋ากับทุกคนในตี้ 1 วัน",
              "โพสต์บอกรักแฟนเก่าลงสตอรี่",
              "ห้ามพูดคำหยาบ 1 ชั่วโมง (หลุดปรับ 20)",
            ];
            const minScore = Math.min(...entries.map(e => e[1]));
            const losers = entries.filter(e => e[1] === minScore);
            const randomLoser = losers[Math.floor(Math.random() * losers.length)];
            const loserPlayer = players.find(p => p.id === randomLoser[0]);
            if (loserPlayer) {
              const randomTask = PENALTIES[Math.floor(Math.random() * PENALTIES.length)];
              setPenalty(`กรรมตามสนอง! ${loserPlayer.name} ต้อง: ${randomTask}`);
            }
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-danger bg-danger/15 px-3 py-2.5 text-sm font-semibold text-danger transition-all hover:bg-danger hover:text-on-danger active:scale-[0.98]"
        >
          <Dices className="size-4" aria-hidden />
          สุ่มบทลงโทษ
        </button>

        {/* Play Last Group Again Button */}
        <button
          type="button"
          onClick={handlePlayAgain}
          className="flex flex-1 items-center justify-center gap-2 rounded-md border border-accent bg-accent/15 px-3 py-2.5 text-sm font-semibold text-accent transition-all hover:bg-accent hover:text-on-accent active:scale-[0.98]"
        >
          <RotateCcw className="size-4" aria-hidden />
          เล่นกลุ่มเดิม
        </button>
      </div>
    </section>
  );
}
