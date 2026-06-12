import { useCallback, useEffect, useState } from "react";
import Login from "./pages/Login.js";
import TabNav, { type TabKey } from "./components/TabNav.js";
import ThemeToggle from "./components/ThemeToggle.js";
import UsersTab from "./pages/UsersTab.js";
import FriendsTab from "./pages/FriendsTab.js";
import FriendRequestsTab from "./pages/FriendRequestsTab.js";
import ConversationsTab from "./pages/ConversationsTab.js";
import { logout, tryRestoreSession } from "./cometchat/login.js";
import { attachGlobalListeners, detachGlobalListeners } from "./cometchat/listeners.js";
import { api, type Session } from "./lib/api.js";
import { useTheme } from "./lib/theme.js";
import { events, EVT_FRIEND_REQUEST_RECEIVED, EVT_FRIEND_REQUEST_RESOLVED } from "./lib/event-bus.js";

type AuthState =
  | { kind: "checking" }
  | { kind: "anon" }
  | { kind: "signed-in"; session: Session };

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ kind: "checking" });
  const [tab, setTab] = useState<TabKey>("users");
  const [activeChatUid, setActiveChatUid] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    let alive = true;
    void (async () => {
      const session = await tryRestoreSession();
      if (!alive) return;
      setAuth(session ? { kind: "signed-in", session } : { kind: "anon" });
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (auth.kind !== "signed-in") return;
    attachGlobalListeners();
    
    const refreshCount = () => {
      api.listIncoming().then((rows) => setPendingCount(rows.length)).catch(() => {});
    };
    
    // Initial fetch
    refreshCount();
    
    // Listen for real-time changes
    const offReceived = events.on(EVT_FRIEND_REQUEST_RECEIVED, refreshCount);
    const offResolved = events.on(EVT_FRIEND_REQUEST_RESOLVED, refreshCount);
    
    return () => {
      offReceived();
      offResolved();
      detachGlobalListeners();
    };
  }, [auth.kind]);

  const handleLoggedIn = useCallback((session: Session) => {
    setAuth({ kind: "signed-in", session });
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setAuth({ kind: "anon" });
    setTab("users");
    setPendingCount(0);
  }, []);

  if (auth.kind === "checking") {
    return <main className="loading">Loading…</main>;
  }
  if (auth.kind === "anon") {
    return (
      <>
        <ThemeToggle theme={theme} onToggle={toggleTheme} className="floating" />
        <Login onLoggedIn={handleLoggedIn} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <TabNav
        active={tab}
        onChange={setTab}
        pendingCount={pendingCount}
        meUid={auth.session.uid}
        meName={auth.session.name}
        onLogout={handleLogout}
        themeSlot={<ThemeToggle theme={theme} onToggle={toggleTheme} />}
      />
      <main className="app-main">
        {tab === "users" && <UsersTab meUid={auth.session.uid} />}
        {tab === "friends" && (
          <FriendsTab
            onChatWith={(uid) => {
              setActiveChatUid(uid);
              setTab("conversations");
            }}
          />
        )}
        {tab === "requests" && <FriendRequestsTab onCountChange={setPendingCount} />}
        {tab === "conversations" && <ConversationsTab activeChatUid={activeChatUid} />}
      </main>
    </div>
  );
}
