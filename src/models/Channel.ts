import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChannel extends Document {
  name: string; // e.g. "general", "design-sync"
  description?: string;
  isPinned: boolean;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelSchema = new Schema<IChannel>(
  {
    name: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    isPinned: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

ChannelSchema.index({ tenantId: 1, name: 1 }, { unique: true });

if (mongoose.models.Channel) {
  delete mongoose.models.Channel;
}

export const Channel: Model<IChannel> = mongoose.model<IChannel>("Channel", ChannelSchema);
