"use client";

// Real-time leaderboard: top-3 podium (Kahoot-style), a roast callout for
// the lowest scorer, and an iOS Grouped List for everyone else.
// Mobile-first iOS guidelines: min 44px touch targets on tabs and controls,
// active:scale-95 feedback, and iOS Grouped List.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CalendarX,
  Crown,
  Medal,
  PiggyBank,
  Shield,
  ShieldAlert,
  Spade,
  Sparkles,
  Sun,
  Target,
  TriangleAlert,
  Trophy,
  Users,
  Flame,
  Banknote,
  Ghost,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { HallOfFameCard } from "@/components/HallOfFameCard";
import { InteractiveSegmentedControl } from "@/components/InteractiveSegmentedControl";
import { PeriodDropdownPicker } from "@/components/PeriodDropdownPicker";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { usePlayers } from "@/hooks/usePlayers";
import { useHistory } from "@/hooks/useHistory";
import { getHallOfFame, getTrophyCounts, type PeriodResult } from "@/lib/honors";
import { aggregatePeriod } from "@/lib/leaderboard";
import { getCurrentPeriod, listPeriodsInHistory } from "@/lib/periods";
import {
  computePeriodPlayerStats,
  getPersonalTitle,
  type PersonalTitle,
  type TitleIcon,
} from "@/lib/titles";
import type { Player } from "@/types/models";
import { scoreTone } from "@/lib/format";

const PULSE_DURATION_MS = 520;


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


function TrophyBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded-full bg-blue-50/80 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-[#007AFF]"
      aria-label={`เป็นเซียนไพ่ประจำงวดสะสม ${count} ครั้ง`}
    >
      <Crown className="size-3 fill-current" aria-hidden /> x{count}
    </span>
  );
}

const TITLE_ICON_MAP: Record<TitleIcon, React.ComponentType<{ className?: string }>> = {
  Crown,
  PiggyBank,
  Target,
  Flame,
  Zap,
  Activity,
  Sparkles,
  Shield,
  ShieldAlert,
  Sun,
  Ghost,
};

function PersonalTitleBadge({
  title,
  className = "",
}: {
  title: PersonalTitle | null;
  className?: string;
}) {
  if (!title) return null;
  const Icon = TITLE_ICON_MAP[title.iconName] ?? Sparkles;
  const toneClasses = {
    accent: "bg-blue-50/80 border border-blue-500/20 text-[#007AFF]",
    danger: "bg-red-50/80 border border-red-500/20 text-[#FF3B30]",
    success: "bg-green-50/80 border border-green-500/20 text-[#34C759]",
    muted: "bg-black/[0.04] text-[#8E8E93]",
  }[title.tone];

  return (
    <span
      title={title.description}
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold leading-tight ${toneClasses} ${className}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span>{title.title}</span>
    </span>
  );
}

const PODIUM_STYLE: Record<
  1 | 2 | 3,
  { avatar: string; ring: string; badge: string; crown: string }
> = {
  1: {
    avatar: "size-20 text-2xl sm:size-24",
    ring: "ring-4 ring-yellow-400/50 dark:ring-yellow-500/40 shadow-lg shadow-yellow-500/15",
    badge: "bg-gradient-to-b from-yellow-400 to-amber-500 text-white shadow-sm ring-2 ring-white dark:ring-[#1C1C1E]",
    crown: "text-yellow-500 fill-yellow-500",
  },
  2: {
    avatar: "size-16 text-xl sm:size-20",
    ring: "ring-3 ring-gray-300 dark:ring-gray-600 shadow-sm",
    badge: "bg-gradient-to-b from-gray-300 to-gray-400 text-white shadow-sm ring-2 ring-white dark:ring-[#1C1C1E]",
    crown: "",
  },
  3: {
    avatar: "size-16 text-xl sm:size-20",
    ring: "ring-3 ring-amber-600/40 dark:ring-amber-500/40 shadow-sm",
    badge: "bg-gradient-to-b from-amber-600 to-amber-700 text-white shadow-sm ring-2 ring-white dark:ring-[#1C1C1E]",
    crown: "",
  },
};

function PodiumCard({
  rank,
  player,
  score,
  championCount,
  personalTitle,
  pulsing,
}: {
  rank: 1 | 2 | 3;
  player: Player;
  score: number;
  championCount: number;
  personalTitle: PersonalTitle | null;
  pulsing: boolean;
}) {
  const style = PODIUM_STYLE[rank];
  return (
    <div
      className={`reveal flex w-28 sm:w-32 flex-col items-center gap-1.5 transition-transform duration-300 ${
        rank === 1 ? "-translate-y-2 sm:-translate-y-3" : "translate-y-0"
      } ${pulsing ? "pulse-highlight" : ""}`}
      style={{ animationDelay: `${(rank - 1) * 100}ms` }}
    >
      {/* Crown + Avatar with Rank Badge */}
      <div className="flex flex-col items-center relative mb-1">
        {rank === 1 ? (
          <Crown className={`size-6 sm:size-7 ${style.crown} drop-shadow-sm -mb-0.5 z-10`} />
        ) : (
          <span className="h-6 sm:h-7" aria-hidden />
        )}
        <div className="relative">
          <span className={`block rounded-full ${style.ring}`}>
            <PlayerAvatar player={player} className={style.avatar} />
          </span>
          {/* Circular Ranking Badge */}
          <span
            className={`absolute -bottom-1 left-1/2 -translate-x-1/2 flex size-5.5 sm:size-6 items-center justify-center rounded-full text-xs font-black tabular-nums ${style.badge}`}
          >
            {rank}
          </span>
        </div>
      </div>

      {/* Name + Badges */}
      <div className="flex flex-col items-center gap-0.5 mt-1 w-full px-1">
        <p className="w-full truncate text-center text-sm font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] sm:text-base">
          {player.name}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1">
          <TrophyBadge count={championCount} />
          <PersonalTitleBadge title={personalTitle} className="text-center" />
        </div>
      </div>

      {/* Score */}
      <AnimatedNumber
        value={score}
        className={`text-lg font-bold tabular-nums sm:text-xl ${scoreTone(score)}`}
      />
    </div>
  );
}

function Podium({
  entries,
  pulsingIds,
}: {
  entries: Array<{
    player: Player;
    score: number;
    championCount: number;
    personalTitle: PersonalTitle | null;
  }>;
  pulsingIds: Set<string>;
}) {
  const slots: Array<1 | 2 | 3> = [2, 1, 3];
  return (
    <div className="flex items-start justify-center gap-3 sm:gap-8 pt-4 pb-2">
      {slots.map((rank) => {
        const entry = entries[rank - 1];
        if (!entry) return null;
        return (
          <PodiumCard
            key={entry.player.id}
            rank={rank}
            player={entry.player}
            score={entry.score}
            championCount={entry.championCount}
            personalTitle={entry.personalTitle}
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
      className={`reveal flex items-center gap-3.5 rounded-[20px] border border-red-200/80 dark:border-red-900/50 bg-white dark:bg-[#1C1C1E] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none ${pulsing ? "pulse-highlight" : ""}`}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-50 dark:bg-red-950/40 text-[#FF3B30] shadow-2xs">
        <Banknote className="size-5" />
      </span>
      <PlayerAvatar player={player} className="size-11 text-lg shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-[#FF3B30]">
          หมูแจกแต้ม
        </p>
        <p className="truncate font-bold text-[#1C1C1E] dark:text-[#F2F2F7]">{player.name}</p>
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
  championCount,
  rank,
  personalTitle,
  pulsing,
}: {
  player: Player;
  score: number;
  championCount: number;
  rank: number;
  personalTitle: PersonalTitle | null;
  pulsing: boolean;
}) {
  return (
    <div
      className={`flex min-h-[56px] items-center gap-3.5 p-3.5 sm:px-4 sm:py-3 transition-colors hover:bg-gray-50/60 dark:hover:bg-[#2C2C2E]/40 active:bg-gray-100/60 dark:active:bg-[#2C2C2E]/60 ${pulsing ? "pulse-highlight" : ""}`}
    >
      <span
        className={`grid size-7 shrink-0 place-items-center rounded-full bg-black/[0.04] dark:bg-white/[0.08] text-xs font-bold ${
          rank === 1
            ? "text-yellow-500"
            : rank === 2
            ? "text-gray-400"
            : rank === 3
            ? "text-amber-700 dark:text-amber-500"
            : "text-[#8E8E93] dark:text-[#98989D]"
        }`}
      >
        {rank}
      </span>
      <PlayerAvatar player={player} className="size-10 text-base shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="truncate font-semibold text-[#1C1C1E] dark:text-[#F2F2F7]">{player.name}</p>
          <TrophyBadge count={championCount} />
          <PersonalTitleBadge title={personalTitle} />
        </div>
      </div>
      <AnimatedNumber
        value={score}
        className={`text-base font-bold tabular-nums ${scoreTone(score)}`}
      />
    </div>
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
    <div className="reveal flex min-h-[45dvh] flex-col items-center justify-center gap-4 rounded-[20px] border border-black/[0.04] dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none">
      <span
        className={`grid size-16 place-items-center rounded-full ${
          tone === "danger"
            ? "bg-red-50 dark:bg-red-950/40 text-[#FF3B30]"
            : "bg-blue-50 dark:bg-blue-950/40 text-[#007AFF]"
        }`}
      >
        <Icon className="size-8" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7]">{title}</h2>
        <p className="mx-auto max-w-xs text-sm text-[#8E8E93] dark:text-[#98989D]">
          {description}
        </p>
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="reveal flex flex-col gap-6">
      <p className="text-sm text-[#8E8E93] dark:text-[#98989D]">กำลังโหลดอันดับ...</p>
      <div className="flex items-start justify-center gap-4 sm:gap-8 pt-4 pb-2">
        {([2, 1, 3] as const).map((rank) => (
          <div
            key={rank}
            className={`flex w-28 sm:w-32 flex-col items-center gap-2 ${
              rank === 1 ? "-translate-y-2 sm:-translate-y-3" : "translate-y-0"
            }`}
          >
            <div
              className={`animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.08] ${
                rank === 1 ? "size-20 sm:size-24" : "size-16 sm:size-20"
              }`}
            />
            <div className="h-4 w-16 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
            <div className="h-5 w-12 animate-pulse rounded-full bg-black/[0.06] dark:bg-white/[0.08]" />
          </div>
        ))}
      </div>
      <div className="rounded-[20px] border border-black/[0.04] dark:border-white/10 bg-white dark:bg-[#1C1C1E] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden divide-y divide-gray-100/80 dark:divide-white/[0.06]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse bg-black/[0.02] dark:bg-white/[0.02]" />
        ))}
      </div>
    </div>
  );
}

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

  const viewItems = [
    { key: currentPeriodKey, label: "งวดนี้" },
    { key: "all", label: "ตลอดกาล" },
  ];

  return (
    <div className="reveal relative z-30 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <InteractiveSegmentedControl
        items={viewItems}
        activeKey={isPastPeriodActive ? null : viewKey}
        onChange={onChange}
        className="w-fit"
        buttonClassName="min-w-[88px] sm:min-w-[100px]"
      />

      {pastPeriods.length > 0 ? (
        <PeriodDropdownPicker
          periods={pastPeriods}
          selectedKey={isPastPeriodActive ? viewKey : null}
          onSelect={onChange}
          placeholder="ดูงวดย้อนหลัง..."
          className="w-full sm:w-auto sm:min-w-[190px]"
        />
      ) : null}
    </div>
  );
}

type LeaderboardTab = "ranking" | "hall-of-fame";

function TabSwitcher({
  activeTab,
  onChange,
}: {
  activeTab: LeaderboardTab;
  onChange: (tab: LeaderboardTab) => void;
}) {
  const tabs = [
    { key: "ranking" as const, label: "อันดับ", icon: Trophy },
    { key: "hall-of-fame" as const, label: "ทำเนียบเกียรติยศ", icon: Medal },
  ];

  return (
    <div className="reveal w-full sm:w-[360px]">
      <InteractiveSegmentedControl
        items={tabs}
        activeKey={activeTab}
        onChange={onChange}
        className="w-full"
      />
    </div>
  );
}

function HallOfFame({
  results,
  players,
}: {
  results: PeriodResult[];
  players: Player[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="reveal">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] sm:text-3xl">
          ทำเนียบเกียรติยศ
        </h1>
      </header>

      {results.length === 0 ? (
        <StateMessage
          icon={Medal}
          title="ยังไม่มีงวดที่จบ"
          description="รอให้งวดปัจจุบันจบก่อน แล้วทำเนียบเกียรติยศจะแสดงที่นี่"
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((result, index) => (
            <HallOfFameCard
              key={result.period.key}
              result={result}
              players={players}
              delayMs={index * 60}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function Leaderboard() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const { history, loading: historyLoading, error: historyError } = useHistory();
  const loading = playersLoading || historyLoading;
  const error = playersError ?? historyError;

  const [activeTab, setActiveTab] = useState<LeaderboardTab>("ranking");
  // "current" is a sentinel, not a period key, so the "this period" view keeps
  // following the real current period if the page stays open across the 1st /
  // 16th rollover instead of freezing on the period it was opened in.
  const [selectedView, setSelectedView] = useState<string>("current");
  const currentPeriod = getCurrentPeriod();
  const viewKey = selectedView === "current" ? currentPeriod.key : selectedView;
  const setViewKey = (key: string) =>
    setSelectedView(key === currentPeriod.key ? "current" : key);

  const periodsInHistory = useMemo(
    () => listPeriodsInHistory(history),
    [history],
  );
  const pastPeriods = useMemo(
    () =>
      periodsInHistory.filter((period) => {
        if (period.key === currentPeriod.key) return false;
        const periodScores = aggregatePeriod(history, period.key);
        return Object.keys(periodScores).length > 0;
      }),
    [periodsInHistory, currentPeriod.key, history],
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
  const visiblePlayers = useMemo(
    () =>
      viewKey === "all"
        ? players
        : players.filter((player) => scores[player.id] !== undefined),
    [players, scores, viewKey],
  );
  const isViewEmpty =
    viewKey === "all"
      ? Object.keys(scores).length === 0
      : visiblePlayers.length === 0;
  const trophyCounts = useMemo(() => getTrophyCounts(history), [history]);
  const hallOfFame = useMemo(() => getHallOfFame(history), [history]);
  const periodStats = useMemo(
    () => computePeriodPlayerStats(history, viewKey),
    [history, viewKey],
  );

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

  const tabSwitcher = (
    <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
  );

  if (activeTab === "hall-of-fame") {
    return (
      <div className="flex flex-col gap-6">
        {tabSwitcher}
        <HallOfFame results={hallOfFame} players={players} />
      </div>
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
    return (
      <div className="flex flex-col gap-6">
        {tabSwitcher}
        <header className="reveal">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] sm:text-3xl">
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

  const roundsList = Object.values(periodStats).map((s) => s.roundsPlayed);
  const maxRoundsInGroup = roundsList.length > 0 ? Math.max(...roundsList) : 0;
  const isAllTime = viewKey === "all";
  const trophyCountsValues = Object.values(trophyCounts).map((t) => t.championCount);
  const maxChampionCountInGroup =
    trophyCountsValues.length > 0 ? Math.max(...trophyCountsValues) : 0;

  const visibleStats = visiblePlayers
    .map((p) => periodStats[p.id])
    .filter(Boolean);
  const bestRoundsList = visibleStats
    .map((s) => s.bestRound)
    .filter((score) => score > 0);
  const maxBestRoundInGroup = bestRoundsList.length > 0 ? Math.max(...bestRoundsList) : 0;

  const worstRoundsList = visibleStats
    .map((s) => s.worstRound)
    .filter((score) => score < 0);
  const minWorstRoundInGroup = worstRoundsList.length > 0 ? Math.min(...worstRoundsList) : 0;

  const preScored = visiblePlayers.map((player) => ({
    player,
    score: scores[player.id] ?? 0,
    championCount: trophyCounts[player.id]?.championCount ?? 0,
  }));
  const sorted = [...preScored].sort((a, b) => b.score - a.score);
  const totalRanked = sorted.length;

  const scoredWithTitles = sorted.map((entry, index) => {
    const rank = index + 1;
    const personalTitle = getPersonalTitle(
      periodStats[entry.player.id],
      rank,
      totalRanked,
      maxRoundsInGroup,
      {
        isAllTime,
        championCount: entry.championCount,
        maxChampionCountInGroup,
        maxBestRoundInGroup,
        minWorstRoundInGroup,
      },
    );
    return {
      ...entry,
      rank,
      personalTitle,
    };
  });

  const podiumEntries = scoredWithTitles.slice(0, 3);
  const restEntries = scoredWithTitles.slice(3);
  const lowestEntry = scoredWithTitles[scoredWithTitles.length - 1];
  const showRoast = scoredWithTitles.length >= 2;

  return (
    <div className="flex flex-col gap-6">
      {tabSwitcher}
      <header className="reveal">
        <h1 className="text-2xl font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F2F2F7] sm:text-3xl">
          อันดับ
        </h1>
        {viewKey !== "all" && viewKey !== currentPeriod.key && activePeriod?.label ? (
          <p className="mt-1 text-sm text-[#8E8E93] dark:text-[#98989D]">
            {`งวด ${activePeriod.label}`}
          </p>
        ) : null}
      </header>

      {viewSwitcher}

      <Podium
        entries={podiumEntries}
        pulsingIds={pulsingIds}
      />

      {/* Clean horizontal divider directly underneath top 3 podium */}
      <hr className="border-t border-black/[0.06] dark:border-white/10 my-1" />

      {showRoast ? (
        <RoastCallout
          player={lowestEntry.player}
          score={lowestEntry.score}
          pulsing={pulsingIds.has(lowestEntry.player.id)}
        />
      ) : null}

      {restEntries.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8E8E93] dark:text-[#98989D] px-1">
            อันดับอื่น ๆ
          </h2>
          <div className="rounded-[20px] border border-black/[0.04] dark:border-white/10 bg-white dark:bg-[#1C1C1E] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden divide-y divide-gray-100/80 dark:divide-white/[0.06]">
            {restEntries.map((entry, index) => (
              <LeaderboardRow
                key={entry.player.id}
                player={entry.player}
                score={entry.score}
                championCount={entry.championCount}
                rank={index + 4}
                personalTitle={entry.personalTitle}
                pulsing={pulsingIds.has(entry.player.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
