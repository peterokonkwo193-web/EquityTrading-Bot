"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Rocket, Info, DollarSign, TrendingUp, Percent, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { useAccount } from "@/context/AccountContext";
import { useActiveTrade } from "@/hooks/useActiveTrade";
import { useTradingStats } from "@/hooks/useTradingStats";
import { MarketPicker } from "@/components/bot/MarketPicker";
import { StagingSequence } from "@/components/bot/StagingSequence";
import { ActiveTradeCard } from "@/components/bot/ActiveTradeCard";
import { AssetClassTab, CRYPTO_MARKETS } from "@/components/bot/markets";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { startTradeSchema, StartTradeFormInput, StartTradeFormOutput } from "@/lib/validators/trade";
import { startTrade } from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";
import { ApiError } from "@/lib/apiClient";
import { SimulatedTrade } from "@/types";

export default function TradingBotPage() {
  const { selectedAccount, isLoading: isAccountLoading } = useAccount();
  const accountId = selectedAccount?.id ?? null;
  const { trade, isLoading: isTradeLoading } = useActiveTrade(accountId);
  const { stats, isLoading: isStatsLoading } = useTradingStats(accountId);
  const status = useStatus();

  const [assetClass, setAssetClass] = useState<AssetClassTab>("CRYPTO");
  const [market, setMarket] = useState<string>(CRYPTO_MARKETS[0]);
  const [isStaging, setIsStaging] = useState(false);
  const [displayTrade, setDisplayTrade] = useState<SimulatedTrade | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<StartTradeFormInput, unknown, StartTradeFormOutput>({
    resolver: zodResolver(startTradeSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (trade) setDisplayTrade(trade);
  }, [trade]);

  if (isAccountLoading || isTradeLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!selectedAccount || !accountId) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No trading account selected yet.</p>
      </Card>
    );
  }

  const currency = selectedAccount.currency;

  const onSubmit = async (values: StartTradeFormOutput) => {
    status.clear();
    setIsStaging(true);

    startTrade(accountId, { market, assetClass, amount: values.amount }).catch((err) => {
      setIsStaging(false);
      status.error(err instanceof ApiError ? err.message : "Failed to start simulated trade.");
    });
  };

  const balanceNum = Number(selectedAccount.balance);
  const performancePct = stats && balanceNum > 0 ? (Number(stats.totalPnl) / balanceNum) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-start gap-3 border-gold/20 bg-gold-muted/10">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
        <p className="text-sm text-text-secondary">
          <span className="font-medium text-gold">Simulated trading only.</span> This simulator uses a low-risk
          strategy for demonstration purposes. No real broker, exchange, or market order is ever placed.
        </p>
      </Card>

      {isStaging ? (
        <Card>
          <StagingSequence onComplete={() => setIsStaging(false)} />
        </Card>
      ) : displayTrade ? (
        <div className="flex flex-col gap-4">
          <ActiveTradeCard trade={displayTrade} currency={currency} />
          {displayTrade.status === "CLOSED" && (
            <Button variant="secondary" className="w-fit" onClick={() => setDisplayTrade(null)}>
              Start new simulation
            </Button>
          )}
        </div>
      ) : (
        <Card>
          <h2 className="mb-1 text-lg font-semibold text-text-primary">Bot Trading Engine</h2>
          <p className="mb-6 text-sm text-text-secondary">Select the market you want the simulator to trade.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
            <MarketPicker
              assetClass={assetClass}
              market={market}
              onAssetClassChange={setAssetClass}
              onMarketChange={setMarket}
            />

            <Input
              label={`Simulated trading amount (min ${formatCurrency(100, currency)})`}
              type="number"
              step="0.01"
              placeholder="100"
              error={errors.amount?.message}
              {...register("amount")}
            />

            <StatusBanner status={status.status} />

            <Button type="submit" variant="gold" className="w-fit" disabled={!isValid}>
              <Rocket className="h-4 w-4" />
              Start Simulation
            </Button>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isStatsLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : (
          <>
            <SummaryCard
              icon={DollarSign}
              label="Session Profit"
              value={formatCurrency(stats.todayPnl, currency)}
              accent={Number(stats.todayPnl) >= 0 ? "gold" : "danger"}
            />
            <SummaryCard icon={Activity} label="Total Trades" value={String(stats.tradesCount)} accent="blue" />
            <SummaryCard icon={Percent} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} accent="blue" />
            <SummaryCard
              icon={TrendingUp}
              label="Performance %"
              value={`${performancePct.toFixed(2)}%`}
              accent={performancePct >= 0 ? "gold" : "danger"}
            />
          </>
        )}
      </div>
    </div>
  );
}
