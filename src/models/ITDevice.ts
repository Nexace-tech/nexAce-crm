import mongoose, { Schema, Document, Model } from "mongoose";

export interface IITDevice extends Document {
  tenantId: mongoose.Types.ObjectId;
  assetTag: string;
  type: string;
  brand: string;
  modelName: string;
  assignedTo: string;
  department: string;
  os: string;
  lastSeen: string;
  condition: "Excellent" | "Good" | "Fair" | "Poor";
  status: "In Use" | "Available" | "In Repair" | "Retired";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ITDeviceSchema = new Schema<IITDevice>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    assetTag: { type: String, required: true, trim: true },
    type: { type: String, trim: true, default: "Laptop" },
    brand: { type: String, trim: true, default: "" },
    modelName: { type: String, trim: true, default: "" },
    assignedTo: { type: String, trim: true, default: "—" },
    department: { type: String, trim: true, default: "—" },
    os: { type: String, trim: true, default: "" },
    lastSeen: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    condition: {
      type: String,
      enum: ["Excellent", "Good", "Fair", "Poor"],
      default: "Good",
    },
    status: {
      type: String,
      enum: ["In Use", "Available", "In Repair", "Retired"],
      default: "Available",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ITDeviceSchema.index({ tenantId: 1, status: 1 });
ITDeviceSchema.index({ tenantId: 1, assetTag: 1 }, { unique: true, sparse: true });
ITDeviceSchema.index({ tenantId: 1, createdAt: -1 });

export const ITDevice: Model<IITDevice> =
  mongoose.models.ITDevice || mongoose.model<IITDevice>("ITDevice", ITDeviceSchema);
