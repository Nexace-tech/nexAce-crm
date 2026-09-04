import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILeadHistory {
  fromStatus?: string;
  toStatus: string;
  fromStage?: string;
  toStage?: string;
  changedBy?: mongoose.Types.ObjectId;
  changedByName?: string;
  notes?: string;
  timestamp: Date;
}

export interface ILead extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  leadName: string;
  companyName: string;
  phone: string;
  email?: string;
  status: "New" | "Contacted" | "Qualified" | "Proposal" | "Negotiation" | "Closed" | "Lost";
  stage: "Inpipeline" | "Follow Up" | "Schedule Service" | "Conversation";
  leadType?: "Internal" | "External";
  source?: string;
  owner?: string;
  venture?: string;
  location?: string;
  value?: number;
  currency?: string;
  notes?: string;
  history?: ILeadHistory[];
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    leadName: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Closed", "Lost"],
      default: "New",
    },
    stage: {
      type: String,
      enum: ["Inpipeline", "Follow Up", "Schedule Service", "Conversation"],
      default: "Inpipeline",
    },
    leadType: {
      type: String,
      enum: ["Internal", "External"],
      default: "External",
    },
    source: { type: String, trim: true, default: "" },
    owner: { type: String, trim: true, default: "" },
    venture: { type: String, trim: true, default: "Ace Consultancys" },
    location: { type: String, trim: true, default: "" },
    value: { type: Number, default: 0 },
    currency: { type: String, trim: true, default: "USD" },
    notes: { type: String, trim: true, default: "" },
    history: [
      {
        fromStatus: { type: String, trim: true },
        toStatus: { type: String, trim: true },
        fromStage: { type: String, trim: true },
        toStage: { type: String, trim: true },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        changedByName: { type: String, trim: true },
        notes: { type: String, trim: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

LeadSchema.index({ tenantId: 1, status: 1 });
LeadSchema.index({ tenantId: 1, stage: 1 });

export const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>("Lead", LeadSchema);
