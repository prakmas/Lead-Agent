import mongoose from "mongoose";
import Listing from "./Listing.js";

// Deleted listings live in their OWN collection (audit/recycle bin). Mirrors the
// Listing schema and adds who/when/why it was removed + the original id (for
// restore).
const deletedListingSchema = new mongoose.Schema(
  {
    ...Listing.schema.obj,
    originalId: mongoose.Schema.Types.ObjectId,
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    deleteReason: { type: String, trim: true },
  },
  { timestamps: true },
);

deletedListingSchema.index({ "metadata.state": 1 });
deletedListingSchema.index({ "metadata.city": 1 });
deletedListingSchema.index({ "metadata.pincode": 1 });

const DeletedListing =
  mongoose.models.DeletedListing || mongoose.model("DeletedListing", deletedListingSchema);

export default DeletedListing;
