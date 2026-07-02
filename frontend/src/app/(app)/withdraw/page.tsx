"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ArrowUpFromLine } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAccount } from "@/context/AccountContext";
import { useToast } from "@/components/toast/ToastProvider";
import { buildWithdrawSchema, WithdrawFormInput, WithdrawFormOutput } from "@/lib/validators/withdraw";
import { createWithdrawal, fetchWithdrawals } from "@/lib/endpoints";
import { ApiError } from "@/lib/apiClient";
import { Withdrawal } from "@/types";

export default function WithdrawPage() {
  const { selectedAccount, refreshAccounts } = useAccount();
  const toast = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [confirmation, setConfirmation] = useState<Withdrawal | null>(null);

  const availableBalance = Number(selectedAccount?.balance ?? 0);
  const schema = useMemo(() => buildWithdrawSchema(availableBalance), [availableBalance]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<WithdrawFormInput, unknown, WithdrawFormOutput>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  useEffect(() => {
    if (!selectedAccount) return;
    setIsHistoryLoading(true);
    fetchWithdrawals(selectedAccount.id)
      .then(setWithdrawals)
      .catch(() => setWithdrawals([]))
      .finally(() => setIsHistoryLoading(false));
  }, [selectedAccount]);

  if (!selectedAccount) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">Select a trading account to withdraw funds.</p>
      </Card>
    );
  }

  const onSubmit = async (values: WithdrawFormOutput) => {
    try {
      const withdrawal = await createWithdrawal(selectedAccount.id, values);
      setWithdrawals((prev) => [withdrawal, ...prev]);
      setConfirmation(withdrawal);
      reset();
      toast.success("Withdrawal submitted successfully");
      refreshAccounts();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Withdrawal failed. Please try again.";
      toast.error(message);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="mb-1 text-lg font-semibold text-text-primary">Withdraw funds</h2>
        <p className="mb-6 text-sm text-text-secondary">
          Available balance: ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>

        {confirmation && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-muted/40 p-3 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            Withdrawal of ${Number(confirmation.amount).toFixed(2)} confirmed.
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
          <Input
            label="Destination"
            type="text"
            placeholder="Bank account or wallet address"
            error={errors.destination?.message}
            {...register("destination")}
          />

          <div className="mt-2 flex gap-3">
            <Button type="submit" isLoading={isSubmitting} disabled={!isValid}>
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </Button>
            <Button type="button" variant="secondary" onClick={() => reset()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text-secondary">Withdrawal history</h3>
        {isHistoryLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : withdrawals.length === 0 ? (
          <p className="text-sm text-text-muted">No withdrawals yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-card-border">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="text-text-primary">${Number(w.amount).toFixed(2)}</p>
                  <p className="text-xs text-text-muted">{w.destination}</p>
                </div>
                <span className="text-primary">{w.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
