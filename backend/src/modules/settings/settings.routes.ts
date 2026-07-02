import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { updateSettingsSchema } from "./settings.schema";
import { get, patch } from "./settings.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", get);
router.patch("/", validateBody(updateSettingsSchema), patch);

export default router;
