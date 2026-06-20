import Lead from "@/server/models/Lead.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import { leadStatuses } from "@/server/utils/leadStatus.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  await requireApiAccess(request);
  const { id } = await ctx.params;
  const body = await request.json();
  if (body.status && !leadStatuses.includes(body.status)) {
    throw createHttpError(400, "Invalid lead status");
  }
  const lead = await Lead.findByIdAndUpdate(id, body, { new: true, runValidators: true }).populate("contact");
  if (!lead) throw createHttpError(404, "Lead not found");
  return json(lead);
});

export const DELETE = route(async (request: Request, ctx: Ctx) => {
  await requireApiAccess(request);
  const { id } = await ctx.params;
  const lead = await Lead.findByIdAndDelete(id);
  if (!lead) throw createHttpError(404, "Lead not found");
  return json({ message: "Lead deleted" });
});
