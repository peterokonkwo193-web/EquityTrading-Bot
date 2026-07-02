import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import { getBot, startBot, pauseBot, stopBot, getActivity } from "./bot.service";

export const getBotStatus = asyncHandler(async (req: Request, res: Response) => {
  const bot = await getBot(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, bot);
});

export const postStart = asyncHandler(async (req: Request, res: Response) => {
  const bot = await startBot(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, bot);
});

export const postPause = asyncHandler(async (req: Request, res: Response) => {
  const bot = await pauseBot(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, bot);
});

export const postStop = asyncHandler(async (req: Request, res: Response) => {
  const bot = await stopBot(req.user!.userId, param(req.params.accountId));
  sendSuccess(res, bot);
});

export const getBotActivity = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const activity = await getActivity(req.user!.userId, param(req.params.accountId), limit);
  sendSuccess(res, activity);
});
