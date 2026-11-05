// Player writes. dummyRoom/players is stored as a whole JSON array, exactly
// as the legacy app writes it via playersRef.set(players). Every mutation here
// is a read-modify-write of that array. Against Firebase it runs inside a
// transaction (updateList) so it cannot overwrite a round that was saved at the
// same moment with a stale copy of the totals. Do NOT switch this to a keyed
// object - the round-save transaction relies on the array layout.
import { DB_PATHS, isConfigured } from "./firebase";
import { getLocalPlayers, setLocalPlayers } from "./localRoom";
import { updateList } from "./rtdb";
import { getRandomEmoji, parseEmojiAvatar, parseThematicAvatar } from "./suits";
import type { Player } from "@/types/models";

async function mutatePlayers(update: (players: Player[]) => Player[]): Promise<void> {
  if (!isConfigured) {
    await setLocalPlayers(update(await getLocalPlayers()));
    return;
  }
  await updateList<Player>(DB_PATHS.players, update);
}

function hasAvatar(image: string | undefined): boolean {
  if (!image) return false;
  return (
    image.startsWith("data:") ||
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    Boolean(parseThematicAvatar(image)) ||
    Boolean(parseEmojiAvatar(image))
  );
}

/**
 * Append a new player and return its id.
 * If no custom image or emoji is provided, automatically selects a random unique emoji
 * and permanently persists it to the database.
 */
export async function createPlayer(
  name: string,
  image?: string,
): Promise<string> {
  const id = Date.now().toString();
  const trimmedImage = image?.trim() || "";

  await mutatePlayers((players) => {
    const finalImage =
      trimmedImage || `emoji:${getRandomEmoji(players.map((p) => p.image))}`;
    const newPlayer: Player = {
      id,
      name: name.trim(),
      image: finalImage,
      totalScore: 0,
      latestScore: null,
    };
    return [...players, newPlayer];
  });
  return id;
}

/**
 * Update a player's name and/or image. Fields left undefined are kept as-is.
 * Score fields are never touched here.
 */
export async function updatePlayer(
  id: string,
  changes: { name?: string; image?: string },
): Promise<void> {
  await mutatePlayers((players) =>
    players.map((player) => {
      if (player.id !== id) return player;
      let newImage = changes.image !== undefined ? changes.image : player.image;
      if (!newImage || newImage.trim() === "") {
        const otherImages = players.filter((p) => p.id !== id).map((p) => p.image);
        newImage = `emoji:${getRandomEmoji(otherImages)}`;
      }
      return {
        ...player,
        ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
        image: newImage,
      };
    }),
  );
}

/** Remove a player from the array. */
export async function deletePlayer(id: string): Promise<void> {
  await mutatePlayers((players) => players.filter((player) => player.id !== id));
}

/**
 * Give every legacy player who has no photo / suit / emoji a random emoji.
 * Only the `image` of those players changes, and it runs in a transaction, so
 * scores written meanwhile are never rolled back.
 */
export async function fillMissingAvatars(): Promise<void> {
  await mutatePlayers((players) => {
    const used = players.map((p) => p.image);
    return players.map((player) => {
      if (hasAvatar(player.image)) return player;
      const token = `emoji:${getRandomEmoji(used)}`;
      used.push(token);
      return { ...player, image: token };
    });
  });
}
