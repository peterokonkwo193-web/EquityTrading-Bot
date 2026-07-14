-- AlterEnum
ALTER TYPE "WalletTxType" ADD VALUE 'SUBSCRIPTION';

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "membershipActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "membershipExpiresAt" TIMESTAMP(3);
