import Lead from "@/server/models/Lead.js";
import { requireAuth } from "@/server/auth.js";
import { route, json, parseListQuery, paginate } from "@/server/http.js";
import { leadStatuses } from "@/server/utils/leadStatus.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requireAuth(request);
  const options = parseListQuery(request);
  const query: Record<string, unknown> = {};
  if (options.get("status")) query.status = options.get("status");
  if (options.get("channel")) query.channel = options.get("channel");
  if (options.search) query.$text = { $search: options.search };

  const result = await paginate(
    Lead.find(query).populate("contact").sort({ createdAt: -1 }),
    Lead.countDocuments(query),
    options,
  );
  return json(result);
});

export const POST = route(async (request: Request) => {
  await requireAuth(request);
  const { title, category, channel = "manual", status = "New", requirements = {} } = await request.json();
  if (!title || !category) throw createHttpError(400, "Title and category are required");
  if (!leadStatuses.includes(status)) throw createHttpError(400, "Invalid lead status");
  const lead = await Lead.create({ title, category, channel, status, requirements });
  return json(lead, 201);
});
