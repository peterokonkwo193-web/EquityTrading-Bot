export type Currency = "USD" | "GBP" | "EUR";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  currency: Currency;
  emailVerified: boolean;
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

export type AssetClass = "CRYPTO" | "FOREX";
export type TradeDirection = "BUY" | "SELL";
export type TradeStatus = "OPEN" | "CLOSED";

export interface SimulatedTrade {
  id: string;
  accountId: string;
  market: string;
  assetClass: AssetClass;
  direction: TradeDirection;
  amount: string;
  profitLoss: string;
  status: TradeStatus;
  durationSeconds: number;
  openedAt: string;
  closesAt: string;
  closedAt: string | null;
  createdAt: string;
}

export interface TradingStats {
  id: string;
  accountId: string;
  totalPnl: string;
  todayPnl: string;
  tradesCount: number;
  winCount: number;
  winRate: number;
}

export type DepositStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Deposit {
  id: string;
  accountId: string;
  amount: string;
  currency: string;
  status: DepositStatus;
  createdAt: string;
}

export interface Wallet {
  balance: string;
  currency: string;
  fundingHistory: Deposit[];
}

export interface TickerEntry {
  symbol: string;
  assetClass: AssetClass;
  price: number;
  changePct: number;
}

export interface Settings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  tradeAlerts: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { message: string; details?: unknown };
}
