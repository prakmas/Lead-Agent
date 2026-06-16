import Channel from "../models/Channel.js";
import Contact from "../models/Contact.js";
import Conversation from "../models/Conversation.js";
import FollowUp from "../models/FollowUp.js";
import Lead from "../models/Lead.js";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import { buildMatchReply } from "./aiAgent.service.js";
import { findMatchesForLead, scoreListingForLead } from "./matching.service.js";
import { sendMessage } from "./messaging.service.js";

// How long between automated follow-up checks per lead (default 24 h).
// Can be overridden per-call for testing (e.g. 1 min for demo).
const DEFAULT_FOLLOW_UP_DELAY_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Return the set of listing IDs already sent to a lead so we never repeat them.
const getSentListingIds = async (leadId) => {
  const sent = await Match.find({ lead: leadId, status: "sent" }).select("listing");
  return new Set(sent.map((m) => m.listing.toString()));
};

// Mark a batch of match documents as sent.
export const markMatchesSent = async (matches) => {
  const ids = matches.map((m) => m._id);
  if (ids.length) await Match.updateMany({ _id: { $in: ids } }, { status: "sent" });
};

// ─── Scheduling ──────────────────────────────────────────────────────────────

/**
 * Cancel any pending follow-ups for a lead and schedule a new one.
 * Pass delayMs to override the default interval (e.g. 60_000 for near-immediate).
 */
export const scheduleFollowUp = async ({
  lead,
  conversation,
  contact,
  delayMs = DEFAULT_FOLLOW_UP_DELAY_MS,
}) => {
  // Never schedule for stopped/closed conversations.
  if (!conversation || ["stopped", "closed"].includes(conversation.status)) return null;

  // Cancel any previously scheduled follow-ups for this lead so we don't pile up.
  await FollowUp.updateMany({ lead: lead._id, status: "scheduled" }, { status: "cancelled" });

  return FollowUp.create({
    lead: lead._id,
    conversation: conversation._id,
    contact: contact._id,
    channel: contact.channelType,
    scheduledAt: new Date(Date.now() + delayMs),
    status: "scheduled",
  });
};

// ─── Scheduler loop ───────────────────────────────────────────────────────────

/**
 * Called on a recurring interval (every 5 min in server.js).
 * Finds all due follow-ups, checks for NEW matches the lead hasn't seen yet,
 * and delivers them via the same channel the user originally messaged on.
 */
export const runFollowUpScheduler = async () => {
  const due = await FollowUp.find({
    status: "scheduled",
    scheduledAt: { $lte: new Date() },
  })
    .populate("lead")
    .populate("contact");

  if (!due.length) return;

  console.log(`[followup] ${due.length} due follow-up(s)`);

  for (const followUp of due) {
    try {
      const { lead, contact } = followUp;

      if (!lead || !contact) {
        followUp.status = "cancelled";
        await followUp.save();
        continue;
      }

      // Re-fetch conversation so we see the latest status.
      const conversation = await Conversation.findById(followUp.conversation);
      if (!conversation || ["stopped", "closed"].includes(conversation.status)) {
        followUp.status = "cancelled";
        await followUp.save();
        continue;
      }

      // Find matches the user has NOT yet received.
      const sentIds = await getSentListingIds(lead._id);
      const allMatches = await findMatchesForLead(lead, 10);
      const newMatches = allMatches.filter((m) => !sentIds.has(m.listing._id.toString()));

      // Mark this follow-up done regardless of whether we found new matches.
      followUp.status = "sent";
      await followUp.save();

      if (newMatches.length) {
        const reply = buildMatchReply(newMatches);

        const sendResult = await sendMessage({
          channel: followUp.channel,
          to: contact.externalId,
          text: reply,
        });

        // Persist the outbound message so the inbox reflects it.
        const channelDoc = await Channel.findById(conversation.channel);
        if (channelDoc) {
          await Message.create({
            channel: channelDoc._id,
            contact: contact._id,
            conversation: conversation._id,
            direction: "outbound",
            messageType: "text",
            text: reply,
            status: sendResult.ok === false ? "failed" : "sent",
            raw: { followUpId: followUp._id.toString(), ...sendResult },
          });
        }

        // Only mark matches as delivered if the send actually succeeded, so a
        // transient failure doesn't permanently hide them from the next run.
        if (sendResult.ok !== false) await markMatchesSent(newMatches);
      }

      // Always reschedule so we keep checking for future listings.
      await scheduleFollowUp({ lead, conversation, contact });
    } catch (err) {
      console.error(`[followup] error on ${followUp._id}:`, err.message);
      followUp.status = "failed";
      followUp.metadata = { ...followUp.metadata, error: err.message };
      await followUp.save();
    }
  }
};

// ─── New listing trigger ──────────────────────────────────────────────────────

/**
 * When the admin adds a new listing, find every active open lead that scores
 * against it and schedule a near-immediate follow-up (1 min) so the user gets
 * notified quickly rather than waiting up to 24 h.
 */
export const triggerRematchForNewListing = async (listing) => {
  const activeLeads = await Lead.find({
    status: { $in: ["New", "Contacted", "Qualified", "Matched"] },
  });

  let triggered = 0;

  for (const lead of activeLeads) {
    // Only notify if this listing is actually relevant to the lead.
    const { score } = scoreListingForLead(lead, listing);
    if (score === 0) continue;

    if (!lead.conversation) continue;
    const conversation = await Conversation.findById(lead.conversation);
    if (!conversation || ["stopped", "closed"].includes(conversation.status)) continue;

    const contact = await Contact.findById(conversation.contact);
    if (!contact) continue;

    await scheduleFollowUp({
      lead,
      conversation,
      contact,
      delayMs: 60 * 1000, // send within 1 minute
    });
    triggered++;
  }

  return triggered;
};
