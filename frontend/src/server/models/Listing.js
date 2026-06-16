import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    budget: Number,
    priceLabel: { type: String, trim: true },
    availability: { type: String, trim: true },
    preferences: [{ type: String, trim: true }],
    keywords: [{ type: String, trim: true }],
    contactInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["active", "inactive", "matched", "archived"],
      default: "active",
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

listingSchema.index({ status: 1, category: 1, location: 1, budget: 1 });
listingSchema.index({
  title: "text",
  description: "text",
  category: "text",
  location: "text",
  keywords: "text",
  preferences: "text",
});

const Listing = mongoose.models.Listing || mongoose.model("Listing", listingSchema);

export default Listing;
