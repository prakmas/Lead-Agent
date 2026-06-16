import mongoose from "mongoose";

const matchSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    score: { type: Number, min: 0, max: 100, default: 0 },
    reasons: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["suggested", "sent", "accepted", "rejected", "expired"],
      default: "suggested",
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

matchSchema.index({ lead: 1, listing: 1 }, { unique: true });
matchSchema.index({ score: -1, createdAt: -1 });

const Match = mongoose.model("Match", matchSchema);

export default Match;
