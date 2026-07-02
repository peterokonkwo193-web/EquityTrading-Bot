import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { logger } from "../../../lib/logger";
import { BotEngine } from "./BotEngine";
import { register, clearRegistration, isRegistered } from "./botEngineRegistry";

const TICK_INTERVAL_MS = 5000;
const ERROR_CHANCE = 0.02;

const SYMBOLS = ["BTC/USD", "ETH/USD", "SOL/USD", "EUR/USD", "XAU/USD"];

function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function randomPnlDelta() {
  const isWin = Math.random() < 0.62;
  const magnitude = Math.round((Math.random() * 90 + 5) * 100) / 100;
  return { isWin, delta: isWin ? magnitude : -magnitude };
}

async function createNotification(userId: string, title: string, message: string, type: "SUCCESS" | "WARNING" | "ERROR" | "INFO") {
  await prisma.notification.create({
    data: { userId, title, message, type },
  });
}

async function tick(botId: string) {
  try {
    const bot = await prisma.tradingBot.findUnique({
      where: { id: botId },
      include: { account: true },
    });

    if (!bot || bot.status !== "RUNNING") {
      clearRegistration(botId);
      return;
    }

    if (Math.random() < ERROR_CHANCE) {
      clearRegistration(botId);
      await prisma.tradingBot.update({
        where: { id: botId },
        data: {
          status: "ERROR",
          errorMessage: "Connection to liquidity provider was interrupted.",
          lastTickAt: new Date(),
        },
      });
      await createNotification(
        bot.account.userId,
        "Trading bot error",
        "Your trading bot hit an error and has stopped trading.",
        "ERROR"
      );
      return;
    }

    const { isWin, delta } = randomPnlDelta();
    const symbol = randomSymbol();
    const message = isWin
      ? `Closed long position on ${symbol} (+$${delta.toFixed(2)})`
      : `Closed short position on ${symbol} (-$${Math.abs(delta).toFixed(2)})`;

    const newTradesCount = bot.tradesCount + 1;
    const priorWins = Math.round((Number(bot.winRate) / 100) * bot.tradesCount);
    const newWins = priorWins + (isWin ? 1 : 0);
    const newWinRate = (newWins / newTradesCount) * 100;

    await prisma.$transaction([
      prisma.tradingBot.update({
        where: { id: botId },
        data: {
          totalPnl: { increment: new Prisma.Decimal(delta) },
          todayPnl: { increment: new Prisma.Decimal(delta) },
          tradesCount: newTradesCount,
          winRate: new Prisma.Decimal(newWinRate.toFixed(2)),
          lastTickAt: new Date(),
        },
      }),
      prisma.botActivity.create({
        data: { botId, message, pnlDelta: new Prisma.Decimal(delta) },
      }),
    ]);
  } catch (err) {
    logger.error("Bot tick failed for", botId, err);
  }
}

class SimulatedBotEngineImpl implements BotEngine {
  async start(botId: string): Promise<void> {
    if (isRegistered(botId)) return;

    await prisma.tradingBot.update({
      where: { id: botId },
      data: { status: "RUNNING", startedAt: new Date(), errorMessage: null },
    });

    const bot = await prisma.tradingBot.findUniqueOrThrow({
      where: { id: botId },
      include: { account: true },
    });
    await createNotification(bot.account.userId, "Bot started", "Your trading bot is now running.", "SUCCESS");

    const interval = setInterval(() => {
      void tick(botId);
    }, TICK_INTERVAL_MS);
    register(botId, interval);
  }

  async pause(botId: string): Promise<void> {
    clearRegistration(botId);
    await prisma.tradingBot.update({
      where: { id: botId },
      data: { status: "PAUSED" },
    });
    const bot = await prisma.tradingBot.findUniqueOrThrow({
      where: { id: botId },
      include: { account: true },
    });
    await createNotification(bot.account.userId, "Bot paused", "Your trading bot has been paused.", "INFO");
  }

  async stop(botId: string): Promise<void> {
    clearRegistration(botId);
    await prisma.tradingBot.update({
      where: { id: botId },
      data: { status: "STOPPED", startedAt: null },
    });
    const bot = await prisma.tradingBot.findUniqueOrThrow({
      where: { id: botId },
      include: { account: true },
    });
    await createNotification(bot.account.userId, "Bot stopped", "Your trading bot has been stopped.", "WARNING");
  }

  /** Re-arms the interval for a bot that is already RUNNING in the DB, without resetting its state. Used on server boot. */
  resume(botId: string): void {
    if (isRegistered(botId)) return;
    const interval = setInterval(() => {
      void tick(botId);
    }, TICK_INTERVAL_MS);
    register(botId, interval);
  }
}

export const simulatedBotEngine = new SimulatedBotEngineImpl();
