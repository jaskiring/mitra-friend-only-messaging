import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

interface Props {
  targetUid: string;
  targetName: string;
  onClose: () => void;
}

type FriendStatus = "loading" | "none" | "pending" | "accepted" | "rejected";
type SendState = "idle" | "sending" | "sent" | { error: string };

export default function SendRequestModal({ targetUid, targetName, onClose }: Props) {
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("loading");
  const [state, setState] = useState<SendState>("idle");

  useEffect(() => {
    let alive = true;
    void api.getFriendshipStatus(targetUid).then((res) => {
      if (alive) setFriendStatus(res.status);
    }).catch(() => {
      if (alive) setFriendStatus("none");
    });
    return () => { alive = false; };
  }, [targetUid]);

  async function onSend() {
    setState("sending");
    try {
      await api.sendRequest(targetUid);
      setState("sent");
    } catch (e) {
      setState({ error: (e as Error).message });
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>
          {friendStatus === "accepted" ? "Already friends" : "Send friend request"}
        </h2>

        {friendStatus === "loading" && (
          <p className="muted">Checking…</p>
        )}

        {friendStatus === "accepted" && (
          <>
            <div className="status-friends">
              <span className="status-icon">✓</span>
              <span>You and <strong>{targetName}</strong> are friends.</span>
            </div>
            <div className="modal-actions">
              <button className="primary" onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {friendStatus === "pending" && (
          <>
            <div className="status-pending">
              <span className="status-icon">⏳</span>
              <span>A friend request is already pending with <strong>{targetName}</strong>.</span>
            </div>
            <div className="modal-actions">
              <button className="primary" onClick={onClose}>Close</button>
            </div>
          </>
        )}

        {(friendStatus === "none" || friendStatus === "rejected") && (
          <>
            <p>
              Send a friend request to <strong>{targetName}</strong>?
            </p>
            {state === "idle" && (
              <div className="modal-actions">
                <button onClick={onClose}>Cancel</button>
                <button className="primary" onClick={onSend}>Send request</button>
              </div>
            )}
            {state === "sending" && <p className="muted">Sending…</p>}
            {state === "sent" && (
              <>
                <p className="success">Request sent.</p>
                <div className="modal-actions">
                  <button className="primary" onClick={onClose}>Close</button>
                </div>
              </>
            )}
            {typeof state === "object" && "error" in state && (
              <>
                <p className="error">
                  {state.error === "already_friends"
                    ? "You are already friends."
                    : state.error === "request_already_pending"
                    ? "A request is already pending with this user."
                    : state.error === "cannot_request_self"
                    ? "You can't send a request to yourself."
                    : `Error: ${state.error}`}
                </p>
                <div className="modal-actions">
                  <button onClick={onClose}>Close</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
