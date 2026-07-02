"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/context/AccountContext";
import { useBotPolling } from "@/hooks/useBotPolling";
import { fetchBotActivity } from "@/lib/endpoints";
import { BotActivity } from "@/types";
import { BotStatusPanel } from "@/components/bot/BotStatusPanel";
import { BotControls } from "@/components/bot/BotControls";
import { BotStats } from "@/components/bot/BotStats";
import { ActivityFeed } from "@/components/bot/ActivityFeed";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

const ACTIVITY_POLL_MS = 4000;

export default function BotTradingPage() {
  const { selectedAccount, isLoading: isAccountLoading } = useAccount();
  const accountId = selectedAccount?.id ?? null;
  const { bot, isLoading: isBotLoading, setBot } = useBotPolling(accountId);
  const [activity, setActivity] = useState<BotActivity[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      setActivity([]);
      setIsActivityLoading(false);
      return;
    }

    let cancelled = false;
    setIsActivityLoading(true);

    const poll = async () => {
      try {
        const data = await fetchBotActivity(accountId);
        if (!cancelled) setActivity(data);
      } catch {
        // keep last known activity on transient failures
      } finally {
        if (!cancelled) setIsActivityLoading(false);
      }
    };

    poll();
    const interval = setInterval(poll, ACTIVITY_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [accountId]);

  if (isAccountLoading || isBotLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!selectedAccount || !bot) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No trading account selected yet.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BotStatusPanel account={selectedAccount} bot={bot} />
      <BotControls accountId={selectedAccount.id} bot={bot} onBotUpdate={setBot} />
      <BotStats bot={bot} />
      <ActivityFeed activity={activity} isLoading={isActivityLoading} />
    </div>
  );
}
