import { cometchat } from "./client.js";

interface AuthTokenResponse {
  data: {
    uid: string;
    authToken: string;
    createdAt: number;
  };
}

/**
 * Mint a fresh auth token for the given user. `force: true` always returns a
 * new token instead of an existing one — useful so each login session gets a
 * clean token without colliding with prior devices.
 */
export async function mintAuthToken(uid: string): Promise<string> {
  const { data } = await cometchat.post<AuthTokenResponse>(
    `/users/${encodeURIComponent(uid)}/auth_tokens`,
    { force: true },
  );
  return data.data.authToken;
}
