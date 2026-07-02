import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { getMe, patchMe, patchPassword } from "./user.controller";
import { updateProfileSchema, changePasswordSchema } from "./user.schema";

const router = Router();

router.use(authMiddleware);
router.get("/me", getMe);
router.patch("/me", validateBody(updateProfileSchema), patchMe);
router.patch("/me/password", validateBody(changePasswordSchema), patchPassword);

export default router;
