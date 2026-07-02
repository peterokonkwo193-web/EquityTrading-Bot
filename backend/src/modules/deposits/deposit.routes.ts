import { Router } from "express";
import { validateBody } from "../../middleware/validate.middleware";
import { createDepositSchema } from "./deposit.schema";
import { getDeposits, postDeposit } from "./deposit.controller";

const router = Router({ mergeParams: true });

router.get("/", getDeposits);
router.post("/", validateBody(createDepositSchema), postDeposit);

export default router;
