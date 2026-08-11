import mongoose, { Schema, Document, Model } from "mongoose";

export interface IITSubscription extends Document {
  tenantId: mongoose.Types.ObjectId;
  tool: string;
  category: string;
  plan: string;
  costPerMonth: number;
  seats: number;
  renewalDate: string;
  owner: string;
  status: "Active" | "Expiring Soon" | "Expired" | "Cancelled";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ITSubscriptionSchema = new Schema<IITSubscription>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    tool: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" },
    plan: { type: String, trim: true, default: "" },
    costPerMonth: { type: Number, default: 0, min: 0 },
    seats: { type: Number, default: 1, min: 1 },
    renewalDate: { type: String, default: "" },
    owner: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Active", "Expiring Soon", "Expired", "Cancelled"],
      default: "Active",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ITSubscriptionSchema.index({ tenantId: 1, status: 1 });
ITSubscriptionSchema.index({ tenantId: 1, createdAt: -1 });

export const ITSubscription: Model<IITSubscription> =
  mongoose.models.ITSubscription || mongoose.model<IITSubscription>("ITSubscription", ITSubscriptionSchema);
