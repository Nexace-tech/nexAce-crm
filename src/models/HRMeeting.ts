import mongoose, { Schema, Document, Model } from "mongoose";

export interface IHRMeeting extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  title: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:00 - 11:00"
  type: "Candidate Interview" | "Performance Review" | "Team Sync" | "One-on-One";
  notes?: string;
  avatarColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HRMeetingSchema = new Schema<IHRMeeting>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true },
    time: { type: String, default: "10:00 - 11:00", trim: true },
    type: {
      type: String,
      enum: ["Candidate Interview", "Performance Review", "Team Sync", "One-on-One"],
      default: "Team Sync",
    },
    notes: { type: String, trim: true, default: "" },
    avatarColor: { type: String, default: "bg-purple-500 text-white" },
  },
  { timestamps: true }
);

HRMeetingSchema.index({ tenantId: 1, date: 1 });

export const HRMeeting: Model<IHRMeeting> =
  mongoose.models.HRMeeting || mongoose.model<IHRMeeting>("HRMeeting", HRMeetingSchema);
