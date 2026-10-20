"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TradeStatusBadge } from "@/components/ui/Badge";
import { useAccount } from "@/context/AccountContext";
import { fetchTradeHistory } from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";
import { SimulatedTrade } from "@/types";

const tradesCache: Record<string, SimulatedTrade[]> = {};

export default function HistoryPage() {
  const { selectedAccount } = useAccount();
  const accountId = selectedAccount?.id ?? null;
  const [trades, setTrades] = useState<SimulatedTrade[]>(() => (accountId ? tradesCache[accountId] ?? [] : []));
  const [isLoading, setIsLoading] = useState(() => !(accountId && tradesCache[accountId]));

  useEffect(() => {
    if (!accountId) return;
    if (tradesCache[accountId]) {
      setTrades(tradesCache[accountId]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    let cancelled = false;
    fetchTradeHistory(accountId, 200)
      .then((data) => {
        if (!cancelled) {
          tradesCache[accountId] = data;
          setTrades(data);
        }
      })
      .catch(() => {
        if (!cancelled && !tradesCache[accountId]) setTrades([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (!selectedAccount) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No trading account selected yet.</p>
      </Card>
    );
  }

  const currency = selectedAccount.currency;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text-secondary">Trade History</h3>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : trades.length === 0 ? (
          <p className="text-sm text-text-muted">No trades recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-text-muted">
                  <th className="py-2 pr-4 font-medium">Pair</th>
                  <th className="py-2 pr-4 font-medium">Direction</th>
                  <th className="py-2 pr-4 font-medium">Profit/Loss</th>
                  <th className="py-2 pr-4 font-medium">Duration</th>
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => {
                  const pnl = Number(trade.profitLoss);
                  const isWin = pnl >= 0;
                  return (
                    <tr key={trade.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 text-text-primary">{trade.market}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1",
                            trade.direction === "BUY" ? "text-green-400" : "text-rose-400"
                          )}
                        >
                          {trade.direction === "BUY" ? (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          )}
                          {trade.direction}
                        </span>
                      </td>
                      <td className={clsx("py-3 pr-4 font-medium", isWin ? "text-green-400" : "text-rose-400")}>
                        {trade.status === "CLOSED" ? `${isWin ? "+" : ""}${formatCurrency(pnl, currency)}` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">{trade.durationSeconds}s</td>
                      <td className="py-3 pr-4 text-text-secondary">
                        {new Date(trade.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <TradeStatusBadge status={trade.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
