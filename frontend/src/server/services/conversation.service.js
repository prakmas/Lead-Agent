import AuditLog from "../models/AuditLog.js";
import Channel from "../models/Channel.js";
import Contact from "../models/Contact.js";
import Conversation from "../models/Conversation.js";
import Lead from "../models/Lead.js";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import { analyzeRequirement, buildFollowUpQuestion, buildMatchReply } from "./aiAgent.service.js";
import { markMatchesSent, scheduleFollowUp } from "./followUp.service.js";
import { findMatchesForLead } from "./matching.service.js";
import { sendMessage } from "./messaging.service.js";
import {
  applyPendingAnswer,
  computeMissingFields,
  getPrimaryMissingField,
} from "../utils/requirements.js";

const channelName = {
  whatsapp: "WhatsApp Business",
  instagram: "Instagram DM",
  facebook: "Facebook Messenger",
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
    const reply = buildMatchReply(moreMatches);
    const sendResult = await sendMessage({ channel: commonMessage.channel, to: commonMessage.contactId, text: reply });
    await saveOutboundMessage(reply, channel, contact, conversation, sendResult);
    if (moreMatches.length) await markMatchesSent(moreMatches);
    return { conversation, lead, reply, matches: moreMatches };
  }

  // ── create / update lead ──────────────────────────────────────────────────────

  // If we asked a follow-up question last turn, interpret this reply as its
  // answer (e.g. a bare "Nellore" answering "which location?").
  let awaitingField = lead?.metadata?.awaitingField || null;
  // Fallback for conversations that were already waiting before awaitingField
  // was tracked: derive it from the lead's current missing fields.
  if (!awaitingField && lead && conversation.status === "waiting" && lead.missingFields?.length) {
    awaitingField = getPrimaryMissingField(lead.missingFields);
  }
  if (awaitingField) {
    analysis.requirements = applyPendingAnswer(
      awaitingField,
      commonMessage.message,
      analysis.requirements,
    );
  }

  // Don't let a vague "general" category overwrite a category we already know.
  if (analysis.requirements?.category === "general") {
    delete analysis.requirements.category;
  }

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

  // ── reply branch ──────────────────────────────────────────────────────────────
  let reply;
  let matches = [];

  if (lead.missingFields.length) {
    // Still gathering requirements — ask for the next missing piece and
    // remember which field we asked about for the next turn.
    conversation.status = "waiting";
    lead.metadata = { ...lead.metadata, awaitingField: getPrimaryMissingField(lead.missingFields) };
    reply = buildFollowUpQuestion(lead.missingFields);
  } else {
    lead.metadata = { ...lead.metadata, awaitingField: null };
    // Requirements complete — run matching.
    matches = await findMatchesForLead(lead);
    lead.status = matches.length ? "Matched" : "Qualified";
    lead.lastMatchedAt = new Date();
    conversation.status = matches.length ? "matched" : "open";
    reply = buildMatchReply(matches);

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
