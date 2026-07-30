import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHRCaseComment {
  userId: mongoose.Types.ObjectId;
  userName: string;
  content: string;
  createdAt: Date;
}

export interface IHRCase extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  category: "Payroll" | "IT Access" | "Policy Query" | "Benefits" | "Other";
  subject: string;
  description: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High";
  assignedTo?: mongoose.Types.ObjectId;
  assignedName?: string;
  comments: IHRCaseComment[];
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HRCaseSchema = new Schema<IHRCase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Payroll", "IT Access", "Policy Query", "Benefits", "Ask your Manager", "Other"],
      default: "Other",
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Closed"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    assignedName: { type: String, trim: true },
    comments: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        userName: { type: String, required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

HRCaseSchema.index({ tenantId: 1, status: 1 });
HRCaseSchema.index({ tenantId: 1, userId: 1 });

export const HRCase: Model<IHRCase> =
  mongoose.models.HRCase || mongoose.model<IHRCase>("HRCase", HRCaseSchema);
