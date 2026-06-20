import mongoose from "mongoose";

// Deep India gazetteer — every populated place (city / town / village / locality)
// from the GeoNames IN dump (~546k docs). Kept in its OWN collection so the
// curated `locations` collection (states/cities) stays small and fast, while
// this long tail powers village-level autocomplete and lead↔listing matching.
const geoPlaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // display name (with diacritics)
    search: { type: String, required: true, trim: true }, // lowercase ascii — indexed for autocomplete
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    type: { type: String, trim: true }, // city | town | locality | village
    lat: Number,
    lng: Number,
  },
  { timestamps: false }, // static reference data — skip timestamps to save space
);

// Prefix-anchored autocomplete (`^q`) uses this index even at 500k+ docs.
geoPlaceSchema.index({ search: 1 });
geoPlaceSchema.index({ state: 1, district: 1 });

const GeoPlace = mongoose.models.GeoPlace || mongoose.model("GeoPlace", geoPlaceSchema);

export default GeoPlace;
