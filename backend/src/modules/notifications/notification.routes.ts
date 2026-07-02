import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { getNotifications, patchRead, patchReadAll } from "./notification.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", getNotifications);
router.patch("/read-all", patchReadAll);
router.patch("/:id/read", patchRead);

export default router;
