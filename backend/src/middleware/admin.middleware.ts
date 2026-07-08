import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function adminMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }
  
  if (req.user.role !== "ADMIN") {
    throw new AppError("Forbidden: Administrator access required", 403);
  }

  next();
}
