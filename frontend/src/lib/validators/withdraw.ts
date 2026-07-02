import { z } from "zod";

export function buildWithdrawSchema(availableBalance: number) {
  return z.object({
    amount: z.coerce
      .number({ message: "Enter a valid amount" })
      .positive("Amount must be greater than 0")
      .min(10, "Minimum withdrawal is $10")
      .max(availableBalance, `Amount cannot exceed your available balance of $${availableBalance.toFixed(2)}`),
    destination: z.string().min(4, "Enter a valid destination (bank account or wallet address)"),
  });
}

export type WithdrawFormInput = z.input<ReturnType<typeof buildWithdrawSchema>>;
export type WithdrawFormOutput = z.output<ReturnType<typeof buildWithdrawSchema>>;
