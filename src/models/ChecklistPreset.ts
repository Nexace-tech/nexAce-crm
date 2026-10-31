import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPresetItem {
  id: string;
  title: string;
  category: "Document" | "NDA" | "KRA Sign-off" | "IT Asset" | "Access" | "Contract" | "Compliance" | "Other";
  required?: boolean;
}

export interface IChecklistPreset extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  targetEmploymentType?: "Permanent" | "Freelancer" | "Part-Time" | "Contractor" | "Intern" | "All";
  items: IPresetItem[];
  isSystemDefault?: boolean;
  createdBy?: {
    userId?: mongoose.Types.ObjectId;
    userName?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const PresetItemSchema = new Schema<IPresetItem>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Document", "NDA", "KRA Sign-off", "IT Asset", "Access", "Contract", "Compliance", "Other"],
      default: "Document",
    },
    required: { type: Boolean, default: true },
  },
  { _id: false }
);

const ChecklistPresetSchema = new Schema<IChecklistPreset>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    targetEmploymentType: {
      type: String,
      enum: ["Permanent", "Freelancer", "Part-Time", "Contractor", "Intern", "All"],
      default: "All",
    },
    items: { type: [PresetItemSchema], default: [] },
    isSystemDefault: { type: Boolean, default: false },
    createdBy: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, default: "System" },
    },
  },
  { timestamps: true }
);

ChecklistPresetSchema.index({ tenantId: 1, name: 1 });

export const ChecklistPreset: Model<IChecklistPreset> =
  mongoose.models.ChecklistPreset || mongoose.model<IChecklistPreset>("ChecklistPreset", ChecklistPresetSchema);

