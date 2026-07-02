import { DollarSign, TrendingUp, Activity, Percent } from "lucide-react";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { TradingBot } from "@/types";

export function BotStats({ bot }: { bot: TradingBot }) {
  const totalPnl = Number(bot.totalPnl);
  const todayPnl = Number(bot.todayPnl);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryCard
        icon={DollarSign}
        label="Total P&L"
        value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`}
        accent={totalPnl >= 0 ? "primary" : "danger"}
      />
      <SummaryCard
        icon={TrendingUp}
        label="Today's P&L"
        value={`${todayPnl >= 0 ? "+" : ""}$${todayPnl.toFixed(2)}`}
        accent={todayPnl >= 0 ? "primary" : "danger"}
      />
      <SummaryCard icon={Activity} label="Trades" value={String(bot.tradesCount)} accent="neutral" />
      <SummaryCard icon={Percent} label="Win rate" value={`${Number(bot.winRate).toFixed(1)}%`} accent="neutral" />
    </div>
  );
}
