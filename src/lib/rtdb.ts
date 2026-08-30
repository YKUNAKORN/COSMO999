// Realtime Database read layer: live list subscriptions plus a one-shot
// read. Writes live in the per-entity modules (see players.ts).
import { get, onValue, ref, type DataSnapshot } from "firebase/database";
import { database } from "./firebase";

// Legacy quirk: dummyRoom/players and dummyRoom/groups were saved as JSON
// arrays, so Firebase hands them back as objects keyed "0","1","2"... and
// deleted slots come back as null. dummyRoom/history is an object keyed by
// match id. All three normalise the same way: take Object.values and drop
// the null / undefined holes.
function normalizeList<T>(raw: unknown): T[] {
  if (raw === null || typeof raw !== "object") {
    return [];
  }
  // Narrow the SDK's untyped value to a keyed map before reading it. This is
  // the single boundary where Firebase data enters the typed world.
  const map = raw as Record<string, T | null | undefined>;
  // Drop only the legacy array holes, not legitimate falsy leaf values.
  return Object.values(map).filter(
    (item): item is T => item !== null && item !== undefined,
  );
}

/**
 * Subscribe to a list stored at `path`. Calls `onData` with the normalised
 * array on the first snapshot and on every change after. If `onError` is
 * given it receives listener failures (e.g. rules rejection); if omitted,
 * the Firebase SDK keeps logging its own default warning. Returns an
 * unsubscribe function that must be called on cleanup.
 */
export function subscribeToList<T>(
  path: string,
  onData: (items: T[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const listRef = ref(database, path);
  const handleValue = (snapshot: DataSnapshot) => {
    onData(normalizeList<T>(snapshot.val()));
  };
  return onError
    ? onValue(listRef, handleValue, onError)
    : onValue(listRef, handleValue);
}

/**
 * Read the list at `path` once and return it normalised the same way
 * `subscribeToList` normalises snapshots. Used by write helpers that need
 * the current array before they modify and re-set it.
 */
export async function readList<T>(path: string): Promise<T[]> {
  const snapshot = await get(ref(database, path));
  return normalizeList<T>(snapshot.val());
}
