import mongoose, { Schema, Document } from "mongoose";

export interface IFinanceInvoice extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  invoiceNo: string;
  client: string;
  amount: number;
  currency: string;
  status: "Draft" | "Pending" | "Paid" | "Overdue" | "Cancelled";
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
  createdAt: Date;
  updatedAt: Date;
}

const FinanceInvoiceSchema = new Schema<IFinanceInvoice>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    invoiceNo: { type: String, required: true },
    client: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["Draft", "Pending", "Paid", "Overdue", "Cancelled"],
      default: "Pending",
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
  },
  { timestamps: true }
);

export const FinanceInvoice =
  mongoose.models.FinanceInvoice ||
  mongoose.model<IFinanceInvoice>("FinanceInvoice", FinanceInvoiceSchema);
