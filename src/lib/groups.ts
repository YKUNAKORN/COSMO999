// Group writes. dummyRoom/groups is stored as a whole JSON array, exactly
// as the legacy app writes it via saveGroupsData(). Against Firebase every
// mutation runs in a transaction (updateList) so it cannot overwrite a round
// that was saved at the same moment with stale group scores.
// History entries that reference these groups are NOT touched - per legacy
// behaviour, deleting a group shortcut only removes the groups entry, not
// the history records that mention it.
import { DB_PATHS, isConfigured } from "./firebase";
import { getLocalGroups, setLocalGroups } from "./localRoom";
import { updateList } from "./rtdb";
import type { Group } from "@/types/models";

async function mutateGroups(update: (groups: Group[]) => Group[]): Promise<void> {
  if (!isConfigured) {
    await setLocalGroups(update(await getLocalGroups()));
    return;
  }
  await updateList<Group>(DB_PATHS.groups, update);
}

/**
 * Rename a group shortcut. Only the name field changes; playerIds, scores,
 * and id are untouched. Throws on Firebase write failure so the caller can
 * display an inline error.
 */
export async function renameGroup(groupId: string, newName: string): Promise<void> {
  await mutateGroups((groups) =>
    groups.map((g) => (g.id === groupId ? { ...g, name: newName.trim() } : g)),
  );
}

/**
 * Delete a group shortcut. Removes the entry from the groups array. History
 * entries that mention this group id are preserved - the legacy app does the
 * same.
 */
export async function deleteGroup(groupId: string): Promise<void> {
  await mutateGroups((groups) => groups.filter((g) => g.id !== groupId));
}
