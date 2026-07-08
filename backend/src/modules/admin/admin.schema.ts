import { z } from "zod";

export const reviewTransactionSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  amount: z.coerce.number().positive().optional(),
});

export type ReviewTransactionInput = z.infer<typeof reviewTransactionSchema>;

export const adjustBalanceSchema = z.object({
  amount: z.coerce.number().refine((v) => v !== 0, "Amount cannot be zero"),
  note: z.string().max(280).optional(),
});

export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;
