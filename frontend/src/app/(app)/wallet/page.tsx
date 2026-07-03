"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wallet as WalletIcon, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { useAccount } from "@/context/AccountContext";
import { fetchWallet, addVirtualFunds } from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";
import { addFundsSchema, AddFundsFormInput, AddFundsFormOutput } from "@/lib/validators/wallet";
import { ApiError } from "@/lib/apiClient";
import { Wallet } from "@/types";
import { LineAreaChart, LineAreaChartPoint } from "@/components/charts/LineAreaChart";

const CURRENCIES = ["USD", "GBP", "EUR"] as const;

export default function WalletPage() {
  const { selectedAccount, refreshAccounts } = useAccount();
  const status = useStatus();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<AddFundsFormInput, unknown, AddFundsFormOutput>({
    resolver: zodResolver(addFundsSchema),
    mode: "onChange",
    defaultValues: { currency: (selectedAccount?.currency as "USD" | "GBP" | "EUR") ?? "USD" },
  });

  const accountId = selectedAccount?.id ?? null;

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setIsLoading(true);
    fetchWallet(accountId)
      .then((data) => {
        if (!cancelled) setWallet(data);
      })
      .catch(() => {
        if (!cancelled) setWallet(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (!selectedAccount) {
    return (
      <Card>
        <p className="text-sm text-text-secondary">No trading account selected yet.</p>
      </Card>
    );
  }

  const balanceSeries: LineAreaChartPoint[] = (() => {
    if (!wallet) return [];
    const sorted = [...wallet.fundingHistory].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let running = 0;
    return sorted.map((entry, i) => {
      running += Number(entry.amount);
      return { label: `#${i + 1}`, value: Math.round(running * 100) / 100 };
    });
  })();

  const onSubmit = async (values: AddFundsFormOutput) => {
    status.clear();
    try {
      await addVirtualFunds(selectedAccount.id, values);
      const fresh = await fetchWallet(selectedAccount.id);
      setWallet(fresh);
      status.success(`Added ${formatCurrency(values.amount, values.currency)} in virtual funds.`);
      reset({ currency: values.currency });
      refreshAccounts();
    } catch (err) {
      status.error(err instanceof ApiError ? err.message : "Failed to add virtual funds.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-muted text-gold">
          <WalletIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-text-secondary">Available balance</p>
          {isLoading || !wallet ? (
            <Skeleton className="mt-1 h-7 w-32" />
          ) : (
            <p className="text-2xl font-semibold text-text-primary">
              {formatCurrency(wallet.balance, wallet.currency)}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-text-secondary">Balance Chart</h3>
        {isLoading ? (
          <Skeleton className="h-60 w-full" />
        ) : balanceSeries.length === 0 ? (
          <p className="py-16 text-center text-sm text-text-muted">Add virtual funds to see your balance grow.</p>
        ) : (
          <LineAreaChart data={balanceSeries} color="blue" valuePrefix={selectedAccount.currency === "USD" ? "$" : ""} />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-lg font-semibold text-text-primary">Add virtual funds</h2>
          <p className="mb-6 text-sm text-text-secondary">
            Instantly credits your simulated practice balance — no real payment is collected.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <Input
              label="Amount"
              type="number"
              step="0.01"
              placeholder="1000"
              error={errors.amount?.message}
              {...register("amount")}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Currency</label>
              <select
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                {...register("currency")}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <StatusBanner status={status.status} />

            <Button
              type="submit"
              variant="gold"
              className="w-fit"
              isLoading={isSubmitting}
              disabled={!isValid || isLoading}
            >
              <PlusCircle className="h-4 w-4" />
              Add virtual funds
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-semibold text-text-secondary">Funding history</h3>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !wallet || wallet.fundingHistory.length === 0 ? (
            <p className="text-sm text-text-muted">No virtual funds added yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/10">
              {wallet.fundingHistory.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="text-text-primary">{formatCurrency(entry.amount, entry.currency)}</p>
                    <p className="text-xs text-text-muted">{new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="text-gold">{entry.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
