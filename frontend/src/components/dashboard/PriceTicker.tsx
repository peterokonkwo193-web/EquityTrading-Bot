"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";
import { fetchTicker } from "@/lib/endpoints";
import { TickerEntry } from "@/types";

const POLL_INTERVAL_MS = 15000;

function formatPrice(entry: TickerEntry) {
  if (entry.assetClass === "FOREX" && entry.symbol !== "XAUUSD") {
    return entry.price.toFixed(4);
  }
  return entry.price.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function PriceTicker() {
  const [entries, setEntries] = useState<TickerEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      fetchTicker()
        .then((data) => {
          if (!cancelled) setEntries(data);
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (entries.length === 0) return null;

  const loop = [...entries, ...entries];

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex animate-[ticker_30s_linear_infinite] gap-8 whitespace-nowrap px-4 py-3 hover:[animation-play-state:paused]">
        {loop.map((entry, i) => {
          const isUp = entry.changePct >= 0;
          return (
            <div key={`${entry.symbol}-${i}`} className="flex items-center gap-2 text-sm">
              <span className="font-medium text-text-primary">{entry.symbol}</span>
              <span className={clsx(isUp ? "text-green-400" : "text-rose-400")}>{formatPrice(entry)}</span>
              <span className={clsx("flex items-center gap-0.5", isUp ? "text-green-400" : "text-rose-400")}>
                {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(entry.changePct).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
