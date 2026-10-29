import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFeatureBroadcast extends Document {
  tenantId: mongoose.Types.ObjectId;
  releaseId: string;
  isBroadcasted: boolean;
  targetRoles: string[];
  enabledFeatures: string[];
  dismissedByAdmin?: boolean;
  broadcastedBy?: mongoose.Types.ObjectId;
  broadcastedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureBroadcastSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    releaseId: { type: String, required: true, trim: true },
    isBroadcasted: { type: Boolean, default: false },
    targetRoles: { type: [String], default: ["Employee", "Manager", "HR", "OPS"] },
    enabledFeatures: { type: [String], default: [] },
    dismissedByAdmin: { type: Boolean, default: false },
    broadcastedBy: { type: Schema.Types.ObjectId, ref: "User" },
    broadcastedAt: { type: Date },
  },
  { timestamps: true }
);

FeatureBroadcastSchema.index({ tenantId: 1, releaseId: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production" && mongoose.models.FeatureBroadcast) {
  delete mongoose.models.FeatureBroadcast;
}

export const FeatureBroadcast: Model<IFeatureBroadcast> =
  mongoose.models.FeatureBroadcast || mongoose.model<IFeatureBroadcast>("FeatureBroadcast", FeatureBroadcastSchema);

