import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "Admin" | "Manager" | "Employee";
  tenantId: mongoose.Types.ObjectId;
  department?: string;
  managerId?: mongoose.Types.ObjectId;
  skills?: string[];
  joinDate?: Date;
  status?: "Active" | "On Leave" | "Suspended";
  bio?: string;
  phone?: string;
  photoUrl?: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["Admin", "Manager", "Employee"], default: "Employee" },
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  department: { type: String },
  managerId: { type: Schema.Types.ObjectId, ref: "User" },
  skills: [{ type: String }],
  joinDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["Active", "On Leave", "Suspended"], default: "Active" },
  bio: { type: String, default: "" },
  phone: { type: String, default: "" },
  photoUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
