import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { encrypt } from "../../utils/encryption";
import { validateExchangeCredentials } from "../trades/exchange.service";

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

function generateAccountNumber() {
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `ACC-${suffix}`;
}

export async function createDefaultAccount(userId: string, currency: string) {
  const account = await prisma.account.create({
    data: {
      userId,
      name: "Main Account",
      accountNumber: generateAccountNumber(),
      balance: 0,
      currency,
    },
  });
  await prisma.tradingStats.create({ data: { accountId: account.id } });
  return account;
}

export async function connectExchangeAccount(
  userId: string,
  accountId: string,
  exchange: string,
  apiKey: string,
  apiSecret: string
) {
  await getOwnedAccountOrThrow(userId, accountId);

  const isValid = await validateExchangeCredentials(exchange, apiKey, apiSecret);
  if (!isValid) {
    throw new AppError("Invalid API key or secret for the selected exchange", 400);
  }

  const encryptedKey = encrypt(apiKey);
  const encryptedSecret = encrypt(apiSecret);

  const connection = await prisma.exchangeConnection.upsert({
    where: { accountId },
    update: {
      exchange: exchange.toUpperCase(),
      apiKey: encryptedKey,
      apiSecretEncrypted: encryptedSecret,
    },
    create: {
      accountId,
      exchange: exchange.toUpperCase(),
      apiKey: encryptedKey,
      apiSecretEncrypted: encryptedSecret,
    },
  });

  const visibleLength = Math.min(apiKey.length, 4);
  return {
    id: connection.id,
    exchange: connection.exchange,
    apiKeyMasked: `${apiKey.slice(0, visibleLength)}******`,
  };
}

export async function getExchangeConnectionDetail(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  const conn = await prisma.exchangeConnection.findUnique({
    where: { accountId },
  });
  if (!conn) return null;
  return {
    id: conn.id,
    exchange: conn.exchange,
    apiKeyMasked: `******`,
  };
}

export async function disconnectExchangeAccount(userId: string, accountId: string) {
  await getOwnedAccountOrThrow(userId, accountId);
  try {
    await prisma.exchangeConnection.delete({
      where: { accountId },
    });
  } catch {
    // If it doesn't exist, ignore
  }
  return { success: true };
}

