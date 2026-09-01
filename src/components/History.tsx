"use client";

// History page client component. Shows all match history entries sorted
// newest-first (matchId = Date.now().toString(), so descending numeric sort).
// Each entry shows time, group, multiplier badge, per-player scores (with
// colour), commentary (lucide icon, no emoji), and an Undo button per round.
// A top-level Recalculate button replays all history to correct any drift.
// Both destructive actions use ConfirmDialog - never confirm()/alert().
import { useState } from "react";
import {
  ClipboardList,
  Loader2,
  MessageSquare,
  RefreshCw,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useHistory } from "@/hooks/useHistory";
import { usePlayers } from "@/hooks/usePlayers";
import { undoRound, recalculateScores } from "@/lib/rounds";
import type { HistoryEntry, Player } from "@/types/models";

// Sign-aware formatting for a score: +5, -3, 0
function formatScore(score: number): string {
  if (score > 0) return `+${score}`;
  return `${score}`;
}

// Tailwind class for the score colour token.
function scoreTone(score: number): string {
  if (score > 0) return "text-success";
  if (score < 0) return "text-danger";
  return "text-text-muted";
}

// Single history card. Receives the live players list so deleted players
// can be detected and shown as "(ถูกลบ)" rather than crashing or hiding.
function HistoryCard({
  entry,
  players,
  onUndo,
}: {
  entry: HistoryEntry;
  players: Player[];
  onUndo: (matchId: string) => void;
}) {
  const timeStr = new Date(entry.timestamp).toLocaleString("th-TH");

  return (
    <article className="reveal flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-card">
      {/* Header row: time + group name + multiplier badge */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <time
            dateTime={entry.timestamp}
            className="text-xs text-text-muted tabular-nums"
          >
            {timeStr}
          </time>
          <span className="text-sm font-semibold">{entry.groupName}</span>
        </div>
        <span className="shrink-0 rounded-full border border-border-strong bg-surface-raised px-2.5 py-0.5 text-xs font-bold tabular-nums text-accent">
          x{entry.multiplier}
        </span>
      </div>

      {/* Per-player score chips */}
      <ul className="flex flex-wrap gap-2">
        {Object.entries(entry.playerScores).map(([pId, score]) => {
          const player = players.find((p) => p.id === pId);
          return (
            <li
              key={pId}
              className="flex items-center gap-2 rounded-md border border-border bg-surface-raised px-2.5 py-1.5"
            >
              {player ? (
                <PlayerAvatar player={player} className="size-6 text-xs" />
              ) : null}
              <span className="text-xs font-medium">
                {player ? player.name : "(ถูกลบ)"}
              </span>
              <span
                className={`text-xs font-bold tabular-nums ${scoreTone(score)}`}
              >
                {formatScore(score)}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Commentary line (lucide icon leads, no emoji) */}
      {entry.commentary ? (
        <p className="flex items-start gap-1.5 text-xs italic text-text-muted">
          <MessageSquare
            className="mt-0.5 size-3.5 shrink-0 text-accent"
            aria-hidden
          />
          {entry.commentary}
        </p>
      ) : null}

      {/* Undo button for this round */}
      <button
        type="button"
        onClick={() => onUndo(entry.id)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:border-danger hover:bg-danger/10 hover:text-danger"
      >
        <Undo2 className="size-4" aria-hidden />
        ยกเลิกผลรอบนี้
      </button>
    </article>
  );
}

export function History() {
  const { history, loading, error } = useHistory();
  const { players } = usePlayers();

  // matchId of the entry the user wants to undo; null means dialog closed.
  const [undoPending, setUndoPending] = useState<string | null>(null);
  const [undoBusy, setUndoBusy] = useState(false);
  const [undoError, setUndoError] = useState<string | null>(null);

  // Recalculate dialog state.
  const [recalcPending, setRecalcPending] = useState(false);
  const [recalcBusy, setRecalcBusy] = useState(false);
  const [recalcError, setRecalcError] = useState<string | null>(null);

  // Sort newest-first: matchId is Date.now().toString() so lexicographic
  // descending equals chronological descending for the same numeric magnitude.
  const sorted = [...history].sort((a, b) => b.id.localeCompare(a.id));

  // --- Handlers ---

  function handleUndoRequest(matchId: string) {
    setUndoError(null);
    setUndoPending(matchId);
  }

  async function handleUndoConfirm() {
    if (!undoPending) return;
    setUndoBusy(true);
    setUndoError(null);
    const { committed } = await undoRound(undoPending);
    setUndoBusy(false);
    if (committed) {
      setUndoPending(null);
    } else {
      // Leave dialog open so the user sees the error inline.
      setUndoError("ยกเลิกรอบไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
    }
  }

  function handleUndoClose() {
    if (undoBusy) return;
    setUndoPending(null);
    setUndoError(null);
  }

  async function handleRecalcConfirm() {
    setRecalcBusy(true);
    setRecalcError(null);
    const { committed } = await recalculateScores();
    setRecalcBusy(false);
    if (committed) {
      setRecalcPending(false);
    } else {
      setRecalcError("คำนวณใหม่ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
    }
  }

  function handleRecalcClose() {
    if (recalcBusy) return;
    setRecalcPending(false);
    setRecalcError(null);
  }

  // --- Render ---

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ประวัติการเล่น</h1>
          <p className="mt-1 text-sm text-text-muted">
            {sorted.length > 0
              ? `${sorted.length} รอบ — เรียงล่าสุดก่อน`
              : "\u00a0"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRecalcError(null);
            setRecalcPending(true);
          }}
          className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text"
        >
          <RefreshCw className="size-4" aria-hidden />
          คำนวณคะแนนใหม่จากประวัติ
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div
          className="flex flex-col items-center gap-3 py-20 text-text-muted"
          aria-live="polite"
          aria-label="กำลังโหลด"
        >
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <span className="text-sm">กำลังโหลดประวัติ...</span>
        </div>
      ) : error ? (
        /* Error state */
        <div
          className="flex flex-col items-center gap-3 py-20 text-danger"
          role="alert"
        >
          <TriangleAlert className="size-8" aria-hidden />
          <p className="text-sm font-medium">โหลดประวัติไม่สำเร็จ</p>
          <p className="text-xs text-text-muted">
            กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้า
          </p>
        </div>
      ) : sorted.length === 0 ? (
        /* Intentional empty state */
        <div className="flex flex-col items-center gap-4 py-20 text-text-muted">
          <ClipboardList className="size-12 text-border-strong" aria-hidden />
          <div className="text-center">
            <p className="font-semibold text-text">ยังไม่มีประวัติการเล่น</p>
            <p className="mt-1 text-sm">
              บันทึกรอบแรกจากหน้าหลักเพื่อเริ่มติดตามคะแนน
            </p>
          </div>
        </div>
      ) : (
        /* History list */
        <ol className="flex flex-col gap-3">
          {sorted.map((entry) => (
            <li key={entry.id}>
              <HistoryCard
                entry={entry}
                players={players}
                onUndo={handleUndoRequest}
              />
            </li>
          ))}
        </ol>
      )}

      {/* Undo confirm dialog */}
      {undoPending !== null ? (
        <ConfirmDialog
          title="ยกเลิกผลรอบนี้?"
          description="คะแนนของรอบนี้จะถูกหักออกจากคะแนนรวมของทุกคนที่เล่นในรอบนั้น และรายการในประวัติจะถูกลบออก"
          confirmLabel="ยืนยันยกเลิก"
          destructive
          busy={undoBusy}
          error={undoError}
          onConfirm={handleUndoConfirm}
          onClose={handleUndoClose}
        />
      ) : null}

      {/* Recalculate confirm dialog */}
      {recalcPending ? (
        <ConfirmDialog
          title="คำนวณคะแนนใหม่จากประวัติ?"
          description="คะแนนรวมและคะแนนกลุ่มของทุกคนจะถูกคำนวณใหม่ทั้งหมดจากประวัติ เพื่อให้ตรงกับผลรวมจริง"
          confirmLabel="คำนวณใหม่"
          busy={recalcBusy}
          error={recalcError}
          onConfirm={handleRecalcConfirm}
          onClose={handleRecalcClose}
        />
      ) : null}
    </div>
  );
}
