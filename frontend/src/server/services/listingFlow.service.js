import Listing from "../models/Listing.js";
import { extractMarketplace } from "./listingExtractor.service.js";
import { triggerRematchForNewListing } from "./followUp.service.js";

// CREATE-intent keywords (sell/list their own item/service). SEARCH messages fall
// through to the existing search pipeline, so we exclude obvious search phrases.
const SEARCH_WORDS = ["need", "looking for", "want to buy", "required", "available?", "find me", "searching"];
const CREATE_WORDS = [
  "sell", "list", "post", "add my", "rent out", "for sale", "for rent",
  "my flat", "my house", "my car", "my bike", "my shop", "my service", "my business",
  "list my", "want to sell", "want to list", "i am a", "i'm a", "i provide", "i offer", "i run",
  "register my", "advertise",
];

export const isListingIntent = (message = "") => {
  const lower = (message || "").toLowerCase();
  if (SEARCH_WORDS.some((w) => lower.includes(w))) return false;
  return CREATE_WORDS.some((w) => lower.includes(w));
};

// ── helpers ───────────────────────────────────────────────────────────────────
const titleCase = (s) => (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
const formatINR = (n) => Number(n).toLocaleString("en-IN");

const needsPrice = (d) =>
  d.listing_type === "sell" || d.listing_type === "rent" || d.category === "real_estate" || d.category === "vehicle";

// Parse "65 lakhs" / "4 lakh" / "20k" / "1.5 cr" / "400000" -> plain rupee number.
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

const buildTitle = (d) => {
  const item = titleCase(d.item || d.category || "Listing");
  const place = d.location || d.city || "";
  if (d.category === "service") return `${item} service${place ? ` in ${place}` : ""}`;
  const verb = d.listing_type === "rent" ? "for rent" : "for sale";
  return `${item} ${verb}${place ? ` in ${place}` : ""}`;
};

const priceLabel = (d) => {
  if (!d.price) return undefined;
  if (d.listing_type === "rent") return `₹${formatINR(d.price)}/month`;
  if (d.category === "service") return `₹${formatINR(d.price)} onwards`;
  return `₹${formatINR(d.price)}`;
};

const QUESTION = {
  item: "Sure! What would you like to list? (e.g. *flat*, *car*, *plumber service*) 🙂",
  location: "Where is it located? Please tell the *area / city*. 📍",
  price_sell: "What *price* do you want? (e.g. 5 lakhs, 4,00,000)",
  price_rent: "What's the *monthly rent*? (e.g. 12000)",
  contact_number: "Please share your *mobile number* so people can contact you. (or reply *same* to use this WhatsApp number) 📞",
};

async function createListing(d, contact) {
  const place = [d.location, d.city].filter(Boolean).join(", ");
  const listing = await Listing.create({
    title: d.title || buildTitle(d),
    category: titleCase(d.item || d.category || "Listing"),
    location: place || d.location || d.city,
    description: d.description || undefined,
    priceLabel: priceLabel(d),
    budget: Number(d.price) || undefined,
    ownerName: d.user_name || undefined,
    ownerPhone: d.contact_number || contact.phone || undefined,
    contactPhone: d.contact_number || contact.phone || undefined,
    phoneVerified: false, // captured, not OTP-verified (verification added later)
    status: "active",
    keywords: [d.item, d.category, d.listing_type, d.location, d.city].filter(Boolean).map((s) => String(s).toLowerCase()),
    metadata: {
      marketCategory: d.category || undefined,
      listingType: d.listing_type || undefined,
      area: d.location || undefined,
      city: d.city || undefined,
      source: "whatsapp",
    },
  });
  triggerRematchForNewListing(listing).catch(() => {});
  return listing;
}

const summary = (l, d) =>
  "✅ *Listed successfully!* People can now find and contact you.\n\n" +
  `*${l.title}*\n` +
  `🏷️ ${l.category}${d.listing_type ? ` · ${titleCase(d.listing_type)}` : ""}\n` +
  `📍 ${l.location}` +
  (l.priceLabel ? `\n💰 ${l.priceLabel}` : "") +
  `\n📞 ${l.contactPhone || "—"}\n\n` +
  'Message me anytime to list another item, or to *search* for something.';

// CREATE-listing agent: extracts structure from each message, asks only for the
// missing required fields (mobile mandatory), then saves a clean listing. No OTP.
export const handleListingFlow = async ({ message, conversation, contact }) => {
  const text = (message || "").trim();

  if (/\b(cancel|stop|exit|quit)\b/i.test(text) && conversation.metadata?.market) {
    conversation.metadata = { ...conversation.metadata, market: null, flowStage: null };
    conversation.markModified("metadata");
    return "No problem — cancelled. 👍 Message me anytime to list or search.";
  }

  const state = conversation.metadata?.market || { data: {} };
  state.data ||= {};
  const d = state.data;

  // Re-extract from the latest message, but only FILL EMPTY fields — never
  // overwrite already-collected data with a noisy single-word re-extraction.
  const ex = await extractMarketplace(text);
  for (const f of ["category", "listing_type", "item", "title", "location", "city", "price", "description"]) {
    if (ex[f] && !d[f]) d[f] = ex[f];
  }
  // Mobile: accept an extracted number, or "same/this" to reuse the WhatsApp number.
  if (ex.contact_number && !d.contact_number) d.contact_number = ex.contact_number;
  else if (/\b(same|this|whatsapp number|use this)\b/i.test(text) && contact.phone) d.contact_number = contact.phone.replace(/\D/g, "").slice(-10);

  // If the user is answering the exact question we asked, assign it directly —
  // robust even when the AI is rate-limited and re-extraction returns empty.
  const awaiting = state.awaiting;
  if (awaiting === "item" && !d.item && !d.category) d.item = text.toLowerCase().slice(0, 40);
  if (awaiting === "location" && !d.location && !d.city) d.location = titleCase(text);
  if (awaiting === "price" && needsPrice(d) && !d.price) d.price = parsePrice(text);
  if (awaiting === "contact_number" && !d.contact_number) {
    const ph = (text.match(/\d{10}/) || [])[0];
    if (ph) d.contact_number = ph;
  }

  // Work out what's still missing.
  const missing = [];
  if (!d.item && !d.category) missing.push("item");
  if (!d.location && !d.city) missing.push("location");
  if (needsPrice(d) && !d.price) missing.push("price");
  if (!d.contact_number) missing.push("contact_number");

  if (missing.length) {
    const first = missing[0];
    state.awaiting = first;
    conversation.metadata = { ...conversation.metadata, market: state, flowStage: "listing" };
    conversation.markModified("metadata");
    if (first === "price") return d.listing_type === "rent" ? QUESTION.price_rent : QUESTION.price_sell;
    return QUESTION[first];
  }

  // Everything present → create + confirm.
  const listing = await createListing(d, contact);
  conversation.metadata = { ...conversation.metadata, market: null, flowStage: null };
  conversation.markModified("metadata");
  return summary(listing, d);
};

export default handleListingFlow;
