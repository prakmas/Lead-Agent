import Location from "@/server/models/Location.js";
import GeoPlace from "@/server/models/GeoPlace.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

// Autocomplete for places across India. Curated states/cities come from the
// `locations` collection; the deep long tail (towns / villages / localities)
// comes from the `geoplaces` gazetteer (~546k docs) via an index-backed prefix
// match so it stays fast at scale.
//   GET /api/locations/search?q=kor&limit=10
export const GET = route(async (request: Request) => {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") || "").trim().toLowerCase();
  const limit = Math.min(Number(params.get("limit") || 10), 30);
  if (q.length < 2) return json({ data: [] });

  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const contains = new RegExp(esc);
  const prefix = new RegExp("^" + esc);

  // Curated states/cities (small collection — a contains scan is fine).
  const curated = await Location.find({ search: contains }).limit(limit * 4);
  const curatedItems = curated
    .map((r) => ({
      score: (prefix.test(r.search) ? 2 : 0) + (r.type === "state" ? 1 : 0),
      name: r.name,
      label: r.label,
      type: r.type,
      state: r.state,
      city: r.city,
      country: r.country,
    }))
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length);

  // Deep gazetteer — prefix-anchored so the `search` index is used at 500k+ docs.
  const places = await GeoPlace.find({ search: prefix }).limit(limit * 2);
  const placeItems = places.map((p) => ({
    name: p.name,
    label: [p.name, p.district, p.state].filter(Boolean).join(", "),
    type: p.type || "village",
    state: p.state,
    city: p.district,
    country: "India",
  }));

  // Curated first (states/cities are the strongest signals), then villages.
  // De-dupe by label so a city present in both collections shows once.
  const seen = new Set<string>();
  const data = [...curatedItems, ...placeItems]
    .filter((it) => {
      const key = (it.label || it.name || "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ name, label, type, state, city, country }) => ({ name, label, type, state, city, country }));

  return json({ data });
});
