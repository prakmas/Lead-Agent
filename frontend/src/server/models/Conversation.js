import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: true },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    status: {
      type: String,
      enum: ["open", "waiting", "matched", "closed", "stopped", "spam"],
      default: "open",
    },
    lastMessage: { type: String, trim: true },
    lastMessageAt: Date,
    unreadCount: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

conversationSchema.index({ contact: 1, channel: 1, status: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);

export default Conversation;
