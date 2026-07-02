import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors";
import { globalRateLimiter } from "./middleware/rateLimit.middleware";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import apiRouter from "./routes/index";

export const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(globalRateLimiter);

app.get("/health", (_req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/v1", apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
