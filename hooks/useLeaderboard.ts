'use client';

import { useCallback, useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@/lib/leaderboard';

export type { LeaderboardEntry };

interface UseLeaderboardResult {
  entries:   LeaderboardEntry[];
  isLoading: boolean;
  error:     string | null;
  refetch:   () => void;
}

export function useLeaderboard(eraId: string): UseLeaderboardResult {
  const [entries,   setEntries]   = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/leaderboard/${encodeURIComponent(eraId)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<{ entries: LeaderboardEntry[] }>;
      })
      .then((d) => { if (!cancelled) setEntries(d.entries); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [eraId, tick]);

  // Auto-refresh every 60 s — matches Redis TTL
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { entries, isLoading, error, refetch };
}
