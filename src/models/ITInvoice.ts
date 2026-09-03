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

export interface IITInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
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
  status: "Draft" | "Sent" | "Pending" | "Paid" | "Overdue" | "Archived" | "Cancelled";
  notes?: string;
  // Payment confirmation details (captured when admin marks as Paid)
  paymentDetails?: {
    method: "Bank Transfer" | "UPI" | "Cash";
    upiId?: string;
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
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
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
      enum: ["Draft", "Sent", "Pending", "Paid", "Overdue", "Archived", "Cancelled"],
      default: "Draft",
    },
    notes: { type: String, trim: true, default: "" },
    paymentDetails: {
      method: { type: String, enum: ["Bank Transfer", "UPI", "Cash"], default: null },
      upiId: { type: String, default: "" },
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
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ITInvoiceSchema.index({ tenantId: 1, invoiceNo: 1 }, { unique: true, sparse: true });
ITInvoiceSchema.index({ tenantId: 1, status: 1 });
ITInvoiceSchema.index({ tenantId: 1, createdAt: -1 });

export const ITInvoice: Model<IITInvoice> =
  mongoose.models.ITInvoice || mongoose.model<IITInvoice>("ITInvoice", ITInvoiceSchema);
