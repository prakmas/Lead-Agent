import env from "../config/env.js";

const graphUrl = `https://graph.facebook.com/${env.meta.apiVersion}`;

export const normalizeWhatsAppMessages = (payload) => {
  const messages = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;

      const value = change.value || {};
      const phoneNumberId = value.metadata?.phone_number_id;

      for (const message of value.messages || []) {
        const contact = value.contacts?.find((item) => item.wa_id === message.from);

        messages.push({
          channel: "whatsapp",
          accountId: phoneNumberId,
          contactId: message.from,
          contactName: contact?.profile?.name,
          message: message.text?.body || "",
          messageType: message.type || "unknown",
          timestamp: new Date(Number(message.timestamp || Date.now() / 1000) * 1000),
          providerMessageId: message.id,
          metadata: { raw: message, value },
        });
      }
    }
  }

  return messages.filter((item) => item.message || item.messageType !== "text");
};

export const sendWhatsAppMessage = async ({ to, text }) => {
  if (!env.whatsapp.phoneNumberId || !env.whatsapp.accessToken) {
    console.log("[whatsapp dry-run]", { to, text });
    return { dryRun: true };
  }

  const response = await fetch(`${graphUrl}/${env.whatsapp.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsapp.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text },
    }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${await response.text()}`);
  }

  return response.json();
};
