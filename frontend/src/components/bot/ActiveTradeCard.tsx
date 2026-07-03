"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SimulatedTrade } from "@/types";
import { formatCurrency } from "@/lib/currency";

function useCountdown(closesAt: string) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(closesAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(new Date(closesAt).getTime() - Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, [closesAt]);

  return Math.max(0, remainingMs);
}

export function ActiveTradeCard({ trade, currency }: { trade: SimulatedTrade; currency: string }) {
  const remainingMs = useCountdown(trade.closesAt);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const progress = Math.min(100, Math.max(0, ((trade.durationSeconds * 1000 - remainingMs) / (trade.durationSeconds * 1000)) * 100));

  const isClosed = trade.status === "CLOSED";
  const isWin = Number(trade.profitLoss) >= 0;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              trade.direction === "BUY" ? "bg-primary-muted text-primary" : "bg-danger-muted text-danger"
            }`}
          >
            {trade.direction === "BUY" ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
          </div>
          <div>
            <p className="font-medium text-text-primary">{trade.market}</p>
            <p className="text-xs text-text-muted">
              {trade.direction} · {formatCurrency(trade.amount, currency)}
            </p>
          </div>
        </div>
        <Badge>{isClosed ? "Closed" : "Open"}</Badge>
      </div>

      {!isClosed ? (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-text-secondary">Simulated trade in progress</span>
            <span className="font-mono text-text-primary">{secondsLeft}s</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : (
        <div
          className={`mt-6 flex items-center gap-3 rounded-xl border p-4 ${
            isWin ? "border-gold/30 bg-gold-muted/30" : "border-danger/30 bg-danger-muted/30"
          }`}
        >
          {isWin ? <CheckCircle2 className="h-5 w-5 text-gold" /> : <XCircle className="h-5 w-5 text-danger" />}
          <div>
            <p className={`font-semibold ${isWin ? "text-gold" : "text-danger"}`}>
              {isWin ? "+" : ""}
              {formatCurrency(trade.profitLoss, currency)}
            </p>
            <p className="text-xs text-text-muted">Simulated trade closed</p>
          </div>
        </div>
      )}
    </Card>
  );
}
