"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Activity, Target, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useTradingStats } from "@/hooks/useTradingStats";
import { fetchTradeHistory, fetchWallet, fetchTicker } from "@/lib/endpoints";
import { SimulatedTrade, Wallet as WalletType } from "@/types";
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
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [sentiment, setSentiment] = useState<{ label: "Bullish" | "Bearish"; confidence: number } | null>(null);

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

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    fetchWallet(accountId)
      .then((data) => {
        if (!cancelled) setWallet(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId, stats?.tradesCount]);

  useEffect(() => {
    let cancelled = false;
    fetchTicker()
      .then((entries) => {
        if (cancelled || entries.length === 0) return;
        const avgChange = entries.reduce((sum, e) => sum + e.changePct, 0) / entries.length;
        const confidence = Math.min(95, Math.max(50, 50 + Math.abs(avgChange) * 15));
        setSentiment({ label: avgChange >= 0 ? "Bullish" : "Bearish", confidence });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = user?.name.split(" ")[0] ?? "there";
  const currency = selectedAccount?.currency ?? "USD";
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const balance = selectedAccount ? Number(selectedAccount.balance) : 0;
  const isLimitUnlimited = wallet?.accountLimit === null;
  const accountLimit = wallet && wallet.accountLimit !== null ? Number(wallet.accountLimit) : 0;
  const limitProgress = isLimitUnlimited ? 100 : accountLimit > 0 ? Math.min(100, (balance / accountLimit) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="text-2xl font-semibold text-text-primary">
          {timeGreeting}, {firstName} 👋
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Welcome back to your premium trading dashboard.
        </p>
      </Card>

      <PriceTicker />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {isAccountLoading || isStatsLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : (
          <>
            <SummaryCard icon={Wallet} label="Current Balance" value={formatCurrency(balance, currency)} accent="gold" />
            <SummaryCard
              icon={TrendingUp}
              label="Today's Profit"
              value={`${Number(stats.todayPnl) >= 0 ? "+" : ""}${formatCurrency(stats.todayPnl, currency)}`}
              accent={Number(stats.todayPnl) >= 0 ? "success" : "danger"}
            />
            <SummaryCard
              icon={Activity}
              label="Total Profit"
              value={`${Number(stats.totalPnl) >= 0 ? "+" : ""}${formatCurrency(stats.totalPnl, currency)}`}
              accent={Number(stats.totalPnl) >= 0 ? "success" : "danger"}
            />
            <SummaryCard icon={Target} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} accent="blue" />
          </>
        )}
      </div>

      {/* Account Limit */}
      {wallet && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-text-secondary">Account Limit</span>
            <span className="font-semibold text-text-primary font-mono">
              {formatCurrency(balance, currency)} / {isLimitUnlimited ? "Unlimited" : formatCurrency(accountLimit, currency)}
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isLimitUnlimited ? "bg-green-400" : "bg-primary"}`}
              style={{ width: `${limitProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {isLimitUnlimited
              ? "Unlimited trading unlocked — no deposit cap applies."
              : "Bot stops when balance reaches the limit."}
          </p>
        </Card>
      )}

      {/* Market Sentiment */}
      {sentiment && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-text-secondary">Market Sentiment</span>
            <span className={`font-semibold ${sentiment.label === "Bullish" ? "text-green-400" : "text-rose-400"}`}>
              {sentiment.label} {sentiment.confidence.toFixed(0)}%
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden bg-gradient-to-r from-rose-500 via-white/10 to-green-500" />
          <p className="mt-2 text-xs text-text-muted">Signal strength across tracked markets.</p>
        </Card>
      )}

      {isStatsLoading || !stats ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <Card className="flex flex-wrap items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary bg-primary-muted">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-sm text-text-secondary truncate">Total Trades</p>
              <p className="text-lg font-semibold text-text-primary">{stats.tradesCount}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                <CheckCircle2 className="h-3 w-3" />
                W {stats.winCount}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                <XCircle className="h-3 w-3" />
                L {stats.tradesCount - stats.winCount}
              </span>
            </div>
          </div>
        </Card>
      )}

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
