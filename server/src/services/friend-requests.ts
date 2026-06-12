import type { Friendship } from "@prisma/client";
import {
  createPending,
  findByPair,
  findById,
  listAcceptedFriends,
  listForUser,
  reopenAsPending,
  updateStatus,
} from "../db/repositories/friendships.js";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../middleware/error.js";
import { addFriendship } from "../cometchat/friends.js";
import { sendCustomMessage } from "../cometchat/messages.js";

/**
 * Ensure a user row exists for the given uid, so the friendship FK to the
 * recipient is satisfied even if that user hasn't logged in here yet.
 */
async function ensureUser(uid: string): Promise<void> {
  await prisma.user.upsert({
    where: { cometchatUid: uid },
    create: { cometchatUid: uid, name: uid },
    update: {},
  });
}

/**
 * Send a friend request from `requester` to `recipient`.
 *
 * Rules:
 *   - cannot request yourself
 *   - pending: reject duplicate
 *   - accepted: already friends, no-op
 *   - rejected: allow re-request by reopening as pending
 */
export async function sendRequest(requester: string, recipient: string): Promise<Friendship> {
  if (requester === recipient) {
    throw new HttpError(400, "cannot_request_self");
  }

  await ensureUser(recipient);

  const existing = await findByPair(requester, recipient);
  let row;
  if (!existing) {
    row = await createPending(requester, recipient);
  } else if (existing.status === "pending") {
    throw new HttpError(409, "request_already_pending");
  } else if (existing.status === "accepted") {
    throw new HttpError(409, "already_friends");
  } else {
    // rejected → reopen with the new requester as the originator
    row = await reopenAsPending(existing.id, requester, recipient);
  }

  // Real-time notification to the recipient via a CometChat custom message.
  // Failure here doesn't roll back the DB row — the recipient will still see
  // the request when they next open the Friend Requests tab.
  try {
    await sendCustomMessage({
      fromUid: requester,
      toUid: recipient,
      type: "FRIEND_REQUEST",
      customData: { requestId: row.id, requesterUid: requester },
    });
  } catch (err) {
    console.warn("FRIEND_REQUEST notification failed:", (err as Error).message);
  }

  return row;
}

/**
 * Accept a pending request. Only the recipient can accept.
 */
export async function acceptRequest(id: string, actor: string): Promise<Friendship> {
  const row = await findById(id);
  if (!row) throw new HttpError(404, "request_not_found");
  if (row.recipientUid !== actor) throw new HttpError(403, "not_recipient");
  if (row.status !== "pending") throw new HttpError(409, `request_${row.status}`);

  const updated = await updateStatus(id, "accepted");

  // Mirror the friendship into CometChat so the React UI Kit's friendsOnly
  // filter and conversation list both work for this pair.
  try {
    await addFriendship(row.requesterUid, row.recipientUid);
  } catch (err) {
    console.warn("CometChat addFriendship failed:", (err as Error).message);
  }

  // Notify the original requester in real time.
  try {
    await sendCustomMessage({
      fromUid: row.recipientUid,
      toUid: row.requesterUid,
      type: "FRIEND_REQUEST_ACCEPTED",
      customData: { requestId: row.id },
    });
  } catch (err) {
    console.warn("FRIEND_REQUEST_ACCEPTED notification failed:", (err as Error).message);
  }

  return updated;
}

/**
 * Reject a pending request. Only the recipient can reject.
 */
export async function rejectRequest(id: string, actor: string): Promise<Friendship> {
  const row = await findById(id);
  if (!row) throw new HttpError(404, "request_not_found");
  if (row.recipientUid !== actor) throw new HttpError(403, "not_recipient");
  if (row.status !== "pending") throw new HttpError(409, `request_${row.status}`);

  const updated = await updateStatus(id, "rejected");

  // Notify the original requester. No CometChat friendship is created.
  try {
    await sendCustomMessage({
      fromUid: row.recipientUid,
      toUid: row.requesterUid,
      type: "FRIEND_REQUEST_REJECTED",
      customData: { requestId: row.id },
    });
  } catch (err) {
    console.warn("FRIEND_REQUEST_REJECTED notification failed:", (err as Error).message);
  }

  return updated;
}

export async function listRequests(
  uid: string,
  direction: "incoming" | "outgoing",
  pendingOnly: boolean,
): Promise<Friendship[]> {
  return listForUser(uid, direction, pendingOnly ? "pending" : undefined);
}

/**
 * Authorization predicate used by the moderation webhook.
 */
export async function areFriends(a: string, b: string): Promise<boolean> {
  const row = await findByPair(a, b);
  return row?.status === "accepted";
}

/**
 * Return the UIDs of all accepted friends for a given user.
 */
export async function listFriends(uid: string): Promise<string[]> {
  const rows = await listAcceptedFriends(uid);
  return rows.map((r) =>
    r.requesterUid === uid ? r.recipientUid : r.requesterUid,
  );
}

/**
 * Return the friendship status between two users.
 */
export async function getFriendshipStatus(
  a: string,
  b: string,
): Promise<"none" | "pending" | "accepted" | "rejected"> {
  const row = await findByPair(a, b);
  return row?.status ?? "none";
}
