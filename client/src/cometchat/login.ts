import { CometChatUIKit } from "@cometchat/chat-uikit-react";
import { api, clearSession, loadSession, saveSession, type Session } from "../lib/api.js";
import { initCometChat } from "./init.js";

/**
 * Look up or create the user via our backend, mint an auth token, then log
 * the CometChat UI Kit in with that token. Stores the session for refresh.
 */
export async function login(uid: string, name?: string): Promise<Session> {
  await initCometChat();
  const session = await api.login(uid, name);
  saveSession(session);
  await CometChatUIKit.loginWithAuthToken(session.authToken);
  return session;
}

/**
 * If a session already exists from a previous visit, re-establish CometChat
 * login transparently.
 */
export async function tryRestoreSession(): Promise<Session | null> {
  const session = loadSession();
  if (!session) return null;
  try {
    await initCometChat();
    await CometChatUIKit.loginWithAuthToken(session.authToken);
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await CometChatUIKit.logout();
  } catch {
    // ignore — we want to clear the local session regardless
  }
  clearSession();
}
