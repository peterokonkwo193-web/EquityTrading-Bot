import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { getAccounts, getAccount } from "./account.controller";
import botRouter from "../bot/bot.routes";
import depositRouter from "../deposits/deposit.routes";
import withdrawalRouter from "../withdrawals/withdrawal.routes";

const router = Router();

router.use(authMiddleware);
router.get("/", getAccounts);
router.get("/:id", getAccount);
router.use("/:accountId/bot", botRouter);
router.use("/:accountId/deposits", depositRouter);
router.use("/:accountId/withdrawals", withdrawalRouter);

export default router;
