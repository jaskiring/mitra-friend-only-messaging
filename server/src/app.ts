import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { requestContext } from "./middleware/request-context.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { healthRouter } from "./routes/health.js";
import { friendRequestsRouter } from "./routes/friend-requests.js";
import { authRouter } from "./routes/auth.js";
import { moderationWebhookRouter } from "./routes/moderation-webhook.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestContext);

  app.use(healthRouter);
  app.use(authRouter);
  app.use(friendRequestsRouter);
  app.use(moderationWebhookRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
