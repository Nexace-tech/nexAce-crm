import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  status: "Planning" | "In Progress" | "In Review" | "On Hold" | "Completed";
  priority?: "Low" | "Medium" | "High" | "Urgent";
  startDate?: Date;
  dueDate?: Date;
  cost?: number;
  isInternal?: boolean;
  requirements?: string;
  assignType?: "Member" | "Department";
  assignedDepartment?: string;
  members: mongoose.Types.ObjectId[];
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Planning", "In Progress", "In Review", "On Hold", "Completed"],
      default: "Planning",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    startDate: { type: Date },
    dueDate: { type: Date },
    cost: { type: Number, default: 0 },
    isInternal: { type: Boolean, default: false },
    requirements: { type: String, trim: true },
    assignType: { type: String, enum: ["Member", "Department"], default: "Member" },
    assignedDepartment: { type: String, trim: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance indexes for multi-tenant queries & member lookups
ProjectSchema.index({ tenantId: 1, createdAt: -1 });
ProjectSchema.index({ tenantId: 1, members: 1 });
ProjectSchema.index({ tenantId: 1, assignedDepartment: 1 });

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
