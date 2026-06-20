import DeletedListing from "@/server/models/DeletedListing.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json, parseListQuery, paginate } from "@/server/http.js";
import { territoryListingQuery } from "@/server/utils/territory.js";

export const dynamic = "force-dynamic";

const escapeRx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// List deleted (removed) listings — same filters as active listings, scoped to
// the supervisor's territory.
export const GET = route(async (request: Request) => {
  const admin = await requireApiAccess(request);
  const options = parseListQuery(request);
  const query: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  const terr = territoryListingQuery(admin) as { $or?: unknown[]; _id?: null };
  if (terr.$or) and.push({ $or: terr.$or });
  else if (terr._id === null) query._id = null;

  if (options.get("category")) query.category = new RegExp(options.get("category") as string, "i");
  if (options.get("createdBy")) query.createdBy = options.get("createdBy");
  if (options.get("state")) query["metadata.state"] = options.get("state");
  if (options.get("district")) query["metadata.city"] = options.get("district");
  if (options.get("area")) query["metadata.area"] = options.get("area");
  const pincode = options.get("pincode");
  if (pincode) {
    const pins = pincode.split(",").map((p) => p.trim()).filter(Boolean);
    if (pins.length === 1) query["metadata.pincode"] = pins[0];
    else if (pins.length > 1) query["metadata.pincode"] = { $in: pins };
  }
  const place = options.get("place");
  if (place && place.trim()) {
    const rx = new RegExp(escapeRx(place.trim()), "i");
    and.push({ $or: [{ "metadata.pincode": rx }, { "metadata.state": rx }, { "metadata.city": rx }, { "metadata.area": rx }, { location: rx }] });
  }
  if (options.search) query.$text = { $search: options.search };
  if (and.length) query.$and = and;

  const result = await paginate(
    DeletedListing.find(query)
      .select("-images")
      .populate({ path: "createdBy", select: "name email role" })
      .populate({ path: "deletedBy", select: "name email role" })
      .sort({ deletedAt: -1 }),
    DeletedListing.countDocuments(query),
    options,
  );
  return json(result);
});
