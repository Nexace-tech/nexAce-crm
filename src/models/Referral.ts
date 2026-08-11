import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStageHistory {
  status: string;
  updatedBy: string;
  updatedAt: Date;
  comment?: string;
}

export interface IReferral extends Document {
  candidateName: string;
  candidateEmail: string;
  phone?: string;
  position: string;
  department?: string;
  experienceYears?: number;
  candidateResumeUrl?: string;
  referrerName: string;
  referrerId?: mongoose.Types.ObjectId;
  referralCode?: string;
  status: "Submitted" | "Interviewing" | "Hired" | "Paid" | "Rejected";
  rewardAmount: number;
  payoutStatus: "Pending" | "Approved" | "Paid";
  payoutDate?: Date;
  stageHistory?: IStageHistory[];
  notes?: string;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const StageHistorySchema = new Schema<IStageHistory>(
  {
    status: { type: String, required: true },
    updatedBy: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now },
    comment: { type: String, trim: true },
  },
  { _id: false }
);

const ReferralSchema = new Schema<IReferral>(
  {
    candidateName: { type: String, required: true, trim: true },
    candidateEmail: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    position: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: "Engineering" },
    experienceYears: { type: Number, default: 0 },
    candidateResumeUrl: { type: String, trim: true },
    referrerName: { type: String, required: true, trim: true },
    referrerId: { type: Schema.Types.ObjectId, ref: "User" },
    referralCode: { type: String, trim: true },
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
    payoutDate: { type: Date },
    stageHistory: [StageHistorySchema],
    notes: { type: String, trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance indexes for pipeline stage filtering & referrer queries
ReferralSchema.index({ tenantId: 1, status: 1 });
ReferralSchema.index({ tenantId: 1, referrerId: 1 });
ReferralSchema.index({ tenantId: 1, candidateEmail: 1 });

export const Referral: Model<IReferral> =
  mongoose.models.Referral || mongoose.model<IReferral>("Referral", ReferralSchema);
