import env from "../config/env.js";

// Twilio Verify — Twilio generates, sends and validates the OTP for us. This is
// the recommended OTP path (better deliverability + compliance than raw SMS,
// especially for India). No code is stored on our side.
//   https://www.twilio.com/docs/verify/api

const base = "https://verify.twilio.com/v2";

const isConfigured = () =>
  Boolean(env.twilio.accountSid && env.twilio.authToken && env.twilio.verifyServiceSid);

export const twilioConfigured = isConfigured;

// Normalise a phone to E.164. Indian 10-digit numbers default to +91.
export const toE164 = (raw) => {
  const s = String(raw || "").trim();
  if (s.startsWith("+")) return "+" + s.slice(1).replace(/\D/g, "");
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`; // bare Indian mobile
  return `+${digits}`;
};

const authHeader = () =>
  "Basic " + Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString("base64");

const post = async (path, params) => {
  const res = await fetch(`${base}/Services/${env.twilio.verifyServiceSid}/${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Twilio Verify failed (${res.status})`);
  }
  return data;
};

/** Start a verification — Twilio sends the OTP to `phone` over SMS. */
export const startVerification = async (phone, channel = "sms") => {
  const data = await post("Verifications", { To: toE164(phone), Channel: channel });
  return { sid: data.sid, status: data.status };
};

/** Check the user-entered code. Returns true when Twilio marks it approved. */
export const checkVerification = async (phone, code) => {
  const data = await post("VerificationCheck", { To: toE164(phone), Code: String(code).trim() });
  return data.status === "approved";
};
