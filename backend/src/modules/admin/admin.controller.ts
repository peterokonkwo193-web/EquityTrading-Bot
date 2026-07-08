import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { param } from "../../utils/params";
import {
  listUsers,
  getUserDetail,
  listPendingTransactions,
  reviewTransaction,
  listAuditLogs,
  adjustBalance,
} from "./admin.service";

export const getUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const searchQuery = req.query.search ? String(req.query.search) : undefined;
  const users = await listUsers(searchQuery);
  sendSuccess(res, users);
});

export const getUserDetailHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserDetail(param(req.params.id));
  sendSuccess(res, user);
});

export const getPendingTransactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const pending = await listPendingTransactions();
  sendSuccess(res, pending);
});

export const postReviewTransactionHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewTransaction(
    req.user!.userId,
    param(req.params.id),
    req.body.status,
    req.body.amount
  );
  sendSuccess(res, result);
});

export const getAuditLogsHandler = asyncHandler(async (req: Request, res: Response) => {
  const logs = await listAuditLogs();
  sendSuccess(res, logs);
});

export const postAdjustBalanceHandler = asyncHandler(async (req: Request, res: Response) => {
  const account = await adjustBalance(
    req.user!.userId,
    param(req.params.userId),
    param(req.params.accountId),
    req.body.amount,
    req.body.note
  );
  sendSuccess(res, account);
});
