import { useEffect, useRef, useState } from "react";
import { TradingBot } from "@/types";
import { fetchBot } from "@/lib/endpoints";

const POLL_INTERVAL_MS = 4000;

export function useBotPolling(accountId: string | null) {
  const [bot, setBot] = useState<TradingBot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!accountId) {
      setBot(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const poll = async () => {
      try {
        const data = await fetchBot(accountId);
        if (!cancelled) setBot(data);
      } catch {
        // keep last known state on transient poll failures
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [accountId]);

  return { bot, isLoading, setBot };
}
