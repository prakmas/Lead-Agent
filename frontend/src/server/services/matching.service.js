import Listing from "../models/Listing.js";
import Match from "../models/Match.js";
import { BUDGET_CATEGORIES } from "../utils/requirements.js";

const normalize = (value = "") => value.toString().trim().toLowerCase();

// Noise words that should NOT count as keyword matches (they inflate scores and
// made unrelated listings appear, e.g. matching on "for", "to", "a").
const STOPWORDS = new Set([
  "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "with",
  "near", "around", "under", "below", "from", "is", "are", "am", "i", "need",
  "want", "looking", "rent", "buy", "my", "me", "you", "your", "this", "that",
  "please", "hi", "hello", "around", "approx", "about", "k",
]);

const tokenize = (values = []) =>
  values
    .flatMap((value) => normalize(value).split(/[\s,]+/))
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));

const includes = (target, value) => normalize(target).includes(normalize(value));

// All the place names attached to a listing — area, city, state, country — so a
// search matches at ANY level ("Plano", "Dallas", "Texas", "USA" all hit a Plano
// listing). Falls back to the flat location string for legacy data.
const listingPlaceText = (listing) => {
  const m = listing.metadata || {};
  return normalize([listing.location, m.area, m.city, m.state, m.country].filter(Boolean).join(" "));
};

const locationMatches = (listing, requestedLocation) => {
  if (!requestedLocation) return true; // no location asked → don't filter
  const hay = listingPlaceText(listing);
  const R = normalize(requestedLocation);
  if (!hay) return false; // location asked but listing has none → exclude
  if (hay.includes(R)) return true;
  // Match on any meaningful token of the request (e.g. "HSR Layout" → "hsr").
  return R.split(/[\s,]+/).some((tok) => tok.length > 2 && hay.includes(tok));
};

// Reject listings well above budget so a ₹2000 ask never returns ₹22000 places.
// 25% headroom keeps "close" options; only applies to budget-driven categories.
const withinBudget = (listing, requirements) => {
  if (!requirements.budgetMax) return true;
  if (!listing.budget) return true; // "price on request" — keep
  if (!BUDGET_CATEGORIES.includes(normalize(requirements.category))) return true;
  // Strict: "under 10,000" must NOT show a 12,000 listing. Small 2% grace only
  // to avoid excluding an exact-budget listing due to rounding.
  return listing.budget <= requirements.budgetMax * 1.02;
};

export const scoreListingForLead = (lead, listing) => {
  const requirements = lead.requirements || {};
  const reasons = [];
  let score = 0;

  if (requirements.category && normalize(requirements.category) === normalize(listing.category)) {
    score += 20;
    reasons.push("Category match");
  }

  if (requirements.location && locationMatches(listing, requirements.location)) {
    score += 25;
    reasons.push("Location match");
  }

  if (
    listing.budget &&
    (!requirements.budgetMax || listing.budget <= requirements.budgetMax) &&
    (!requirements.budgetMin || listing.budget >= requirements.budgetMin)
  ) {
    score += 20;
    reasons.push("Budget fit");
  }

  if (requirements.availability && listing.availability && includes(listing.availability, requirements.availability)) {
    score += 10;
    reasons.push("Availability match");
  }

  const leadWords = new Set([
    ...tokenize(requirements.preferences),
    ...tokenize(requirements.keywords),
    ...tokenize([requirements.rawText]),
  ]);
  const listingWords = new Set([
    ...tokenize(listing.preferences),
    ...tokenize(listing.keywords),
    ...tokenize([listing.title, listing.description]),
  ]);
  const overlaps = [...leadWords].filter((word) => listingWords.has(word));

  if (overlaps.length) {
    score += Math.min(25, overlaps.length * 5);
    reasons.push(`Keyword overlap: ${overlaps.slice(0, 5).join(", ")}`);
  }

  return { score: Math.min(score, 100), reasons };
};

export const findMatchesForLead = async (lead, limit = 5) => {
  const requirements = lead.requirements || {};
  const query = { status: "active" };

  if (requirements.category && requirements.category !== "general") {
    query.category = new RegExp(requirements.category, "i");
  }

  const listings = await Listing.find(query).limit(200);

  // Hard filters first — these are non-negotiable for relevance. Asking for
  // Nellore must NOT return Bangalore; asking ₹12k must not return ₹40k.
  const eligible = listings.filter(
    (l) => locationMatches(l, requirements.location) && withinBudget(l, requirements),
  );

  const scored = eligible
    .map((listing) => ({ listing, ...scoreListingForLead(lead, listing) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const matches = [];

  for (const item of scored) {
    const match = await Match.findOneAndUpdate(
      { lead: lead._id, listing: item.listing._id },
      {
        lead: lead._id,
        listing: item.listing._id,
        score: item.score,
        reasons: item.reasons,
        status: "suggested",
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).populate("listing");

    matches.push(match);
  }

  return matches;
};
