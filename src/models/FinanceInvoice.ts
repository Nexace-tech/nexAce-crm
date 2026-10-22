import mongoose, { Schema, Document } from "mongoose";

export interface IFinanceInvoiceTimelineEvent {
  stage: "SUBMITTED" | "APPROVED" | "REJECTED" | "RE_INITIATED" | "PAID";
  status: string;
  actorName: string;
  actorRole: string;
  actorId?: mongoose.Types.ObjectId;
  note?: string;
  timestamp: Date | string;
}

export interface IInvoiceObjection {
  category: string;
  itemRef?: string;
  remark: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface IFinanceInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  invoiceNo: string;
  client: string;
  amount: number;
  currency: string;
  status: "Draft" | "Pending" | "Approved" | "Rejected" | "Paid" | "Overdue" | "Cancelled";
  approvalStage?: "DRAFT" | "PENDING_REVIEW" | "PENDING_PAYMENT" | "PAID" | "REJECTED" | "CANCELLED";
  issuedDate: string;
  dueDate: string;
  category: string;
  venture: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  notes?: string;
  signatureUrl?: string;
  shiftAttendance?: any;
  timesheetEntries?: any;
  targetUserId?: mongoose.Types.ObjectId;
  billedToName?: string;
  businessName?: string;
  businessEmail?: string;
  customerNo?: string;
  preferredPaymentMethod?: "Bank Transfer" | "UPI" | "Cash" | "Credit Card" | "Cheque";
  approvedBy?: string;
  approvedAt?: string;
  approverRole?: string;
  rejectionReason?: string;
  rejectionRemark?: string;
  objections?: IInvoiceObjection[];
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionHistory?: Array<{
    reason: string;
    remark?: string;
    objections?: IInvoiceObjection[];
    rejectedBy: string;
    rejectedAt: Date | string;
    role: string;
  }>;
  revisionCount?: number;
  timeline?: IFinanceInvoiceTimelineEvent[];
  bankDetails?: {
    accountName?: string;
    bankName?: string;
    accountNo?: string;
    ifscCode?: string;
    branch?: string;
    upiId?: string;
  };
  paymentDetails?: {
    method: "Bank Transfer" | "UPI" | "Cash" | "Credit Card" | "Cheque";
    upiId?: string;
    fromUpiId?: string;
    toUpiId?: string;
    transactionId?: string;
    screenshotUrl?: string;
    screenshotFileId?: string;
    screenshotFileName?: string;
    paidAt?: Date;
    paidBy?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FinanceInvoiceSchema = new Schema<IFinanceInvoice>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    invoiceNo: { type: String, required: true },
    client: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["Draft", "Pending", "Approved", "Rejected", "Paid", "Overdue", "Cancelled"],
      default: "Pending",
    },
    approvalStage: {
      type: String,
      enum: ["DRAFT", "PENDING_REVIEW", "PENDING_PAYMENT", "PAID", "REJECTED", "CANCELLED"],
      default: "PENDING_REVIEW",
    },
    issuedDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    category: { type: String, default: "Services" },
    venture: { type: String, default: "Ace Consultancys" },
    lineItems: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        amount: Number,
      },
    ],
    notes: { type: String },
    signatureUrl: { type: String, default: "" },
    shiftAttendance: { type: Schema.Types.Mixed, default: null },
    timesheetEntries: { type: Schema.Types.Mixed, default: null },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    billedToName: { type: String, default: "" },
    businessName: { type: String, default: "" },
    businessEmail: { type: String, default: "" },
    customerNo: { type: String, default: "" },
    preferredPaymentMethod: {
      type: String,
      enum: ["Bank Transfer", "UPI", "Cash", "Credit Card", "Cheque"],
      default: "Bank Transfer",
    },
    approvedBy: { type: String, default: "" },
    approvedAt: { type: String, default: "" },
    approverRole: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    rejectionRemark: { type: String, default: "" },
    objections: [
      {
        category: { type: String, required: true },
        itemRef: { type: String, default: "" },
        remark: { type: String, required: true },
        attachmentUrl: { type: String, default: "" },
        attachmentName: { type: String, default: "" },
      },
    ],
    rejectedBy: { type: String, default: "" },
    rejectedAt: { type: String, default: "" },
    rejectionHistory: [
      {
        reason: { type: String, required: true },
        remark: { type: String, default: "" },
        objections: [
          {
            category: { type: String, required: true },
            itemRef: { type: String, default: "" },
            remark: { type: String, required: true },
            attachmentUrl: { type: String, default: "" },
            attachmentName: { type: String, default: "" },
          },
        ],
        rejectedBy: { type: String, required: true },
        rejectedAt: { type: Date, default: Date.now },
        role: { type: String, default: "Admin" },
      },
    ],
    revisionCount: { type: Number, default: 0 },
    timeline: [
      {
        stage: { type: String, required: true },
        status: { type: String, required: true },
        actorName: { type: String, required: true },
        actorRole: { type: String, required: true },
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        note: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    bankDetails: {
      accountName: { type: String, default: "", trim: true },
      bankName: { type: String, default: "", trim: true },
      accountNo: { type: String, default: "", trim: true },
      ifscCode: { type: String, default: "", trim: true },
      branch: { type: String, default: "", trim: true },
      upiId: { type: String, default: "", trim: true },
    },
    paymentDetails: {
      method: { type: String, enum: ["Bank Transfer", "UPI", "Cash", "Credit Card", "Cheque"], default: null },
      upiId: { type: String, default: "" },
      fromUpiId: { type: String, default: "" },
      toUpiId: { type: String, default: "" },
      transactionId: { type: String, default: "" },
      screenshotUrl: { type: String, default: "" },
      screenshotFileId: { type: String, default: "" },
      screenshotFileName: { type: String, default: "" },
      paidAt: { type: Date },
      paidBy: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

if (mongoose.models.FinanceInvoice) {
  delete (mongoose.models as any).FinanceInvoice;
}

export const FinanceInvoice =
  mongoose.models.FinanceInvoice ||
  mongoose.model<IFinanceInvoice>("FinanceInvoice", FinanceInvoiceSchema);
