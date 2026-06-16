import env from "../config/env.js";

export const analyzeWithClaude = async ({ message }) => {
  if (!env.ai.claudeApiKey) {
    throw new Error("CLAUDE_API_KEY is missing");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ai.claudeApiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.ai.claudeModel,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `Extract lead intent and requirements as JSON only: ${message}`,
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Claude request failed: ${await response.text()}`);

  const body = await response.json();
  return JSON.parse(body.content[0].text);
};
