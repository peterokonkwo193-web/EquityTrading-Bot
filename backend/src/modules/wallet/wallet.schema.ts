import { z } from "zod";

export const addFundsSchema = z.object({
  amount: z.coerce.number().positive().min(1, "Enter an amount greater than 0"),
  currency: z.enum(["USD", "GBP", "EUR"]),
});

export type AddFundsInput = z.infer<typeof addFundsSchema>;
