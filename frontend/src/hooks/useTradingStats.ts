import { useEffect, useState, useCallback } from "react";
import { TradingStats } from "@/types";
import { fetchTradingStats } from "@/lib/endpoints";

const POLL_INTERVAL_MS = 5000;
const STATS_STORAGE_PREFIX = "bot-trading:stats-";

const statsCache: Record<string, TradingStats> = {};

function getCachedStats(accountId: string | null): TradingStats | null {
  if (!accountId || typeof window === "undefined") return null;
  if (statsCache[accountId]) return statsCache[accountId];
  try {
    const raw = sessionStorage.getItem(`${STATS_STORAGE_PREFIX}${accountId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as TradingStats;
      statsCache[accountId] = parsed;
      return parsed;
    }
  } catch {}
  return null;
}

function persistStats(accountId: string, data: TradingStats) {
  statsCache[accountId] = data;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`${STATS_STORAGE_PREFIX}${accountId}`, JSON.stringify(data));
    } catch {}
  }
}

export function useTradingStats(accountId: string | null) {
  const [stats, setStats] = useState<TradingStats | null>(() => getCachedStats(accountId));
  const [isLoading, setIsLoading] = useState(() => !getCachedStats(accountId));

  const refreshStats = useCallback(async () => {
    if (!accountId) return;
    try {
      const data = await fetchTradingStats(accountId);
      persistStats(accountId, data);
      setStats(data);
    } catch {}
  }, [accountId]);

  useEffect(() => {
    if (!accountId) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    const cached = getCachedStats(accountId);
    if (cached) {
      setStats(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await fetchTradingStats(accountId);
        if (!cancelled) {
          persistStats(accountId, data);
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

