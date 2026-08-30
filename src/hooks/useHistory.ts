"use client";

// Live list of match history from dummyRoom/history. Read-only.
import { useEffect, useState } from "react";
import { DB_PATHS } from "@/lib/firebase";
import { subscribeToList } from "@/lib/rtdb";
import type { HistoryEntry } from "@/types/models";

export function useHistory(): {
  history: HistoryEntry[];
  loading: boolean;
  error: Error | null;
} {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToList<HistoryEntry>(
      DB_PATHS.history,
      (items) => {
        setHistory(items);
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

  return { history, loading, error };
}
