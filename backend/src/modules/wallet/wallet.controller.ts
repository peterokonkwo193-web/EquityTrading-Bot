import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import { getWallet, createDepositRequest, createWithdrawalRequest } from "./wallet.service";

export const getWalletHandler = asyncHandler(async (req: Request, res: Response) => {
  const wallet = await getWallet(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, wallet);
});

export const postDepositRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const deposit = await createDepositRequest(req.user!.userId, param(req.params.accountId), req.body);
  sendSuccess(res, deposit, 201);
});

export const postWithdrawalRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const withdrawal = await createWithdrawalRequest(req.user!.userId, param(req.params.accountId), req.body);
  sendSuccess(res, withdrawal, 201);
});

