import { Router } from "express";
import { validateBody } from "../../middleware/validate.middleware";
import { addFundsSchema } from "./wallet.schema";
import { getWalletHandler, postAddFunds } from "./wallet.controller";

const router = Router({ mergeParams: true });

router.get("/", getWalletHandler);
router.post("/add-funds", validateBody(addFundsSchema), postAddFunds);

export default router;
