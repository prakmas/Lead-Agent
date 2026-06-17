import Listing from "@/server/models/Listing.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import { territoryListingQuery } from "@/server/utils/territory.js";

export const dynamic = "force-dynamic";

const sortStrings = (arr: unknown[]) =>
  (arr as string[]).filter((v) => v && v.trim()).sort((a, b) => a.localeCompare(b));

// Cascading filter options sourced from the listings themselves (so every option
// is guaranteed to return results) and scoped to the supervisor's territory.
//   states  → always
//   districts → if state
//   areas   → if state + district
//   pincodes → if state (narrowed by district/area when provided) — for the
//              multi-select pincode dropdown
export const GET = route(async (request: Request) => {
  const admin = await requireApiAccess(request);
  const params = new URL(request.url).searchParams;
  const state = params.get("state") || "";
  const district = params.get("district") || "";
  const area = params.get("area") || "";

  const base = { ...(territoryListingQuery(admin) as Record<string, unknown>), status: { $ne: "archived" } };

  const states = sortStrings(await Listing.distinct("metadata.state", base));

  let districts: string[] = [];
  if (state) {
    districts = sortStrings(await Listing.distinct("metadata.city", { ...base, "metadata.state": state }));
  }

  let areas: string[] = [];
  if (state && district) {
    areas = sortStrings(
      await Listing.distinct("metadata.area", { ...base, "metadata.state": state, "metadata.city": district }),
    );
  }

  let pincodes: string[] = [];
  if (state) {
    const scope: Record<string, unknown> = { ...base, "metadata.state": state };
    if (district) scope["metadata.city"] = district;
    if (area) scope["metadata.area"] = area;
    pincodes = sortStrings(await Listing.distinct("metadata.pincode", scope));
  }

  return json({ states, districts, areas, pincodes });
});
