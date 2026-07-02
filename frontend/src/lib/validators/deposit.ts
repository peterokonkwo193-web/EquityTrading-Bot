import { z } from "zod";

export const depositSchema = z.object({
  amount: z.coerce.number({ message: "Enter a valid amount" }).positive("Amount must be greater than 0").min(10, "Minimum deposit is $10"),
  currency: z.enum(["USD", "EUR", "USDT"], { message: "Select a currency" }),
  method: z.string().min(1, "Select a payment method"),
});

export type DepositFormInput = z.input<typeof depositSchema>;
export type DepositFormOutput = z.output<typeof depositSchema>;
