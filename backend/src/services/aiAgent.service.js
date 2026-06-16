import env from "../config/env.js";
import { analyzeWithClaude } from "../providers/claude.provider.js";
import { analyzeWithGemini } from "../providers/gemini.provider.js";
import { analyzeWithMockProvider } from "../providers/mock.provider.js";
import { analyzeWithOpenAI } from "../providers/openai.provider.js";

export const analyzeRequirement = async ({ message, conversation }) => {
  const input = { message, conversation };

  // Try the configured AI provider; if it errors (quota, network, bad JSON),
  // fall back to the built-in mock extractor so the conversation never breaks.
  try {
    if (env.ai.provider === "openai") return await analyzeWithOpenAI(input);
    if (env.ai.provider === "claude") return await analyzeWithClaude(input);
    if (env.ai.provider === "gemini") return await analyzeWithGemini(input);
  } catch (error) {
    console.error(`[ai] ${env.ai.provider} failed, falling back to mock:`, error.message);
    return analyzeWithMockProvider(input);
  }

  return analyzeWithMockProvider(input);
};

export const buildFollowUpQuestion = (missingFields = []) => {
  if (missingFields.includes("location")) {
    return "Which location should I search in or near?";
  }

  if (missingFields.includes("budget")) {
    return "What budget range should I use for matching?";
  }

  if (missingFields.includes("category")) {
    return "What are you looking for: roommate, accommodation, rental, or a service?";
  }

  return "Can you share one or two more details so I can find better matches?";
};

export const buildMatchReply = (matches) => {
  if (!matches.length) {
    return "I saved your requirement. I do not have a strong match yet, but I will keep checking and follow up when I find one.";
  }

  const lines = matches.slice(0, 3).map((match, index) => {
    const listing = match.listing;
    const price = listing.priceLabel || (listing.budget ? `₹${listing.budget}` : "price on request");
    return `${index + 1}. ${listing.title} - ${listing.location || "location flexible"} - ${price} (${match.score}% match)`;
  });

  return `I found these matches:\n${lines.join("\n")}\n\nReply "continue" for more options, "found" if this is solved, or "stop" to end updates.`;
};
