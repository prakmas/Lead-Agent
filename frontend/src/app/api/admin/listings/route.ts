import Listing from "@/server/models/Listing.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json, parseListQuery, paginate } from "@/server/http.js";
import { triggerRematchForNewListing } from "@/server/services/followUp.service.js";
import { territoryListingQuery } from "@/server/utils/territory.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GET = route(async (request: Request) => {
  const admin = await requireApiAccess(request);
  const options = parseListQuery(request);
  const query: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  // Visibility is scoped to the supervisor's territory (owner sees all).
  const terr = territoryListingQuery(admin) as { $or?: unknown[]; _id?: null };
  if (terr.$or) and.push({ $or: terr.$or });
  else if (terr._id === null) query._id = null; // supervisor with no territory → nothing

  if (options.get("status")) query.status = options.get("status");
  if (options.get("category")) query.category = new RegExp(options.get("category") as string, "i");
  // Filter by the supervisor who created the listing (admin oversight).
  if (options.get("createdBy")) query.createdBy = options.get("createdBy");

  // Flexible place filter — matches pincode / state / district / mandal / village
  // (area) or the flat location string, case-insensitively.
  const place = options.get("place");
  if (place && place.trim()) {
    const rx = new RegExp(escapeRx(place.trim()), "i");
    and.push({
      $or: [
        { "metadata.pincode": rx },
        { "metadata.state": rx },
        { "metadata.city": rx },
        { "metadata.area": rx },
        { location: rx },
      ],
    });
  }

  if (options.search) query.$text = { $search: options.search };
  if (and.length) query.$and = and;

  const result = await paginate(
    // Exclude the heavy full-size images from the list (keep the small thumb).
    // Populate the creator so the UI can show "listed by …" and gate editing.
    Listing.find(query)
      .select("-images")
      .populate({ path: "createdBy", select: "name email" })
      .sort({ createdAt: -1 }),
    Listing.countDocuments(query),
    options,
  );
  return json(result);
});

export const POST = route(async (request: Request) => {
  const admin = await requireApiAccess(request);
  const body = await request.json();
  if (!body.title || !body.category) throw createHttpError(400, "Title and category are required");

  const listing = await Listing.create({ ...body, createdBy: admin._id });

  // Notify any matching active leads (runs in the background).
  triggerRematchForNewListing(listing)
    .then((count: number) => {
      if (count > 0) console.log(`[rematch] new listing triggered ${count} follow-up(s)`);
    })
    .catch((err: Error) => console.error("[rematch]", err.message));

  return json(listing, 201);
});
