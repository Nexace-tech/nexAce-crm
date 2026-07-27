import mongoose, { Schema, Document, Model } from "mongoose";
import "./Tenant";

export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  passwordHash: string;
  role: "Admin" | "Manager" | "Employee";
  tenantId: mongoose.Types.ObjectId;
  department?: string;
  departments?: string[];
  managerId?: mongoose.Types.ObjectId;
  skills?: string[];
  joinDate?: Date;
  status?: "Active" | "Pending" | "On Leave" | "Suspended";
  bio?: string;
  phone?: string;
  photoUrl?: string;
  shiftTime?: string;
  shiftName?: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["Admin", "Manager", "Employee"], default: "Employee" },
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  department: { type: String },
  departments: [{ type: String }],
  managerId: { type: Schema.Types.ObjectId, ref: "User" },
  skills: [{ type: String }],
  joinDate: { type: Date, default: Date.now },
  status: { type: String, enum: ["Active", "Pending", "On Leave", "Suspended"], default: "Pending" },
  bio: { type: String, default: "" },
  phone: { type: String, default: "" },
  photoUrl: { type: String, default: "" },
  shiftTime: { type: String, default: "09:00 AM - 05:00 PM" },
  shiftName: { type: String, default: "Standard Day Shift" },
  createdAt: { type: Date, default: Date.now }
});

// Compound index for tenant user listing & role filtering
UserSchema.index({ tenantId: 1, role: 1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
