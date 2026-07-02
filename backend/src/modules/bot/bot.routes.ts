import { Router } from "express";
import { getBotStatus, postStart, postPause, postStop, getBotActivity } from "./bot.controller";

const router = Router({ mergeParams: true });

router.get("/", getBotStatus);
router.post("/start", postStart);
router.post("/pause", postPause);
router.post("/stop", postStop);
router.get("/activity", getBotActivity);

export default router;
