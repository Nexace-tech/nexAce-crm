import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaveRequest extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  type: "Sick" | "Casual" | "Earned" | "Unpaid" | "Maternity" | "Paternity";
  startDate: Date;
  endDate: Date;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  approvedBy?: mongoose.Types.ObjectId;
  approverName?: string;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["Sick", "Casual", "Earned", "Unpaid", "Maternity", "Paternity"],
      default: "Casual",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approverName: { type: String, trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ tenantId: 1, status: 1 });
LeaveRequestSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

export const LeaveRequest: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest || mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
