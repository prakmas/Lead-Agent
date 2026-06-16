import Listing from "@/server/models/Listing.js";
import { requireAuth } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  await requireAuth(request);
  const { id } = await ctx.params;
  const body = await request.json();
  const listing = await Listing.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!listing) throw createHttpError(404, "Listing not found");
  return json(listing);
});

export const DELETE = route(async (request: Request, ctx: Ctx) => {
  await requireAuth(request);
  const { id } = await ctx.params;
  const listing = await Listing.findByIdAndDelete(id);
  if (!listing) throw createHttpError(404, "Listing not found");
  return json({ message: "Listing deleted" });
});
