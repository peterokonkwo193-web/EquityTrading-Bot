"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TradeStatusBadge } from "@/components/ui/Badge";
import { useAccount } from "@/context/AccountContext";
import { fetchTradeHistory } from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";
import { buildPerformanceBuckets, PerformanceGrouping } from "@/lib/performance";
import { BarPerformanceChart } from "@/components/charts/BarPerformanceChart";
import { WinLossPieChart } from "@/components/charts/WinLossPieChart";
import { SimulatedTrade } from "@/types";

const GROUPINGS: { value: PerformanceGrouping; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function HistoryPage() {
  const { selectedAccount } = useAccount();
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [grouping, setGrouping] = useState<PerformanceGrouping>("daily");

  const accountId = selectedAccount?.id ?? null;

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setIsLoading(true);
    fetchTradeHistory(accountId, 200)
      .then((data) => {
        if (!cancelled) setTrades(data);
      })
      .catch(() => {
        if (!cancelled) setTrades([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const closedTrades = useMemo(() => trades.filter((t) => t.status === "CLOSED"), [trades]);
  const wins = useMemo(() => closedTrades.filter((t) => Number(t.profitLoss) >= 0).length, [closedTrades]);
  const losses = closedTrades.length - wins;
  const performanceBuckets = useMemo(() => buildPerformanceBuckets(trades, grouping), [trades, grouping]);

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-secondary">Performance</h3>
            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
              {GROUPINGS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGrouping(g.value)}
                  className={clsx(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    grouping === g.value ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : performanceBuckets.length === 0 ? (
            <p className="py-16 text-center text-sm text-text-muted">No closed trades yet.</p>
          ) : (
            <BarPerformanceChart data={performanceBuckets} />
          )}
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-text-secondary">Win / Loss</h3>
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : closedTrades.length === 0 ? (
            <p className="py-16 text-center text-sm text-text-muted">No closed trades yet.</p>
          ) : (
            <WinLossPieChart wins={wins} losses={losses} />
          )}
        </Card>
      </div>

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
                            trade.direction === "BUY" ? "text-primary" : "text-danger"
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
                      <td className={clsx("py-3 pr-4 font-medium", isWin ? "text-gold" : "text-danger")}>
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
