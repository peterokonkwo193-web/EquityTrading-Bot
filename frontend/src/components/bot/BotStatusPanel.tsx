"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { TradingBot } from "@/types";
import { Account } from "@/types";

export function BotStatusPanel({ account, bot }: { account: Account; bot: TradingBot }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary">Trading on</p>
          <p className="text-lg font-semibold text-text-primary">{account.name}</p>
          <p className="text-sm text-text-muted">{account.accountNumber}</p>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={bot.status}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            <StatusBadge status={bot.status} />
          </motion.div>
        </AnimatePresence>
      </div>

      {bot.status === "ERROR" && bot.errorMessage && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-muted/40 p-3 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {bot.errorMessage}
        </div>
      )}
    </Card>
  );
}
