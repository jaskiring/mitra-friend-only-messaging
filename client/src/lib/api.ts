const BASE = import.meta.env.VITE_API_BASE_URL;

export interface Session {
  uid: string;
  name: string;
  authToken: string;
}

export interface FriendshipRow {
  id: string;
  requesterUid: string;
  recipientUid: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
}

const SESSION_KEY = "fom-session";

// localStorage (not sessionStorage) so the signed-in identity is consistent
// across all tabs of the same browser profile — matching the CometChat SDK,
// which also keeps one logged-in user per profile. Multi-user testing is done
// with a second browser profile or an incognito window.
export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = loadSession();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (session?.uid) headers["x-user-uid"] = session.uid;

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `http_${res.status}`);
  }
  return res.json();
}

export const api = {
  login(uid: string, name?: string): Promise<Session> {
    return request<Session>("/api/login", {
      method: "POST",
      body: JSON.stringify({ uid, name }),
    });
  },
  sendRequest(to: string): Promise<FriendshipRow> {
    return request<FriendshipRow>("/api/requests", {
      method: "POST",
      body: JSON.stringify({ to }),
    });
  },
  accept(id: string): Promise<FriendshipRow> {
    return request<FriendshipRow>(`/api/requests/${id}/accept`, { method: "POST" });
  },
  reject(id: string): Promise<FriendshipRow> {
    return request<FriendshipRow>(`/api/requests/${id}/reject`, { method: "POST" });
  },
  listIncoming(): Promise<FriendshipRow[]> {
    return request<FriendshipRow[]>("/api/requests?direction=incoming&pendingOnly=true");
  },
  listFriends(): Promise<string[]> {
    return request<string[]>("/api/friends");
  },
  getFriendshipStatus(uid: string): Promise<{ status: "none" | "pending" | "accepted" | "rejected" }> {
    return request<{ status: "none" | "pending" | "accepted" | "rejected" }>(
      `/api/friendship-status/${encodeURIComponent(uid)}`,
    );
  },
};
