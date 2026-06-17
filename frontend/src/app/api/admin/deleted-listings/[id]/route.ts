import Listing from "@/server/models/Listing.js";
import DeletedListing from "@/server/models/DeletedListing.js";
import { requireOwner } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Restore a deleted listing back into the active collection. Owner only —
// supervisors can view the bin but not restore or purge.
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  await requireOwner(request);
  const { id } = await ctx.params;
  const doc = (await DeletedListing.findById(id)) as
    | ({ _id: unknown; toObject: () => Record<string, unknown> })
    | null;
  if (!doc) throw createHttpError(404, "Deleted listing not found");

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

// Permanently purge a deleted listing. Owner only.
export const DELETE = route(async (request: Request, ctx: Ctx) => {
  await requireOwner(request);
  const { id } = await ctx.params;
  const doc = await DeletedListing.findByIdAndDelete(id);
  if (!doc) throw createHttpError(404, "Deleted listing not found");
  return json({ message: "Permanently deleted" });
});
