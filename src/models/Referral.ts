import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReferral extends Document {
  candidateName: string;
  candidateEmail: string;
  phone?: string;
  position: string;
  referrerName: string;
  referrerId?: mongoose.Types.ObjectId;
  status: "Submitted" | "Interviewing" | "Hired" | "Paid" | "Rejected";
  rewardAmount: number;
  payoutStatus: "Pending" | "Approved" | "Paid";
  notes?: string;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    position: { type: String, required: true, trim: true },
    referrerName: { type: String, required: true, trim: true },
    referrerId: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["Submitted", "Interviewing", "Hired", "Paid", "Rejected"],
      default: "Submitted",
    },
    rewardAmount: { type: Number, default: 500, min: 0 },
    payoutStatus: {
      type: String,
      enum: ["Pending", "Approved", "Paid"],
      default: "Pending",
    },
    notes: { type: String, trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance indexes for pipeline stage filtering & referrer queries
ReferralSchema.index({ tenantId: 1, status: 1 });
ReferralSchema.index({ tenantId: 1, referrerId: 1 });

export const Referral: Model<IReferral> =
  mongoose.models.Referral || mongoose.model<IReferral>("Referral", ReferralSchema);
