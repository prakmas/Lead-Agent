// Shared requirement logic used by the mock AI provider and the conversation
// service so follow-up answers are interpreted consistently across turns.

export const categoryTerms = {
  roommate: ["roommate", "flatmate", "sharing", "room partner"],
  accommodation: [
    "room",
    "pg",
    "hostel",
    "accommodation",
    "rent",
    "rental",
    "flat",
    "apartment",
    "house",
    "bhk",
  ],
  services: [
    "service",
    "cleaning",
    "repair",
    "maid",
    "cook",
    "driver",
    "plumber",
    "electrician",
  ],
};

// Detect a category from free text, or return "general" when nothing matches.
export const detectCategory = (text = "") => {
  const lower = text.toLowerCase();
  return (
    Object.entries(categoryTerms).find(([, terms]) =>
      terms.some((term) => lower.includes(term)),
    )?.[0] || "general"
  );
};

// Decide which fields are still missing based on the ACCUMULATED requirements
// (not just the latest message), so answers given across turns count.
export const computeMissingFields = (requirements = {}) => {
  const missing = [];
  const category = requirements.category;

  if (!requirements.location) missing.push("location");
  if (!requirements.budgetMax && ["roommate", "accommodation"].includes(category)) {
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

// Interpret a short follow-up reply (e.g. just "Nellore" or "20000") as the
// answer to the field we last asked about, filling it into requirements.
export const applyPendingAnswer = (awaitingField, rawMessage, requirements = {}) => {
  const text = (rawMessage || "").trim();
  if (!awaitingField || !text) return requirements;

  if (awaitingField === "location" && !requirements.location) {
    // Strip a leading preposition if present, otherwise use the whole reply.
    requirements.location = text.replace(/^(in|near|around|at|to)\s+/i, "").trim();
  } else if (awaitingField === "budget" && !requirements.budgetMax) {
    const match = text.match(/\d{3,7}/);
    if (match) requirements.budgetMax = Number(match[0]);
  } else if (
    awaitingField === "category" &&
    (!requirements.category || requirements.category === "general")
  ) {
    const detected = detectCategory(text);
    if (detected !== "general") requirements.category = detected;
  }

  return requirements;
};
