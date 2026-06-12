import { cometchat } from "./client.js";

export type CustomMessageType =
  | "FRIEND_REQUEST"
  | "FRIEND_REQUEST_ACCEPTED"
  | "FRIEND_REQUEST_REJECTED";

interface SendCustomMessageInput {
  fromUid: string;
  toUid: string;
  type: CustomMessageType;
  customData: Record<string, unknown>;
}

/**
 * Send a custom-category CometChat message on behalf of `fromUid` to `toUid`.
 * Used to push real-time friend-request lifecycle events to the recipient's
 * connected client — the frontend listens for these types and updates the
 * Friend Requests tab without polling.
 */
export async function sendCustomMessage(input: SendCustomMessageInput): Promise<void> {
  await cometchat.post(
    "/messages",
    {
      receiver: input.toUid,
      receiverType: "user",
      category: "custom",
      type: input.type,
      data: { customData: input.customData },
    },
    { headers: { onBehalfOf: input.fromUid } },
  );
}
