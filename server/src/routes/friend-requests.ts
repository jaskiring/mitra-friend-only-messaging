import { Router } from "express";
import { z } from "zod";
import {
  acceptRequest,
  getFriendshipStatus,
  listFriends,
  listRequests,
  rejectRequest,
  sendRequest,
} from "../services/friend-requests.js";
import { requireUser } from "../middleware/require-user.js";

export const friendRequestsRouter = Router();

const sendBody = z.object({ to: z.string().min(1) });
const idParam = z.object({ id: z.string().min(1) });
const listQuery = z.object({
  direction: z.enum(["incoming", "outgoing"]).default("incoming"),
  pendingOnly: z.coerce.boolean().default(true),
});

friendRequestsRouter.post("/api/requests", requireUser, async (req, res, next) => {
  try {
    const { to } = sendBody.parse(req.body);
    const row = await sendRequest(req.userUid!, to);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

friendRequestsRouter.post("/api/requests/:id/accept", requireUser, async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const row = await acceptRequest(id, req.userUid!);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

friendRequestsRouter.post("/api/requests/:id/reject", requireUser, async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const row = await rejectRequest(id, req.userUid!);
    res.json(row);
  } catch (err) {
    next(err);
  }
});

friendRequestsRouter.get("/api/requests", requireUser, async (req, res, next) => {
  try {
    const { direction, pendingOnly } = listQuery.parse(req.query);
    const rows = await listRequests(req.userUid!, direction, pendingOnly);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

friendRequestsRouter.get("/api/friends", requireUser, async (req, res, next) => {
  try {
    const uids = await listFriends(req.userUid!);
    res.json(uids);
  } catch (err) {
    next(err);
  }
});

const statusParam = z.object({ uid: z.string().min(1) });

friendRequestsRouter.get("/api/friendship-status/:uid", requireUser, async (req, res, next) => {
  try {
    const { uid } = statusParam.parse(req.params);
    const status = await getFriendshipStatus(req.userUid!, uid);
    res.json({ status });
  } catch (err) {
    next(err);
  }
});
