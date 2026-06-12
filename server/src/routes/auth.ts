import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { ensureUser } from "../cometchat/users.js";
import { mintAuthToken } from "../cometchat/auth-tokens.js";

export const authRouter = Router();

const loginBody = z.object({
  uid: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/, "uid must be alphanumeric, _, or -"),
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

/**
 * Demo login: pick a uid, get an auth token. Creates the user in CometChat and
 * mirrors it in our DB if it doesn't yet exist, then mints a fresh CometChat
 * auth token for the frontend SDK to log in with.
 */
authRouter.post("/api/login", async (req, res, next) => {
  try {
    const { uid, name, avatarUrl } = loginBody.parse(req.body);
    const displayName = name ?? uid;

    await ensureUser({ uid, name: displayName, avatar: avatarUrl });

    await prisma.user.upsert({
      where: { cometchatUid: uid },
      create: { cometchatUid: uid, name: displayName, avatarUrl },
      update: { name: displayName, avatarUrl },
    });

    const authToken = await mintAuthToken(uid);

    res.json({ uid, name: displayName, authToken });
  } catch (err) {
    next(err);
  }
});
