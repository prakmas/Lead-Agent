import Lead from "@/server/models/Lead.js";
import { requireAuth } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import { findMatchesForLead } from "@/server/services/matching.service.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

export const POST = route(async (request: Request) => {
  await requireAuth(request);
  const body = await request.json();
  const lead = await Lead.findById(body.leadId);
  if (!lead) throw createHttpError(404, "Lead not found");
  const matches = await findMatchesForLead(lead, Number(body.limit || 5));
  return json({ data: matches });
});
