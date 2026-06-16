import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    channel: {
      type: String,
      enum: ["whatsapp", "instagram", "facebook"],
    },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "sent", "cancelled", "failed"],
      default: "scheduled",
    },
    message: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

followUpSchema.index({ scheduledAt: 1, status: 1 });

const FollowUp = mongoose.model("FollowUp", followUpSchema, "follow_ups");

export default FollowUp;
