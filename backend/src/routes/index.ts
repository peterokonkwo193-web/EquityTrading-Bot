import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import accountRoutes from "../modules/accounts/account.routes";
import notificationRoutes from "../modules/notifications/notification.routes";
import settingsRoutes from "../modules/settings/settings.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/accounts", accountRoutes);
router.use("/notifications", notificationRoutes);
router.use("/settings", settingsRoutes);

export default router;
