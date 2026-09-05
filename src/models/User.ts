import mongoose, { Schema, Document, Model } from "mongoose";
import "./Tenant";

export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  passwordHash: string;
  role: string;
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
  employmentType?: string;
  salary?: number;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
  };
   lastActiveAt?: Date;
   forcePasswordReset?: boolean;
   createdAt: Date;
 }

const UserSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  // NOTE: uniqueness is enforced per-tenant via compound index below (not globally unique)
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "Employee", trim: true },
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
  employmentType: { type: String, default: "Permanent", trim: true },
  salary: { type: Number, default: 0 },
  socialLinks: {
    linkedin: { type: String, default: "" },
    twitter: { type: String, default: "" },
    github: { type: String, default: "" },
    website: { type: String, default: "" },
    instagram: { type: String, default: "" },
    facebook: { type: String, default: "" }
  },
   lastActiveAt: { type: Date, default: Date.now },
   forcePasswordReset: { type: Boolean, default: false },
   createdAt: { type: Date, default: Date.now }
});

// Compound unique index — same email may exist in different tenants but not within the same one.
// MIGRATION NOTE: drop the old global email_1 index if upgrading: db.users.dropIndex("email_1")
UserSchema.index({ email: 1, tenantId: 1 }, { unique: true });
// Compound index for tenant user listing & role filtering
UserSchema.index({ tenantId: 1, role: 1 });

// Force invalidate in-memory Mongoose model cache if schema updated
if (mongoose.models.User && !mongoose.models.User.schema.path("salary")) {
  delete (mongoose.models as any).User;
}

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
