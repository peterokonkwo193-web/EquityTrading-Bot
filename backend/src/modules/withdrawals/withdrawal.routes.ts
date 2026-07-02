import { Router } from "express";
import { validateBody } from "../../middleware/validate.middleware";
import { createWithdrawalSchema } from "./withdrawal.schema";
import { getWithdrawals, postWithdrawal } from "./withdrawal.controller";

const router = Router({ mergeParams: true });

router.get("/", getWithdrawals);
router.post("/", validateBody(createWithdrawalSchema), postWithdrawal);

export default router;
