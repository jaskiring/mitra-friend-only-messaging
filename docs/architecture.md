# Architecture (as built)

A friend-only messaging product: users discover each other, exchange friend requests, and can chat **only after** the request is accepted. The restriction is enforced at the backend level via CometChat's Custom Moderation API — not just hidden in the UI.

## System overview

```
+--------------------------------------------------+
|  React client (Vite + TS)                        |
|                                                  |
|  Discover        Friend Requests   Conversations |
|  (UI Kit Users   (custom React,    (UI Kit list, |
|   + click        live-updating)     messages,    |
|   override)                         composer)    |
+------+----------------+----------------+---------+
       | REST           | REST           | CometChat SDK (websocket)
       v                v                v
+---------------------------------+   +------------------------+
|  Express backend (TS)           |   |  CometChat platform    |
|                                 |   |                        |
|  POST /api/login ---------------+-->|  Users / Auth tokens   |
|  POST /api/requests ------------+-->|  Custom messages       |
|  POST /api/requests/:id/accept -+-->|  Friends API           |
|  POST /api/requests/:id/reject  |   |  Message delivery      |
|  POST /api/cc-moderation <------+---|  Custom Moderation API |
|                                 |   |  (async post-delivery) |
|  SQLite (Prisma)                |   +------------------------+
+---------------------------------+
```

The backend is **never in the message path**. CometChat consults it (`/api/cc-moderation`) before delivering each direct message; the backend answers allow/block by checking the friendships table. Chat therefore keeps native real-time behaviour, receipts and presence.

## Data model

```
User        cometchatUid (PK), name, avatarUrl?, createdAt
Friendship  id, requesterUid, recipientUid,
            status ∈ {pending, accepted, rejected},
            createdAt, updatedAt
```

One `Friendship` row per user pair (the service normalises lookups in both directions). "Friends" = a row with `status = accepted`.

## Flows

### Send friend request (A → B)
1. Client: `POST /api/requests { to: B }`
2. Backend validates (no self-requests, no duplicates; a rejected pair may re-request) and inserts a `pending` row
3. Backend sends a CometChat **custom message** `FRIEND_REQUEST` from A to B
4. B's client receives it on the existing socket → Friend Requests tab + badge update live

### Accept (B accepts A)
1. Client: `POST /api/requests/:id/accept` (only the recipient may accept)
2. Row → `accepted`
3. Backend mirrors the friendship into CometChat (both directions, Friends REST API)
4. Backend sends `FRIEND_REQUEST_ACCEPTED` to A → A's UI updates live
5. The pair can now chat: the moderation gate starts answering "allow"

### Reject (B rejects A)
1. `POST /api/requests/:id/reject` → row → `rejected`
2. No CometChat friendship is created; messaging stays blocked

### Send a chat message (A → B)
1. A uses the native UI Kit composer; the SDK sends to CometChat
2. CometChat delivers the message, then **asynchronously** POSTs to `/api/cc-moderation` (basic-auth) — the moderation API on the Build plan is post-delivery
3. Backend: friends → `{ isMatchingCondition: false }` (approve); not friends → `{ isMatchingCondition: true, confidence: 1 }` (block/delete)
4. When blocked, CometChat deletes the message from the recipient's conversation within seconds
5. Custom-category messages (the friend-request notifications) and non-user receivers are always approved — the gate applies only to direct user-to-user chat messages

## Conversation visibility

A conversation in CometChat only comes into existence when a message is exchanged. Because non-friends' messages are blocked at the platform level, conversations can only ever form between friends — so the Conversations tab inherently shows friends only, with no client-side filtering to bypass.

## Presence and Online Status

Restricting online/offline status requires a different approach than message restriction. CometChat's Custom Moderation Webhook intercepts *messages*, not presence events. Therefore, presence is secured using a two-layered approach:
1. **SDK Real-time Level:** The application uses `CometChat.subscribePresenceForFriends()` instead of global presence subscription. This ensures that the client only receives real-time WebSocket presence updates for accepted friends.
2. **UI Kit Level:** When fetching users for the "Discover" tab (via `UsersRequestBuilder`), the REST API includes the current `status` of all users. To prevent leaking this state to non-friends, we override the CSS classes (`.cometchat-list-item__status`) inside the Discover UI to completely hide the presence indicator. This gracefully combines CometChat's powerful UIKit with our custom business rules.

## Trade-offs and known limitations

- **Demo identity:** the backend trusts an `x-user-uid` header. Production would replace `require-user.ts` with session/JWT auth; the rest of the design is unchanged.
- **Webhook reachability:** locally, the moderation webhook needs a public tunnel (see `cometchat-dashboard-setup.md`). In production this is just the deployed backend URL.
- **Notification delivery:** friend-request events are fire-and-forget custom messages; the requests tab re-fetches on mount as the catch-up path, so nothing is lost if the recipient is offline.
- **Moderation fallback:** the dashboard's "On Custom API Error" is set to *Approve* by default; for a stricter posture set it to *Block* (fail-closed).
