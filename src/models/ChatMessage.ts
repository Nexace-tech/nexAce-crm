import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatReaction {
  emoji: string;
  users: string[]; // userNames or userIds
}

export interface IChatAttachment {
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface IChatMessage extends Document {
  channel: string; // e.g. "general", "projects", "announcements", or "dm_userId1_userId2"
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderRole?: string;
  content: string;
  isDM: boolean;
  recipientId?: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  mentions?: string[];
  attachments?: IChatAttachment[];
  reactions?: IChatReaction[];
  read?: boolean;
  readBy?: string[];
  readAt?: Date;
  deletedForEveryone?: boolean;
  deletedForUsers?: string[];
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
    parentId: { type: Schema.Types.ObjectId, ref: "ChatMessage", index: true },
    mentions: [{ type: String }],
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
    read: { type: Boolean, default: false },
    readBy: [{ type: String }],
    readAt: { type: Date },
    deletedForEveryone: { type: Boolean, default: false },
    deletedForUsers: [{ type: String }],
    reactions: [
      {
        emoji: { type: String, required: true },
        users: [{ type: String }],
      },
    ],
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance index for message feed retrieval
ChatMessageSchema.index({ tenantId: 1, channel: 1, createdAt: 1 });

// Force schema re-registration in Next.js HMR — prevents stale cached models
if (mongoose.models.ChatMessage) {
  delete mongoose.models.ChatMessage;
}

export const ChatMessage: Model<IChatMessage> =
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
