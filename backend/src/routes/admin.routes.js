import { Router } from "express";
import {
  cancelFollowUp,
  createLead,
  createListing,
  deleteLead,
  deleteListing,
  getConversationMessages,
  getDashboardStats,
  listChannels,
  listConversations,
  listFollowUps,
  listLeads,
  listListings,
  listMatches,
  matchListing,
  searchMessages,
  updateLead,
  updateListing,
} from "../controllers/admin.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get("/stats", asyncHandler(getDashboardStats));

router.get("/leads", asyncHandler(listLeads));
router.post("/leads", asyncHandler(createLead));
router.patch("/leads/:id", asyncHandler(updateLead));
router.delete("/leads/:id", asyncHandler(deleteLead));

router.get("/conversations", asyncHandler(listConversations));
router.get("/conversations/:id/messages", asyncHandler(getConversationMessages));
router.get("/messages/search", asyncHandler(searchMessages));

router.get("/listings", asyncHandler(listListings));
router.post("/listings", asyncHandler(createListing));
router.patch("/listings/:id", asyncHandler(updateListing));
router.delete("/listings/:id", asyncHandler(deleteListing));
router.post("/listings/match", asyncHandler(matchListing));

router.get("/matches", asyncHandler(listMatches));

router.get("/channels", asyncHandler(listChannels));

router.get("/follow-ups", asyncHandler(listFollowUps));
router.patch("/follow-ups/:id/cancel", asyncHandler(cancelFollowUp));

export default router;
