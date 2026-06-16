import { Router } from "express";
import {
  receiveMetaWebhook,
  simulateInboundMessage,
  verifyMetaWebhook,
} from "../controllers/webhook.controller.js";
import asyncHandler from "../utils/asyncHandler.js";

const router = Router();

router.get("/meta", verifyMetaWebhook);
router.post("/meta", asyncHandler(receiveMetaWebhook));

// Local testing only (returns 403 in production).
router.post("/simulate", asyncHandler(simulateInboundMessage));

export default router;
