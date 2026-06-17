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
    // Photos (data URLs). First entry is the cover. coverThumb is a small version
    // returned in list views so the inventory list stays lightweight.
    images: [{ type: String }],
    coverThumb: { type: String },
    // Exact map location.
    geo: {
      lat: Number,
      lng: Number,
      address: { type: String, trim: true },
    },
    // Contact shared with the customer on WhatsApp for this listing.
    contactName: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    contactInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
    // ── Business registration details (captured by a supervisor on-site) ──
    ownerName: { type: String, trim: true },
    ownerPhone: { type: String, trim: true }, // verified via OTP
    phoneVerified: { type: Boolean, default: false },
    mapLink: { type: String, trim: true }, // pasted Google Maps URL
    address: { type: String, trim: true }, // full address
    landmark: { type: String, trim: true }, // near / opposite / beside
    timings: { type: String, trim: true }, // e.g. "Mon–Sat 9am–9pm"
    services: { type: String, trim: true }, // free text — what the business does
    status: {
      type: String,
      enum: ["active", "inactive", "matched", "archived"],
      default: "active",
    },
    // Which admin/supervisor added this listing (territory attribution).
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

listingSchema.index({ status: 1, category: 1, location: 1, budget: 1 });
// Territory scoping reads these metadata fields.
listingSchema.index({ "metadata.state": 1 });
listingSchema.index({ "metadata.city": 1 });
listingSchema.index({ "metadata.pincode": 1 });
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
