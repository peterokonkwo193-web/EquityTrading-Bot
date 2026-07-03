import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { getTickerHandler } from "./ticker.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", getTickerHandler);

export default router;
