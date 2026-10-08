import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHRDocument extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  category: "Offer Letter" | "NDA" | "KRA Agreement" | "Policy" | "Tax Document" | "Contract" | "Document" | "Other";
  fileUrl: string;
  fileSize?: string;
  targetUserId?: mongoose.Types.ObjectId;
  targetUserName?: string;
  isRestricted: boolean;
  uploadedBy: string;
  status: "Requested" | "Submitted" | "Verified" | "Rejected";
  requestedBy?: {
    userId: mongoose.Types.ObjectId;
    userName: string;
    requestedAt: Date;
  };
  verifiedBy?: {
    userId: mongoose.Types.ObjectId;
    userName: string;
    verifiedAt: Date;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HRDocumentSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["Offer Letter", "NDA", "KRA Agreement", "Policy", "Tax Document", "Contract", "Document", "Other"],
      default: "Other",
    },
    fileUrl: { type: String, default: "" },
    fileSize: { type: String, default: "1.2 MB" },
    targetUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    targetUserName: { type: String, default: "" },
    isRestricted: { type: Boolean, default: true },
    uploadedBy: { type: String, default: "HR System" },
    status: {
      type: String,
      enum: ["Requested", "Submitted", "Verified", "Rejected"],
      default: "Submitted",
      index: true,
    },
    requestedBy: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, default: "" },
      requestedAt: { type: Date, default: Date.now },
    },
    verifiedBy: {
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      userName: { type: String, default: "" },
      verifiedAt: { type: Date },
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

HRDocumentSchema.index({ tenantId: 1, targetUserId: 1 });

if (mongoose.models && mongoose.models.HRDocument) {
  delete (mongoose.models as any).HRDocument;
}

export const HRDocument: Model<IHRDocument> =
  mongoose.models.HRDocument ||
  mongoose.model<IHRDocument>("HRDocument", HRDocumentSchema);
