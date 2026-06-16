import env from "../config/env.js";

export const analyzeWithOpenAI = async ({ message }) => {
  if (!env.ai.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.ai.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.ai.openaiModel,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract lead intent and requirements. Return JSON with intent, category, title, requirements, missingFields, confidence.",
        },
        { role: "user", content: message },
      ],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI request failed: ${await response.text()}`);

  const body = await response.json();
  return JSON.parse(body.choices[0].message.content);
};
