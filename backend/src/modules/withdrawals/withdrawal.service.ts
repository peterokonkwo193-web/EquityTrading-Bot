import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getOwnedAccountOrThrow } from "../accounts/account.service";
import { CreateWithdrawalInput } from "./withdrawal.schema";

export async function listWithdrawals(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  return prisma.withdrawal.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createWithdrawal(userId: string, accountId: string, input: CreateWithdrawalInput) {
  const account = await getOwnedAccountOrThrow(userId, accountId);
  const amount = new Prisma.Decimal(input.amount);

  if (amount.greaterThan(account.balance)) {
    throw new AppError("Insufficient balance for this withdrawal", 400);
  }

  const [withdrawal] = await prisma.$transaction([
    prisma.withdrawal.create({
      data: {
        accountId,
        amount,
        destination: input.destination,
        status: "COMPLETED",
      },
    }),
    prisma.transaction.create({
      data: { accountId, type: "WITHDRAWAL", amount, status: "COMPLETED" },
    }),
    prisma.account.update({
      where: { id: accountId },
      data: { balance: { decrement: amount } },
    }),
  ]);

  return withdrawal;
}
