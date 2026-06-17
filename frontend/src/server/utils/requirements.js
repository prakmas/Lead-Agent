// Shared requirement logic used by the mock AI provider and the conversation
// service so follow-up answers are interpreted consistently across turns.

// Order matters: detectCategory returns the FIRST bucket that matches, so more
// specific buckets (roommate, pg, hotel…) are listed before generic ones (room).
export const categoryTerms = {
  roommate: ["roommate", "flatmate", "room mate", "room partner", "flat share", "share a flat", "sharing"],
  pg: ["pg", "paying guest", "hostel"],
  hotel: ["hotel", "lodge", "resort", "motel", "guest house", "guesthouse", "short stay"],
  supermarket: ["supermarket", "grocery", "groceries", "departmental store", "provision store", "kirana", "hypermarket"],
  service: [
    "service", "cleaning", "repair", "maid", "cook", "driver", "plumber",
    "electrician", "movers", "packers", "painting", "carpenter", "pest control", "ac service",
  ],
  flat: ["flat", "apartment", "bhk", "1rk", "studio"],
  house: ["house", "villa", "independent house", "duplex", "bungalow"],
  room: ["single room", "room for rent", "pg room", "room"],
  rental: ["office", "commercial", "shop", "godown", "warehouse", "co-working", "coworking", "retail", "workspace"],
  // legacy alias kept so older data still resolves
  accommodation: ["accommodation"],
};

// The categories where it makes sense to ask the customer for a budget.
export const BUDGET_CATEGORIES = ["flat", "pg", "room", "roommate", "house", "hotel", "accommodation"];

// The guided service menu shown after a greeting. Index = the number a user can
// reply with. `key` is the category stored on the lead/listing.
export const SERVICE_MENU = [
  { key: "flat", label: "Flats / Apartments for rent" },
  { key: "pg", label: "PG / Hostel" },
  { key: "room", label: "Single room for rent" },
  { key: "roommate", label: "Roommate / Flat sharing" },
  { key: "house", label: "Independent house / Villa" },
  { key: "hotel", label: "Hotels / Short stays" },
  { key: "supermarket", label: "Supermarkets / Grocery stores" },
  { key: "rental", label: "Commercial / Office space" },
  { key: "service", label: "Home services (cleaning, repairs, movers)" },
];

// Detect a category from free text, or return "general" when nothing matches.
export const detectCategory = (text = "") => {
  const lower = text.toLowerCase();
  return (
    Object.entries(categoryTerms).find(([, terms]) =>
      terms.some((term) => lower.includes(term)),
    )?.[0] || "general"
  );
};

// ── Conversation intent classification ───────────────────────────────────────
// Runs BEFORE requirement extraction so the bot behaves naturally: a "hi" gets a
// greeting (not a property search), "thanks" gets a friendly close, and "call me"
// hands off to a human. Deterministic (regex) so it works even if the AI is down.

const GREETING_WORDS = [
  "hi", "hii", "hiii", "hey", "heyy", "hello", "helo", "hai", "yo", "hola",
  "namaste", "namaskar", "start", "menu", "greetings",
];
const GREETING_PHRASES = [
  "good morning", "good afternoon", "good evening", "good day", "hi there",
  "hello there", "how are you",
];
const THANKS_WORDS = ["thanks", "thank", "thankyou", "thanku", "thnx", "thx", "ty", "tq"];
const THANKS_PHRASES = [
  "thank you", "thank u", "ok thanks", "okay thanks", "thats all", "that's all",
  "no thanks", "nothing else", "all good",
];
const HANDOFF_PHRASES = [
  "call me", "call back", "callback", "talk to agent", "talk to a agent",
  "talk to an agent", "talk to human", "talk to a human", "speak to agent",
  "speak to someone", "speak to a person", "real person", "human agent",
  "need an agent", "need agent", "agent please", "contact me", "reach me",
  "call please", "please call", "want to talk", "connect me",
];
const REQUIREMENT_WORDS = [
  "rent", "buy", "sell", "purchase", "lease", "bhk", "property", "flat",
  "apartment", "house", "home", "room", "pg", "hostel", "plot", "villa",
  "accommodation", "roommate", "flatmate", "service", "budget", "looking",
  "searching", "require", "hotel", "lodge", "resort", "supermarket", "grocery",
  "mart", "studio", "office", "shop", "stay", "rooms", "hotels", "flats", "pgs",
];

const hasWord = (lower, words) =>
  words.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, "i").test(lower));
const hasPhrase = (lower, phrases) => phrases.some((p) => lower.includes(p));

// Returns: "handoff" | "greeting" | "end" | "requirement".
export const classifyConversationIntent = (rawMessage = "") => {
  const lower = (rawMessage || "").toLowerCase().trim();
  if (!lower) return "greeting";

  // Human handoff takes top priority — never override a request for a person.
  if (hasPhrase(lower, HANDOFF_PHRASES)) return "handoff";

  // If the message contains a real requirement signal, treat it as a requirement
  // even if it also says "hi" (e.g. "hi, need a 2bhk in koramangala").
  const hasRequirement =
    detectCategory(lower) !== "general" ||
    /\d{3,7}/.test(lower) ||
    /\b(?:in|near|around|at)\s+[a-z]/i.test(lower) ||
    hasWord(lower, REQUIREMENT_WORDS);
  if (hasRequirement) return "requirement";

  if (hasPhrase(lower, GREETING_PHRASES) || hasWord(lower, GREETING_WORDS)) return "greeting";
  if (hasPhrase(lower, THANKS_PHRASES) || hasWord(lower, THANKS_WORDS)) return "end";

  return "requirement";
};

// Decide which fields are still missing based on the ACCUMULATED requirements
// (not just the latest message), so answers given across turns count.
export const computeMissingFields = (requirements = {}) => {
  const missing = [];
  const category = requirements.category;

  if (!requirements.location) missing.push("location");
  if (!requirements.budgetMax && BUDGET_CATEGORIES.includes(category)) {
    missing.push("budget");
  }
  if (!category || category === "general") missing.push("category");

  return missing;
};

// The single field the follow-up question is currently asking about.
// Order mirrors buildFollowUpQuestion in aiAgent.service.js.
export const getPrimaryMissingField = (missing = []) => {
  if (missing.includes("location")) return "location";
  if (missing.includes("budget")) return "budget";
  if (missing.includes("category")) return "category";
  return null;
};

// Route a short reply (e.g. "Nellore", "Flat", "12000", "20k") into the correct
// slot based on its CONTENT — not blindly into whatever we last asked. This is
// what stops "Flat" being saved as a location when we asked "which location?".
// `awaitingField` is only a tiebreaker for ambiguous one-word place names.
// Only ever fills EMPTY fields (accumulation/merge is handled by the caller).
export const applyPendingAnswer = (awaitingField, rawMessage, requirements = {}) => {
  const text = (rawMessage || "").trim();
  if (!text) return requirements;
  const lower = text.toLowerCase();

  // 1. Category word? (flat, pg, room, roommate, rental, service…)
  const cat = detectCategory(text);
  if (cat !== "general" && (!requirements.category || requirements.category === "general")) {
    requirements.category = cat;
  }

  // 2. Budget number? handle "12000", "12,000", "20k".
  if (!requirements.budgetMax) {
    const k = lower.match(/(\d+(?:\.\d+)?)\s*k\b/);
    const n = lower.replace(/,/g, "").match(/\d{3,7}/);
    if (k) requirements.budgetMax = Math.round(parseFloat(k[1]) * 1000);
    else if (n) requirements.budgetMax = Number(n[0]);
  }

  // 3. Location? Only if the reply is a plain place word (not a category/number).
  if (!requirements.location) {
    const hasNumber = /\d{3,7}/.test(lower.replace(/,/g, "")) || /\d+\s*k\b/.test(lower);
    const cleaned = text.replace(/^(in|near|around|at|to)\s+/i, "").trim();
    const looksLikePlace =
      cat === "general" && !hasNumber && /^[a-z][a-z\s.-]{1,40}$/i.test(cleaned);
    if (looksLikePlace && (awaitingField === "location" || cleaned.split(/\s+/).length <= 3)) {
      requirements.location = cleaned;
    }
  }

  return requirements;
};
