import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDealStageHistory {
  fromStage?: string;
  toStage: string;
  changedBy?: mongoose.Types.ObjectId;
  changedByName?: string;
  notes?: string;
  timestamp: Date;
}

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
  currency?: string;
  notes?: string;
  stageHistory?: IDealStageHistory[];
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
    currency: { type: String, trim: true, default: "USD" },
    notes: { type: String, trim: true, default: "" },
    stageHistory: [
      {
        fromStage: { type: String, trim: true },
        toStage: { type: String, required: true, trim: true },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        changedByName: { type: String, trim: true },
        notes: { type: String, trim: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

SalesDealSchema.index({ tenantId: 1, stage: 1 });
SalesDealSchema.index({ tenantId: 1, createdAt: -1 });

export const SalesDeal: Model<ISalesDeal> =
  mongoose.models.SalesDeal || mongoose.model<ISalesDeal>("SalesDeal", SalesDealSchema);
