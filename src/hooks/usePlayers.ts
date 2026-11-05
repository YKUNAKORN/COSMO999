"use client";

// Live list of players from dummyRoom/players. Read-only.
import { useEffect, useState } from "react";
import { DB_PATHS, isConfigured } from "@/lib/firebase";
import {
  getLocalRoom,
  initializeLocalRoom,
  subscribeToLocalRoom,
} from "@/lib/localRoom";
import { fillMissingAvatars } from "@/lib/players";
import { subscribeToList } from "@/lib/rtdb";
import {
  parseThematicAvatar,
  parseEmojiAvatar,
  getRandomEmoji,
} from "@/lib/suits";
import type { Player } from "@/types/models";

export function usePlayers(): {
  players: Player[];
  loading: boolean;
  error: Error | null;
} {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If Firebase is not configured (local development), use reactive localStorage mock
    if (!isConfigured) {
      initializeLocalRoom()
        .then((room) => {
          setPlayers(room.players);
          setError(null);
        })
        .catch((err) => setError(err))
        .finally(() => setLoading(false));

      const unsubscribe = subscribeToLocalRoom(() => {
        const room = getLocalRoom();
        if (room) {
          setPlayers(room.players);
        }
      });
      return unsubscribe;
    }

    const unsubscribe = subscribeToList<Player>(
      DB_PATHS.players,
      (items) => {
        // Detect and migrate any legacy players who do not have a photo, suit, or emoji
        let needsSync = false;
        const currentImages = items.map((p) => p.image);

        const normalized = items.map((player) => {
          const hasPhoto = Boolean(
            player.image &&
              (player.image.startsWith("data:") ||
                player.image.startsWith("http://") ||
                player.image.startsWith("https://")),
          );
          const hasSuit = Boolean(parseThematicAvatar(player.image));
          const hasEmoji = Boolean(parseEmojiAvatar(player.image));

          if (!hasPhoto && !hasSuit && !hasEmoji) {
            needsSync = true;
            const assignedEmoji = getRandomEmoji(currentImages);
            const token = `emoji:${assignedEmoji}`;
            currentImages.push(token);
            return {
              ...player,
              image: token,
            };
          }
          return player;
        });

        if (needsSync) {
          fillMissingAvatars().catch((err) =>
            console.error("[players] avatar migration failed", err),
          );
        }

        setPlayers(normalized);
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (process.env.NODE_ENV === "development" && !isConfigured) {
          fetch("/mock-data.json")
            .then((res) => res.json())
            .then((data) => {
              if (Array.isArray(data?.players) && data.players.length > 0) {
                setPlayers(data.players);
                setError(null);
              } else {
                setError(err);
              }
            })
            .catch(() => setError(err))
            .finally(() => setLoading(false));
          return;
        }
        setError(err);
        setLoading(false);
      },
    );
    // Detach the listener on unmount.
    return unsubscribe;
  }, []);

  return { players, loading, error };
}
