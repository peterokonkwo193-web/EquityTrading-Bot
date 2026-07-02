import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { loginUser, getCurrentUser } from "./auth.service";
import { env } from "../../config/env";

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { token, user } = await loginUser(email, password);

  res.cookie("token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_MS,
  });

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
