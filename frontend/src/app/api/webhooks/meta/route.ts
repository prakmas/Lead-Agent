import crypto from "crypto";
import env from "@/server/config/env.js";
import connectDB from "@/server/config/db.js";
import { normalizeMetaPayload } from "@/server/adapters/meta.adapter.js";
import { processInboundMessage } from "@/server/services/conversation.service.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Validate Meta's X-Hub-Signature-256 against the app secret.
// Skipped when META_APP_SECRET is unset (local/dev).
const hasValidSignature = (request: Request, rawBody: string) => {
  if (!env.meta.appSecret) return true;
  const header = request.headers.get("x-hub-signature-256");
  if (!header || !rawBody) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", env.meta.appSecret).update(rawBody).digest("hex");
  const received = Buffer.from(header);
  const computed = Buffer.from(expected);
  return received.length === computed.length && crypto.timingSafeEqual(received, computed);
};

// Webhook verification handshake.
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === env.meta.verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Inbound messages. Always returns 200 so Meta does not retry and create
// duplicate leads; per-message failures are logged instead.
export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!hasValidSignature(request, rawBody)) {
    return Response.json({ message: "Invalid webhook signature" }, { status: 401 });
  }

  let processed = 0;
  try {
    await connectDB();
    const payload = JSON.parse(rawBody || "{}");
    const messages = normalizeMetaPayload(payload);
    for (const message of messages) {
      try {
        await processInboundMessage(message);
        processed += 1;
      } catch (error) {
        console.error("[webhook] failed to process message:", (error as Error).message);
      }
    }
  } catch (error) {
    console.error("[webhook] error:", (error as Error).message);
  }

  return Response.json({ received: true, processed });
}
