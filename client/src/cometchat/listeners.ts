import { CometChat } from "@cometchat/chat-sdk-javascript";
import {
  events,
  EVT_FRIEND_REQUEST_RECEIVED,
  EVT_FRIEND_REQUEST_RESOLVED,
} from "../lib/event-bus.js";

const LISTENER_ID = "fom-global";

/**
 * Subscribe to incoming custom messages and bridge friend-request lifecycle
 * notifications onto our local event bus. Tabs listen to the bus to refresh.
 */
export function attachGlobalListeners(): void {
  CometChat.addMessageListener(
    LISTENER_ID,
    new CometChat.MessageListener({
      onCustomMessageReceived: (msg: CometChat.CustomMessage) => {
        const type = msg.getType();
        if (type === "FRIEND_REQUEST") {
          events.emit(EVT_FRIEND_REQUEST_RECEIVED);
        } else if (
          type === "FRIEND_REQUEST_ACCEPTED" ||
          type === "FRIEND_REQUEST_REJECTED"
        ) {
          events.emit(EVT_FRIEND_REQUEST_RESOLVED);
        }
      },
    }),
  );
}

export function detachGlobalListeners(): void {
  CometChat.removeMessageListener(LISTENER_ID);
}
