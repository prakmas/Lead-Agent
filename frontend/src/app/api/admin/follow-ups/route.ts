import FollowUp from "@/server/models/FollowUp.js";
import { requireAuth } from "@/server/auth.js";
import { route, json, parseListQuery, paginate } from "@/server/http.js";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requireAuth(request);
  const options = parseListQuery(request);
  const query: Record<string, unknown> = {};
  if (options.get("status")) query.status = options.get("status");
  if (options.get("leadId")) query.lead = options.get("leadId");

  const result = await paginate(
    FollowUp.find(query).populate("lead").populate("contact").sort({ scheduledAt: 1 }),
    FollowUp.countDocuments(query),
    options,
  );
  return json(result);
});
