export type Currency = "USD" | "GBP" | "EUR";

export type UserRole = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  country: string | null;
  currency: Currency;
  emailVerified: boolean;
  role: UserRole;
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

export interface WalletTransaction {
  id: string;
  accountId: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "SUBSCRIPTION";
  asset: string;
  network: string;
  amount: string;
  fiatAmount: string;
  destinationAddress: string | null;
  txHash: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeConnection {
  id: string;
  exchange: string;
  apiKeyMasked: string;
}

export interface AuditLog {
  id: string;
  administratorId: string;
  action: string;
  details: string;
  timestamp: string;
  administrator: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Wallet {
  balance: string;
  currency: string;
  totalDeposits: string;
  totalWithdrawals: string;
  pendingDeposits: string;
  pendingWithdrawals: string;
  accountLimit: string | null;
  membershipActive: boolean;
  membershipExpiresAt: string | null;
  fundingHistory: WalletTransaction[];
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
