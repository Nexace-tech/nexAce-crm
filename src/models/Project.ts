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
  clientId?: mongoose.Types.ObjectId;
  clientAccount?: string;
  tenantId: mongoose.Types.ObjectId;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  deletedByName?: string;
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
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    clientAccount: { type: String, trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
    deletedByName: { type: String },
  },
  { timestamps: true }
);

// Performance indexes for multi-tenant queries & member lookups
ProjectSchema.index({ tenantId: 1, createdAt: -1 });
ProjectSchema.index({ tenantId: 1, members: 1 });
ProjectSchema.index({ tenantId: 1, assignedDepartment: 1 });
ProjectSchema.index({ tenantId: 1, isDeleted: 1 });

// TTL index: auto-purge soft-deleted projects after 30 days (2,592,000 seconds)
ProjectSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 2592000 });

if (mongoose.models && mongoose.models.Project && (!mongoose.models.Project.schema.path("isDeleted") || process.env.NODE_ENV !== "production")) {
  delete (mongoose.models as any).Project;
}

export const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
