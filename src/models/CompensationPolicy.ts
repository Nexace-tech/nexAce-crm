import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAllowancePreset {
  id: string;
  name: string;
  type: "fixed" | "percentage";
  value: number; // percentage of base or fixed amount
  isDefault: boolean;
  targetEmploymentType?: "All" | "Permanent" | "Contractor" | "Part-Time" | "Intern";
  description?: string;
}

export interface IDeductionPreset {
  id: string;
  name: string;
  type: "fixed" | "percentage";
  value: number;
  isDefault: boolean;
  targetEmploymentType?: "All" | "Permanent" | "Contractor" | "Part-Time" | "Intern";
  description?: string;
}

export interface IOtherCharge {
  id: string;
  name: string;
  type: "fixed" | "percentage";
  value: number;
  isAddition: boolean; // true = extra fee/credit to employee, false = surcharge/penalty deduction
  description?: string;
}

export interface ILopFormulaConfig {
  divisorMode: "calendar_days" | "working_days" | "fixed_30" | "fixed_26" | "custom_divisor";
  customDivisorDays?: number; // used when divisorMode === 'custom_divisor'
  graceAbsenceDays: number; // 0 = no grace, 1+ days absent before LOP applies
  autoCalculateLop: boolean;
}

export interface IOvertimeRulesConfig {
  standardMultiplier: number; // e.g. 1.5x
  weekendMultiplier: number; // e.g. 2.0x
  holidayMultiplier: number; // e.g. 2.0x
  monthlyCapHours: number; // 0 = unlimited
  allowEmployeeOtClaim: boolean;
}

export interface ITaxRulesConfig {
  defaultTaxRate: number; // default percentage (e.g. 0% salaried, 18% GST contractor)
  taxMode: "exclusive" | "inclusive" | "tds_withholding" | "exempt";
  tdsRate: number; // e.g. 1% or 10%
  taxLabel: string; // e.g. "GST", "VAT", "TDS"
  enforcePfWageCap?: boolean; // ₹15,000 basic cap for PF
  enforceEsiCeiling?: boolean; // ₹21,000 gross ceiling for ESI
}

export interface ICompensationPolicy extends Document {
  tenantId: mongoose.Types.ObjectId;
  enabled: boolean; // Master policy toggle
  lopFormula: ILopFormulaConfig;
  overtimeRules: IOvertimeRulesConfig;
  taxRules: ITaxRulesConfig;
  allowancePresets: IAllowancePreset[];
  deductionPresets: IDeductionPreset[];
  otherCharges: IOtherCharge[];
  currency: string;
  notes?: string;
  updatedBy?: {
    userId?: mongoose.Types.ObjectId;
    userName?: string;
    role?: string;
    date?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AllowancePresetSchema = new Schema<IAllowancePreset>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    value: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    targetEmploymentType: {
      type: String,
      enum: ["All", "Permanent", "Contractor", "Part-Time", "Intern"],
      default: "All",
    },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const DeductionPresetSchema = new Schema<IDeductionPreset>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    value: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    targetEmploymentType: {
      type: String,
      enum: ["All", "Permanent", "Contractor", "Part-Time", "Intern"],
      default: "All",
    },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const OtherChargeSchema = new Schema<IOtherCharge>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    value: { type: Number, default: 0 },
    isAddition: { type: Boolean, default: false },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const CompensationPolicySchema = new Schema<ICompensationPolicy>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    enabled: { type: Boolean, default: true },
    lopFormula: {
      divisorMode: {
        type: String,
        enum: ["calendar_days", "working_days", "fixed_30", "fixed_26", "custom_divisor"],
        default: "calendar_days",
      },
      customDivisorDays: { type: Number, default: 30 },
      graceAbsenceDays: { type: Number, default: 0 },
      autoCalculateLop: { type: Boolean, default: true },
    },
    overtimeRules: {
      standardMultiplier: { type: Number, default: 1.5 },
      weekendMultiplier: { type: Number, default: 2.0 },
      holidayMultiplier: { type: Number, default: 2.0 },
      monthlyCapHours: { type: Number, default: 40 },
      allowEmployeeOtClaim: { type: Boolean, default: true },
    },
    taxRules: {
      defaultTaxRate: { type: Number, default: 0 },
      taxMode: {
        type: String,
        enum: ["exclusive", "inclusive", "tds_withholding", "exempt"],
        default: "exclusive",
      },
      tdsRate: { type: Number, default: 10 },
      taxLabel: { type: String, default: "GST" },
      enforcePfWageCap: { type: Boolean, default: false },
      enforceEsiCeiling: { type: Boolean, default: true },
    },
    allowancePresets: { type: [AllowancePresetSchema], default: [] },
    deductionPresets: { type: [DeductionPresetSchema], default: [] },
    otherCharges: { type: [OtherChargeSchema], default: [] },
    currency: { type: String, default: "INR" },
    notes: { type: String, default: "" },
    updatedBy: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, default: "" },
      role: { type: String, default: "" },
      date: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

CompensationPolicySchema.index({ tenantId: 1 });

if (mongoose.models && mongoose.models.CompensationPolicy) {
  delete (mongoose.models as any).CompensationPolicy;
}

export const CompensationPolicy: Model<ICompensationPolicy> =
  mongoose.models.CompensationPolicy ||
  mongoose.model<ICompensationPolicy>("CompensationPolicy", CompensationPolicySchema);

