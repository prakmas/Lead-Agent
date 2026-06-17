import AdminUser from "@/server/models/AdminUser.js";
import { requireOwner } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import { normalizeTerritories } from "@/server/utils/territory.js";
import { supervisorView } from "@/server/utils/supervisorView.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

// Custom statics live on the JS model; expose their types to TS.
const Users = AdminUser as unknown as {
  hashPassword(password: string): Promise<string>;
  cleanPermissions(input: Record<string, string>): Record<string, string>;
};

// List all supervisors (RBAC management — owner only). Includes the viewable
// password and all profile/approval fields.
export const GET = route(async (request: Request) => {
  await requireOwner(request);
  const supervisors = await AdminUser.find({ role: "supervisor" })
    .select("name email phone location pincode role permissions territories isActive approvalStatus lastLoginAt createdAt +viewPassword")
    .sort({ createdAt: -1 });
  const pending = supervisors.filter((s) => s.approvalStatus === "pending").length;
  return json({ data: supervisors.map(supervisorView), pending });
});

// Create a supervisor account (admin-made → auto-approved & active).
export const POST = route(async (request: Request) => {
  const owner = await requireOwner(request);
  const { name, email, phone, location, pincode, password, permissions = {}, territories = [] } = await request.json();

  if (!name || !phone || !password) throw createHttpError(400, "Name, phone and password are required");
  if (!pincode) throw createHttpError(400, "Pincode is required");
  if (String(password).length < 6) throw createHttpError(400, "Password must be at least 6 characters");

  const normalizedEmail = email ? String(email).toLowerCase().trim() : undefined;
  const dupQuery: Record<string, unknown>[] = [{ phone: String(phone).trim() }];
  if (normalizedEmail) dupQuery.push({ email: normalizedEmail });
  const existing = await AdminUser.findOne({ $or: dupQuery });
  if (existing) throw createHttpError(409, "An account with this phone or email already exists");

  // Ensure the primary pincode is also a territory (multiple allowed).
  const terr = normalizeTerritories(territories);
  if (!terr.some((t) => t.level === "pincode" && t.value === String(pincode).trim())) {
    terr.push({ level: "pincode", value: String(pincode).trim() });
  }

  const supervisor = await AdminUser.create({
    name: String(name).trim(),
    email: normalizedEmail,
    phone: String(phone).trim(),
    location: location ? String(location).trim() : undefined,
    pincode: String(pincode).trim(),
    passwordHash: await Users.hashPassword(password),
    viewPassword: password,
    role: "supervisor",
    approvalStatus: "approved",
    permissions: Users.cleanPermissions(permissions),
    territories: terr,
    createdBy: owner._id,
    isActive: true,
  });

  return json({ data: supervisorView(supervisor) }, 201);
});
