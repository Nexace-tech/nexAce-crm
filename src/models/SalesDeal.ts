import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISalesDeal extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  clientAccount: string;
  dealName: string;
  dealValue: number;
  stage: "Prospecting" | "Discovery" | "Proposal Sent" | "Negotiation" | "Closed Won" | "Closed Lost";
  probability: number;
  owner: string;
  expectedClose: string;
  venture: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SalesDealSchema = new Schema<ISalesDeal>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientAccount: { type: String, required: true, trim: true },
    dealName: { type: String, required: true, trim: true },
    dealValue: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: ["Prospecting", "Discovery", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"],
      default: "Prospecting",
    },
    probability: { type: Number, default: 50, min: 0, max: 100 },
    owner: { type: String, trim: true, default: "" },
    expectedClose: { type: String, default: "" },
    venture: { type: String, trim: true, default: "Ace Consultancys" },
    notes: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

SalesDealSchema.index({ tenantId: 1, stage: 1 });
SalesDealSchema.index({ tenantId: 1, createdAt: -1 });

export const SalesDeal: Model<ISalesDeal> =
  mongoose.models.SalesDeal || mongoose.model<ISalesDeal>("SalesDeal", SalesDealSchema);
