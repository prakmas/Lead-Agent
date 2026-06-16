import crypto from "crypto";
import env from "../config/env.js";
import { normalizeMetaPayload } from "../adapters/meta.adapter.js";
import { processInboundMessage } from "../services/conversation.service.js";
import createHttpError from "../utils/createHttpError.js";

// Validate Meta's X-Hub-Signature-256 header against the app secret.
// When META_APP_SECRET is not set (local/mock development) the check is skipped.
const hasValidSignature = (req) => {
  if (!env.meta.appSecret) return true;

  const header = req.headers["x-hub-signature-256"];
  if (!header || !req.rawBody) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", env.meta.appSecret)
      .update(req.rawBody)
      .digest("hex");

  const received = Buffer.from(header);
  const computed = Buffer.from(expected);

  return (
    received.length === computed.length &&
    crypto.timingSafeEqual(received, computed)
  );
};

export const verifyMetaWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.meta.verifyToken) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

export const receiveMetaWebhook = async (req, res) => {
  if (!hasValidSignature(req)) {
    throw createHttpError(401, "Invalid webhook signature");
  }

  const messages = normalizeMetaPayload(req.body);

  // Always acknowledge Meta with 200, even if processing one message fails.
  // Returning 500 would make Meta retry the same delivery and create duplicate
  // leads/conversations. Failures are logged and handled per message instead.
  let processed = 0;
  for (const message of messages) {
    try {
      await processInboundMessage(message);
      processed += 1;
    } catch (error) {
      console.error("[webhook] failed to process message:", error.message);
    }
  }

  res.status(200).json({ received: true, processed });
};

// Dev-only helper to exercise the full inbound -> AI -> match -> reply pipeline
// without a real Meta webhook. Disabled in production.
export const simulateInboundMessage = async (req, res) => {
  if (env.nodeEnv === "production") {
    throw createHttpError(403, "Simulator is disabled in production");
  }

  const {
    channel = "whatsapp",
    contactId = "demo-contact",
    contactName = "Demo User",
    message,
  } = req.body || {};

  if (!message) throw createHttpError(400, "message is required");
  if (!["whatsapp", "instagram", "facebook"].includes(channel)) {
    throw createHttpError(400, "channel must be whatsapp, instagram, or facebook");
  }

  const result = await processInboundMessage({
    channel,
    accountId: `${channel}-simulator`,
    contactId,
    contactName,
    message,
    messageType: "text",
    timestamp: new Date(),
    providerMessageId: `sim-${Date.now()}`,
    metadata: { simulated: true },
  });

  res.json({
    reply: result.reply,
    leadStatus: result.lead?.status,
    matches: result.matches?.length || 0,
    conversationId: result.conversation?._id,
  });
};
