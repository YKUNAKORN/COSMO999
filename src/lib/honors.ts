// Hall of Fame derivation. Pure and read-only - reduces `history` through the
// existing period engine (periods.ts, leaderboard.ts) into per-period
// champions and last-place finishers. Nothing here writes to Firebase or
// stores a snapshot, so a period's result is always recomputed from history;
// undoing a past round changes its outcome automatically on the next call.

import { aggregatePeriod } from "@/lib/leaderboard";
import { getCurrentPeriod, listPeriodsInHistory, type Period } from "@/lib/periods";
import type { HistoryEntry } from "@/types/models";

export interface PeriodResult {
  period: Period;
  championIds: string[];
  lastPlaceIds: string[];
}

// A period needs at least this many distinct players with a scored round in
// it before it can crown anyone - matches the legacy renderTopStats
// convention of requiring at least two players before ranking.
const MIN_PLAYERS_FOR_RESULT = 2;

// Highest and lowest scorers for one period's aggregate. Ties are kept, not
// broken - every player sharing the extreme score is a co-champion or
// co-last-place, per the confirmed tiebreak rule. Returns null when the
// period does not have enough distinct players to rank, or when everyone is
// tied (highest === lowest). The all-tied case is the per-period analogue of
// the legacy renderTopStats "allZero" guard
// (reference/legacy-prototype.sanitized.html:1552-1554, "Hide Top Stats if
// everyone has 0 score"): scoring is zero-sum (src/lib/scoring.ts), so if
// every player in a period shares one score, that score can only be 0 -
// without this guard the same players would be returned as both champion
// and last place.
function rankPeriod(
  scores: Record<string, number>,
): Pick<PeriodResult, "championIds" | "lastPlaceIds"> | null {
  const entries = Object.entries(scores);
  if (entries.length < MIN_PLAYERS_FOR_RESULT) return null;

  const values = entries.map(([, score]) => score);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  if (highest === lowest) return null;

  return {
    championIds: entries.filter(([, score]) => score === highest).map(([id]) => id),
    lastPlaceIds: entries.filter(([, score]) => score === lowest).map(([id]) => id),
  };
}

// Every ended period represented in history, newest first. The current
// period is always excluded - it has no official champion yet. A period
// with fewer than two distinct scorers is skipped entirely (no result).
export function getHallOfFame(history: HistoryEntry[]): PeriodResult[] {
  const currentKey = getCurrentPeriod().key;
  const results: PeriodResult[] = [];

  for (const period of listPeriodsInHistory(history)) {
    if (period.key === currentKey) continue;
    const ranked = rankPeriod(aggregatePeriod(history, period.key));
    if (!ranked) continue;
    results.push({ period, ...ranked });
  }

  return results;
}

// Championship/last-place tallies per player, counted across every ended
// period returned by getHallOfFame (so the same exclusions and tiebreak
// rules apply here too).
export function getTrophyCounts(
  history: HistoryEntry[],
): Record<string, { championCount: number; lastPlaceCount: number }> {
  const counts: Record<string, { championCount: number; lastPlaceCount: number }> = {};

  const ensure = (id: string) => {
    counts[id] ??= { championCount: 0, lastPlaceCount: 0 };
    return counts[id];
  };

  for (const { championIds, lastPlaceIds } of getHallOfFame(history)) {
    for (const id of championIds) ensure(id).championCount += 1;
    for (const id of lastPlaceIds) ensure(id).lastPlaceCount += 1;
  }

  return counts;
}
