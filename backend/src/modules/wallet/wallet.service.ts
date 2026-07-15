import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getOwnedAccountOrThrow } from "../accounts/account.service";
import { AppError } from "../../utils/AppError";

export const MEMBERSHIP_FEE = 200;
const MEMBERSHIP_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

function isMembershipActive(account: { membershipActive: boolean; membershipExpiresAt: Date | null }) {
  if (!account.membershipActive) return false;
  if (!account.membershipExpiresAt) return true;
  return account.membershipExpiresAt.getTime() > Date.now();
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

  // Trading limit scales with cumulative approved deposits: every $100
  // deposited unlocks $10,000 of tradeable account limit. New deposits
  // raise the ceiling; the bot halts once balance reaches it. Once total
  // deposits reach 1,000 (in the account's currency), the limit is lifted.
  const accountLimit = totalDeposits.greaterThanOrEqualTo(1000) ? null : totalDeposits.times(100);

  return {
    balance: account.balance,
    currency: account.currency,
    totalDeposits,
    totalWithdrawals,
    pendingDeposits,
    pendingWithdrawals,
    accountLimit,
    membershipActive: isMembershipActive(account),
    membershipExpiresAt: account.membershipExpiresAt,
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
  // The amount the user types in is taken as-is as the deposit's value in
  // their account's own currency — no crypto/USD price conversion.
  const fiatAmount = cryptoAmount;

  if (input.amount < 100) {
    throw new AppError(`Minimum deposit is 100 ${account.currency}`, 400);
  }

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

  if (!isMembershipActive(account)) {
    throw new AppError("Membership subscription required before withdrawing", 403);
  }

  if (input.amount < 200) {
    throw new AppError(`Minimum withdrawal is 200 ${account.currency}`, 400);
  }

  const cryptoAmount = new Prisma.Decimal(input.amount);
  // The amount the user types in is taken as-is as the withdrawal's value in
  // their account's own currency — no crypto/USD price conversion.
  const fiatAmount = cryptoAmount;

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

export async function createSubscriptionRequest(
  userId: string,
  accountId: string,
  input: { asset: string; network: string; paymentProof?: string }
) {
  const account = await getOwnedAccountOrThrow(userId, accountId);

  if (isMembershipActive(account)) {
    throw new AppError("Membership is already active on this account", 400);
  }

  const fee = new Prisma.Decimal(MEMBERSHIP_FEE);

  const tx = await prisma.walletTransaction.create({
    data: {
      accountId,
      type: "SUBSCRIPTION",
      asset: input.asset,
      network: input.network,
      amount: fee,
      fiatAmount: fee,
      status: "PENDING",
      paymentProof: input.paymentProof,
    },
  });

  return tx;
}

