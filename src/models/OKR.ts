import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKeyResult {
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}

export interface IOKR extends Document {
  title: string;
  description?: string;
  level: "Company" | "Department" | "Team" | "Individual";
  ownerId: mongoose.Types.ObjectId;
  ownerName: string;
  deadline: Date;
  status: "On Track" | "At Risk" | "Behind" | "Completed";
  keyResults: IKeyResult[];
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OKRSchema = new Schema<IOKR>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    level: {
      type: String,
      enum: ["Company", "Department", "Team", "Individual"],
      default: "Team",
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ownerName: { type: String, required: true, trim: true },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ["On Track", "At Risk", "Behind", "Completed"],
      default: "On Track",
    },
    keyResults: [
      {
        title: { type: String, required: true },
        targetValue: { type: Number, required: true, default: 100 },
        currentValue: { type: Number, default: 0 },
        unit: { type: String, default: "%" },
      },
    ],
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

OKRSchema.index({ tenantId: 1, level: 1 });
OKRSchema.index({ tenantId: 1, ownerId: 1 });

export const OKR: Model<IOKR> =
  mongoose.models.OKR || mongoose.model<IOKR>("OKR", OKRSchema);
