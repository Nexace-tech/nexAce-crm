"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ProposalAttachmentItem {
  name: string;
  url: string;
  size?: number;
  type?: string;
  uploadedAt?: string | Date;
}

export interface ProposalFormData {
  subject: string;
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  currency: string;
  issueDate: string;
  openTill: string;
  status: "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";
  discountType?: "percent" | "fixed";
  discountValue?: string;
  taxRate: string;
  description: string;
  terms: string;
  tags: string;
  items: { description: string; quantity: string; unitPrice: string; amount: number }[];
  attachments?: ProposalAttachmentItem[];
}

export interface LeadOption {
  _id?: string;
  leadName: string;
  companyName?: string;
  email?: string;
  value?: number;
  currency?: string;
}

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProposalFormData) => Promise<void>;
  initialData?: Partial<ProposalFormData>;
  isEditing?: boolean;
  isSubmitting?: boolean;
  leads?: LeadOption[];
}

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "GBP", symbol: "£", label: "GBP (£)" },
  { code: "INR", symbol: "₹", label: "INR (₹)" },
  { code: "AED", symbol: "AED", label: "AED (AED)" },
  { code: "SGD", symbol: "S$", label: "SGD (S$)" },
  { code: "AUD", symbol: "A$", label: "AUD (A$)" },
  { code: "CAD", symbol: "C$", label: "CAD (C$)" },
];
const STATUS_OPTIONS: ProposalFormData["status"][] = ["Draft", "Sent", "Accepted", "Declined", "Expired"];

const DELIVERABLE_PRESETS = [
  { description: "Full-Stack Web Application (Next.js & API)", quantity: "1", unitPrice: "85000" },
  { description: "UI/UX Interactive Figma Prototype", quantity: "1", unitPrice: "25000" },
  { description: "SEO & Growth Optimization Package (3 Mo)", quantity: "3", unitPrice: "15000" },
  { description: "Cloud Infrastructure & DevOps CI/CD", quantity: "1", unitPrice: "35000" },
  { description: "Monthly Dedicated Support & SLA", quantity: "6", unitPrice: "8000" },
];

export const PROPOSAL_TEMPLATES = [
  {
    id: "fullstack_web",
    name: "Full-Stack Web App & SaaS Platform",
    subject: "Full-Stack Custom Web Platform Development",
    description: "End-to-end custom web application architecture, UI/UX system, database engineering, REST/GraphQL APIs, authentication, role-based access control, and automated CI/CD deployment pipeline.",
    terms: "50% deposit upon contract execution, 25% upon staging milestone approval, and 25% upon final production deployment and acceptance.",
    items: [
      { description: "Product Architecture & Database Schema Design", quantity: "1", unitPrice: "25000", amount: 25000 },
      { description: "Responsive Frontend UI/UX (Next.js & Tailwind)", quantity: "1", unitPrice: "45000", amount: 45000 },
      { description: "Secure Backend API & Third-Party Integrations", quantity: "1", unitPrice: "35000", amount: 35000 },
      { description: "QA Automated Testing & Production Deployment", quantity: "1", unitPrice: "15000", amount: 15000 },
    ],
    taxRate: "0",
    tags: "Web Development, SaaS, Full-Stack",
  },
  {
    id: "seo_growth",
    name: "SEO, Growth & Content Marketing Retainer",
    subject: "Growth Marketing & SEO Accelerator",
    description: "Complete organic search growth strategy, technical SEO audit, weekly high-intent content creation, backlink outreach, conversion rate optimization (CRO), and monthly executive KPI reporting.",
    terms: "Monthly retainer payable on the 1st of each month. 30 days written notice required for termination.",
    items: [
      { description: "Technical SEO Audit & On-Page Optimization", quantity: "1", unitPrice: "18000", amount: 18000 },
      { description: "Monthly High-Intent Content Production (6 Mo)", quantity: "6", unitPrice: "7500", amount: 45000 },
      { description: "High-Authority Link Acquisition Campaign", quantity: "6", unitPrice: "5000", amount: 30000 },
      { description: "Analytics, CRO & Executive Dashboard", quantity: "1", unitPrice: "12000", amount: 12000 },
    ],
    taxRate: "0",
    tags: "SEO, Retainer, Marketing",
  },
  {
    id: "ui_ux_design",
    name: "Enterprise UI/UX Design System & Prototyping",
    subject: "Enterprise Design System & Interactive Prototyping",
    description: "Comprehensive user research, wireframing, high-fidelity Figma components, design tokens, interactive micro-animations, and full developer handoff documentation.",
    terms: "Milestone-based billing: 40% kick-off, 30% wireframes & user flows, 30% final Figma token library.",
    items: [
      { description: "User Research & Information Architecture", quantity: "1", unitPrice: "15000", amount: 15000 },
      { description: "High-Fidelity Component Library (Figma)", quantity: "1", unitPrice: "32000", amount: 32000 },
      { description: "Interactive Clickable Prototype & Usability Testing", quantity: "1", unitPrice: "18000", amount: 18000 },
    ],
    taxRate: "0",
    tags: "UI/UX, Figma, Design System",
  },
  {
    id: "devops_cloud",
    name: "Cloud Migration & DevOps CI/CD Infrastructure",
    subject: "Cloud Architecture Modernization & DevOps Automation",
    description: "Enterprise cloud migration, container orchestration with Kubernetes, automated blue/green deployment pipelines, zero-trust security configuration, and 24/7 monitoring alerts.",
    terms: "30% upon approval, 40% upon staging cluster cutover, 30% post live traffic cutover.",
    items: [
      { description: "Infrastructure as Code (Terraform / AWS)", quantity: "1", unitPrice: "28000", amount: 28000 },
      { description: "Automated CI/CD Pipeline Setup (GitHub Actions)", quantity: "1", unitPrice: "22000", amount: 22000 },
      { description: "Kubernetes Cluster Configuration & Hardening", quantity: "1", unitPrice: "35000", amount: 35000 },
      { description: "Monitoring, APM & Observability (Datadog)", quantity: "1", unitPrice: "15000", amount: 15000 },
    ],
    taxRate: "0",
    tags: "DevOps, AWS, Cloud",
  },
];

const emptyItem = () => ({ description: "", quantity: "1", unitPrice: "", amount: 0 });

const DEFAULT_FORM: ProposalFormData = {
  subject: "",
  projectName: "",
  clientName: "",
  clientEmail: "",
  clientCompany: "",
  currency: "USD",
  issueDate: new Date().toISOString().split("T")[0],
  openTill: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  status: "Draft",
  discountType: "fixed",
  discountValue: "0",
  taxRate: "0",
  description: "",
  terms: "Payment is due within 30 days of invoice date. 50% upfront, 50% upon milestone sign-off.",
  tags: "",
  items: [emptyItem()],
  attachments: [],
};

function getAttachmentIcon(name: string, type?: string) {
  if (type === "link" || name.startsWith("http")) return "fa-link text-primary";
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "fa-file-pdf text-red-500";
  if (["doc", "docx"].includes(ext || "")) return "fa-file-word text-blue-500";
  if (["xls", "xlsx", "csv"].includes(ext || "")) return "fa-file-excel text-emerald-500";
  if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext || "")) return "fa-file-image text-purple-500";
  if (["zip", "rar", "7z", "tar"].includes(ext || "")) return "fa-file-zipper text-amber-500";
  return "fa-file-lines text-muted-foreground";
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProposalModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
  isSubmitting = false,
  leads = [],
}: ProposalModalProps) {
  const [form, setForm] = useState<ProposalFormData>({ ...DEFAULT_FORM });
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAddLinkForm, setShowAddLinkForm] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(initialData ? { ...DEFAULT_FORM, ...initialData, attachments: initialData.attachments || [] } : { ...DEFAULT_FORM });
      setSelectedLeadId("");
      setSelectedTemplateId("");
      setUploadError(null);
      setShowAddLinkForm(false);
      setLinkTitle("");
      setLinkUrl("");
    }
  }, [isOpen, initialData]);

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = PROPOSAL_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;

    setForm((prev) => ({
      ...prev,
      subject: prev.subject || tmpl.subject,
      description: tmpl.description,
      terms: tmpl.terms,
      taxRate: tmpl.taxRate,
      tags: prev.tags ? `${prev.tags}, ${tmpl.tags}` : tmpl.tags,
      items: tmpl.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0),
      })),
    }));
  };

  const set = (key: keyof ProposalFormData, value: unknown) =>
    setForm((p) => ({ ...p, [key]: value }));

  // Quick fill from existing lead
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;
    const lead = leads.find((l) => l._id === leadId || l.leadName === leadId);
    if (!lead) return;

    setForm((prev) => ({
      ...prev,
      clientName: lead.leadName || prev.clientName,
      clientCompany: lead.companyName || prev.clientCompany,
      clientEmail: lead.email || prev.clientEmail,
      projectName: lead.companyName ? `${lead.companyName} CRM & Growth` : prev.projectName,
      currency: lead.currency || prev.currency,
      subject: prev.subject || `Business Proposal for ${lead.companyName || lead.leadName}`,
      items: lead.value && prev.items.length === 1 && !prev.items[0].description
        ? [{ description: `${lead.companyName || "Client"} Engagement Scope`, quantity: "1", unitPrice: String(lead.value), amount: lead.value }]
        : prev.items,
    }));
  };

  // ── Line Item Helpers ──────────────────────────────────────────────────────
  const updateItem = (
    idx: number,
    field: "description" | "quantity" | "unitPrice",
    value: string
  ) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    const qty = parseFloat(field === "quantity" ? value : items[idx].quantity) || 0;
    const price = parseFloat(field === "unitPrice" ? value : items[idx].unitPrice) || 0;
    items[idx].amount = parseFloat((qty * price).toFixed(2));
    set("items", items);
  };

  const addItem = () => set("items", [...form.items, emptyItem()]);
  const removeItem = (idx: number) =>
    set(
      "items",
      form.items.filter((_, i) => i !== idx)
    );

  const addPreset = (preset: typeof DELIVERABLE_PRESETS[0]) => {
    const qty = parseFloat(preset.quantity) || 1;
    const price = parseFloat(preset.unitPrice) || 0;
    const newItem = {
      description: preset.description,
      quantity: preset.quantity,
      unitPrice: preset.unitPrice,
      amount: parseFloat((qty * price).toFixed(2)),
    };
    if (form.items.length === 1 && !form.items[0].description) {
      set("items", [newItem]);
    } else {
      set("items", [...form.items, newItem]);
    }
  };

  // ── Attachment Helpers ────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/bd/proposals/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload failed");
        }
        const data = await res.json();
        if (data.attachment) {
          setForm((prev) => ({
            ...prev,
            attachments: [...(prev.attachments || []), data.attachment],
          }));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload file";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const newAtt: ProposalAttachmentItem = {
      name: linkTitle.trim() || linkUrl.trim(),
      url: linkUrl.trim().startsWith("http") ? linkUrl.trim() : `https://${linkUrl.trim()}`,
      type: "link",
      uploadedAt: new Date(),
    };
    setForm((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAtt],
    }));
    setLinkTitle("");
    setLinkUrl("");
    setShowAddLinkForm(false);
  };

  const handleRemoveAttachment = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== idx),
    }));
  };

  // ── Computed Totals ────────────────────────────────────────────────────────
  const subtotal = form.items.reduce((s, i) => s + (i.amount || 0), 0);
  const discVal = parseFloat(form.discountValue || "0") || 0;
  const discountAmount = form.discountType === "percent"
    ? parseFloat(((subtotal * discVal) / 100).toFixed(2))
    : discVal;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRateNum = parseFloat(form.taxRate || "0") || 0;
  const taxAmt = parseFloat(((taxableAmount * taxRateNum) / 100).toFixed(2));
  const total = taxableAmount + taxAmt;
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide Panel */}
      <aside className="relative ml-auto h-full w-full max-w-2xl bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <i className="fa-solid fa-file-contract text-primary text-base" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {isEditing ? "Edit Proposal" : "Create New Proposal"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isEditing ? "Update proposal specifications & deliverables" : "Generate a customized client proposal & quote"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            {/* ── Quick Proposal Preset Templates (if not editing) ── */}
            {!isEditing && (
              <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-wand-magic-sparkles text-xs" />
                    Load Proposal Template Preset
                  </label>
                  <span className="text-[10px] text-muted-foreground">Autofills Scope & Items</span>
                </div>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  <option value="">-- Choose a standard proposal template --</option>
                  {PROPOSAL_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Quick Lead Autofill (if leads available & not editing) ── */}
            {!isEditing && leads.length > 0 && (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <i className="fa-solid fa-bolt text-xs" />
                    Quick-Fill from Existing Lead
                  </label>
                  <span className="text-[10px] text-muted-foreground">Optional</span>
                </div>
                <select
                  value={selectedLeadId}
                  onChange={(e) => handleSelectLead(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">-- Choose a lead to populate client details --</option>
                  {leads.map((l) => (
                    <option key={l._id || l.leadName} value={l._id || l.leadName}>
                      {l.leadName} {l.companyName ? `(${l.companyName})` : ""} {l.value ? `· $${Number(l.value).toLocaleString()}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Section: Proposal Information ── */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-solid fa-circle-info text-primary/70" />
                Proposal Information
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Proposal Subject / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. SEO & Growth Campaign Proposal"
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Project Name</label>
                    <input
                      type="text"
                      placeholder="e.g. TruelySell Growth Campaign"
                      value={form.projectName}
                      onChange={(e) => set("projectName", e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => set("status", e.target.value as ProposalFormData["status"])}
                      className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Currency</label>
                    <select
                      value={form.currency}
                      onChange={(e) => set("currency", e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      Issue Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={form.issueDate}
                      onChange={(e) => set("issueDate", e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      Open Till / Expiry <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      value={form.openTill}
                      onChange={(e) => set("openTill", e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section: Client Information ── */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-solid fa-user-tie text-primary/70" />
                Client Details
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Client / Contact Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. John Doe"
                    value={form.clientName}
                    onChange={(e) => set("clientName", e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. NovaWave LLC"
                    value={form.clientCompany}
                    onChange={(e) => set("clientCompany", e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Client Email</label>
                  <input
                    type="email"
                    placeholder="e.g. contact@novawave.io"
                    value={form.clientEmail}
                    onChange={(e) => set("clientEmail", e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Line Items ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-primary/70" />
                  Proposal Deliverables & Pricing
                </p>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  <i className="fa-solid fa-plus text-xs" />
                  Add Custom Item
                </button>
              </div>

              {/* Quick Deliverable Templates */}
              <div className="mb-3 space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                  <i className="fa-solid fa-wand-magic-sparkles text-primary/60 text-[10px]" />
                  Quick Presets:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DELIVERABLE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addPreset(preset)}
                      className="px-2.5 py-1 text-[10px] font-medium rounded-md bg-muted/60 hover:bg-muted text-foreground border border-border transition-all flex items-center gap-1 hover:border-primary/40"
                    >
                      <i className="fa-solid fa-plus text-[8px] text-primary" />
                      {preset.description.split(" ")[0]} {preset.description.split(" ")[1]} (${Number(preset.unitPrice).toLocaleString()})
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
                      <th className="text-left px-3 py-2">Deliverable Description</th>
                      <th className="text-center px-2 py-2 w-16">Qty</th>
                      <th className="text-right px-2 py-2 w-28">Unit Price ({form.currency})</th>
                      <th className="text-right px-3 py-2 w-28">Amount</th>
                      <th className="w-8 px-1 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {form.items.map((item, idx) => (
                      <tr key={idx} className="bg-card">
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            placeholder="e.g. SEO Audit & Strategy"
                            value={item.description}
                            onChange={(e) => updateItem(idx, "description", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs text-center bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="px-1 py-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                            className="w-full px-2 py-1.5 text-xs text-right bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">
                          {fmt(item.amount)}
                        </td>
                        <td className="px-1 py-2 text-center">
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                            >
                              <i className="fa-solid fa-trash-can text-xs" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals & Discounts / Taxes */}
              <div className="mt-3 bg-muted/20 p-4 rounded-xl border border-border space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-border/60">
                  {/* Discount Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <i className="fa-solid fa-tags text-primary text-[10px]" />
                        Discount / Promo:
                      </span>
                      <div className="flex items-center bg-background border border-border rounded-md p-0.5 text-[10px]">
                        <button
                          type="button"
                          onClick={() => set("discountType", "fixed")}
                          className={cn(
                            "px-2 py-0.5 font-bold rounded transition-all",
                            (form.discountType || "fixed") === "fixed"
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Fixed ({form.currency})
                        </button>
                        <button
                          type="button"
                          onClick={() => set("discountType", "percent")}
                          className={cn(
                            "px-2 py-0.5 font-bold rounded transition-all",
                            form.discountType === "percent"
                              ? "bg-primary text-primary-foreground shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Percent (%)
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {form.discountType === "percent" ? (
                        <>
                          {["0", "5", "10", "15", "20"].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => set("discountValue", pct)}
                              className={cn(
                                "px-2 py-0.5 text-[10px] font-bold rounded border transition-all",
                                form.discountValue === pct
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : "bg-background border-border text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {pct}%
                            </button>
                          ))}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={form.discountValue}
                              onChange={(e) => set("discountValue", e.target.value)}
                              placeholder="%"
                              className="w-16 px-2 py-0.5 text-xs text-center bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="text-xs font-semibold text-muted-foreground">{form.currency}</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={form.discountValue}
                            onChange={(e) => set("discountValue", e.target.value)}
                            placeholder="0.00"
                            className="flex-1 px-2.5 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                          />
                          {discVal > 0 && (
                            <button
                              type="button"
                              onClick={() => set("discountValue", "0")}
                              className="text-[10px] text-muted-foreground hover:text-red-500 px-1.5 py-0.5"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tax Section */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <i className="fa-solid fa-percent text-primary text-[10px]" />
                      Tax Rate (%):
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {["0", "5", "10", "15", "18"].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => set("taxRate", rate)}
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-bold rounded border transition-all",
                            form.taxRate === rate
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {rate}%
                        </button>
                      ))}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={form.taxRate}
                          onChange={(e) => set("taxRate", e.target.value)}
                          placeholder="%"
                          className="w-16 px-1.5 py-0.5 text-xs text-center bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtotal & Total Breakdown */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    {discountAmount > 0 && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        <i className="fa-solid fa-badge-percent text-xs" />
                        Discount: -{form.currency} {fmt(discountAmount)}
                      </span>
                    )}
                    {taxRateNum > 0 && (
                      <span className="text-muted-foreground">
                        Tax: +{form.currency} {fmt(taxAmt)} ({taxRateNum}%)
                      </span>
                    )}
                  </div>

                  <div className="text-right space-y-1 w-full sm:w-auto sm:min-w-[240px]">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal:</span>
                      <span className="font-semibold text-foreground">{form.currency} {fmt(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <span>Discount ({form.discountType === "percent" ? `${form.discountValue}%` : "Fixed"}):</span>
                        <span>-{form.currency} {fmt(discountAmount)}</span>
                      </div>
                    )}
                    {taxRateNum > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Tax ({taxRateNum}%):</span>
                        <span className="font-semibold text-foreground">+{form.currency} {fmt(taxAmt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-foreground border-t border-border pt-1.5">
                      <span>Grand Total:</span>
                      <span className="text-primary text-base font-black">{form.currency} {fmt(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section: Attachments & Documents ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-paperclip text-primary/70" />
                  Attachments & Supporting Documents
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLinkForm(!showAddLinkForm)}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <i className="fa-solid fa-link text-[10px]" />
                    {showAddLinkForm ? "Cancel Link" : "Add Web Link"}
                  </button>
                </div>
              </div>

              {/* Add Web Link Inline Form */}
              {showAddLinkForm && (
                <div className="p-3 bg-muted/30 border border-border rounded-xl mb-3 space-y-2 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Link title (e.g. Figma Spec Deck)"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg"
                    />
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddLinkForm(false)}
                      className="px-3 py-1 text-xs border border-border rounded-lg hover:bg-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="px-3 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                      Attach Link
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Dropzone / Button */}
              <div className="relative border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-xl p-4 text-center bg-muted/10">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
                    {isUploading ? (
                      <i className="fa-solid fa-spinner fa-spin text-primary text-sm" />
                    ) : (
                      <i className="fa-solid fa-cloud-arrow-up text-primary text-sm" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    {isUploading ? "Uploading files..." : "Click or drag & drop files here"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Supports PDF, DOCX, XLSX, PPTX, Images, ZIP (Up to 20MB each)
                  </p>
                </div>
              </div>

              {uploadError && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <i className="fa-solid fa-circle-exclamation text-xs" />
                  {uploadError}
                </p>
              )}

              {/* Attached Files List */}
              {(form.attachments && form.attachments.length > 0) && (
                <div className="mt-3 space-y-2">
                  {form.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-card border border-border/80 rounded-xl hover:border-border transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-muted/60 border border-border flex items-center justify-center flex-shrink-0">
                          <i className={cn("fa-solid text-sm", getAttachmentIcon(att.name, att.type))} />
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-semibold text-foreground truncate">{att.name}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                            {att.size ? <span>{formatFileSize(att.size)}</span> : null}
                            <span>· Attached</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                          title="View / Download"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-red-500/10 hover:border-red-500/30 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-all"
                          title="Remove attachment"
                        >
                          <i className="fa-solid fa-trash-can text-[10px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section: Tags & Notes ── */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <i className="fa-solid fa-tags text-primary/70" />
                Classification & Terms
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SEO, Growth, Enterprise, Retainer"
                    value={form.tags}
                    onChange={(e) => set("tags", e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Scope Description</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of proposal objectives & scope..."
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Terms & Conditions</label>
                  <textarea
                    rows={2}
                    placeholder="Payment milestones, deliverables timeline..."
                    value={form.terms}
                    onChange={(e) => set("terms", e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              </div>
            </div>

          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Total: <span className="font-bold text-foreground">{form.currency} {fmt(total)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading}
              className={cn(
                "px-5 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2",
                (isSubmitting || isUploading) && "opacity-60 pointer-events-none"
              )}
            >
              {isSubmitting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs" />
                  {isEditing ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>
                  <i className={`fa-solid ${isEditing ? "fa-floppy-disk" : "fa-square-plus"} text-xs`} />
                  {isEditing ? "Save Changes" : "Create Proposal"}
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
