import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRateLimit extends Document {
  key: string;
  count: number;
  resetAt: Date;
  createdAt: Date;
}

const RateLimitSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  count: { type: Number, default: 1 },
  resetAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // Auto-deletes after 10 minutes via TTL
});

export const RateLimit: Model<IRateLimit> =
  mongoose.models.RateLimit || mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);
