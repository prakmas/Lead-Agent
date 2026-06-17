import AdminUser from "@/server/models/AdminUser.js";
import { signToken } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

export const POST = route(async (request: Request) => {
  const { email, password } = await request.json();
  if (!email || !password) throw createHttpError(400, "Email/phone and password are required");

  // Accept either an email or a phone number as the identifier (supervisors may
  // sign up with phone only).
  const id = String(email).toLowerCase().trim();
  const admin = await AdminUser.findOne({ $or: [{ email: id }, { phone: String(email).trim() }] }).select("+passwordHash");
  if (!admin || !(await admin.comparePassword(password))) {
    throw createHttpError(401, "Invalid credentials");
  }
  if (admin.role === "supervisor" && admin.approvalStatus !== "approved") {
    throw createHttpError(403, "Your account is pending admin approval.");
  }
  if (!admin.isActive) throw createHttpError(403, "Account is disabled");

  admin.lastLoginAt = new Date();
  await admin.save();

  return json({
    token: signToken(admin),
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || {},
    },
  });
});
