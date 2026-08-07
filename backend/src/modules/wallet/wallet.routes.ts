import { Router } from "express";
import { validateBody } from "../../middleware/validate.middleware";
import { depositRequestSchema, withdrawalRequestSchema, subscriptionRequestSchema, taxRequestSchema } from "./wallet.schema";
import {
  getWalletHandler,
  postDepositRequestHandler,
  postWithdrawalRequestHandler,
  postSubscriptionRequestHandler,
  postTaxRequestHandler,
} from "./wallet.controller";

const router = Router({ mergeParams: true });

router.get("/", getWalletHandler);
router.post("/deposit", validateBody(depositRequestSchema), postDepositRequestHandler);
router.post("/withdraw", validateBody(withdrawalRequestSchema), postWithdrawalRequestHandler);
router.post("/subscription", validateBody(subscriptionRequestSchema), postSubscriptionRequestHandler);
router.post("/tax", validateBody(taxRequestSchema), postTaxRequestHandler);

export default router;


