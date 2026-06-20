import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { ACCESS_RANK, MODULE_KEYS } from "../utils/modules.js";

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "Admin" },
    // Email is OPTIONAL for supervisors (they sign up / log in with phone).
    // sparse unique → many docs can omit it without collisions.
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    // Phone is the primary identifier for supervisors (mobile signup/login).
    phone: { type: String, trim: true, unique: true, sparse: true },
    location: { type: String, trim: true },
    pincode: { type: String, trim: true }, // primary pincode (also mirrored into territories)
    passwordHash: { type: String, required: true, select: false },
    // Admin-viewable copy of the last-set password. NOTE: storing a recoverable
    // password is a security tradeoff acceptable for this internal admin tool —
    // revisit (remove / make reset-only) before any public/production launch.
    viewPassword: { type: String, select: false },
    // Approval workflow: self-signups land as "pending" until an owner approves.
    approvalStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" },
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
    // Geographic territories a supervisor manages. A listing belongs to a
    // supervisor if its state/city/pincode matches any of these.
    territories: {
      type: [
        new mongoose.Schema(
          { level: { type: String, enum: ["state", "city", "pincode"] }, value: { type: String, trim: true } },
          { _id: false },
        ),
      ],
      default: [],
    },
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
