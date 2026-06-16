import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: true },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "audio", "video", "unknown"],
      default: "text",
    },
    text: { type: String, trim: true },
    providerMessageId: { type: String, trim: true },
    status: {
      type: String,
      enum: ["received", "sent", "failed"],
      default: "received",
    },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ text: "text" });

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
