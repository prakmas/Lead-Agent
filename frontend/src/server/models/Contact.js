import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: "Channel", required: true },
    channelType: {
      type: String,
      enum: ["whatsapp", "instagram", "facebook"],
      required: true,
    },
    externalId: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    username: { type: String, trim: true },
    profile: { type: mongoose.Schema.Types.Mixed, default: {} },
    tags: [{ type: String, trim: true }],
    lastSeenAt: Date,
  },
  { timestamps: true },
);

contactSchema.index({ channelType: 1, externalId: 1 }, { unique: true });
contactSchema.index({ name: "text", phone: "text", username: "text", externalId: "text" });

const Contact = mongoose.models.Contact || mongoose.model("Contact", contactSchema);

export default Contact;
