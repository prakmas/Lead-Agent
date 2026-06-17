import mongoose from "mongoose";

// Short-lived OTP for verifying a business owner's phone before listing them.
// `expiresAt` has a TTL index so stale tokens self-delete.
const otpTokenSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    code: { type: String, required: true },
    verified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpToken = mongoose.models.OtpToken || mongoose.model("OtpToken", otpTokenSchema);

export default OtpToken;
