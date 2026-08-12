import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHRResourceAllocation extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  employeeName: string;
  role: string;
  department: string;
  assignedProject: string;
  allocatedHoursPerWeek: number;
  utilizationRate: number;
  status: "Deployed" | "Partially Allocated" | "Bench" | "On Leave";
  startDate: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HRResourceAllocationSchema = new Schema<IHRResourceAllocation>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employeeName: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "Engineering" },
    assignedProject: { type: String, trim: true, default: "Unassigned" },
    allocatedHoursPerWeek: { type: Number, default: 0, min: 0 },
    utilizationRate: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["Deployed", "Partially Allocated", "Bench", "On Leave"],
      default: "Bench",
    },
    startDate: { type: String, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

HRResourceAllocationSchema.index({ tenantId: 1, status: 1 });
HRResourceAllocationSchema.index({ tenantId: 1, createdAt: -1 });

export const HRResourceAllocation: Model<IHRResourceAllocation> =
  mongoose.models.HRResourceAllocation ||
  mongoose.model<IHRResourceAllocation>("HRResourceAllocation", HRResourceAllocationSchema);
