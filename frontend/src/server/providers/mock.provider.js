import { computeMissingFields, detectCategory } from "../utils/requirements.js";

const extractBudget = (text) => {
  const matches = [...text.matchAll(/(?:rs\.?|inr|₹)?\s*(\d{3,7})(?:\s*(?:-|to)\s*(\d{3,7}))?/gi)];
  if (!matches.length) return {};
  const first = matches[0];
  return {
    budgetMin: first[2] ? Number(first[1]) : undefined,
    budgetMax: Number(first[2] || first[1]),
  };
};

const extractLocation = (text) => {
  const match = text.match(/\b(?:in|near|around|at)\s+([a-zA-Z][a-zA-Z\s-]{2,40})/i);
  return match?.[1]?.replace(/\b(?:with|under|below|from|for)\b.*$/i, "").trim();
};

const extractAvailability = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes("immediate") || lower.includes("today")) return "immediate";
  if (lower.includes("next month")) return "next month";
  if (lower.includes("this week")) return "this week";
  return undefined;
};

export const analyzeWithMockProvider = async ({ message }) => {
  const text = message.trim();
  const lower = text.toLowerCase();
  const category = detectCategory(text);
  const requirements = {
    ...extractBudget(text),
    location: extractLocation(text),
    category,
    availability: extractAvailability(text),
    preferences: [],
    keywords: text
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 12),
    rawText: text,
  };

  const missingFields = computeMissingFields(requirements);

  let intent = "create_lead";
  if (["stop", "unsubscribe", "cancel"].some((word) => lower.includes(word))) intent = "stop";
  if (["found", "done", "got it"].some((word) => lower.includes(word))) intent = "found";
  if (["continue", "more", "next"].some((word) => lower.includes(word))) intent = "continue";

  return {
    intent,
    category,
    title: `${category[0].toUpperCase()}${category.slice(1)} request`,
    requirements,
    missingFields,
    confidence: 0.72,
  };
};
