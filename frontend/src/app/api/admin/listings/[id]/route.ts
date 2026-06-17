import Listing from "@/server/models/Listing.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import { listingInTerritory } from "@/server/utils/territory.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Block a supervisor from touching a listing outside their territory.
const ensureInTerritory = (admin: { role: string; territories?: unknown }, listing: unknown) => {
  if (!listingInTerritory(admin, listing)) {
    throw createHttpError(403, "This listing is outside your territory");
  }
};

// Full detail incl. images — used when opening a listing to edit.
export const GET = route(async (request: Request, ctx: Ctx) => {
  const admin = await requireApiAccess(request);
  const { id } = await ctx.params;
  const listing = await Listing.findById(id);
  if (!listing) throw createHttpError(404, "Listing not found");
  ensureInTerritory(admin, listing);
  return json(listing);
});

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const admin = await requireApiAccess(request);
  const { id } = await ctx.params;
  const existing = await Listing.findById(id);
  if (!existing) throw createHttpError(404, "Listing not found");
  ensureInTerritory(admin, existing);

  const body = await request.json();
  const listing = await Listing.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  return json(listing);
});

export const DELETE = route(async (request: Request, ctx: Ctx) => {
  const admin = await requireApiAccess(request);
  const { id } = await ctx.params;
  const existing = await Listing.findById(id);
  if (!existing) throw createHttpError(404, "Listing not found");
  ensureInTerritory(admin, existing);

  await Listing.findByIdAndDelete(id);
  return json({ message: "Listing deleted" });
});
