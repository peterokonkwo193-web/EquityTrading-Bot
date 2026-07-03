import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import { startTrade, getActiveTrade, getTradeHistory, getStats } from "./trades.service";

export const postStartTrade = asyncHandler(async (req: Request, res: Response) => {
  const trade = await startTrade(req.user!.userId, param(req.params.accountId), req.body);
  sendSuccess(res, trade, 201);
});

export const getActiveTradeHandler = asyncHandler(async (req: Request, res: Response) => {
  const trade = await getActiveTrade(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, trade);
});

export const getHistory = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const trades = await getTradeHistory(req.user!.userId, param(req.params.accountId), limit);
  sendSuccess(res, trades);
});

export const getStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const stats = await getStats(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, stats);
});
