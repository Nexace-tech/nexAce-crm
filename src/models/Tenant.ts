import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITenant extends Document {
  name: string;
  slug: string;
  createdAt: Date;
}

const TenantSchema: Schema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

export const Tenant: Model<ITenant> = mongoose.models.Tenant || mongoose.model<ITenant>("Tenant", TenantSchema);
