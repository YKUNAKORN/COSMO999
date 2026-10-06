// Per-group stats for the group score dialog. Pure and read-only: derived from
// the group's stored scores plus the history rows that carry its groupId.
import { getRoundResult } from "@/lib/stats";
import type { Group, HistoryEntry } from "@/types/models";

export interface MemberRecord {
  wins: number;
  losses: number;
  // wins / (wins + losses) as a 0-100 percentage; null when neither exists
  // yet (same exclusion of other rounds as the player stats page).
  winRate: number | null;
}

export interface GroupStats {
  totalRounds: number;
  records: Record<string, MemberRecord>;
  // Highest and lowest group score. Ties are kept (every tied member is
  // listed). Both are empty when the group is level, e.g. no rounds yet.
  leaderIds: string[];
  lastPlaceIds: string[];
  // Non-leaders who won the most rounds at the leader's table.
  nemesisIds: string[];
}

export function computeGroupStats(
  group: Group,
  history: HistoryEntry[],
): GroupStats {
  const rounds = history.filter((entry) => entry.groupId === group.id);

  const tallies: Record<string, { wins: number; losses: number }> = {};
  for (const id of group.playerIds) tallies[id] = { wins: 0, losses: 0 };

  for (const round of rounds) {
    for (const id of group.playerIds) {
      const score = round.playerScores[id];
      if (score === undefined) continue;
      const result = getRoundResult(score, round.playerScores);
      if (result === "win") tallies[id].wins += 1;
      else if (result === "loss") tallies[id].losses += 1;
    }
  }

  const records: Record<string, MemberRecord> = {};
  for (const [id, { wins, losses }] of Object.entries(tallies)) {
    records[id] = {
      wins,
      losses,
      winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : null,
    };
  }

  const scoreOf = (id: string) => group.scores[id] ?? 0;
  const values = group.playerIds.map(scoreOf);
  const highest = Math.max(...values);
  const lowest = Math.min(...values);
  const isRanked = group.playerIds.length >= 2 && highest !== lowest;

  const leaderIds = isRanked
    ? group.playerIds.filter((id) => scoreOf(id) === highest)
    : [];
  const lastPlaceIds = isRanked
    ? group.playerIds.filter((id) => scoreOf(id) === lowest)
    : [];

  const challengers = group.playerIds.filter(
    (id) => !leaderIds.includes(id) && records[id].wins > 0,
  );
  const mostWins = Math.max(0, ...challengers.map((id) => records[id].wins));
  const nemesisIds =
    leaderIds.length > 0
      ? challengers.filter((id) => records[id].wins === mostWins)
      : [];

  return {
    totalRounds: rounds.length,
    records,
    leaderIds,
    lastPlaceIds,
    nemesisIds,
  };
}
