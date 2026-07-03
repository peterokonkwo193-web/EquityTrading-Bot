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
} from "@/types";

// Auth
export const registerUser = (input: { name: string; email: string; password: string; currency: Currency }) =>
  apiRequest<{ user: User; verificationCode: string }>("/auth/register", { method: "POST", body: input });

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

// Wallet
export const fetchWallet = (accountId: string) => apiRequest<Wallet>(`/accounts/${accountId}/wallet`);
export const addVirtualFunds = (accountId: string, input: { amount: number; currency: string }) =>
  apiRequest<Wallet["fundingHistory"][number]>(`/accounts/${accountId}/wallet/add-funds`, {
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
