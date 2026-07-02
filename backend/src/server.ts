import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";
import { simulatedBotEngine } from "./modules/bot/engine/SimulatedBotEngine";

async function resumeRunningBots() {
  const runningBots = await prisma.tradingBot.findMany({ where: { status: "RUNNING" } });
  for (const bot of runningBots) {
    simulatedBotEngine.resume(bot.id);
  }
  if (runningBots.length > 0) {
    logger.info(`Resumed ${runningBots.length} running bot(s) after restart.`);
  }
}

async function main() {
  await resumeRunningBots();
  app.listen(env.PORT, () => {
    logger.info(`Backend listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  logger.error("Failed to start server:", err);
  process.exit(1);
});
