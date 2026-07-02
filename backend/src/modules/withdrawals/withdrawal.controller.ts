import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import { listWithdrawals, createWithdrawal } from "./withdrawal.service";

export const getWithdrawals = asyncHandler(async (req: Request, res: Response) => {
  const withdrawals = await listWithdrawals(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, withdrawals);
});

export const postWithdrawal = asyncHandler(async (req: Request, res: Response) => {
  const withdrawal = await createWithdrawal(req.user!.userId, param(req.params.accountId), req.body);
  sendSuccess(res, withdrawal, 201);
});
