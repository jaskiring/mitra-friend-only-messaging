# CometChat Dashboard Setup — Custom Moderation Webhook

This document covers the one-time dashboard configuration needed for the backend-level enforcement rule (the "only friends can message" gate). The app code is fully written; this just wires CometChat to call our backend.

## Prerequisites

- A CometChat app on the **Build plan** (Custom Moderation API requires Build or higher; we provisioned it during initial setup).
- The backend running on port 3001 (`npm run dev` in `/server`).
- A public HTTPS tunnel to that backend. Easiest options:

  ```bash
  # Option A — localhost.run (no install, no signup; URL changes per session)
  ssh -R 80:localhost:3001 nokey@localhost.run

  # Option B — ngrok (stable URL after one-time auth-token signup)
  ngrok http 3001
  ```

  Copy the public URL it prints (e.g. `https://abc.lhr.life` or `https://abc.ngrok.app`).

## Step 1 — Create the Custom API list

1. Open [your app dashboard](https://app.cometchat.com/) → **Moderation** → **Settings** → **Lists** tab.
2. Click **+ Add List**.
3. Fill:
   - **Name:** `Mitra Friendship Gate`
   - **ID:** `mitra_friendship_gate`
   - **Category:** `Custom API`
   - **URL:** `<your tunnel URL>/api/cc-moderation`
   - **Enable Basic Auth:** ON
   - **Username:** value of `MODERATION_WEBHOOK_USER` from `server/.env` (default `cometchat`)
   - **Password:** value of `MODERATION_WEBHOOK_PASSWORD` from `server/.env`
4. **Save.** The new list appears under the **Custom** section.

## Step 2 — Create the rule that triggers the gate

1. Switch to the **Rules** tab → **+ Add Rule**.
2. Fill:
   - **Name:** `Friendship Gate`
   - **ID:** `friendship_gate`
   - **Description:** `Block direct user-to-user text messages between non-friends`
3. **Conditions → Add condition:** `Text` → `Contains` → `Custom API` → `Mitra Friendship Gate` → `confidence greater than` → `0.5`.
   > **Important:** our webhook returns `confidence: 1` (100 %) when blocking and `0` when allowing. CometChat treats confidence as a float from 0–1, so the threshold must be `0.5`, **not** `50`. Setting `50` means the condition is never satisfied and messages are never blocked.
4. **Actions:** `Block` (the default). Leave User Action / Group Action unchecked.
5. **Save.** The rule appears under **Custom**.
6. Toggle the rule **ON** (purple).

## Step 3 — Enable moderation globally

At the top of **Moderation → Settings**, switch the master **Moderation** toggle to **ON**.

## Verifying

Run the backend and verify in three places:

```bash
# 1. Confirm tunnel is alive
curl -sS https://<your-tunnel>.lhr.life/health
# → {"status":"ok","db":"ok"}

# 2. Send a non-friend message via REST and watch the moderation status
source server/.env
curl -sS -X POST "https://${COMETCHAT_APP_ID}.api-${COMETCHAT_REGION}.cometchat.io/v3/messages" \
  -H "apikey: $COMETCHAT_REST_API_KEY" \
  -H "onBehalfOf: aarav" \
  -H "content-type: application/json" \
  -d '{"receiver":"priya","receiverType":"user","category":"message","type":"text","data":{"text":"test"}}'
# Initial response shows moderation.status = "pending"

# 3. Re-fetch a few seconds later to see the final status
curl -sS "https://${COMETCHAT_APP_ID}.api-${COMETCHAT_REGION}.cometchat.io/v3/messages/<id>" \
  -H "apikey: $COMETCHAT_REST_API_KEY" | jq .data.data.moderation
# Expected for non-friends → {"status":"blocked"}
# Expected for friends     → {"status":"approved"}
```

The server log should print one of:

```
[moderation] BLOCK aarav -> priya: not_friends
```

…per webhook call.

## Known fragility

- **Free public tunnels rotate URLs.** If the tunnel restarts, the list's URL must be updated in the dashboard.
- **Custom Moderation is async (post-delivery).** CometChat delivers the message immediately and then calls the webhook. If the webhook returns block (`isMatchingCondition: true, confidence: 1`), CometChat deletes the message on the recipient's end a few seconds later. This means the message briefly appears in the recipient's conversation list before disappearing. It is **not** a pre-delivery gate for the Build plan. The send-message REST response always shows `moderation.status: "pending"` initially; re-fetch a few seconds later to confirm `blocked` or `approved`.
- **Confidence threshold.** Our handler returns `confidence: 1` (float) on block. The dashboard rule must use threshold `0.5`, not `50`. If you see messages passing through after the webhook logs `BLOCK`, check this threshold first.

## Fallback if the Build plan doesn't include Custom API

If for any reason the Custom API category isn't selectable in the Lists modal on your account, the architecture has a fallback path: route every send through `POST /api/messages` on our backend (composer-override). The fallback handler isn't built — it would replace the moderation webhook with a thin proxy. Open an issue if you need this.
