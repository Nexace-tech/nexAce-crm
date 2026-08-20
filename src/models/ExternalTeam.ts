import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExternalTeam extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  companyName: string;
  role: string;
  serviceCategory: "Software Development" | "UI/UX Design" | "QA Testing" | "DevOps & Infrastructure" | "Marketing & Content" | "Legal & Finance" | "Consulting" | "Other";
  assignedProject: string;
  hourlyRate: number;
  currency: string;
  status: "Active" | "On Hold" | "Contract Ended";
  phone?: string;
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExternalTeamSchema = new Schema<IExternalTeam>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    companyName: { type: String, required: true, trim: true, default: "Independent Contractor" },
    role: { type: String, required: true, trim: true, default: "External Contractor" },
    serviceCategory: {
      type: String,
      enum: [
        "Software Development",
        "UI/UX Design",
        "QA Testing",
        "DevOps & Infrastructure",
        "Marketing & Content",
        "Legal & Finance",
        "Consulting",
        "Other",
      ],
      default: "Software Development",
    },
    assignedProject: { type: String, trim: true, default: "General Operational Support" },
    hourlyRate: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["Active", "On Hold", "Contract Ended"],
      default: "Active",
    },
    phone: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ExternalTeamSchema.index({ tenantId: 1, status: 1 });
ExternalTeamSchema.index({ tenantId: 1, companyName: 1 });

export const ExternalTeam: Model<IExternalTeam> =
  mongoose.models.ExternalTeam || mongoose.model<IExternalTeam>("ExternalTeam", ExternalTeamSchema);
