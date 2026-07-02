export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt?: string;
}

export type AccountStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface Account {
  id: string;
  userId: string;
  name: string;
  accountNumber: string;
  balance: string;
  currency: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export type BotStatus = "STOPPED" | "RUNNING" | "PAUSED" | "ERROR";

export interface TradingBot {
  id: string;
  accountId: string;
  status: BotStatus;
  totalPnl: string;
  todayPnl: string;
  tradesCount: number;
  winRate: string;
  startedAt: string | null;
  lastTickAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BotActivity {
  id: string;
  botId: string;
  message: string;
  pnlDelta: string;
  createdAt: string;
}

export type DepositStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Deposit {
  id: string;
  accountId: string;
  amount: string;
  currency: string;
  method: string;
  status: DepositStatus;
  createdAt: string;
}

export type WithdrawalStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Withdrawal {
  id: string;
  accountId: string;
  amount: string;
  destination: string;
  status: WithdrawalStatus;
  createdAt: string;
}

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Settings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  botAlerts: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { message: string; details?: unknown };
}
