import Listing from "@/server/models/Listing.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json, parseListQuery, paginate } from "@/server/http.js";
import { triggerRematchForNewListing } from "@/server/services/followUp.service.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

export const GET = route(async (request: Request) => {
  await requireApiAccess(request);
  const options = parseListQuery(request);
  const query: Record<string, unknown> = {};
  if (options.get("status")) query.status = options.get("status");
  if (options.get("category")) query.category = new RegExp(options.get("category") as string, "i");
  if (options.search) query.$text = { $search: options.search };

  const result = await paginate(
    // Exclude the heavy full-size images from the list (keep the small thumb).
    Listing.find(query).select("-images").sort({ createdAt: -1 }),
    Listing.countDocuments(query),
    options,
  );
  return json(result);
});

export const POST = route(async (request: Request) => {
  await requireApiAccess(request);
  const body = await request.json();
  if (!body.title || !body.category) throw createHttpError(400, "Title and category are required");

  const listing = await Listing.create(body);

  // Notify any matching active leads (runs in the background).
  triggerRematchForNewListing(listing)
    .then((count: number) => {
      if (count > 0) console.log(`[rematch] new listing triggered ${count} follow-up(s)`);
    })
    .catch((err: Error) => console.error("[rematch]", err.message));

  return json(listing, 201);
});
