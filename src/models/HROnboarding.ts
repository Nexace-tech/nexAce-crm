import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChecklistItem {
  id: string;
  title: string;
  category: "Document" | "NDA" | "KRA Sign-off" | "IT Asset" | "Access" | "Other";
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
}

export interface IHROnboarding extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
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
    enum: ["Document", "NDA", "KRA Sign-off", "IT Asset", "Access", "Other"],
    default: "Document",
  },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  completedBy: { type: String },
  notes: { type: String, default: "" },
});

const HROnboardingSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
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

export const HROnboarding: Model<IHROnboarding> =
  mongoose.models.HROnboarding ||
  mongoose.model<IHROnboarding>("HROnboarding", HROnboardingSchema);
