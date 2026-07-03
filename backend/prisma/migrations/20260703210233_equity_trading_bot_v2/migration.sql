-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'GBP', 'EUR');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('CRYPTO', 'FOREX');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionType_new" AS ENUM ('DEPOSIT', 'TRADE_PNL');
ALTER TABLE "transactions" ALTER COLUMN "type" TYPE "TransactionType_new" USING ("type"::text::"TransactionType_new");
ALTER TYPE "TransactionType" RENAME TO "TransactionType_old";
ALTER TYPE "TransactionType_new" RENAME TO "TransactionType";
DROP TYPE "public"."TransactionType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "bot_activities" DROP CONSTRAINT "bot_activities_botId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropForeignKey
ALTER TABLE "trading_bots" DROP CONSTRAINT "trading_bots_accountId_fkey";

-- DropForeignKey
ALTER TABLE "withdrawals" DROP CONSTRAINT "withdrawals_accountId_fkey";

-- AlterTable
ALTER TABLE "deposits" DROP COLUMN "method",
ALTER COLUMN "status" SET DEFAULT 'COMPLETED';

-- AlterTable
ALTER TABLE "settings" DROP COLUMN "botAlerts",
ADD COLUMN     "tradeAlerts" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD',
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "verificationCode" TEXT,
ADD COLUMN     "verificationExpiresAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "bot_activities";

-- DropTable
DROP TABLE "notifications";

-- DropTable
DROP TABLE "trading_bots";

-- DropTable
DROP TABLE "withdrawals";

-- DropEnum
DROP TYPE "BotStatus";

-- DropEnum
DROP TYPE "NotificationType";

-- DropEnum
DROP TYPE "WithdrawalStatus";

-- CreateTable
CREATE TABLE "trading_stats" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "totalPnl" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "todayPnl" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tradesCount" INTEGER NOT NULL DEFAULT 0,
    "winCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulated_trades" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "profitLoss" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "durationSeconds" INTEGER NOT NULL DEFAULT 20,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulated_trades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trading_stats_accountId_key" ON "trading_stats"("accountId");

-- CreateIndex
CREATE INDEX "simulated_trades_accountId_status_idx" ON "simulated_trades"("accountId", "status");

-- CreateIndex
CREATE INDEX "simulated_trades_accountId_createdAt_idx" ON "simulated_trades"("accountId", "createdAt");

-- AddForeignKey
ALTER TABLE "trading_stats" ADD CONSTRAINT "trading_stats_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulated_trades" ADD CONSTRAINT "simulated_trades_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

