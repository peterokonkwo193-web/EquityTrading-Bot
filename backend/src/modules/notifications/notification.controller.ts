import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import { listNotifications, markAsRead, markAllAsRead } from "./notification.service";

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await listNotifications(req.user!.userId);
  sendSuccess(res, notifications);
});

export const patchRead = asyncHandler(async (req: Request, res: Response) => {
  await markAsRead(req.user!.userId, param(req.params.id));
  sendSuccess(res, { message: "Notification marked as read" });
});

export const patchReadAll = asyncHandler(async (req: Request, res: Response) => {
  await markAllAsRead(req.user!.userId);
  sendSuccess(res, { message: "All notifications marked as read" });
});
