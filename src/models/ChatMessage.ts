import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatMessage extends Document {
  channel: string; // e.g. "general", "projects", "announcements", or "dm_userId1_userId2"
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole?: string;
  content: string;
  isDM: boolean;
  recipientId?: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    channel: { type: String, required: true, trim: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    senderName: { type: String, required: true, trim: true },
    senderRole: { type: String, trim: true },
    content: { type: String, required: true, trim: true },
    isDM: { type: Boolean, default: false },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance index for message feed retrieval
ChatMessageSchema.index({ tenantId: 1, channel: 1, createdAt: 1 });

export const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
