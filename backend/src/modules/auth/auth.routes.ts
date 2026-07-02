import { Router } from "express";
import { login, logout, me } from "./auth.controller";
import { validateBody } from "../../middleware/validate.middleware";
import { loginSchema } from "./auth.schema";
import { authMiddleware } from "../../middleware/auth.middleware";
import { loginRateLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

router.post("/login", loginRateLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);

export default router;
