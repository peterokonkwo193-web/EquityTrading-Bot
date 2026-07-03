import { Prisma, SimulatedTrade } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getOwnedAccountOrThrow } from "../accounts/account.service";
import { StartTradeInput } from "./trades.schema";
import {
  CRYPTO_MARKETS,
  FOREX_MARKETS,
  WIN_PROBABILITY,
  PROFIT_PCT_MIN,
  PROFIT_PCT_MAX,
  LOSS_PCT_MIN,
  LOSS_PCT_MAX,
  TRADE_DURATION_SECONDS,
} from "./trades.constants";

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function computeProfitLoss(amount: number): number {
  const isWin = Math.random() < WIN_PROBABILITY;
  const pct = isWin ? randomBetween(PROFIT_PCT_MIN, PROFIT_PCT_MAX) : -randomBetween(LOSS_PCT_MIN, LOSS_PCT_MAX);
  return Math.round(amount * pct * 100) / 100;
}

async function ensureTradingStats(accountId: string) {
  const existing = await prisma.tradingStats.findUnique({ where: { accountId } });
  if (existing) return existing;
  return prisma.tradingStats.create({ data: { accountId } });
}

async function resolveTrade(trade: SimulatedTrade) {
  const profitLoss = computeProfitLoss(Number(trade.amount));
  const isWin = profitLoss >= 0;
  const decimalPnl = new Prisma.Decimal(profitLoss);

  const stats = await ensureTradingStats(trade.accountId);

  const [, , updatedTrade] = await prisma.$transaction([
    prisma.tradingStats.update({
      where: { accountId: trade.accountId },
      data: {
        totalPnl: { increment: decimalPnl },
        todayPnl: { increment: decimalPnl },
        tradesCount: stats.tradesCount + 1,
        winCount: isWin ? stats.winCount + 1 : stats.winCount,
      },
    }),
    prisma.account.update({
      where: { id: trade.accountId },
      data: { balance: { increment: decimalPnl } },
    }),
    prisma.simulatedTrade.update({
      where: { id: trade.id },
      data: { status: "CLOSED", closedAt: new Date(), profitLoss: decimalPnl },
    }),
  ]);

  await prisma.transaction.create({
    data: { accountId: trade.accountId, type: "TRADE_PNL", amount: decimalPnl, status: "COMPLETED" },
  });

  return updatedTrade;
}

async function getLatestTrade(accountId: string) {
  return prisma.simulatedTrade.findFirst({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });
}

/** Resolves the trade if it's OPEN and past due, otherwise returns it unchanged. */
async function settleIfDue(trade: SimulatedTrade) {
  if (trade.status === "OPEN" && new Date() >= trade.closesAt) {
    return resolveTrade(trade);
  }
  return trade;
}

export async function getActiveTrade(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  const latest = await getLatestTrade(accountId);
  if (!latest || latest.status === "CLOSED") return null;

  // latest.status === "OPEN": may resolve it now if past due (one-time reveal), else still counting down.
  return settleIfDue(latest);
}

export async function startTrade(userId: string, accountId: string, input: StartTradeInput) {
  const account = await getOwnedAccountOrThrow(userId, accountId);

  const allowedMarkets = input.assetClass === "CRYPTO" ? CRYPTO_MARKETS : FOREX_MARKETS;
  if (!(allowedMarkets as readonly string[]).includes(input.market)) {
    throw new AppError(`${input.market} is not a valid ${input.assetClass.toLowerCase()} market`, 422);
  }

  if (input.amount > Number(account.balance)) {
    throw new AppError("Simulated trade amount cannot exceed your available balance", 400);
  }

  const latest = await getLatestTrade(accountId);
  if (latest) {
    const settled = await settleIfDue(latest);
    if (settled.status === "OPEN") {
      throw new AppError("A simulated trade is already in progress", 400);
    }
  }

  await ensureTradingStats(accountId);

  const now = new Date();
  const closesAt = new Date(now.getTime() + TRADE_DURATION_SECONDS * 1000);
  const direction = Math.random() < 0.5 ? "BUY" : "SELL";

  return prisma.simulatedTrade.create({
    data: {
      accountId,
      market: input.market,
      assetClass: input.assetClass,
      direction,
      amount: new Prisma.Decimal(input.amount),
      status: "OPEN",
      durationSeconds: TRADE_DURATION_SECONDS,
      openedAt: now,
      closesAt,
    },
  });
}

export async function getTradeHistory(userId: string, accountId: string, limit: number) {
  await getOwnedAccountOrThrow(userId, accountId);
  return prisma.simulatedTrade.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getStats(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  const stats = await ensureTradingStats(accountId);
  const winRate = stats.tradesCount > 0 ? (stats.winCount / stats.tradesCount) * 100 : 0;
  return { ...stats, winRate };
}
