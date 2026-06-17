import Listing from "@/server/models/Listing.js";
import DeletedListing from "@/server/models/DeletedListing.js";
import { requireApiAccess } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import { listingInTerritory } from "@/server/utils/territory.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
type Admin = { _id: { toString(): string }; role: string; territories?: unknown };

const isOwner = (a: Admin) => a.role === "owner" || a.role === "admin";
const ensureManage = (admin: Admin, doc: { createdBy?: { toString(): string } | null; metadata?: unknown }) => {
  if (isOwner(admin)) return;
  const mine = doc.createdBy && doc.createdBy.toString() === admin._id.toString();
  const inTerr = listingInTerritory(admin, doc);
  if (!mine && !inTerr) throw createHttpError(403, "Not allowed for this listing");
};

// Restore a deleted listing back into the active collection.
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const admin = (await requireApiAccess(request)) as Admin;
  const { id } = await ctx.params;
  const doc = (await DeletedListing.findById(id)) as
    | ({ _id: unknown; toObject: () => Record<string, unknown> } & Parameters<typeof ensureManage>[1])
    | null;
  if (!doc) throw createHttpError(404, "Deleted listing not found");
  ensureManage(admin, doc);

  const snap = doc.toObject();
  delete snap._id;
  delete snap.__v;
  delete snap.deletedAt;
  delete snap.deletedBy;
  delete snap.deleteReason;
  delete snap.originalId;
  snap.status = "active";

  const restored = await Listing.create(snap);
  await DeletedListing.findByIdAndDelete(id);
  return json({ message: "Listing restored", id: restored._id });
});

// Permanently purge a deleted listing.
export const DELETE = route(async (request: Request, ctx: Ctx) => {
  const admin = (await requireApiAccess(request)) as Admin;
  const { id } = await ctx.params;
  const doc = (await DeletedListing.findById(id)) as Parameters<typeof ensureManage>[1] | null;
  if (!doc) throw createHttpError(404, "Deleted listing not found");
  ensureManage(admin, doc);
  await DeletedListing.findByIdAndDelete(id);
  return json({ message: "Permanently deleted" });
});
