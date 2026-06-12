import { prisma } from "../prisma.js";
import type { Friendship, FriendshipStatus } from "@prisma/client";

export async function findByPair(a: string, b: string): Promise<Friendship | null> {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterUid: a, recipientUid: b },
        { requesterUid: b, recipientUid: a },
      ],
    },
  });
}

export async function findById(id: string): Promise<Friendship | null> {
  return prisma.friendship.findUnique({ where: { id } });
}

export async function createPending(requesterUid: string, recipientUid: string): Promise<Friendship> {
  return prisma.friendship.create({
    data: { requesterUid, recipientUid, status: "pending" },
  });
}

export async function updateStatus(
  id: string,
  status: FriendshipStatus,
): Promise<Friendship> {
  return prisma.friendship.update({ where: { id }, data: { status } });
}

export async function reopenAsPending(
  id: string,
  requesterUid: string,
  recipientUid: string,
): Promise<Friendship> {
  return prisma.friendship.update({
    where: { id },
    data: { status: "pending", requesterUid, recipientUid },
  });
}

export async function listForUser(
  uid: string,
  direction: "incoming" | "outgoing",
  status?: FriendshipStatus,
): Promise<Friendship[]> {
  const where =
    direction === "incoming"
      ? { recipientUid: uid, ...(status && { status }) }
      : { requesterUid: uid, ...(status && { status }) };
  return prisma.friendship.findMany({ where, orderBy: { updatedAt: "desc" } });
}

export async function listAcceptedFriends(uid: string): Promise<Friendship[]> {
  return prisma.friendship.findMany({
    where: {
      status: "accepted",
      OR: [{ requesterUid: uid }, { recipientUid: uid }],
    },
    orderBy: { updatedAt: "desc" },
  });
}
