import crypto from "node:crypto";
import { prisma } from "../../lib/prisma";
import { comparePassword, hashPassword } from "../../utils/password";
import { signAccessToken } from "../../utils/jwt";
import { AppError } from "../../utils/AppError";
import { logger } from "../../lib/logger";
import { createDefaultAccount } from "../accounts/account.service";
import { RegisterInput } from "./auth.schema";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000;

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function toPublicUser(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  country: string | null;
  currency: string;
  emailVerified: boolean;
  role: "USER" | "ADMIN";
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    country: user.country,
    currency: user.currency,
    emailVerified: user.emailVerified,
    role: user.role,
  };
}

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError("An account with this email already exists", 409);
  }

  const passwordHash = await hashPassword(input.password);
  const verificationCode = generateVerificationCode();

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      currency: input.currency,
      verificationCode,
      verificationExpiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
      settings: { create: {} },
    },
  });

  await createDefaultAccount(user.id, input.currency);

  logger.info(`[simulated email] Verification code for ${user.email}: ${verificationCode}`);

  return { user: toPublicUser(user), verificationCode };
}

export async function verifyEmail(email: string, code: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.verificationCode || !user.verificationExpiresAt) {
    throw new AppError("No pending verification for this email", 400);
  }
  if (user.verificationExpiresAt < new Date()) {
    throw new AppError("Verification code has expired. Please request a new one.", 400);
  }
  if (user.verificationCode !== code) {
    throw new AppError("Invalid verification code", 400);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verificationCode: null, verificationExpiresAt: null },
  });

  const token = signAccessToken({ userId: updated.id, email: updated.email, role: updated.role });

  return { user: toPublicUser(updated), token };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== "ACTIVE") {
    throw new AppError("Invalid email or password", 401);
  }

  const isValid = await comparePassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.emailVerified) {
    throw new AppError("Please verify your email before logging in", 403);
  }

  const token = signAccessToken({ userId: user.id, email: user.email, role: user.role });

  return { token, user: toPublicUser(user) };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found", 404);
  }
  return toPublicUser(user);
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal whether the email exists.
    return { resetToken: null };
  }

  const resetToken = crypto.randomBytes(20).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });

  logger.info(`[simulated email] Password reset token for ${email}: ${resetToken}`);

  return { resetToken };
}

export async function resetPassword(email: string, token: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.resetToken || !user.resetTokenExpiresAt) {
    throw new AppError("Invalid or expired reset token", 400);
  }
  if (user.resetTokenExpiresAt < new Date() || user.resetToken !== token) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiresAt: null },
  });

  return { message: "Password reset successfully" };
}
