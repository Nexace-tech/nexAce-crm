import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHRDocument extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  category: "Offer Letter" | "NDA" | "KRA Agreement" | "Policy" | "Tax Document" | "Other";
  fileUrl: string;
  fileSize?: string;
  targetUserId?: mongoose.Types.ObjectId;
  targetUserName?: string;
  isRestricted: boolean;
  uploadedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const HRDocumentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Offer Letter", "NDA", "KRA Agreement", "Policy", "Tax Document", "Other"],
      default: "Other",
    },
    fileUrl: { type: String, required: true },
    fileSize: { type: String, default: "1.2 MB" },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    targetUserName: { type: String, default: "" },
    isRestricted: { type: Boolean, default: true },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true }
);

HRDocumentSchema.index({ tenantId: 1, targetUserId: 1 });

export const HRDocument: Model<IHRDocument> =
  mongoose.models.HRDocument ||
  mongoose.model<IHRDocument>("HRDocument", HRDocumentSchema);
