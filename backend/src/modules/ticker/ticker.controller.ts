import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { getTicker } from "./ticker.service";

export const getTickerHandler = asyncHandler(async (_req: Request, res: Response) => {
  const ticker = await getTicker();
  sendSuccess(res, ticker);
});
