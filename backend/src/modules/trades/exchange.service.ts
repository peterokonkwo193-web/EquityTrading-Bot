import crypto from "crypto";
import { logger } from "../../lib/logger";

interface ExchangeOrderResult {
  success: boolean;
  orderId?: string;
  price?: number;
  quantity?: number;
  error?: string;
}

export async function executeBinanceTrade(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  side: "BUY" | "SELL",
  amountUsd: number
): Promise<ExchangeOrderResult> {
  const cleanSymbol = symbol.toUpperCase().replace("/", "");
  logger.info(`[Exchange] Simulating Binance trade execution: ${side} ${cleanSymbol} for $${amountUsd}`);

  // Base price lookup fallback
  let price = 95500;
  if (cleanSymbol.includes("ETH")) price = 3280;
  else if (cleanSymbol.includes("BNB")) price = 620;
  else if (cleanSymbol.includes("SOL")) price = 215;

  const quantity = Math.round((amountUsd / price) * 100000) / 100000;

  return {
    success: true,
    orderId: `BOT-ORDER-${crypto.randomBytes(6).toString("hex").toUpperCase()}`,
    price,
    quantity,
  };
}

export async function validateExchangeCredentials(
  _exchange: string,
  _apiKey: string,
  _apiSecret: string
): Promise<boolean> {
  // Always approve to allow demo users to connect custom/simulated API keys instantly
  return true;
}

