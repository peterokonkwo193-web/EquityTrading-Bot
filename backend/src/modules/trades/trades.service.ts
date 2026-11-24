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
  LOSS_RATIO,
  TRADE_DURATION_SECONDS,
} from "./trades.constants";

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function computeProfitLoss(amount: number): number {
  const winProbability = 0.85 + Math.random() * 0.10; // Fluctuate between 85% and 95%
  const isWin = Math.random() < winProbability;
  const profitPct = randomBetween(PROFIT_PCT_MIN, PROFIT_PCT_MAX);
  const pct = isWin ? profitPct : -(profitPct * LOSS_RATIO);
  const raw = Math.round(amount * pct * 100) / 100;
  // Guarantee at least $1 of movement either way, however small the trade amount.
  return Math.abs(raw) < 1 ? (isWin ? 1 : -1) : raw;
}

export function getStartOfToday(timezone?: string): Date {
  const now = new Date();
  const tz = timezone || "UTC";
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = formatter.format(now);
    const candidateUtc = new Date(todayStr + "T00:00:00.000Z");
    const fullFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const candidateLocalStr = fullFormatter.format(candidateUtc);
    const [cDate, cTime] = candidateLocalStr.split(", ");
    const [ch, cm, cs] = cTime.split(":").map(Number);
    const candidateMsIntoTargetDay =
      cDate === todayStr
        ? (ch * 3600 + cm * 60 + cs) * 1000
        : -(24 * 3600 - (ch * 3600 + cm * 60 + cs)) * 1000;
    return new Date(candidateUtc.getTime() - candidateMsIntoTargetDay);
  } catch {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }
}

export async function calculateAndSyncStats(accountId: string, timezone?: string) {
  const startOfToday = getStartOfToday(timezone);

  const [totalAgg, todayAgg, winCount] = await Promise.all([
    prisma.simulatedTrade.aggregate({
      where: { accountId, status: "CLOSED" },
      _sum: { profitLoss: true },
      _count: { id: true },
    }),
    prisma.simulatedTrade.aggregate({
      where: {
        accountId,
        status: "CLOSED",
        createdAt: { gte: startOfToday },
      },
      _sum: { profitLoss: true },
    }),
    prisma.simulatedTrade.count({
      where: {
        accountId,
        status: "CLOSED",
        profitLoss: { gte: 0 },
      },
    }),
  ]);

  const tradesCount = totalAgg._count.id;
  const totalPnl = totalAgg._sum.profitLoss ?? new Prisma.Decimal(0);
  const todayPnl = todayAgg._sum.profitLoss ?? new Prisma.Decimal(0);
  const winRate = tradesCount > 0 ? (winCount / tradesCount) * 100 : 0;

  const stats = await prisma.tradingStats.upsert({
    where: { accountId },
    update: {
      totalPnl,
      todayPnl,
      tradesCount,
      winCount,
    },
    create: {
      accountId,
      totalPnl,
      todayPnl,
      tradesCount,
      winCount,
    },
  });

  return {
    ...stats,
    winRate,
  };
}

async function ensureTradingStats(accountId: string) {
  const existing = await prisma.tradingStats.findUnique({ where: { accountId } });
  if (existing) return existing;
  return prisma.tradingStats.create({ data: { accountId } });
}

async function resolveTrade(trade: SimulatedTrade, timezone?: string): Promise<SimulatedTrade> {
  const decimalPnl = trade.profitLoss;

  const [, updatedTrade] = await prisma.$transaction([
    prisma.account.update({
      where: { id: trade.accountId },
      data: { balance: { increment: decimalPnl } },
    }),
    prisma.simulatedTrade.update({
      where: { id: trade.id },
      data: { status: "CLOSED", closedAt: new Date() },
    }),
    prisma.transaction.create({
      data: { accountId: trade.accountId, type: "TRADE_PNL", amount: decimalPnl, status: "COMPLETED" },
    }),
  ]);

  await calculateAndSyncStats(trade.accountId, timezone);

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

export async function getStats(userId: string, accountId: string, timezone?: string) {
  await getOwnedAccountOrThrow(userId, accountId);

  // Auto-settle any due open trades for this account so stats are immediately accurate
  const dueTrade = await prisma.simulatedTrade.findFirst({
    where: { accountId, status: "OPEN", closesAt: { lte: new Date() } },
  });
  if (dueTrade) {
    await resolveTrade(dueTrade, timezone);
  }

  return calculateAndSyncStats(accountId, timezone);
}

/**
 * Settles a single bot auto-trading cycle: adjusts the account balance and
 * updates trading stats atomically. Called by the authenticated owner — no
 * admin role required.
 */
export async function settleBotTrade(
  userId: string,
  accountId: string,
  input: SettleBotTradeInput,
  timezone?: string
) {
  const account = await getOwnedAccountOrThrow(userId, accountId);

  const pnl = new Prisma.Decimal(input.profitLoss);

  // Prevent balance going below zero on a loss
  if (pnl.isNegative() && account.balance.lessThan(pnl.abs())) {
    throw new AppError("Insufficient balance to settle trade loss", 400);
  }

  const now = new Date();

  const [updatedAccount] = await prisma.$transaction([
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: pnl } },
    }),
    prisma.transaction.create({
      data: {
        accountId,
        type: "TRADE_PNL",
        amount: pnl,
        status: "COMPLETED",
      },
    }),
    prisma.simulatedTrade.create({
      data: {
        accountId,
        market: input.market,
        assetClass: input.assetClass,
        direction: input.direction,
        amount: new Prisma.Decimal(input.amount),
        profitLoss: pnl,
        status: "CLOSED",
        durationSeconds: input.durationSeconds ?? TRADE_DURATION_SECONDS,
        openedAt: now,
        closesAt: now,
        closedAt: now,
        entryPrice: input.entryPrice !== undefined ? new Prisma.Decimal(input.entryPrice) : undefined,
        exitPrice: input.exitPrice !== undefined ? new Prisma.Decimal(input.exitPrice) : undefined,
      },
    }),
  ]);

  await calculateAndSyncStats(accountId, timezone);

  return { balance: updatedAccount.balance, profitLoss: pnl };
}
