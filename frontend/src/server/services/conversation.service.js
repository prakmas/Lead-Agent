import AuditLog from "../models/AuditLog.js";
import Channel from "../models/Channel.js";
import Contact from "../models/Contact.js";
import Conversation from "../models/Conversation.js";
import Lead from "../models/Lead.js";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import { analyzeRequirement, buildAck, buildFollowUpQuestion, buildMatchReply, buildWelcomeMenu } from "./aiAgent.service.js";
import { markMatchesSent, scheduleFollowUp } from "./followUp.service.js";
import { handleListingFlow } from "./listingFlow.service.js";
import { extractMarketplace } from "./listingExtractor.service.js";
import { handleMarketplaceSearch } from "./marketplaceSearch.service.js";
import { findMatchesForLead } from "./matching.service.js";
import { sendMessage } from "./messaging.service.js";
import {
  applyPendingAnswer,
  classifyConversationIntent,
  computeMissingFields,
  detectCategory,
  getPrimaryMissingField,
  SERVICE_MENU,
} from "../utils/requirements.js";

const channelName = {
  whatsapp: "WhatsApp Business",
  instagram: "Instagram DM",
  facebook: "Facebook Messenger",
};

// Quick-pick budget ranges (the numbered options shown in the budget question).
const BUDGET_PICKS = { 1: 10000, 2: 20000, 3: 35000, 4: 100000 };

// Resolve a 5-digit US ZIP code to its city/state via the free Zippopotam.us API
// — lets a customer type a short ZIP instead of spelling out a city.
const resolvePincode = async (pin) => {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${pin}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = await res.json();
    const place = body?.places?.[0];
    if (!place) return null;
    // district = city so it matches city-level listings.
    return { area: place["place name"], district: place["place name"], state: place["state abbreviation"], pincode: pin };
  } catch {
    return null;
  }
};

const mergeRequirements = (existing = {}, incoming = {}) => ({
  ...existing,
  ...Object.fromEntries(
    Object.entries(incoming).filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      return value !== undefined && value !== null && value !== "";
    }),
  ),
});

const getOrCreateChannel = async (message) => {
  const externalAccountId = message.accountId || `${message.channel}-default`;
  return Channel.findOneAndUpdate(
    { type: message.channel, externalAccountId },
    { type: message.channel, externalAccountId, name: channelName[message.channel], status: "active" },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
};

const getOrCreateContact = async (message, channel) =>
  Contact.findOneAndUpdate(
    { channelType: message.channel, externalId: message.contactId },
    {
      channel: channel._id,
      channelType: message.channel,
      externalId: message.contactId,
      name: message.contactName,
      phone: message.channel === "whatsapp" ? message.contactId : undefined,
      lastSeenAt: message.timestamp || new Date(),
      profile: message.metadata?.profile || {},
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

const getOrCreateConversation = async (message, channel, contact) => {
  const conversation =
    (await Conversation.findOne({
      channel: channel._id,
      contact: contact._id,
      status: { $in: ["open", "waiting", "matched"] },
    })) ||
    (await Conversation.create({ channel: channel._id, contact: contact._id, status: "open" }));

  conversation.lastMessage = message.message;
  conversation.lastMessageAt = message.timestamp || new Date();
  conversation.unreadCount += 1;
  await conversation.save();
  return conversation;
};

const saveInboundMessage = (message, channel, contact, conversation) =>
  Message.create({
    channel: channel._id,
    contact: contact._id,
    conversation: conversation._id,
    direction: "inbound",
    messageType: message.messageType || "text",
    text: message.message,
    providerMessageId: message.providerMessageId,
    raw: message.metadata?.raw || message.metadata || {},
    metadata: message.metadata || {},
  });

const saveOutboundMessage = (text, channel, contact, conversation, sendResult) =>
  Message.create({
    channel: channel._id,
    contact: contact._id,
    conversation: conversation._id,
    direction: "outbound",
    messageType: "text",
    text,
    status: sendResult?.ok === false ? "failed" : "sent",
    raw: sendResult || {},
  });

// ─── Command handlers ─────────────────────────────────────────────────────────

const handleStopOrFound = async ({ analysis, lead, conversation }) => {
  if (analysis.intent === "stop") {
    if (lead) { lead.status = "Closed"; await lead.save(); }
    conversation.status = "stopped";
    await conversation.save();
    return "No problem — I've stopped updates for this request. Message me anytime to start again.";
  }

  if (analysis.intent === "found") {
    if (lead) { lead.status = "Closed"; await lead.save(); }
    conversation.status = "closed";
    await conversation.save();
    return "Great! I've marked your request as closed. Happy to help again whenever you need.";
  }

  return null;
};

// "continue" → send the next batch of matches the user hasn't seen yet.
const handleContinue = async ({ lead }) => {
  if (!lead) return null;

  const sentIds = new Set(
    (await Match.find({ lead: lead._id, status: "sent" }).select("listing"))
      .map((m) => m.listing.toString()),
  );

  const allMatches = await findMatchesForLead(lead, 10);
  return allMatches.filter((m) => !sentIds.has(m.listing._id.toString()));
};

// ─── Main entry point ─────────────────────────────────────────────────────────

export const processInboundMessage = async (commonMessage) => {
  const channel = await getOrCreateChannel(commonMessage);
  const contact = await getOrCreateContact(commonMessage, channel);
  const conversation = await getOrCreateConversation(commonMessage, channel, contact);
  await saveInboundMessage(commonMessage, channel, contact, conversation);

  // Bot can be switched off per-conversation from the admin Inbox. When off, we
  // still record the inbound message (so the admin sees it) but do NOT auto-reply
  // — a human replies manually instead.
  if (conversation.metadata?.botEnabled === false) {
    return { conversation, lead: conversation.lead || null, reply: null, matches: [], botSkipped: true };
  }

  // Guided menu: if we just showed the numbered service menu, map a numeric pick
  // (e.g. "4") to its category so it flows into a fresh search.
  if (conversation.metadata?.flowStage === "menu") {
    const m = commonMessage.message.trim().match(/^([1-9])$/);
    if (m && SERVICE_MENU[Number(m[1]) - 1]) {
      commonMessage = { ...commonMessage, message: SERVICE_MENU[Number(m[1]) - 1].key };
    }
    conversation.metadata = { ...conversation.metadata, flowStage: null };
    conversation.markModified("metadata");
  }

  // A standalone 6-digit number = an Indian pincode. Resolve it to its area so a
  // searcher can type "560034" instead of spelling "Koramangala". BUT when we're
  // collecting a listing we need the raw pincode (the create flow stores it), so
  // skip the rewrite mid-listing.
  if (/^\d{5}$/.test(commonMessage.message.trim()) && conversation.metadata?.flowStage !== "listing") {
    const resolved = await resolvePincode(commonMessage.message.trim());
    // Use the district (e.g. "Hyderabad") rather than the hyper-local post-office
    // name (e.g. "Cyberabad") so it reliably matches city-level listings.
    const place = resolved?.district || resolved?.area;
    if (place) {
      commonMessage = { ...commonMessage, message: place };
    }
  }

  // ── Conversation flow: greet / thank / hand off BEFORE any lead or search ────
  // This is what makes the bot feel human — "hi" gets a welcome, not 5 listings.
  const convIntent = classifyConversationIntent(commonMessage.message);

  // Human handoff: stop auto-replies for this chat so a person can take over.
  if (convIntent === "handoff") {
    conversation.metadata = { ...conversation.metadata, botEnabled: false, handoffRequested: true };
    conversation.markModified("metadata");
    const reply =
      "Sure — I'll have a team member reach out to you shortly. 🙌\n" +
      "Meanwhile, feel free to share what you're looking for (type, location and budget) so we can help you faster.";
    conversation.status = "open";
    conversation.lastMessage = reply;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    const sendResult = await sendMessage({ channel: commonMessage.channel, to: commonMessage.contactId, text: reply });
    await saveOutboundMessage(reply, channel, contact, conversation, sendResult);
    return { conversation, lead: conversation.lead || null, reply, matches: [], intent: "handoff" };
  }

  // Greeting / thanks — only when we're NOT mid-question (so a one-word answer to
  // "Which location?" isn't mistaken for small talk).
  if (conversation.status !== "waiting" && (convIntent === "greeting" || convIntent === "end")) {
    let reply;
    if (convIntent === "greeting") {
      reply = buildWelcomeMenu();
      conversation.metadata = { ...conversation.metadata, flowStage: null };
      conversation.markModified("metadata");
    } else {
      reply = "You're welcome! 😊 Whenever you need a place, a roommate, or a service, just message me here. Have a great day!";
    }
    conversation.lastMessage = reply;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    const sendResult = await sendMessage({ channel: commonMessage.channel, to: commonMessage.contactId, text: reply });
    await saveOutboundMessage(reply, channel, contact, conversation, sendResult);
    return { conversation, lead: conversation.lead || null, reply, matches: [], intent: convIntent };
  }

  // Explicit "done" — the user finished. Reset ALL flow state so the next request
  // starts completely fresh and never carries over a previous listing/search.
  if (/^(done|i'?m done|all done|that'?s all|that'?s it|finished|finish|nothing else|nothing more|no more|all set|that is all)\s*[.!]?$/i.test(commonMessage.message.trim())) {
    conversation.metadata = { ...conversation.metadata, market: null, search: null, flowStage: null };
    conversation.markModified("metadata");
    const reply = "👍 All done! Whenever you want to *list* something or *find* something, just message me. Have a great day! 😊";
    conversation.status = "open";
    conversation.lastMessage = reply;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    const sendResult = await sendMessage({ channel: commonMessage.channel, to: commonMessage.contactId, text: reply });
    await saveOutboundMessage(reply, channel, contact, conversation, sendResult);
    return { conversation, lead: conversation.lead || null, reply, matches: [], intent: "done" };
  }

  // ── Marketplace agent (AI-driven) — handles BOTH listing and searching ──────
  // Mid-flow continues the active flow; otherwise the AI classifies the intent
  // (list vs find vs unclear) so any phrasing works ("buy"/"purchase"/"need"…).
  {
    const stage = conversation.metadata?.flowStage;
    const preEx = await extractMarketplace(commonMessage.message);
    // Mid-flow, only switch sell<->buy when the user EXPLICITLY names what they want
    // (an intent phrase AND a real item word). A plain answer like "I want 4000" or
    // "I am looking for 3000" (a price) has no item word, so it stays in the flow.
    // Outside a flow, use the AI classification.
    const msg = commonMessage.message.toLowerCase();
    const hasItem =
      /\b(car|cars|truck|suv|van|jeep|sedan|coupe|bike|motorcycle|scooter|boat|rv|house|home|apartment|apartments|condo|townhouse|studio|flat|room|roommate|plot|land|property|plumber|electrician|carpenter|painter|mechanic|tutor|tutoring|cleaner|cleaning|maid|handyman|mover|moving|landscaper|landscaping|hvac|babysitter|nanny|salon|roofer|roofing)\b/.test(msg);
    const wantsBuy = hasItem && /\b(looking for|want to buy|wanna buy|want to purchase|going to buy|need to buy|buy a|buy an|purchase a|need a|need an|searching for|search for|find me|show me|interested in)\b/.test(msg);
    const wantsSell = hasItem && /\b(sell my|i want to sell|wanna sell|want to sell|rent out|rent my|list my|post my|i'?m a |i am a |i provide|i offer|i run)\b/.test(msg);
    let route;
    if (stage === "listing") route = wantsBuy ? "search" : "create";
    else if (stage === "search") route = wantsSell ? "create" : "search";
    else route = preEx.intent === "CREATE_LISTING" ? "create" : preEx.intent === "SEARCH_LISTING" ? "search" : "unknown";

    // If they switched flows mid-way, clear the abandoned flow's collected state.
    if (stage === "listing" && route !== "create") conversation.metadata = { ...conversation.metadata, market: null };
    if (stage === "search" && route !== "search") conversation.metadata = { ...conversation.metadata, search: null };

    let reply;
    if (route === "create") reply = await handleListingFlow({ message: commonMessage.message, conversation, contact, preExtracted: preEx });
    else if (route === "search") reply = await handleMarketplaceSearch({ message: commonMessage.message, conversation, contact, preExtracted: preEx });
    else
      reply =
        "I can help two ways 👇\n\n🛒 *List* something to sell or rent — e.g. \"sell my car\" or \"rent my flat\"\n🔎 *Find* something you need — e.g. \"looking for a car\" or \"need a plumber\"\n\nWhat would you like to do?";

    conversation.lastMessage = reply;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    const sendResult = await sendMessage({ channel: commonMessage.channel, to: commonMessage.contactId, text: reply });
    await saveOutboundMessage(reply, channel, contact, conversation, sendResult);
    return { conversation, lead: conversation.lead || null, reply, matches: [], intent: route };
  }

  // (legacy real-estate pipeline below is no longer reached for the marketplace MVP)
  // Customer picked an option ("1", "2"…) after seeing matches — treat it as
  // interest and offer to connect them, instead of re-running the search.
  if (conversation.status === "matched" && /^[1-9]$/.test(commonMessage.message.trim())) {
    const reply =
      `Great choice! 👍 I've noted your interest in option ${commonMessage.message.trim()}.\n` +
      `Our team will share more details and reach out to you shortly. 🙌\n\n` +
      `Would you like to see more options too? Reply "more" anytime.`;
    conversation.lastMessage = reply;
    conversation.lastMessageAt = new Date();
    await conversation.save();
    const sendResult = await sendMessage({ channel: commonMessage.channel, to: commonMessage.contactId, text: reply });
    await saveOutboundMessage(reply, channel, contact, conversation, sendResult);
    return { conversation, lead: conversation.lead || null, reply, matches: [], intent: "select" };
  }

  const analysis = await analyzeRequirement({ message: commonMessage.message, conversation });

  let lead = conversation.lead ? await Lead.findById(conversation.lead) : null;

  // ── stop / found ────────────────────────────────────────────────────────────
  const commandReply = await handleStopOrFound({ analysis, lead, conversation });
  if (commandReply) {
    const sendResult = await sendMessage({ channel: commonMessage.channel, to: commonMessage.contactId, text: commandReply });
    await saveOutboundMessage(commandReply, channel, contact, conversation, sendResult);
    return { conversation, lead, reply: commandReply, matches: [] };
  }

  // ── continue ─────────────────────────────────────────────────────────────────
  if (analysis.intent === "continue" && lead) {
    const moreMatches = await handleContinue({ lead });
    const reply = buildMatchReply(moreMatches, lead.requirements);
    const sendResult = await sendMessage({ channel: commonMessage.channel, to: commonMessage.contactId, text: reply });
    await saveOutboundMessage(reply, channel, contact, conversation, sendResult);
    if (moreMatches.length) await markMatchesSent(moreMatches);
    return { conversation, lead, reply, matches: moreMatches };
  }

  // ── create / update lead ──────────────────────────────────────────────────────

  // Snapshot what we knew before, to acknowledge newly captured details.
  // (Read fields explicitly — spreading a Mongoose subdoc doesn't copy paths.)
  const leadExisted = !!lead;
  const hadLocation = !!lead?.requirements?.location;
  const hadCategory = !!(lead?.requirements?.category && lead.requirements.category !== "general");
  const hadBudget = !!lead?.requirements?.budgetMax;

  // Which field did we last ask about? (hint for routing one-word place names.)
  let awaitingField = lead?.metadata?.awaitingField || null;
  if (!awaitingField && lead && conversation.status === "waiting" && lead.missingFields?.length) {
    awaitingField = getPrimaryMissingField(lead.missingFields);
  }
  // Budget quick-pick: if we asked for budget and they tapped 1–4, map it to a
  // range so they don't have to type an amount.
  const trimmedMsg = commonMessage.message.trim();
  if (awaitingField === "budget" && /^[1-4]$/.test(trimmedMsg)) {
    analysis.requirements = analysis.requirements || {};
    if (!analysis.requirements.budgetMax) analysis.requirements.budgetMax = BUDGET_PICKS[trimmedMsg];
  }

  // Route the message content into the right slots (handles bare "Nellore",
  // "Flat", "12000" — even after a greeting, and even if we asked a different
  // question). Only fills empty fields.
  analysis.requirements = applyPendingAnswer(
    awaitingField,
    commonMessage.message,
    analysis.requirements,
  );

  // Don't let a vague "general" category overwrite a category we already know.
  if (analysis.requirements?.category === "general") {
    delete analysis.requirements.category;
  }

  // New-search detection: if the customer names a DIFFERENT category than the
  // current lead (e.g. switches from "rent a flat" to "roommate"), treat it as a
  // fresh request — drop the old location/budget so we ask again instead of
  // silently reusing the previous Nellore/₹12000.
  const incomingCategory = analysis.requirements?.category;
  // Use the DETERMINISTIC keyword detector on the raw message (not the AI's
  // guess) so a bare location like "Hyderabad" isn't mistaken for a category
  // change and doesn't trigger a spurious reset.
  const explicitCategory = detectCategory(commonMessage.message);
  const thisMsgHasLocation = !!analysis.requirements?.location;
  const thisMsgHasBudget = !!analysis.requirements?.budgetMax;
  const isNewSearch =
    leadExisted &&
    explicitCategory &&
    explicitCategory !== "general" &&
    // (a) they named a different service than before, OR
    ((lead.category && lead.category !== "general" && explicitCategory !== lead.category) ||
      // (b) they re-stated a service (with no new location/budget) after results
      //     were already shown — i.e. they're starting over.
      (!thisMsgHasLocation && !thisMsgHasBudget && conversation.status === "matched"));

  if (!lead) {
    lead = await Lead.create({
      contact: contact._id,
      conversation: conversation._id,
      channel: commonMessage.channel,
      title: analysis.title,
      intent: analysis.intent,
      category: analysis.requirements?.category,
      requirements: analysis.requirements,
      missingFields: computeMissingFields(analysis.requirements),
      status: "New",
    });
    conversation.lead = lead._id;
  } else if (isNewSearch) {
    // Fresh requirement — keep only what this message actually provided.
    lead.title = analysis.title || lead.title;
    lead.intent = analysis.intent || lead.intent;
    lead.requirements = { ...analysis.requirements, category: explicitCategory };
    lead.category = explicitCategory;
    lead.metadata = { ...lead.metadata, awaitingField: null };
    lead.markModified("requirements");
    lead.markModified("metadata");
  } else {
    lead.title = analysis.title || lead.title;
    lead.intent = analysis.intent || lead.intent;
    lead.requirements = mergeRequirements(lead.requirements, analysis.requirements);
    lead.category = lead.requirements.category || lead.category;
  }

  // Recompute missing fields from the ACCUMULATED requirements so answers given
  // across multiple turns are all counted.
  lead.missingFields = computeMissingFields(lead.requirements);
  lead.status = lead.missingFields.length ? "Contacted" : "Qualified";

  // Acknowledge a newly captured detail (only mid-conversation, not first msg).
  const categoryLabel = {
    flat: "flat", pg: "PG", room: "room", roommate: "roommate", house: "house",
    hotel: "hotel", supermarket: "supermarket", rental: "space", service: "service",
    services: "service", accommodation: "place",
  };
  let ack = "";
  if (isNewSearch) {
    ack = `Sure — let's find you a ${categoryLabel[explicitCategory] || "match"}! 😊`;
  } else if (leadExisted) {
    if (!hadLocation && lead.requirements.location) {
      ack = buildAck("location", lead.requirements.location);
    } else if (!hadCategory && lead.requirements.category && lead.requirements.category !== "general") {
      ack = buildAck("category", lead.requirements.category);
    } else if (!hadBudget && lead.requirements.budgetMax) {
      ack = buildAck("budget", lead.requirements.budgetMax);
    }
  }

  // If they answered the location question with a number we couldn't resolve
  // (e.g. an invalid or mistyped pincode), gently tell them the correct format.
  if (
    awaitingField === "location" &&
    !lead.requirements.location &&
    /^\d{3,}$/.test(commonMessage.message.trim())
  ) {
    ack = "Hmm, that doesn't look like a valid area or 6-digit pincode 🤔";
  }

  // ── reply branch ──────────────────────────────────────────────────────────────
  let reply;
  let matches = [];

  if (lead.missingFields.length) {
    // Still gathering requirements — ask for the next missing piece and
    // remember which field we asked about for the next turn.
    conversation.status = "waiting";
    lead.metadata = { ...lead.metadata, awaitingField: getPrimaryMissingField(lead.missingFields) };
    lead.markModified("metadata"); // Mixed type — must flag so it persists.
    reply = buildFollowUpQuestion(lead.missingFields, ack);
  } else {
    lead.metadata = { ...lead.metadata, awaitingField: null };
    lead.markModified("metadata");
    // Requirements complete — run matching.
    matches = await findMatchesForLead(lead);
    lead.status = matches.length ? "Matched" : "Qualified";
    lead.lastMatchedAt = new Date();
    conversation.status = matches.length ? "matched" : "open";
    reply = buildMatchReply(matches, lead.requirements);

    // Mark the matches we're about to send so follow-up won't repeat them.
    if (matches.length) await markMatchesSent(matches);

    // Schedule a follow-up to check for new listings later (24 h default).
    await scheduleFollowUp({ lead, conversation, contact });
  }

  await lead.save();
  conversation.lastMessage = reply;
  conversation.lastMessageAt = new Date();
  await conversation.save();

  const sendResult = await sendMessage({ channel: commonMessage.channel, to: commonMessage.contactId, text: reply });
  await saveOutboundMessage(reply, channel, contact, conversation, sendResult);

  await AuditLog.create({
    actorType: "system",
    action: "message.processed",
    entityType: "conversation",
    entityId: conversation._id,
    metadata: {
      channel: commonMessage.channel,
      contactId: commonMessage.contactId,
      leadId: lead._id,
      matches: matches.length,
    },
  });

  return { conversation, lead, reply, matches };
};
