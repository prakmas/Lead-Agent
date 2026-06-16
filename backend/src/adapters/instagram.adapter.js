import env from "../config/env.js";

const graphUrl = `https://graph.facebook.com/${env.meta.apiVersion}`;

export const normalizeInstagramMessages = (payload) => {
  const messages = [];

  for (const entry of payload.entry || []) {
    for (const event of entry.messaging || []) {
      if (!event.message || event.message.is_echo) continue;

      messages.push({
        channel: "instagram",
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

export const sendInstagramMessage = async ({ to, text }) => {
  if (!env.instagram.accessToken) {
    console.log("[instagram dry-run]", { to, text });
    return { dryRun: true };
  }

  const response = await fetch(`${graphUrl}/me/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.instagram.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: to },
      message: { text },
    }),
  });

  if (!response.ok) {
    throw new Error(`Instagram send failed: ${await response.text()}`);
  }

  return response.json();
};
