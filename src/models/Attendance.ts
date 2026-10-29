import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttendance extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date; // Normalized to midnight UTC
  clockIn: Date;
  originalClockIn?: Date; // Preserved original clock-in
  lastResumedAt?: Date; // Timestamp of when the shift was resumed for active segment calculation
  clockOut?: Date;
  clockInLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  clockOutLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  regularHours?: number;
  overtimeHours?: number;
  status: "Present" | "On Leave" | "Absent";
  extensionRequested?: boolean;
  extensionRequestedHours?: number;
  extensionReason?: string;
  extensionApproved?: boolean;
  extensionApprovedBy?: mongoose.Types.ObjectId;
  extensionApprovedAt?: Date;
  extensionAllocatedHours?: number;
  extensionRejected?: boolean;
  extensionRejectedBy?: mongoose.Types.ObjectId;
  extensionRejectedAt?: Date;
  extensionRejectionReason?: string;
  regularizationRequested?: boolean;
  regularizationReason?: string;
  requestedClockIn?: Date;
  requestedClockOut?: Date;
  regularizationStatus?: "Pending" | "Approved" | "Rejected";
  regularizedBy?: mongoose.Types.ObjectId;
  regularizedAt?: Date;
  regularizationRejectionReason?: string;
  clockInIp?: string;
  clockOutIp?: string;
  clockInDevice?: {
    type?: "Desktop" | "Mobile" | "Tablet" | "Unknown";
    os?: string;
    browser?: string;
    userAgent?: string;
  };
  clockOutDevice?: {
    type?: "Desktop" | "Mobile" | "Tablet" | "Unknown";
    os?: string;
    browser?: string;
    userAgent?: string;
  };
  punchSource?: "Web" | "Mobile" | "Web Portal" | "Mobile App" | "Biometric" | "Manual_Regularized";
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date, required: true },
    // Preserved across break/resume — always shows the original clock-in time of the day
    originalClockIn: { type: Date },
    lastResumedAt: { type: Date },
    clockOut: { type: Date },
    clockInLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
    },
    clockOutLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
    },
    clockInIp: { type: String, trim: true },
    clockOutIp: { type: String, trim: true },
    clockInDevice: {
      type: {
        type: String,
        enum: ["Desktop", "Mobile", "Tablet", "Unknown"],
        default: "Unknown",
      },
      os: { type: String, trim: true },
      browser: { type: String, trim: true },
      userAgent: { type: String, trim: true },
    },
    clockOutDevice: {
      type: {
        type: String,
        enum: ["Desktop", "Mobile", "Tablet", "Unknown"],
        default: "Unknown",
      },
      os: { type: String, trim: true },
      browser: { type: String, trim: true },
      userAgent: { type: String, trim: true },
    },
    punchSource: {
      type: String,
      enum: ["Web", "Mobile", "Web Portal", "Mobile App", "Biometric", "Manual_Regularized"],
      default: "Web Portal",
    },
    regularHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Present", "On Leave", "Absent"],
      default: "Present",
    },
    extensionRequested: { type: Boolean, default: false },
    extensionRequestedHours: { type: Number, default: 0 },
    extensionReason: { type: String, default: "" },
    extensionApproved: { type: Boolean, default: false },
    extensionApprovedBy: { type: Schema.Types.ObjectId, ref: "User" },
    extensionApprovedAt: { type: Date },
    extensionAllocatedHours: { type: Number, default: 0 },
    extensionRejected: { type: Boolean, default: false },
    extensionRejectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    extensionRejectedAt: { type: Date },
    extensionRejectionReason: { type: String, default: "" },
    regularizationRequested: { type: Boolean, default: false },
    regularizationReason: { type: String, default: "" },
    requestedClockIn: { type: Date },
    requestedClockOut: { type: Date },
    regularizationStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
    },
    regularizedBy: { type: Schema.Types.ObjectId, ref: "User" },
    regularizedAt: { type: Date },
    regularizationRejectionReason: { type: String, default: "" },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  { timestamps: true }
);

// Prevent duplicate daily check-ins for the same user
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
// Performance indexes for tenant-scoped dashboard and timesheet queries
AttendanceSchema.index({ tenantId: 1, date: -1 });
AttendanceSchema.index({ tenantId: 1, userId: 1, date: -1 });

// Force invalidate in-memory Mongoose model cache if schema updated in dev / hot-reload
if (
  mongoose.models.Attendance &&
  (!mongoose.models.Attendance.schema.path("regularizationStatus") ||
    !mongoose.models.Attendance.schema.path("regularizedBy") ||
    !mongoose.models.Attendance.schema.path("extensionRejectedBy") ||
    !mongoose.models.Attendance.schema.path("extensionApprovedBy") ||
    !mongoose.models.Attendance.schema.path("clockInIp") ||
    !mongoose.models.Attendance.schema.path("punchSource") ||
    process.env.NODE_ENV !== "production")
) {
  delete (mongoose.models as any).Attendance;
}

export const Attendance: Model<IAttendance> =
  (mongoose.models.Attendance as Model<IAttendance>) ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

