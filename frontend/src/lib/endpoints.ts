import { apiRequest } from "./apiClient";
import {
  Account,
  BotActivity,
  Deposit,
  Notification,
  Settings,
  TradingBot,
  User,
  Withdrawal,
} from "@/types";

// Auth
export const loginUser = (email: string, password: string) =>
  apiRequest<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password } });

export const logoutUser = () => apiRequest<{ message: string }>("/auth/logout", { method: "POST" });

export const fetchMe = () => apiRequest<User>("/auth/me");

// Profile
export const updateProfile = (input: { name?: string; avatarUrl?: string | null }) =>
  apiRequest<User>("/users/me", { method: "PATCH", body: input });

export const changePassword = (input: { currentPassword: string; newPassword: string }) =>
  apiRequest<{ message: string }>("/users/me/password", { method: "PATCH", body: input });

// Accounts
export const fetchAccounts = () => apiRequest<Account[]>("/accounts");
export const fetchAccount = (accountId: string) => apiRequest<Account>(`/accounts/${accountId}`);

// Bot
export const fetchBot = (accountId: string) => apiRequest<TradingBot>(`/accounts/${accountId}/bot`);
export const startBot = (accountId: string) =>
  apiRequest<TradingBot>(`/accounts/${accountId}/bot/start`, { method: "POST" });
export const pauseBot = (accountId: string) =>
  apiRequest<TradingBot>(`/accounts/${accountId}/bot/pause`, { method: "POST" });
export const stopBot = (accountId: string) =>
  apiRequest<TradingBot>(`/accounts/${accountId}/bot/stop`, { method: "POST" });
export const fetchBotActivity = (accountId: string, limit = 20) =>
  apiRequest<BotActivity[]>(`/accounts/${accountId}/bot/activity?limit=${limit}`);

// Deposits
export const fetchDeposits = (accountId: string) => apiRequest<Deposit[]>(`/accounts/${accountId}/deposits`);
export const createDeposit = (accountId: string, input: { amount: number; currency: string; method: string }) =>
  apiRequest<Deposit>(`/accounts/${accountId}/deposits`, { method: "POST", body: input });

// Withdrawals
export const fetchWithdrawals = (accountId: string) =>
  apiRequest<Withdrawal[]>(`/accounts/${accountId}/withdrawals`);
export const createWithdrawal = (accountId: string, input: { amount: number; destination: string }) =>
  apiRequest<Withdrawal>(`/accounts/${accountId}/withdrawals`, { method: "POST", body: input });

// Notifications
export const fetchNotifications = () => apiRequest<Notification[]>("/notifications");
export const markNotificationRead = (id: string) =>
  apiRequest<{ message: string }>(`/notifications/${id}/read`, { method: "PATCH" });
export const markAllNotificationsRead = () =>
  apiRequest<{ message: string }>("/notifications/read-all", { method: "PATCH" });

// Settings
export const fetchSettings = () => apiRequest<Settings>("/settings");
export const updateSettings = (input: Partial<Pick<Settings, "emailNotifications" | "pushNotifications" | "botAlerts">>) =>
  apiRequest<Settings>("/settings", { method: "PATCH", body: input });
