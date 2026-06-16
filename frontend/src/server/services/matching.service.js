import Listing from "../models/Listing.js";
import Match from "../models/Match.js";

const normalize = (value = "") => value.toString().trim().toLowerCase();

const tokenize = (values = []) =>
  values
    .flatMap((value) => normalize(value).split(/[\s,]+/))
    .filter(Boolean);

const includes = (target, value) => normalize(target).includes(normalize(value));

export const scoreListingForLead = (lead, listing) => {
  const requirements = lead.requirements || {};
  const reasons = [];
  let score = 0;

  if (requirements.category && normalize(requirements.category) === normalize(listing.category)) {
    score += 20;
    reasons.push("Category match");
  }

  if (requirements.location && listing.location && includes(listing.location, requirements.location)) {
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

  if (requirements.category) query.category = new RegExp(requirements.category, "i");

  const listings = await Listing.find(query).limit(100);
  const scored = listings
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
