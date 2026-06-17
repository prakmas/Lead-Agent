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

// Map an admin API path to the module it belongs to, so one helper can enforce
// access uniformly across every route (GET → "view", mutations → "manage").
const PATH_MODULE = [
  [/^\/api\/admin\/stats/, "dashboard"],
  [/^\/api\/admin\/leads/, "leads"],
  [/^\/api\/admin\/(conversations|contacts|messages)/, "inbox"],
  [/^\/api\/admin\/listings/, "listings"],
  [/^\/api\/admin\/matches/, "matches"],
  [/^\/api\/admin\/(channels|follow-ups)/, "settings"],
];

// Authenticate AND authorize a module API call in one step. Owners/admins pass
// everything; supervisors are checked against their per-module permission.
export const requireApiAccess = async (request) => {
  const admin = await requireAuth(request);
  const path = new URL(request.url).pathname;
  const entry = PATH_MODULE.find(([re]) => re.test(path));
  if (entry) {
    const level = ["GET", "HEAD"].includes(request.method) ? "view" : "manage";
    if (!admin.canAccess(entry[1], level)) {
      throw createHttpError(403, "You don't have access to this section");
    }
  }
  return admin;
};

// Only the owner (or a full admin) may manage supervisors / RBAC.
export const requireOwner = async (request) => {
  const admin = await requireAuth(request);
  if (admin.role !== "owner" && admin.role !== "admin") {
    throw createHttpError(403, "Only the owner can manage supervisors");
  }
  return admin;
};
