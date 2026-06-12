import { cometchat, isCometChatAlreadyExists } from "./client.js";

export interface CometChatUserPayload {
  uid: string;
  name: string;
  avatar?: string;
}

/**
 * Idempotently create a user in CometChat. A 409 (already exists) is treated
 * as success — same outcome from our perspective.
 */
export async function ensureUser(payload: CometChatUserPayload): Promise<void> {
  try {
    await cometchat.post("/users", payload);
  } catch (err) {
    if (isCometChatAlreadyExists(err)) return;
    throw err;
  }
}
