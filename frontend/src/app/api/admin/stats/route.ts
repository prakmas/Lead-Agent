import Channel from "@/server/models/Channel.js";
import Conversation from "@/server/models/Conversation.js";
import FollowUp from "@/server/models/FollowUp.js";
import Lead from "@/server/models/Lead.js";
import Listing from "@/server/models/Listing.js";
import Match from "@/server/models/Match.js";
import { requireAuth } from "@/server/auth.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

const contactStatsByChannel = () =>
  Channel.aggregate([
    { $lookup: { from: "contacts", localField: "_id", foreignField: "channel", as: "contacts" } },
    { $project: { type: 1, name: 1, status: 1, contacts: { $size: "$contacts" } } },
  ]);

export const GET = route(async (request: Request) => {
  await requireAuth(request);

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
    contactStatsByChannel(),
    Conversation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    FollowUp.countDocuments({ status: "scheduled" }),
  ]);

  return json({
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
});
