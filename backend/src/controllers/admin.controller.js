import Channel from "../models/Channel.js";
import Conversation from "../models/Conversation.js";
import FollowUp from "../models/FollowUp.js";
import Lead from "../models/Lead.js";
import Listing from "../models/Listing.js";
import Match from "../models/Match.js";
import Message from "../models/Message.js";
import { triggerRematchForNewListing } from "../services/followUp.service.js";
import { findMatchesForLead } from "../services/matching.service.js";
import createHttpError from "../utils/createHttpError.js";
import { leadStatuses } from "../utils/leadStatus.js";

const parseListQuery = (req) => ({
  limit: Math.min(Number(req.query.limit || 25), 100),
  page: Math.max(Number(req.query.page || 1), 1),
  search: req.query.search?.toString().trim(),
});

const paginate = async (modelQuery, countQuery, { limit, page }) => {
  const [data, total] = await Promise.all([
    modelQuery.skip((page - 1) * limit).limit(limit),
    countQuery,
  ]);
  return { data, total, page, limit, pages: Math.ceil(total / limit) || 1 };
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDashboardStats = async (_req, res) => {
  const [
    totalLeads,
    openConversations,
    totalListings,
    totalMatches,
    leadsByStatus,
    channels,
    conversationsByStatus,
    scheduledFollowUps,
  ] = await Promise.all([
    Lead.countDocuments(),
    Conversation.countDocuments({ status: { $in: ["open", "waiting", "matched"] } }),
    Listing.countDocuments(),
    Match.countDocuments(),
    Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ContactStatsByChannel(),
    Conversation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    FollowUp.countDocuments({ status: "scheduled" }),
  ]);

  res.json({
    totals: {
      leads: totalLeads,
      conversations: openConversations,
      listings: totalListings,
      matches: totalMatches,
      scheduledFollowUps,
    },
    leadsByStatus,
    channels,
    conversationsByStatus,
  });
};

const ContactStatsByChannel = () =>
  Channel.aggregate([
    {
      $lookup: {
        from: "contacts",
        localField: "_id",
        foreignField: "channel",
        as: "contacts",
      },
    },
    {
      $project: { type: 1, name: 1, status: 1, contacts: { $size: "$contacts" } },
    },
  ]);

// ─── Leads ────────────────────────────────────────────────────────────────────

export const listLeads = async (req, res) => {
  const options = parseListQuery(req);
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.channel) query.channel = req.query.channel;
  if (options.search) query.$text = { $search: options.search };

  const result = await paginate(
    Lead.find(query).populate("contact").sort({ createdAt: -1 }),
    Lead.countDocuments(query),
    options,
  );
  res.json(result);
};

export const createLead = async (req, res) => {
  const { title, category, channel = "manual", status = "New", requirements = {} } = req.body;
  if (!title || !category) throw createHttpError(400, "Title and category are required");
  if (!leadStatuses.includes(status)) throw createHttpError(400, "Invalid lead status");

  const lead = await Lead.create({ title, category, channel, status, requirements });
  res.status(201).json(lead);
};

export const updateLead = async (req, res) => {
  if (req.body.status && !leadStatuses.includes(req.body.status)) {
    throw createHttpError(400, "Invalid lead status");
  }
  const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("contact");
  if (!lead) throw createHttpError(404, "Lead not found");
  res.json(lead);
};

export const deleteLead = async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) throw createHttpError(404, "Lead not found");
  res.json({ message: "Lead deleted" });
};

// ─── Conversations ────────────────────────────────────────────────────────────

export const listConversations = async (req, res) => {
  const options = parseListQuery(req);
  const query = {};
  if (req.query.status) query.status = req.query.status;

  const result = await paginate(
    Conversation.find(query)
      .populate("channel")
      .populate("contact")
      .populate("lead")
      .sort({ lastMessageAt: -1, updatedAt: -1 }),
    Conversation.countDocuments(query),
    options,
  );
  res.json(result);
};

export const getConversationMessages = async (req, res) => {
  const messages = await Message.find({ conversation: req.params.id })
    .sort({ createdAt: 1 })
    .populate("channel")
    .populate("contact");
  res.json({ data: messages });
};

export const searchMessages = async (req, res) => {
  const options = parseListQuery(req);
  const query = options.search ? { $text: { $search: options.search } } : {};

  const result = await paginate(
    Message.find(query).populate("conversation").populate("contact").sort({ createdAt: -1 }),
    Message.countDocuments(query),
    options,
  );
  res.json(result);
};

// ─── Listings ─────────────────────────────────────────────────────────────────

export const listListings = async (req, res) => {
  const options = parseListQuery(req);
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.category) query.category = new RegExp(req.query.category, "i");
  if (options.search) query.$text = { $search: options.search };

  const result = await paginate(
    Listing.find(query).sort({ createdAt: -1 }),
    Listing.countDocuments(query),
    options,
  );
  res.json(result);
};

export const createListing = async (req, res) => {
  const { title, category } = req.body;
  if (!title || !category) throw createHttpError(400, "Title and category are required");

  const listing = await Listing.create(req.body);

  // Kick off near-immediate follow-ups for any active leads this listing matches.
  // Run in the background so the HTTP response returns immediately.
  triggerRematchForNewListing(listing)
    .then((count) => {
      if (count > 0) console.log(`[rematch] new listing triggered ${count} follow-up(s)`);
    })
    .catch((err) => console.error("[rematch]", err.message));

  res.status(201).json(listing);
};

export const updateListing = async (req, res) => {
  const listing = await Listing.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!listing) throw createHttpError(404, "Listing not found");
  res.json(listing);
};

export const deleteListing = async (req, res) => {
  const listing = await Listing.findByIdAndDelete(req.params.id);
  if (!listing) throw createHttpError(404, "Listing not found");
  res.json({ message: "Listing deleted" });
};

export const matchListing = async (req, res) => {
  const lead = await Lead.findById(req.body.leadId);
  if (!lead) throw createHttpError(404, "Lead not found");
  const matches = await findMatchesForLead(lead, Number(req.body.limit || 5));
  res.json({ data: matches });
};

// ─── Matches ──────────────────────────────────────────────────────────────────

export const listMatches = async (req, res) => {
  const options = parseListQuery(req);
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.leadId) query.lead = req.query.leadId;

  const result = await paginate(
    Match.find(query).populate("lead").populate("listing").sort({ score: -1, createdAt: -1 }),
    Match.countDocuments(query),
    options,
  );
  res.json(result);
};

// ─── Channels ─────────────────────────────────────────────────────────────────

export const listChannels = async (_req, res) => {
  const channels = await Channel.find().sort({ type: 1 });
  res.json({ data: channels });
};

// ─── Follow-ups ───────────────────────────────────────────────────────────────

export const listFollowUps = async (req, res) => {
  const options = parseListQuery(req);
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.leadId) query.lead = req.query.leadId;

  const result = await paginate(
    FollowUp.find(query)
      .populate("lead")
      .populate("contact")
      .sort({ scheduledAt: 1 }),
    FollowUp.countDocuments(query),
    options,
  );
  res.json(result);
};

export const cancelFollowUp = async (req, res) => {
  const followUp = await FollowUp.findById(req.params.id);
  if (!followUp) throw createHttpError(404, "Follow-up not found");
  if (followUp.status !== "scheduled") {
    throw createHttpError(400, "Only scheduled follow-ups can be cancelled");
  }
  followUp.status = "cancelled";
  await followUp.save();
  res.json(followUp);
};
