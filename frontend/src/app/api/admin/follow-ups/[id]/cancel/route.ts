import FollowUp from "@/server/models/FollowUp.js";
import { requireAuth } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  await requireAuth(request);
  const { id } = await ctx.params;
  const followUp = await FollowUp.findById(id);
  if (!followUp) throw createHttpError(404, "Follow-up not found");
  if (followUp.status !== "scheduled") {
    throw createHttpError(400, "Only scheduled follow-ups can be cancelled");
  }
  followUp.status = "cancelled";
  await followUp.save();
  return json(followUp);
});
