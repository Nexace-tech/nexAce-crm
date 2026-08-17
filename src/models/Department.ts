import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  description?: string;
  code?: string;
  managerId?: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DepartmentSchema: Schema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  code: { type: String, default: "", trim: true },
  managerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  createdAt: { type: Date, default: Date.now },
});

// Compound unique index for department name per tenant
DepartmentSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export const Department: Model<IDepartment> =
  mongoose.models.Department || mongoose.model<IDepartment>("Department", DepartmentSchema);
