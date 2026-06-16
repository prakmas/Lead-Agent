import env from "../config/env.js";

const graphUrl = `https://graph.facebook.com/${env.meta.apiVersion}`;

export const normalizeFacebookMessages = (payload) => {
  const messages = [];

  for (const entry of payload.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message || event.message.is_echo) continue;

      messages.push({
        channel: "facebook",
        accountId: entry.id,
        contactId: event.sender?.id,
        message: event.message.text || "",
        messageType: event.message.text ? "text" : "unknown",
        timestamp: new Date(event.timestamp || Date.now()),
        providerMessageId: event.message.mid,
        metadata: { raw: event },
      });
    }
  }

  return messages.filter((item) => item.contactId);
};

export const sendFacebookMessage = async ({ to, text }) => {
  if (!env.facebook.pageAccessToken) {
    console.log("[facebook dry-run]", { to, text });
    return { dryRun: true };
  }

  const response = await fetch(`${graphUrl}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.facebook.pageAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: to },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });

  if (!response.ok) {
    throw new Error(`Facebook send failed: ${await response.text()}`);
  }

  return response.json();
};
