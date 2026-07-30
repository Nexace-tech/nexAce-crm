import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKRARating {
  kraTitle: string;
  weightagePercentage: number;
  selfScore: number;
  managerScore: number;
  comments: string;
}

export interface IHRAppraisal extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  managerId?: mongoose.Types.ObjectId;
  managerName?: string;
  cycle: string; // e.g., "2026 Q2 Review" or "Probation Final Review"
  type: "Probation Review" | "Quarterly Appraisal" | "Annual Review";
  status: "Draft" | "Self Review Submitted" | "Manager Review Completed" | "Finalized";
  kras: IKRARating[];
  overallSelfRating: number;
  overallManagerRating: number;
  finalRating: number;
  selfFeedback: string;
  managerFeedback: string;
  probationStatus?: "Under Probation" | "Confirmed" | "Extended";
  probationEndDate?: Date;
  submittedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KRARatingSchema = new Schema({
  kraTitle: { type: String, required: true },
  weightagePercentage: { type: Number, default: 20 },
  selfScore: { type: Number, default: 0, min: 0, max: 5 },
  managerScore: { type: Number, default: 0, min: 0, max: 5 },
  comments: { type: String, default: "" },
});

const HRAppraisalSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
    managerName: { type: String, default: "" },
    cycle: { type: String, required: true },
    type: {
      type: String,
      enum: ["Probation Review", "Quarterly Appraisal", "Annual Review"],
      default: "Quarterly Appraisal",
    },
    status: {
      type: String,
      enum: ["Draft", "Self Review Submitted", "Manager Review Completed", "Finalized"],
      default: "Draft",
    },
    kras: [KRARatingSchema],
    overallSelfRating: { type: Number, default: 0 },
    overallManagerRating: { type: Number, default: 0 },
    finalRating: { type: Number, default: 0 },
    selfFeedback: { type: String, default: "" },
    managerFeedback: { type: String, default: "" },
    probationStatus: {
      type: String,
      enum: ["Under Probation", "Confirmed", "Extended"],
    },
    probationEndDate: { type: Date },
    submittedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

HRAppraisalSchema.index({ tenantId: 1, userId: 1 });

export const HRAppraisal: Model<IHRAppraisal> =
  mongoose.models.HRAppraisal ||
  mongoose.model<IHRAppraisal>("HRAppraisal", HRAppraisalSchema);
