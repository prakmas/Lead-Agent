import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { ACCESS_RANK, MODULE_KEYS } from "../utils/modules.js";

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "Admin" },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      // owner = the top admin who manages supervisors (full access always)
      // supervisor = a sub-user whose access is limited by `permissions`
      enum: ["owner", "admin", "agent", "supervisor"],
      default: "supervisor",
    },
    // Per-module access for supervisors: { leads: "manage", inbox: "view", ... }.
    // Ignored for owner/admin (they have full access).
    permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Which owner created this supervisor.
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

adminUserSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Full access for owner/admin; otherwise check the supervisor's module level.
adminUserSchema.methods.canAccess = function canAccess(moduleKey, level = "view") {
  if (this.role === "owner" || this.role === "admin") return true;
  const have = (this.permissions && this.permissions[moduleKey]) || "none";
  return (ACCESS_RANK[have] || 0) >= (ACCESS_RANK[level] || 0);
};

// Normalise a permissions object to only known module keys + valid levels.
adminUserSchema.statics.cleanPermissions = function cleanPermissions(input = {}) {
  const out = {};
  for (const key of MODULE_KEYS) {
    const v = input[key];
    out[key] = v === "view" || v === "manage" ? v : "none";
  }
  return out;
};

adminUserSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

const AdminUser = mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema, "admin_users");

export default AdminUser;
