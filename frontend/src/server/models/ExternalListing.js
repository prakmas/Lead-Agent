import mongoose from "mongoose";

// Cache of listings scraped from external marketplaces (Cars.com, Trulia, Rent.com,
// Yelp …) via Firecrawl. Keyed by a normalized query so repeat searches are instant
// and we don't burn Firecrawl credits. Documents auto-expire after `expireAfter`.
const ExternalListingSchema = new mongoose.Schema(
  {
    cacheKey: { type: String, index: true }, // `${category}:${listingType}:${city}:${item}`
    source: String, // e.g. "Cars.com"
    category: String, // real_estate | vehicle | service | other
    city: String,
    item: String,
    listings: [
      {
        title: String,
        priceLabel: String,
        price: Number,
        location: String,
        url: String,
        description: String,
      },
    ],
    // TTL — Mongo removes the doc this many seconds after createdAt.
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 6 }, // 6 hours
  },
  { minimize: false },
);

export default mongoose.models.ExternalListing || mongoose.model("ExternalListing", ExternalListingSchema);
