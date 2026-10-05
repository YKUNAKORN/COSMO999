// One Hall of Fame card: period title and two summary pills on top, then a
// VS split view - the period champion on the left, the last-place finisher on
// the right, and the score gap between them in the middle. Read-only; every
// number comes from PeriodResult (lib/honors.ts).
import { Crown, Gamepad2, PiggyBank, Users, type LucideIcon } from "lucide-react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { formatNumber, formatSignedScore } from "@/lib/format";
import type { PeriodResult } from "@/lib/honors";
import type { Player } from "@/types/models";

function MetaPill({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-muted">
      <Icon className="size-3.5" aria-hidden />
      {text}
    </span>
  );
}

// A deleted player keeps their history but not their profile, so the card
// falls back to a "?" disc and "(ถูกลบ)" like the group score dialog does.
function HonoreeAvatar({
  player,
  tone,
  className,
}: {
  player: Player | undefined;
  tone: "champion" | "last";
  className: string;
}) {
  const avatar = player ? (
    <PlayerAvatar player={player} className={className} />
  ) : (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-text-muted`}
    >
      ?
    </span>
  );

  // Champion: glowing gold ring. Last place: muted crimson ring and a
  // greyscale photo, so the loser reads as drained of colour.
  if (tone === "champion") {
    return (
      <span className="rounded-full ring-2 ring-accent shadow-gold">{avatar}</span>
    );
  }
  return (
    <span className="rounded-full ring-2 ring-danger/50">
      <span className="block rounded-full grayscale">{avatar}</span>
    </span>
  );
}

function Honoree({
  tone,
  icon: Icon,
  label,
  ids,
  players,
  score,
}: {
  tone: "champion" | "last";
  icon: LucideIcon;
  label: string;
  ids: string[];
  players: Player[];
  score: number;
}) {
  const isChampion = tone === "champion";
  const avatarSize =
    ids.length > 1 ? "size-10 text-base" : "size-14 text-xl sm:size-16";

  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <p
        className={`flex flex-wrap items-center justify-center gap-1 text-[11px] font-semibold ${
          isChampion ? "text-accent" : "text-danger"
        }`}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {ids.map((id) => (
          <HonoreeAvatar
            key={id}
            player={players.find((p) => p.id === id)}
            tone={tone}
            className={avatarSize}
          />
        ))}
      </div>
      <div className="flex w-full min-w-0 flex-col items-center">
        {ids.map((id) => (
          <p key={id} className="w-full truncate text-sm font-semibold">
            {players.find((p) => p.id === id)?.name ?? "(ถูกลบ)"}
          </p>
        ))}
      </div>
      <p
        className={`text-sm font-bold tabular-nums ${
          isChampion ? "text-success" : "text-danger"
        }`}
      >
        {formatSignedScore(score)} แต้ม
      </p>
    </div>
  );
}

export function HallOfFameCard({
  result,
  players,
  delayMs,
}: {
  result: PeriodResult;
  players: Player[];
  delayMs: number;
}) {
  const gap = result.championScore - result.lastPlaceScore;

  return (
    <li
      className="reveal flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">งวด {result.period.label}</h3>
        <div className="flex items-center gap-2">
          <MetaPill icon={Gamepad2} text={`${formatNumber(result.roundCount)} รอบ`} />
          <MetaPill icon={Users} text={`${formatNumber(result.playerCount)} คน`} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <Honoree
          tone="champion"
          icon={Crown}
          label="แชมป์ประจำงวด"
          ids={result.championIds}
          players={players}
          score={result.championScore}
        />
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-lg font-black tracking-widest text-accent">VS</span>
          <span className="text-[11px] text-text-muted">
            ผลต่าง{" "}
            <span className="whitespace-nowrap">{formatNumber(gap)} แต้ม</span>
          </span>
        </div>
        <Honoree
          tone="last"
          icon={PiggyBank}
          label="หมูแจกแต้ม"
          ids={result.lastPlaceIds}
          players={players}
          score={result.lastPlaceScore}
        />
      </div>
    </li>
  );
}
