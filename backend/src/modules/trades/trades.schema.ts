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
