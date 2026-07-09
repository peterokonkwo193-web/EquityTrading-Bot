import { Prisma, SimulatedTrade } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getOwnedAccountOrThrow } from "../accounts/account.service";
import { StartTradeInput, SettleBotTradeInput } from "./trades.schema";
import {
  CRYPTO_MARKETS,
  FOREX_MARKETS,
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
  const winProbability = 0.85 + Math.random() * 0.10; // Fluctuate between 85% and 95%
  const isWin = Math.random() < winProbability;
  const pct = isWin ? randomBetween(PROFIT_PCT_MIN, PROFIT_PCT_MAX) : -randomBetween(LOSS_PCT_MIN, LOSS_PCT_MAX);
  const raw = Math.round(amount * pct * 100) / 100;
  // Guarantee at least $1 of movement either way, however small the trade amount.
  return Math.abs(raw) < 1 ? (isWin ? 1 : -1) : raw;
}

async function ensureTradingStats(accountId: string) {
  const existing = await prisma.tradingStats.findUnique({ where: { accountId } });
  if (existing) return existing;
  return prisma.tradingStats.create({ data: { accountId } });
}

async function resolveTrade(trade: SimulatedTrade) {
  const decimalPnl = trade.profitLoss;
  const isWin = Number(decimalPnl) >= 0;

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
      data: { status: "CLOSED", closedAt: new Date() },
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
    throw new AppError("Trade amount cannot exceed your available balance", 400);
  }

  const latest = await getLatestTrade(accountId);
  if (latest) {
    const settled = await settleIfDue(latest);
    if (settled.status === "OPEN") {
      throw new AppError("A trade order execution is already in progress", 400);
    }
  }

  await ensureTradingStats(accountId);

  const direction = Math.random() < 0.5 ? "BUY" : "SELL";
  const now = new Date();
  const closesAt = new Date(now.getTime() + TRADE_DURATION_SECONDS * 1000);
  const profitLoss = computeProfitLoss(input.amount);

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
      profitLoss: new Prisma.Decimal(profitLoss),
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
  
  let winRate = stats.tradesCount > 0 ? (stats.winCount / stats.tradesCount) * 100 : 0;
  if (winRate > 95 || winRate === 0) {
    winRate = 85 + Math.random() * 10; // Fluctuate between 85% and 95%
  } else if (winRate < 85) {
    winRate = 85 + Math.random() * 3;
  }
  
  return { ...stats, winRate };
}

/**
 * Settles a single bot auto-trading cycle: adjusts the account balance and
 * updates trading stats atomically. Called by the authenticated owner — no
 * admin role required.
 */
export async function settleBotTrade(
  userId: string,
  accountId: string,
  input: SettleBotTradeInput
) {
  const account = await getOwnedAccountOrThrow(userId, accountId);

  const pnl = new Prisma.Decimal(input.profitLoss);

  // Prevent balance going below zero on a loss
  if (pnl.isNegative() && account.balance.lessThan(pnl.abs())) {
    throw new AppError("Insufficient balance to settle trade loss", 400);
  }

  const isWin = !pnl.isNegative();
  await ensureTradingStats(accountId);

  const [updatedAccount] = await prisma.$transaction([
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: pnl } },
    }),
    prisma.tradingStats.update({
      where: { accountId },
      data: {
        totalPnl: { increment: pnl },
        todayPnl: { increment: pnl },
        tradesCount: { increment: 1 },
        winCount: isWin ? { increment: 1 } : undefined,
      },
    }),
    prisma.transaction.create({
      data: {
        accountId,
        type: "TRADE_PNL",
        amount: pnl,
        status: "COMPLETED",
      },
    }),
  ]);

  return { balance: updatedAccount.balance, profitLoss: pnl };
}
