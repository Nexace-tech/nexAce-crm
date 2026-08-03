import mongoose, { Schema, Document, Model } from "mongoose";

export interface IShiftConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface ITenant extends Document {
  name: string;
  slug: string;
  allowedExtensions?: string[];
  customShifts?: IShiftConfig[];
  employmentTypes?: string[];
  createdAt: Date;
}

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  allowedExtensions: {
    type: [String],
    default: ["png", "jpg", "jpeg", "pdf", "docx", "xlsx", "zip", "csv", "txt", "svg", "webp"],
  },
  customShifts: [
    {
      id: { type: String },
      name: { type: String },
      startTime: { type: String },
      endTime: { type: String },
      description: { type: String }
    }
  ],
  employmentTypes: {
    type: [String],
    default: ["Permanent", "Freelancer", "Part-Time", "Contractor", "Intern"]
  },
  createdAt: { type: Date, default: Date.now }
});

export const Tenant: Model<ITenant> = mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);
