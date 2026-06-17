import Listing from "@/server/models/Listing.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import { territoryListingQuery } from "@/server/utils/territory.js";

export const dynamic = "force-dynamic";

const sortStrings = (arr: unknown[]) =>
  (arr as string[]).filter((v) => v && v.trim()).sort((a, b) => a.localeCompare(b));

// Cascading filter options sourced from the listings themselves (so every option
// is guaranteed to return results) and scoped to the supervisor's territory.
//   GET /admin/listings/facets                  → { states }
//   GET /admin/listings/facets?state=X          → { states, districts }
//   GET /admin/listings/facets?state=X&district=Y → { states, districts, areas }
export const GET = route(async (request: Request) => {
  const admin = await requireApiAccess(request);
  const params = new URL(request.url).searchParams;
  const state = params.get("state") || "";
  const district = params.get("district") || "";

  const base = territoryListingQuery(admin) as Record<string, unknown>;

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

  return json({ states, districts, areas });
});
