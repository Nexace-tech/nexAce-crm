import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaveRequest extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  type: "Sick" | "Casual" | "Earned" | "Unpaid" | "Maternity" | "Paternity";
  startDate: Date;
  endDate: Date;
  reason: string;
  isHalfDay?: boolean;
  halfDayType?: "First Half" | "Second Half";
  balanceDeducted?: number;
  status: "Pending" | "Approved" | "Rejected";
  approvedBy?: mongoose.Types.ObjectId;
  approverName?: string;
  rejectionReason?: string;
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
    isHalfDay: { type: Boolean, default: false },
    halfDayType: { type: String, enum: ["First Half", "Second Half"] },
    balanceDeducted: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approverName: { type: String, trim: true },
    rejectionReason: { type: String, default: "", trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ tenantId: 1, status: 1 });
LeaveRequestSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

// Invalidate cache if schema updated in dev / hot-reload
if (mongoose.models.LeaveRequest && !mongoose.models.LeaveRequest.schema.path("isHalfDay")) {
  delete mongoose.models.LeaveRequest;
}

export const LeaveRequest: Model<ILeaveRequest> =
  mongoose.models.LeaveRequest || mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
