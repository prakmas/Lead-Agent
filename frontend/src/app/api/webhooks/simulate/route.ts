import env from "@/server/config/env.js";
import { processInboundMessage } from "@/server/services/conversation.service.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Dev-only: exercise the full inbound -> AI -> match -> reply pipeline without
// a real Meta webhook. Disabled in production.
export const POST = route(async (request: Request) => {
  if (env.nodeEnv === "production") {
    throw createHttpError(403, "Simulator is disabled in production");
  }

  const {
    channel = "whatsapp",
    contactId = "demo-contact",
    contactName = "Demo User",
    message,
  } = await request.json();

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

  return json({
    reply: result.reply,
    leadStatus: result.lead?.status,
    matches: result.matches?.length || 0,
    conversationId: result.conversation?._id,
  });
});
