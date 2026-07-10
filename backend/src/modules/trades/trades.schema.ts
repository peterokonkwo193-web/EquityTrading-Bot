import { z } from "zod";
import { ALL_MARKETS, MIN_TRADE_AMOUNT } from "./trades.constants";

export const startTradeSchema = z.object({
  market: z.enum(ALL_MARKETS as [string, ...string[]], { message: "Select a valid market" }),
  assetClass: z.enum(["CRYPTO", "FOREX"]),
  amount: z.coerce
    .number()
    .positive()
    .min(MIN_TRADE_AMOUNT, `Minimum simulated trade amount is $${MIN_TRADE_AMOUNT}`),
});

export type StartTradeInput = z.infer<typeof startTradeSchema>;

/** Used by the bot simulator to settle a completed local trade cycle */
export const settleBotTradeSchema = z.object({
  profitLoss: z.number(),
  note: z.string().max(200).optional(),
  market: z.string().min(1),
  assetClass: z.enum(["CRYPTO", "FOREX"]),
  direction: z.enum(["BUY", "SELL"]),
  amount: z.number().positive(),
  entryPrice: z.number().optional(),
  exitPrice: z.number().optional(),
  durationSeconds: z.number().int().positive().optional(),
});

export type SettleBotTradeInput = z.infer<typeof settleBotTradeSchema>;
