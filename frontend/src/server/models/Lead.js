import mongoose from "mongoose";
import { leadStatuses } from "../utils/leadStatus.js";

const requirementsSchema = new mongoose.Schema(
  {
    location: { type: String, trim: true },
    budgetMin: Number,
    budgetMax: Number,
    category: { type: String, trim: true },
    preferences: [{ type: String, trim: true }],
    availability: { type: String, trim: true },
    keywords: [{ type: String, trim: true }],
    rawText: { type: String, trim: true },
  },
  { _id: false },
);

const leadSchema = new mongoose.Schema(
  {
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    channel: {
      type: String,
      enum: ["whatsapp", "instagram", "facebook", "manual"],
      default: "manual",
    },
    title: { type: String, trim: true },
    intent: { type: String, trim: true },
    category: { type: String, trim: true },
    status: {
      type: String,
      enum: leadStatuses,
      default: "New",
    },
    requirements: { type: requirementsSchema, default: {} },
    missingFields: [{ type: String, trim: true }],
    lastMatchedAt: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({
  title: "text",
  intent: "text",
  category: "text",
  "requirements.location": "text",
  "requirements.keywords": "text",
});

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);

export default Lead;
