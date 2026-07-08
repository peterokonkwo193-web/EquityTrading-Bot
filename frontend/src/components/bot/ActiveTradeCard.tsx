"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Cpu } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge, GoldBadge } from "@/components/ui/Badge";
import { SimulatedTrade } from "@/types";
import { formatCurrency } from "@/lib/currency";

function useCountdown(closesAt: string) {
  const [remainingMs, setRemainingMs] = useState(() => new Date(closesAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(new Date(closesAt).getTime() - Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, [closesAt]);

  return Math.max(0, remainingMs);
}

export function ActiveTradeCard({ trade, currency }: { trade: SimulatedTrade; currency: string }) {
  const remainingMs = useCountdown(trade.closesAt);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const totalMs = trade.durationSeconds * 1000;
  const elapsedMs = totalMs - remainingMs;
  const progressRatio = Math.min(1.0, Math.max(0, elapsedMs / totalMs));
  const progress = progressRatio * 100;

  const isClosed = trade.status === "CLOSED";
  const finalPnl = Number(trade.profitLoss);
  const tradeAmount = Number(trade.amount);

  // Live ticking P&L calculation
  const [livePnl, setLivePnl] = useState(0);

  useEffect(() => {
    if (isClosed) {
      setLivePnl(finalPnl);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const end = new Date(trade.closesAt).getTime();
      const total = trade.durationSeconds * 1000;
      const elapsed = total - (end - now);
      const ratio = Math.min(1.0, Math.max(0, elapsed / total));

      if (ratio >= 1.0) {
        setLivePnl(finalPnl);
      } else {
        // High fidelity fluctuation based on sine/cosine wave to look like live trading activity
        const noise = Math.sin(now / 200) * Math.cos(now / 400) * (tradeAmount * 0.012);
        const currentBase = finalPnl * ratio;
        setLivePnl(currentBase + noise);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [trade.closesAt, trade.durationSeconds, finalPnl, tradeAmount, isClosed]);

  const isLiveWin = livePnl >= 0;
  const isFinalWin = finalPnl >= 0;

  // Process text based on progress
  let statusText = "Initializing trading protocols...";
  if (progress >= 95) {
    statusText = "Settling transaction ledgers...";
  } else if (progress >= 75) {
    statusText = "Awaiting block consensus confirmation...";
  } else if (progress >= 50) {
    statusText = "Matching execution block coordinates...";
  } else if (progress >= 25) {
    statusText = "Opening liquidity pool pathways...";
  }

  return (
    <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-background-card to-background-card/80 p-6 shadow-xl">
      {/* Dynamic glow overlay for active trades */}
      {!isClosed && (
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-transform hover:scale-105 duration-300 ${
              trade.direction === "BUY" 
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {trade.direction === "BUY" ? <ArrowUpRight className="h-6 w-6 animate-pulse" /> : <ArrowDownRight className="h-6 w-6 animate-pulse" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary text-base">{trade.market}</span>
              <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded ${
                trade.direction === "BUY" ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
              }`}>
                {trade.direction}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Order Size: {formatCurrency(trade.amount, currency)}
            </p>
          </div>
        </div>

        {!isClosed ? (
          <GoldBadge className="gap-1.5 px-3 py-1 font-mono uppercase tracking-wider text-xs">
            <span className="h-2 w-2 rounded-full bg-gold animate-ping" />
            Executing
          </GoldBadge>
        ) : (
          <Badge className="gap-1.5 px-3 py-1 font-mono uppercase tracking-wider text-xs">
            Settled
          </Badge>
        )}
      </div>


      {!isClosed ? (
        <div className="mt-8">
          {/* Real-time Profit Generator Display */}
          <div className="mb-6 flex flex-col items-center justify-center text-center p-4 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-sm">
            <span className="text-xs text-text-secondary uppercase tracking-wider flex items-center gap-1.5 mb-1">
              <Cpu className="h-3.5 w-3.5 animate-spin text-gold" />
              Live Profit Generator
            </span>
            <span className={`text-3xl font-bold tracking-tight font-mono tabular-nums transition-colors duration-200 ${
              isLiveWin ? "text-emerald-400" : "text-rose-400"
            }`}>
              {isLiveWin ? "+" : ""}
              {formatCurrency(livePnl, currency)}
            </span>
            <span className="text-[10px] text-text-muted mt-1.5 animate-pulse">
              {statusText}
            </span>
          </div>

          <div className="mb-2 flex items-center justify-between text-xs font-medium">
            <span className="text-text-secondary">Execution Countdown</span>
            <span className="font-mono text-text-primary text-sm bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5">{secondsLeft}s</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 border border-white/5 p-[1px]">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-gold/70 to-gold transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
      ) : (
        <div
          className={`mt-6 flex items-center gap-4 rounded-2xl border p-5 ${
            isFinalWin 
              ? "border-emerald-500/20 bg-emerald-500/[0.02]" 
              : "border-rose-500/20 bg-rose-500/[0.02]"
          }`}
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
            isFinalWin ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
          }`}>
            {isFinalWin ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wider font-semibold">Net Trade Return</p>
            <p className={`text-2xl font-bold tracking-tight font-mono ${isFinalWin ? "text-emerald-400" : "text-rose-400"}`}>
              {isFinalWin ? "+" : ""}
              {formatCurrency(finalPnl, currency)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">Execution cycle completed successfully</p>
          </div>
        </div>
      )}
    </Card>
  );
}
