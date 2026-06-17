import OtpToken from "@/server/models/OtpToken.js";
import env from "@/server/config/env.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Send an OTP to a business owner's phone to verify it before listing them.
// NOTE: no SMS provider is wired yet, so in non-production the code is returned
// in the response (devCode) for testing. In production, replace the "send" step
// with a real SMS/WhatsApp send and stop returning devCode.
//   POST /api/admin/listings/otp/send  { phone }
export const POST = route(async (request: Request) => {
  await requireApiAccess(request);
  const { phone } = await request.json();
  const clean = String(phone || "").replace(/\D/g, "");
  if (clean.length < 10) throw createHttpError(400, "Enter a valid phone number");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await OtpToken.findOneAndUpdate(
    { phone: clean },
    { phone: clean, code, verified: false, attempts: 0, expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // TODO: integrate an SMS/WhatsApp provider here to actually deliver `code`.
  const isProd = env.nodeEnv === "production";
  return json({
    sent: true,
    ...(isProd ? {} : { devCode: code, note: "DEV mode: no SMS provider — use this code." }),
  });
});
