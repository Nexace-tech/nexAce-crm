import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWiki extends Document {
  title: string;
  category?: string;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WikiSchema = new Schema<IWiki>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "Operations", trim: true },
    content: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance indexes for knowledge base listing & search
WikiSchema.index({ tenantId: 1, updatedAt: -1 });

export const Wiki: Model<IWiki> =
  mongoose.models.Wiki || mongoose.model<IWiki>("Wiki", WikiSchema);
