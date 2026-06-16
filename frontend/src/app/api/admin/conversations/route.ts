import Conversation from "@/server/models/Conversation.js";
import { requireAuth } from "@/server/auth.js";
import { route, json, parseListQuery, paginate } from "@/server/http.js";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requireAuth(request);
  const options = parseListQuery(request);
  const query: Record<string, unknown> = {};
  if (options.get("status")) query.status = options.get("status");

  const result = await paginate(
    Conversation.find(query)
      .populate("channel")
      .populate("contact")
      .populate("lead")
      .sort({ lastMessageAt: -1, updatedAt: -1 }),
    Conversation.countDocuments(query),
    options,
  );
  return json(result);
});
