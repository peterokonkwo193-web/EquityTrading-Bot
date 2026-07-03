import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { comparePassword, hashPassword } from "../../utils/password";
import { UpdateProfileInput } from "./user.schema";

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { accounts: true },
  });
  if (!user) throw new AppError("User not found", 404);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    currency: user.currency,
    createdAt: user.createdAt,
    accounts: user.accounts.map((a) => ({ id: a.id, name: a.name, accountNumber: a.accountNumber })),
  };
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
  });
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, currency: user.currency };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const isValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError("Current password is incorrect", 400);

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { message: "Password updated successfully" };
}
