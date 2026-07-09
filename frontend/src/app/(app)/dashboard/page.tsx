"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Activity, Percent, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useTradingStats } from "@/hooks/useTradingStats";
import { fetchTradeHistory } from "@/lib/endpoints";
import { SimulatedTrade } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { PriceTicker } from "@/components/dashboard/PriceTicker";
import { LiveMarketChart } from "@/components/dashboard/LiveMarketChart";
import { Testimonials } from "@/components/dashboard/Testimonials";
import { LineAreaChart, LineAreaChartPoint } from "@/components/charts/LineAreaChart";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

function buildPerformanceSeries(trades: SimulatedTrade[]): LineAreaChartPoint[] {
  const closed = trades
    .filter((t) => t.status === "CLOSED" && t.closedAt)
    .sort((a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime());

  let running = 0;
  return closed.map((t, i) => {
    running += Number(t.profitLoss);
    return { label: `#${i + 1}`, value: Math.round(running * 100) / 100 };
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedAccount, isLoading: isAccountLoading } = useAccount();
  const accountId = selectedAccount?.id ?? null;
  const { stats, isLoading: isStatsLoading } = useTradingStats(accountId);
  const [performance, setPerformance] = useState<LineAreaChartPoint[]>([]);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    fetchTradeHistory(accountId)
      .then((trades) => {
        if (!cancelled) setPerformance(buildPerformanceSeries(trades));
      })
      .catch(() => {
        if (!cancelled) setPerformance([]);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, stats?.tradesCount]);

  const firstName = user?.name.split(" ")[0] ?? "there";
  const currency = selectedAccount?.currency ?? "USD";
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">{timeGreeting}, {firstName}</h2>
        <p className="text-sm text-text-secondary">
          Live trading dashboard — monitor markets and manage your trades.
        </p>
      </div>

      <PriceTicker />

      {isAccountLoading || !selectedAccount ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">Balance</p>
            <p className="text-2xl font-semibold text-text-primary">
              {formatCurrency(selectedAccount.balance, currency)}
            </p>
          </div>
          <p className="text-sm text-text-muted">{selectedAccount.name}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isStatsLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : (
          <>
            <SummaryCard
              icon={TrendingUp}
              label="Today's Profit"
              value={`${Number(stats.todayPnl) >= 0 ? "+" : ""}${formatCurrency(stats.todayPnl, currency)}`}
              accent={Number(stats.todayPnl) >= 0 ? "success" : "danger"}
            />
            <SummaryCard
              icon={DollarSign}
              label="Total Profit"
              value={`${Number(stats.totalPnl) >= 0 ? "+" : ""}${formatCurrency(stats.totalPnl, currency)}`}
              accent={Number(stats.totalPnl) >= 0 ? "success" : "danger"}
            />
            <SummaryCard icon={Activity} label="Total Trades" value={String(stats.tradesCount)} accent="blue" />
            <SummaryCard icon={Percent} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} accent="gold" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isStatsLoading || !stats ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : (
          <>
            <SummaryCard icon={Activity} label="Total Trades" value={String(stats.tradesCount)} accent="blue" />
            <SummaryCard icon={CheckCircle2} label="Wins" value={String(stats.winCount)} accent="success" />
            <SummaryCard
              icon={XCircle}
              label="Losses"
              value={String(stats.tradesCount - stats.winCount)}
              accent="danger"
            />
          </>
        )}
      </div>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text-secondary">Performance Chart</h3>
        {performance.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            No trades yet. Start a trade to see your performance curve.
          </p>
        ) : (
          <LineAreaChart data={performance} color="gold" valuePrefix={currency === "USD" ? "$" : ""} />
        )}
      </Card>

      {/* Live Market Chart */}
      <LiveMarketChart />

      {/* Testimonials */}
      <Testimonials />
    </div>
  );
}
