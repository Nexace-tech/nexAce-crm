import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHRSandbox extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  workflowType: "Leave Policy" | "Onboarding Flow" | "Appraisal Scale" | "Help Desk Auto-Routing";
  configJson: string;
  status: "Draft" | "Testing" | "Approved";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const HRSandboxSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    workflowType: {
      type: String,
      enum: ["Leave Policy", "Onboarding Flow", "Appraisal Scale", "Help Desk Auto-Routing"],
      required: true,
    },
    configJson: { type: String, required: true },
    status: { type: String, enum: ["Draft", "Testing", "Approved"], default: "Draft" },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

HRSandboxSchema.index({ tenantId: 1 });

export const HRSandbox: Model<IHRSandbox> =
  mongoose.models.HRSandbox ||
  mongoose.model<IHRSandbox>("HRSandbox", HRSandboxSchema);
