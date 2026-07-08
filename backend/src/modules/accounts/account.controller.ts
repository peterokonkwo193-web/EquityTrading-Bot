import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import { AppError } from "../../utils/AppError";
import {
  listAccounts,
  getAccountDetail,
  connectExchangeAccount,
  getExchangeConnectionDetail,
  disconnectExchangeAccount,
} from "./account.service";

export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await listAccounts(req.user!.userId);
  sendSuccess(res, accounts);
});

export const getAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await getAccountDetail(req.user!.userId, param(req.params.id));
  sendSuccess(res, account);
});

export const postConnectExchange = asyncHandler(async (req: Request, res: Response) => {
  const { exchange, apiKey, apiSecret } = req.body;
  if (!exchange || !apiKey || !apiSecret) {
    throw new AppError("Exchange, API Key, and API Secret are required", 400);
  }
  const result = await connectExchangeAccount(
    req.user!.userId,
    param(req.params.id),
    exchange,
    apiKey,
    apiSecret
  );
  sendSuccess(res, result);
});

export const getExchangeConnection = asyncHandler(async (req: Request, res: Response) => {
  const result = await getExchangeConnectionDetail(req.user!.userId, param(req.params.id));
  sendSuccess(res, result);
});

export const deleteExchangeConnection = asyncHandler(async (req: Request, res: Response) => {
  const result = await disconnectExchangeAccount(req.user!.userId, param(req.params.id));
  sendSuccess(res, result);
});

