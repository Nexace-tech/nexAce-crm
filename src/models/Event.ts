import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvent extends Document {
  title: string;
  description?: string;
  type: "Meeting" | "Holiday" | "Birthday" | "Deadline" | "Personal";
  startDate: Date;
  endDate: Date;
  department?: string;
  userId: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    title: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["Meeting", "Holiday", "Birthday", "Deadline", "Personal"],
      default: "Meeting",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    department: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  { timestamps: true }
);

export const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);
