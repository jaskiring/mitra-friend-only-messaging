import { useCallback, useEffect, useState } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { api } from "../lib/api.js";
import {
  events,
  EVT_FRIEND_REQUEST_RESOLVED,
} from "../lib/event-bus.js";

interface FriendInfo {
  uid: string;
  name: string;
}

interface Props {
  onChatWith?: (uid: string) => void;
}

export default function FriendsTab({ onChatWith }: Props) {
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const uids = await api.listFriends();
      const enriched = await Promise.all(
        uids.map(async (uid) => {
          try {
            const user = await CometChat.getUser(uid);
            return { uid, name: user.getName() };
          } catch {
            return { uid, name: uid };
          }
        }),
      );
      setFriends(enriched);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const off = events.on(EVT_FRIEND_REQUEST_RESOLVED, () => void refresh());
    return off;
  }, [refresh]);

  function initial(name: string): string {
    return name[0]?.toUpperCase() ?? "?";
  }

  return (
    <section className="tab-panel friends-panel">
      <header>
        <h2>Friends</h2>
        <p className="muted">People you can chat with.</p>
      </header>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : friends.length === 0 ? (
        <p className="muted empty">
          No friends yet. Send a request from the Discover tab!
        </p>
      ) : (
        <ul className="friends-list">
          {friends.map((f) => (
            <li key={f.uid} className="friend-row">
              <div className="friend-info">
                <span className="login-avatar" data-avatar={f.uid}>
                  {initial(f.name)}
                </span>
                <div>
                  <div className="friend-name">{f.name}</div>
                  <div className="friend-badge">✓ Friends</div>
                </div>
              </div>
              {onChatWith && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => onChatWith(f.uid)}
                >
                  Chat
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
