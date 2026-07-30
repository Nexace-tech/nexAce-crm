import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContactLog {
  _id?: string;
  date: Date;
  type: "Email" | "Call" | "Meeting" | "Note";
  summary: string;
  authorName: string;
}

export interface IClient extends Document {
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: "Active" | "Lead" | "On Hold" | "Archived";
  pipelineStage: "Lead" | "Negotiation" | "Active Retainer" | "On Hold" | "Closed";
  retainerHours: number;
  usedHours: number;
  monthlyValue: number;
  renewalDate?: Date;
  notes?: string;
  contactHistory: IContactLog[];
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
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
    retainerHours: { type: Number, default: 0, min: 0 },
    usedHours: { type: Number, default: 0, min: 0 },
    monthlyValue: { type: Number, default: 0, min: 0 },
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

ClientSchema.index({ tenantId: 1, status: 1 });
ClientSchema.index({ tenantId: 1, name: 1 });

export const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
