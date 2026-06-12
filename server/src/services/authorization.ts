import { areFriends } from "./friend-requests.js";

export type AuthDecision =
  | { allow: true }
  | { allow: false; reason: string };

/**
 * Authoritative gate for the messaging restriction. Returns whether `sender`
 * is allowed to message `receiver`. Used by the CometChat Custom Moderation
 * webhook to decide allow/block at the platform's pre-delivery layer.
 */
export async function canMessage(sender: string, receiver: string): Promise<AuthDecision> {
  if (!sender || !receiver) return { allow: false, reason: "missing_participant" };
  if (sender === receiver) return { allow: true }; // self-talk, no-op for this app
  const friends = await areFriends(sender, receiver);
  return friends ? { allow: true } : { allow: false, reason: "not_friends" };
}
