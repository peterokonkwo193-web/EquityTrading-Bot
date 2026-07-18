/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Wallet,
  History,
  TrendingUp,
  Coins,
  CheckCircle,
  XCircle,
  Clock,
  Briefcase,
  ExternalLink,
  Check
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { useAuth } from "@/context/AuthContext";
import { fetchAdminUserDetail, adjustUserBalance, reviewAdminTransaction } from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  
  const { user: currentAdmin } = useAuth();
  
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"wallet" | "transactions" | "trades">("wallet");

  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const adjustStatus = useStatus();
  const reviewStatus = useStatus();
  const [reviewingTxId, setReviewingTxId] = useState<string | null>(null);

  const loadUserDetail = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUserDetail(userId);
      setUserData(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load user details.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    adjustStatus.clear();

    const amt = parseFloat(adjustAmount);
    if (isNaN(amt)) {
      adjustStatus.error("Please enter a valid amount");
      return;
    }

    setIsAdjusting(true);
    try {
      await adjustUserBalance(userId, account.id, {
        amount: amt,
        note: adjustNote,
      });
      adjustStatus.success(`Balance adjusted successfully by ${formatCurrency(amt, account.currency)}.`);
      setAdjustAmount("");
      setAdjustNote("");
      await loadUserDetail();
    } catch (err: any) {
      adjustStatus.error(err?.message || "Failed to adjust balance.");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleReviewTx = async (txId: string, status: "APPROVED" | "REJECTED") => {
    reviewStatus.clear();
    setReviewingTxId(txId);
    try {
      await reviewAdminTransaction(txId, status);
      reviewStatus.success(`Request ${status === "APPROVED" ? "approved" : "rejected"} successfully.`);
      const data = await fetchAdminUserDetail(userId);
      setUserData(data);
    } catch (err: any) {
      reviewStatus.error(err?.message || "Failed to review request.");
    } finally {
      setReviewingTxId(null);
    }
  };

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

  useEffect(() => {
    if (currentAdmin?.role !== "ADMIN") return;
    loadUserDetail();
  }, [currentAdmin, userId]);

  if (currentAdmin?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <h3 className="text-xl font-bold text-text-primary">Access Denied</h3>
        <p className="text-sm text-text-secondary mt-1">
          You do not have permission to view user detailed logs.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24" />
        </div>
        <Card className="flex items-center gap-4 py-8">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-4 w-60" />
          </div>
        </Card>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (error || !userData) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/admin" className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary">
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </Link>
        <Card className="border border-red-500/20 bg-red-500/5 p-6 text-center text-red-400">
          <p className="font-semibold">{error || "User details could not be found."}</p>
        </Card>
      </div>
    );
  }

  const account = userData.accounts?.[0] || null;
  const walletTransactions = account?.walletTransactions || [];
  const transactions = account?.transactions || [];
  const trades = account?.trades || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <div>
        <Link 
          href="/admin" 
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </Link>
      </div>

      {/* User Profile Header Card */}
      <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-gold/10 text-gold flex items-center justify-center border border-gold/20 shrink-0">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              {userData.name}
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">
                {userData.role}
              </span>
            </h2>
            <p className="text-sm text-text-secondary">{userData.email}</p>
            <p className="text-[10px] text-text-muted mt-1">
              Registered on: {new Date(userData.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1">
          <span className="text-xs text-text-secondary uppercase tracking-wider font-semibold">User Status</span>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
            userData.status === "ACTIVE" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
          }`}>
            {userData.status}
          </span>
        </div>
      </Card>

      {/* Account Balances overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between border-l-4 border-l-gold">
          <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Account balance</span>
          <span className="text-2xl font-bold text-text-primary mt-2">
            {account ? formatCurrency(account.balance, account.currency) : "N/A"}
          </span>
          <span className="text-[10px] text-text-muted mt-1">
            Currency: {account?.currency || "USD"}
          </span>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Bot Trades</span>
          <span className="text-2xl font-bold text-text-primary mt-2">
            {trades.length}
          </span>
          <span className="text-[10px] text-text-muted mt-1">
            Total positions opened
          </span>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Deposit requests</span>
          <span className="text-2xl font-bold text-green-500 mt-2">
            {walletTransactions.filter((t: any) => t.type === "DEPOSIT" && t.status === "APPROVED").length}
          </span>
          <span className="text-[10px] text-text-muted mt-1">
            Approved crypto deposits
          </span>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs text-text-secondary uppercase tracking-wider font-medium">Withdrawal requests</span>
          <span className="text-2xl font-bold text-red-400 mt-2">
            {walletTransactions.filter((t: any) => t.type === "WITHDRAWAL" && t.status === "APPROVED").length}
          </span>
          <span className="text-[10px] text-text-muted mt-1">
            Approved crypto withdrawals
          </span>
        </Card>
      </div>

      {/* Admin Fund Adjustment Card */}
      {account && (
        <Card className="p-6 border border-white/10 bg-navy-950/40">
          <h3 className="text-base font-bold text-text-primary mb-2 flex items-center gap-2">
            <Coins className="h-5 w-5 text-gold" />
            Direct Balance Adjustment (Credit / Debit)
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            Enter a positive amount to credit the account (add money), or a negative amount to debit/deduct funds.
          </p>

          <form onSubmit={handleAdjustSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[200px] flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 500 or -200"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                required
              />
            </div>

            <div className="flex-1 min-w-[250px] flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Adjustment Note</label>
              <Input
                type="text"
                placeholder="Reason (e.g. Wire deposit credit, balance adjustment)"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="gold"
              isLoading={isAdjusting}
              className="shrink-0 w-full sm:w-auto"
            >
              Apply Adjustment
            </Button>
          </form>

          {adjustStatus.status && (
            <div className="mt-3">
              <StatusBanner status={adjustStatus.status} />
            </div>
          )}
        </Card>
      )}

      {/* Tabs Selector for Lists */}
      <div className="flex flex-col gap-4">
        <div className="flex border-b border-white/10 gap-2">
          <button
            onClick={() => setActiveTab("wallet")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "wallet"
                ? "border-gold text-gold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <Wallet className="h-4 w-4" />
            Wallet Crypto Requests
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "transactions"
                ? "border-gold text-gold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <History className="h-4 w-4" />
            Account Ledger
          </button>
          <button
            onClick={() => setActiveTab("trades")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === "trades"
                ? "border-gold text-gold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Bot Trade Activity
          </button>
        </div>

        {/* Tab Content: Wallet Transactions */}
        {activeTab === "wallet" && (
          <Card>
            <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
              <Wallet className="h-5 w-5 text-gold" />
              Crypto Wallet Deposit & Withdrawal History
            </h3>

            {reviewStatus.status && (
              <div className="mb-3">
                <StatusBanner status={reviewStatus.status} />
              </div>
            )}

            <div className="overflow-x-auto">
              {walletTransactions.length === 0 ? (
                <p className="text-center py-12 text-sm text-text-secondary">No wallet transactions recorded for this user.</p>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-text-secondary text-xs uppercase tracking-wider">
                      <th className="py-2.5 font-semibold">Date</th>
                      <th className="py-2.5 font-semibold">Type</th>
                      <th className="py-2.5 font-semibold">Asset Details</th>
                      <th className="py-2.5 font-semibold">Fiat Value</th>
                      <th className="py-2.5 font-semibold">Address Details</th>
                      <th className="py-2.5 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {walletTransactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 text-xs text-text-secondary whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            tx.type === "DEPOSIT" ? "bg-green-500/10 text-green-400" : tx.type === "SUBSCRIPTION" ? "bg-gold/10 text-gold" : "bg-red-500/10 text-red-400"
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-text-primary">
                          {tx.amount} {tx.asset}
                          <span className="block text-[10px] text-text-secondary font-normal">
                            Network: {tx.network}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-text-primary">
                          {formatCurrency(tx.fiatAmount, account?.currency || "USD")}
                        </td>
                        <td className="py-3 font-mono text-xs text-text-secondary max-w-[200px] truncate select-all">
                          {tx.type === "WITHDRAWAL" ? (
                            <span title={tx.destinationAddress || "N/A"}>{tx.destinationAddress || "N/A"}</span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>

                        <td className="py-3 text-right">
                          {tx.status === "PENDING" && (
                            <div className="inline-flex gap-1.5">
                              <button
                                onClick={() => handleReviewTx(tx.id, "APPROVED")}
                                disabled={reviewingTxId === tx.id}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-2 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                <Check className="h-3 w-3" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleReviewTx(tx.id, "REJECTED")}
                                disabled={reviewingTxId === tx.id}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-2 py-1 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                              >
                                <XCircle className="h-3 w-3" />
                                Reject
                              </button>
                            </div>
                          )}
                          {tx.status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                              <CheckCircle className="h-3 w-3" />
                              Approved
                            </span>
                          )}
                          {tx.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                              <XCircle className="h-3 w-3" />
                              Rejected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}

        {/* Tab Content: Internal Account Ledger */}
        {activeTab === "transactions" && (
          <Card>
            <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
              <History className="h-5 w-5 text-gold" />
              General Account Ledger
            </h3>
            
            <div className="overflow-x-auto">
              {transactions.length === 0 ? (
                <p className="text-center py-12 text-sm text-text-secondary">No ledger transactions found.</p>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-text-secondary text-xs uppercase tracking-wider">
                      <th className="py-2.5 font-semibold">Date</th>
                      <th className="py-2.5 font-semibold">Type</th>
                      <th className="py-2.5 font-semibold">Amount</th>
                      <th className="py-2.5 font-semibold">Reference</th>
                      <th className="py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 text-xs text-text-secondary">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                            tx.type === "DEPOSIT" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 font-bold text-text-primary">
                          {formatCurrency(tx.amount, account?.currency || "USD")}
                        </td>
                        <td className="py-3 text-xs text-text-secondary max-w-[200px] truncate">
                          {tx.reference || "N/A"}
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                            <CheckCircle className="h-3 w-3" />
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}

        {/* Tab Content: Bot Trades */}
        {activeTab === "trades" && (
          <Card>
            <h3 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2 border-b border-white/10 pb-3">
              <Briefcase className="h-5 w-5 text-gold" />
              Bot Trade Activity
            </h3>
            
            <div className="overflow-x-auto">
              {trades.length === 0 ? (
                <p className="text-center py-12 text-sm text-text-secondary">No trades placed in this account.</p>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-text-secondary text-xs uppercase tracking-wider">
                      <th className="py-2.5 font-semibold">Opened At</th>
                      <th className="py-2.5 font-semibold">Market / Class</th>
                      <th className="py-2.5 font-semibold">Direction</th>
                      <th className="py-2.5 font-semibold">Amount</th>
                      <th className="py-2.5 font-semibold">Profit / Loss</th>
                      <th className="py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {trades.map((t: any) => {
                      const isBuy = t.direction === "BUY";
                      const pnl = parseFloat(t.profitLoss);
                      const isProfit = pnl > 0;
                      const isLoss = pnl < 0;
                      return (
                        <tr key={t.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-3 text-xs text-text-secondary">
                            {new Date(t.openedAt).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-text-primary">{t.market}</span>
                              <span className="text-[10px] text-text-secondary">{t.assetClass}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              isBuy ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            }`}>
                              {t.direction}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-text-primary">
                            {formatCurrency(t.amount, account?.currency || "USD")}
                          </td>
                          <td className={`py-3 font-bold ${
                            isProfit ? "text-green-400" : isLoss ? "text-red-400" : "text-text-secondary"
                          }`}>
                            {isProfit ? "+" : ""}{formatCurrency(t.profitLoss, account?.currency || "USD")}
                          </td>
                          <td className="py-3">
                            {t.status === "OPEN" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                                <Clock className="h-3 w-3 animate-pulse" />
                                Open Position
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-text-secondary bg-white/10 px-2 py-0.5 rounded">
                                <CheckCircle className="h-3 w-3" />
                                Closed
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
        )}
      </div>
    </div>
  );
}
