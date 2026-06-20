import Message from "@/server/models/Message.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json, parseListQuery, paginate } from "@/server/http.js";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requireApiAccess(request);
  const options = parseListQuery(request);
  const query = options.search ? { $text: { $search: options.search } } : {};

  const result = await paginate(
    Message.find(query).populate("conversation").populate("contact").sort({ createdAt: -1 }),
    Message.countDocuments(query),
    options,
  );
  return json(result);
});
