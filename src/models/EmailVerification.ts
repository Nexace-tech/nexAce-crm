import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEmailVerification extends Document {
  email: string;
  code: string;
  createdAt: Date;
}

const EmailVerificationSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // Auto-deletes after 10 minutes
});

export const EmailVerification: Model<IEmailVerification> = 
  mongoose.models.EmailVerification || mongoose.model<IEmailVerification>("EmailVerification", EmailVerificationSchema);
