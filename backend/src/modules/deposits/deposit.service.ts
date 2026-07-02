import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getOwnedAccountOrThrow } from "../accounts/account.service";
import { CreateDepositInput } from "./deposit.schema";

export async function listDeposits(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  return prisma.deposit.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createDeposit(userId: string, accountId: string, input: CreateDepositInput) {
  await getOwnedAccountOrThrow(userId, accountId);
  const amount = new Prisma.Decimal(input.amount);

  const [deposit] = await prisma.$transaction([
    prisma.deposit.create({
      data: {
        accountId,
        amount,
        currency: input.currency,
        method: input.method,
        status: "COMPLETED",
      },
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
