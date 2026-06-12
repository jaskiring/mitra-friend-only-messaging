import { useState } from "react";
import { login } from "../cometchat/login.js";
import type { Session } from "../lib/api.js";

interface Props {
  onLoggedIn: (session: Session) => void;
}

const demoUsers = [
  { uid: "aarav", name: "Aarav Mehta", role: "Product Designer" },
  { uid: "priya", name: "Priya Iyer", role: "Engineering Manager" },
  { uid: "kabir", name: "Kabir Shah", role: "Backend Engineer" },
  { uid: "diya", name: "Diya Nair", role: "UX Researcher" },
];

export default function Login({ onLoggedIn }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(uid: string, name: string) {
    setBusy(uid);
    setError(null);
    try {
      const session = await login(uid, name);
      onLoggedIn(session);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M5 8.5C5 6.567 6.567 5 8.5 5h7C17.433 5 19 6.567 19 8.5v4A3.5 3.5 0 0 1 15.5 16H11l-3.5 3v-3H8.5A3.5 3.5 0 0 1 5 12.5v-4z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="brand-name">Mitra</div>
            <div className="brand-tag">friend-only messaging</div>
          </div>
        </div>
        <h1>Pick someone to sign in as.</h1>
        <p className="muted">
          Demo accounts — pick one to explore Mitra.
        </p>
        <ul className="login-list">
          {demoUsers.map((u) => (
            <li key={u.uid}>
              <button
                type="button"
                className="login-row"
                disabled={busy !== null}
                onClick={() => pick(u.uid, u.name)}
              >
                <span className="login-avatar" data-avatar={u.uid}>
                  {u.name.split(" ").map((p) => p[0]).join("")}
                </span>
                <span className="login-meta">
                  <span className="login-name">{u.name}</span>
                  <span className="muted small">{u.role}</span>
                </span>
                {busy === u.uid && <span className="login-status">Signing in…</span>}
                {busy !== u.uid && <span className="login-arrow">→</span>}
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="error">Sign-in failed: {error}</p>}
      </div>
      <p className="login-footnote muted small">
        Chat only with people who accept you as a friend.
      </p>
    </main>
  );
}
