import mongoose from "mongoose";

// Reference data for places (states, cities). Seeded offline from
// `country-state-city`; deeper levels (district / area / village / pincode) are
// looked up live via the free India Post pincode API.
const locationSchema = new mongoose.Schema(
  {
    country: { type: String, required: true, trim: true },
    countryCode: { type: String, trim: true },
    state: { type: String, trim: true },
    stateCode: { type: String, trim: true },
    city: { type: String, trim: true },
    type: { type: String, enum: ["state", "city"], required: true },
    name: { type: String, required: true, trim: true }, // display name
    label: { type: String, trim: true }, // "City, State"
    search: { type: String, required: true, trim: true }, // lowercase for matching
  },
  { timestamps: true },
);

locationSchema.index({ search: 1 });
locationSchema.index({ countryCode: 1, type: 1, stateCode: 1 });
locationSchema.index({ name: "text", label: "text" });

const Location = mongoose.models.Location || mongoose.model("Location", locationSchema);

export default Location;
