import { useEffect, useState, useCallback } from "react";
import { TradingStats } from "@/types";
import { fetchTradingStats } from "@/lib/endpoints";

const POLL_INTERVAL_MS = 5000;

const statsCache: Record<string, TradingStats> = {};

export function useTradingStats(accountId: string | null) {
  const [stats, setStats] = useState<TradingStats | null>(() => (accountId ? statsCache[accountId] ?? null : null));
  const [isLoading, setIsLoading] = useState(() => !(accountId && statsCache[accountId]));

  const refreshStats = useCallback(async () => {
    if (!accountId) return;
    try {
      const data = await fetchTradingStats(accountId);
      statsCache[accountId] = data;
      setStats(data);
    } catch {}
  }, [accountId]);

  useEffect(() => {
    if (!accountId) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    if (statsCache[accountId]) {
      setStats(statsCache[accountId]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await fetchTradingStats(accountId);
        if (!cancelled) {
          statsCache[accountId] = data;
          setStats(data);
        }
      } catch {
        // keep last known stats on transient poll failures
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [accountId]);

  return { stats, isLoading, setStats, refreshStats };
}

