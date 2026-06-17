import Channel from "@/server/models/Channel.js";
import Contact from "@/server/models/Contact.js";
import Conversation from "@/server/models/Conversation.js";
import Message from "@/server/models/Message.js";
import { sendMessage } from "@/server/services/messaging.service.js";
import { requireAuth } from "@/server/auth.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Manual reply from the admin Inbox. Sends the message to the customer on their
// channel and records it as an outbound message — independent of the bot.
export const POST = route(async (request: Request, ctx: Ctx) => {
  await requireAuth(request);
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const text = (body.text || "").toString().trim();

  if (!text) {
    return json({ message: "Message text is required" }, 400);
  }

  const conversation = await Conversation.findById(id)
    .populate("channel")
    .populate("contact");
  if (!conversation) return json({ message: "Conversation not found" }, 404);

  const contact = conversation.contact as unknown as { externalId: string; channelType: string };
  const channelDoc = conversation.channel as unknown as { type: string } | null;
  const channelType = channelDoc?.type || contact?.channelType;

  const sendResult = await sendMessage({
    channel: channelType,
    to: contact.externalId,
    text,
  });

  const message = await Message.create({
    channel: (conversation.channel as unknown as { _id: string })?._id,
    contact: (conversation.contact as unknown as { _id: string })?._id,
    conversation: conversation._id,
    direction: "outbound",
    messageType: "text",
    text,
    status: sendResult?.ok === false ? "failed" : "sent",
    raw: sendResult || {},
    metadata: { source: "manual" },
  });

  conversation.lastMessage = text;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  return json({ data: message, sendResult });
});
