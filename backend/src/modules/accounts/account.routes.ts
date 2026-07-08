import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import {
  getAccounts,
  getAccount,
  postConnectExchange,
  getExchangeConnection,
  deleteExchangeConnection,
} from "./account.controller";
import tradesRouter from "../trades/trades.routes";
import walletRouter from "../wallet/wallet.routes";

const router = Router();

router.use(authMiddleware);
router.get("/", getAccounts);
router.get("/:id", getAccount);
router.post("/:id/exchange", postConnectExchange);
router.get("/:id/exchange", getExchangeConnection);
router.delete("/:id/exchange", deleteExchangeConnection);

router.use("/:accountId/trades", tradesRouter);
router.use("/:accountId/wallet", walletRouter);

export default router;

