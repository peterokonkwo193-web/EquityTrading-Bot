import { Router } from "express";
import { validateBody } from "../../middleware/validate.middleware";
import { startTradeSchema } from "./trades.schema";
import { postStartTrade, getActiveTradeHandler, getHistory, getStatsHandler } from "./trades.controller";

const router = Router({ mergeParams: true });

router.get("/", getHistory);
router.get("/active", getActiveTradeHandler);
router.get("/stats", getStatsHandler);
router.post("/", validateBody(startTradeSchema), postStartTrade);

export default router;
