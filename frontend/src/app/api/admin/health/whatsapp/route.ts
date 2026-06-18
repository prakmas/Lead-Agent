import env from "@/server/config/env.js";
import { requireAuth } from "@/server/auth.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

// Turn a Meta Graph error code into a plain-language hint + the fix, so an
// expired/blocked WhatsApp token shows up in the dashboard instantly instead of
// silently failing every outbound reply.
const hintFor = (code: number) => {
  if (code === 190)
    return "Access token expired or revoked. Generate a permanent System User token (expiration: Never) in Meta Business Settings and update WHATSAPP_ACCESS_TOKEN on Railway.";
  if (code === 200 || code === 10 || code === 803)
    return "Token lacks permission or the app is restricted. Grant whatsapp_business_messaging + whatsapp_business_management to the System User, request Advanced Access, and complete business verification.";
  return "WhatsApp send will fail until this is resolved. Check the WhatsApp Business token and app status in Meta.";
};

// GET /api/admin/health/whatsapp — admin-only token liveness probe.
export const GET = route(async (request: Request) => {
  await requireAuth(request);

  const { phoneNumberId, accessToken } = env.whatsapp;
  const version = env.meta.apiVersion;

  // No credentials → adapter runs in dry-run mode; replies are not actually sent.
  if (!phoneNumberId || !accessToken) {
    return json({
      configured: false,
      ok: false,
      hint: "WhatsApp is not configured (dry-run mode) — replies are generated but not delivered. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${accessToken}` }, signal: controller.signal },
    );
    const data = await res.json();

    if (!res.ok) {
      const err = data?.error || {};
      const code = Number(err.code) || 0;
      return json({
        configured: true,
        ok: false,
        code,
        error: err.message || "WhatsApp API rejected the token",
        hint: hintFor(code),
      });
    }

    return json({
      configured: true,
      ok: true,
      phone: data.display_phone_number,
      name: data.verified_name,
      qualityRating: data.quality_rating,
    });
  } catch (error) {
    return json({
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : "Could not reach Meta Graph API",
      hint: "Could not reach Meta to verify the WhatsApp token. Check network/Meta status; retry shortly.",
    });
  } finally {
    clearTimeout(timeout);
  }
});
