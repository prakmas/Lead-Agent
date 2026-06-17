import Listing from "@/server/models/Listing.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import { listingInTerritory } from "@/server/utils/territory.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

type Admin = { _id: { toString(): string }; role: string; territories?: unknown };
type WithCreator = { createdBy?: { toString(): string } | null; metadata?: unknown };

const isOwner = (admin: Admin) => admin.role === "owner" || admin.role === "admin";

// View is allowed within the supervisor's territory (owner sees all).
const ensureCanView = (admin: Admin, listing: WithCreator) => {
  if (!listingInTerritory(admin, listing)) {
    throw createHttpError(403, "This listing is outside your territory");
  }
};

// Editing/deleting is restricted to the listing's creator (owner can do all).
const ensureCanManage = (admin: Admin, listing: WithCreator) => {
  if (isOwner(admin)) return;
  const mine = listing.createdBy && listing.createdBy.toString() === admin._id.toString();
  if (!mine) throw createHttpError(403, "You can only edit listings you created");
};

// Full detail incl. images — used when opening a listing to edit/view.
export const GET = route(async (request: Request, ctx: Ctx) => {
  const admin = (await requireApiAccess(request)) as Admin;
  const { id } = await ctx.params;
  const listing = await Listing.findById(id).populate({ path: "createdBy", select: "name email role" });
  if (!listing) throw createHttpError(404, "Listing not found");
  ensureCanView(admin, listing as WithCreator);
  return json(listing);
});

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const admin = (await requireApiAccess(request)) as Admin;
  const { id } = await ctx.params;
  const existing = await Listing.findById(id);
  if (!existing) throw createHttpError(404, "Listing not found");
  ensureCanManage(admin, existing as WithCreator);

  const body = await request.json();
  // createdBy is immutable — never let an update reassign ownership.
  delete body.createdBy;
  const listing = await Listing.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  return json(listing);
});

// Soft-delete — keep the record (archived) with a reason for audit.
export const DELETE = route(async (request: Request, ctx: Ctx) => {
  const admin = (await requireApiAccess(request)) as Admin;
  const { id } = await ctx.params;
  const existing = (await Listing.findById(id)) as
    | (WithCreator & { status: string; deletedAt?: Date; deletedBy?: unknown; deleteReason?: string; save: () => Promise<unknown> })
    | null;
  if (!existing) throw createHttpError(404, "Listing not found");
  ensureCanManage(admin, existing);

  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  existing.status = "archived";
  existing.deletedAt = new Date();
  existing.deletedBy = admin._id;
  existing.deleteReason = (body.reason || "").trim();
  await existing.save();

  return json({ message: "Listing deleted", id });
});
