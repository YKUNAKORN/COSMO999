// Atomic round save. Ported from the legacy prototype's confirmAndSaveRound
// (reference/legacy-prototype.sanitized.html L889-993): one runTransaction on
// the whole room node updates players' totals, upserts the group's running
// score, and appends the history entry together, so a save can never leave
// one of the three half-written.
import { ref, runTransaction } from "firebase/database";
import { database, DB_PATHS } from "./firebase";
import { normalizeList } from "./rtdb";
import type { Group, HistoryEntry, Player, RoomData } from "@/types/models";

export interface SaveRoundArgs {
  // Ids of the players in this round, in selection order (not sorted - the
  // group id/name below sort them the same way the legacy code does).
  playerIds: string[];
  // Net score per player id, from calculateRoundScores.
  netScores: Record<string, number>;
  multiplier: number;
  // Pre-computed by generateRoundCommentary; "" means no roast this round.
  commentary: string;
}

export interface SaveRoundResult {
  committed: boolean;
}

// Firebase's transaction updater is untyped (v9 hands the raw current value
// as `unknown`, previously `any` in the v8 API this was ported from). This is
// the single boundary where that raw value is narrowed into RoomData -
// mirrors normalizeList's role for the read hooks. currentData is null on
// the optimistic first local pass; treat that the same as an empty room
// rather than aborting, since returning undefined here would cancel the
// whole write once Firebase re-runs with real server data.
function normalizeRoom(raw: unknown): RoomData {
  if (raw === null || typeof raw !== "object") {
    return { players: [], groups: [], history: {} };
  }
  const room = raw as Record<string, unknown>;
  const players = normalizeList<Player>(room.players);
  const groups = normalizeList<Group>(room.groups);
  const rawHistory = room.history;
  const history: Record<string, HistoryEntry> =
    rawHistory !== null && typeof rawHistory === "object"
      ? (rawHistory as Record<string, HistoryEntry>)
      : {};
  return { players, groups, history };
}

function applyRound(room: RoomData, args: SaveRoundArgs): RoomData {
  const { playerIds, netScores, multiplier, commentary } = args;

  const players = [...room.players];
  for (const id of playerIds) {
    const net = netScores[id];
    const index = players.findIndex((player) => player.id === id);
    // Guard, matching legacy's `pIndex > -1`: a player removed from the
    // roster mid-round has nothing to add totals to, but the round is still
    // recorded in the group and history below.
    if (index > -1) {
      players[index] = {
        ...players[index],
        // `?? 0` matches legacy's `(safePlayers[pIndex].totalScore || 0)`: a
        // row read back from RTDB without this field would otherwise turn
        // the sum into NaN and Firebase would reject the whole write.
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
    const groupName = sortedIds
      .map((id) => players.find((player) => player.id === id)?.name ?? "ไม่ทราบชื่อ")
      .join(" + ");
    groups.push({ id: groupId, name: groupName, playerIds: sortedIds, scores: initialScores });
    groupIndex = groups.length - 1;
  }

  const group: Group = { ...groups[groupIndex], scores: { ...groups[groupIndex].scores } };
  for (const id of playerIds) {
    group.scores[id] = (group.scores[id] ?? 0) + netScores[id];
  }
  groups[groupIndex] = group;

  const matchId = Date.now().toString();
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
 * Save one round: player totals, the group's running score, and a history
 * entry all update in a single transaction on DB_PATHS.root. Never throws -
 * a failed or aborted write comes back as `committed: false` so the caller
 * can show an inline error instead of losing data.
 */
export async function saveRound(args: SaveRoundArgs): Promise<SaveRoundResult> {
  try {
    const result = await runTransaction(
      ref(database, DB_PATHS.root),
      (currentData: unknown) => applyRound(normalizeRoom(currentData), args),
      // The room root has no active listener (only its players/groups/history
      // children do), so the SDK cannot serve a cached value here and this
      // transaction's first pass always runs on `currentData: null`. With the
      // default applyLocally: true, that null-derived result (an otherwise-
      // empty room plus just this round) would flash into the UI for one
      // round trip before the server value arrives and the transaction
      // re-runs. Disabling it skips that optimistic broadcast; the write
      // itself is unaffected.
      { applyLocally: false },
    );
    return { committed: result.committed };
  } catch {
    return { committed: false };
  }
}
