import mongoose, { Schema, Document, Model } from "mongoose";
import "./Tenant";
import "./User";

export type AvailabilityStatus = "Available" | "Partial" | "Unavailable";

export interface IAvailability extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  dateString: string; // "YYYY-MM-DD" in local/IST string
  status: AvailabilityStatus;
  startTime?: string; // e.g. "10:00 AM" or "10:00"
  endTime?: string;   // e.g. "02:00 PM" or "14:00"
  hours?: number;     // e.g. 4
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AvailabilitySchema = new Schema<IAvailability>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true },
    dateString: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["Available", "Partial", "Unavailable"],
      default: "Available",
      required: true,
    },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    hours: { type: Number, default: 0 },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Unique compound index: a user can only have one availability record per date per tenant
AvailabilitySchema.index({ tenantId: 1, userId: 1, dateString: 1 }, { unique: true });
AvailabilitySchema.index({ tenantId: 1, dateString: 1 });
AvailabilitySchema.index({ tenantId: 1, userId: 1 });

export const Availability: Model<IAvailability> =
  mongoose.models.Availability || mongoose.model<IAvailability>("Availability", AvailabilitySchema);
