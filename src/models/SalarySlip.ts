import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISalarySlip extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  payPeriod: string;
  employmentType: string;
  designation?: string;
  department?: string;
  joiningDate?: Date;

  // Attendance Metrics
  totalDays: number;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;

  // Earnings
  baseSalary: number;
  basicPay: number;
  hra: number;
  specialAllowance: number;
  overtimePay: number;
  bonus: number;
  reimbursements: number;
  grossEarnings: number;

  // Deductions
  lossOfPayDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  totalDeductions: number;

  // Net Pay
  netPayable: number;

  // Disbursement & Banking
  paymentStatus: "Draft" | "Processing" | "Paid";
  disbursedAt?: Date;
  disbursedBy?: mongoose.Types.ObjectId;
  transactionReference?: string;
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifscCode?: string;
    upiId?: string;
  };
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const SalarySlipSchema = new Schema<ISalarySlip>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    payPeriod: { type: String, required: true },
    employmentType: { type: String, default: "Permanent", trim: true },
    designation: { type: String, default: "" },
    department: { type: String, default: "" },
    joiningDate: { type: Date },

    // Attendance Metrics
    totalDays: { type: Number, default: 30 },
    workingDays: { type: Number, default: 22 },
    presentDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },

    // Earnings
    baseSalary: { type: Number, required: true, default: 0 },
    basicPay: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    reimbursements: { type: Number, default: 0 },
    grossEarnings: { type: Number, required: true, default: 0 },

    // Deductions
    lossOfPayDeduction: { type: Number, default: 0 },
    taxDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },

    // Net
    netPayable: { type: Number, required: true, default: 0 },

    // Disbursement
    paymentStatus: {
      type: String,
      enum: ["Draft", "Processing", "Paid"],
      default: "Draft",
      index: true,
    },
    disbursedAt: { type: Date },
    disbursedBy: { type: Schema.Types.ObjectId, ref: "User" },
    transactionReference: { type: String, default: "", trim: true },
    bankDetails: {
      bankName: { type: String, default: "" },
      accountNo: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      upiId: { type: String, default: "" },
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// One slip per user per month per tenant
SalarySlipSchema.index({ tenantId: 1, userId: 1, year: 1, month: 1 }, { unique: true });
SalarySlipSchema.index({ tenantId: 1, year: 1, month: 1 });

if (mongoose.models.SalarySlip && !mongoose.models.SalarySlip.schema.path("netPayable")) {
  delete mongoose.models.SalarySlip;
}

export const SalarySlip: Model<ISalarySlip> =
  mongoose.models.SalarySlip || mongoose.model<ISalarySlip>("SalarySlip", SalarySlipSchema);
