/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Copy,
  Check,
  Upload,
  Lock,
  Gift,
  ShieldCheck,
  Info
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CryptoIcon } from "@/components/ui/CryptoIcon";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { useAccount } from "@/context/AccountContext";
import { fetchWallet, requestDeposit, requestWithdrawal, requestSubscription } from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";
import { Wallet, WalletTransaction } from "@/types";

const MEMBERSHIP_FEE = 200;

const SUPPORTED_ASSETS = ["BTC", "USDT", "ETH", "TRON", "BNB", "USDC"] as const;

const NETWORK_MAPPING: Record<string, string[]> = {
  BTC: ["Bitcoin Native"],
  ETH: ["Ethereum (ERC20)"],
  TRON: ["Tron (TRC20)"],
  BNB: ["BSC (BEP20)"],
  USDT: ["Tron (TRC20)", "Ethereum (ERC20)", "BSC (BEP20)"],
  USDC: ["Ethereum (ERC20)", "BSC (BEP20)"],
};

const DEPOSIT_ADDRESSES: Record<string, string> = {
  "Bitcoin Native": "bc1qrhzw6dq240nt0r267j9r0alj9ecaqelmp9e7dn",
  "Ethereum (ERC20)": "0xeDfD84Ed03178bFCa081D89B7d98064cD28CDdeF",
  "Tron (TRC20)": "TACTvvULH7gaU5dfjCoFgztr48qk2PRG8Y",
  "BSC (BEP20)": "0xeDfD84Ed03178bFCa081D89B7d98064cD28CDdeF",
};

export default function WalletPage() {
  const { selectedAccount } = useAccount();
  const status = useStatus();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isMembershipGateOpen, setIsMembershipGateOpen] = useState(false);
  const [depositMode, setDepositMode] = useState<"deposit" | "subscription">("deposit");

  // Form State - Deposit
  const [depAmount, setDepAmount] = useState("");
  const [depAsset, setDepAsset] = useState<string>("USDT");
  const [depNetwork, setDepNetwork] = useState<string>("Tron (TRC20)");
  const [paymentProof, setPaymentProof] = useState<string>("");
  const [proofFileName, setProofFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      status.error("Screenshot file size is too large (max 2MB)");
      return;
    }

    setProofFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPaymentProof(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Form State - Withdrawal
  const [withAmount, setWithAmount] = useState("");
  const [withAsset, setWithAsset] = useState<string>("USDT");
  const [withNetwork, setWithNetwork] = useState<string>("Tron (TRC20)");
  const [destAddress, setDestAddress] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const accountId = selectedAccount?.id ?? null;

  // Auto-adjust networks on asset change
  useEffect(() => {
    const networks = NETWORK_MAPPING[depAsset] || [];
    if (networks.length > 0 && !networks.includes(depNetwork)) {
      setDepNetwork(networks[0]);
    }
  }, [depAsset, depNetwork]);

  useEffect(() => {
    const networks = NETWORK_MAPPING[withAsset] || [];
    if (networks.length > 0 && !networks.includes(withNetwork)) {
      setWithNetwork(networks[0]);
    }
  }, [withAsset, withNetwork]);

  const loadWallet = async () => {
    if (!accountId) return;
    try {
      const data = await fetchWallet(accountId);
      setWallet(data);
    } catch {
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!accountId) return;
    setIsLoading(true);
    loadWallet();

    // Poll so admin-approved deposits/withdrawals appear here without a manual refresh.
    const interval = setInterval(() => {
      fetchWallet(accountId)
        .then(setWallet)
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [accountId]);

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    status.clear();

    if (!paymentProof) {
      status.error("Please attach a screenshot of your payment proof");
      return;
    }

    if (depositMode === "subscription") {
      setIsSubmitting(true);
      try {
        await requestSubscription(accountId, {
          asset: depAsset,
          network: depNetwork,
          paymentProof,
        });
        setPaymentProof("");
        setProofFileName("");
        await loadWallet();
        setIsDepositOpen(false);
        status.success("Membership payment submitted. Awaiting admin review.");
      } catch (err) {
        status.error((err as any)?.message || "Failed to submit membership payment.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const amt = parseFloat(depAmount);
    if (isNaN(amt) || amt <= 0) {
      status.error("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestDeposit(accountId, {
        amount: amt,
        asset: depAsset,
        network: depNetwork,
        paymentProof,
      });
      setDepAmount("");
      setPaymentProof("");
      setProofFileName("");
      await loadWallet();
      setIsDepositOpen(false);
    } catch (err) {
      status.error((err as any)?.message || "Failed to submit deposit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateMembership = () => {
    setIsMembershipGateOpen(false);
    setDepositMode("subscription");
    setPaymentProof("");
    setProofFileName("");
    setIsDepositOpen(true);
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId) return;
    status.clear();

    const amt = parseFloat(withAmount);
    if (isNaN(amt) || amt <= 0) {
      status.error("Please enter a valid amount greater than 0");
      return;
    }
    if (destAddress.trim().length < 8) {
      status.error("Please enter a valid destination address (at least 8 chars)");
      return;
    }

    if (wallet && !wallet.membershipActive) {
      setIsWithdrawOpen(false);
      setIsMembershipGateOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await requestWithdrawal(accountId, {
        amount: amt,
        asset: withAsset,
        network: withNetwork,
        destinationAddress: destAddress,
      });
      status.success("Withdrawal request submitted successfully. Awaiting review.");
      setWithAmount("");
      setDestAddress("");
      await loadWallet();
      setIsWithdrawOpen(false);
    } catch (err) {
      status.error((err as any)?.message || "Failed to submit withdrawal request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedAccount) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md text-center">
          <WalletIcon className="mx-auto h-12 w-12 text-text-muted opacity-30" />
          <h3 className="mt-4 text-lg font-semibold text-text-primary">No Trading Account</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Please select or initialize a trading account to access the wallet module.
          </p>
        </Card>
      </div>
    );
  }

  const depositAddress = DEPOSIT_ADDRESSES[depNetwork] || "0xDepositAddressMock";

  return (
    <div className="flex flex-col gap-6">

      {/* Balance Header Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="flex flex-col justify-between border-l-4 border-l-gold p-5">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Available Balance</span>
          {isLoading || !wallet ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <span className="mt-2 text-2xl font-bold text-text-primary">
              {formatCurrency(wallet.balance, wallet.currency)}
            </span>
          )}
        </Card>

        <Card className="flex flex-col justify-between p-5 border-l-4 border-l-red-500">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Withdrawals</span>
          {isLoading || !wallet ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <span className="mt-2 text-xl font-bold text-rose-400">
              {formatCurrency(wallet.totalWithdrawals, wallet.currency)}
            </span>
          )}
        </Card>

        <Card className="flex flex-col justify-between p-5 border-l-4 border-l-amber-500">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Pending Deposits</span>
          {isLoading || !wallet ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <span className="mt-2 text-xl font-bold text-amber-500">
              {formatCurrency(wallet.pendingDeposits, wallet.currency)}
            </span>
          )}
        </Card>

        <Card className="flex flex-col justify-between p-5 border-l-4 border-l-orange-500">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Pending Withdrawals</span>
          {isLoading || !wallet ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <span className="mt-2 text-xl font-bold text-orange-400">
              {formatCurrency(wallet.pendingWithdrawals, wallet.currency)}
            </span>
          )}
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            setDepositMode("deposit");
            setIsDepositOpen(true);
          }}
        >
          <ArrowDownLeft className="h-4 w-4" />
          Deposit
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => setIsWithdrawOpen(true)}>
          <ArrowUpRight className="h-4 w-4" />
          Withdraw
        </Button>
      </div>

      {/* Transaction History */}
      <Card className="flex flex-col gap-0">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-5">
          <History className="h-5 w-5 text-gold" />
          <h3 className="text-base font-semibold text-text-primary">Transaction History</h3>
          {wallet && wallet.fundingHistory.length > 0 && (
            <span className="text-[10px] font-bold bg-white/10 text-text-secondary px-2 py-0.5 rounded-full">
              {wallet.fundingHistory.length}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !wallet || wallet.fundingHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Coins className="h-10 w-10 text-text-muted opacity-20 mb-3" />
              <p className="text-sm font-medium text-text-secondary">No transactions yet</p>
              <p className="text-xs text-text-muted mt-1">Your deposit and withdrawal history will appear here.</p>
            </div>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-text-muted">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Asset</th>
                  <th className="py-2 pr-4 font-medium">Network</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {wallet.fundingHistory.map((tx: WalletTransaction) => {
                  const isDep = tx.type === "DEPOSIT";
                  const isSub = tx.type === "SUBSCRIPTION";
                  const isPending = tx.status === "PENDING";
                  const isApproved = tx.status === "APPROVED";
                  const isRejected = tx.status === "REJECTED";

                  return (
                    <tr key={tx.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 text-text-secondary whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 font-semibold ${isSub ? "text-gold" : isDep ? "text-green-400" : "text-rose-400"}`}>
                          {isSub ? <ShieldCheck className="h-3.5 w-3.5" /> : isDep ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          {isSub ? "Membership" : isDep ? "Deposit" : "Withdrawal"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-text-primary">
                        <span className="flex items-center gap-1.5 font-mono">
                          <CryptoIcon symbol={tx.asset} className="h-4 w-4" />
                          {parseFloat(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.asset}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-text-secondary">{tx.network}</td>
                      <td className="py-3 pr-4 text-text-primary font-mono">
                        {formatCurrency(tx.fiatAmount, wallet.currency)}
                      </td>
                      <td className="py-3 pr-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-lg">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-400/10 border border-red-400/20 px-2.5 py-1 rounded-lg">
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Deposit Modal */}
      <Modal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        title={depositMode === "subscription" ? "Activate Membership" : "Deposit Assets"}
      >
        <form onSubmit={handleDepositSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Asset</label>
              <div className="relative">
                <CryptoIcon symbol={depAsset} className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" />
                <select
                  value={depAsset}
                  onChange={(e) => setDepAsset(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black pl-10 pr-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {SUPPORTED_ASSETS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Network</label>
              <select
                value={depNetwork}
                onChange={(e) => setDepNetwork(e.target.value)}
                className="rounded-xl border border-white/10 bg-black px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {(NETWORK_MAPPING[depAsset] || []).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                Platform Destination Deposit Address
              </span>
              <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded font-mono">
                Live Address
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 bg-black/50 p-2.5 rounded-lg border border-white/5">
              <span className="font-mono text-xs text-text-primary truncate select-all">
                {depositAddress}
              </span>
              <button
                type="button"
                onClick={() => handleCopyAddress(depositAddress)}
                className="p-1.5 hover:bg-white/10 rounded transition-colors text-text-secondary hover:text-text-primary shrink-0"
                title="Copy address"
              >
                {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <span className="text-[10px] text-text-muted italic">
              Send tokens to this address then submit your {depositMode === "subscription" ? "membership payment" : "deposit request"} below.
            </span>
          </div>

          {depositMode === "subscription" ? (
            <div className="flex items-center justify-between rounded-xl border border-gold/20 bg-gold/[0.04] p-4">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Membership Fee</span>
              <span className="text-lg font-bold text-gold">{formatCurrency(MEMBERSHIP_FEE, selectedAccount.currency)}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Input
                label="Amount"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)}
                required
              />
              <span className="text-[10px] text-text-muted">
                Minimum deposit: {formatCurrency(100, selectedAccount.currency)}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Payment Proof Screenshot
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-white/10 hover:border-gold/40 hover:bg-white/[0.02] rounded-xl cursor-pointer transition-all">
                <div className="flex flex-col items-center justify-center pt-4 pb-4">
                  <Upload className="h-5 w-5 text-text-secondary hover:text-gold transition-colors mb-2" />
                  <p className="text-xs text-text-secondary">
                    {proofFileName ? (
                      <span className="text-gold font-medium">{proofFileName}</span>
                    ) : (
                      "Click to upload payment screenshot"
                    )}
                  </p>
                  <p className="text-[10px] text-text-muted mt-1">Max file size: 2MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <StatusBanner status={status.status} />

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting} disabled={isLoading}>
            {depositMode === "subscription" ? "Verify & Submit Membership Payment" : "Verify & Submit Deposit"}
          </Button>
        </form>
      </Modal>

      {/* Membership Subscription Required */}
      <Modal
        isOpen={isMembershipGateOpen}
        onClose={() => setIsMembershipGateOpen(false)}
        title={
          <span>
            Membership Subscription <span className="text-gold">Required</span>
          </span>
        }
      >
        <div className="flex flex-col items-center text-center gap-1.5 mb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold/10 text-gold">
            <Lock className="h-5 w-5" />
          </div>
          <p className="text-xs text-text-secondary">Your account is ready for withdrawals.</p>
        </div>

        <div className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
            <Gift className="h-3.5 w-3.5" />
          </div>
          <p className="text-[11px] text-text-secondary leading-snug">
            To activate your withdrawal privileges, complete the{" "}
            <span className="text-gold font-semibold">one-time annual subscription payment</span> below. Once
            activated, you&apos;ll enjoy uninterrupted withdrawals for the next{" "}
            <span className="text-gold font-semibold">12 months</span>.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/30 bg-gold/[0.04] p-3 mt-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary">Annual Membership</p>
              <p className="text-[10px] text-green-400 flex items-center gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Valid for 12 months
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gold leading-none">{formatCurrency(MEMBERSHIP_FEE, selectedAccount.currency)}</p>
            <p className="text-[9px] text-text-muted mt-0.5">One-time payment</p>
          </div>
        </div>

        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 mt-2.5 flex flex-col gap-2">
          <p className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-gold" />
            Important
          </p>
          {[
            "This is a one-time annual fee.",
            "It is only required before your first withdrawal.",
            "After subscription, you can make unlimited withdrawals during your active membership without paying this fee again.",
            "Your membership remains valid for 12 months from the date of activation.",
          ].map((line) => (
            <div key={line} className="flex items-start gap-1.5 border-t border-white/5 pt-2 first:border-t-0 first:pt-0">
              <CheckCircle2 className="h-3 w-3 text-gold shrink-0 mt-0.5" />
              <span className="text-[11px] text-text-secondary leading-snug">{line}</span>
            </div>
          ))}
        </div>

        <Button variant="gold" className="w-full mt-3" onClick={handleActivateMembership}>
          <Lock className="h-4 w-4" />
          Activate Membership
        </Button>

        <button
          type="button"
          onClick={() => {
            setIsMembershipGateOpen(false);
            setIsWithdrawOpen(true);
          }}
          className="w-full text-center text-xs text-text-secondary hover:text-text-primary mt-2.5 transition-colors"
        >
          Back to Withdrawal
        </button>
      </Modal>

      {/* Withdraw Modal */}
      <Modal isOpen={isWithdrawOpen} onClose={() => setIsWithdrawOpen(false)} title="Withdraw Assets">
        <form onSubmit={handleWithdrawalSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Asset</label>
              <div className="relative">
                <CryptoIcon symbol={withAsset} className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" />
                <select
                  value={withAsset}
                  onChange={(e) => setWithAsset(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black pl-10 pr-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {SUPPORTED_ASSETS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Network</label>
              <select
                value={withNetwork}
                onChange={(e) => setWithNetwork(e.target.value)}
                className="rounded-xl border border-white/10 bg-black px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {(NETWORK_MAPPING[withAsset] || []).map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Destination Wallet Address"
            placeholder="Enter external destination wallet address"
            value={destAddress}
            onChange={(e) => setDestAddress(e.target.value)}
            required
          />

          <Input
            label="Amount"
            type="number"
            step="0.00000001"
            placeholder="0.00"
            value={withAmount}
            onChange={(e) => setWithAmount(e.target.value)}
            required
          />

          <StatusBanner status={status.status} />

          <Button type="submit" variant="gold" className="w-full" isLoading={isSubmitting} disabled={isLoading}>
            Execute Withdrawal Request
          </Button>
        </form>
      </Modal>
    </div>
  );
}
