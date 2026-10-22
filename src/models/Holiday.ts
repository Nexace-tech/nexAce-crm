import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHoliday extends Document {
  title: string;
  description?: string;
  date: Date;
  year: number;
  month: number;
  dayOfWeek?: string;
  type: "Mandatory" | "Restricted" | "Company";
  category?: "National" | "Religious" | "Cultural" | "Corporate";
  applicableDepartments?: string[];
  locations?: string[];
  isHalfDay?: boolean;
  tenantId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHoliday>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    date: { type: Date, required: true },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    dayOfWeek: { type: String, trim: true },
    type: {
      type: String,
      enum: ["Mandatory", "Restricted", "Company"],
      default: "Mandatory",
    },
    category: {
      type: String,
      enum: ["National", "Religious", "Cultural", "Corporate"],
      default: "National",
    },
    applicableDepartments: [{ type: String, default: "All" }],
    locations: [{ type: String }],
    isHalfDay: { type: Boolean, default: false },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Performance compound indexes for tenant, year filtering and upcoming holiday queries
HolidaySchema.index({ tenantId: 1, year: 1, date: 1 });
HolidaySchema.index({ tenantId: 1, date: 1 });

export const Holiday: Model<IHoliday> =
  mongoose.models.Holiday || mongoose.model<IHoliday>("Holiday", HolidaySchema);
