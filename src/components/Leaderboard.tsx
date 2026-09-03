"use client";

// Real-time leaderboard: top-3 podium (Kahoot-style), a roast callout for
// the lowest scorer, and a plain ranked list for everyone else. Read-only -
// this component and everything it renders never writes to Firebase.
import { useEffect, useRef, useState } from "react";
import {
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

// Tracks which players' totalScore just changed (a live update landed from
// elsewhere) and reports back the ids to flash for one pulse cycle.
function usePulseOnChange(players: Player[]): Set<string> {
  const prevScoresRef = useRef<Record<string, number>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const previous = prevScoresRef.current;
    const changedIds = players
      .filter((player) => {
        const before = previous[player.id];
        return before !== undefined && before !== player.totalScore;
      })
      .map((player) => player.id);

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

    prevScoresRef.current = Object.fromEntries(
      players.map((player) => [player.id, player.totalScore]),
    );
  }, [players]);

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
  pulsing,
}: {
  rank: 1 | 2 | 3;
  player: Player;
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
            alt=""
            loading="lazy"
            decoding="async"
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
        value={player.totalScore}
        className={`text-lg font-bold tabular-nums sm:text-xl ${scoreTone(player.totalScore)}`}
      />
      <LatestScoreLabel latestScore={player.latestScore} />

      <div
        className={`flex w-full items-center justify-center rounded-t-lg shadow-card ${style.pedestal} ${style.height} ${pulsing ? "pulse-highlight" : ""}`}
      >
        <span className="text-2xl font-black text-on-accent">{rank}</span>
      </div>
    </div>
  );
}

function Podium({
  players,
  pulsingIds,
}: {
  players: Player[];
  pulsingIds: Set<string>;
}) {
  const slots: Array<1 | 2 | 3> = [2, 1, 3];
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      {slots.map((rank) => {
        const player = players[rank - 1];
        if (!player) return null;
        return (
          <PodiumCard
            key={player.id}
            rank={rank}
            player={player}
            pulsing={pulsingIds.has(player.id)}
          />
        );
      })}
    </div>
  );
}

function RoastCallout({
  player,
  pulsing,
}: {
  player: Player;
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
          alt=""
          loading="lazy"
          decoding="async"
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
        value={player.totalScore}
        className={`text-lg font-bold tabular-nums ${scoreTone(player.totalScore)}`}
      />
    </div>
  );
}

function LeaderboardRow({
  player,
  rank,
  pulsing,
  delayMs,
}: {
  player: Player;
  rank: number;
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
        <LatestScoreLabel latestScore={player.latestScore} />
      </div>
      <AnimatedNumber
        value={player.totalScore}
        className={`text-base font-bold tabular-nums ${scoreTone(player.totalScore)}`}
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

export function Leaderboard() {
  const { players, loading, error } = usePlayers();
  const pulsingIds = usePulseOnChange(players);

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

  const allZero = players.every((player) => player.totalScore === 0);
  if (allZero) {
    return (
      <StateMessage
        icon={Spade}
        title="ยังไม่มีใครลงมือเล่น"
        description="เริ่มรอบแรกกันเลย พอมีคะแนนแล้วอันดับจะเรียงให้อัตโนมัติ"
      />
    );
  }

  const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);
  const podiumPlayers = sorted.slice(0, 3);
  const restPlayers = sorted.slice(3);
  const lowestPlayer = sorted[sorted.length - 1];
  const showRoast = sorted.length >= 2;

  return (
    <div className="flex flex-col gap-6">
      <header className="reveal">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          อันดับ
        </h1>
        <p className="text-sm text-text-muted">
          จัดอันดับสายไพ่ประจำวง เรียงจากคะแนนรวมมากไปน้อย
        </p>
      </header>

      {showRoast ? (
        <div className="overflow-hidden rounded-full border border-danger/30 bg-danger/10 py-1.5 px-3">
          <p className="animate-marquee whitespace-nowrap text-xs font-semibold text-danger">
            <Flame className="mr-1 inline size-3 align-[-0.125em]" aria-hidden />
            ข่าวด่วน: {sorted[0].name} แบกตี้จนปวดหลัง ส่วน {lowestPlayer.name} ล้มละลาย เตรียมขอกู้เงินนอกระบบ...
          </p>
        </div>
      ) : null}

      <Podium players={podiumPlayers} pulsingIds={pulsingIds} />

      {showRoast ? (
        <RoastCallout
          player={lowestPlayer}
          pulsing={pulsingIds.has(lowestPlayer.id)}
        />
      ) : null}

      {restPlayers.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {restPlayers.map((player, index) => (
            <LeaderboardRow
              key={player.id}
              player={player}
              rank={index + 4}
              pulsing={pulsingIds.has(player.id)}
              delayMs={index * 60}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
