import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDriveFile extends Document {
  name: string;
  size: number;
  mimeType: string;
  filePath: string;
  folder: string;
  uploadedBy: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DriveFileSchema = new Schema<IDriveFile>(
  {
    name: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
    filePath: { type: String, required: true },
    folder: { type: String, default: "/" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  { timestamps: true }
);

export const DriveFile: Model<IDriveFile> =
  mongoose.models.DriveFile || mongoose.model<IDriveFile>("DriveFile", DriveFileSchema);
