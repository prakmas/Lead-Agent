import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["whatsapp", "instagram", "facebook"],
      required: true,
    },
    name: { type: String, trim: true },
    externalAccountId: { type: String, trim: true },
    accessToken: { type: String, select: false },
    status: {
      type: String,
      enum: ["active", "inactive", "needs_setup"],
      default: "needs_setup",
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

channelSchema.index({ type: 1, externalAccountId: 1 }, { unique: true, sparse: true });

const Channel = mongoose.model("Channel", channelSchema);

export default Channel;
