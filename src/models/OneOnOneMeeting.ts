import mongoose, { Schema, Document, Model } from "mongoose";

export interface IActionItem {
  _id?: string;
  text: string;
  completed: boolean;
  carriedOver: boolean;
}

export interface IOneOnOneMeeting extends Document {
  managerId: mongoose.Types.ObjectId;
  managerName: string;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  scheduledDate: Date;
  status: "Scheduled" | "Completed" | "Cancelled";
  agenda?: string;
  notes?: string;
  actionItems: IActionItem[];
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OneOnOneMeetingSchema = new Schema<IOneOnOneMeeting>(
  {
    managerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    managerName: { type: String, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employeeName: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    agenda: { type: String, trim: true },
    notes: { type: String, trim: true },
    actionItems: [
      {
        text: { type: String, required: true },
        completed: { type: Boolean, default: false },
        carriedOver: { type: Boolean, default: false },
      },
    ],
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

OneOnOneMeetingSchema.index({ tenantId: 1, managerId: 1 });
OneOnOneMeetingSchema.index({ tenantId: 1, employeeId: 1 });

export const OneOnOneMeeting: Model<IOneOnOneMeeting> =
  mongoose.models.OneOnOneMeeting || mongoose.model<IOneOnOneMeeting>("OneOnOneMeeting", OneOnOneMeetingSchema);
