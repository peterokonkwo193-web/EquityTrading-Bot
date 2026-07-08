import { Router } from "express";
import { validateBody } from "../../middleware/validate.middleware";
import { startTradeSchema, settleBotTradeSchema } from "./trades.schema";
import { postStartTrade, getActiveTradeHandler, getHistory, getStatsHandler, postSettleBotTrade } from "./trades.controller";

const router = Router({ mergeParams: true });

router.get("/", getHistory);
router.get("/active", getActiveTradeHandler);
router.get("/stats", getStatsHandler);
router.post("/", validateBody(startTradeSchema), postStartTrade);
router.post("/settle", validateBody(settleBotTradeSchema), postSettleBotTrade);

export default router;
