import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISprint extends Document {
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: "Planned" | "Active" | "Completed";
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SprintSchema = new Schema<ISprint>(
  {
    name: { type: String, required: true },
    goal: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Planned", "Active", "Completed"],
      default: "Planned",
    },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  { timestamps: true }
);

export const Sprint: Model<ISprint> =
  mongoose.models.Sprint || mongoose.model<ISprint>("Sprint", SprintSchema);
