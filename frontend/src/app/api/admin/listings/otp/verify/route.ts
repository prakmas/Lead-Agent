import OtpToken from "@/server/models/OtpToken.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

// Verify the OTP for a phone. On success the token is kept (verified, extended)
// so the listing-create step can confirm the owner's phone was verified.
//   POST /api/admin/listings/otp/verify  { phone, code }
export const POST = route(async (request: Request) => {
  await requireApiAccess(request);
  const { phone, code } = await request.json();
  const clean = String(phone || "").replace(/\D/g, "");

  const token = await OtpToken.findOne({ phone: clean });
  if (!token) throw createHttpError(400, "OTP expired or not sent. Please resend.");

  token.attempts += 1;
  if (token.attempts > 6) {
    await token.deleteOne();
    throw createHttpError(429, "Too many attempts. Please resend a new OTP.");
  }

  if (token.code !== String(code).trim()) {
    await token.save();
    throw createHttpError(400, "Incorrect OTP. Please try again.");
  }

  token.verified = true;
  token.expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // keep verified 2h
  await token.save();

  return json({ verified: true });
});
