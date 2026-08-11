import mongoose, { Schema, Document, Model } from "mongoose";

export interface IITAccessEntry extends Document {
  tenantId: mongoose.Types.ObjectId;
  tool: string;
  category: string;
  assignee: string;
  role: string;
  accessLevel: string;
  dateGranted: string;
  status: "Active" | "Suspended" | "Pending" | "Revoked";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ITAccessEntrySchema = new Schema<IITAccessEntry>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    tool: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" },
    assignee: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "" },
    accessLevel: { type: String, trim: true, default: "Full Access" },
    dateGranted: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    status: {
      type: String,
      enum: ["Active", "Suspended", "Pending", "Revoked"],
      default: "Active",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ITAccessEntrySchema.index({ tenantId: 1, status: 1 });
ITAccessEntrySchema.index({ tenantId: 1, createdAt: -1 });

export const ITAccessEntry: Model<IITAccessEntry> =
  mongoose.models.ITAccessEntry || mongoose.model<IITAccessEntry>("ITAccessEntry", ITAccessEntrySchema);
