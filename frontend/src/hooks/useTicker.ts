import { useEffect, useState } from "react";
import { TickerEntry } from "@/types";
import { fetchTicker } from "@/lib/endpoints";

const POLL_INTERVAL_MS = 6000;

let cachedEntries: TickerEntry[] = [];
let isFetching = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<(entries: TickerEntry[]) => void>();

async function triggerFetch() {
  if (isFetching) return;
  isFetching = true;
  try {
    const data = await fetchTicker();
    if (data && data.length > 0) {
      cachedEntries = data;
      listeners.forEach((listener) => listener(data));
    }
  } catch {
    // Ignore network blips, keep cachedEntries
  } finally {
    isFetching = false;
  }
}

function startPolling() {
  if (intervalId !== null) return;
  triggerFetch();
  intervalId = setInterval(triggerFetch, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (intervalId !== null && listeners.size === 0) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function useTicker() {
  const [entries, setEntries] = useState<TickerEntry[]>(cachedEntries);

  useEffect(() => {
    const listener = (newEntries: TickerEntry[]) => {
      setEntries(newEntries);
    };

    listeners.add(listener);
    if (cachedEntries.length > 0) {
      setEntries(cachedEntries);
    }
    startPolling();

    return () => {
      listeners.delete(listener);
      stopPolling();
    };
  }, []);

  return { entries, isLoading: entries.length === 0 };
}

