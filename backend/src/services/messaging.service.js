import { sendFacebookMessage } from "../adapters/facebook.adapter.js";
import { sendInstagramMessage } from "../adapters/instagram.adapter.js";
import { sendWhatsAppMessage } from "../adapters/whatsapp.adapter.js";

// Send an outbound message on the given channel.
// Never throws — returns { ok: true, ... } on success or { ok: false, error }
// on failure, so a delivery problem (e.g. recipient not allow-listed) does not
// crash the inbound webhook and trigger Meta retries / duplicate leads.
export const sendMessage = async ({ channel, to, text }) => {
  try {
    let result;
    if (channel === "whatsapp") result = await sendWhatsAppMessage({ to, text });
    else if (channel === "instagram") result = await sendInstagramMessage({ to, text });
    else if (channel === "facebook") result = await sendFacebookMessage({ to, text });
    else throw new Error(`Unsupported channel: ${channel}`);

    return { ok: true, ...result };
  } catch (error) {
    console.error(`[messaging] ${channel} send to ${to} failed:`, error.message);
    return { ok: false, error: error.message };
  }
};
