import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDriveFile extends Document {
  name: string;
  size: number;
  mimeType: string;
  filePath: string;
  folder: string;
  isRecycled?: boolean;
  deletedAt?: Date;
  uploadedBy: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DriveFileSchema = new Schema<IDriveFile>(
  {
    name: { type: String, required: true, trim: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    filePath: { type: String, required: true },
    folder: { type: String, default: "/", trim: true },
    isRecycled: { type: Boolean, default: false },
    deletedAt: { type: Date },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

// Performance indexes for folder navigation & recent file lookups
DriveFileSchema.index({ tenantId: 1, folder: 1 });
DriveFileSchema.index({ tenantId: 1, createdAt: -1 });
// Index for recycle bin queries
DriveFileSchema.index({ tenantId: 1, isRecycled: 1 });

export const DriveFile: Model<IDriveFile> =
  mongoose.models.DriveFile || mongoose.model<IDriveFile>("DriveFile", DriveFileSchema);
