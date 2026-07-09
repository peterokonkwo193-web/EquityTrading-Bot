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
  Upload
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { useAccount } from "@/context/AccountContext";
import { fetchWallet, requestDeposit, requestWithdrawal } from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";
import { Wallet, WalletTransaction } from "@/types";

const SUPPORTED_ASSETS = ["BTC", "USDT", "ETH", "TRX", "BNB", "USDC"] as const;

const NETWORK_MAPPING: Record<string, string[]> = {
  BTC: ["Bitcoin Native"],
  ETH: ["Ethereum (ERC20)"],
  TRX: ["Tron (TRC20)"],
  BNB: ["BSC (BEP20)"],
  USDT: ["Tron (TRC20)", "Ethereum (ERC20)", "BSC (BEP20)"],
  USDC: ["Ethereum (ERC20)", "BSC (BEP20)", "Tron (TRC20)"],
};

const DEPOSIT_ADDRESSES: Record<string, string> = {
  "Bitcoin Native": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "Ethereum (ERC20)": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "Tron (TRC20)": "TYHC5R471Vb94Nf3885Gf9d7H5Rk69TfbK",
  "BSC (BEP20)": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
};

export default function WalletPage() {
  const { selectedAccount } = useAccount();
  const status = useStatus();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    if (accountId) {
      setIsLoading(true);
      loadWallet();
    }
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

    const amt = parseFloat(depAmount);
    if (isNaN(amt) || amt <= 0) {
      status.error("Please enter a valid amount greater than 0");
      return;
    }

    if (!paymentProof) {
      status.error("Please attach a screenshot of your payment proof");
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
      status.success("Deposit request submitted. Pending admin review.");
      setDepAmount("");
      setPaymentProof("");
      setProofFileName("");
      await loadWallet();
    } catch (err) {
      status.error((err as any)?.message || "Failed to submit deposit request.");
    } finally {
      setIsSubmitting(false);
    }
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
    } catch (err) {
      status.error((err as any)?.message || "Failed to submit withdrawal request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getExplorerLink = (hash: string, network: string) => {
    const net = network.toLowerCase();
    if (net.includes("tron") || net.includes("trc")) {
      return `https://tronscan.org/#/transaction/${hash}`;
    } else if (net.includes("bsc") || net.includes("bep") || net.includes("binance")) {
      return `https://bscscan.com/tx/${hash}`;
    } else {
      return `https://etherscan.io/tx/${hash}`;
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

      {/* Available Balance Header Cards */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Available Balance */}
        <Card className="flex flex-col justify-between border-l-4 border-l-gold p-5">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Available Balance</span>
          {isLoading || !wallet ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <span className="mt-2 text-2xl font-bold text-text-primary">
              {formatCurrency(wallet.balance, wallet.currency)}
            </span>
          )}
          <span className="mt-1 text-[10px] text-text-muted">Trading Capital Balance</span>
        </Card>

        {/* Total Deposits */}
        <Card className="flex flex-col justify-between p-5 border-l-4 border-l-green-500">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Deposits</span>
          {isLoading || !wallet ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <span className="mt-2 text-xl font-bold text-green-500">
              {formatCurrency(wallet.totalDeposits, wallet.currency)}
            </span>
          )}
          <span className="mt-1 text-[10px] text-text-muted">On-Chain Verified Deposits</span>
        </Card>

        {/* Pending Deposits */}
        <Card className="flex flex-col justify-between p-5 border-l-4 border-l-amber-500">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Pending Deposits</span>
          {isLoading || !wallet ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <span className="mt-2 text-xl font-bold text-amber-500">
              {formatCurrency(wallet.pendingDeposits, wallet.currency)}
            </span>
          )}
          <span className="mt-1 text-[10px] text-text-muted">Awaiting Confirmations</span>
        </Card>

        {/* Total Withdrawals */}
        <Card className="flex flex-col justify-between p-5 border-l-4 border-l-red-500">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Total Withdrawals</span>
          {isLoading || !wallet ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <span className="mt-2 text-xl font-bold text-red-500">
              {formatCurrency(wallet.totalWithdrawals, wallet.currency)}
            </span>
          )}
          <span className="mt-1 text-[10px] text-text-muted">Completed Withdrawals</span>
        </Card>

        {/* Pending Withdrawals */}
        <Card className="flex flex-col justify-between p-5 border-l-4 border-l-purple-500">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">Pending Withdrawals</span>
          {isLoading || !wallet ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <span className="mt-2 text-xl font-bold text-purple-500">
              {formatCurrency(wallet.pendingWithdrawals, wallet.currency)}
            </span>
          )}
          <span className="mt-1 text-[10px] text-text-muted">In Review Queue</span>
        </Card>
      </div>

      {/* Main Grid: Forms and History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Forms Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Deposit Card */}
          <Card className="flex flex-col">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <ArrowDownLeft className="h-4 w-4 text-gold" />
              Deposit Assets
            </div>
            <form onSubmit={handleDepositSubmit} className="flex flex-col gap-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                {/* Asset */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Asset</label>
                  <select
                    value={depAsset}
                    onChange={(e) => setDepAsset(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {SUPPORTED_ASSETS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Network */}
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

              {/* Display Wallet Address */}
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
                  Send tokens to this address then submit your deposit request below.
                </span>
              </div>

              {/* Amount */}
              <Input
                label="Amount"
                type="number"
                step="0.00000001"
                placeholder="0.00"
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)}
                required
              />

              {/* Payment Proof File Attachment */}
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

              <Button
                type="submit"
                variant="gold"
                className="w-full mt-auto"
                isLoading={isSubmitting}
                disabled={isLoading}
              >
                Verify & Submit Deposit
              </Button>
            </form>
          </Card>

          {/* Withdraw Card */}
          <Card className="flex flex-col">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <ArrowUpRight className="h-4 w-4 text-gold" />
              Withdraw Assets
            </div>
            <form onSubmit={handleWithdrawalSubmit} className="flex flex-col gap-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                {/* Asset */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Asset</label>
                  <select
                    value={withAsset}
                    onChange={(e) => setWithAsset(e.target.value)}
                    className="rounded-xl border border-white/10 bg-black px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    {SUPPORTED_ASSETS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Network */}
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

              {/* Destination Address */}
              <Input
                label="Destination Wallet Address"
                placeholder="Enter external destination wallet address"
                value={destAddress}
                onChange={(e) => setDestAddress(e.target.value)}
                required
              />

              {/* Amount */}
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

              <Button
                type="submit"
                variant="gold"
                className="w-full mt-auto"
                isLoading={isSubmitting}
                disabled={isLoading}
              >
                Execute Withdrawal Request
              </Button>
            </form>
          </Card>
        </div>

        {/* Transaction History Card */}
        <Card className="lg:col-span-7 flex flex-col gap-0">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-5">
            <History className="h-5 w-5 text-gold" />
            <h3 className="text-base font-semibold text-text-primary">Transaction History</h3>
            {wallet && wallet.fundingHistory.length > 0 && (
              <span className="text-[10px] font-bold bg-white/10 text-text-secondary px-2 py-0.5 rounded-full">
                {wallet.fundingHistory.length}
              </span>
            )}
          </div>

          {/* Content */}
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
            ) : (() => {
              return (
                <div className="flex flex-col gap-2">
                  {wallet.fundingHistory.map((tx: WalletTransaction) => {
                    const isDep = tx.type === "DEPOSIT";
                    const isPending = tx.status === "PENDING";
                    const isApproved = tx.status === "APPROVED";
                    const isRejected = tx.status === "REJECTED";

                    return (
                      <div
                        key={tx.id}
                        className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                          isPending
                            ? "border-amber-500/10 bg-amber-500/[0.02] hover:bg-amber-500/[0.04]"
                            : isApproved
                            ? "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]"
                            : "border-red-500/10 bg-red-500/[0.02] hover:bg-red-500/[0.04]"
                        }`}
                      >
                        {/* Left: Icon + Type */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 ${
                            isDep
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20"
                          }`}>
                            {isDep ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-text-primary">
                              {isDep ? "Deposit" : "Withdrawal"}
                            </span>
                            <span className="text-[10px] text-text-muted truncate max-w-[120px]">
                              {tx.network}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Asset + Fiat */}
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          <span className="text-sm font-bold font-mono text-text-primary">
                            {parseFloat(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tx.asset}
                          </span>
                          <span className="text-[11px] text-text-secondary">
                            ≈ {formatCurrency(tx.fiatAmount, wallet.currency)}
                          </span>
                        </div>

                        {/* Right: Status + Date */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg">
                              <Clock className="h-3 w-3" />
                              Pending Review
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
                          <span className="text-[10px] text-text-muted font-mono">
                            {new Date(tx.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">
                            {new Date(tx.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
}
