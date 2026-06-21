import env from "../config/env.js";
import ExternalListing from "../models/ExternalListing.js";

// Pulls real US listings from public marketplaces via Firecrawl when our own DB is
// thin, structures the scraped page with the AI, and caches the result (6h) so we
// don't re-scrape (saves Firecrawl credits + keeps repeat searches instant).
// Sources verified to return data: Cars.com (vehicles), Trulia (homes for sale),
// Rent.com (rentals), Yelp (services).

// State abbreviation -> lowercase full name (for URL building).
const US_STATES = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado",
  CT: "connecticut", DE: "delaware", FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho",
  IL: "illinois", IN: "indiana", IA: "iowa", KS: "kansas", KY: "kentucky", LA: "louisiana",
  ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi",
  MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada", NH: "new-hampshire", NJ: "new-jersey",
  NM: "new-mexico", NY: "new-york", NC: "north-carolina", ND: "north-dakota", OH: "ohio", OK: "oklahoma",
  OR: "oregon", PA: "pennsylvania", RI: "rhode-island", SC: "south-carolina", SD: "south-dakota",
  TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont", VA: "virginia", WA: "washington",
  WV: "west-virginia", WI: "wisconsin", WY: "wyoming", DC: "washington-dc",
};

// Major-city -> state fallback (when the user didn't say the state).
const CITY_STATE = {
  austin: "TX", dallas: "TX", houston: "TX", "san antonio": "TX", "fort worth": "TX", "el paso": "TX",
  "los angeles": "CA", "san francisco": "CA", "san diego": "CA", "san jose": "CA", sacramento: "CA",
  "long beach": "CA", fresno: "CA", oakland: "CA", "new york": "NY", "new york city": "NY", brooklyn: "NY",
  chicago: "IL", phoenix: "AZ", tucson: "AZ", philadelphia: "PA", pittsburgh: "PA", jacksonville: "FL",
  miami: "FL", orlando: "FL", tampa: "FL", atlanta: "GA", boston: "MA", seattle: "WA", denver: "CO",
  "las vegas": "NV", portland: "OR", nashville: "TN", memphis: "TN", charlotte: "NC", raleigh: "NC",
  columbus: "OH", cincinnati: "OH", cleveland: "OH", indianapolis: "IN", detroit: "MI", washington: "DC",
  "kansas city": "MO", "st louis": "MO", "saint louis": "MO", minneapolis: "MN", "salt lake city": "UT",
  "oklahoma city": "OK", albuquerque: "NM", "virginia beach": "VA", baltimore: "MD", milwaukee: "WI",
  "new orleans": "LA",
};

// Representative ZIP per state (largest city) — fallback when we only know the state.
const STATE_ZIP = {
  AL: "35203", AK: "99501", AZ: "85003", AR: "72201", CA: "90012", CO: "80202", CT: "06103",
  DE: "19801", FL: "33101", GA: "30303", HI: "96813", ID: "83702", IL: "60601", IN: "46204",
  IA: "50309", KS: "67202", KY: "40202", LA: "70112", ME: "04101", MD: "21201", MA: "02108",
  MI: "48226", MN: "55401", MS: "39201", MO: "64106", MT: "59101", NE: "68102", NV: "89101",
  NH: "03101", NJ: "07102", NM: "87102", NY: "10001", NC: "28202", ND: "58102", OH: "43215",
  OK: "73102", OR: "97204", PA: "19103", RI: "02903", SC: "29201", SD: "57104", TN: "37203",
  TX: "77002", UT: "84101", VT: "05401", VA: "23451", WA: "98101", WV: "25301", WI: "53202",
  WY: "82001", DC: "20001",
};

const enc = encodeURIComponent;
const slug = (s) => (s || "").trim().replace(/\s+/g, "-");
const cityCap = (s) => (s || "").trim().replace(/\b\w/g, (c) => c.toUpperCase());

// Resolve the best ZIP for a location: explicit zip > city+state lookup > state default.
const resolveZip = async ({ zip, city, stateCode }) => {
  if (zip && /^\d{5}$/.test(zip)) return zip;
  if (city && stateCode) {
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${stateCode}/${enc(city)}`, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const pc = (await res.json())?.places?.[0]?.["post code"];
        if (pc) return pc;
      }
    } catch {}
  }
  return stateCode && STATE_ZIP[stateCode] ? STATE_ZIP[stateCode] : "";
};

const resolveState = ({ state, city }) => {
  if (state) {
    const up = state.trim().toUpperCase();
    if (US_STATES[up]) return up;
    const found = Object.entries(US_STATES).find(([, n]) => n === slug(state.toLowerCase()));
    if (found) return found[0];
  }
  return CITY_STATE[(city || "").trim().toLowerCase()] || "";
};

// Choose the site + URL to scrape for a given search.
const buildSource = ({ category, listing_type, item, city, stateCode, zip }) => {
  const q = enc(item || "");
  if (category === "vehicle") {
    if (!zip) return null; // need a real ZIP, otherwise every search returns the same place
    return { name: "Cars.com", url: `https://www.cars.com/shopping/results/?stock_type=used&maximum_distance=50&zip=${zip}&keyword=${q}` };
  }
  if (category === "real_estate") {
    if (listing_type === "rent") {
      const st = US_STATES[stateCode];
      if (!st || !city) return null;
      return { name: "Rent.com", url: `https://www.rent.com/${st}/${slug(city.toLowerCase())}-apartments` };
    }
    if (!stateCode || !city) return null;
    return { name: "Trulia", url: `https://www.trulia.com/${stateCode}/${slug(cityCap(city))}/` };
  }
  if (category === "service") {
    if (!city) return null;
    const loc = `${cityCap(city)}${stateCode ? `, ${stateCode}` : ""}`;
    return { name: "Yelp", url: `https://www.yelp.com/search?find_desc=${q}&find_loc=${enc(loc)}` };
  }
  return null;
};

async function firecrawlScrape(url) {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.external.firecrawlKey}` },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || "firecrawl failed");
  return body.data?.markdown || "";
}

const isGpt5 = () => /^gpt-5/i.test(env.ai.openaiModel || "");
async function structureListings(markdown, { item, city, limit }) {
  const sys =
    `You are given the scraped text of a US marketplace/directory search page. Extract up to ${limit} REAL results for "${item}" in/near ${city}. ` +
    `Return ONLY minified JSON {"listings":[{"title","price","location","url","description"}]} where price is a plain USD number (no symbols/commas, empty if not shown), ` +
    `url is the result's link if present (else ""), description is one short line. ` +
    `For SERVICE BUSINESSES (e.g. Yelp), title = the business name, price is usually empty, location = their area/neighborhood, and include rating/phone in description. ` +
    `Ignore navigation, filters, ads, and anything that isn't a real result. If none, {"listings":[]}.`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.ai.openaiApiKey}` },
    body: JSON.stringify({
      model: env.ai.openaiModel,
      ...(isGpt5() ? { reasoning_effort: "minimal" } : { temperature: 0.1 }),
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: sys }, { role: "user", content: markdown.slice(0, 18000) }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const body = await res.json();
  const parsed = JSON.parse(body.choices?.[0]?.message?.content || "{}");
  return Array.isArray(parsed.listings) ? parsed.listings : [];
}

const num = (v) => Number(String(v ?? "").replace(/[^\d.]/g, "")) || undefined;
const norm = (l) => {
  const price = num(l.price);
  return {
    title: String(l.title || "").slice(0, 120),
    price,
    priceLabel: price ? `$${price.toLocaleString("en-US")}` : "",
    location: String(l.location || "").slice(0, 120),
    url: String(l.url || "").slice(0, 400),
    description: String(l.description || "").slice(0, 160),
  };
};

// Public: up to `limit` external listings (cached 6h). NEVER throws — returns [] on
// any failure so the bot degrades gracefully.
export const getExternalListings = async ({ category, listing_type, item, city, state, zip, limit = 5 }) => {
  if (!env.external.firecrawlKey || limit <= 0) return { source: null, listings: [] };
  const stateCode = resolveState({ state, city });
  // Vehicles need a precise ZIP — resolve from city/state so different places give
  // different results (fixes "New York" returning Austin cars).
  const useZip = category === "vehicle" ? await resolveZip({ zip, city, stateCode }) : zip;
  const cacheKey = `${category}:${listing_type || ""}:${(city || "").toLowerCase()}:${stateCode}:${useZip || ""}:${(item || "").toLowerCase()}`;
  try {
    const cached = await ExternalListing.findOne({ cacheKey }).sort({ createdAt: -1 });
    if (cached) return { source: cached.source, listings: cached.listings.slice(0, limit) };
  } catch {}
  const src = buildSource({ category, listing_type, item, city, stateCode, zip: useZip });
  if (!src) return { source: null, listings: [] };
  try {
    const md = await firecrawlScrape(src.url);
    if (!md) return { source: src.name, listings: [] };
    const raw = await structureListings(md, { item, city: city || stateCode || useZip, limit });
    const listings = raw.map(norm).filter((l) => l.title && (l.price || l.url || l.location)).slice(0, limit);
    ExternalListing.create({ cacheKey, source: src.name, category, city: city || stateCode || useZip, item, listings }).catch(() => {});
    return { source: src.name, listings };
  } catch (e) {
    console.error("[externalSource]", src?.name, e.message);
    return { source: src?.name || null, listings: [] };
  }
};

export default getExternalListings;
