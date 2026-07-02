import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getOwnedAccountOrThrow } from "../accounts/account.service";
import { simulatedBotEngine } from "./engine/SimulatedBotEngine";

async function getBotOrThrow(accountId: string) {
  const bot = await prisma.tradingBot.findUnique({ where: { accountId } });
  if (!bot) {
    throw new AppError("Trading bot not found for this account", 404);
  }
  return bot;
}

export async function getBot(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  return getBotOrThrow(accountId);
}

export async function startBot(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  const bot = await getBotOrThrow(accountId);

  if (bot.status === "RUNNING") {
    return bot;
  }
  await simulatedBotEngine.start(bot.id);
  return getBotOrThrow(accountId);
}

export async function pauseBot(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  const bot = await getBotOrThrow(accountId);

  if (bot.status !== "RUNNING") {
    throw new AppError("Bot must be running to pause it", 400);
  }
  await simulatedBotEngine.pause(bot.id);
  return getBotOrThrow(accountId);
}

export async function stopBot(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  const bot = await getBotOrThrow(accountId);

  if (bot.status === "STOPPED") {
    return bot;
  }
  await simulatedBotEngine.stop(bot.id);
  return getBotOrThrow(accountId);
}

export async function getActivity(userId: string, accountId: string, limit: number) {
  await getOwnedAccountOrThrow(userId, accountId);
  const bot = await getBotOrThrow(accountId);

  return prisma.botActivity.findMany({
    where: { botId: bot.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
