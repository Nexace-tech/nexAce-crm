import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWiki extends Document {
  title: string;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WikiSchema = new Schema<IWiki>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  { timestamps: true }
);

export const Wiki: Model<IWiki> =
  mongoose.models.Wiki || mongoose.model<IWiki>("Wiki", WikiSchema);
