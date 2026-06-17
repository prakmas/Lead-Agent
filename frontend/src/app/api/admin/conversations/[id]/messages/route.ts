import Message from "@/server/models/Message.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, ctx: Ctx) => {
  await requireApiAccess(request);
  const { id } = await ctx.params;
  const messages = await Message.find({ conversation: id })
    .sort({ createdAt: 1 })
    .populate("channel")
    .populate("contact");
  return json({ data: messages });
});
