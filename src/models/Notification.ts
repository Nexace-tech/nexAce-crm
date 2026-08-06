import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "chat" | "announcement" | "task" | "leave" | "hr" | "appraisal" | "kudos" | "okr" | "referral" | "system";
  linkUrl?: string;
  read: boolean;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["chat", "announcement", "task", "leave", "hr", "appraisal", "kudos", "okr", "referral", "system"],
      default: "system",
    },
    linkUrl: { type: String, trim: true },
    read: { type: Boolean, default: false },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance index for unread notification badge lookups
NotificationSchema.index({ tenantId: 1, recipientId: 1, read: 1, createdAt: -1 });

if (mongoose.models.Notification) {
  delete (mongoose.models as any).Notification;
}

export const Notification: Model<INotification> =
  mongoose.model<INotification>("Notification", NotificationSchema);
