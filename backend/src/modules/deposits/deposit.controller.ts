import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import { listDeposits, createDeposit } from "./deposit.service";

export const getDeposits = asyncHandler(async (req: Request, res: Response) => {
  const deposits = await listDeposits(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, deposits);
});

export const postDeposit = asyncHandler(async (req: Request, res: Response) => {
  const deposit = await createDeposit(req.user!.userId, param(req.params.accountId), req.body);
  sendSuccess(res, deposit, 201);
});
