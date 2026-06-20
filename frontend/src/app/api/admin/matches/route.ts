import Match from "@/server/models/Match.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json, parseListQuery, paginate } from "@/server/http.js";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requireApiAccess(request);
  const options = parseListQuery(request);
  const query: Record<string, unknown> = {};
  if (options.get("status")) query.status = options.get("status");
  if (options.get("leadId")) query.lead = options.get("leadId");

  const result = await paginate(
    Match.find(query).populate("lead").populate("listing").sort({ score: -1, createdAt: -1 }),
    Match.countDocuments(query),
    options,
  );
  return json(result);
});
