import { z } from "zod";

export const addFundsSchema = z.object({
  amount: z.coerce.number().positive().min(1, "Enter an amount greater than 0"),
  currency: z.enum(["USD", "GBP", "EUR"]),
});

export type AddFundsInput = z.infer<typeof addFundsSchema>;

export const depositRequestSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  asset: z.string().min(1, "Asset is required"),
  network: z.string().min(1, "Network is required"),
  paymentProof: z.string().optional(),
});

export type DepositRequestInput = z.infer<typeof depositRequestSchema>;

export const withdrawalRequestSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  asset: z.string().min(1, "Asset is required"),
  network: z.string().min(1, "Network is required"),
  destinationAddress: z.string().min(8, "Destination address must be at least 8 characters long"),
});

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;

export const subscriptionRequestSchema = z.object({
  asset: z.string().min(1, "Asset is required"),
  network: z.string().min(1, "Network is required"),
  paymentProof: z.string().optional(),
});

export type SubscriptionRequestInput = z.infer<typeof subscriptionRequestSchema>;


