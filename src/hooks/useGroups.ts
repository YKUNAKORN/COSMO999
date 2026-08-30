"use client";

// Live list of groups from dummyRoom/groups. Read-only.
import { useEffect, useState } from "react";
import { DB_PATHS } from "@/lib/firebase";
import { subscribeToList } from "@/lib/rtdb";
import type { Group } from "@/types/models";

export function useGroups(): {
  groups: Group[];
  loading: boolean;
  error: Error | null;
} {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToList<Group>(
      DB_PATHS.groups,
      (items) => {
        setGroups(items);
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

  return { groups, loading, error };
}
