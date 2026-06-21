import env from "../config/env.js";

// Extracts a structured business listing from a user's free-text WhatsApp message.
// Provider-agnostic: uses whichever AI provider is configured (Gemini now, OpenAI
// when a key is added) and falls back to a heuristic parser so it never breaks.

const SYSTEM_PROMPT = `You extract a local-business LISTING from a user's free-text message (they want to LIST / register / advertise their own business or service so customers can find them).

Return ONLY valid minified JSON (no markdown, no code fences) with EXACTLY this schema:
{
  "isListing": true | false,
  "title": "business name, or a short name like 'AC Service & Repair' if no brand name given, else empty string",
  "category": "the service category in Title Case, e.g. Electrician, Plumbing, AC Service & Repair, Salon, Catering, Tutoring, Carpenter, Cleaning, Restaurant, Grocery, else empty string",
  "location": "area / locality / city mentioned, or empty string",
  "pincode": "6-digit Indian pincode if present, else empty string",
  "priceLabel": "price or rate text exactly as a short label, e.g. '₹499 service' or '₹300 visit', else empty string",
  "services": "one short sentence describing what they do, else empty string",
  "ownerName": "person/owner name if stated, else empty string",
  "contactPhone": "a phone number if explicitly given in the text, else empty string"
}

Rules:
- isListing = true ONLY if the user is offering/registering/listing THEIR OWN business or service (phrases like "list my", "register my", "I run", "I provide", "I offer", "I am a <profession>", "my shop/business"). If they are SEARCHING for a service ("I need", "looking for", "find me"), isListing = false.
- Never invent a phone number, price, or location that is not in the text. Use "" when absent.
- category should be a clean canonical label, not a whole sentence.`;

const stripFences = (s) => s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

// gpt-5* models reject a custom temperature (only the default 1). For those we use
// reasoning_effort:"minimal" to stay fast; other models keep a low temperature.
const isGpt5 = () => /^gpt-5/i.test(env.ai.openaiModel || "");
const openaiPayload = (messages) =>
  JSON.stringify({
    model: env.ai.openaiModel,
    ...(isGpt5() ? { reasoning_effort: "minimal" } : { temperature: 0.1 }),
    response_format: { type: "json_object" },
    messages,
  });

async function geminiExtract(message) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.ai.geminiModel}:generateContent?key=${env.ai.geminiApiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: message }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini listing extract failed: ${await res.text()}`);
  const body = await res.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(stripFences(text));
}

async function openaiExtract(message) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.ai.openaiApiKey}` },
    body: openaiPayload([{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: message }]),
  });
  if (!res.ok) throw new Error(`OpenAI listing extract failed: ${await res.text()}`);
  const body = await res.json();
  const text = body.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no content");
  return JSON.parse(stripFences(text));
}

// Heuristic fallback — keyword based. Keeps the bot working with no AI key.
const LISTING_WORDS = [
  "list my", "list a", "register my", "register a", "add my", "i run", "i own", "i provide",
  "i offer", "i sell", "i do ", "we provide", "we offer", "my shop", "my business", "my service",
  "i am a", "i'm a", "want to list", "want to register",
];
const CATEGORY_HINTS = {
  Electrician: ["electric", "electrician", "wiring"],
  Plumbing: ["plumb", "plumber", "pipe", "tap"],
  "AC Service & Repair": ["ac ", "a/c", "air condition", "cooling"],
  Salon: ["salon", "barber", "haircut", "beauty", "parlour", "parlor"],
  Catering: ["cater", "tiffin", "food supply"],
  Tutoring: ["tutor", "tuition", "coaching", "classes"],
  Carpenter: ["carpenter", "wood", "furniture"],
  Cleaning: ["clean", "housekeeping", "maid", "pest"],
  Restaurant: ["restaurant", "hotel", "mess", "cafe"],
  Grocery: ["grocery", "kirana", "supermarket", "store"],
};

function heuristicExtract(message) {
  const lower = message.toLowerCase();
  const isListing = LISTING_WORDS.some((w) => lower.includes(w));
  let category = "";
  for (const [cat, hints] of Object.entries(CATEGORY_HINTS)) {
    if (hints.some((h) => lower.includes(h))) { category = cat; break; }
  }
  const pincode = (message.match(/\b(\d{6})\b/) || [])[1] || "";
  const phone = (message.match(/\b(\+?\d[\d\s-]{8,13}\d)\b/) || [])[1]?.replace(/\D/g, "") || "";
  const price = (message.match(/(₹\s?\d[\d,]*\s?\/?-?\s?\w*)/) || [])[1] || "";
  const locMatch = message.match(/\b(?:in|at|near|around)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  const location = locMatch ? locMatch[1] : "";
  return {
    isListing,
    title: category || "",
    category,
    location,
    pincode,
    priceLabel: price.trim(),
    services: "",
    ownerName: "",
    contactPhone: phone,
  };
}

const clean = (v) => (typeof v === "string" ? v.trim() : "");

// ── Single-field interpreter ──────────────────────────────────────────────────
// Cleans one messy answer at a time for the listing wizard (allows spelling
// mistakes, vague words). Returns { value, understood }.
const FIELD_RULES = {
  service_category:
    'Map to ONE clean service category in Title Case (e.g. Electrician, Plumbing, "AC Service & Repair", Salon, "Beauty Parlour", Tutoring, Tailoring, Mechanic, Carpenter, Catering, Cleaning, Painter, "Mobile Repair"). Vague answers like "current work"->Electrician, "light fan work"->Electrician. understood=false ONLY if truly impossible to guess.',
  service_description:
    'Rewrite the messy text into a clean, comma-separated list of services in simple English. e.g. "elec work fan light"->"Fan repair, light fitting, electrical work".',
  available_time:
    'Normalize to a short time range. e.g. "morning 9 to night 8"->"9 AM to 8 PM", "all day"->"All day".',
  city_state: 'Return "City, State" in Title Case. e.g. "hyderabad telangana"->"Hyderabad, Telangana".',
};

export const interpretField = async (field, text) => {
  const rule = FIELD_RULES[field];
  if (!rule) return { value: clean(text), understood: true };
  const system = `You clean ONE field for a service-listing wizard. Field="${field}". ${rule}\nReturn ONLY minified JSON: {"value":"...","understood":true|false}. Never invent unrelated info.`;
  try {
    let raw;
    if (env.ai.provider === "openai" && env.ai.openaiApiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.ai.openaiApiKey}` },
        body: openaiPayload([{ role: "system", content: system }, { role: "user", content: text }]),
      });
      if (!res.ok) throw new Error(await res.text());
      raw = JSON.parse(stripFences((await res.json()).choices?.[0]?.message?.content || "{}"));
    } else if (env.ai.geminiApiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.ai.geminiModel}:generateContent?key=${env.ai.geminiApiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      raw = JSON.parse(stripFences((await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || "{}"));
    }
    if (raw && typeof raw.value === "string") {
      return { value: raw.value.trim(), understood: raw.understood !== false };
    }
  } catch (error) {
    console.error(`[interpretField:${field}] AI failed:`, error.message);
  }
  // Fallback: return the raw text as-is.
  return { value: clean(text), understood: clean(text).length > 0 };
};

// ── Marketplace extractor ─────────────────────────────────────────────────────
// Understands messy/short/broken English-Hindi-Telugu messages for BOTH listing
// and searching across real-estate, vehicles and services.
const MARKET_PROMPT = `You are an assistant for a local marketplace. Read the user's message (it may be short, broken English, Hindi/Telugu words, with spelling mistakes) and return ONLY minified JSON:
{
 "intent": "CREATE_LISTING" | "SEARCH_LISTING" | "UNKNOWN",
 "category": "real_estate" | "vehicle" | "service" | "other" | "",
 "listing_type": "sell" | "rent" | "service" | "buy" | "",
 "item": "short item/service, e.g. flat, house, plot, car, bike, plumber, electrician, tuition",
 "title": "a short clean listing title, else empty",
 "society": "apartment/society/building/project/gated-community name if any, else empty",
 "address": "flat/door no + block + street/road as a single line if mentioned, else empty",
 "location": "area/neighborhood if any, else empty",
 "city": "city if any, else empty",
 "state": "US state name or 2-letter abbreviation if any, else empty",
 "pincode": "5-digit US ZIP code if present, else empty",
 "price": "PLAIN NUMBER in US dollars, else empty",
 "contact_number": "10-digit mobile if present, else empty",
 "description": "one short clean sentence, else empty"
}
Rules:
- intent = CREATE_LISTING when the user wants to SELL / RENT OUT / OFFER their OWN item or service: sell, list, post, "add my", "my service", "rent out", "for sale", "for rent", "i am a <job>", "i provide/offer/run".
- intent = SEARCH_LISTING when the user wants to BUY / FIND / RENT something: need, "looking for", "want to buy", "want to purchase", purchase, buy, "i want a", "any ... available", "available?", required, find, "show me".
- "sell my car" = CREATE_LISTING. "buy a car" / "purchase a car" / "want a car" = SEARCH_LISTING.
- Greetings or anything you truly cannot classify = UNKNOWN.
- category: real_estate (apartment/house/condo/townhouse/studio/room/land/property), vehicle (car/truck/suv/sedan/motorcycle/van/boat), service (plumber/electrician/handyman/cleaning/landscaping/tutor/mover/hvac/mechanic/painter), else other.
- listing_type: for real_estate/vehicle use "sell" or "rent"; for services use "service".
- For real_estate, also capture society (building/community name), address (apt/unit no + street), location (neighborhood/area), city and pincode (ZIP) whenever the user gives them. Never invent them.
- This is a US marketplace. price: convert to a plain dollar number — "$4,000"->4000, "25k"->25000, "1.2 million"->1200000, "1200"->1200. Empty if none.
- Never invent values. Use "" when absent.`;

async function marketGemini(message) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.ai.geminiModel}:generateContent?key=${env.ai.geminiApiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: MARKET_PROMPT }] },
      contents: [{ parts: [{ text: message }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return JSON.parse(stripFences((await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || "{}"));
}

async function marketOpenAI(message) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.ai.openaiApiKey}` },
    body: openaiPayload([{ role: "system", content: MARKET_PROMPT }, { role: "user", content: message }]),
  });
  if (!res.ok) throw new Error(await res.text());
  return JSON.parse(stripFences((await res.json()).choices?.[0]?.message?.content || "{}"));
}

const SEARCH_WORDS = ["need", "looking for", "want to buy", "required", "available", "find me", "searching", "kavali", "kaavali"];
const CREATE_WORDS = ["sell", "list", "post", "add my", "my service", "rent out", "for sale", "for rent", "i am a", "i provide", "i offer", "i run", "my flat", "my house", "my car", "my bike", "list my", "ammali", "ammu"];

function marketHeuristic(message) {
  const lower = message.toLowerCase();
  const isSearch = SEARCH_WORDS.some((w) => lower.includes(w));
  const isCreate = !isSearch && CREATE_WORDS.some((w) => lower.includes(w));
  let category = "", item = "";
  const map = {
    real_estate: ["flat", "house", "plot", "land", "apartment", "villa", "pg", "room", "rent"],
    vehicle: ["car", "bike", "scooter", "truck", "auto", "swift", "i20"],
    service: ["plumber", "electric", "tutor", "carpenter", "maid", "mechanic", "salon", "painter", "clean"],
  };
  for (const [cat, words] of Object.entries(map)) {
    const hit = words.find((w) => lower.includes(w));
    if (hit) { category = cat; item = hit; break; }
  }
  const price = (() => {
    const m = lower.match(/(\d[\d.,]*)\s*(lakh|lac|lk|cr|crore|k|thousand)?/);
    if (!m) return "";
    let n = parseFloat(m[1].replace(/,/g, ""));
    const u = m[2] || "";
    if (/lakh|lac|lk/.test(u)) n *= 100000;
    else if (/cr|crore/.test(u)) n *= 10000000;
    else if (/k|thousand/.test(u)) n *= 1000;
    return n ? String(Math.round(n)) : "";
  })();
  const phone = (message.match(/\b(\d{10})\b/) || [])[1] || "";
  return {
    intent: isCreate ? "CREATE_LISTING" : isSearch ? "SEARCH_LISTING" : "UNKNOWN",
    category, listing_type: lower.includes("rent") ? "rent" : category === "service" ? "service" : "sell",
    item, title: "", location: "", city: "", price, contact_number: phone, description: "",
  };
}

export const extractMarketplace = async (message) => {
  let raw;
  try {
    if (env.ai.provider === "openai" && env.ai.openaiApiKey) raw = await marketOpenAI(message);
    else if (env.ai.geminiApiKey) raw = await marketGemini(message);
  } catch (error) {
    console.error("[extractMarketplace] AI failed, heuristic:", error.message);
  }
  if (!raw || !raw.intent) raw = marketHeuristic(message);
  return {
    intent: ["CREATE_LISTING", "SEARCH_LISTING", "UNKNOWN"].includes(raw.intent) ? raw.intent : "UNKNOWN",
    category: clean(raw.category),
    listing_type: clean(raw.listing_type),
    item: clean(raw.item),
    title: clean(raw.title),
    society: clean(raw.society),
    address: clean(raw.address),
    location: clean(raw.location),
    city: clean(raw.city),
    state: clean(raw.state),
    pincode: clean(raw.pincode).replace(/\D/g, "").slice(0, 6),
    price: clean(raw.price).replace(/\D/g, ""),
    contact_number: clean(raw.contact_number).replace(/\D/g, "").slice(-10),
    description: clean(raw.description),
  };
};

/** Extract a listing from free text. Always returns a normalized object. */
export const extractListing = async (message) => {
  let raw;
  try {
    if (env.ai.provider === "openai" && env.ai.openaiApiKey) raw = await openaiExtract(message);
    else if (env.ai.geminiApiKey) raw = await geminiExtract(message);
    else if (env.ai.openaiApiKey) raw = await openaiExtract(message);
  } catch (error) {
    console.error("[listingExtractor] AI failed, using heuristic:", error.message);
  }
  if (!raw) raw = heuristicExtract(message);

  return {
    isListing: Boolean(raw.isListing),
    title: clean(raw.title),
    category: clean(raw.category),
    location: clean(raw.location),
    pincode: clean(raw.pincode).replace(/\D/g, "").slice(0, 6),
    priceLabel: clean(raw.priceLabel),
    services: clean(raw.services),
    ownerName: clean(raw.ownerName),
    contactPhone: clean(raw.contactPhone).replace(/\D/g, ""),
  };
};

export default extractListing;
