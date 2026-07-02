import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

export async function listAccounts(userId: string) {
  return prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOwnedAccountOrThrow(userId: string, accountId: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) {
    throw new AppError("Account not found", 404);
  }
  return account;
}

export async function getAccountDetail(userId: string, accountId: string) {
  return getOwnedAccountOrThrow(userId, accountId);
}
