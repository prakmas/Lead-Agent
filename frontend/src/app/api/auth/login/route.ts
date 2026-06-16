import AdminUser from "@/server/models/AdminUser.js";
import { signToken } from "@/server/auth.js";
import { route, json } from "@/server/http.js";
import createHttpError from "@/server/utils/createHttpError.js";

export const dynamic = "force-dynamic";

export const POST = route(async (request: Request) => {
  const { email, password } = await request.json();
  if (!email || !password) throw createHttpError(400, "Email and password are required");

  const admin = await AdminUser.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!admin || !(await admin.comparePassword(password))) {
    throw createHttpError(401, "Invalid email or password");
  }
  if (!admin.isActive) throw createHttpError(403, "Admin account is disabled");

  admin.lastLoginAt = new Date();
  await admin.save();

  return json({
    token: signToken(admin),
    admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
  });
});
