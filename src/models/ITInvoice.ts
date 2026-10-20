import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IShiftAttendanceRecord {
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: number;
  status: string;
}

export interface ITimesheetEntry {
  date: string;
  hours: number;
  projectName: string;
  taskDescription: string;
  billable: boolean;
}

export interface IInvoiceTimelineEvent {
  stage: "SUBMITTED" | "HR_APPROVED" | "HR_REJECTED" | "RE_INITIATED" | "ADMIN_APPROVED" | "ADMIN_REJECTED" | "PAID";
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

export interface IRejectionHistoryItem {
  reason: string;
  remark?: string;
  objections?: IInvoiceObjection[];
  rejectedBy: string;
  rejectedAt: Date | string;
  role: string;
}

export interface IITInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
  subscriptionId?: mongoose.Types.ObjectId;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerNo: string;
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  billedToName: string;
  billedToAddress: string;
  billedToEmail: string;
  shipToAddress?: string;
  items: IInvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: "Draft" | "Sent" | "Pending" | "Approved" | "Rejected" | "Paid" | "Overdue" | "Archived" | "Cancelled";
  approvalStage?: "DRAFT" | "PENDING_HR" | "PENDING_ADMIN" | "PAID" | "REJECTED" | "CANCELLED";
  paidDate?: string;
  notes?: string;
  // Payment confirmation details (captured when admin marks as Paid)
  paymentDetails?: {
    method: "Bank Transfer" | "UPI" | "Cash";
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
  // Structured shift clock & timesheet attachment data
  shiftAttendance?: {
    totalHours: number;
    daysWorked: number;
    overtimeHours: number;
    records: IShiftAttendanceRecord[];
  };
  timesheetEntries?: {
    totalHours: number;
    totalEntries: number;
    records: ITimesheetEntry[];
  };
  signatureUrl?: string;
  approvedBy?: string;    // Name of user who approved
  approvedAt?: string;    // ISO timestamp of approval
  approverRole?: "HR" | "Admin" | "OPS";
  rejectionReason?: string;
  rejectionRemark?: string;
  objections?: IInvoiceObjection[];
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionHistory?: IRejectionHistoryItem[];
  revisionCount?: number;
  hrReview?: {
    reviewedBy?: string;
    reviewedById?: mongoose.Types.ObjectId;
    reviewedAt?: Date | string;
    verifiedHours?: number;
    notes?: string;
  };
  timeline?: IInvoiceTimelineEvent[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unitPrice: { type: Number, required: true, default: 0 },
  amount: { type: Number, required: true, default: 0 },
});

const ShiftRecordSchema = new Schema<IShiftAttendanceRecord>({
  date: { type: String },
  clockIn: { type: String },
  clockOut: { type: String },
  totalHours: { type: Number, default: 0 },
  status: { type: String, default: "Present" },
}, { _id: false });

const TimesheetEntrySchema = new Schema<ITimesheetEntry>({
  date: { type: String },
  hours: { type: Number, default: 0 },
  projectName: { type: String, default: "" },
  taskDescription: { type: String, default: "" },
  billable: { type: Boolean, default: true },
}, { _id: false });

const ITInvoiceSchema = new Schema<IITInvoice>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "ITSubscription", default: null, index: true },
    invoiceNo: { type: String, required: true, trim: true },
    invoiceDate: { type: String, required: true, default: () => new Date().toISOString().slice(0, 10) },
    dueDate: { type: String, required: true, default: () => new Date().toISOString().slice(0, 10) },
    customerNo: { type: String, trim: true, default: "" },
    businessName: { type: String, trim: true, default: "Hencework" },
    businessAddress: { type: String, trim: true, default: "4747, Pearl Street\nRainy Day Drive, Washington DC 42156" },
    businessEmail: { type: String, trim: true, default: "jampack_01@hencework.com" },
    billedToName: { type: String, required: true, trim: true },
    billedToAddress: { type: String, trim: true, default: "" },
    billedToEmail: { type: String, trim: true, default: "" },
    shipToAddress: { type: String, trim: true, default: "" },
    items: { type: [InvoiceItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Pending", "Approved", "Rejected", "Paid", "Overdue", "Archived", "Cancelled"],
      default: "Draft",
    },
    approvalStage: {
      type: String,
      enum: ["DRAFT", "PENDING_HR", "PENDING_ADMIN", "PAID", "REJECTED", "CANCELLED"],
      default: "PENDING_HR",
    },
    paidDate: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    paymentDetails: {
      method: { type: String, enum: ["Bank Transfer", "UPI", "Cash"], default: null },
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
    shiftAttendance: {
      totalHours: { type: Number, default: 0 },
      daysWorked: { type: Number, default: 0 },
      overtimeHours: { type: Number, default: 0 },
      records: { type: [ShiftRecordSchema], default: [] },
    },
    timesheetEntries: {
      totalHours: { type: Number, default: 0 },
      totalEntries: { type: Number, default: 0 },
      records: { type: [TimesheetEntrySchema], default: [] },
    },
    signatureUrl: { type: String, default: "" },
    approvedBy: { type: String, default: "" },
    approvedAt: { type: String, default: "" },
    approverRole: { type: String, enum: ["HR", "Admin", "OPS", null], default: null },
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
        role: { type: String, default: "HR" },
      },
    ],
    revisionCount: { type: Number, default: 0 },
    hrReview: {
      reviewedBy: { type: String, default: "" },
      reviewedById: { type: Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
      verifiedHours: { type: Number, default: 0 },
      notes: { type: String, default: "" },
    },
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
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ITInvoiceSchema.index({ tenantId: 1, invoiceNo: 1 }, { unique: true, sparse: true });
ITInvoiceSchema.index({ tenantId: 1, status: 1 });
ITInvoiceSchema.index({ tenantId: 1, createdAt: -1 });

if (mongoose.models.ITInvoice) {
  delete (mongoose.models as any).ITInvoice;
}

export const ITInvoice: Model<IITInvoice> =
  mongoose.models.ITInvoice || mongoose.model<IITInvoice>("ITInvoice", ITInvoiceSchema);
