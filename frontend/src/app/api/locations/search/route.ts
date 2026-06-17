import Location from "@/server/models/Location.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

// Autocomplete for states/cities. Public reference data — used by the dashboard
// and to validate/normalise the locations customers type.
//   GET /api/locations/search?q=kor&limit=10
export const GET = route(async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") || "").trim().toLowerCase();
  const limit = Math.min(Number(params.get("limit") || 10), 30);
  if (q.length < 2) return json({ data: [] });

  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const contains = new RegExp(esc);
  const prefix = new RegExp("^" + esc);

  const results = await Location.find({ search: contains }).limit(limit * 4);
  const data = results
    .map((r) => ({
      r,
      // Prefix matches and states rank higher.
      score: (prefix.test(r.search) ? 2 : 0) + (r.type === "state" ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.r.name.length - b.r.name.length)
    .slice(0, limit)
    .map(({ r }) => ({
      name: r.name,
      label: r.label,
      type: r.type,
      state: r.state,
      city: r.city,
      country: r.country,
    }));

  return json({ data });
});
