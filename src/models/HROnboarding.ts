import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChecklistItem {
  id: string;
  title: string;
  category: "Document" | "NDA" | "KRA Sign-off" | "IT Asset" | "Access" | "Contract" | "Compliance" | "Other";
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  documentUrl?: string;
  documentName?: string;
}

export interface IContractDetails {
  contractStartDate?: Date;
  contractEndDate?: Date;
  hourlyRate?: number;
  dailyRate?: number;
  currency?: string;
  sowReference?: string;
  renewalDate?: Date;
  billingCycle?: "Hourly" | "Daily" | "Weekly" | "Monthly" | "Milestone";
}

export interface IHROnboarding extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  employmentType?: "Permanent" | "Freelancer" | "Part-Time" | "Contractor" | "Intern";
  contractDetails?: IContractDetails;
  type: "Onboarding" | "Offboarding";
  status: "In Progress" | "Completed" | "Pending Review";
  startDate: Date;
  dueDate?: Date;
  completedDate?: Date;
  items: IChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  category: {
    type: String,
    enum: ["Document", "NDA", "KRA Sign-off", "IT Asset", "Access", "Contract", "Compliance", "Other"],
    default: "Document",
  },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  completedBy: { type: String },
  notes: { type: String, default: "" },
  documentUrl: { type: String },
  documentName: { type: String },
});

const HROnboardingSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    employmentType: {
      type: String,
      enum: ["Permanent", "Freelancer", "Part-Time", "Contractor", "Intern"],
      default: "Permanent",
    },
    contractDetails: {
      contractStartDate: { type: Date },
      contractEndDate: { type: Date },
      hourlyRate: { type: Number },
      dailyRate: { type: Number },
      currency: { type: String, default: "USD" },
      sowReference: { type: String },
      renewalDate: { type: Date },
      billingCycle: {
        type: String,
        enum: ["Hourly", "Daily", "Weekly", "Monthly", "Milestone"],
        default: "Monthly",
      },
    },
    type: { type: String, enum: ["Onboarding", "Offboarding"], required: true },
    status: {
      type: String,
      enum: ["In Progress", "Completed", "Pending Review"],
      default: "In Progress",
    },
    startDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    completedDate: { type: Date },
    items: [ChecklistItemSchema],
  },
  { timestamps: true }
);

HROnboardingSchema.index({ tenantId: 1, userId: 1, type: 1 });

if (mongoose.models && mongoose.models.HROnboarding) {
  delete (mongoose.models as any).HROnboarding;
}

export const HROnboarding: Model<IHROnboarding> =
  mongoose.models.HROnboarding ||
  mongoose.model<IHROnboarding>("HROnboarding", HROnboardingSchema);
