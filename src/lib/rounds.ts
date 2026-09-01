// Atomic round save and mutation helpers. Ported from the legacy prototype's
// confirmAndSaveRound (reference/legacy-prototype.sanitized.html L889-993),
// undoMatch (L1044-1090), and recalculateScoresFromHistory (L1092-1122).
// Every write uses runTransaction on DB_PATHS.root so players / groups /
// history are always consistent and no write ever touches a hardcoded path.
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
// Exported so History.tsx's undo/recalc transactions can use the same
// normalisation boundary without duplicating the narrowing logic.
export function normalizeRoom(raw: unknown): RoomData {
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

/**
 * Undo one history entry: subtract the round's player scores from each
 * player's totalScore and from the group's scores, then delete the history
 * entry. All three mutations happen in one transaction on DB_PATHS.root.
 * Ported from legacy undoMatch (reference/legacy-prototype.sanitized.html
 * L1044-1090) with confirm() replaced by the UI-level ConfirmDialog.
 * Never throws - returns committed: false on failure so the caller can show
 * an inline error without losing data.
 */
export async function undoRound(matchId: string): Promise<SaveRoundResult> {
  try {
    const result = await runTransaction(
      ref(database, DB_PATHS.root),
      (currentData: unknown) => {
        // Abort (return undefined) if the entry is already gone - another
        // client may have undone it between the dialog open and the confirm.
        // Firebase treats undefined as "abort this transaction cleanly".
        if (currentData === null || typeof currentData !== "object") {
          return undefined;
        }
        const raw = currentData as Record<string, unknown>;
        const rawHistory = raw.history;
        if (
          rawHistory === null ||
          typeof rawHistory !== "object" ||
          !(matchId in (rawHistory as Record<string, unknown>))
        ) {
          return undefined;
        }

        const room = normalizeRoom(currentData);
        const log = room.history[matchId];

        const players = [...room.players];
        const groups = [...room.groups];

        for (const [pId, scoreToRevert] of Object.entries(log.playerScores)) {
          // Subtract from the player's running total (guard: player may have
          // been deleted since the round was saved).
          const pIndex = players.findIndex((p) => p.id === pId);
          if (pIndex > -1) {
            players[pIndex] = {
              ...players[pIndex],
              totalScore: (players[pIndex].totalScore ?? 0) - scoreToRevert,
            };
          }

          // Subtract from the group's per-player score (guard: group must
          // exist and have a scores map).
          const gIndex = groups.findIndex((g) => g.id === log.groupId);
          if (gIndex > -1 && groups[gIndex].scores) {
            const updatedGroup: Group = {
              ...groups[gIndex],
              scores: { ...groups[gIndex].scores },
            };
            updatedGroup.scores[pId] = (updatedGroup.scores[pId] ?? 0) - scoreToRevert;
            groups[gIndex] = updatedGroup;
          }
        }

        // Remove the entry from history and write all three collections back.
        // players/groups go back as arrays; history stays as an object keyed
        // by matchId, matching the legacy dummyRoom/history shape exactly.
        const newHistory = { ...room.history };
        delete newHistory[matchId];

        return { players, groups, history: newHistory };
      },
      { applyLocally: false },
    );
    return { committed: result.committed };
  } catch {
    return { committed: false };
  }
}

/**
 * Recalculate all player and group scores from scratch by replaying every
 * history entry. Ported from legacy recalculateScoresFromHistory
 * (reference/legacy-prototype.sanitized.html L1092-1122). Zeros every
 * totalScore / latestScore / group.scores entry, then sums each history
 * entry back in. History itself is not modified. Runs as a single
 * transaction on DB_PATHS.root so the write is atomic. Never throws -
 * returns committed: false so the caller can surface an inline error.
 */
export async function recalculateScores(): Promise<SaveRoundResult> {
  try {
    const result = await runTransaction(
      ref(database, DB_PATHS.root),
      (currentData: unknown) => {
        const room = normalizeRoom(currentData);

        // Zero out every player's running totals before replaying history.
        const players: Player[] = room.players.map((p) => ({
          ...p,
          totalScore: 0,
          latestScore: null,
        }));

        // Zero out every group's per-player score buckets before replaying.
        const groups: Group[] = room.groups.map((g) => {
          const zeroed: Record<string, number> = {};
          for (const key of Object.keys(g.scores)) zeroed[key] = 0;
          return { ...g, scores: zeroed };
        });

        // Replay every history entry in insertion order (Firebase preserves
        // object key insertion order for numeric-string keys, which matchIds
        // are). totalScore accumulates; group scores accumulate per player.
        for (const log of Object.values(room.history)) {
          for (const [pId, score] of Object.entries(log.playerScores)) {
            const pIndex = players.findIndex((p) => p.id === pId);
            if (pIndex > -1) {
              players[pIndex] = {
                ...players[pIndex],
                totalScore: (players[pIndex].totalScore ?? 0) + score,
              };
            }

            const gIndex = groups.findIndex((g) => g.id === log.groupId);
            if (gIndex > -1) {
              const updatedGroup: Group = {
                ...groups[gIndex],
                scores: { ...groups[gIndex].scores },
              };
              updatedGroup.scores[pId] = (updatedGroup.scores[pId] ?? 0) + score;
              groups[gIndex] = updatedGroup;
            }
          }
        }

        // History shape is unchanged; only players and groups are rewritten.
        return { players, groups, history: room.history };
      },
      { applyLocally: false },
    );
    return { committed: result.committed };
  } catch {
    return { committed: false };
  }
}
