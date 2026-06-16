import { normalizeFacebookMessages } from "./facebook.adapter.js";
import { normalizeInstagramMessages } from "./instagram.adapter.js";
import { normalizeWhatsAppMessages } from "./whatsapp.adapter.js";

export const normalizeMetaPayload = (payload) => {
  if (payload.object === "whatsapp_business_account") {
    return normalizeWhatsAppMessages(payload);
  }

  if (payload.object === "instagram") {
    return normalizeInstagramMessages(payload);
  }

  if (payload.object === "page") {
    return normalizeFacebookMessages(payload);
  }

  return [];
};
