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

  // 1. Identify leaders and last place (based on current cumulative scores)
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

  // 2. Tally wins, losses, rounds played, and nemesis wins
  const tallies: Record<string, { wins: number; losses: number; nemesisWins: number; roundsPlayed: number }> = {};
  for (const id of group.playerIds) tallies[id] = { wins: 0, losses: 0, nemesisWins: 0, roundsPlayed: 0 };

  for (const round of rounds) {
    // Check if any leader lost in this round (score < 0)
    let anyLeaderLost = false;
    for (const leaderId of leaderIds) {
      const lScore = round.playerScores[leaderId];
      if (lScore !== undefined && lScore < 0) {
        anyLeaderLost = true;
        break;
      }
    }

    for (const id of group.playerIds) {
      const score = round.playerScores[id];
      if (score === undefined) continue;
      
      tallies[id].roundsPlayed += 1;
      const result = getRoundResult(score, round.playerScores);
      
      if (result === "win") {
        tallies[id].wins += 1;
        // Count as a nemesis win if a leader lost and this player is not a leader
        if (anyLeaderLost && !leaderIds.includes(id)) {
          tallies[id].nemesisWins += 1;
        }
      } else if (result === "loss") {
        tallies[id].losses += 1;
      }
    }
  }

  // 3. Build records map
  const records: Record<string, MemberRecord> = {};
  for (const [id, { wins, losses, roundsPlayed }] of Object.entries(tallies)) {
    records[id] = {
      wins,
      losses,
      winRate: roundsPlayed > 0 ? (wins / roundsPlayed) * 100 : null,
    };
  }

  // 4. Determine Nemesis
  // The nemesis is the non-leader with the most "nemesis wins" (must be > 0)
  const challengers = group.playerIds.filter(
    (id) => !leaderIds.includes(id) && tallies[id].nemesisWins > 0,
  );
  const mostNemesisWins = challengers.length > 0
    ? Math.max(...challengers.map((id) => tallies[id].nemesisWins))
    : 0;

  const nemesisIds =
    leaderIds.length > 0 && mostNemesisWins > 0
      ? challengers.filter((id) => tallies[id].nemesisWins === mostNemesisWins)
      : [];

  return {
    totalRounds: rounds.length,
    records,
    leaderIds,
    lastPlaceIds,
    nemesisIds,
  };
}
