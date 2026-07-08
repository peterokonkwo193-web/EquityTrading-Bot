import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { adminMiddleware } from "../../middleware/admin.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { reviewTransactionSchema, adjustBalanceSchema } from "./admin.schema";
import {
  getUsersHandler,
  getUserDetailHandler,
  getPendingTransactionsHandler,
  postReviewTransactionHandler,
  getAuditLogsHandler,
  postAdjustBalanceHandler,
} from "./admin.controller";

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/users", getUsersHandler);
router.get("/users/:id", getUserDetailHandler);
router.get("/transactions", getPendingTransactionsHandler);
router.post("/transactions/:id/review", validateBody(reviewTransactionSchema), postReviewTransactionHandler);
router.get("/audit-logs", getAuditLogsHandler);
router.post(
  "/users/:userId/accounts/:accountId/adjust-balance",
  validateBody(adjustBalanceSchema),
  postAdjustBalanceHandler
);

export default router;
