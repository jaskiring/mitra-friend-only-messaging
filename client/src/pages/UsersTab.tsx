import { useMemo, useState } from "react";
import { CometChatUsers } from "@cometchat/chat-uikit-react";
import { CometChat } from "@cometchat/chat-sdk-javascript";
import SendRequestModal from "../components/SendRequestModal.js";

interface Props {
  meUid: string;
}

export default function UsersTab({ meUid }: Props) {
  const [target, setTarget] = useState<{ uid: string; name: string } | null>(null);

  const builder = useMemo(
    () => new CometChat.UsersRequestBuilder().setLimit(30).setSearchKeyword(""),
    [],
  );

  return (
    <section className="tab-panel users-panel">
      <header>
        <h2>Users</h2>
        <p className="muted">Tap a user to send a friend request.</p>
      </header>
      <div className="users-list">
        <CometChatUsers
          usersRequestBuilder={builder}
          onItemClick={(user) => {
            if (!user) return;
            if (user.getUid() === meUid) return;
            setTarget({ uid: user.getUid(), name: user.getName() });
          }}
        />
      </div>
      {target && (
        <SendRequestModal
          targetUid={target.uid}
          targetName={target.name}
          onClose={() => setTarget(null)}
        />
      )}
    </section>
  );
}
