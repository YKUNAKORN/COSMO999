// Pure stat computation from history. No Firebase reads or writes here -
// this module takes already-fetched data and derives numbers from it.
// Ported from legacy renderPlayerStats (reference/legacy-prototype.sanitized.html
// L1197-1419). All edge-case guards (divide-by-zero, ±Infinity, empty list)
// match the legacy behaviour exactly.
import { getPeriodOfTimestamp } from "./periods.ts";
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

export interface HeadToHeadStat {
  playerId: string;
  count: number;
}

export interface PlayerStats {
  totalRounds: number;
  wins: number; // rounds won (see getRoundResult)
  losses: number; // rounds where score < 0 and is the lowest
  zeros: number; // every other round (middle finish or an all-zero draw)
  // Percentage of rounds won out of all rounds played.
  winRate: number;
  middleRate: number;
  lossRate: number;
  // Max single-round score, clamped to 0 when no rounds played.
  bestRound: number;
  // Min single-round score, clamped to 0 when no rounds played.
  worstRound: number;
  // Longest consecutive win / loss streaks.
  maxWinStreak: number;
  maxLoseStreak: number;
  // Head-to-head: single top player who won most often when this player finished last (nemesis),
  // and single top player who finished last most often when this player won (prey).
  // Ties in round count are broken by total points in those rounds.
  nemesis: HeadToHeadStat | null;
  prey: HeadToHeadStat | null;
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

interface EncounterTally {
  count: number;
  primaryScoreImpact: number;
  secondaryScoreImpact: number;
}

function topSingleEncounter(
  tallies: Map<string, EncounterTally>,
): HeadToHeadStat | null {
  if (tallies.size === 0) return null;
  const sorted = [...tallies.entries()].sort(([, a], [, b]) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.primaryScoreImpact !== a.primaryScoreImpact) {
      return b.primaryScoreImpact - a.primaryScoreImpact;
    }
    return b.secondaryScoreImpact - a.secondaryScoreImpact;
  });
  const [bestId, best] = sorted[0];
  if (!bestId || best.count <= 0) return null;
  return { playerId: bestId, count: best.count };
}

/**
 * Compute stats for one player from the history list (optionally filtered by periodKey).
 * Returns null when the player has never appeared in any round in the given scope
 * (caller should show an empty state rather than a zeroed dashboard).
 */
export function computePlayerStats(
  playerId: string,
  history: HistoryEntry[],
  periodKey: string = "all",
): PlayerStats | null {
  // Filter to rounds in the selected period that include this player, sorted oldest-first.
  const rounds = history
    .filter((m) => {
      if (m.playerScores[playerId] === undefined) return false;
      if (periodKey !== "all" && getPeriodOfTimestamp(m.timestamp).key !== periodKey) {
        return false;
      }
      return true;
    })
    .sort((a, b) => Number(a.id) - Number(b.id));

  if (rounds.length === 0) return null;

  let bestRound = -Infinity;
  let worstRound = Infinity;
  let wins = 0;
  let losses = 0;
  let zeros = 0;
  let currentWinStreak = 0;
  let currentLoseStreak = 0;
  let maxWinStreak = 0;
  let maxLoseStreak = 0;
  let totalScore = 0;
  let rawTotal = 0;
  const winsByMultiplier = new Map<number, number>();
  const nemesisTallies = new Map<string, EncounterTally>();
  const preyTallies = new Map<string, EncounterTally>();
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
      currentWinStreak++;
      if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      currentLoseStreak = 0;

      winsByMultiplier.set(
        round.multiplier,
        (winsByMultiplier.get(round.multiplier) ?? 0) + 1,
      );

      for (const [otherId, otherScore] of Object.entries(round.playerScores)) {
        if (otherId === playerId) continue;
        if (getRoundResult(otherScore, round.playerScores) === "loss") {
          const prev = preyTallies.get(otherId) ?? {
            count: 0,
            primaryScoreImpact: 0,
            secondaryScoreImpact: 0,
          };
          preyTallies.set(otherId, {
            count: prev.count + 1,
            primaryScoreImpact: prev.primaryScoreImpact + Math.abs(otherScore),
            secondaryScoreImpact: prev.secondaryScoreImpact + score,
          });
        }
      }
    } else if (result === "loss") {
      losses++;
      currentLoseStreak++;
      if (currentLoseStreak > maxLoseStreak) maxLoseStreak = currentLoseStreak;
      currentWinStreak = 0;

      for (const [otherId, otherScore] of Object.entries(round.playerScores)) {
        if (otherId === playerId) continue;
        if (getRoundResult(otherScore, round.playerScores) === "win") {
          const prev = nemesisTallies.get(otherId) ?? {
            count: 0,
            primaryScoreImpact: 0,
            secondaryScoreImpact: 0,
          };
          nemesisTallies.set(otherId, {
            count: prev.count + 1,
            primaryScoreImpact: prev.primaryScoreImpact + otherScore,
            secondaryScoreImpact: prev.secondaryScoreImpact + Math.abs(score),
          });
        }
      }
    } else {
      zeros++;
      currentWinStreak = 0;
      currentLoseStreak = 0;
    }
  }

  const multiplierWins: MultiplierWinCount[] = [...winsByMultiplier]
    .map(([multiplier, count]) => ({ multiplier, count }))
    .sort((a, b) => a.multiplier - b.multiplier);

  // Clamp ±Infinity guards (matches legacy L1251-1252).
  if (bestRound === -Infinity) bestRound = 0;
  if (worstRound === Infinity) worstRound = 0;

  const totalRounds = rounds.length;
  const winRate = totalRounds > 0 ? (wins / totalRounds) * 100 : 0;
  const middleRate = totalRounds > 0 ? (zeros / totalRounds) * 100 : 0;
  const lossRate = totalRounds > 0 ? (losses / totalRounds) * 100 : 0;

  // --- Build chart data ---
  // Limit to the last 10 rounds (matches legacy L1297-1299).
  const CHART_LIMIT = 10;
  const startIndex = Math.max(0, rounds.length - CHART_LIMIT);
  const slicedRounds = rounds.slice(startIndex);

  // Round score chart data - label uses the round index R1, R2, ...
  const roundData: RoundDataPoint[] = slicedRounds.map((m, i) => ({
    label: `R${startIndex + i + 1}`,
    score: m.playerScores[playerId],
  }));

  // Cumulative chart data - includes all rounds from start (เริ่มต้น: 0) to current
  const cumulativeData: CumulativeDataPoint[] = [
    { label: "เริ่มต้น", cumulative: 0 },
    ...rounds.map((_, i) => ({
      label: `R${i + 1}`,
      cumulative: fullCumulative[i],
    })),
  ];

  return {
    totalRounds,
    wins,
    losses,
    zeros,
    winRate,
    middleRate,
    lossRate,
    bestRound,
    worstRound,
    maxWinStreak,
    maxLoseStreak,
    nemesis: topSingleEncounter(nemesisTallies),
    prey: topSingleEncounter(preyTallies),
    totalScore,
    rawTotal,
    multiplierWins,
    roundData,
    cumulativeData,
  };
}
