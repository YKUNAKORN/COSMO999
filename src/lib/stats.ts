// Pure stat computation from history. No Firebase reads or writes here -
// this module takes already-fetched data and derives numbers from it.
// Ported from legacy renderPlayerStats (reference/legacy-prototype.sanitized.html
// L1197-1419). All edge-case guards (divide-by-zero, ±Infinity, empty list)
// match the legacy behaviour exactly.
import type { HistoryEntry } from "@/types/models";

// Chart data point shapes for recharts.
export interface RoundDataPoint {
  label: string;
  score: number;
}

export interface CumulativeDataPoint {
  label: string;
  cumulative: number;
}

export interface PlayerStats {
  totalRounds: number;
  wins: number; // rounds where score > 0
  losses: number; // rounds where score < 0
  zeros: number; // rounds where score === 0
  // wins/(wins+losses)*100, or 0 when both are 0 (guard against divide-by-zero).
  winRate: number;
  // Max single-round score, clamped to 0 when no rounds played.
  bestRound: number;
  // Min single-round score, clamped to 0 when no rounds played.
  worstRound: number;
  // Sum of all round scores (same as player.totalScore for this subset).
  totalScore: number;

  // Chart data: last 10 rounds sorted oldest-first (matches legacy L1297-1319).
  roundData: RoundDataPoint[];
  cumulativeData: CumulativeDataPoint[];
}

/**
 * Compute stats for one player from the full history list.
 * Returns null when the player has never appeared in any round
 * (caller should show an empty state rather than a zeroed dashboard).
 */
export function computePlayerStats(
  playerId: string,
  history: HistoryEntry[],
): PlayerStats | null {
  // Filter to rounds that include this player and sort oldest-first.
  // Legacy uses Number(a.id) - Number(b.id); matchId is Date.now().toString()
  // so numeric sort = chronological sort.
  const rounds = history
    .filter((m) => m.playerScores[playerId] !== undefined)
    .sort((a, b) => Number(a.id) - Number(b.id));

  if (rounds.length === 0) return null;

  let bestRound = -Infinity;
  let worstRound = Infinity;
  let wins = 0;
  let losses = 0;
  let zeros = 0;
  let totalScore = 0;
  const fullCumulative: number[] = [];

  for (const round of rounds) {
    const score = round.playerScores[playerId];
    const maxScore = Math.max(...Object.values(round.playerScores));
    
    totalScore += score;
    fullCumulative.push(totalScore);

    if (score > bestRound) bestRound = score;
    if (score < worstRound) worstRound = score;

    if (score === maxScore) wins++;
    else if (score < 0) losses++;
    else zeros++;
  }

  // Clamp ±Infinity guards (matches legacy L1251-1252).
  if (bestRound === -Infinity) bestRound = 0;
  if (worstRound === Infinity) worstRound = 0;

  // Win rate: exclude zero-score rounds from the denominator (matches legacy
  // L1246-1249). Guard: 0/0 → 0, not NaN.
  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  // --- Build chart data ---
  // Limit to the last 10 rounds (matches legacy L1297-1299).
  const CHART_LIMIT = 10;
  const startIndex = Math.max(0, rounds.length - CHART_LIMIT);
  const slicedRounds = rounds.slice(startIndex);
  const slicedCumulative = fullCumulative.slice(startIndex);

  // Round score chart data - label uses the global round index R1, R2, ...
  const roundData: RoundDataPoint[] = slicedRounds.map((m, i) => ({
    label: `R${startIndex + i + 1}`,
    score: m.playerScores[playerId],
  }));

  // Cumulative chart data - prepend the "before window" starting point
  // (matches legacy L1306-1312: if startIndex > 0, show fullCumulative
  // at startIndex-1 labelled "ก่อนหน้า"; else show 0 labelled "เริ่มต้น").
  const startLabel = startIndex > 0 ? "ก่อนหน้า" : "เริ่มต้น";
  const startValue = startIndex > 0 ? fullCumulative[startIndex - 1] : 0;

  const cumulativeData: CumulativeDataPoint[] = [
    { label: startLabel, cumulative: startValue },
    ...slicedRounds.map((_, i) => ({
      label: `R${startIndex + i + 1}`,
      cumulative: slicedCumulative[i],
    })),
  ];

  return {
    totalRounds: rounds.length,
    wins,
    losses,
    zeros,
    winRate,
    bestRound,
    worstRound,
    totalScore,
    roundData,
    cumulativeData,
  };
}
