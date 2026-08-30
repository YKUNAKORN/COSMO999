"use client";

// Live list of players from dummyRoom/players. Read-only.
import { useEffect, useState } from "react";
import { DB_PATHS } from "@/lib/firebase";
import { subscribeToList } from "@/lib/rtdb";
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
    const unsubscribe = subscribeToList<Player>(
      DB_PATHS.players,
      (items) => {
        setPlayers(items);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      },
    );
    // Detach the listener on unmount.
    return unsubscribe;
  }, []);

  return { players, loading, error };
}
