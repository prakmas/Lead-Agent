import OtpToken from "../models/OtpToken.js";
import env from "../config/env.js";
import { startVerification, checkVerification, twilioConfigured } from "../adapters/twilio.adapter.js";

// Reusable OTP send/verify for the WhatsApp agent. Uses Twilio Verify when
// configured, otherwise a locally-generated code (returned as devCode outside
// production so the flow is testable without an SMS provider).

const cleanPhone = (p) => String(p || "").replace(/\D/g, "");

export const sendOtp = async (phone) => {
  const clean = cleanPhone(phone);
  if (twilioConfigured()) {
    try {
      await startVerification(clean);
      await OtpToken.findOneAndUpdate(
        { phone: clean },
        { phone: clean, code: "twilio", verified: false, attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return { sent: true, provider: "twilio" };
    } catch (error) {
      console.error("[otp] Twilio send failed, falling back to local code:", error.message);
    }
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await OtpToken.findOneAndUpdate(
    { phone: clean },
    { phone: clean, code, verified: false, attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { sent: true, provider: "local", devCode: env.nodeEnv !== "production" ? code : undefined };
};

export const verifyOtp = async (phone, code) => {
  const clean = cleanPhone(phone);
  const token = await OtpToken.findOne({ phone: clean });
  if (!token) return { ok: false, reason: "expired" };

  token.attempts += 1;
  if (token.attempts > 6) {
    await token.deleteOne();
    return { ok: false, reason: "too_many" };
  }

  if (token.code === "twilio" && twilioConfigured()) {
    let approved = false;
    try {
      approved = await checkVerification(clean, code);
    } catch {
      await token.save();
      return { ok: false, reason: "error" };
    }
    if (!approved) {
      await token.save();
      return { ok: false, reason: "wrong" };
    }
  } else if (token.code !== String(code).trim()) {
    await token.save();
    return { ok: false, reason: "wrong" };
  }

  token.verified = true;
  token.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await token.save();
  return { ok: true };
};
