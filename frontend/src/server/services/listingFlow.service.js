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
const formatUSD = (n) => Number(n).toLocaleString("en-US");

const needsPrice = (d) =>
  d.listing_type === "sell" || d.listing_type === "rent" || d.category === "real_estate" || d.category === "vehicle";

// Parse "$4,000" / "25k" / "1.2 million" / "1200" -> plain dollar number.
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

const buildTitle = (d) => {
  const item = titleCase(d.item || d.category || "Listing");
  const place = d.location || d.city || "";
  if (d.category === "service") return `${item} service${place ? ` in ${place}` : ""}`;
  const verb = d.listing_type === "rent" ? "for rent" : "for sale";
  return `${item} ${verb}${place ? ` in ${place}` : ""}`;
};

const priceLabel = (d) => {
  if (!d.price) return undefined;
  if (d.listing_type === "rent") return `$${formatUSD(d.price)}/month`;
  if (d.category === "service") return `$${formatUSD(d.price)} and up`;
  return `$${formatUSD(d.price)}`;
};

const QUESTION = {
  item: "Sure! What would you like to list? (e.g. *apartment*, *car*, *plumbing service*) 🙂",
  location: "Where is it located? Please tell the *city / area*. 📍",
  address:
    "🏢 Please share the *full address* — *building / apt name, street, city*.\n(e.g. _The Heights, 1200 Oak St Apt 4B, Austin_)",
  pincode: "📮 What's the *5-digit ZIP code*? (helps buyers find the exact spot — reply *skip* if you don't know)",
  price_sell: "What *price* are you asking? (e.g. $4,000)",
  price_rent: "What's the *monthly rent*? (e.g. $1,200)",
  contact_number: "Please share your *phone number* so people can contact you. (or reply *same* to use this WhatsApp number) 📞",
};

async function createListing(d, contact) {
  const isRealEstate = d.category === "real_estate";
  const pin = d.pincode && d.pincode !== "-" ? d.pincode : "";
  // Real estate: the full address the user typed IS the location line; fall back to
  // structured parts when no free-text address was given (e.g. one-shot listings).
  const cityParts = [d.location, d.city].filter(Boolean);
  const cityLine = cityParts.filter((v, i) => cityParts.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i).join(", ");
  let base = isRealEstate ? d.address || [d.society, cityLine].filter(Boolean).join(", ") : cityLine || d.location || d.city;
  if (isRealEstate && d.city && base && !base.toLowerCase().includes(d.city.toLowerCase())) base = `${base}, ${d.city}`;
  const fullLocation = [base, pin && `ZIP ${pin}`].filter(Boolean).join(" - ");

  const listing = await Listing.create({
    title: d.title || buildTitle(d),
    category: titleCase(d.item || d.category || "Listing"),
    location: fullLocation || base,
    address: d.address || undefined,
    description: d.description || undefined,
    priceLabel: priceLabel(d),
    budget: Number(d.price) || undefined,
    ownerName: d.user_name || undefined,
    ownerPhone: d.contact_number || contact.phone || undefined,
    contactPhone: d.contact_number || contact.phone || undefined,
    phoneVerified: false, // captured, not OTP-verified (verification added later)
    status: "active",
    keywords: [d.item, d.category, d.listing_type, d.society, d.location, d.city, pin].filter(Boolean).map((s) => String(s).toLowerCase()),
    metadata: {
      marketCategory: d.category || undefined,
      listingType: d.listing_type || undefined,
      society: d.society || undefined,
      area: d.location || undefined,
      city: d.city || undefined,
      pincode: pin || undefined,
      source: "whatsapp",
      whatsappFrom: contact.phone || undefined, // the WhatsApp sender (for own-listing detection)
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
export const handleListingFlow = async ({ message, conversation, contact, preExtracted }) => {
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
  const ex = preExtracted || (await extractMarketplace(text));
  for (const f of ["category", "listing_type", "item", "title", "society", "address", "location", "city", "pincode", "price", "description"]) {
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
  if (awaiting === "address") d.address = text.trim(); // their full reply IS the address
  if (awaiting === "pincode" && !d.pincode) {
    const pin = (text.match(/\b\d{5}\b/) || [])[0];
    if (pin) d.pincode = pin;
    else if (/^(skip|no|none|na|don'?t\s*know|dont\s*know)$/i.test(text.trim())) d.pincode = "-";
  }
  if (awaiting === "price" && needsPrice(d) && !d.price) d.price = parsePrice(text);
  if (awaiting === "contact_number" && !d.contact_number) {
    const ph = (text.match(/\d{10}/) || [])[0];
    if (ph) d.contact_number = ph;
  }

  // Work out what's still missing. Real estate needs a precise address + pincode
  // (a bare city is not enough to make a property findable).
  const isRealEstate = d.category === "real_estate";
  const missing = [];
  if (!d.item && !d.category) missing.push("item");
  if (isRealEstate) {
    if (!d.address && !d.society) missing.push("address");
    if (!d.pincode) missing.push("pincode");
  } else if (!d.location && !d.city) {
    missing.push("location");
  }
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
