import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITimeEntry extends Document {
  userId: mongoose.Types.ObjectId;
  project: string;
  taskName: string;
  hours: number;
  date: Date;
  isBillable: boolean;
  status: "Draft" | "Pending" | "Approved" | "Rejected";
  approvedBy?: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    project: { type: String, required: true, trim: true },
    taskName: { type: String, required: true, trim: true },
    hours: { type: Number, required: true, min: 0.1, max: 24 },
    date: { type: Date, required: true },
    isBillable: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["Draft", "Pending", "Approved", "Rejected"],
      default: "Draft",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance indexes for timesheets & approval workflows
TimeEntrySchema.index({ tenantId: 1, userId: 1, date: -1 });
TimeEntrySchema.index({ tenantId: 1, status: 1 });

export const TimeEntry: Model<ITimeEntry> =
  mongoose.models.TimeEntry || mongoose.model<ITimeEntry>("TimeEntry", TimeEntrySchema);
