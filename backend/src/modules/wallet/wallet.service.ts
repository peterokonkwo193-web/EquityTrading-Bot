import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getOwnedAccountOrThrow } from "../accounts/account.service";
import { getTicker } from "../ticker/ticker.service";
import { AppError } from "../../utils/AppError";


export async function getAssetUsdPrice(asset: string): Promise<number> {
  const cleanAsset = asset.toUpperCase();
  if (cleanAsset === "USDT" || cleanAsset === "USDC") return 1.0;
  
  try {
    const tickers = await getTicker();
    const found = tickers.find((t) => t.symbol === cleanAsset);
    if (found && found.price > 0) {
      return found.price;
    }
  } catch {
    // Ignore and fall back to hardcoded defaults
  }

  const fallbacks: Record<string, number> = {
    BTC: 65000,
    ETH: 3400,
    BNB: 580,
    TRX: 0.13,
  };

  return fallbacks[cleanAsset] ?? 1.0;
}

export function convertUsdToFiat(usdAmount: number, targetCurrency: string): number {
  const currency = targetCurrency.toUpperCase();
  const rates: Record<string, number> = {
    USD: 1.0,
    GBP: 0.78,
    EUR: 0.92,
  };
  const rate = rates[currency] ?? 1.0;
  return usdAmount * rate;
}

export async function getWallet(userId: string, accountId: string) {
  const account = await getOwnedAccountOrThrow(userId, accountId);
  
  const txs = await prisma.walletTransaction.findMany({
    where: { accountId },
  });

  let totalDeposits = new Prisma.Decimal(0);
  let totalWithdrawals = new Prisma.Decimal(0);
  let pendingDeposits = new Prisma.Decimal(0);
  let pendingWithdrawals = new Prisma.Decimal(0);

  txs.forEach((tx) => {
    if (tx.type === "DEPOSIT") {
      if (tx.status === "APPROVED") {
        totalDeposits = totalDeposits.plus(tx.fiatAmount);
      } else if (tx.status === "PENDING") {
        pendingDeposits = pendingDeposits.plus(tx.fiatAmount);
      }
    } else if (tx.type === "WITHDRAWAL") {
      if (tx.status === "APPROVED") {
        totalWithdrawals = totalWithdrawals.plus(tx.fiatAmount);
      } else if (tx.status === "PENDING") {
        pendingWithdrawals = pendingWithdrawals.plus(tx.fiatAmount);
      }
    }
  });

  const history = await prisma.walletTransaction.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });

  return {
    balance: account.balance,
    currency: account.currency,
    totalDeposits,
    totalWithdrawals,
    pendingDeposits,
    pendingWithdrawals,
    fundingHistory: history,
  };
}

export async function createDepositRequest(
  userId: string,
  accountId: string,
  input: { amount: number; asset: string; network: string; paymentProof?: string }
) {
  const account = await getOwnedAccountOrThrow(userId, accountId);

  const cryptoAmount = new Prisma.Decimal(input.amount);
  
  const usdPrice = await getAssetUsdPrice(input.asset);
  const totalUsd = input.amount * usdPrice;
  const fiatAmountValue = convertUsdToFiat(totalUsd, account.currency);
  const fiatAmount = new Prisma.Decimal(fiatAmountValue);

  const tx = await prisma.walletTransaction.create({
    data: {
      accountId,
      type: "DEPOSIT",
      asset: input.asset,
      network: input.network,
      amount: cryptoAmount,
      fiatAmount,
      status: "PENDING",
      paymentProof: input.paymentProof,
    },
  });

  return tx;
}

export async function createWithdrawalRequest(
  userId: string,
  accountId: string,
  input: { amount: number; asset: string; network: string; destinationAddress: string }
) {
  const account = await getOwnedAccountOrThrow(userId, accountId);
  const cryptoAmount = new Prisma.Decimal(input.amount);

  const usdPrice = await getAssetUsdPrice(input.asset);
  const totalUsd = input.amount * usdPrice;
  const fiatAmountValue = convertUsdToFiat(totalUsd, account.currency);
  const fiatAmount = new Prisma.Decimal(fiatAmountValue);

  if (account.balance.lessThan(fiatAmount)) {
    throw new AppError("Insufficient balance for this withdrawal request", 400);
  }

  const tx = await prisma.walletTransaction.create({
    data: {
      accountId,
      type: "WITHDRAWAL",
      asset: input.asset,
      network: input.network,
      amount: cryptoAmount,
      fiatAmount,
      destinationAddress: input.destinationAddress,
      status: "PENDING",
    },
  });

  return tx;
}

