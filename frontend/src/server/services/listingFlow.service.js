import Listing from "../models/Listing.js";
import { extractListing } from "./listingExtractor.service.js";
import { triggerRematchForNewListing } from "./followUp.service.js";

// Phrases that signal the user wants to LIST their own business/service (vs search).
const LISTING_INTENT = [
  "list my", "list a business", "list a service", "list my business", "list my service",
  "register my", "register a", "add my business", "add my service", "add a listing",
  "i want to list", "i want to register", "want to list", "want to register my",
  "i run a", "i run an", "i own a", "i provide", "i offer", "i sell", "we provide", "we offer",
  "my shop", "my business", "advertise my",
];

export const isListingIntent = (message = "") => {
  const lower = message.toLowerCase();
  return LISTING_INTENT.some((p) => lower.includes(p));
};

const titleFor = (category, place) =>
  category && place ? `${category} in ${place}` : category || "New business";

// Drives the "list my business" conversation: extracts fields from each message,
// fills a draft, asks for what's missing, then auto-publishes a live listing.
export const handleListingFlow = async ({ message, conversation, contact }) => {
  const extracted = await extractListing(message);

  const draft = { ...(conversation.metadata?.listingDraft || {}) };
  for (const key of ["title", "category", "location", "pincode", "priceLabel", "services", "ownerName", "contactPhone"]) {
    if (extracted[key]) draft[key] = extracted[key];
  }

  const hasCategory = Boolean(draft.category);
  const place = draft.location || draft.pincode;
  const hasPlace = Boolean(place);

  const saveDraft = async () => {
    conversation.metadata = { ...conversation.metadata, flowStage: "listing", listingDraft: draft };
    conversation.markModified("metadata");
  };

  if (!hasCategory) {
    await saveDraft();
    return (
      "Sure — let's list your business so customers can find you! 🏪\n\n" +
      "What service do you offer? (e.g. *Electrician*, *AC Repair*, *Catering*, *Salon*)"
    );
  }

  if (!hasPlace) {
    await saveDraft();
    return (
      `Got it — *${draft.category}*. 👍\n\n` +
      "Which area is your business in? Send the *area name* or a *6-digit pincode*."
    );
  }

  // Enough info → create the listing and publish it live.
  const ownerPhone = draft.contactPhone || contact.phone || undefined;
  const listing = await Listing.create({
    title: draft.title || titleFor(draft.category, draft.location || draft.pincode),
    category: draft.category,
    location: draft.location || draft.pincode,
    description: draft.services || undefined,
    services: draft.services || undefined,
    priceLabel: draft.priceLabel || undefined,
    ownerName: draft.ownerName || undefined,
    ownerPhone,
    contactPhone: ownerPhone,
    // The lister IS the WhatsApp sender, so the number is inherently verified.
    phoneVerified: Boolean(ownerPhone),
    status: "active",
    metadata: {
      pincode: draft.pincode || undefined,
      area: draft.location || undefined,
      source: "whatsapp",
    },
  });

  conversation.metadata = { ...conversation.metadata, flowStage: null, listingDraft: null };
  conversation.markModified("metadata");

  // Notify any matching open leads about the new listing (background, best-effort).
  triggerRematchForNewListing(listing).catch(() => {});

  return (
    "✅ Done! Your business is now *listed and live*:\n\n" +
    `*${listing.title}*\n` +
    `📋 ${listing.category}\n` +
    `📍 ${listing.location}` +
    (listing.priceLabel ? `\n💰 ${listing.priceLabel}` : "") +
    "\n\n" +
    `Customers searching for *${listing.category}* in *${listing.location}* will now find you. 🎉\n` +
    'Message me anytime to list another business, or type "list" to start again.'
  );
};

export default handleListingFlow;
