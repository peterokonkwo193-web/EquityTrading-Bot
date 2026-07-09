export const CRYPTO_MARKETS = ["BTC", "ETH", "BNB", "SOL"] as const;
export const FOREX_MARKETS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD"] as const;

export const ALL_MARKETS = [...CRYPTO_MARKETS, ...FOREX_MARKETS];

export const MIN_TRADE_AMOUNT = 100;
export const TRADE_DURATION_SECONDS = 20;

export const WIN_PROBABILITY = 0.85;
export const PROFIT_PCT_MIN = 0.01;
export const PROFIT_PCT_MAX = 0.02;
export const LOSS_PCT_MIN = 0.008;
export const LOSS_PCT_MAX = 0.017;

