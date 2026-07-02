import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import { listAccounts, getAccountDetail } from "./account.service";

export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await listAccounts(req.user!.userId);
  sendSuccess(res, accounts);
});

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await getAccountDetail(req.user!.userId, param(req.params.id));
  sendSuccess(res, account);
});
