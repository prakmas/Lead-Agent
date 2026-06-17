import AdminUser from "@/server/models/AdminUser.js";
import { requireOwner } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

// Custom statics live on the JS model; expose their types to TS.
const Users = AdminUser as unknown as {
  hashPassword(password: string): Promise<string>;
  cleanPermissions(input: Record<string, string>): Record<string, string>;
};

// List all supervisors (RBAC management — owner only).
export const GET = route(async (request: Request) => {
  await requireOwner(request);
  const supervisors = await AdminUser.find({ role: "supervisor" })
    .select("name email role permissions isActive lastLoginAt createdAt")
    .sort({ createdAt: -1 });
  return json({ data: supervisors });
});

// Create a supervisor account with a password and module permissions.
export const POST = route(async (request: Request) => {
  const owner = await requireOwner(request);
  const { name, email, password, permissions = {} } = await request.json();

  if (!name || !email || !password) throw createHttpError(400, "Name, email and password are required");
  if (String(password).length < 6) throw createHttpError(400, "Password must be at least 6 characters");

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await AdminUser.findOne({ email: normalizedEmail });
  if (existing) throw createHttpError(409, "An account with this email already exists");

  const supervisor = await AdminUser.create({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash: await Users.hashPassword(password),
    role: "supervisor",
    permissions: Users.cleanPermissions(permissions),
    createdBy: owner._id,
    isActive: true,
  });

  return json(
    {
      data: {
        _id: supervisor._id,
        name: supervisor.name,
        email: supervisor.email,
        role: supervisor.role,
        permissions: supervisor.permissions,
        isActive: supervisor.isActive,
        createdAt: supervisor.createdAt,
      },
    },
    201,
  );
});
