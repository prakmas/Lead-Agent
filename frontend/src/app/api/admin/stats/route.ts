import AdminUser from "@/server/models/AdminUser.js";
import Channel from "@/server/models/Channel.js";
import Conversation from "@/server/models/Conversation.js";
import DeletedListing from "@/server/models/DeletedListing.js";
import FollowUp from "@/server/models/FollowUp.js";
import Lead from "@/server/models/Lead.js";
import Listing from "@/server/models/Listing.js";
import Match from "@/server/models/Match.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";

export const dynamic = "force-dynamic";

const contactStatsByChannel = () =>
  Channel.aggregate([
    { $lookup: { from: "contacts", localField: "_id", foreignField: "channel", as: "contacts" } },
    { $project: { type: 1, name: 1, status: 1, contacts: { $size: "$contacts" } } },
  ]);

export const GET = route(async (request: Request) => {
  await requireApiAccess(request);

  const [
    totalLeads,
    openConversations,
    totalListings,
    totalMatches,
    leadsByStatus,
    channels,
    conversationsByStatus,
    scheduledFollowUps,
    followUpsDue,
    unreadConversations,
    pendingSupervisors,
    supervisorsCount,
    deletedListings,
    recentLeads,
  ] = await Promise.all([
    Lead.countDocuments(),
    Conversation.countDocuments({ status: { $in: ["open", "waiting", "matched"] } }),
    Listing.countDocuments(),
    Match.countDocuments(),
    Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    contactStatsByChannel(),
    Conversation.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    FollowUp.countDocuments({ status: "scheduled" }),
    Lead.countDocuments({ "followUp.active": true }),
    Conversation.countDocuments({ unreadCount: { $gt: 0 } }),
    AdminUser.countDocuments({ role: "supervisor", approvalStatus: "pending" }),
    AdminUser.countDocuments({ role: "supervisor" }),
    DeletedListing.countDocuments(),
    Lead.find()
      .populate("contact", "name phone")
      .sort({ createdAt: -1 })
      .limit(6)
      .select("title category status requirements.location createdAt channel contact"),
  ]);

  return json({
    totals: {
      leads: totalLeads,
      conversations: openConversations,
      listings: totalListings,
      matches: totalMatches,
      scheduledFollowUps,
      followUpsDue,
      unreadConversations,
      pendingSupervisors,
      supervisors: supervisorsCount,
      deletedListings,
    },
    leadsByStatus,
    channels,
    conversationsByStatus,
    recentLeads,
  });
});
