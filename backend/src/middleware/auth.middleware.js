import jwt from "jsonwebtoken";
import env from "../config/env.js";
import AdminUser from "../models/AdminUser.js";
import createHttpError from "../utils/createHttpError.js";

export const requireAuth = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) throw createHttpError(401, "Authentication required");

    const payload = jwt.verify(token, env.jwtSecret);
    const admin = await AdminUser.findById(payload.sub);

    if (!admin || !admin.isActive) throw createHttpError(401, "Invalid session");

    req.admin = admin;
    return next();
  } catch (error) {
    return next(error.status ? error : createHttpError(401, "Invalid or expired token"));
  }
};
