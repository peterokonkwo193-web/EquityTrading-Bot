import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export async function listUsers(searchQuery?: string) {
  const where: Prisma.UserWhereInput = {};
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { email: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      currency: true,
      status: true,
      role: true,
      createdAt: true,
      accounts: {
        select: {
          id: true,
          name: true,
          accountNumber: true,
          balance: true,
          currency: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        include: {
          walletTransactions: {
            orderBy: { createdAt: "desc" },
          },
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
          trades: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    currency: user.currency,
    status: user.status,
    role: user.role,
    createdAt: user.createdAt,
    accounts: user.accounts.map((acc) => ({
      id: acc.id,
      name: acc.name,
      accountNumber: acc.accountNumber,
      balance: acc.balance,
      currency: acc.currency,
      status: acc.status,
      walletTransactions: acc.walletTransactions,
      transactions: acc.transactions,
      trades: acc.trades,
    })),
  };
}

export async function listPendingTransactions() {
  const pending = await prisma.walletTransaction.findMany({
    where: { status: "PENDING" },
    include: {
      account: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return pending;
}

export async function reviewTransaction(
  adminId: string,
  transactionId: string,
  status: "APPROVED" | "REJECTED",
  amountOverride?: number
) {
  const tx = await prisma.walletTransaction.findUnique({
    where: { id: transactionId },
    include: { account: true },
  });

  if (!tx) {
    throw new AppError("Transaction request not found", 404);
  }

  if (tx.status !== "PENDING") {
    throw new AppError("Transaction has already been reviewed", 400);
  }

  const effectiveAmount =
    amountOverride !== undefined ? new Prisma.Decimal(amountOverride) : tx.fiatAmount;

  const updatedTx = await prisma.$transaction(async (db) => {
    if (status === "APPROVED") {
      if (tx.type === "DEPOSIT") {
        await db.account.update({
          where: { id: tx.accountId },
          data: { balance: { increment: effectiveAmount } },
        });
      } else if (tx.type === "WITHDRAWAL") {
        const freshAccount = await db.account.findUnique({
          where: { id: tx.accountId },
        });

        if (!freshAccount || freshAccount.balance.lessThan(effectiveAmount)) {
          throw new AppError("User has insufficient funds to fulfill this withdrawal", 400);
        }

        await db.account.update({
          where: { id: tx.accountId },
          data: { balance: { decrement: effectiveAmount } },
        });
      }
    }

    const result = await db.walletTransaction.update({
      where: { id: transactionId },
      data: { status, fiatAmount: effectiveAmount },
    });

    const actionLabel = tx.type === "DEPOSIT" ? "DEPOSIT_REVIEW" : "WITHDRAWAL_REVIEW";
    const amountNote =
      amountOverride !== undefined ? ` (admin-adjusted from ${tx.fiatAmount})` : "";
    const details = `${status} ${tx.type.toLowerCase()} request of ${tx.amount} ${tx.asset} (${effectiveAmount} ${tx.account.currency}${amountNote}) for account ${tx.account.accountNumber}`;

    await db.auditLog.create({
      data: {
        administratorId: adminId,
        action: actionLabel,
        details,
      },
    });

    return result;
  });

  return updatedTx;
}

export async function listAuditLogs() {
  const logs = await prisma.auditLog.findMany({
    include: {
      administrator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return logs;
}

export async function adjustBalance(
  adminId: string,
  userId: string,
  accountId: string,
  amount: number,
  note?: string
) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });

  if (!account) {
    throw new AppError("Account not found for this user", 404);
  }

  const decimalAmount = new Prisma.Decimal(amount);

  if (decimalAmount.isNegative() && account.balance.lessThan(decimalAmount.abs())) {
    throw new AppError("Cannot deduct more than the account's current balance", 400);
  }

  const [updatedAccount] = await prisma.$transaction([
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: decimalAmount } },
    }),
    prisma.walletTransaction.create({
      data: {
        accountId,
        type: decimalAmount.isPositive() ? "DEPOSIT" : "WITHDRAWAL",
        asset: account.currency,
        network: "ADMIN_ADJUSTMENT",
        amount: decimalAmount.abs(),
        fiatAmount: decimalAmount.abs(),
        status: "APPROVED",
      },
    }),
    prisma.auditLog.create({
      data: {
        administratorId: adminId,
        action: "BALANCE_ADJUSTMENT",
        details: `${decimalAmount.isPositive() ? "Credited" : "Debited"} ${decimalAmount.abs()} ${account.currency} ${
          decimalAmount.isPositive() ? "to" : "from"
        } account ${account.accountNumber}${note ? ` — note: ${note}` : ""}`,
      },
    }),
  ]);

  return updatedAccount;
}
