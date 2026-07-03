import { logger } from "../../lib/logger";

interface TickerEntry {
  symbol: string;
  assetClass: "CRYPTO" | "FOREX";
  price: number;
  changePct: number;
}

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
};

const FOREX_BASE_PRICES: Record<string, number> = {
  XAUUSD: 2400,
  EURUSD: 1.08,
  GBPUSD: 1.27,
  USDJPY: 150,
  AUDUSD: 0.65,
};

const forexState: Record<string, { price: number; changePct: number }> = Object.fromEntries(
  Object.entries(FOREX_BASE_PRICES).map(([symbol, price]) => [symbol, { price, changePct: 0 }])
);

const CACHE_TTL_MS = 10_000;
let cachedCrypto: TickerEntry[] | null = null;
let cachedAt = 0;

async function fetchCryptoPrices(): Promise<TickerEntry[]> {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
    const data = (await res.json()) as Record<string, { usd: number; usd_24h_change?: number }>;

    return Object.entries(COINGECKO_IDS).map(([symbol, geckoId]) => ({
      symbol,
      assetClass: "CRYPTO" as const,
      price: data[geckoId]?.usd ?? 0,
      changePct: data[geckoId]?.usd_24h_change ?? 0,
    }));
  } catch (err) {
    logger.warn("CoinGecko fetch failed, serving last known prices", err);
    return (
      cachedCrypto ??
      Object.keys(COINGECKO_IDS).map((symbol) => ({ symbol, assetClass: "CRYPTO" as const, price: 0, changePct: 0 }))
    );
  }
}

function tickForexPrices(): TickerEntry[] {
  return Object.entries(forexState).map(([symbol, state]) => {
    const driftPct = (Math.random() - 0.5) * 0.001;
    state.price = Math.max(0.0001, state.price * (1 + driftPct));
    state.changePct = state.changePct * 0.9 + driftPct * 100 * 0.1;
    return { symbol, assetClass: "FOREX" as const, price: state.price, changePct: state.changePct };
  });
}

export async function getTicker(): Promise<TickerEntry[]> {
  const now = Date.now();
  if (!cachedCrypto || now - cachedAt > CACHE_TTL_MS) {
    cachedCrypto = await fetchCryptoPrices();
    cachedAt = now;
  }
  return [...cachedCrypto, ...tickForexPrices()];
}
