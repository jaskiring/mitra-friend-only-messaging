import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

/**
 * Verifies the Basic-auth credentials CometChat sends with each Custom
 * Moderation webhook call. The credentials are configured in the CometChat
 * dashboard and must match MODERATION_WEBHOOK_USER / _PASSWORD on our side.
 */
export function basicAuthForModerationWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization") ?? "";
  if (!header.startsWith("Basic ")) {
    res.status(401).json({ error: "missing_basic_auth" });
    return;
  }
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    res.status(401).json({ error: "invalid_basic_auth" });
    return;
  }
  const idx = decoded.indexOf(":");
  if (idx === -1) {
    res.status(401).json({ error: "invalid_basic_auth" });
    return;
  }
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);
  if (
    user !== config.MODERATION_WEBHOOK_USER ||
    pass !== config.MODERATION_WEBHOOK_PASSWORD
  ) {
    res.status(401).json({ error: "bad_credentials" });
    return;
  }
  next();
}
