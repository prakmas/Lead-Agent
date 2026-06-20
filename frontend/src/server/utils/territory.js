// Helpers to scope listings to a supervisor's assigned territories.
// A listing belongs to a territory when its metadata.state / city / pincode
// matches a territory value (case-insensitive exact match).

const LEVELS = ["state", "city", "pincode"];

const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactRx = (v) => new RegExp(`^${escapeRx(v)}$`, "i");

// Keep only valid {level, value} entries.
export const normalizeTerritories = (input = []) =>
  (Array.isArray(input) ? input : [])
    .filter((t) => t && LEVELS.includes(t.level) && typeof t.value === "string" && t.value.trim())
    .map((t) => ({ level: t.level, value: t.value.trim() }));

const isFullAccess = (admin) => admin.role === "owner" || admin.role === "admin";

// A Mongo query fragment limiting listings to the admin's territory.
//  - owner/admin → {} (everything)
//  - supervisor with territories → $or across state/city/pincode
//  - supervisor with NO territories → matches nothing (until assigned)
export const territoryListingQuery = (admin) => {
  if (isFullAccess(admin)) return {};
  const t = normalizeTerritories(admin.territories);
  if (!t.length) return { _id: null };

  const byLevel = (lvl) => t.filter((x) => x.level === lvl).map((x) => exactRx(x.value));
  const or = [];
  const states = byLevel("state");
  const cities = byLevel("city");
  const pins = byLevel("pincode");
  if (states.length) or.push({ "metadata.state": { $in: states } });
  if (cities.length) or.push({ "metadata.city": { $in: cities } });
  if (pins.length) or.push({ "metadata.pincode": { $in: pins } });
  return or.length ? { $or: or } : { _id: null };
};

// Whether a single listing falls within the admin's territory.
export const listingInTerritory = (admin, listing) => {
  if (isFullAccess(admin)) return true;
  const t = normalizeTerritories(admin.territories);
  if (!t.length) return false;
  const m = listing.metadata || {};
  return t.some((x) => {
    const field = x.level === "state" ? m.state : x.level === "city" ? m.city : m.pincode;
    return field && String(field).toLowerCase() === x.value.toLowerCase();
  });
};
