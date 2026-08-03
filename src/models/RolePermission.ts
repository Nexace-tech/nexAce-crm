import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRolePermission extends Document {
  tenantId: mongoose.Types.ObjectId;
  role: string;
  isCustom?: boolean;
  modulePermissions: Record<string, boolean>;
  featurePermissions: Record<string, boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const RolePermissionSchema: Schema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    isCustom: { type: Boolean, default: false },
    modulePermissions: { type: Schema.Types.Mixed, default: {} },
    featurePermissions: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound unique index so each tenant has 1 permission config per role
RolePermissionSchema.index({ tenantId: 1, role: 1 }, { unique: true });

if (mongoose.models.RolePermission) {
  delete mongoose.models.RolePermission;
}

export const RolePermission: Model<IRolePermission> =
  mongoose.models.RolePermission || mongoose.model<IRolePermission>("RolePermission", RolePermissionSchema);
