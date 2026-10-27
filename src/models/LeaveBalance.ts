import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeaveCategoryBalance {
  allocated: number;
  used: number;
  pending: number;
}

export interface ILeaveBalance extends Document {
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  year: number;
  casualLeave: ILeaveCategoryBalance;
  sickLeave: ILeaveCategoryBalance;
  earnedLeave: ILeaveCategoryBalance;
  compOff: ILeaveCategoryBalance;
  unpaidLeave: { used: number };
  createdAt: Date;
  updatedAt: Date;
}

const LeaveCategorySchema = new Schema(
  {
    allocated: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 },
    pending: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    year: { type: Number, required: true, default: () => new Date().getFullYear(), index: true },
    casualLeave: {
      type: LeaveCategorySchema,
      default: () => ({ allocated: 12, used: 0, pending: 0 }),
    },
    sickLeave: {
      type: LeaveCategorySchema,
      default: () => ({ allocated: 10, used: 0, pending: 0 }),
    },
    earnedLeave: {
      type: LeaveCategorySchema,
      default: () => ({ allocated: 15, used: 0, pending: 0 }),
    },
    compOff: {
      type: LeaveCategorySchema,
      default: () => ({ allocated: 0, used: 0, pending: 0 }),
    },
    unpaidLeave: {
      used: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true }
);

// Ensure one ledger document per employee per tenant per calendar year
LeaveBalanceSchema.index({ tenantId: 1, userId: 1, year: 1 }, { unique: true });

// Dev / Hot-reload model invalidation
if (mongoose.models.LeaveBalance && !mongoose.models.LeaveBalance.schema.path("casualLeave")) {
  delete mongoose.models.LeaveBalance;
}

export const LeaveBalance: Model<ILeaveBalance> =
  mongoose.models.LeaveBalance || mongoose.model<ILeaveBalance>("LeaveBalance", LeaveBalanceSchema);
