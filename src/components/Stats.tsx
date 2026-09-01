"use client";

// Stats page client component. Ported from legacy openStatsModal /
// renderPlayerStats (reference/legacy-prototype.sanitized.html L1175-1419).
// Chart colours are read from CSS custom properties at render time so they
// honour the theme tokens and never hardcode raw hex values.
// Recharts is loaded via next/dynamic with ssr:false because it uses browser
// APIs (ResizeObserver, SVG measurement) unavailable on the server.
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  BarChart2,
  Loader2,
  TrendingUp,
  Trophy,
  TriangleAlert,
} from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useHistory } from "@/hooks/useHistory";
import { usePlayers } from "@/hooks/usePlayers";
import { computePlayerStats } from "@/lib/stats";
import type { RoundDataPoint } from "@/lib/stats";

// --- recharts dynamic imports (client-only, no SSR) ---
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);
const LineChart = dynamic(
  () => import("recharts").then((m) => m.LineChart),
  { ssr: false },
);
const AreaChart = dynamic(
  () => import("recharts").then((m) => m.AreaChart),
  { ssr: false },
);
const Line = dynamic(() => import("recharts").then((m) => m.Line), {
  ssr: false,
});
const Area = dynamic(() => import("recharts").then((m) => m.Area), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false },
);
const ReferenceLine = dynamic(
  () => import("recharts").then((m) => m.ReferenceLine),
  { ssr: false },
);

// Read a CSS custom property value from the document root at call time.
// Falls back to `fallback` when running on the server or when the variable
// is not defined. This is the only place theme colours enter chart config.
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

// Whether the visitor has requested reduced motion.
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Colour for a single-round score based on sign.
function roundDotColour(score: number): string {
  if (score > 0) return cssVar("--color-success", "#3ecf7f");
  if (score < 0) return cssVar("--color-danger", "#c62330");
  return cssVar("--color-ivory-400", "#a8a291");
}

// Stat card: label + large value + optional sub-label.
function StatCard({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-success"
      : tone === "negative"
        ? "text-danger"
        : "text-text";

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-raised p-4">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${toneClass}`}>
        {children}
      </span>
    </div>
  );
}

// Custom dot renderer for the round-score line chart. Each dot is coloured
// by the sign of its score value, matching legacy roundColors (L1322).
function RoundDot(props: {
  cx?: number;
  cy?: number;
  payload?: unknown;
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;
  const p = payload as RoundDataPoint;
  const fill = roundDotColour(p.score);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={fill}
      stroke={cssVar("--color-felt-900", "#0a2318")}
      strokeWidth={2}
    />
  );
}

export function Stats() {
  const { history, loading: hLoading, error: hError } = useHistory();
  const { players, loading: pLoading } = usePlayers();

  const [selectedId, setSelectedId] = useState<string>("");

  const loading = hLoading || pLoading;

  const stats = useMemo(() => {
    if (!selectedId || !history.length) return null;
    return computePlayerStats(selectedId, history);
  }, [selectedId, history]);

  const selectedPlayer = players.find((p) => p.id === selectedId) ?? null;

  // Chart theme tokens resolved once per render (client-side).
  const borderColour = cssVar("--color-felt-700", "#14472f");
  const successColour = cssVar("--color-success", "#3ecf7f");
  const dangerColour = cssVar("--color-danger", "#c62330");
  const mutedColour = cssVar("--color-ivory-400", "#a8a291");
  const noAnimate = prefersReducedMotion();

  // Cumulative line/area colour depends on whether the player is net positive.
  const cumulativeTone =
    stats && stats.totalScore >= 0 ? successColour : dangerColour;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">สถิติ</h1>
        <p className="mt-1 text-sm text-text-muted">
          ประวัติการเล่นและกราฟคะแนนรายผู้เล่น
        </p>
      </div>

      {/* Global loading / error */}
      {loading ? (
        <div
          className="flex flex-col items-center gap-3 py-20 text-text-muted"
          aria-live="polite"
        >
          <Loader2 className="size-8 animate-spin" aria-hidden />
          <span className="text-sm">กำลังโหลดข้อมูล...</span>
        </div>
      ) : hError ? (
        <div className="flex flex-col items-center gap-3 py-20 text-danger" role="alert">
          <TriangleAlert className="size-8" aria-hidden />
          <p className="text-sm font-medium">โหลดประวัติไม่สำเร็จ</p>
          <p className="text-xs text-text-muted">กรุณาตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้า</p>
        </div>
      ) : (
        <>
          {/* Player selector */}
          <div className="mb-6 flex flex-col gap-2">
            <label htmlFor="stats-player-select" className="text-sm font-medium">
              เลือกผู้เล่น
            </label>
            <select
              id="stats-player-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text focus:border-border-strong focus:outline-none sm:max-w-xs"
            >
              <option value="">เลือกผู้เล่นเพื่อดูสถิติ...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* No player selected yet */}
          {!selectedId ? (
            <div className="flex flex-col items-center gap-4 py-20 text-text-muted">
              <BarChart2 className="size-12 text-border-strong" aria-hidden />
              <p className="text-sm">เลือกผู้เล่นด้านบนเพื่อดูสถิติ</p>
            </div>
          ) : stats === null ? (
            /* Player has no rounds yet */
            <div className="flex flex-col items-center gap-4 py-20 text-text-muted">
              <TrendingUp className="size-12 text-border-strong" aria-hidden />
              <div className="text-center">
                <p className="font-semibold text-text">ยังไม่มีประวัติการเล่น</p>
                <p className="mt-1 text-sm">บันทึกรอบแรกเพื่อเริ่มติดตามสถิติ</p>
              </div>
            </div>
          ) : (
            /* Stats dashboard */
            <div className="reveal flex flex-col gap-6">
              {/* Profile header */}
              {selectedPlayer ? (
                <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
                  <PlayerAvatar player={selectedPlayer} className="size-14 text-xl" />
                  <div>
                    <p className="text-xs text-text-muted">ข้อมูลสถิติของ</p>
                    <p className="text-lg font-bold">{selectedPlayer.name}</p>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        stats.totalScore > 0
                          ? "text-success"
                          : stats.totalScore < 0
                            ? "text-danger"
                            : "text-text-muted"
                      }`}
                    >
                      <AnimatedNumber value={stats.totalScore} /> คะแนน
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Stat cards grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatCard label="Win Rate">
                  <span
                    className={
                      stats.winRate >= 50 ? "text-success" : "text-danger"
                    }
                  >
                    {stats.winRate.toFixed(1)}%
                  </span>
                </StatCard>
                <StatCard label="จำนวนเกม">
                  <AnimatedNumber value={stats.totalRounds} />
                </StatCard>
                <StatCard label="สูงสุดที่เคยทำ" tone="positive">
                  <AnimatedNumber value={stats.bestRound} />
                </StatCard>
                <StatCard label="ต่ำสุดที่เคยทำ" tone="negative">
                  <AnimatedNumber value={stats.worstRound} />
                </StatCard>
                <StatCard label="ชนะ / แพ้ / เสมอ" tone="neutral">
                  <span className="text-xl">
                    <span className="text-success">{stats.wins}</span>
                    <span className="text-text-muted text-sm"> / </span>
                    <span className="text-danger">{stats.losses}</span>
                    <span className="text-text-muted text-sm"> / </span>
                    <span>{stats.zeros}</span>
                  </span>
                </StatCard>
                <StatCard label="คะแนนสะสม">
                  <AnimatedNumber
                    value={stats.totalScore}
                    className={
                      stats.totalScore > 0
                        ? "text-success"
                        : stats.totalScore < 0
                          ? "text-danger"
                          : "text-text-muted"
                    }
                  />
                </StatCard>
              </div>

              {/* Chart 1: Per-round scores */}
              <section className="rounded-lg border border-border bg-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="size-4 text-accent" aria-hidden />
                  <h2 className="text-sm font-semibold">คะแนนรายรอบ</h2>
                  {stats.roundData.length < stats.totalRounds ? (
                    <span className="ml-auto text-xs text-text-muted">
                      {stats.roundData.length} รอบล่าสุด
                    </span>
                  ) : null}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart
                    data={stats.roundData}
                    margin={{ top: 20, right: 16, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={borderColour}
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: mutedColour, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <ReferenceLine y={0} stroke={mutedColour} strokeDasharray="4 2" />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke={mutedColour}
                      strokeWidth={2}
                      dot={<RoundDot />}
                      activeDot={{ r: 7 }}
                      isAnimationActive={!noAnimate}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </section>

              {/* Chart 2: Cumulative */}
              <section className="rounded-lg border border-border bg-surface p-4">
                <div className="mb-3 flex items-center gap-2">
                  <TrendingUp className="size-4 text-accent" aria-hidden />
                  <h2 className="text-sm font-semibold">คะแนนสะสม</h2>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart
                    data={stats.cumulativeData}
                    margin={{ top: 20, right: 16, bottom: 8, left: 0 }}
                  >
                    <defs>
                      <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={cumulativeTone} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={cumulativeTone} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={borderColour}
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: mutedColour, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <ReferenceLine y={0} stroke={mutedColour} strokeDasharray="4 2" />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke={cumulativeTone}
                      strokeWidth={3}
                      fill="url(#cumGradient)"
                      dot={{
                        fill: cssVar("--color-gold-400", "#e6c878"),
                        stroke: cssVar("--color-felt-900", "#0a2318"),
                        strokeWidth: 2,
                        r: 4,
                      }}
                      isAnimationActive={!noAnimate}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
