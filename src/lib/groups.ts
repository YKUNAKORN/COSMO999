// Group writes. dummyRoom/groups is stored as a whole JSON array, exactly
// as the legacy app writes it via saveGroupsData() which called
// db.ref('dummyRoom/groups').set(groups). Every mutation here follows the
// same read-modify-write-array pattern used in players.ts.
// History entries that reference these groups are NOT touched - per legacy
// behaviour, deleting a group shortcut only removes the groups entry, not
// the history records that mention it.
import { ref, set } from "firebase/database";
import { database, DB_PATHS } from "./firebase";
import { readList } from "./rtdb";
import type { Group } from "@/types/models";

async function writeAll(groups: Group[]): Promise<void> {
  await set(ref(database, DB_PATHS.groups), groups);
}

/**
 * Rename a group shortcut. Only the name field changes; playerIds, scores,
 * and id are untouched. Throws on Firebase write failure so the caller can
 * display an inline error.
 */
export async function renameGroup(groupId: string, newName: string): Promise<void> {
  const groups = await readList<Group>(DB_PATHS.groups);
  const next = groups.map((g) =>
    g.id === groupId ? { ...g, name: newName.trim() } : g,
  );
  await writeAll(next);
}

/**
 * Delete a group shortcut. Removes the entry from the groups array and
 * writes the remaining array back. History entries that mention this group
 * id are preserved - the legacy app does the same.
 */
export async function deleteGroup(groupId: string): Promise<void> {
  const groups = await readList<Group>(DB_PATHS.groups);
  await writeAll(groups.filter((g) => g.id !== groupId));
}
