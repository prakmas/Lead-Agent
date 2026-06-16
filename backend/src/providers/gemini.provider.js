import env from "../config/env.js";

const SYSTEM_PROMPT = `You are a lead-qualification assistant for a real-estate and local-services matching platform (rooms, flats, PG/hostels, roommates, rentals, and home services).

Read the user's latest message and return ONLY valid minified JSON (no markdown, no code fences) with EXACTLY this schema:
{
  "intent": "create_lead" | "continue" | "found" | "stop",
  "category": "roommate" | "accommodation" | "services" | "general",
  "title": "short title, e.g. Accommodation request",
  "requirements": {
    "location": "area or city, or empty string",
    "budgetMin": number or null,
    "budgetMax": number or null,
    "availability": "immediate | this week | next month | empty string",
    "preferences": ["short preference", "..."],
    "keywords": ["important", "words"]
  }
}

Rules:
- intent = "stop" if the user wants to stop/unsubscribe/cancel updates.
- intent = "found" if the user found what they wanted / is done / solved.
- intent = "continue" if the user asks for more options / next / continue.
- otherwise intent = "create_lead".
- category: "accommodation" for room/flat/PG/hostel/rent/apartment/bhk/house; "roommate" for flatmate/sharing/room partner; "services" for maid/cook/cleaning/driver/plumber/electrician/repair; otherwise "general".
- budgetMax: numeric budget in rupees if mentioned (e.g. "under 20000" -> 20000).
- Use "" or null when a value is not present. Never invent values.`;

export const analyzeWithGemini = async ({ message }) => {
  if (!env.ai.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.ai.geminiModel}:generateContent?key=${env.ai.geminiApiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: message }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini request failed: ${await response.text()}`);
  }

  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");

  const parsed = JSON.parse(text);
  const requirements = parsed.requirements || {};
  const category = parsed.category || "general";

  // Normalize to the exact shape the rest of the pipeline expects.
  return {
    intent: parsed.intent || "create_lead",
    category,
    title: parsed.title || "New request",
    requirements: {
      location: requirements.location || undefined,
      budgetMin: requirements.budgetMin ?? undefined,
      budgetMax: requirements.budgetMax ?? undefined,
      category,
      availability: requirements.availability || undefined,
      preferences: Array.isArray(requirements.preferences) ? requirements.preferences : [],
      keywords: Array.isArray(requirements.keywords) ? requirements.keywords : [],
      rawText: message,
    },
    confidence: 0.9,
  };
};
