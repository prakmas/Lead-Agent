import OtpToken from "@/server/models/OtpToken.js";
import { startVerification, twilioConfigured } from "@/server/adapters/twilio.adapter.js";
import env from "@/server/config/env.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Send an OTP to a business owner's phone to verify it before listing them.
// When Twilio Verify is configured, Twilio generates & delivers the code (and
// validates it on /verify). Otherwise we fall back to a locally-generated code
// that's returned in the response (devCode) for testing.
//   POST /api/admin/listings/otp/send  { phone }
export const POST = route(async (request: Request) => {
  await requireApiAccess(request);
  const { phone } = await request.json();
  const clean = String(phone || "").replace(/\D/g, "");
  if (clean.length < 10) throw createHttpError(400, "Enter a valid phone number");

  // ── Preferred path: Twilio Verify delivers a real SMS OTP ──────────────────
  if (twilioConfigured()) {
    try {
      await startVerification(clean);
    } catch (err) {
      throw createHttpError(502, `Couldn't send OTP: ${(err as Error).message}`);
    }
    // Track that a verification is pending; the code lives only at Twilio.
    await OtpToken.findOneAndUpdate(
      { phone: clean },
      { phone: clean, code: "twilio", verified: false, attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return json({ sent: true, provider: "twilio" });
  }

  // ── Fallback (no SMS provider configured): local code, returned in dev ─────
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await OtpToken.findOneAndUpdate(
    { phone: clean },
    { phone: clean, code, verified: false, attempts: 0, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const isProd = env.nodeEnv === "production";
  return json({
    sent: true,
    ...(isProd ? {} : { devCode: code, note: "DEV mode: no SMS provider — use this code." }),
  });
});
