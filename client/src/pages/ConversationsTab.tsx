import { useEffect, useMemo, useState } from "react";
import {
  CometChatConversations,
  CometChatMessageHeader,
  CometChatMessageList,
  CometChatMessageComposer,
} from "@cometchat/chat-uikit-react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import { api } from "../lib/api.js";
import {
  events,
  EVT_FRIEND_REQUEST_RESOLVED,
} from "../lib/event-bus.js";

interface Props {
  activeChatUid?: string | null;
}

export default function ConversationsTab({ activeChatUid }: Props) {
  const [chatUser, setChatUser] = useState<CometChat.User | null>(null);
  const [friendUids, setFriendUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeChatUid) {
      CometChat.getUser(activeChatUid)
        .then((u) => setChatUser(u))
        .catch(() => {});
    }
  }, [activeChatUid]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const uids = await api.listFriends();
        if (alive) setFriendUids(new Set(uids));
      } catch {
        // If friends list fails, show nothing — safer than showing non-friends
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    // Refresh when a friendship changes
    const off = events.on(EVT_FRIEND_REQUEST_RESOLVED, () => void load());
    return () => {
      alive = false;
      off();
    };
  }, []);

  const builder = useMemo(
    () =>
      new CometChat.ConversationsRequestBuilder()
        .setConversationType("user")
        .setLimit(50),
    [],
  );

  return (
    <section className="tab-panel conversations-panel">
      <div className="conversations-list">
        {loading ? (
          <div className="chat-empty muted">
            <p>Loading conversations…</p>
          </div>
        ) : friendUids.size === 0 ? (
          <div className="chat-empty muted">
            <p>No friends yet.</p>
            <p>Add friends from the Discover tab to start chatting.</p>
          </div>
        ) : (
          <CometChatConversations
            conversationsRequestBuilder={builder}
            onItemClick={(conversation) => {
              const other = conversation.getConversationWith();
              if (other instanceof CometChat.User) {
                // Only allow opening chats with friends
                if (friendUids.has(other.getUid())) {
                  setChatUser(other);
                }
              }
            }}
          />
        )}
      </div>
      <div className="chat-pane">
        {chatUser ? (
          <>
            <CometChatMessageHeader user={chatUser} />
            <CometChatMessageList user={chatUser} />
            <CometChatMessageComposer user={chatUser} />
          </>
        ) : (
          <div className="chat-empty muted">
            <p>Pick a conversation on the left to start chatting.</p>
            <p>Only friends will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}
