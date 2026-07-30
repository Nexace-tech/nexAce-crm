import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBillingPlan extends Document {
  name: string; // e.g., "Standard Team", "Enterprise SaaS", "Growth"
  maxSeats: number;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
}

export interface ITenantSubscription extends Document {
  tenantId: mongoose.Types.ObjectId;
  planName: string;
  maxSeats: number;
  activeSeats: number;
  billingCycle: "Monthly" | "Annual";
  status: "Active" | "Past Due" | "Trial" | "Cancelled";
  amount: number;
  renewalDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSubscriptionSchema = new Schema<ITenantSubscription>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    planName: { type: String, required: true, default: "Standard Enterprise" },
    maxSeats: { type: Number, default: 50, min: 1 },
    activeSeats: { type: Number, default: 1, min: 1 },
    billingCycle: { type: String, enum: ["Monthly", "Annual"], default: "Monthly" },
    status: { type: String, enum: ["Active", "Past Due", "Trial", "Cancelled"], default: "Active" },
    amount: { type: Number, default: 499, min: 0 },
    renewalDate: { type: Date, required: true },
  },
  { timestamps: true }
);

TenantSubscriptionSchema.index({ tenantId: 1, status: 1 });

export const TenantSubscription: Model<ITenantSubscription> =
  mongoose.models.TenantSubscription ||
  mongoose.model<ITenantSubscription>("TenantSubscription", TenantSubscriptionSchema);
