import Listing from "../models/Listing.js";
import Lead from "../models/Lead.js";
import env from "../config/env.js";
import { extractMarketplace } from "./listingExtractor.service.js";
import { getExternalListings } from "./externalSource.service.js";

// SEARCH-intent keywords (buyer looking for something).
const SEARCH_WORDS = [
  "need", "looking for", "want to buy", "want to purchase", "purchase", "buy",
  "required", "available", "find me", "searching", "show me", "any ", "i want a", "i need",
];

export const isSearchIntent = (message = "") => {
  const lower = (message || "").toLowerCase();
  return SEARCH_WORDS.some((w) => lower.includes(w));
};

// Category → the words a listing of that category would contain, so a search is
// gated to the RIGHT category (a "home" search never returns a supermarket).
const CATEGORY_SYNONYMS = {
  real_estate: ["apartment", "house", "home", "condo", "townhouse", "studio", "duplex", "flat", "room", "roommate", "property", "land", "lot", "1bed", "2bed", "3bed", "1br", "2br", "3br", "bedroom"],
  vehicle: ["car", "truck", "suv", "sedan", "pickup", "van", "motorcycle", "bike", "scooter", "vehicle", "jeep", "minivan", "coupe", "rv", "trailer", "boat"],
  service: ["plumber", "plumbing", "electrician", "electrical", "carpenter", "painter", "painting", "mechanic", "tutor", "tutoring", "cleaner", "cleaning", "maid", "landscaping", "lawn", "handyman", "mover", "moving", "hvac", "roofing", "babysitter", "nanny", "repair", "service"],
};

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePrice = (text) => {
  const t = (text || "").toLowerCase().replace(/[$,]/g, "");
  const m = t.match(/(\d[\d.]*)\s*(k|thousand|m|mil|million)?/);
  if (!m) return "";
  let n = parseFloat(m[1]);
  const u = m[2] || "";
  if (/^k|thousand/.test(u)) n *= 1000;
  else if (/^m|mil|million/.test(u)) n *= 1000000;
  return n ? String(Math.round(n)) : "";
};

const rx = (s) => new RegExp(esc(s), "i");

// Handles "I'm looking for X" across all categories — category-gated for relevance.
export const handleMarketplaceSearch = async ({ message, conversation, contact, preExtracted }) => {
  const text = (message || "").trim();
  const state = conversation.metadata?.search || { data: {} };
  state.data ||= {};
  const d = state.data;

  const ex = preExtracted || (await extractMarketplace(text));
  for (const f of ["category", "item", "location", "city", "state", "price", "listing_type"]) if (ex[f] && !d[f]) d[f] = ex[f];

  if (state.awaiting === "item" && !d.item && !d.category) d.item = text.toLowerCase().slice(0, 40);
  if (state.awaiting === "location" && !d.location && !d.city) d.location = text;
  if (state.awaiting === "budget" && !d.price) d.price = parsePrice(text);

  const saveState = (awaiting) => {
    state.awaiting = awaiting;
    conversation.metadata = { ...conversation.metadata, search: state, flowStage: "search" };
    conversation.markModified("metadata");
  };

  if (!d.item && !d.category) {
    saveState("item");
    return "Sure! What are you looking for? (e.g. *flat*, *car*, *plumber*) 🔎";
  }
  if (!d.location && !d.city) {
    saveState("location");
    return "Which *city or area* should I search in? 📍";
  }

  const item = (d.item || "").toLowerCase();
  const cat = d.category && CATEGORY_SYNONYMS[d.category] ? d.category : null;
  const place = d.location || d.city;
  const what = item || d.category;

  // Category-relevant terms (the item + its category's words).
  const terms = Array.from(new Set([item, ...(cat ? CATEGORY_SYNONYMS[cat] : [])].filter(Boolean)));
  const termRx = new RegExp("\\b(" + terms.map(esc).join("|") + ")\\b", "i");

  // CATEGORY GATE — gate on what a listing IS (its category / marketCategory),
  // NOT on keywords or title (too noisy — a "home delivery" keyword must not make
  // a supermarket match a "home" search). A listing whose marketCategory is a known
  // but DIFFERENT category is excluded; legacy listings (no marketCategory) match by
  // their category field.
  const KNOWN = ["real_estate", "vehicle", "service", "other"];
  const categoryGate = [];
  if (cat) {
    categoryGate.push({ "metadata.marketCategory": cat });
    categoryGate.push({ "metadata.marketCategory": { $nin: KNOWN }, category: termRx });
  } else {
    categoryGate.push({ category: termRx });
  }

  // We tag each WhatsApp listing with the sender's number (metadata.whatsappFrom),
  // so we can reliably tell the user's OWN listings apart even if they entered a
  // different contact number.
  const from = contact.phone || null;

  // Does the user ALREADY have a listing of this type? (we acknowledge, not hide)
  let ownMatch = null;
  if (from) ownMatch = await Listing.findOne({ status: "active", "metadata.whatsappFrom": from, $or: categoryGate });

  const and = [{ status: "active" }, { $or: categoryGate }];
  if (place) and.push({ $or: [{ location: rx(place) }, { "metadata.city": rx(place) }, { "metadata.area": rx(place) }] });
  if (d.price) and.push({ $or: [{ budget: { $lte: Math.round(Number(d.price) * 1.15) } }, { budget: { $exists: false } }, { budget: null }] });
  if (from) and.push({ "metadata.whatsappFrom": { $ne: from } }); // others' listings in the results

  const results = await Listing.find({ $and: and }).sort({ createdAt: -1 }).limit(5);

  // Record the buyer's demand as a lead so sellers/admins see it in the dashboard.
  Lead.create({
    contact: contact._id,
    title: `Wants ${what}${place ? ` in ${place}` : ""}`,
    intent: "buy",
    category: what,
    status: "New",
    location: place,
    budgetMax: Number(d.price) || undefined,
    requirements: { location: place, budgetMax: Number(d.price) || undefined, category: what, keywords: [item].filter(Boolean) },
  }).catch(() => {});

  conversation.metadata = { ...conversation.metadata, search: null, flowStage: null };
  conversation.markModified("metadata");

  // When our own DB is thin, pull live listings from external US marketplaces
  // (Cars.com / Trulia / Rent.com / Yelp) to supplement — so the user always gets
  // something useful instead of "nothing available".
  let external = { source: null, listings: [] };
  if (results.length < env.external.minDbResults) {
    external = await getExternalListings({
      category: d.category,
      listing_type: d.listing_type,
      item: what,
      city: d.city || d.location || place,
      state: d.state,
      limit: 5 - results.length,
    });
  }

  // Acknowledge the user's own existing listing of this type.
  const ack = ownMatch
    ? `By the way, I see you already have *${ownMatch.title}* listed. 🙂 Looking to *buy a different ${what}*? Here's what's out there:\n\n`
    : "";

  const dbBlock = results.map(
    (L, i) => `*${i + 1}. ${L.title}*${L.priceLabel ? ` — ${L.priceLabel}` : ""}\n📍 ${L.location}${L.contactPhone ? `\n📞 ${L.contactPhone}` : ""}`,
  );
  const exBlock = external.listings.map((L, i) => {
    const n = results.length + i + 1;
    return (
      `*${n}. ${L.title}*${L.priceLabel ? ` — ${L.priceLabel}` : ""}` +
      (L.location ? `\n📍 ${L.location}` : "") +
      (L.url ? `\n🔗 ${L.url}` : "") +
      `\n_via ${external.source}_`
    );
  });
  const all = [...dbBlock, ...exBlock];

  if (!all.length) {
    return (
      ack +
      `I looked but couldn't find ${ack ? "any other " : "a "}*${what}* in *${place}* right now. 😕\n\n` +
      `I've saved your requirement — I'll message you here the moment a matching *${what}* is listed. ✅`
    );
  }

  return (
    ack +
    `Here's what I found for *${what}* in *${place}*: 🔎\n\n${all.join("\n\n")}\n\n` +
    (external.listings.length ? `🌐 Some results are live from *${external.source}*.\n` : "") +
    `Want me to search again, or *list* your own ${what}?`
  );
};

export default handleMarketplaceSearch;
