import { Router } from "express";
import {
  login,
  logout,
  me,
  register,
  verifyEmailHandler,
  forgotPassword,
  resetPasswordHandler,
} from "./auth.controller";
import { validateBody } from "../../middleware/validate.middleware";
import {
  loginSchema,
  registerSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schema";
import { authMiddleware } from "../../middleware/auth.middleware";
import { loginRateLimiter } from "../../middleware/rateLimit.middleware";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/verify-email", validateBody(verifyEmailSchema), verifyEmailHandler);
router.post("/login", loginRateLimiter, validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);
router.post("/forgot-password", loginRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPasswordHandler);

export default router;
