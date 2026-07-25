import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClient extends Document {
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: "Active" | "Lead" | "On Hold" | "Archived";
  retainerHours: number;
  usedHours: number;
  monthlyValue: number;
  notes?: string;
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
    retainerHours: { type: Number, default: 0, min: 0 },
    usedHours: { type: Number, default: 0, min: 0 },
    monthlyValue: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance indexes for client search & status filters
ClientSchema.index({ tenantId: 1, status: 1 });
ClientSchema.index({ tenantId: 1, name: 1 });

export const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>("Client", ClientSchema);
