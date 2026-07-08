import { z } from "zod";

export const startTradeSchema = z.object({
  amount: z.coerce
    .number({ message: "Enter a valid amount" })
    .positive()
    .min(100, "Minimum trade amount is $100"),
});

export type StartTradeFormInput = z.input<typeof startTradeSchema>;
export type StartTradeFormOutput = z.output<typeof startTradeSchema>;
