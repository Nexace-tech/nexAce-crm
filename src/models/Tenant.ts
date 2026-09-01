import mongoose, { Schema, Document, Model } from "mongoose";

export interface IShiftConfig {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface ICompanyBankDetails {
  bankName?: string;
  accountName?: string;
  accountNo?: string;
  ifscCode?: string;
  branch?: string;
  upiId?: string;
}

export interface ICompanySocialLinks {
  linkedin?: string;
  twitter?: string;
  github?: string;
  facebook?: string;
  youtube?: string;
}

export interface ITenant extends Document {
  name: string;
  slug: string;
  logoUrl?: string;
  tagline?: string;
  legalName?: string;
  registrationNumber?: string;
  entityType?: string;
  email?: string;
  billingEmail?: string;
  phone?: string;
  tollFreePhone?: string;
  website?: string;
  taxId?: string;
  industry?: string;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  bankDetails?: ICompanyBankDetails;
  socialLinks?: ICompanySocialLinks;
  allowedExtensions?: string[];
  customShifts?: IShiftConfig[];
  employmentTypes?: string[];
  createdAt: Date;
}

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  logoUrl: { type: String, default: "" },
  tagline: { type: String, default: "" },
  legalName: { type: String, default: "" },
  registrationNumber: { type: String, default: "" },
  entityType: { type: String, default: "Private Limited Company" },
  email: { type: String, default: "" },
  billingEmail: { type: String, default: "" },
  phone: { type: String, default: "" },
  tollFreePhone: { type: String, default: "" },
  website: { type: String, default: "" },
  taxId: { type: String, default: "" },
  industry: { type: String, default: "IT & Software Services" },
  currency: { type: String, default: "INR" },
  timezone: { type: String, default: "Asia/Kolkata (IST +05:30)" },
  dateFormat: { type: String, default: "YYYY-MM-DD" },
  address: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  country: { type: String, default: "India" },
  postalCode: { type: String, default: "" },
  bankDetails: {
    bankName: { type: String, default: "" },
    accountName: { type: String, default: "" },
    accountNo: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    branch: { type: String, default: "" },
    upiId: { type: String, default: "" },
  },
  socialLinks: {
    linkedin: { type: String, default: "" },
    twitter: { type: String, default: "" },
    github: { type: String, default: "" },
    facebook: { type: String, default: "" },
    youtube: { type: String, default: "" },
  },
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
}, { strict: false });

delete (mongoose.models as any).Tenant;
export const Tenant: Model<ITenant> = mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);
