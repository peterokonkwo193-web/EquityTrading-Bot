import { z } from "zod";

export const createWithdrawalSchema = z.object({
  amount: z.coerce.number().positive().min(10, "Minimum withdrawal is $10"),
  destination: z.string().min(4, "Enter a valid destination (bank/wallet)"),
});

export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;
