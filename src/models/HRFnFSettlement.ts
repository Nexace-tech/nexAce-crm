import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFnFClearance {
  status: "Pending" | "Cleared";
  clearedBy?: string;
  clearedAt?: Date;
  notes?: string;
}

export interface IITClearance extends IFnFClearance {
  assetsReturned: boolean;
}

export interface IFinanceClearance extends IFnFClearance {
  claimsSettled: boolean;
}

export interface IHRClearance extends IFnFClearance {
  exitInterviewDone: boolean;
  idCardReturned: boolean;
}

export interface IHRFnFSettlement extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  department?: string;
  designation?: string;
  dateOfJoining?: Date;
  resignationDate: Date;
  lastWorkingDay: Date;
  noticePeriodDays: number;
  servedNoticeDays: number;
  noticeShortfallDays: number;
  monthlyGrossSalary: number;
  perDayRate: number;
  earnings: {
    unpaidSalaryDays: number;
    unpaidSalaryAmount: number;
    leaveEncashmentDays: number;
    leaveEncashmentAmount: number;
    gratuityAmount: number;
    statutoryBonus: number;
    reimbursements: number;
    totalEarnings: number;
  };
  deductions: {
    noticeShortfallAmount: number;
    assetLossDeduction: number;
    loanAdvanceRecovery: number;
    incomeTaxTds: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netSettlementPayable: number;
  clearances: {
    it: IITClearance;
    finance: IFinanceClearance;
    hr: IHRClearance;
  };
  settlementStatus: "Draft" | "Pending Clearances" | "Approved" | "Disbursed";
  disbursedAt?: Date;
  disbursedReference?: string;
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HRFnFSettlementSchema = new Schema<IHRFnFSettlement>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: "Engineering" },
    designation: { type: String, trim: true, default: "Employee" },
    dateOfJoining: { type: Date },
    resignationDate: { type: Date, required: true },
    lastWorkingDay: { type: Date, required: true },
    noticePeriodDays: { type: Number, default: 30 },
    servedNoticeDays: { type: Number, default: 30 },
    noticeShortfallDays: { type: Number, default: 0 },
    monthlyGrossSalary: { type: Number, default: 0 },
    perDayRate: { type: Number, default: 0 },
    earnings: {
      unpaidSalaryDays: { type: Number, default: 0 },
      unpaidSalaryAmount: { type: Number, default: 0 },
      leaveEncashmentDays: { type: Number, default: 0 },
      leaveEncashmentAmount: { type: Number, default: 0 },
      gratuityAmount: { type: Number, default: 0 },
      statutoryBonus: { type: Number, default: 0 },
      reimbursements: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
    },
    deductions: {
      noticeShortfallAmount: { type: Number, default: 0 },
      assetLossDeduction: { type: Number, default: 0 },
      loanAdvanceRecovery: { type: Number, default: 0 },
      incomeTaxTds: { type: Number, default: 0 },
      otherDeductions: { type: Number, default: 0 },
      totalDeductions: { type: Number, default: 0 },
    },
    netSettlementPayable: { type: Number, default: 0 },
    clearances: {
      it: {
        status: { type: String, enum: ["Pending", "Cleared"], default: "Pending" },
        clearedBy: { type: String, default: "" },
        clearedAt: { type: Date },
        assetsReturned: { type: Boolean, default: false },
        notes: { type: String, default: "" },
      },
      finance: {
        status: { type: String, enum: ["Pending", "Cleared"], default: "Pending" },
        clearedBy: { type: String, default: "" },
        clearedAt: { type: Date },
        claimsSettled: { type: Boolean, default: false },
        notes: { type: String, default: "" },
      },
      hr: {
        status: { type: String, enum: ["Pending", "Cleared"], default: "Pending" },
        clearedBy: { type: String, default: "" },
        clearedAt: { type: Date },
        exitInterviewDone: { type: Boolean, default: false },
        idCardReturned: { type: Boolean, default: false },
        notes: { type: String, default: "" },
      },
    },
    settlementStatus: {
      type: String,
      enum: ["Draft", "Pending Clearances", "Approved", "Disbursed"],
      default: "Pending Clearances",
      index: true,
    },
    disbursedAt: { type: Date },
    disbursedReference: { type: String, trim: true },
    remarks: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

HRFnFSettlementSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
HRFnFSettlementSchema.index({ tenantId: 1, createdAt: -1 });

if (mongoose.models.HRFnFSettlement && process.env.NODE_ENV !== "production") {
  delete (mongoose.models as any).HRFnFSettlement;
}

export const HRFnFSettlement: Model<IHRFnFSettlement> =
  mongoose.models.HRFnFSettlement || mongoose.model<IHRFnFSettlement>("HRFnFSettlement", HRFnFSettlementSchema);

