import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContactLog {
  _id?: string;
  date: Date;
  type: "Email" | "Call" | "Meeting" | "Note";
  summary: string;
  authorName: string;
}

export interface IClient extends Document {
  // New Operations/Projects Schema fields
  projectId: string; // CLP-001, etc.
  clientAccount: string; // Client/Account
  venture: string; // Ace Consultancys, etc.
  projectName: string; // Project Name
  deliveryOwner: string; // Account/Delivery Owner
  phase: "In Delivery" | "Closed - follow" | "On Hold" | "Closed - Not" | "Closed";
  priority: "High" | "Medium" | "Low";
  startDate: Date;
  targetEndDate: Date;
  health: "Green" | "Amber" | "Red";
  billingType: "Retainer" | "Project" | "Per-word" | "Per-hour" | string;
  estHours: number;
  actualHours: number;
  progressPercent: number; // % Tasks Complete

  // Old fields for compatibility
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  status?: "Active" | "Lead" | "On Hold" | "Archived";
  pipelineStage?: "Lead" | "Negotiation" | "Active Retainer" | "On Hold" | "Closed";
  retainerHours?: number;
  usedHours?: number;
  monthlyValue?: number;
  renewalDate?: Date;
  notes?: string;
  contactHistory: IContactLog[];
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    // New fields
    projectId: { type: String, required: true, trim: true, default: "CLP-001" },
    clientAccount: { type: String, required: true, trim: true },
    venture: { type: String, required: true, trim: true, default: "Ace Consultancys" },
    projectName: { type: String, required: true, trim: true },
    deliveryOwner: { type: String, required: true, trim: true },
    phase: {
      type: String,
      enum: ["In Delivery", "Closed - follow", "On Hold", "Closed - Not", "Closed"],
      default: "In Delivery",
    },
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"],
      default: "Medium",
    },
    startDate: { type: Date, required: true, default: Date.now },
    targetEndDate: { type: Date, required: true, default: Date.now },
    health: {
      type: String,
      enum: ["Green", "Amber", "Red"],
      default: "Green",
    },
    billingType: { type: String, default: "Retainer" },
    estHours: { type: Number, default: 0 },
    actualHours: { type: Number, default: 0 },
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },

    // Old fields (for backwards compatibility)
    name: { type: String, trim: true },
    company: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Active", "Lead", "On Hold", "Archived"],
      default: "Active",
    },
    pipelineStage: {
      type: String,
      enum: ["Lead", "Negotiation", "Active Retainer", "On Hold", "Closed"],
      default: "Active Retainer",
    },
    retainerHours: { type: Number, default: 0 },
    usedHours: { type: Number, default: 0 },
    monthlyValue: { type: Number, default: 0 },
    renewalDate: { type: Date },
    notes: { type: String, trim: true },
    contactHistory: [
      {
        date: { type: Date, default: Date.now },
        type: {
          type: String,
          enum: ["Email", "Call", "Meeting", "Note"],
          default: "Note",
        },
        summary: { type: String, required: true },
        authorName: { type: String, required: true },
      },
    ],
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

ClientSchema.index({ tenantId: 1, phase: 1 });
ClientSchema.index({ tenantId: 1, projectId: 1 });

export const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
