// Pure room transforms behind save / undo / recalculate. No Firebase here so
// they can be unit tested; rounds.ts wraps them in the same transaction /
// localStorage path. Type-only imports keep this loadable by `node --test`.
import type { Group, HistoryEntry, Player, RoomData } from "@/types/models";

export interface ApplyRoundArgs {
  // Ids of the players in this round, in selection order (the group id is
  // built from the sorted ids).
  playerIds: string[];
  // Net score per player id, from calculateRoundScores.
  netScores: Record<string, number>;
  multiplier: number;
  // Pre-computed by generateRoundCommentary; "" means no roast this round.
  commentary: string;
  // Idempotency key. If a history entry with this id already exists the room
  // is returned untouched, so a retry of a save that actually committed late
  // (e.g. after a client-side timeout) cannot record the round twice.
  matchId?: string;
}

export function buildGroupId(playerIds: string[]): string {
  return [...playerIds].sort().join("_");
}

export function buildGroupName(
  playerIds: string[],
  players: Player[],
): string {
  return [...playerIds]
    .sort()
    .map((id) => players.find((player) => player.id === id)?.name ?? "ไม่ทราบชื่อ")
    .join(" + ");
}

export function applyRound(room: RoomData, args: ApplyRoundArgs): RoomData {
  const { playerIds, netScores, multiplier, commentary } = args;
  const matchId = args.matchId ?? Date.now().toString();

  if (room.history[matchId]) return room;

  const players = [...room.players];
  for (const id of playerIds) {
    const net = netScores[id];
    const index = players.findIndex((player) => player.id === id);
    // A player removed from the roster mid-round has nothing to add totals
    // to, but the round is still recorded in the group and history below.
    if (index > -1) {
      players[index] = {
        ...players[index],
        // `?? 0`: a row read back from RTDB without this field would
        // otherwise turn the sum into NaN and Firebase would reject the write.
        totalScore: (players[index].totalScore ?? 0) + net,
        latestScore: net,
      };
    }
  }

  const groups = [...room.groups];
  const sortedIds = [...playerIds].sort();
  const groupId = sortedIds.join("_");
  let groupIndex = groups.findIndex((group) => group.id === groupId);

  if (groupIndex === -1) {
    const initialScores: Record<string, number> = {};
    for (const id of sortedIds) initialScores[id] = 0;
    groups.push({
      id: groupId,
      name: buildGroupName(sortedIds, players),
      playerIds: sortedIds,
      scores: initialScores,
    });
    groupIndex = groups.length - 1;
  }

  const group: Group = { ...groups[groupIndex], scores: { ...groups[groupIndex].scores } };
  for (const id of playerIds) {
    group.scores[id] = (group.scores[id] ?? 0) + netScores[id];
  }
  groups[groupIndex] = group;

  const historyEntry: HistoryEntry = {
    id: matchId,
    timestamp: new Date().toISOString(),
    groupName: group.name,
    groupId,
    multiplier,
    playerScores: netScores,
    commentary,
  };

  return {
    players,
    groups,
    history: { ...room.history, [matchId]: historyEntry },
  };
}

/**
 * Remove one history entry and subtract its scores from the players and the
 * group. Returns the room unchanged if the entry does not exist.
 */
export function applyUndo(room: RoomData, matchId: string): RoomData {
  const log = room.history[matchId];
  if (!log) return room;

  const players = [...room.players];
  const groups = [...room.groups];
  const gIndex = groups.findIndex((g) => g.id === log.groupId);
  const group: Group | null =
    gIndex > -1 && groups[gIndex].scores
      ? { ...groups[gIndex], scores: { ...groups[gIndex].scores } }
      : null;

  for (const [pId, scoreToRevert] of Object.entries(log.playerScores)) {
    const pIndex = players.findIndex((p) => p.id === pId);
    if (pIndex > -1) {
      players[pIndex] = {
        ...players[pIndex],
        totalScore: (players[pIndex].totalScore ?? 0) - scoreToRevert,
      };
    }
    if (group) group.scores[pId] = (group.scores[pId] ?? 0) - scoreToRevert;
  }
  if (group) groups[gIndex] = group;

  const history = { ...room.history };
  delete history[matchId];

  return { players, groups, history };
}

/**
 * Rebuild every player total and group score by replaying all history.
 */
export function replayScores(room: RoomData): RoomData {
  const players: Player[] = room.players.map((p) => ({
    ...p,
    totalScore: 0,
    latestScore: null,
  }));

  const groups: Group[] = room.groups.map((g) => {
    const zeroed: Record<string, number> = {};
    for (const key of Object.keys(g.scores ?? {})) zeroed[key] = 0;
    return { ...g, scores: zeroed };
  });

  for (const log of Object.values(room.history)) {
    const gIndex = groups.findIndex((g) => g.id === log.groupId);
    for (const [pId, score] of Object.entries(log.playerScores)) {
      const pIndex = players.findIndex((p) => p.id === pId);
      if (pIndex > -1) {
        players[pIndex] = {
          ...players[pIndex],
          totalScore: (players[pIndex].totalScore ?? 0) + score,
        };
      }
      if (gIndex > -1) {
        groups[gIndex] = {
          ...groups[gIndex],
          scores: {
            ...groups[gIndex].scores,
            [pId]: (groups[gIndex].scores[pId] ?? 0) + score,
          },
        };
      }
    }
  }

  return { players, groups, history: room.history };
}
