import { cometchat } from "./client.js";

/**
 * Make A and B friends in CometChat. The Friends REST API only writes
 * already-accepted friendships and is directional, so we call it on both
 * sides. This lets the React UI Kit's friendsOnly filter (which reads the
 * logged-in user's friend list) see the connection from either direction.
 */
export async function addFriendship(a: string, b: string): Promise<void> {
  await Promise.all([
    cometchat.post(`/users/${encodeURIComponent(a)}/friends`, { accepted: [b] }),
    cometchat.post(`/users/${encodeURIComponent(b)}/friends`, { accepted: [a] }),
  ]);
}
