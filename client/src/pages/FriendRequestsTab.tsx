import { useCallback, useEffect, useState } from "react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { api, type FriendshipRow } from "../lib/api.js";
import {
  events,
  EVT_FRIEND_REQUEST_RECEIVED,
  EVT_FRIEND_REQUEST_RESOLVED,
} from "../lib/event-bus.js";

interface Props {
  onCountChange: (n: number) => void;
}

interface EnrichedRow extends FriendshipRow {
  requesterName: string;
}

async function enrichRows(rows: FriendshipRow[]): Promise<EnrichedRow[]> {
  return Promise.all(
    rows.map(async (r) => {
      try {
        const user = await CometChat.getUser(r.requesterUid);
        return { ...r, requesterName: user.getName() };
      } catch {
        return { ...r, requesterName: r.requesterUid };
      }
    }),
  );
}

export default function FriendRequestsTab({ onCountChange }: Props) {
  const [incoming, setIncoming] = useState<EnrichedRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await api.listIncoming();
      const enriched = await enrichRows(rows);
      setIncoming(enriched);
      onCountChange(enriched.length);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [onCountChange]);

  useEffect(() => {
    void refresh();
    const offReceived = events.on(EVT_FRIEND_REQUEST_RECEIVED, () => void refresh());
    const offResolved = events.on(EVT_FRIEND_REQUEST_RESOLVED, () => void refresh());
    return () => {
      offReceived();
      offResolved();
    };
  }, [refresh]);

  async function act(id: string, action: "accept" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      if (action === "accept") await api.accept(id);
      else await api.reject(id);
      await refresh();
      events.emit(EVT_FRIEND_REQUEST_RESOLVED);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="tab-panel">
      <header>
        <h2>Friend Requests</h2>
        <p className="muted">Pending requests from other users.</p>
      </header>
      {incoming.length === 0 ? (
        <p className="muted empty">No pending requests.</p>
      ) : (
        <ul className="requests-list">
          {incoming.map((r) => (
            <li key={r.id} className="request-row">
              <div className="request-info">
                <span className="login-avatar">{r.requesterName[0]?.toUpperCase()}</span>
                <div>
                  <div className="request-name">{r.requesterName}</div>
                  <div className="muted">wants to be friends</div>
                </div>
              </div>
              <div className="request-actions">
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => void act(r.id, "reject")}
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="primary"
                  disabled={busyId === r.id}
                  onClick={() => void act(r.id, "accept")}
                >
                  Accept
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
