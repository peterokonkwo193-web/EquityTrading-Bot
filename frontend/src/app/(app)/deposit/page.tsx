"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ArrowDownToLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/components/toast/ToastProvider";
import { depositSchema, DepositFormInput, DepositFormOutput } from "@/lib/validators/deposit";
import { createDeposit, fetchDeposits } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";
import { Deposit } from "@/types";

const CURRENCIES = ["USD", "EUR", "USDT"] as const;
const METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "credit_card", label: "Credit card" },
  { value: "crypto_wallet", label: "Crypto wallet" },
];

export default function DepositPage() {
  const { selectedAccount, refreshAccounts } = useAccount();
  const toast = useToast();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<Deposit | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<DepositFormInput, unknown, DepositFormOutput>({
    resolver: zodResolver(depositSchema),
    mode: "onChange",
    defaultValues: { currency: "USD", method: "bank_transfer" },
  });

  useEffect(() => {
    if (!selectedAccount) return;
    setIsHistoryLoading(true);
    fetchDeposits(selectedAccount.id)
      .then(setDeposits)
      .catch(() => setDeposits([]))
      .finally(() => setIsHistoryLoading(false));
  }, [selectedAccount]);

  if (!selectedAccount) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">Select a trading account to make a deposit.</p>
      </Card>
    );
  }

  const onSubmit = async (values: DepositFormOutput) => {
    try {
      const deposit = await createDeposit(selectedAccount.id, values);
      setDeposits((prev) => [deposit, ...prev]);
      setConfirmation(deposit);
      reset({ amount: undefined, currency: values.currency, method: values.method });
      toast.success("Deposit submitted successfully");
      refreshAccounts();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Deposit failed. Please try again.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-1 text-lg font-semibold text-text-primary">Deposit funds</h2>
        <p className="mb-6 text-sm text-text-secondary">Add funds to {selectedAccount.name}.</p>

        {confirmation && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-muted/40 p-3 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            Deposit of ${Number(confirmation.amount).toFixed(2)} confirmed.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            placeholder="100.00"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Currency</label>
            <select
              className="rounded-xl border border-card-border bg-background-elevated px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              {...register("currency")}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.currency?.message && <p className="text-sm text-danger">{errors.currency.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Payment method</label>
            <select
              className="rounded-xl border border-card-border bg-background-elevated px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              {...register("method")}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex gap-3">
            <Button type="submit" isLoading={isSubmitting} disabled={!isValid}>
              <ArrowDownToLine className="h-4 w-4" />
              Deposit
            </Button>
            <Button type="button" variant="secondary" onClick={() => reset()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text-secondary">Deposit history</h3>
        {isHistoryLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : deposits.length === 0 ? (
          <p className="text-sm text-text-muted">No deposits yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-card-border">
            {deposits.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="text-text-primary">
                    ${Number(d.amount).toFixed(2)} {d.currency}
                  </p>
                  <p className="text-xs text-text-muted">{new Date(d.createdAt).toLocaleString()}</p>
                </div>
                <span className="text-primary">{d.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
