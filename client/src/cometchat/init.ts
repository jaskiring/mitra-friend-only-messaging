import { CometChatUIKit, UIKitSettingsBuilder } from "@cometchat/chat-uikit-react";

let initPromise: Promise<unknown> | undefined;

/**
 * Initialise the CometChat UI Kit exactly once. Subsequent calls return the
 * same promise so multiple components can safely await it.
 */
export function initCometChat(): Promise<unknown> {
  if (initPromise) return initPromise;
  const settings = new UIKitSettingsBuilder()
    .setAppId(import.meta.env.VITE_COMETCHAT_APP_ID)
    .setRegion(import.meta.env.VITE_COMETCHAT_REGION)
    .setAuthKey(import.meta.env.VITE_COMETCHAT_AUTH_KEY)
    .subscribePresenceForFriends()
    .build();
  initPromise = CometChatUIKit.init(settings) ?? Promise.resolve();
  return initPromise;
}
