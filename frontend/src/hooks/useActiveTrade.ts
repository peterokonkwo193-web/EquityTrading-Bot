import { useEffect, useState } from "react";
import { SimulatedTrade } from "@/types";
import { fetchActiveTrade } from "@/lib/endpoints";

const POLL_INTERVAL_MS = 1000;

export function useActiveTrade(accountId: string | null) {
  const [trade, setTrade] = useState<SimulatedTrade | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setTrade(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const poll = async () => {
      try {
        const data = await fetchActiveTrade(accountId);
        if (!cancelled) {
          setTrade(data);
        }
      } catch {
        // keep last known state on transient poll failures
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

  return { trade, isLoading, setTrade };
}
