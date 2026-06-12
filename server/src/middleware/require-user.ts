import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userUid?: string;
    }
  }
}

/**
 * Demo-grade auth: the client sends `x-user-uid` and we trust it. In a real
 * deployment this middleware is the single place to swap in session/JWT
 * validation — the rest of the app only reads `req.userUid`.
 *
 * Lazily upserts the user so DB foreign keys are always satisfied.
 */
export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const uid = req.header("x-user-uid");
  if (!uid || typeof uid !== "string" || uid.length === 0) {
    res.status(401).json({ error: "missing_user" });
    return;
  }
  try {
    await prisma.user.upsert({
      where: { cometchatUid: uid },
      create: { cometchatUid: uid, name: uid },
      update: {},
    });
    req.userUid = uid;
    next();
  } catch (err) {
    next(err);
  }
}
