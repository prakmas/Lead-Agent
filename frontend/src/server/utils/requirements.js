// Shared requirement logic used by the mock AI provider and the conversation
// service so follow-up answers are interpreted consistently across turns.

// Order matters: detectCategory returns the FIRST bucket that matches, so more
// SPECIFIC buckets are listed before generic ones. Specific services come first
// (so "house cleaning" → cleaning, not house), then stay/property, then generic.
// Keys here MUST match the listing category slugs in the Listings page.
export const categoryTerms = {
  // ── Roommate / sharing (very specific) ──
  roommate: ["roommate", "flatmate", "room mate", "room partner", "flat share", "share a flat", "sharing", "co-living", "coliving"],

  // ── Home services ──
  deepcleaning: ["deep cleaning", "deep clean"],
  cleaning: ["cleaning", "house cleaning", "home cleaning", "cleaner", "housekeeping service", "sofa cleaning", "bathroom cleaning"],
  pestcontrol: ["pest control", "pest", "termite", "cockroach", "fumigation"],
  plumber: ["plumber", "plumbing", "tap repair", "pipe leak", "leakage"],
  electrician: ["electrician", "wiring", "electrical work", "electric repair"],
  carpenter: ["carpenter", "carpentry", "furniture repair", "woodwork"],
  painter: ["painter", "painting", "wall paint", "house painting"],
  acrepair: ["ac repair", "ac service", "ac servicing", "air conditioner", "ac installation"],
  appliancerepair: ["appliance repair", "fridge repair", "washing machine repair", "microwave repair", "tv repair", "geyser repair"],
  waterpurifier: ["water purifier", "ro service", "ro repair", "aquaguard"],
  gardening: ["gardening", "gardener", "landscaping", "lawn"],
  interiordesign: ["interior design", "interior designer", "interiors", "false ceiling", "modular kitchen"],
  renovation: ["renovation", "remodel", "home renovation", "civil work"],
  cctv: ["cctv", "security camera", "cctv installation", "surveillance"],
  packersmovers: ["packers", "movers", "packers and movers", "shifting", "relocation", "house shifting"],
  welding: ["welding", "fabrication", "grill work", "welder"],
  roofing: ["roofing", "waterproofing", "leak proofing", "terrace waterproof"],

  // ── Domestic help ──
  maid: ["maid", "housemaid", "domestic help", "house help", "servant", "bai"],
  cook: ["cook", "home cook", "chef for home", "kitchen help"],
  nanny: ["nanny", "babysitter", "baby sitter", "baby care", "ayah"],
  driver: ["driver", "personal driver", "car driver"],
  caretaker: ["caretaker", "care taker", "attendant"],
  securityguard: ["security guard", "watchman", "guard", "bouncer"],
  eldercare: ["elderly care", "elder care", "old age care", "senior care", "patient care"],

  // ── Beauty & personal care ──
  salon: ["salon", "unisex salon", "parlour", "parlor", "hair salon", "beauty salon"],
  barber: ["barber", "haircut", "men's grooming", "mens grooming", "shaving"],
  spa: ["spa", "massage", "body massage", "ayurvedic massage"],
  makeup: ["makeup", "make up", "makeup artist", "bridal makeup"],
  mehndi: ["mehndi", "mehendi", "henna"],
  beautician: ["beautician", "facial", "waxing", "threading", "bridal package"],
  tattoo: ["tattoo", "tattoo artist", "piercing"],
  nailart: ["nail art", "manicure", "pedicure", "nail extension"],

  // ── Health & wellness ──
  doctor: ["doctor", "physician", "clinic", "general physician"],
  dentist: ["dentist", "dental", "tooth", "teeth"],
  physiotherapy: ["physiotherapy", "physiotherapist", "physio"],
  nursing: ["nursing", "home nursing", "nurse"],
  pharmacy: ["pharmacy", "medical store", "medicines", "chemist", "medical shop"],
  labtest: ["lab test", "blood test", "diagnostic", "pathology", "scan", "x-ray"],
  ambulance: ["ambulance"],
  gym: ["gym", "fitness center", "fitness centre", "workout", "crossfit"],
  yoga: ["yoga", "meditation", "pranayama"],
  dietician: ["dietician", "dietitian", "nutritionist", "diet plan"],
  mentalhealth: ["counselling", "counseling", "therapist", "psychologist", "mental health"],
  veterinary: ["veterinary", "vet", "animal doctor", "pet doctor"],

  // ── Education & coaching ──
  tutor: ["tutor", "tuition", "home tuition", "home tutor", "teacher"],
  coaching: ["coaching", "exam prep", "ias coaching", "neet", "jee", "competitive exam"],
  musicclass: ["music class", "guitar class", "piano class", "keyboard class", "singing class", "vocal class"],
  danceclass: ["dance class", "dance classes", "zumba", "bharatanatyam", "choreography"],
  artclass: ["art class", "drawing class", "painting class", "craft class", "sketching"],
  languageclass: ["language class", "spoken english", "ielts", "german class", "french class"],
  sportscoaching: ["sports coaching", "cricket coaching", "football coaching", "swimming class", "skating", "karate"],
  skilltraining: ["skill training", "vocational", "tally course", "computer course", "stitching class"],

  // ── Events & photography ──
  catering: ["catering", "caterer", "food for event", "banquet food"],
  eventplanner: ["event planner", "event management", "wedding planner", "party planner"],
  photography: ["photography", "photographer", "photoshoot", "pre-wedding shoot"],
  videography: ["videography", "videographer", "video shoot", "cinematography"],
  dj: ["dj", "disc jockey", "dj service"],
  decoration: ["decoration", "decorator", "florist", "flower decoration", "balloon decoration"],
  tenthouse: ["tent house", "tent service", "shamiana", "canopy"],
  band: ["band", "live music", "orchestra", "baja"],
  anchor: ["anchor", "emcee", "host for event", "compere"],

  // ── Food & grocery ──
  supermarket: ["supermarket", "grocery", "groceries", "departmental store", "provision store", "kirana", "hypermarket"],
  bakery: ["bakery", "cake", "pastry", "birthday cake"],
  restaurant: ["restaurant", "cafe", "café", "dine", "eatery", "dhaba"],
  cloudkitchen: ["cloud kitchen", "online kitchen"],
  tiffin: ["tiffin", "meal service", "lunch service", "mess", "dabba"],
  milk: ["milk delivery", "dairy", "milk supply"],
  watersupply: ["water can", "water supply", "drinking water", "water delivery", "mineral water"],
  meatshop: ["meat shop", "chicken shop", "mutton", "fish shop", "non veg"],
  vegetables: ["vegetable vendor", "vegetables", "fruit vendor", "fruits", "sabzi"],

  // ── Automobile ──
  carrental: ["car rental", "rent a car", "self drive car", "cab rental", "taxi service"],
  bikerental: ["bike rental", "rent a bike", "scooter rental", "two wheeler rental"],
  carrepair: ["car repair", "car garage", "car service", "car mechanic"],
  bikerepair: ["bike repair", "bike service", "bike mechanic", "two wheeler repair"],
  carwash: ["car wash", "car detailing", "bike wash", "vehicle wash"],
  towing: ["towing", "roadside assistance", "vehicle breakdown"],
  drivingschool: ["driving school", "driving class", "learn driving"],
  cardealer: ["car dealer", "used car", "second hand car", "bike dealer", "showroom"],
  spareparts: ["spare parts", "auto parts", "car parts", "bike parts"],

  // ── Professional & business ──
  lawyer: ["lawyer", "advocate", "legal", "attorney"],
  accountant: ["accountant", "ca", "chartered accountant", "bookkeeping", "auditor"],
  taxconsultant: ["tax consultant", "gst", "income tax", "itr", "tax filing"],
  financialadvisor: ["financial advisor", "investment advisor", "mutual fund", "wealth"],
  insurance: ["insurance", "lic", "policy agent", "health insurance"],
  notary: ["notary", "documentation", "affidavit", "stamp paper"],
  consultant: ["business consultant", "consultancy", "startup advisor"],
  recruitment: ["recruitment", "hr consultant", "placement", "hiring", "manpower"],
  architect: ["architect", "architecture", "building plan", "structural design"],

  // ── Tech & digital ──
  webdevelopment: ["web development", "website", "web design", "web developer"],
  appdevelopment: ["app development", "mobile app", "android app", "ios app"],
  graphicdesign: ["graphic design", "logo design", "graphic designer", "poster design"],
  digitalmarketing: ["digital marketing", "seo", "social media marketing", "google ads", "smm"],
  computerrepair: ["computer repair", "laptop repair", "pc repair", "desktop repair"],
  mobilerepair: ["mobile repair", "phone repair", "screen replacement", "cell repair"],
  itsupport: ["it support", "network support", "system admin"],
  dataentry: ["data entry", "typing work", "form filling"],

  // ── Logistics & delivery ──
  courier: ["courier", "parcel", "shipment"],
  transport: ["transport", "truck", "tempo", "lorry", "goods carrier"],
  cargo: ["cargo", "freight", "logistics"],
  delivery: ["delivery service", "local delivery", "pickup and drop"],

  // ── Apparel & repair ──
  tailor: ["tailor", "tailoring", "boutique", "stitching", "alteration"],
  laundry: ["laundry", "dry clean", "dry cleaning", "ironing", "wash and fold"],
  cobbler: ["cobbler", "shoe repair", "mochi"],
  embroidery: ["embroidery", "zardosi", "aari work"],

  // ── Pets ──
  petgrooming: ["pet grooming", "dog grooming", "pet spa"],
  petboarding: ["pet boarding", "dog boarding", "pet daycare", "pet hostel"],
  pettrainer: ["pet trainer", "dog trainer", "dog training"],
  petshop: ["pet shop", "pet food", "pet store", "aquarium"],

  // ── Other services ──
  printing: ["printing", "xerox", "photocopy", "print shop", "flex printing"],
  astrology: ["astrology", "astrologer", "horoscope", "kundli", "numerology"],
  priest: ["priest", "pandit", "pooja", "puja", "purohit"],
  translation: ["translation", "translator", "transcription"],
  scrapdealer: ["scrap dealer", "scrap", "kabadi", "raddi"],
  locksmith: ["locksmith", "key maker", "lock repair", "duplicate key"],
  signboard: ["signboard", "banner", "hoarding", "name board", "flex board"],
  securityservices: ["security services", "security agency", "bouncer service"],

  // ── Stay & property ──
  pg: ["pg", "pgs", "paying guest", "hostel"],
  hotel: ["hotel", "lodge", "motel", "short stay"],
  guesthouse: ["guest house", "guesthouse", "homestay", "home stay"],
  resort: ["resort", "cottage", "villa stay"],
  farmhouse: ["farmhouse", "farm house"],
  servicedapartment: ["serviced apartment", "service apartment"],
  flat: ["flat", "apartment", "bhk", "1rk", "studio apartment"],
  house: ["house", "villa", "independent house", "duplex", "bungalow"],
  plot: ["plot", "land", "site", "open plot"],
  coworking: ["co-working", "coworking", "shared office", "workspace"],
  office: ["office space", "office", "cabin"],
  shop: ["shop", "showroom", "retail space"],
  warehouse: ["warehouse", "godown", "storage space"],
  commercial: ["commercial space", "commercial", "business space"],
  realestateagent: ["real estate agent", "property agent", "broker", "property dealer"],
  room: ["single room", "room for rent", "pg room", "room"],
  rental: ["rental", "for rent", "to let"],

  // legacy alias kept so older data still resolves
  accommodation: ["accommodation"],
};

// The categories where it makes sense to ask the customer for a budget (stays &
// property rentals). For most services we skip the budget question — it only
// adds friction and service prices vary too much to filter on.
export const BUDGET_CATEGORIES = [
  "flat", "pg", "room", "roommate", "house", "hotel", "accommodation",
  "guesthouse", "resort", "farmhouse", "servicedapartment",
  "plot", "commercial", "office", "coworking", "shop", "warehouse", "rental",
];

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

// Whole-word(ish) match: a term must be bounded by a non-letter on each side, so
// "spa" matches "need a spa" but NOT "office space", and "dj" won't hit "adjust".
// Digits count as boundaries, so "2bhk" still matches the term "bhk".
const termHit = (lower, term) => {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`, "i").test(lower);
};

// Detect a category from free text, or return "general" when nothing matches.
export const detectCategory = (text = "") => {
  const lower = text.toLowerCase();
  return (
    Object.entries(categoryTerms).find(([, terms]) =>
      terms.some((term) => termHit(lower, term)),
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

  // 2. Budget number? handle "12000", "12,000", "20k". But NOT while we're
  //    collecting a location (a number there is a pincode, not a budget), and
  //    only accept sane rent amounts (3–6 digits, ≤ 10 lakh) so a mistyped
  //    pincode like "5242001" never becomes a ₹52,42,001 budget.
  if (!requirements.budgetMax && awaitingField !== "location") {
    const k = lower.match(/(\d+(?:\.\d+)?)\s*k\b/);
    const n = lower.replace(/,/g, "").match(/\b\d{3,6}\b/);
    let b;
    if (k) b = Math.round(parseFloat(k[1]) * 1000);
    else if (n) b = Number(n[0]);
    if (b && b >= 500 && b <= 1000000) requirements.budgetMax = b;
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
