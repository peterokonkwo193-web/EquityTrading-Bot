/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  FileText,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  ExternalLink,
  Lock,
  ShieldCheck
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBanner } from "@/components/status/StatusBanner";
import { useStatus } from "@/hooks/useStatus";
import { useAuth } from "@/context/AuthContext";
import { 
  fetchAdminUsers, 
  fetchAdminTransactions, 
  reviewAdminTransaction, 
  fetchAdminAuditLogs,
  adjustUserBalance
} from "@/lib/endpoints";
import { formatCurrency } from "@/lib/currency";
import { AuditLog } from "@/types";

export default function AdminDashboardPage() {
  const { user: currentAdmin } = useAuth();
  const status = useStatus();

  const [activeSubTab, setActiveSubTab] = useState<"users" | "deposits" | "withdrawals" | "subscriptions" | "audit">("users");
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Give Profit / Adjust Balance state variables
  const [adjustingUser, setAdjustingUser] = useState<any | null>(null);
  const [profitAmount, setProfitAmount] = useState("");
  const [profitNote, setProfitNote] = useState("");
  const [isSubmittingProfit, setIsSubmittingProfit] = useState(false);
  const profitStatus = useStatus();
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      status.clear();
    }
    try {
      if (activeSubTab === "users") {
        const data = await fetchAdminUsers(searchQuery);
        setUsers(data);
      } else if (activeSubTab === "deposits" || activeSubTab === "withdrawals" || activeSubTab === "subscriptions") {
        const data = await fetchAdminTransactions();
        setTransactions(data);
      } else if (activeSubTab === "audit") {
        const data = await fetchAdminAuditLogs();
        setAuditLogs(data);
      }
    } catch (err: any) {
      if (!silent) status.error(err?.message || "Failed to load admin dashboard data.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleApplyProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    profitStatus.clear();

    const amt = parseFloat(profitAmount);
    if (isNaN(amt)) {
      profitStatus.error("Please enter a valid amount");
      return;
    }

    const mainAcc = adjustingUser.accounts?.[0];
    if (!mainAcc) {
      profitStatus.error("This user does not have a trading account");
      return;
    }

    setIsSubmittingProfit(true);
    try {
      await adjustUserBalance(adjustingUser.id, mainAcc.id, {
        amount: amt,
        note: profitNote || "Admin Profit Adjustment",
      });
      status.success(`Successfully adjusted balance for ${adjustingUser.name} by ${formatCurrency(amt, mainAcc.currency)}.`);
      setProfitAmount("");
      setProfitNote("");
      setAdjustingUser(null);
      await loadData();
    } catch (err: any) {
      profitStatus.error(err?.message || "Failed to adjust balance.");
    } finally {
      setIsSubmittingProfit(false);
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
    loadData();

    // Poll in the background so newly submitted deposits/withdrawals show up
    // here as soon as possible without the admin needing to refresh.
    const interval = setInterval(() => loadData(true), 5000);
    return () => clearInterval(interval);
  }, [currentAdmin, activeSubTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleReview = async (txId: string, action: "APPROVED" | "REJECTED") => {
    status.clear();
    try {
      await reviewAdminTransaction(txId, action);
      status.success(`Transaction request was successfully ${action.toLowerCase()}.`);
      // Reload queue
      const allTxs = await fetchAdminTransactions();
      setTransactions(allTxs);
    } catch (err: any) {
      status.error(err?.message || `Failed to review transaction: ${err?.message}`);
    }
  };

  if (currentAdmin?.role !== "ADMIN") {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <Lock className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-text-primary">Access Denied</h3>
        <p className="text-sm text-text-secondary mt-1 max-w-sm">
          You do not have administrative permissions to view this dashboard.
        </p>
      </div>
    );
  }

  const pendingDeposits = transactions.filter((t) => t.type === "DEPOSIT" && t.status === "PENDING");
  const pendingWithdrawals = transactions.filter((t) => t.type === "WITHDRAWAL" && t.status === "PENDING");
  const pendingSubscriptions = transactions.filter((t) => t.type === "SUBSCRIPTION" && t.status === "PENDING");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-white/10 gap-2">
          <button
            onClick={() => setActiveSubTab("users")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeSubTab === "users"
                ? "border-gold text-gold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <Users className="h-4 w-4" />
            User Accounts
          </button>
          <button
            onClick={() => setActiveSubTab("deposits")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeSubTab === "deposits"
                ? "border-gold text-gold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <ArrowDownLeft className="h-4 w-4" />
            Deposit Queue
            {pendingDeposits.length > 0 && (
              <span className="ml-1 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                {pendingDeposits.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("withdrawals")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeSubTab === "withdrawals"
                ? "border-gold text-gold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <ArrowUpRight className="h-4 w-4" />
            Withdrawal Queue
            {pendingWithdrawals.length > 0 && (
              <span className="ml-1 bg-purple-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                {pendingWithdrawals.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("subscriptions")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeSubTab === "subscriptions"
                ? "border-gold text-gold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Subscription Queue
            {pendingSubscriptions.length > 0 && (
              <span className="ml-1 bg-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                {pendingSubscriptions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("audit")}
            className={`pb-3 px-4 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
              activeSubTab === "audit"
                ? "border-gold text-gold"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            <FileText className="h-4 w-4" />
            System Audit Logs
          </button>
        </div>

        <StatusBanner status={status.status} />

        {/* Tab Contents: Users */}
        {activeSubTab === "users" && (
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Users className="h-5 w-5 text-gold" />
                Manage Platform Users
              </h3>
              
              <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Search email or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="!py-1.5 w-full sm:w-64"
                />
                <Button type="submit" variant="gold" className="shrink-0 py-1.5 h-10">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </form>
            </div>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col gap-3 py-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <p className="text-center py-12 text-sm text-text-secondary">No users found.</p>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-text-secondary text-xs uppercase tracking-wider">
                      <th className="py-2 font-semibold">User</th>
                      <th className="py-2 font-semibold">Role</th>
                      <th className="py-2 font-semibold">Main Account</th>
                      <th className="py-2 font-semibold">Available Balance</th>
                      <th className="py-2 font-semibold">Status</th>
                      <th className="py-2 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => {
                      const mainAcc = u.accounts?.[0];
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                          <td className="py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-text-primary">{u.name}</span>
                              <span className="text-xs text-text-secondary">{u.email}</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              u.role === "ADMIN" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-blue-500/10 text-blue-400"
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-xs text-text-secondary">
                            {mainAcc?.accountNumber || "N/A"}
                          </td>
                          <td className="py-3 font-bold text-text-primary">
                            {mainAcc ? formatCurrency(mainAcc.balance, mainAcc.currency) : "N/A"}
                          </td>
                          <td className="py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs ${
                              u.status === "ACTIVE" ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"
                            }`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              {mainAcc && (
                                <button
                                  onClick={() => setAdjustingUser(u)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gold/15 text-gold hover:text-white transition-all hover:bg-gold/25 px-3 py-1.5 rounded-lg border border-gold/20"
                                >
                                  <Coins className="h-3.5 w-3.5" />
                                  Give Profit
                                </button>
                              )}
                              <Link 
                                href={`/admin/users/${u.id}`} 
                                className="inline-flex items-center gap-1 text-xs font-semibold bg-white/[0.04] text-text-secondary border border-white/10 hover:bg-white/[0.08] hover:text-text-primary px-3 py-1.5 rounded-lg transition-colors"
                              >
                                View Activity
                              </Link>
                            </div>
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

        {/* Tab Contents: Deposits Review Queue */}
        {activeSubTab === "deposits" && (
          <Card className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-text-primary border-b border-white/10 pb-4 mb-2 flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-green-500" />
              Pending Deposit Approvals
            </h3>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col gap-3 py-6">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : pendingDeposits.length === 0 ? (
                <p className="text-center py-16 text-sm text-text-secondary">No pending deposits require review.</p>
              ) : (
                <table className="w-full min-w-[820px] text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[13%]" />
                    <col className="w-[13%]" />
                    <col className="w-[12%]" />
                    <col className="w-[10%]" />
                    <col className="w-[12%]" />
                    <col className="w-[20%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/10 text-text-secondary text-[10px] uppercase tracking-wider">
                      <th className="py-2 pr-2 font-semibold">User</th>
                      <th className="py-2 pr-2 font-semibold">Amount</th>
                      <th className="py-2 pr-2 font-semibold">Asset</th>
                      <th className="py-2 pr-2 font-semibold">Network</th>
                      <th className="py-2 pr-2 font-semibold">Date</th>
                      <th className="py-2 pr-2 font-semibold">Proof</th>
                      <th className="py-2 pr-2 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingDeposits.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors align-top">
                        <td className="py-3 pr-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-text-primary text-xs truncate">
                              {tx.account?.user?.name || "Unknown User"}
                            </span>
                            <span className="text-[10px] text-text-secondary truncate">
                              {tx.account?.user?.email}
                            </span>
                            <span className="text-[9px] font-mono text-text-muted mt-0.5 truncate">
                              {tx.account?.accountNumber}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-2 font-bold text-green-400 text-xs">
                          {formatCurrency(tx.fiatAmount, tx.account?.currency || "USD")}
                        </td>
                        <td className="py-3 pr-2 text-text-primary text-xs truncate">
                          {tx.amount} {tx.asset}
                        </td>
                        <td className="py-3 pr-2 text-[10px] text-text-secondary truncate">
                          {tx.network}
                        </td>
                        <td className="py-3 pr-2 text-[10px] text-text-secondary whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-2">
                          {tx.paymentProof ? (
                            <button
                              onClick={() => setSelectedProofUrl(tx.paymentProof)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-muted">None</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleReview(tx.id, "APPROVED")}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <Check className="h-3 w-3" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleReview(tx.id, "REJECTED")}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}

        {/* Tab Contents: Withdrawals Review Queue */}
        {activeSubTab === "withdrawals" && (
          <Card className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-text-primary border-b border-white/10 pb-4 mb-2 flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-purple-500" />
              Pending Withdrawal Approvals
            </h3>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col gap-3 py-6">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : pendingWithdrawals.length === 0 ? (
                <p className="text-center py-16 text-sm text-text-secondary">No pending withdrawals require review.</p>
              ) : (
                <table className="w-full min-w-[820px] text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                    <col className="w-[10%]" />
                    <col className="w-[20%]" />
                    <col className="w-[10%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/10 text-text-secondary text-[10px] uppercase tracking-wider">
                      <th className="py-2 pr-2 font-semibold">User</th>
                      <th className="py-2 pr-2 font-semibold">Amount</th>
                      <th className="py-2 pr-2 font-semibold">Asset</th>
                      <th className="py-2 pr-2 font-semibold">Network</th>
                      <th className="py-2 pr-2 font-semibold">Destination</th>
                      <th className="py-2 pr-2 font-semibold">Date</th>
                      <th className="py-2 pr-2 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingWithdrawals.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors align-top">
                        <td className="py-3 pr-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-text-primary text-xs truncate">
                              {tx.account?.user?.name || "Unknown User"}
                            </span>
                            <span className="text-[10px] text-text-secondary truncate">
                              {tx.account?.user?.email}
                            </span>
                            <span className="text-[9px] font-mono text-text-muted mt-0.5 truncate">
                              {tx.account?.accountNumber}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-2 font-bold text-red-400 text-xs">
                          {formatCurrency(tx.fiatAmount, tx.account?.currency || "USD")}
                        </td>
                        <td className="py-3 pr-2 text-text-primary text-xs truncate">
                          {tx.amount} {tx.asset}
                        </td>
                        <td className="py-3 pr-2 text-[10px] text-text-secondary truncate">
                          {tx.network}
                        </td>
                        <td className="py-3 pr-2 font-mono text-[10px] text-text-secondary truncate select-all" title={tx.destinationAddress}>
                          {tx.destinationAddress}
                        </td>
                        <td className="py-3 pr-2 text-[10px] text-text-secondary whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleReview(tx.id, "APPROVED")}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <Check className="h-3 w-3" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleReview(tx.id, "REJECTED")}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}

        {/* Tab Contents: Subscriptions Review Queue */}
        {activeSubTab === "subscriptions" && (
          <Card className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-text-primary border-b border-white/10 pb-4 mb-2 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold" />
              Pending Membership Subscriptions
            </h3>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col gap-3 py-6">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : pendingSubscriptions.length === 0 ? (
                <p className="text-center py-16 text-sm text-text-secondary">No pending membership subscriptions require review.</p>
              ) : (
                <table className="w-full min-w-[820px] text-left text-xs border-collapse table-fixed">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[14%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                    <col className="w-[25%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-white/10 text-text-secondary text-[10px] uppercase tracking-wider">
                      <th className="py-2 pr-2 font-semibold">User</th>
                      <th className="py-2 pr-2 font-semibold">Fee</th>
                      <th className="py-2 pr-2 font-semibold">Asset</th>
                      <th className="py-2 pr-2 font-semibold">Network</th>
                      <th className="py-2 pr-2 font-semibold">Proof</th>
                      <th className="py-2 pr-2 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {pendingSubscriptions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors align-top">
                        <td className="py-3 pr-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-text-primary text-xs truncate">
                              {tx.account?.user?.name || "Unknown User"}
                            </span>
                            <span className="text-[10px] text-text-secondary truncate">
                              {tx.account?.user?.email}
                            </span>
                            <span className="text-[9px] font-mono text-text-muted mt-0.5 truncate">
                              {tx.account?.accountNumber}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-2 font-bold text-gold text-xs">
                          {formatCurrency(tx.fiatAmount, tx.account?.currency || "USD")}
                        </td>
                        <td className="py-3 pr-2 text-text-primary text-xs truncate">
                          {tx.amount} {tx.asset}
                        </td>
                        <td className="py-3 pr-2 text-[10px] text-text-secondary truncate">
                          {tx.network}
                        </td>
                        <td className="py-3 pr-2">
                          {tx.paymentProof ? (
                            <button
                              onClick={() => setSelectedProofUrl(tx.paymentProof)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-muted">None</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => handleReview(tx.id, "APPROVED")}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <Check className="h-3 w-3" />
                              Activate
                            </button>
                            <button
                              onClick={() => handleReview(tx.id, "REJECTED")}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}

        {/* Tab Contents: Audit Logs */}
        {activeSubTab === "audit" && (
          <Card className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-text-primary border-b border-white/10 pb-4 mb-2 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gold" />
              Administrative Audit Logs
            </h3>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="flex flex-col gap-3 py-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center py-12 text-sm text-text-secondary">No audit logs recorded yet.</p>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-text-secondary text-xs uppercase tracking-wider">
                      <th className="py-2 font-semibold">Timestamp</th>
                      <th className="py-2 font-semibold">Administrator</th>
                      <th className="py-2 font-semibold">Action</th>
                      <th className="py-2 font-semibold">Log details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 text-xs text-text-secondary whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 font-semibold text-text-primary">
                          {log.administrator?.name || "System"}
                          <span className="block text-[10px] text-text-secondary font-normal font-mono">
                            {log.administrator?.email}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-text-primary border border-white/10">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 text-text-secondary text-xs leading-relaxed">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Modal for Payment Proof Preview */}
      {selectedProofUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedProofUrl(null)}
        >
          <div
            className="w-full max-w-lg border border-white/10 bg-background-card rounded-2xl shadow-2xl p-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedProofUrl(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-sm font-bold text-text-primary mb-3">Payment Proof</h3>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedProofUrl}
              alt="Payment proof screenshot"
              className="w-full rounded-xl border border-white/10 max-h-[70vh] object-contain bg-black/30"
            />
          </div>
        </div>
      )}

      {/* Modal for Profit Adjustment */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md border border-white/10 bg-gradient-to-br from-background-card to-background-card/90 rounded-2xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setAdjustingUser(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2 mb-2">
              <Coins className="h-5 w-5 text-gold" />
              Adjust Account Balance / Profit
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              Directly credit profits or debit funds from <span className="font-semibold text-text-primary">{adjustingUser.name}</span>&apos;s account.
            </p>

            <form onSubmit={handleApplyProfit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Amount ({adjustingUser.accounts?.[0]?.currency || "USD"})
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 500 for profit, -200 for debit"
                    value={profitAmount}
                    onChange={(e) => setProfitAmount(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <span className="text-[10px] text-text-muted">
                  Use positive numbers to add profits/funds; use negative numbers to deduct.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Note / Reason
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Daily profit payout, adjustment"
                  value={profitNote}
                  onChange={(e) => setProfitNote(e.target.value)}
                />
              </div>

              {profitStatus.status && (
                <StatusBanner status={profitStatus.status} />
              )}

              <div className="flex gap-3 justify-end mt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setAdjustingUser(null)}
                  disabled={isSubmittingProfit}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="gold"
                  isLoading={isSubmittingProfit}
                >
                  Apply Balance
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
