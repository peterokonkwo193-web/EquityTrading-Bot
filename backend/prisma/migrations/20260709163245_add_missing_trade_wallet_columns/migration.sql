-- AlterTable
ALTER TABLE "simulated_trades" ADD COLUMN     "entryPrice" DECIMAL(18,8),
ADD COLUMN     "exchangeOrderId" TEXT,
ADD COLUMN     "exitPrice" DECIMAL(18,8);

-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "txHash" TEXT;

-- CreateTable
CREATE TABLE "exchange_connections" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecretEncrypted" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_connections_accountId_key" ON "exchange_connections"("accountId");

-- AddForeignKey
ALTER TABLE "exchange_connections" ADD CONSTRAINT "exchange_connections_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
