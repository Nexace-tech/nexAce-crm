import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPulseResponse {
  userId: mongoose.Types.ObjectId;
  userName?: string;
  rating: number; // 1 to 5
  feedback?: string;
  submittedAt: Date;
}

export interface IPulseSurvey extends Document {
  question: string;
  category: "Morale" | "Workload" | "Management Support" | "Company Vision" | "General";
  active: boolean;
  responses: IPulseResponse[];
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PulseSurveySchema = new Schema<IPulseSurvey>(
  {
    question: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Morale", "Workload", "Management Support", "Company Vision", "General"],
      default: "Morale",
    },
    active: { type: Boolean, default: true },
    responses: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        userName: { type: String, trim: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        feedback: { type: String, trim: true },
        submittedAt: { type: Date, default: Date.now },
      },
    ],
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

PulseSurveySchema.index({ tenantId: 1, active: 1 });

export const PulseSurvey: Model<IPulseSurvey> =
  mongoose.models.PulseSurvey || mongoose.model<IPulseSurvey>("PulseSurvey", PulseSurveySchema);
