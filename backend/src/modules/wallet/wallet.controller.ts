import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import { getWallet, addVirtualFunds } from "./wallet.service";

export const getWalletHandler = asyncHandler(async (req: Request, res: Response) => {
  const wallet = await getWallet(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, wallet);
});

export const postAddFunds = asyncHandler(async (req: Request, res: Response) => {
  const deposit = await addVirtualFunds(req.user!.userId, param(req.params.accountId), req.body);
  sendSuccess(res, deposit, 201);
});
