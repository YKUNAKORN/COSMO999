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

export type RoundResult = "win" | "loss" | "other";

// How one player's score reads within one round. A win is topping the round
// with a positive score (every player tied for the top counts); a loss
// is any negative score; everything else (middle of the pack, or a round
// where everyone drew on 0) is "other". Shared by the player stats and the
// per-group stats so both agree on what "ชนะ" means.
export function getRoundResult(
  score: number,
  playerScores: Record<string, number>,
): RoundResult {
  const values = Object.values(playerScores);
  const best = Math.max(...values);
  const worst = Math.min(...values);
  
  if (score > 0 && score === best) return "win";
  if (score < 0 && score === worst) return "loss";
  return "other";
}

// History stores only the multiplied net score, so the pre-multiplier ("raw")
// score is recovered by dividing the multiplier back out. A missing or
// non-positive multiplier is never written by the app; it is read as x1 here
// rather than dividing by zero.
export function toRawScore(netScore: number, multiplier: number): number {
  return netScore / (multiplier > 0 ? multiplier : 1);
}

export interface MultiplierWinCount {
  multiplier: number;
  count: number;
}

export interface PlayerStats {
  totalRounds: number;
  wins: number; // rounds won (see getRoundResult)
  losses: number; // rounds where score < 0 and is the lowest
  zeros: number; // every other round (middle finish or an all-zero draw)
  // Percentage of rounds won out of all rounds played.
  winRate: number;
  // Max single-round score, clamped to 0 when no rounds played.
  bestRound: number;
  // Min single-round score, clamped to 0 when no rounds played.
  worstRound: number;
  // Sum of all round scores (same as player.totalScore for this subset).
  totalScore: number;
  // Sum of the same scores before each round's multiplier was applied.
  rawTotal: number;
  // Rounds won, bucketed by multiplier, smallest multiplier first. Empty when
  // the player has never won. Sums to `wins`.
  multiplierWins: MultiplierWinCount[];

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
  let rawTotal = 0;
  const winsByMultiplier = new Map<number, number>();
  const fullCumulative: number[] = [];

  for (const round of rounds) {
    const score = round.playerScores[playerId];

    totalScore += score;
    rawTotal += toRawScore(score, round.multiplier);
    fullCumulative.push(totalScore);

    if (score > bestRound) bestRound = score;
    if (score < worstRound) worstRound = score;

    const result = getRoundResult(score, round.playerScores);
    if (result === "win") {
      wins++;
      winsByMultiplier.set(
        round.multiplier,
        (winsByMultiplier.get(round.multiplier) ?? 0) + 1,
      );
    } else if (result === "loss") {
      losses++;
    } else {
      zeros++;
    }
  }

  const multiplierWins: MultiplierWinCount[] = [...winsByMultiplier]
    .map(([multiplier, count]) => ({ multiplier, count }))
    .sort((a, b) => a.multiplier - b.multiplier);

  // Clamp ±Infinity guards (matches legacy L1251-1252).
  if (bestRound === -Infinity) bestRound = 0;
  if (worstRound === Infinity) worstRound = 0;

  // Win rate: wins / total rounds played
  const winRate = rounds.length > 0 ? (wins / rounds.length) * 100 : 0;

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
    rawTotal,
    multiplierWins,
    roundData,
    cumulativeData,
  };
}
