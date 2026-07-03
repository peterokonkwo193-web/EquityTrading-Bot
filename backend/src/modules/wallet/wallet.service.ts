import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getOwnedAccountOrThrow } from "../accounts/account.service";
import { AddFundsInput } from "./wallet.schema";

export async function getWallet(userId: string, accountId: string) {
  const account = await getOwnedAccountOrThrow(userId, accountId);
  const fundingHistory = await prisma.deposit.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return {
    balance: account.balance,
    currency: account.currency,
    fundingHistory,
  };
}

export async function addVirtualFunds(userId: string, accountId: string, input: AddFundsInput) {
  await getOwnedAccountOrThrow(userId, accountId);
  const amount = new Prisma.Decimal(input.amount);

  const [deposit] = await prisma.$transaction([
    prisma.deposit.create({
      data: { accountId, amount, currency: input.currency, status: "COMPLETED" },
    }),
    prisma.transaction.create({
      data: { accountId, type: "DEPOSIT", amount, status: "COMPLETED" },
    }),
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: amount } },
    }),
  ]);

  return deposit;
}
