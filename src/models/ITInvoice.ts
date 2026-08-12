import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
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
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Pending", "Paid", "Overdue", "Archived", "Cancelled"],
      default: "Draft",
    },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ITInvoiceSchema.index({ tenantId: 1, invoiceNo: 1 }, { unique: true, sparse: true });
ITInvoiceSchema.index({ tenantId: 1, status: 1 });
ITInvoiceSchema.index({ tenantId: 1, createdAt: -1 });

export const ITInvoice: Model<IITInvoice> =
  mongoose.models.ITInvoice || mongoose.model<IITInvoice>("ITInvoice", ITInvoiceSchema);
