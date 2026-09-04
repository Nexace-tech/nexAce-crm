import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProposalItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IProposalAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: Date;
}

export interface IProposal extends Document {
  tenantId: mongoose.Types.ObjectId;
  proposalCode: string; // e.g. #PROP-001493
  subject: string;
  projectName?: string;
  dealId?: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  // Client info (denormalised for display speed)
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  clientAvatarColor?: string; // tailwind bg colour token
  // Financials
  items: IProposalItem[];
  subtotal: number;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  taxRate: number;
  taxAmount: number;
  totalValue: number;
  currency: string;
  // Dates
  issueDate: Date;
  openTill: Date;
  // Workflow
  status: "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";
  // Electronic Signature
  signedBy?: string;
  signedAt?: Date;
  signatureType?: "drawn" | "typed";
  signatureImage?: string; // base64 data url for hand-drawn signature
  // Conversions
  convertedInvoiceId?: mongoose.Types.ObjectId;
  convertedProjectId?: mongoose.Types.ObjectId;
  // Email Dispatch & Feedback
  lastSentAt?: Date;
  lastSentTo?: string;
  clientNotes?: string;
  // Meta
  assignedTo?: string[];
  tags?: string[];
  attachments?: IProposalAttachment[];
  description?: string;
  terms?: string;
  // Audit
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProposalItemSchema = new Schema<IProposalItem>(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const ProposalAttachmentSchema = new Schema<IProposalAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    size: { type: Number },
    type: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProposalSchema = new Schema<IProposal>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    proposalCode: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    projectName: { type: String, trim: true },
    dealId: { type: Schema.Types.ObjectId, ref: "SalesDeal" },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, trim: true, lowercase: true },
    clientCompany: { type: String, trim: true },
    clientAvatarColor: { type: String, default: "bg-blue-500" },
    items: { type: [ProposalItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discountType: { type: String, enum: ["percent", "fixed"], default: "fixed" },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalValue: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "USD", trim: true },
    issueDate: { type: Date, required: true },
    openTill: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Draft", "Sent", "Accepted", "Declined", "Expired"],
      default: "Draft",
    },
    signedBy: { type: String },
    signedAt: { type: Date },
    signatureType: { type: String, enum: ["drawn", "typed"], default: "typed" },
    signatureImage: { type: String },
    convertedInvoiceId: { type: Schema.Types.ObjectId, ref: "FinanceInvoice" },
    convertedProjectId: { type: Schema.Types.ObjectId, ref: "Project" },
    lastSentAt: { type: Date },
    lastSentTo: { type: String },
    clientNotes: { type: String },
    assignedTo: [{ type: String }],
    tags: [{ type: String, trim: true }],
    attachments: { type: [ProposalAttachmentSchema], default: [] },
    description: { type: String },
    terms: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound indexes for fast tenant-scoped queries
ProposalSchema.index({ tenantId: 1, status: 1 });
ProposalSchema.index({ tenantId: 1, issueDate: -1 });
ProposalSchema.index({ tenantId: 1, proposalCode: 1 }, { unique: true });

export const Proposal: Model<IProposal> =
  mongoose.models.Proposal || mongoose.model<IProposal>("Proposal", ProposalSchema);
