import type { FriendshipStatus } from "@prisma/client";

export type FriendshipDirection = "incoming" | "outgoing";

export interface FriendshipDTO {
  id: string;
  requesterUid: string;
  recipientUid: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}
