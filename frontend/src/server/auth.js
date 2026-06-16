import jwt from "jsonwebtoken";
import env from "./config/env.js";
import AdminUser from "./models/AdminUser.js";
import createHttpError from "./utils/createHttpError.js";

export const signToken = (admin) =>
  jwt.sign(
    { sub: admin._id.toString(), role: admin.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

// Verify the Bearer token on a Request and return the admin, or throw 401.
export const requireAuth = async (request) => {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw createHttpError(401, "Authentication required");

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw createHttpError(401, "Invalid or expired token");
  }

  const admin = await AdminUser.findById(payload.sub);
  if (!admin || !admin.isActive) throw createHttpError(401, "Invalid session");
  return admin;
};
