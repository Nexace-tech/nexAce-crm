import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClientContractAttachment {
  url: string;
  name: string;
}

export interface ICompanyDetails {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;        // GST / VAT / TIN
}

export interface IClientContract extends Document {
  tenantId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;

  // ── Sender (Admin / Our Company) ────────────────────────────────────────────
  sender: ICompanyDetails;

  // ── Receiver (Client Company) ────────────────────────────────────────────────
  receiver: ICompanyDetails;
  clientCompany?: string;

  // ── Point of Contact (client side) ──────────────────────────────────────────
  pocName: string;
  pocEmail: string;
  pocPhone?: string;

  // ── Contract Type ───────────────────────────────────────────────────────────
  contractType: "Ad_Hoc" | "Retainer" | "Custom";
  customTypeLabel?: string;

  // ── Location ────────────────────────────────────────────────────────────────
  location?: string;

  // ── Dates ───────────────────────────────────────────────────────────────────
  startDate?: Date;
  endDate?: Date;

  // ── Attachments ─────────────────────────────────────────────────────────────
  ndaAttachment?: IClientContractAttachment;
  agreementAttachment?: IClientContractAttachment;
  otherAttachments?: IClientContractAttachment[];

  // ── Financials ──────────────────────────────────────────────────────────────
  budget?: number;
  currency?: string;

  // ── Status ──────────────────────────────────────────────────────────────────
  status: "Draft" | "Active" | "Expired" | "Terminated";

  // ── Actions on Create ───────────────────────────────────────────────────────
  mailSent: boolean;
  notifyOnCreate: boolean;
  generateInvoice: boolean;

  // ── Linked Invoice ──────────────────────────────────────────────────────────
  linkedInvoiceId?: mongoose.Types.ObjectId;

  // ── Notes ───────────────────────────────────────────────────────────────────
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IClientContractAttachment>(
  {
    url: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const CompanyDetailsSchema = new Schema<ICompanyDetails>(
  {
    name:    { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    city:    { type: String, trim: true },
    country: { type: String, trim: true },
    phone:   { type: String, trim: true },
    email:   { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true },
    taxId:   { type: String, trim: true },
  },
  { _id: false }
);

const ClientContractSchema = new Schema<IClientContract>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },

    // Sender & Receiver
    sender:   { type: CompanyDetailsSchema, required: true },
    receiver: { type: CompanyDetailsSchema, required: true },

    // POC
    pocName:  { type: String, required: true, trim: true },
    pocEmail: { type: String, required: true, trim: true, lowercase: true },
    pocPhone: { type: String, trim: true },

    contractType: {
      type: String,
      enum: ["Ad_Hoc", "Retainer", "Custom"],
      required: true,
    },
    customTypeLabel: { type: String, trim: true },

    location: { type: String, trim: true, default: "" },

    startDate: { type: Date },
    endDate:   { type: Date },

    ndaAttachment:      { type: AttachmentSchema },
    agreementAttachment: { type: AttachmentSchema },
    otherAttachments:   { type: [AttachmentSchema], default: [] },

    budget:   { type: Number, default: 0 },
    currency: { type: String, trim: true, default: "USD" },

    status: {
      type: String,
      enum: ["Draft", "Active", "Expired", "Terminated"],
      default: "Draft",
    },

    // Backwards compatibility alias for receiver name
    clientCompany: { type: String, trim: true },

    mailSent:        { type: Boolean, default: false },
    notifyOnCreate:  { type: Boolean, default: false },
    generateInvoice: { type: Boolean, default: false },

    linkedInvoiceId: { type: Schema.Types.ObjectId, ref: "FinanceInvoice" },

    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

ClientContractSchema.index({ tenantId: 1, status: 1 });
ClientContractSchema.index({ tenantId: 1, createdAt: -1 });

// Ensure any stale cached schema in development is refreshed
if (process.env.NODE_ENV !== "production" && mongoose.models.ClientContract) {
  delete (mongoose.models as any).ClientContract;
}

export const ClientContract: Model<IClientContract> =
  mongoose.models.ClientContract ||
  mongoose.model<IClientContract>("ClientContract", ClientContractSchema);
