import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    tags: [{ type: String, trim: true }],
    source: {
      type: String,
      enum: ["whatsapp", "instagram", "facebook", "manual"],
      default: "manual",
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
