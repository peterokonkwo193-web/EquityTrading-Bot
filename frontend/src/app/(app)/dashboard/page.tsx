"use client";

import { TrendingUp, DollarSign, Activity, Bot as BotIcon } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAccount } from "@/context/AccountContext";
import { useBotPolling } from "@/hooks/useBotPolling";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { AccountOverview } from "@/components/dashboard/AccountOverview";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/ui/Badge";

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedAccount, isLoading: isAccountLoading } = useAccount();
  const { bot, isLoading: isBotLoading } = useBotPolling(selectedAccount?.id ?? null);

  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">Welcome back, {firstName}</h2>
        <p className="text-sm text-text-secondary">Here&apos;s what&apos;s happening with your trading account today.</p>
      </div>

      {isAccountLoading ? <Skeleton className="h-24 w-full" /> : <AccountOverview />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isBotLoading || !bot ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : (
          <>
            <SummaryCard
              icon={DollarSign}
              label="Total P&L"
              value={`${Number(bot.totalPnl) >= 0 ? "+" : ""}$${Number(bot.totalPnl).toFixed(2)}`}
              accent={Number(bot.totalPnl) >= 0 ? "primary" : "danger"}
            />
            <SummaryCard
              icon={TrendingUp}
              label="Today's P&L"
              value={`${Number(bot.todayPnl) >= 0 ? "+" : ""}$${Number(bot.todayPnl).toFixed(2)}`}
              accent={Number(bot.todayPnl) >= 0 ? "primary" : "danger"}
            />
            <SummaryCard icon={Activity} label="Trades" value={String(bot.tradesCount)} accent="neutral" />
            <div className="flex flex-col justify-center gap-2 rounded-2xl border border-card-border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 text-text-secondary">
                <BotIcon className="h-4 w-4" />
                <span className="text-sm">Bot status</span>
              </div>
              <StatusBadge status={bot.status} />
            </div>
          </>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-text-secondary">Quick actions</h3>
        <QuickActions />
      </div>
    </div>
  );
}
