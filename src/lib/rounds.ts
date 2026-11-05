// Atomic round save / undo / edit / recalculate. Ported from the legacy
// prototype's confirmAndSaveRound, undoMatch and recalculateScoresFromHistory.
// Every write uses runTransaction on DB_PATHS.root so players / groups /
// history are always consistent and no write ever touches a hardcoded path.
// The pure transforms live in roundOps.ts / roundEdit.ts so they can be tested.
import { ref, runTransaction } from "firebase/database";
import { database, DB_PATHS, isConfigured } from "./firebase";
import { initializeLocalRoom, normalizeRoom, setLocalRoom } from "./localRoom";
import { applyRoundEdit } from "./roundEdit";
import {
  applyRound,
  applyUndo,
  replayScores,
  type ApplyRoundArgs,
} from "./roundOps";
import type { RoomData } from "@/types/models";

export { normalizeRoom };

const TRANSACTION_TIMEOUT_MS = 12000;

export type SaveRoundArgs = ApplyRoundArgs;

export interface SaveRoundResult {
  committed: boolean;
}

/** Id for a new history entry. Digits only so ids keep sorting by time. */
export function newMatchId(): string {
  return Date.now().toString();
}

/**
 * Run `update` against the whole room. Offline / unconfigured builds use the
 * localStorage room instead. Failures are logged (never silently dropped) and
 * reported as `committed: false`.
 *
 * A Firebase transaction cannot be cancelled, so the timeout only stops the
 * caller waiting - the write may still commit later. Callers that retry must
 * therefore use an idempotent update (see ApplyRoundArgs.matchId).
 */
async function updateRoom(
  label: string,
  update: (room: RoomData) => RoomData,
): Promise<SaveRoundResult> {
  if (!isConfigured) {
    try {
      const room = await initializeLocalRoom();
      setLocalRoom(update(room));
      return { committed: true };
    } catch (error) {
      console.error(`[rounds] ${label} failed (local)`, error);
      return { committed: false };
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const transactionPromise = runTransaction(
      ref(database, DB_PATHS.root),
      (currentData: unknown) => {
        // Keep any other keys stored under the room (e.g. a leftover
        // `activeSession` from the removed Live Session feature): writing only
        // players/groups/history back would delete them.
        const base =
          currentData !== null && typeof currentData === "object"
            ? (currentData as Record<string, unknown>)
            : {};
        return { ...base, ...update(normalizeRoom(currentData)) };
      },
      { applyLocally: false },
    );
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Timeout: ${label}`)),
        TRANSACTION_TIMEOUT_MS,
      );
    });
    const result = await Promise.race([transactionPromise, timeoutPromise]);
    return { committed: result.committed };
  } catch (error) {
    console.error(`[rounds] ${label} failed`, error);
    return { committed: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Save one round: player totals, the group's running score, and a history
 * entry all update in a single transaction. Pass the same `matchId` when
 * retrying a failed save so a late-committing first attempt is not doubled.
 */
export async function saveRound(args: SaveRoundArgs): Promise<SaveRoundResult> {
  const matchId = args.matchId ?? newMatchId();
  return updateRoom("save round", (room) => applyRound(room, { ...args, matchId }));
}

/**
 * Undo one history entry: subtract the round's scores from each player and the
 * group, then delete the entry. A missing entry is a no-op (already undone).
 */
export async function undoRound(matchId: string): Promise<SaveRoundResult> {
  return updateRoom("undo round", (room) => applyUndo(room, matchId));
}

/**
 * Edit one history entry's scores / multiplier, keeping player totals and group
 * scores consistent (see applyRoundEdit).
 */
export async function editRound(
  matchId: string,
  netScores: Record<string, number>,
  multiplier: number,
  commentary: string,
): Promise<SaveRoundResult> {
  if (!isConfigured) {
    const room = await initializeLocalRoom();
    if (!room.history[matchId]) return { committed: false };
  }
  return updateRoom("edit round", (room) =>
    applyRoundEdit(room, matchId, netScores, multiplier, commentary),
  );
}

/** Recalculate all player and group scores by replaying every history entry. */
export async function recalculateScores(): Promise<SaveRoundResult> {
  return updateRoom("recalculate scores", replayScores);
}
