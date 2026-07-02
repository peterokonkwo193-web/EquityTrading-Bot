"use client";

import { useState } from "react";
import { Play, Pause, Square } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StopBotConfirmModal } from "@/components/modals/StopBotConfirmModal";
import { useToast } from "@/components/toast/ToastProvider";
import { startBot, pauseBot, stopBot } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";
import { TradingBot } from "@/types";

type Action = "start" | "pause" | "stop" | null;

interface BotControlsProps {
  accountId: string;
  bot: TradingBot;
  onBotUpdate: (bot: TradingBot) => void;
}

export function BotControls({ accountId, bot, onBotUpdate }: BotControlsProps) {
  const toast = useToast();
  const [loadingAction, setLoadingAction] = useState<Action>(null);
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);

  const runAction = async (action: Action, fn: () => Promise<TradingBot>, successMessage: string) => {
    setLoadingAction(action);
    try {
      const updated = await fn();
      onBotUpdate(updated);
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStop = async () => {
    setLoadingAction("stop");
    try {
      const updated = await stopBot(accountId);
      onBotUpdate(updated);
      toast.success("Bot stopped");
      setIsStopModalOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to stop bot.");
    } finally {
      setLoadingAction(null);
    }
  };

  const canStart = bot.status === "STOPPED" || bot.status === "PAUSED" || bot.status === "ERROR";
  const canPause = bot.status === "RUNNING";
  const canStop = bot.status === "RUNNING" || bot.status === "PAUSED";
  const startLabel = bot.status === "PAUSED" ? "Resume" : "Start";

  return (
    <Card>
      <h3 className="mb-4 text-sm font-semibold text-text-secondary">Bot controls</h3>
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => runAction("start", () => startBot(accountId), `Bot ${startLabel.toLowerCase()}ed`)}
          isLoading={loadingAction === "start"}
          disabled={!canStart || loadingAction !== null}
        >
          <Play className="h-4 w-4" />
          {startLabel}
        </Button>
        <Button
          variant="secondary"
          onClick={() => runAction("pause", () => pauseBot(accountId), "Bot paused")}
          isLoading={loadingAction === "pause"}
          disabled={!canPause || loadingAction !== null}
        >
          <Pause className="h-4 w-4" />
          Pause
        </Button>
        <Button
          variant="danger"
          onClick={() => setIsStopModalOpen(true)}
          disabled={!canStop || loadingAction !== null}
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      </div>

      <StopBotConfirmModal
        isOpen={isStopModalOpen}
        onClose={() => setIsStopModalOpen(false)}
        onConfirm={handleStop}
        isLoading={loadingAction === "stop"}
      />
    </Card>
  );
}
