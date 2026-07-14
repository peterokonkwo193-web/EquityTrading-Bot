"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, Activity, Target, CheckCircle2, XCircle, ShieldCheck, Lock, BadgeCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useTradingStats } from "@/hooks/useTradingStats";
import { fetchWallet, fetchTicker } from "@/lib/endpoints";
import { Wallet as WalletType } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { PriceTicker } from "@/components/dashboard/PriceTicker";
import { LiveMarketChart } from "@/components/dashboard/LiveMarketChart";
import { Testimonials } from "@/components/dashboard/Testimonials";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedAccount, isLoading: isAccountLoading } = useAccount();
  const accountId = selectedAccount?.id ?? null;
  const { stats, isLoading: isStatsLoading } = useTradingStats(accountId);
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [sentiment, setSentiment] = useState<{ label: "Bullish" | "Bearish"; confidence: number } | null>(null);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    const load = () => {
      fetchWallet(accountId)
        .then((data) => {
          if (!cancelled) setWallet(data);
        })
        .catch(() => {});
    };
    load();
    // Poll so admin-approved deposits/withdrawals reflect here without a manual refresh.
    const interval = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
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

      {/* Live Market Chart */}
      <LiveMarketChart />

      {/* Testimonials */}
      <Testimonials />

      {/* Funds Protection */}
      <Card>
        <h3 className="text-center text-sm font-bold tracking-widest text-text-secondary uppercase">
          Your Funds Are Protected
        </h3>
        <div className="mt-5 flex flex-col gap-4">
          {PROTECTION_BADGES.map((badge) => (
            <div
              key={badge.title}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted text-primary">
                <badge.icon className="h-6 w-6" />
              </div>
              <p className="text-lg font-bold text-text-primary">{badge.title}</p>
              <p className="text-sm text-text-secondary">{badge.subtitle}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const PROTECTION_BADGES = [
  { icon: ShieldCheck, title: "Bank-grade", subtitle: "256-bit SSL" },
  { icon: Lock, title: "Cold storage", subtitle: "98% offline" },
  { icon: BadgeCheck, title: "Audited", subtitle: "Q4 2025" },
];
