import { z } from "zod";

export const createDepositSchema = z.object({
  amount: z.coerce.number().positive().min(10, "Minimum deposit is $10"),
  currency: z.enum(["USD", "EUR", "USDT"]),
  method: z.string().min(1, "Select a payment method").default("bank_transfer"),
});

export type CreateDepositInput = z.infer<typeof createDepositSchema>;
