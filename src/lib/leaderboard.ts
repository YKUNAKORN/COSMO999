// Score aggregation for leaderboard views. Pure - sums history entries for
// a given period (or all of history), keyed by player id. Never touches
// Player.totalScore, so period views can never drift from the source of
// truth in `history`.

import { getPeriodOfTimestamp } from "@/lib/periods";
import type { HistoryEntry } from "@/types/models";

export function aggregatePeriod(
  history: HistoryEntry[],
  periodKey: string | "all",
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const entry of history) {
    if (periodKey !== "all" && getPeriodOfTimestamp(entry.timestamp).key !== periodKey) {
      continue;
    }
    for (const [playerId, score] of Object.entries(entry.playerScores)) {
      totals[playerId] = (totals[playerId] ?? 0) + score;
    }
  }
  return totals;
}
