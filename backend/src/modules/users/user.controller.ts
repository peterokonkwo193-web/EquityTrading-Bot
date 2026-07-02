import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { getProfile, updateProfile, changePassword } from "./user.service";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const profile = await getProfile(req.user!.userId);
  sendSuccess(res, profile);
});

export const patchMe = asyncHandler(async (req: Request, res: Response) => {
  const profile = await updateProfile(req.user!.userId, req.body);
  sendSuccess(res, profile);
});

export const patchPassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const result = await changePassword(req.user!.userId, currentPassword, newPassword);
  sendSuccess(res, result);
});
