import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorType: {
      type: String,
      enum: ["system", "admin", "contact"],
      default: "system",
    },
    actor: { type: mongoose.Schema.Types.ObjectId },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, entityType: 1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema, "audit_logs");

export default AuditLog;
