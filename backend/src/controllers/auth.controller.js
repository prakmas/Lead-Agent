import jwt from "jsonwebtoken";
import env from "../config/env.js";
import AdminUser from "../models/AdminUser.js";
import createHttpError from "../utils/createHttpError.js";

const signToken = (admin) =>
  jwt.sign(
    {
      sub: admin._id.toString(),
      role: admin.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) throw createHttpError(400, "Email and password are required");

  const admin = await AdminUser.findOne({ email: email.toLowerCase() }).select("+passwordHash");

  if (!admin || !(await admin.comparePassword(password))) {
    throw createHttpError(401, "Invalid email or password");
  }

  if (!admin.isActive) throw createHttpError(403, "Admin account is disabled");

  admin.lastLoginAt = new Date();
  await admin.save();

  res.json({
    token: signToken(admin),
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
};

export const me = async (req, res) => {
  res.json({
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role,
    },
  });
};
