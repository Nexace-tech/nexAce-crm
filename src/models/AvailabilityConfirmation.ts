import mongoose, { Schema, Document, Model } from "mongoose";
import "./Tenant";
import "./User";

export interface IAvailabilityConfirmation extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  monthKey: string; // "YYYY-MM"
  confirmed: boolean;
  confirmedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AvailabilityConfirmationSchema = new Schema<IAvailabilityConfirmation>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    monthKey: { type: String, required: true, index: true },
    confirmed: { type: Boolean, default: true },
    confirmedAt: { type: Date, default: Date.now },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

AvailabilityConfirmationSchema.index({ tenantId: 1, userId: 1, monthKey: 1 }, { unique: true });
AvailabilityConfirmationSchema.index({ tenantId: 1, monthKey: 1 });

export const AvailabilityConfirmation: Model<IAvailabilityConfirmation> =
  mongoose.models.AvailabilityConfirmation ||
  mongoose.model<IAvailabilityConfirmation>("AvailabilityConfirmation", AvailabilityConfirmationSchema);
