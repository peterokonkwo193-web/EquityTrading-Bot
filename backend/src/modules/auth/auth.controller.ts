import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import {
  loginUser,
  getCurrentUser,
  registerUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from "./auth.service";
import { env } from "../../config/env";

const SESSION_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const REMEMBER_ME_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function setSessionCookie(res: Response, token: string, rememberMe: boolean) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: rememberMe ? REMEMBER_ME_COOKIE_MAX_AGE_MS : SESSION_COOKIE_MAX_AGE_MS,
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, verificationCode } = await registerUser(req.body);
  sendSuccess(res, { user, verificationCode }, 201);
});

export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = req.body;
  const user = await verifyEmail(email, code);
  sendSuccess(res, user);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;
  const { token, user } = await loginUser(email, password);

  setSessionCookie(res, token, rememberMe);

  sendSuccess(res, { token, user });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("token");
  sendSuccess(res, { message: "Logged out" });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await getCurrentUser(req.user!.userId);
  sendSuccess(res, user);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { resetToken } = await requestPasswordReset(req.body.email);
  sendSuccess(res, { resetToken });
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;
  const result = await resetPassword(email, token, newPassword);
  sendSuccess(res, result);
});
