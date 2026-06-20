import Listing from "../models/Listing.js";
import Lead from "../models/Lead.js";
import { extractMarketplace } from "./listingExtractor.service.js";

// SEARCH-intent keywords (buyer looking for something).
const SEARCH_WORDS = [
  "need", "looking for", "want to buy", "required", "available", "find me", "searching",
  "show me", "any ", "i want a", "i need", "want a ", "search ",
];

export const isSearchIntent = (message = "") => {
  const lower = (message || "").toLowerCase();
  return SEARCH_WORDS.some((w) => lower.includes(w));
};

const parsePrice = (text) => {
  const m = (text || "").toLowerCase().match(/(\d[\d.,]*)\s*(lakh|lac|lk|cr|crore|k|thousand)?/);
  if (!m) return "";
  let n = parseFloat(m[1].replace(/,/g, ""));
  const u = m[2] || "";
  if (/lakh|lac|lk/.test(u)) n *= 100000;
  else if (/cr|crore/.test(u)) n *= 10000000;
  else if (/k|thousand/.test(u)) n *= 1000;
  return n ? String(Math.round(n)) : "";
};

const rx = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

// Handles "I'm looking for X" across all categories. Collects item + location,
// queries active listings, records a lead, and returns matches.
export const handleMarketplaceSearch = async ({ message, conversation, contact, preExtracted }) => {
  const text = (message || "").trim();
  const state = conversation.metadata?.search || { data: {} };
  state.data ||= {};
  const d = state.data;

  const ex = preExtracted || (await extractMarketplace(text));
  for (const f of ["category", "item", "location", "city", "price"]) if (ex[f] && !d[f]) d[f] = ex[f];

  // Direct assignment when answering the exact question we asked.
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

  const terms = (d.item || d.category || "").toLowerCase();
  const place = d.location || d.city;

  const and = [{ status: "active" }];
  if (terms) and.push({ $or: [{ title: rx(terms) }, { category: rx(terms) }, { keywords: rx(terms) }, { description: rx(terms) }] });
  if (place) and.push({ $or: [{ location: rx(place) }, { "metadata.city": rx(place) }, { "metadata.area": rx(place) }] });
  if (d.price) and.push({ $or: [{ budget: { $lte: Math.round(Number(d.price) * 1.15) } }, { budget: { $exists: false } }, { budget: null }] });

  const results = await Listing.find({ $and: and }).sort({ createdAt: -1 }).limit(5);

  // Record the buyer as a lead so sellers/admins see demand in the dashboard.
  Lead.create({
    contact: contact._id,
    channel: conversation.channel ? undefined : "whatsapp",
    title: `Looking for ${terms}`,
    intent: "search",
    category: terms,
    status: "New",
    location: place,
    budgetMax: Number(d.price) || undefined,
    requirements: { location: place, budgetMax: Number(d.price) || undefined, category: terms },
  }).catch(() => {});

  conversation.metadata = { ...conversation.metadata, search: null, flowStage: null };
  conversation.markModified("metadata");

  if (!results.length) {
    return `I couldn't find *${terms}* in *${place}* right now. 😕\nI've noted your requirement — I'll notify you here as soon as something is listed.`;
  }

  const list = results
    .map((L, i) =>
      `${i + 1}. *${L.title}*${L.priceLabel ? ` — ${L.priceLabel}` : ""}\n   📍 ${L.location}${L.contactPhone ? `\n   📞 ${L.contactPhone}` : ""}`,
    )
    .join("\n\n");

  return `Here's what I found for *${terms}* in *${place}*: 🔎\n\n${list}\n\nMessage me to refine, or to list your own item.`;
};

export default handleMarketplaceSearch;
