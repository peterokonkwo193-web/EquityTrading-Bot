import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.token as string | undefined;
  const headerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : undefined;

  const token = cookieToken ?? headerToken;

  if (!token) {
    throw new AppError("Authentication required", 401);
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new AppError("Invalid or expired session", 401);
  }
}
