import { useEffect, useState } from "react";
import { TradingStats } from "@/types";
import { fetchTradingStats } from "@/lib/endpoints";

const POLL_INTERVAL_MS = 5000;

export function useTradingStats(accountId: string | null) {
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const poll = async () => {
      try {
        const data = await fetchTradingStats(accountId);
        if (!cancelled) setStats(data);
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

  return { stats, isLoading, setStats };
}
