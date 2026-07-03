import { z } from "zod";

export const addFundsSchema = z.object({
  amount: z.coerce.number({ message: "Enter a valid amount" }).positive("Amount must be greater than 0"),
  currency: z.enum(["USD", "GBP", "EUR"], { message: "Select a currency" }),
});

export type AddFundsFormInput = z.input<typeof addFundsSchema>;
export type AddFundsFormOutput = z.output<typeof addFundsSchema>;
