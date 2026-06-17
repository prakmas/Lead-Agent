import AdminUser from "@/server/models/AdminUser.js";
import { requireOwner } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

import { normalizeTerritories } from "@/server/utils/territory.js";
import { supervisorView } from "@/server/utils/supervisorView.js";

export const dynamic = "force-dynamic";

const Users = AdminUser as unknown as { cleanPermissions(input: Record<string, string>): Record<string, string> };

type Ctx = { params: Promise<{ id: string }> };

// Update a supervisor: profile fields, permissions, territories, active state,
// or approval (approve / reject a pending signup).
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  await requireOwner(request);
  const { id } = await ctx.params;
  const supervisor = await AdminUser.findOne({ _id: id, role: "supervisor" }).select("+viewPassword");
  if (!supervisor) throw createHttpError(404, "Supervisor not found");

  const body = await request.json();
  if (typeof body.name === "string") supervisor.name = body.name.trim();
  if (typeof body.phone === "string") supervisor.phone = body.phone.trim();
  if (typeof body.location === "string") supervisor.location = body.location.trim();
  if (typeof body.pincode === "string") supervisor.pincode = body.pincode.trim();
  if (typeof body.isActive === "boolean") supervisor.isActive = body.isActive;
  if (["pending", "approved", "rejected"].includes(body.approvalStatus)) {
    supervisor.approvalStatus = body.approvalStatus;
    // Approving activates the account; rejecting deactivates it.
    if (body.approvalStatus === "approved") supervisor.isActive = true;
    if (body.approvalStatus === "rejected") supervisor.isActive = false;
  }
  if (body.permissions && typeof body.permissions === "object") {
    supervisor.permissions = Users.cleanPermissions(body.permissions);
    supervisor.markModified("permissions");
  }
  if (Array.isArray(body.territories)) {
    supervisor.territories = normalizeTerritories(body.territories);
  }
  await supervisor.save();

  return json({ data: supervisorView(supervisor) });
});

// Revoke a supervisor — permanently remove the account.
export const DELETE = route(async (request: Request, ctx: Ctx) => {
  await requireOwner(request);
  const { id } = await ctx.params;
  const removed = await AdminUser.findOneAndDelete({ _id: id, role: "supervisor" });
  if (!removed) throw createHttpError(404, "Supervisor not found");
  return json({ message: "Supervisor revoked" });
});
