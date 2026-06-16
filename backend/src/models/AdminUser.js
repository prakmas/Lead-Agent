import bcrypt from "bcryptjs";
import mongoose from "mongoose";

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
      enum: ["owner", "admin", "agent"],
      default: "admin",
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

adminUserSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

adminUserSchema.statics.hashPassword = function hashPassword(password) {
  return bcrypt.hash(password, 12);
};

const AdminUser = mongoose.model("AdminUser", adminUserSchema, "admin_users");

export default AdminUser;
