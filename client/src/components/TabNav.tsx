export type TabKey = "users" | "friends" | "requests" | "conversations";

import type { ReactNode } from "react";

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  pendingCount: number;
  meUid: string;
  meName: string;
  onLogout: () => void;
  themeSlot?: ReactNode;
}

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "users", label: "Discover" },
  { key: "friends", label: "Friends" },
  { key: "requests", label: "Friend Requests" },
  { key: "conversations", label: "Conversations" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TabNav({
  active,
  onChange,
  pendingCount,
  meUid,
  meName,
  onLogout,
  themeSlot,
}: Props) {
  return (
    <aside className="tab-nav">
      <div className="tab-nav-header">
        <div className="tab-nav-brand">
          <div className="tab-nav-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path
                d="M5 8.5C5 6.567 6.567 5 8.5 5h7C17.433 5 19 6.567 19 8.5v4A3.5 3.5 0 0 1 15.5 16H11l-3.5 3v-3H8.5A3.5 3.5 0 0 1 5 12.5v-4z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="tab-nav-brand-name">Mitra</div>
          <div className="tab-nav-brand-spacer" />
          {themeSlot}
        </div>
        <div className="tab-nav-me">
          <span className="tab-nav-me-avatar" data-avatar={meUid}>
            {initials(meName)}
          </span>
          <span>{meName}</span>
        </div>
      </div>
      <nav>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab-button ${active === t.key ? "active" : ""}`}
            onClick={() => onChange(t.key)}
          >
            <span>{t.label}</span>
            {t.key === "requests" && pendingCount > 0 && (
              <span className="tab-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>
      <button type="button" className="tab-logout" onClick={onLogout}>
        Sign out
      </button>
    </aside>
  );
}
