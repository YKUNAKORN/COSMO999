"use client";

// Real-time leaderboard: top-3 podium (Kahoot-style), a roast callout for
// the lowest scorer, and a plain ranked list for everyone else. Scores are
// derived from `history` for the selected view (current period / all-time /
// a past period) - read-only, this component and everything it renders
// never writes to Firebase.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarX,
  Crown,
  Spade,
  TriangleAlert,
  Users,
  Flame,
  Banknote,
  Ghost,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { usePlayers } from "@/hooks/usePlayers";
import { useHistory } from "@/hooks/useHistory";
import { aggregatePeriod } from "@/lib/leaderboard";
import { getCurrentPeriod, listPeriodsInHistory } from "@/lib/periods";
import type { Player } from "@/types/models";

// Matches the JS animation duration in AnimatedNumber / --duration-slow, so
// the pulse class clears right as the CSS keyframe finishes.
const PULSE_DURATION_MS = 520;

function scoreTone(score: number): string {
  if (score > 0) return "text-success";
  if (score < 0) return "text-danger";
  return "text-text-muted";
}

function formatSigned(score: number): string {
  return score > 0 ? `+${score}` : `${score}`;
}

// Tracks which players' view score just changed (a live update landed from
// elsewhere) and reports back the ids to flash for one pulse cycle.
// Switching the active view itself is not a live update - the baseline is
// re-synced silently on a view change so it never triggers a false pulse.
function usePulseOnChange(
  scores: Record<string, number>,
  viewKey: string,
): Set<string> {
  const prevScoresRef = useRef<Record<string, number>>({});
  const prevViewKeyRef = useRef<string>(viewKey);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const viewChanged = prevViewKeyRef.current !== viewKey;
    prevViewKeyRef.current = viewKey;

    if (!viewChanged) {
      const previous = prevScoresRef.current;
      const changedIds = Object.keys(scores).filter((id) => {
        const before = previous[id];
        return before !== undefined && before !== scores[id];
      });

      if (changedIds.length > 0) {
        setPulsingIds((current) => new Set([...current, ...changedIds]));
        for (const id of changedIds) {
          clearTimeout(timersRef.current[id]);
          timersRef.current[id] = setTimeout(() => {
            setPulsingIds((current) => {
              const next = new Set(current);
              next.delete(id);
              return next;
            });
          }, PULSE_DURATION_MS);
        }
      }
    }

    prevScoresRef.current = scores;
  }, [scores, viewKey]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of Object.values(timers)) clearTimeout(timer);
    };
  }, []);

  return pulsingIds;
}

function LatestScoreLabel({ latestScore }: { latestScore: number | null }) {
  // Firebase drops a key entirely when it is written as null (RTDB's
  // "null deletes the field" rule - see createPlayer in lib/players.ts), so
  // a never-scored player reads back with latestScore missing (undefined)
  // at runtime even though the type only declares number | null.
  if (latestScore == null) {
    return (
      <p className="text-xs text-text-muted">รอบล่าสุด ยังไม่ได้เล่น</p>
    );
  }
  return (
    <p className="text-xs text-text-muted">
      รอบล่าสุด{" "}
      <span className={scoreTone(latestScore)}>
        {formatSigned(latestScore)}
      </span>
    </p>
  );
}

const PODIUM_STYLE: Record<
  1 | 2 | 3,
  { pedestal: string; height: string; avatar: string }
> = {
  1: {
    pedestal: "bg-accent",
    height: "h-28 sm:h-36",
    avatar: "size-20 text-2xl sm:size-24",
  },
  2: {
    pedestal: "bg-rank-silver",
    height: "h-20 sm:h-24",
    avatar: "size-16 text-xl sm:size-20",
  },
  3: {
    pedestal: "bg-rank-bronze",
    height: "h-16 sm:h-20",
    avatar: "size-16 text-xl sm:size-20",
  },
};

function PodiumCard({
  rank,
  player,
  score,
  showLatestScore,
  pulsing,
}: {
  rank: 1 | 2 | 3;
  player: Player;
  score: number;
  showLatestScore: boolean;
  pulsing: boolean;
}) {
  const style = PODIUM_STYLE[rank];
  return (
    <div
      className="reveal flex w-24 flex-col items-center gap-2 sm:w-28"
      style={{ animationDelay: `${(rank - 1) * 100}ms` }}
    >
      <div className="flex flex-col items-center gap-1 relative">
        {rank === 1 ? (
          <Crown className="size-6 text-accent" />
        ) : (
          <span className="h-6" aria-hidden />
        )}
        <span className={rank === 1 ? "rounded-full shadow-gold" : ""}>
          <PlayerAvatar player={player} className={style.avatar} />
        </span>
        {rank === 1 && (
          <img
            src="/memes/meme_mvp.jpg"
            alt="MVP Meme"
            className="absolute -right-6 -bottom-2 size-12 rounded-full border-2 border-accent object-cover rotate-12 shadow-md"
          />
        )}
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <p className="w-full truncate text-center text-sm font-semibold sm:text-base">
          {player.name}
        </p>
        {rank === 1 ? (
          <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
            <Flame className="size-3" /> ตัวตึง
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-text-muted">
            <Ghost className="size-3" /> ทรงอย่างแบด
          </span>
        )}
      </div>
      <AnimatedNumber
        value={score}
        className={`text-lg font-bold tabular-nums sm:text-xl ${scoreTone(score)}`}
      />
      {showLatestScore ? (
        <LatestScoreLabel latestScore={player.latestScore} />
      ) : null}

      <div
        className={`flex w-full items-center justify-center rounded-t-lg shadow-card ${style.pedestal} ${style.height} ${pulsing ? "pulse-highlight" : ""}`}
      >
        <span className="text-2xl font-black text-on-accent">{rank}</span>
      </div>
    </div>
  );
}

function Podium({
  entries,
  pulsingIds,
  showLatestScore,
}: {
  entries: Array<{ player: Player; score: number }>;
  pulsingIds: Set<string>;
  showLatestScore: boolean;
}) {
  const slots: Array<1 | 2 | 3> = [2, 1, 3];
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      {slots.map((rank) => {
        const entry = entries[rank - 1];
        if (!entry) return null;
        return (
          <PodiumCard
            key={entry.player.id}
            rank={rank}
            player={entry.player}
            score={entry.score}
            showLatestScore={showLatestScore}
            pulsing={pulsingIds.has(entry.player.id)}
          />
        );
      })}
    </div>
  );
}

function RoastCallout({
  player,
  score,
  pulsing,
}: {
  player: Player;
  score: number;
  pulsing: boolean;
}) {
  return (
    <div
      className={`reveal flex items-center gap-3 rounded-lg border border-danger/40 bg-surface p-4 shadow-card ${pulsing ? "pulse-highlight" : ""}`}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-danger/15 text-danger">
        <Banknote className="size-5" />
      </span>
      <div className="relative">
        <PlayerAvatar player={player} className="size-11 text-lg" />
        <img
          src="/memes/meme_atm.jpg"
          alt="Crying Cat ATM"
          className="absolute -right-2 -bottom-2 size-6 rounded-full border border-danger object-cover -rotate-12"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-wide text-danger">
          หมูแจกแต้ม
        </p>
        <p className="truncate font-semibold">{player.name}</p>
      </div>
      <AnimatedNumber
        value={score}
        className={`text-lg font-bold tabular-nums ${scoreTone(score)}`}
      />
    </div>
  );
}

function LeaderboardRow({
  player,
  score,
  rank,
  showLatestScore,
  pulsing,
  delayMs,
}: {
  player: Player;
  score: number;
  rank: number;
  showLatestScore: boolean;
  pulsing: boolean;
  delayMs: number;
}) {
  return (
    <li
      className={`reveal flex items-center gap-3 rounded-lg border border-border bg-surface p-3 ${pulsing ? "pulse-highlight" : ""}`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border-strong bg-surface-raised text-sm font-semibold text-text-muted">
        {rank}
      </span>
      <PlayerAvatar player={player} className="size-10 text-base" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{player.name}</p>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-medium text-text-muted">
            <Ghost className="size-3" /> ผู้ทรงศีล
          </span>
        </div>
        {showLatestScore ? (
          <LatestScoreLabel latestScore={player.latestScore} />
        ) : null}
      </div>
      <AnimatedNumber
        value={score}
        className={`text-base font-bold tabular-nums ${scoreTone(score)}`}
      />
    </li>
  );
}

function StateMessage({
  icon: Icon,
  title,
  description,
  tone = "accent",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "accent" | "danger";
}) {
  return (
    <div className="reveal flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
      <span
        className={`grid size-16 place-items-center rounded-full border bg-surface-raised ${
          tone === "danger"
            ? "border-danger-strong text-danger"
            : "border-border-strong text-accent shadow-gold"
        }`}
      >
        <Icon className="size-8" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mx-auto max-w-xs text-sm text-text-muted">
          {description}
        </p>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="reveal flex flex-col gap-6">
      <p className="text-sm text-text-muted">กำลังโหลดอันดับ...</p>
      <div className="flex items-end justify-center gap-3 sm:gap-5">
        {([2, 1, 3] as const).map((rank) => (
          <div key={rank} className="flex w-24 flex-col items-center gap-2 sm:w-28">
            <div className="size-16 animate-pulse rounded-full bg-surface-raised sm:size-20" />
            <div className="h-3 w-16 animate-pulse rounded bg-surface-raised" />
            <div
              className={`w-full animate-pulse rounded-t-lg bg-surface-raised ${PODIUM_STYLE[rank].height}`}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-raised" />
        ))}
      </div>
    </div>
  );
}

// View switcher: a segmented "current period / all-time" toggle plus a
// dropdown for past periods that actually have rounds in them.
function ViewSwitcher({
  viewKey,
  onChange,
  currentPeriodKey,
  pastPeriods,
}: {
  viewKey: string;
  onChange: (key: string) => void;
  currentPeriodKey: string;
  pastPeriods: Array<{ key: string; label: string }>;
}) {
  const isPastPeriodActive =
    viewKey !== "all" && viewKey !== currentPeriodKey;

  return (
    <div className="reveal flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex w-fit gap-1 rounded-md border border-border bg-surface-raised p-1">
        <button
          type="button"
          aria-pressed={viewKey === currentPeriodKey}
          onClick={() => onChange(currentPeriodKey)}
          className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
            viewKey === currentPeriodKey
              ? "bg-accent text-on-accent"
              : "text-text-muted hover:text-text"
          }`}
        >
          งวดนี้
        </button>
        <button
          type="button"
          aria-pressed={viewKey === "all"}
          onClick={() => onChange("all")}
          className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
            viewKey === "all"
              ? "bg-accent text-on-accent"
              : "text-text-muted hover:text-text"
          }`}
        >
          ตลอดกาล
        </button>
      </div>

      {pastPeriods.length > 0 ? (
        <select
          aria-label="ดูงวดย้อนหลัง"
          value={isPastPeriodActive ? viewKey : ""}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-border-strong focus:outline-none"
        >
          <option value="">ดูงวดย้อนหลัง...</option>
          {pastPeriods.map((period) => (
            <option key={period.key} value={period.key}>
              {period.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

export function Leaderboard() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const { history, loading: historyLoading, error: historyError } = useHistory();
  const loading = playersLoading || historyLoading;
  const error = playersError ?? historyError;

  const [viewKey, setViewKey] = useState<string>(() => getCurrentPeriod().key);
  const currentPeriod = getCurrentPeriod();

  const periodsInHistory = useMemo(
    () => listPeriodsInHistory(history),
    [history],
  );
  const pastPeriods = periodsInHistory.filter(
    (period) => period.key !== currentPeriod.key,
  );
  const selectablePeriods = periodsInHistory.some(
    (period) => period.key === currentPeriod.key,
  )
    ? periodsInHistory
    : [currentPeriod, ...periodsInHistory];
  const activePeriod =
    selectablePeriods.find((period) => period.key === viewKey) ?? null;

  const scores = useMemo(
    () => aggregatePeriod(history, viewKey),
    [history, viewKey],
  );
  const isViewEmpty = Object.keys(scores).length === 0;

  const pulsingIds = usePulseOnChange(scores, viewKey);

  if (loading) {
    return <LeaderboardSkeleton />;
  }

  if (error) {
    return (
      <StateMessage
        icon={TriangleAlert}
        title="เชื่อมต่อกระดานคะแนนไม่ได้"
        description="หลุดการเชื่อมต่อกับฐานข้อมูล ลองรีเฟรชหน้าใหม่อีกครั้ง"
        tone="danger"
      />
    );
  }

  if (players.length === 0) {
    return (
      <StateMessage
        icon={Users}
        title="ยังไม่มีผู้เล่น"
        description="ไปเพิ่มผู้เล่นที่หน้าเล่นก่อน แล้วอันดับจะขึ้นตรงนี้"
      />
    );
  }

  const viewSwitcher = (
    <ViewSwitcher
      viewKey={viewKey}
      onChange={setViewKey}
      currentPeriodKey={currentPeriod.key}
      pastPeriods={pastPeriods}
    />
  );

  if (isViewEmpty) {
    // No history at all means every view would be empty, so that gets the
    // "nobody has played yet" CTA. A single empty period (while other
    // periods do have data) gets a neutral, period-agnostic empty state -
    // it must stay period-agnostic because the active view can be a past
    // period too (its last round can be undone from the history page while
    // this view is still open).
    return (
      <div className="flex flex-col gap-6">
        <header className="reveal">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            อันดับ
          </h1>
        </header>
        {viewSwitcher}
        {viewKey === "all" || history.length === 0 ? (
          <StateMessage
            icon={Spade}
            title="ยังไม่มีใครลงมือเล่น"
            description="เริ่มรอบแรกกันเลย พอมีคะแนนแล้วอันดับจะเรียงให้อัตโนมัติ"
          />
        ) : (
          <StateMessage
            icon={CalendarX}
            title="ไม่พบรอบในงวดที่เลือก"
            description={`ยังไม่มีการบันทึกคะแนนในช่วง ${activePeriod?.label ?? ""} ลองดูงวดอื่นหรือสลับไปดูตลอดกาล`}
          />
        )}
      </div>
    );
  }

  const showLatestScore = viewKey === "all";
  const scored = players.map((player) => ({
    player,
    score: scores[player.id] ?? 0,
  }));
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const podiumEntries = sorted.slice(0, 3);
  const restEntries = sorted.slice(3);
  const lowestEntry = sorted[sorted.length - 1];
  const showRoast = sorted.length >= 2;

  return (
    <div className="flex flex-col gap-6">
      <header className="reveal">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          อันดับ
        </h1>
        <p className="text-sm text-text-muted">
          {viewKey === "all"
            ? "จัดอันดับสายไพ่ประจำวง เรียงจากคะแนนรวมมากไปน้อย"
            : `งวด ${activePeriod?.label ?? ""}`}
        </p>
      </header>

      {viewSwitcher}

      {showRoast ? (
        <div className="overflow-hidden rounded-full border border-danger/30 bg-danger/10 py-1.5 px-3">
          <p className="animate-marquee whitespace-nowrap text-xs font-semibold text-danger">
            <Flame className="mr-1 inline size-3 align-[-0.125em]" aria-hidden />
            ข่าวด่วน: {sorted[0].player.name} แบกตี้จนปวดหลัง ส่วน {lowestEntry.player.name} ล้มละลาย เตรียมขอกู้เงินนอกระบบ...
          </p>
        </div>
      ) : null}

      <Podium
        entries={podiumEntries}
        pulsingIds={pulsingIds}
        showLatestScore={showLatestScore}
      />

      {showRoast ? (
        <RoastCallout
          player={lowestEntry.player}
          score={lowestEntry.score}
          pulsing={pulsingIds.has(lowestEntry.player.id)}
        />
      ) : null}

      {restEntries.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {restEntries.map((entry, index) => (
            <LeaderboardRow
              key={entry.player.id}
              player={entry.player}
              score={entry.score}
              rank={index + 4}
              showLatestScore={showLatestScore}
              pulsing={pulsingIds.has(entry.player.id)}
              delayMs={index * 60}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
