import mongoose, { Schema, Document, Model } from "mongoose";
import "./Tenant";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "Admin" | "Manager" | "Employee";
  tenantId: mongoose.Types.ObjectId;
  department?: string;
  departments?: string[];
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
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["Admin", "Manager", "Employee"], default: "Employee" },
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  department: { type: String },
  departments: [{ type: String }],
  managerId: { type: Schema.Types.ObjectId, ref: "User" },
  skills: [{ type: String }],
  joinDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["Active", "On Leave", "Suspended"], default: "Active" },
  bio: { type: String, default: "" },
  phone: { type: String, default: "" },
  photoUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

// Compound index for tenant user listing & role filtering
UserSchema.index({ tenantId: 1, role: 1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
