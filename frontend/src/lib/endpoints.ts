import { apiRequest } from "./apiClient";
import {
  Account,
  Currency,
  Settings,
  SimulatedTrade,
  TickerEntry,
  TradingStats,
  User,
  Wallet,
  WalletTransaction,
  AuditLog,
  ExchangeConnection,
} from "@/types";

// Auth
export const registerUser = (input: {
  name: string;
  email: string;
  password: string;
  currency: Currency;
  country: string;
}) => apiRequest<{ user: User; token: string }>("/auth/register", { method: "POST", body: input });

export const verifyEmail = (email: string, code: string) =>
  apiRequest<User>("/auth/verify-email", { method: "POST", body: { email, code } });

export const loginUser = (email: string, password: string, rememberMe: boolean) =>
  apiRequest<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: { email, password, rememberMe },
  });

export const logoutUser = () => apiRequest<{ message: string }>("/auth/logout", { method: "POST" });

export const fetchMe = () => apiRequest<User>("/auth/me");

export const forgotPassword = (email: string) =>
  apiRequest<{ resetToken: string | null }>("/auth/forgot-password", { method: "POST", body: { email } });

export const resetPassword = (input: { email: string; token: string; newPassword: string }) =>
  apiRequest<{ message: string }>("/auth/reset-password", { method: "POST", body: input });

// Profile
export const updateProfile = (input: { name?: string; avatarUrl?: string | null; currency?: Currency }) =>
  apiRequest<User>("/users/me", { method: "PATCH", body: input });

export const changePassword = (input: { currentPassword: string; newPassword: string }) =>
  apiRequest<{ message: string }>("/users/me/password", { method: "PATCH", body: input });

// Accounts
export const fetchAccounts = () => apiRequest<Account[]>("/accounts");
export const fetchAccount = (accountId: string) => apiRequest<Account>(`/accounts/${accountId}`);

// Trades (simulated)
export const fetchActiveTrade = (accountId: string) =>
  apiRequest<SimulatedTrade | null>(`/accounts/${accountId}/trades/active`);
export const startTrade = (accountId: string, input: { market: string; assetClass: string; amount: number }) =>
  apiRequest<SimulatedTrade>(`/accounts/${accountId}/trades`, { method: "POST", body: input });
export const fetchTradeHistory = (accountId: string, limit = 50) =>
  apiRequest<SimulatedTrade[]>(`/accounts/${accountId}/trades?limit=${limit}`);
export const fetchTradingStats = (accountId: string) =>
  apiRequest<TradingStats>(`/accounts/${accountId}/trades/stats`);
export const settleBotTrade = (accountId: string, input: { profitLoss: number; note?: string }) =>
  apiRequest<{ balance: string; profitLoss: string }>(`/accounts/${accountId}/trades/settle`, {
    method: "POST",
    body: input,
  });

// Wallet
export const fetchWallet = (accountId: string) => apiRequest<Wallet>(`/accounts/${accountId}/wallet`);

export const requestDeposit = (
  accountId: string,
  input: { amount: number; asset: string; network: string; paymentProof?: string }
) =>
  apiRequest<WalletTransaction>(`/accounts/${accountId}/wallet/deposit`, {
    method: "POST",
    body: input,
  });


export const requestWithdrawal = (
  accountId: string,
  input: { amount: number; asset: string; network: string; destinationAddress: string }
) =>
  apiRequest<WalletTransaction>(`/accounts/${accountId}/wallet/withdraw`, {
    method: "POST",
    body: input,
  });

// Exchange Connection
export const connectExchange = (
  accountId: string,
  input: { exchange: string; apiKey: string; apiSecret: string }
) =>
  apiRequest<ExchangeConnection>(`/accounts/${accountId}/exchange`, {
    method: "POST",
    body: input,
  });

export const fetchExchangeConnection = (accountId: string) =>
  apiRequest<ExchangeConnection | null>(`/accounts/${accountId}/exchange`);

export const disconnectExchange = (accountId: string) =>
  apiRequest<{ success: boolean }>(`/accounts/${accountId}/exchange`, {
    method: "DELETE",
  });

// Admin
export const fetchAdminUsers = (search?: string) =>
  apiRequest<unknown[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`);

export const fetchAdminUserDetail = (userId: string) =>
  apiRequest<unknown>(`/admin/users/${userId}`);

export const fetchAdminTransactions = () =>
  apiRequest<unknown[]>(`/admin/transactions`);

export const reviewAdminTransaction = (txId: string, status: "APPROVED" | "REJECTED") =>
  apiRequest<unknown>(`/admin/transactions/${txId}/review`, {
    method: "POST",
    body: { status },
  });

export const fetchAdminAuditLogs = () =>
  apiRequest<AuditLog[]>(`/admin/audit-logs`);

export const adjustUserBalance = (
  userId: string,
  accountId: string,
  input: { amount: number; note?: string }
) =>
  apiRequest<unknown>(`/admin/users/${userId}/accounts/${accountId}/adjust-balance`, {
    method: "POST",
    body: input,
  });


// Ticker
export const fetchTicker = () => apiRequest<TickerEntry[]>("/ticker");

// Settings
export const fetchSettings = () => apiRequest<Settings>("/settings");
export const updateSettings = (
  input: Partial<Pick<Settings, "emailNotifications" | "pushNotifications" | "tradeAlerts">>
) => apiRequest<Settings>("/settings", { method: "PATCH", body: input });
