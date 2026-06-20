import "../loadEnv.js";
import connectDB from "../config/db.js";
import Listing from "../models/Listing.js";

// Backfill each listing's REAL pincode by looking up its area name in the free
// India Post API and matching the listing's state (+ district when possible).
// Only assigns a pincode when the post office's state matches the listing's
// state, so non-Indian listings are safely skipped.
const norm = (s = "") => s.toLowerCase().trim();

const fetchPin = async (area, city, state) => {
  try {
    const res = await fetch(`https://api.postalpincode.in/postoffice/${encodeURIComponent(area)}`);
    const data = await res.json();
    const block = data?.[0];
    if (!block || block.Status !== "Success") return null;
    const offices = block.PostOffice || [];
    // Must be in the same state — this filters out wrong-country matches.
    const stateMatch = offices.filter((o) => norm(o.State) === norm(state) || norm(o.State).includes(norm(state)));
    if (!stateMatch.length) return null;
    const distMatch = stateMatch.find((o) => norm(o.District).includes(norm(city)) || norm(city).includes(norm(o.District)));
    return (distMatch || stateMatch[0]).Pincode || null;
  } catch {
    return null;
  }
};

const run = async () => {
  await connectDB();
  const groups = await Listing.aggregate([
    { $match: { "metadata.area": { $nin: [null, ""] } } },
    { $group: { _id: { area: "$metadata.area", city: "$metadata.city", state: "$metadata.state" } } },
  ]);

  let resolved = 0;
  let updated = 0;
  for (const g of groups) {
    const { area, city, state } = g._id;
    const pin = await fetchPin(area, city, state);
    if (!pin) {
      console.log(`  – ${area}, ${city}, ${state}: no Indian pincode (skipped)`);
      continue;
    }
    resolved++;
    const r = await Listing.updateMany(
      { "metadata.area": area, "metadata.city": city, "metadata.state": state },
      { $set: { "metadata.pincode": pin } },
    );
    updated += r.modifiedCount;
    console.log(`  ✓ ${area}, ${city} → ${pin} (${r.modifiedCount} listings)`);
    await new Promise((r) => setTimeout(r, 120)); // be gentle on the API
  }

  console.log(`\n✅ Areas resolved: ${resolved}, listings updated: ${updated}`);
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
