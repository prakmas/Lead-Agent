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
    body: JSON.stringify({
      model: env.ai.openaiModel,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    }),
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
        body: JSON.stringify({
          model: env.ai.openaiModel,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: system }, { role: "user", content: text }],
        }),
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
