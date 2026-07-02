import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { getSettings, updateSettings } from "./settings.service";

export const get = asyncHandler(async (req: Request, res: Response) => {
  const settings = await getSettings(req.user!.userId);
  sendSuccess(res, settings);
});

export const patch = asyncHandler(async (req: Request, res: Response) => {
  const settings = await updateSettings(req.user!.userId, req.body);
  sendSuccess(res, settings);
});
