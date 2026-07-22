import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date; // Normalized to midnight UTC
  clockIn: Date;
  clockOut?: Date;
  status: "Present" | "On Leave" | "Absent";
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date },
    status: {
      type: String,
      enum: ["Present", "On Leave", "Absent"],
      default: "Present",
    },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  { timestamps: true }
);

// Compounded index to prevent duplicate daily checkins for the same user
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);
