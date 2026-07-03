import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import accountRoutes from "../modules/accounts/account.routes";
import settingsRoutes from "../modules/settings/settings.routes";
import tickerRoutes from "../modules/ticker/ticker.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/accounts", accountRoutes);
router.use("/settings", settingsRoutes);
router.use("/ticker", tickerRoutes);

export default router;
