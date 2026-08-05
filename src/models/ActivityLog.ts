import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActivityLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userRole?: string;
  action: string;
  targetName: string;
  details: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true },
    userRole: { type: String },
    action: { type: String, required: true },
    targetName: { type: String, required: true },
    details: { type: String, required: true },
  },
  { timestamps: true }
);

// Performance indexes for paginated timeline lookups
ActivityLogSchema.index({ tenantId: 1, createdAt: -1 });
ActivityLogSchema.index({ projectId: 1, createdAt: -1 });
// Compound index for per-user activity feed queries
ActivityLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);
