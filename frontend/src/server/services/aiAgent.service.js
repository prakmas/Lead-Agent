import env from "../config/env.js";
import { analyzeWithClaude } from "../providers/claude.provider.js";
import { analyzeWithGemini } from "../providers/gemini.provider.js";
import { analyzeWithMockProvider } from "../providers/mock.provider.js";
import { analyzeWithOpenAI } from "../providers/openai.provider.js";
import { SERVICE_MENU } from "../utils/requirements.js";

const NUMBER_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

// Friendly welcome + a numbered menu of services the customer can pick from.
export const buildWelcomeMenu = () => {
  return (
    "Hi! 👋 Welcome. I can help you two ways:\n\n" +
    "🛒 *List* something to sell or rent — just tell me, e.g.\n" +
    '   "sell my car for 4 lakhs" · "rent my flat for 12000"\n\n' +
    "🔎 *Find* something you need — e.g.\n" +
    '   "looking for a car in Hyderabad" · "need a plumber in Kukatpally"\n\n' +
    "What would you like to do? 🙂"
  );
};

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

// Ask for the next missing detail in a warm, human way. `ack` is an optional
// short acknowledgement of what the customer just told us ("Got it, Nellore 👍").
// IMPORTANT: the order here (location → budget → category) must match
// getPrimaryMissingField so a one-word reply fills the field we actually asked.
export const buildFollowUpQuestion = (missingFields = [], ack = "") => {
  const prefix = ack ? `${ack} ` : "";

  if (missingFields.includes("location")) {
    return `${prefix}Which area should I search in? 📍\nYou can just send the *area name* or a *6-digit pincode* — e.g. "Koramangala" or "560034".`;
  }
  if (missingFields.includes("budget")) {
    return (
      `${prefix}What's your budget? 💰 Reply with a number:\n` +
      "1️⃣  Under 10,000\n2️⃣  10,000 – 20,000\n3️⃣  20,000 – 35,000\n4️⃣  Above 35,000\n\nOr just type an amount (e.g. 18000)."
    );
  }
  if (missingFields.includes("category")) {
    return `${prefix}What are you looking for — a place to rent (flat / PG / room), a roommate to share with, or a service? 🏠`;
  }
  return `${prefix}Could you share one or two more details so I can find the best matches for you?`;
};

// Friendly acknowledgement of a value the customer just gave.
export const buildAck = (field, value) => {
  if (!value) return "";
  if (field === "location") return `Great — ${value} it is! 👍`;
  if (field === "budget") return `Perfect, noted your budget. 👍`;
  if (field === "category") return `Got it. 👍`;
  return "Got it. 👍";
};

export const buildMatchReply = (matches, requirements = {}) => {
  const where = requirements.location ? ` in ${requirements.location}` : "";

  if (!matches.length) {
    const contactLine = env.businessContact
      ? `\n📞 Want help faster? Call or WhatsApp our team at *${env.businessContact}* and we'll find it for you.\n`
      : `\n📞 Reply "call me" and our team will reach out to help you personally.\n`;
    return (
      `Thanks! I've saved your requirement${where}. 📝\n` +
      `I couldn't find an exact match right now — no worries, this happens. 🙂\n\n` +
      `Here's what I can do:\n` +
      `• I'll keep searching and message you the moment something fits 🔔\n` +
      `• Or reply with a *nearby area* / *higher budget* and I'll look again right away\n` +
      contactLine +
      `\nReply "stop" anytime to pause updates.`
    );
  }

  const lines = matches.slice(0, 3).map((match, index) => {
    const l = match.listing;
    const price = l.priceLabel || (l.budget ? `₹${l.budget.toLocaleString("en-IN")}` : "price on request");
    let s = `${index + 1}. *${l.title}*\n   📍 ${l.location || "location flexible"}  •  ${price}  •  ${match.score}% match`;
    if (l.contactPhone) s += `\n   📞 Contact: ${l.contactName ? l.contactName + " — " : ""}${l.contactPhone}`;
    if (l.geo?.lat && l.geo?.lng) s += `\n   🗺️ Map: https://maps.google.com/?q=${l.geo.lat},${l.geo.lng}`;
    return s;
  });

  return (
    `Here are the top matches${where} I found for you: 🏠\n\n` +
    `${lines.join("\n\n")}\n\n` +
    `Reply with a number (e.g. "1") to know more, "more" for other options, "found" if you're sorted, or "stop" to pause updates.`
  );
};
