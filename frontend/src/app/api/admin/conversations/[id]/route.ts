import Conversation from "@/server/models/Conversation.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = ["open", "waiting", "matched", "closed", "stopped", "spam"];

// Update a conversation: change status, toggle the auto-reply bot, or clear unread.
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  await requireApiAccess(request);
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const conversation = await Conversation.findById(id);
  if (!conversation) return json({ message: "Conversation not found" }, 404);

  if (typeof body.status === "string" && STATUSES.includes(body.status)) {
    conversation.status = body.status;
  }
  if (typeof body.botEnabled === "boolean") {
    conversation.metadata = { ...conversation.metadata, botEnabled: body.botEnabled };
    conversation.markModified("metadata");
  }
  if (body.markRead === true) {
    conversation.unreadCount = 0;
  }
  if (body.markUnread === true) {
    conversation.unreadCount = Math.max(1, conversation.unreadCount || 0);
  }

  await conversation.save();
  const populated = await Conversation.findById(id)
    .populate("channel")
    .populate("contact")
    .populate("lead");
  return json({ data: populated });
});
