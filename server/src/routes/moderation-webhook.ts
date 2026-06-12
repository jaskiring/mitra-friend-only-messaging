import { Router } from "express";
import { z } from "zod";
import { canMessage } from "../services/authorization.js";
import { basicAuthForModerationWebhook } from "../middleware/basic-auth.js";

export const moderationWebhookRouter = Router();

/**
 * CometChat Custom Moderation webhook handler.
 *
 * Verified payload shape (captured from a live CometChat Custom Moderation
 * call):
 *
 *   {
 *     "contextMessages": [
 *       {
 *         "<senderUid>": {
 *           "id": "29",
 *           "conversationId": "aarav_user_kabir",
 *           "sender": "aarav",
 *           "receiverType": "user",
 *           "receiver": "kabir",
 *           "category": "message",
 *           "type": "text",
 *           ...
 *         }
 *       }
 *     ]
 *   }
 *
 * `contextMessages` is an array of single-key objects. The key is the
 * sender's uid; the value is the full message object. The LAST entry is
 * the message currently being evaluated.
 *
 * Response contract:
 *   { isMatchingCondition: false } → ALLOW delivery
 *   { isMatchingCondition: true  } → BLOCK delivery
 *
 * We enforce one rule: two users who are NOT mutual friends cannot exchange
 * direct messages. Everything else (custom-category friend-request
 * notifications, group messages, calls, etc.) is allowed through.
 */

// ── Schema ──────────────────────────────────────────────────────────────────

/** Shape of a single message object inside contextMessages. */
const messageShape = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    conversationId: z.string().optional(),
    sender: z.string().optional(),
    receiver: z.string().optional(),
    receiverType: z.string().optional(),
    category: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

/** Top-level payload: always `{ contextMessages: [...] }`. */
const payloadSchema = z
  .object({
    contextMessages: z.array(z.record(z.string(), messageShape)),
  })
  .passthrough();

// ── Helpers ─────────────────────────────────────────────────────────────────

interface ExtractedMessage {
  sender: string | undefined;
  receiver: string | undefined;
  receiverType: string | undefined;
  category: string | undefined;
  type: string | undefined;
}

/**
 * Extract the current in-flight message fields from the validated payload.
 * The current message is the LAST entry in `contextMessages`.
 */
function extractMessage(
  body: z.infer<typeof payloadSchema>,
): ExtractedMessage | null {
  const ctx = body.contextMessages;
  if (!ctx || ctx.length === 0) return null;

  // The message under evaluation is the last element.
  const current = ctx[ctx.length - 1];
  const values = Object.values(current);
  if (values.length === 0) return null;

  const m = values[0];
  return {
    sender: m.sender,
    receiver: m.receiver,
    receiverType: m.receiverType,
    category: m.category,
    type: m.type,
  };
}

// ── Route ───────────────────────────────────────────────────────────────────

moderationWebhookRouter.post(
  "/api/cc-moderation",
  basicAuthForModerationWebhook,
  async (req, res) => {
    console.log("[moderation] webhook called");

    // 1. Validate payload shape
    const parsed = payloadSchema.safeParse(req.body);
    if (!parsed.success) {
      console.warn(
        "[moderation] payload did not match expected contextMessages shape, defaulting to ALLOW",
        parsed.error.format(),
      );
      res.json({ isMatchingCondition: false });
      return;
    }

    // 2. Extract the current message
    const m = extractMessage(parsed.data);
    if (!m) {
      console.warn("[moderation] could not extract message from contextMessages, defaulting to ALLOW");
      res.json({ isMatchingCondition: false });
      return;
    }

    // 3. Auto-allow anything that is NOT a user-to-user "message" category.
    //    This covers custom-category payloads (e.g. friend-request
    //    notifications), group messages, calls, etc.
    if (m.category !== "message" || m.receiverType !== "user") {
      console.log(
        `[moderation] ALLOW ${m.sender ?? "?"} -> ${m.receiver ?? "?"} (category=${m.category}, receiverType=${m.receiverType})`,
      );
      res.json({ isMatchingCondition: false });
      return;
    }

    // 4. Sender and receiver are required for the friends check
    if (!m.sender || !m.receiver) {
      console.warn("[moderation] missing sender/receiver, defaulting to ALLOW", m);
      res.json({ isMatchingCondition: false });
      return;
    }

    // 5. Authorise: are these two users mutual friends?
    const decision = await canMessage(m.sender, m.receiver);

    if (decision.allow) {
      console.log(`[moderation] ALLOW ${m.sender} -> ${m.receiver}`);
      res.json({ isMatchingCondition: false });
      return;
    }

    console.log(`[moderation] BLOCK ${m.sender} -> ${m.receiver}: ${decision.reason}`);
    // confidence: 1 satisfies the dashboard rule "confidence > 0.5" that triggers the Block action.
    res.json({ isMatchingCondition: true, confidence: 1 });
  },
);

