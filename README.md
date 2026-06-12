# Mitra — Friend-Only Messaging

A social messaging app where users can only chat after a friend request is sent **and** accepted. Messaging is powered end-to-end by [CometChat](https://www.cometchat.com); the friend-request lifecycle and the "friends-only" rule are enforced by a small Node backend — at the platform level, not just in the UI.

## Demo

Four demo users are available on the login screen: **Aarav Mehta**, **Priya Iyer**, **Kabir Shah**, **Diya Nair**. Open the app in two browser windows, sign in as two different users, and walk the flow: discover → send request → accept (arrives in real time) → chat.

## Project structure

```
client/                       React 18 + Vite + TypeScript
  src/
    pages/                    Login, UsersTab, FriendsTab, FriendRequestsTab, ConversationsTab
    components/               TabNav, SendRequestModal, ThemeToggle
    cometchat/                SDK init, login, global message listeners
    lib/                      API client, event bus, theme
server/                       Node + Express + TypeScript
  src/
    routes/                   /api/login, /api/requests*, /api/cc-moderation, /health
    services/                 friend-request state machine, authorization gate
    cometchat/                REST wrappers (users, tokens, friends, messages)
    middleware/               demo auth, webhook basic-auth, errors, logging
    db/                       Prisma client + friendships repository
  prisma/                     SQLite schema + migrations
docs/
  architecture.md             As-built architecture and flows
  cometchat-dashboard-setup.md  One-time moderation webhook configuration
```

## What CometChat provides vs. what this repo adds

| Concern | Owner | Notes |
|---|---|---|
| User directory, auth tokens | CometChat | Backend mints tokens via REST; client logs in with `CometChatUIKit.loginWithAuthToken` |
| Real-time messaging, receipts, presence | CometChat | Untouched — the app is never in the message path |
| Chat UI (conversation list, message list, composer) | CometChat React UI Kit | `CometChatConversations`, `CometChatMessageList`, `CometChatMessageComposer`, `CometChatUsers` |
| Friends storage (accepted only) | CometChat | Mirrored on accept via the Friends REST API |
| **Friend-request lifecycle (pending → accepted/rejected)** | **This repo** | CometChat has no pending-request concept, so the backend owns it (SQLite via Prisma) |
| **Real-time friend-request notifications** | **This repo + CometChat** | Backend sends custom-type messages (`FRIEND_REQUEST`, `FRIEND_REQUEST_ACCEPTED`); client listens and refreshes |
| **Backend-level messaging restriction** | **This repo + CometChat** | CometChat's Custom Moderation API calls `POST /api/cc-moderation` after each message is sent; the backend answers allow/block from the friendships table — a block causes CometChat to delete the message within seconds |

## Key decisions

1. **Enforcement via the Custom Moderation API, not a message proxy.** CometChat calls our webhook asynchronously after each direct message is sent; if the two users are not friends the backend returns a block and CometChat deletes the message within seconds. Non-friends cannot retain any message — bypassing the frontend (e.g. raw SDK/REST calls) doesn't bypass the rule. The chat UX stays fully native because our server is never in the message path.
2. **Friend-request state lives in our DB.** CometChat's Friends API only stores *accepted* relationships, so the pending/rejected lifecycle is modeled in SQLite (one row per user pair) and mirrored to CometChat on accept — which keeps the UI Kit's friends-aware features working.
3. **CometChat custom messages as the notification channel.** Friend-request events ride the same real-time socket the SDK already maintains — no extra WebSocket infrastructure. The Friend Requests tab also re-fetches on mount, so offline users catch up on login.
4. **Demo login instead of full auth.** The assignment defines a single "registered user" role and no auth requirements, so sign-in is a demo-user picker. The backend identifies callers via an `x-user-uid` header; swapping this for a real session/JWT is isolated in one middleware (`server/src/middleware/require-user.ts`).
5. **SQLite + Prisma.** Zero-infrastructure persistence; the schema is two tables (`User`, `Friendship`).

## Running the app

### Prerequisites

- Node 20+
- A CometChat app (Build plan) — App ID, Region, Auth Key, REST API Key

### 1. Configure environment

```bash
cp server/.env.example server/.env   # fill in CometChat credentials
cp client/.env.example client/.env   # fill in App ID / Region / Auth Key
```

### 2. Install and initialise

```bash
cd server && npm install && npx prisma migrate deploy
cd ../client && npm install
```

### 3. Run

```bash
# terminal 1
cd server && npm run dev    # http://localhost:3001

# terminal 2
cd client && npm run dev    # http://localhost:5173
```

### 4. Enable the backend messaging gate (one-time)

The friends-only rule is enforced by CometChat calling this backend before each message is delivered. That requires a public URL and a one-time dashboard configuration — follow [docs/cometchat-dashboard-setup.md](docs/cometchat-dashboard-setup.md).

### Verifying the backend-level restriction

With the gate configured, even a direct REST call (no frontend involved) between non-friends is blocked:

```bash
curl -X POST "https://<APP_ID>.api-<REGION>.cometchat.io/v3/messages" \
  -H "apikey: <REST_API_KEY>" -H "onBehalfOf: aarav" \
  -H "content-type: application/json" \
  -d '{"receiver":"kabir","receiverType":"user","category":"message","type":"text","data":{"text":"hi"}}'
# → message is dropped by moderation; server log shows: [moderation] BLOCK aarav -> kabir: not_friends
```

## API surface (backend)

| Endpoint | Purpose |
|---|---|
| `POST /api/login` | Create/find user, mint CometChat auth token |
| `POST /api/requests` | Send a friend request |
| `GET /api/requests?direction=incoming\|outgoing` | List pending requests |
| `POST /api/requests/:id/accept` | Accept (mirrors friendship to CometChat, notifies requester) |
| `POST /api/requests/:id/reject` | Reject (no friendship created) |
| `GET /api/friends` | List accepted friend UIDs for the logged-in user |
| `GET /api/friendship-status/:uid` | Get friendship status between current user and target |
| `POST /api/cc-moderation` | Called by CometChat before message delivery (basic-auth protected) |
| `GET /health` | Liveness + DB check |
