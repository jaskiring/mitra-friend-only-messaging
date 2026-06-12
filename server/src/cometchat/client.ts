import axios from "axios";
import { config } from "../config.js";

export const cometchat = axios.create({
  baseURL: `https://${config.COMETCHAT_APP_ID}.api-${config.COMETCHAT_REGION}.cometchat.io/v3`,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    apikey: config.COMETCHAT_REST_API_KEY,
  },
  timeout: 10_000,
});

// Log the actual response body on CometChat errors — axios stringifies the
// nested object as "[Object]" by default, which loses the useful error code.
cometchat.interceptors.response.use(undefined, (err) => {
  if (axios.isAxiosError(err) && err.response) {
    console.warn(
      `[cometchat] ${err.config?.method?.toUpperCase()} ${err.config?.url} -> ${err.response.status}`,
      JSON.stringify(err.response.data),
    );
  }
  return Promise.reject(err);
});

function cometChatErrorCode(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const data = err.response?.data as { error?: { code?: string } } | undefined;
  return data?.error?.code;
}

export function isCometChatNotFound(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404;
}

/**
 * "Already exists" can come back as either 400 (with ERR_UID_ALREADY_EXISTS)
 * or 409 depending on the endpoint. Treat both as the same outcome.
 */
export function isCometChatAlreadyExists(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (err.response?.status === 409) return true;
  const code = cometChatErrorCode(err);
  return code === "ERR_UID_ALREADY_EXISTS";
}
