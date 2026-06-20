import Listing from "../models/Listing.js";
import { interpretField } from "./listingExtractor.service.js";
import { triggerRematchForNewListing } from "./followUp.service.js";

// Phrases that signal the user wants to LIST their own business/service (vs search).
const LISTING_INTENT = [
  "list my", "list a business", "list a service", "list my business", "list my service",
  "register my", "register a", "add my business", "add my service", "add a listing",
  "i want to list", "i want to register", "want to list", "want to register my",
  "i run a", "i run an", "i own a", "i provide", "i offer", "i sell", "we provide", "we offer",
  "my shop", "my business", "advertise my", "list business", "want to list my",
];

export const isListingIntent = (message = "") => {
  const lower = (message || "").toLowerCase();
  return LISTING_INTENT.some((p) => lower.includes(p));
};

// ── small parsers ─────────────────────────────────────────────────────────────
const isYes = (t) => /\b(yes|yeah|yep|yup|haan|ha|sure|ok|okay|correct|right|done|👍)\b/i.test(t);
const isNo = (t) => /\b(no|nope|nahi|nai|\bna\b|none|don'?t|cancel)\b/i.test(t);
const isCancel = (t) => /\b(cancel|stop|exit|quit|leave)\b/i.test(t.trim());
const firstNumber = (t) => (t.match(/\d[\d,]*/) || [])[0]?.replace(/,/g, "");
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const STEP_ORDER = [
  "name", "service", "business_name", "area", "city_state",
  "mobile", "services", "timing", "price", "experience", "home_service", "review",
];

const summary = (d) =>
  "📋 *Please check your listing:*\n\n" +
  `👤 Name: ${d.full_name || "—"}\n` +
  `🛠️ Service: ${d.service_category || "—"}\n` +
  `🏪 Business: ${d.business_name || "—"}\n` +
  `📍 Area: ${[d.area, d.city, d.state].filter(Boolean).join(", ") || "—"}\n` +
  `📞 Mobile: ${d.mobile_number || "—"}\n` +
  `🔧 Work: ${d.service_description || "—"}\n` +
  `🕒 Timing: ${d.available_time || "—"}\n` +
  `💰 Starting price: ${d.starting_price ? `₹${d.starting_price}` : "—"}\n` +
  `📅 Experience: ${d.experience || "—"}\n` +
  `🏠 Home service: ${d.home_service_available ? "Yes" : "No"}\n\n` +
  "Is this correct? Reply *Yes* to publish, or *No* to change something.";

const QUESTION = {
  name: "Great! 🙌 I'll ask a few quick questions and create your listing.\n\nFirst — what's your *name*?",
  service: "What *service* do you provide? (e.g. plumber, electrician, tuition, tailoring, beauty parlour, mechanic)",
  business_name: "Do you have a *shop / business name*? If not, just reply *no* and I'll create one for you.",
  area: "Which *area* do you provide service in? (village / locality name) 📍",
  city_state: "Which *city and state*?",
  mobile: "What's your *mobile number* so customers can contact you? (or reply *same* to use this WhatsApp number) 📞",
  services: "What *work* do you do? Tell me in simple words. 🔧",
  timing: "What *time* are you available? (e.g. 9 AM to 8 PM)",
  price: "What's your *starting price* or visit charge? (just a number, or reply *skip*)",
  experience: "How many *years of experience* do you have? (or reply *skip*)",
  home_service: "Do you *visit customer homes*? (yes / no)",
};

async function createListing(d, contact) {
  const place = [d.area, d.city, d.state].filter(Boolean).join(", ");
  const listing = await Listing.create({
    title: d.business_name || `${d.full_name || ""} ${d.service_category || "Service"}`.trim(),
    category: d.service_category,
    location: place || d.area,
    description: d.service_description || undefined,
    services: d.service_description || undefined,
    priceLabel: d.starting_price ? `₹${d.starting_price} onwards` : undefined,
    budget: Number(d.starting_price) || undefined,
    availability: d.available_time || undefined,
    timings: d.available_time || undefined,
    contactName: d.full_name || undefined,
    ownerName: d.full_name || undefined,
    ownerPhone: d.mobile_number || contact.phone || undefined,
    contactPhone: d.mobile_number || contact.phone || undefined,
    phoneVerified: true, // captured directly from the user on WhatsApp
    status: "active",
    metadata: {
      area: d.area || undefined,
      city: d.city || undefined,
      state: d.state || undefined,
      pincode: d.pincode || undefined,
      experience: d.experience || undefined,
      homeService: Boolean(d.home_service_available),
      source: "whatsapp",
    },
  });
  triggerRematchForNewListing(listing).catch(() => {});
  return listing;
}

// Drives the guided, one-question-at-a-time listing conversation. Stores state in
// conversation.metadata.wizard and flowStage="listing" while active.
export const handleListingFlow = async ({ message, conversation, contact }) => {
  const text = (message || "").trim();
  let w = conversation.metadata?.wizard;

  // Allow the user to bail out at any point.
  if (w?.active && isCancel(text)) {
    conversation.metadata = { ...conversation.metadata, wizard: null, flowStage: null };
    conversation.markModified("metadata");
    return "No problem — I've cancelled that. 👍 Message me anytime to list your business or to search for a service.";
  }

  // ── Start the wizard (don't consume the trigger message as an answer) ────────
  if (!w?.active) {
    w = { active: true, step: "name", data: {}, status: "collecting_details" };
    conversation.metadata = { ...conversation.metadata, wizard: w, flowStage: "listing" };
    conversation.markModified("metadata");
    return QUESTION.name;
  }

  // IMPORTANT: keep `d` pointing at w.data so collected fields persist across messages.
  w.data ||= {};
  const d = w.data;
  const advance = (nextStep) => {
    w.step = nextStep;
    conversation.metadata = { ...conversation.metadata, wizard: w, flowStage: "listing" };
    conversation.markModified("metadata");
  };

  let ack = "";
  switch (w.step) {
    case "name": {
      d.full_name = titleCase(text.replace(/^(my name is|i am|i'm|this is)\s+/i, "").trim()) || "Customer";
      advance("service");
      return `Thanks ${d.full_name}! 🙂\n\n${QUESTION.service}`;
    }
    case "service": {
      const r = await interpretField("service_category", text);
      if (!r.value) return `No problem — I'll help. Do you *repair, sell, teach, drive, cook, clean,* or provide another service?\n\n${QUESTION.service}`;
      d.service_category = r.value;
      ack = `Good — *${d.service_category}* service. 👍`;
      advance("business_name");
      return `${ack}\n\n${QUESTION.business_name}`;
    }
    case "business_name": {
      if (isNo(text) || text.length < 2) d.business_name = `${d.full_name} ${d.service_category} Service`;
      else d.business_name = titleCase(text);
      ack = `Okay — I'll list it as *${d.business_name}*.`;
      advance("area");
      return `${ack}\n\n${QUESTION.area}`;
    }
    case "area": {
      d.area = titleCase(text);
      ack = `Service area: *${d.area}*. ✅`;
      advance("city_state");
      return `${ack}\n\n${QUESTION.city_state}`;
    }
    case "city_state": {
      const r = await interpretField("city_state", text);
      const [city, state] = (r.value || text).split(",").map((s) => s.trim());
      d.city = city ? titleCase(city) : undefined;
      d.state = state ? titleCase(state) : undefined;
      ack = `Got it: *${[d.city, d.state].filter(Boolean).join(", ")}*.`;
      advance("mobile");
      return `${ack}\n\n${QUESTION.mobile}`;
    }
    case "mobile": {
      if (/\b(same|this|whatsapp|yes)\b/i.test(text) && contact.phone) d.mobile_number = contact.phone;
      else {
        const digits = text.replace(/\D/g, "");
        if (digits.length < 10) return `Please send a valid mobile number. ${QUESTION.mobile}`;
        d.mobile_number = digits.slice(-10);
      }
      advance("services");
      return `Saved 📞 *${d.mobile_number}*.\n\n${QUESTION.services}`;
    }
    case "services": {
      const r = await interpretField("service_description", text);
      d.service_description = r.value || text;
      ack = `Added: *${d.service_description}*. ✅`;
      advance("timing");
      return `${ack}\n\n${QUESTION.timing}`;
    }
    case "timing": {
      const r = await interpretField("available_time", text);
      d.available_time = r.value || text;
      ack = `Available: *${d.available_time}*.`;
      advance("price");
      return `${ack}\n\n${QUESTION.price}`;
    }
    case "price": {
      if (!/skip|no|later/i.test(text)) d.starting_price = firstNumber(text) || undefined;
      ack = d.starting_price ? `Starting charge ₹${d.starting_price}.` : "Okay, no fixed price.";
      advance("experience");
      return `${ack}\n\n${QUESTION.experience}`;
    }
    case "experience": {
      if (!/skip|no|later/i.test(text)) {
        const n = firstNumber(text);
        d.experience = n ? `${n} years` : text;
      }
      ack = d.experience ? `Experience: ${d.experience}.` : "Okay.";
      advance("home_service");
      return `${ack}\n\n${QUESTION.home_service}`;
    }
    case "home_service": {
      d.home_service_available = isYes(text) && !isNo(text);
      w.status = "review_pending";
      advance("review");
      return `${d.home_service_available ? "Home service: Yes. 🏠" : "Okay."}\n\n${summary(d)}`;
    }
    case "review": {
      if (isYes(text) && !isNo(text)) {
        const listing = await createListing(d, contact);
        conversation.metadata = { ...conversation.metadata, wizard: null, flowStage: null };
        conversation.markModified("metadata");
        return (
          "✅ *Your listing is live!* Customers can now find and contact you.\n\n" +
          `*${listing.title}* — ${listing.category} in ${listing.location}\n\n` +
          'Message me anytime to update it, list another business, or search for a service.'
        );
      }
      // "No" → let them fix one field, then re-show the summary.
      w.step = "edit";
      conversation.metadata = { ...conversation.metadata, wizard: w, flowStage: "listing" };
      conversation.markModified("metadata");
      return "No problem — what should I change? Reply like *price 250*, *area Kukatpally*, *service plumber*, *timing 9am to 9pm*, or *name Ramesh*. Type *done* when finished.";
    }
    case "edit": {
      if (/\bdone\b/i.test(text)) {
        w.step = "review";
        conversation.metadata = { ...conversation.metadata, wizard: w, flowStage: "listing" };
        conversation.markModified("metadata");
        return summary(d);
      }
      const m = text.match(/^\s*(\w+)\s+(.*)$/);
      if (m) {
        const field = m[1].toLowerCase();
        const val = m[2].trim();
        if (field === "name") d.full_name = titleCase(val);
        else if (field === "service") d.service_category = (await interpretField("service_category", val)).value || val;
        else if (field === "business") d.business_name = titleCase(val);
        else if (field === "area") d.area = titleCase(val);
        else if (field === "city") d.city = titleCase(val);
        else if (field === "mobile") d.mobile_number = val.replace(/\D/g, "").slice(-10);
        else if (field === "work" || field === "services") d.service_description = val;
        else if (field === "timing") d.available_time = val;
        else if (field === "price") d.starting_price = firstNumber(val);
        else if (field === "experience") d.experience = /\d/.test(val) ? `${firstNumber(val)} years` : val;
      }
      conversation.metadata = { ...conversation.metadata, wizard: w, flowStage: "listing" };
      conversation.markModified("metadata");
      return `Updated ✅. Change anything else, or type *done* to review.`;
    }
    default: {
      // Shouldn't happen — reset gracefully.
      conversation.metadata = { ...conversation.metadata, wizard: null, flowStage: null };
      conversation.markModified("metadata");
      return "Let's start again — type *list my business* to begin.";
    }
  }
};

export default handleListingFlow;
