import AdminUser from "@/server/models/AdminUser.js";
import { requireOwner } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

const Users = AdminUser as unknown as { cleanPermissions(input: Record<string, string>): Record<string, string> };

type Ctx = { params: Promise<{ id: string }> };

// Update a supervisor: name, permissions, and/or active state (activate/deactivate).
export const PATCH = route(async (request: Request, ctx: Ctx) => {
  await requireOwner(request);
  const { id } = await ctx.params;
  const supervisor = await AdminUser.findOne({ _id: id, role: "supervisor" });
  if (!supervisor) throw createHttpError(404, "Supervisor not found");

  const body = await request.json();
  if (typeof body.name === "string") supervisor.name = body.name.trim();
  if (typeof body.isActive === "boolean") supervisor.isActive = body.isActive;
  if (body.permissions && typeof body.permissions === "object") {
    supervisor.permissions = Users.cleanPermissions(body.permissions);
    supervisor.markModified("permissions");
  }
  await supervisor.save();

  return json({
    data: {
      _id: supervisor._id,
      name: supervisor.name,
      email: supervisor.email,
      role: supervisor.role,
      permissions: supervisor.permissions,
      isActive: supervisor.isActive,
      lastLoginAt: supervisor.lastLoginAt,
      createdAt: supervisor.createdAt,
    },
  });
});

// Revoke a supervisor — permanently remove the account.
export const DELETE = route(async (request: Request, ctx: Ctx) => {
  await requireOwner(request);
  const { id } = await ctx.params;
  const removed = await AdminUser.findOneAndDelete({ _id: id, role: "supervisor" });
  if (!removed) throw createHttpError(404, "Supervisor not found");
  return json({ message: "Supervisor revoked" });
});
