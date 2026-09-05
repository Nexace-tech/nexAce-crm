import mongoose, { Schema, Document, Model } from "mongoose";

export interface IITDriveLink extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  category: string;
  venture: string;
  platform: string;
  link: string;
  owner: string;
  accessLevel: string;
  shareScope: "All Users" | "Specific Users" | "Private";
  sharedWith: string[];
  lastUpdated: string;
  reviewFrequency: string;
  notes: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ITDriveLinkSchema = new Schema<IITDriveLink>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" },
    venture: { type: String, trim: true, default: "" },
    platform: { type: String, trim: true, default: "Google Sheets" },
    link: { type: String, trim: true, default: "" },
    owner: { type: String, trim: true, default: "" },
    accessLevel: { type: String, trim: true, default: "View - Team" },
    shareScope: {
      type: String,
      enum: ["All Users", "Specific Users", "Private"],
      default: "All Users",
    },
    sharedWith: { type: [String], default: [] },
    lastUpdated: { type: String, default: () => new Date().toISOString().slice(0, 10) },
    reviewFrequency: { type: String, trim: true, default: "Monthly" },
    notes: { type: String, trim: true, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ITDriveLinkSchema.index({ tenantId: 1, createdAt: -1 });
ITDriveLinkSchema.index({ tenantId: 1, owner: 1 });
ITDriveLinkSchema.index({ tenantId: 1, shareScope: 1 });

if (mongoose.models.ITDriveLink && (!mongoose.models.ITDriveLink.schema.path("shareScope") || process.env.NODE_ENV !== "production")) {
  delete (mongoose.models as any).ITDriveLink;
}

export const ITDriveLink: Model<IITDriveLink> =
  mongoose.models.ITDriveLink || mongoose.model<IITDriveLink>("ITDriveLink", ITDriveLinkSchema);
