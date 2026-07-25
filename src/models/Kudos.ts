import mongoose, { Schema, Document, Model } from "mongoose";

export interface IKudos extends Document {
  fromUserId: mongoose.Types.ObjectId;
  fromUserName: string;
  toUserId: mongoose.Types.ObjectId;
  toUserName: string;
  message: string;
  companyValue: string;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const KudosSchema = new Schema<IKudos>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromUserName: { type: String, required: true, trim: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserName: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    companyValue: { type: String, required: true, trim: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  },
  { timestamps: true }
);

KudosSchema.index({ tenantId: 1, createdAt: -1 });

export const Kudos: Model<IKudos> =
  mongoose.models.Kudos || mongoose.model<IKudos>("Kudos", KudosSchema);
