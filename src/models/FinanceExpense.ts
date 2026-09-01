import mongoose, { Schema, Document } from "mongoose";

export interface IFinanceExpense extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string;
  department: string;
  venture: string;
  status: "Approved" | "Pending" | "Rejected";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FinanceExpenseSchema = new Schema<IFinanceExpense>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    category: { type: String, required: true, default: "Operations" },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "USD" },
    date: { type: String, required: true },
    paidBy: { type: String, default: "" },
    department: { type: String, default: "General" },
    venture: { type: String, default: "Ace Consultancys" },
    status: {
      type: String,
      enum: ["Approved", "Pending", "Rejected"],
      default: "Pending",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export const FinanceExpense =
  mongoose.models.FinanceExpense ||
  mongoose.model<IFinanceExpense>("FinanceExpense", FinanceExpenseSchema);
