"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ProposalPreviewData {
  _id?: string;
  proposalCode: string;
  subject: string;
  projectName?: string;
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  clientAvatarColor?: string;
  items?: { description: string; quantity: number; unitPrice: number; amount: number }[];
  attachments?: { name: string; url: string; size?: number; type?: string; uploadedAt?: string | Date }[];
  subtotal: number;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  taxRate: number;
  taxAmount: number;
  totalValue: number;
  currency: string;
  issueDate: string | Date;
  openTill: string | Date;
  status: string;
  signedBy?: string;
  signedAt?: string | Date;
  signatureType?: "drawn" | "typed";
  signatureImage?: string;
  convertedInvoiceId?: string;
  convertedProjectId?: string;
  description?: string;
  terms?: string;
  tags?: string[];
}

interface ProposalPreviewModalProps {
  isOpen: boolean;
  proposal: ProposalPreviewData | null;
  onClose: () => void;
  onStatusChange?: (
    id: string,
    newStatus: "Accepted" | "Sent" | "Declined" | "Draft",
    signatureData?: { signedBy: string; signedAt: string; signatureType?: "drawn" | "typed"; signatureImage?: string }
  ) => void | Promise<void>;
  onEdit?: (proposal: ProposalPreviewData) => void;
  onSendEmailClick?: (proposal: ProposalPreviewData) => void;
  onConvertToInvoice?: (proposal: ProposalPreviewData) => void;
  onConvertToProject?: (proposal: ProposalPreviewData) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Accepted:  { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-500" },
  Sent:      { bg: "bg-sky-500/10",     text: "text-sky-600 dark:text-sky-400",         border: "border-sky-500/20",     dot: "bg-sky-500" },
  Draft:     { bg: "bg-slate-500/10",   text: "text-slate-600 dark:text-slate-400",      border: "border-slate-500/20",   dot: "bg-slate-400" },
  Declined:  { bg: "bg-red-500/10",     text: "text-red-600 dark:text-red-400",          border: "border-red-500/20",     dot: "bg-red-500" },
  Expired:   { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",      border: "border-amber-500/20",   dot: "bg-amber-500" },
};

const LIFECYCLE_STAGES = [
  { key: "Draft", label: "1. Drafted", icon: "fa-file-pen" },
  { key: "Sent", label: "2. Sent to Client", icon: "fa-paper-plane" },
  { key: "Review", label: "3. Under Review", icon: "fa-magnifying-glass-chart" },
  { key: "Accepted", label: "4. Accepted & Signed", icon: "fa-file-signature" },
];

function fmt(n: number) {
  return (n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | Date | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtDateTime(d: string | Date | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

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

export default function ProposalPreviewModal({
  isOpen,
  proposal,
  onClose,
  onStatusChange,
  onEdit,
  onSendEmailClick,
  onConvertToInvoice,
  onConvertToProject,
}: ProposalPreviewModalProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [signType, setSignType] = useState<"drawn" | "typed">("drawn");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  if (!isOpen || !proposal) return null;

  const statusStyle = STATUS_STYLES[proposal.status] ?? STATUS_STYLES["Draft"];
  const items = proposal.items ?? [];
  const attachments = proposal.attachments ?? [];
  const discountAmount = proposal.discountAmount ?? 0;
  const taxableSubtotal = Math.max(0, proposal.subtotal - discountAmount);

  // Stepper active index
  const getStageIndex = () => {
    if (proposal.status === "Draft") return 0;
    if (proposal.status === "Sent") return 1;
    if (proposal.status === "Accepted") return 3;
    return 1;
  };
  const currentStageIndex = getStageIndex();

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/proposals/${proposal._id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleQuickStatus = async (
    newStatus: "Accepted" | "Sent" | "Declined" | "Draft",
    signatureData?: { signedBy: string; signedAt: string; signatureType?: "drawn" | "typed"; signatureImage?: string }
  ) => {
    if (!proposal._id || !onStatusChange) return;
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(proposal._id, newStatus, signatureData);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openSignModal = () => {
    setSignerName(proposal.clientName || "");
    setSignerEmail(proposal.clientEmail || "");
    setHasAgreedTerms(false);
    setHasDrawn(false);
    setShowSignDialog(true);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirmSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim() || !hasAgreedTerms) return;

    let signatureImage = "";
    if (signType === "drawn") {
      const canvas = canvasRef.current;
      if (canvas && hasDrawn) {
        signatureImage = canvas.toDataURL("image/png");
      }
    }

    const nowIso = new Date().toISOString();
    await handleQuickStatus("Accepted", {
      signedBy: signerName.trim(),
      signedAt: nowIso,
      signatureType: signType,
      signatureImage,
    });
    setShowSignDialog(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-muted/40 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <i className="fa-solid fa-file-invoice text-primary text-base" />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-sm font-bold text-foreground">Proposal Document</h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  #{proposal.proposalCode}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                    statusStyle.bg,
                    statusStyle.text,
                    statusStyle.border
                  )}
                >
                  <span className={cn("w-1.5 h-1.5 rounded-full", statusStyle.dot)} />
                  {proposal.status}
                </span>
                {proposal.convertedProjectId && (
                  <Link
                    href="/dashboard/projects"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 transition-all"
                    title="Open in Projects Module"
                  >
                    <i className="fa-solid fa-diagram-project text-[9px]" />
                    Project Linked
                    <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" />
                  </Link>
                )}
                {proposal.convertedInvoiceId && (
                  <Link
                    href="/dashboard/finance"
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
                    title="Open in Finance Portal"
                  >
                    <i className="fa-solid fa-file-invoice-dollar text-[9px]" />
                    Invoice Linked
                    <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" />
                  </Link>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-sm">{proposal.subject}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
              title="Copy shareable client portal link"
            >
              <i className={cn("fa-solid text-xs", copiedLink ? "fa-check text-emerald-500" : "fa-link text-primary")} />
              {copiedLink ? "Copied Link" : "Share Link"}
            </button>

            {onEdit && (
              <button
                onClick={() => { onClose(); onEdit(proposal); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
              >
                <i className="fa-solid fa-pen-to-square text-xs" />
                Edit
              </button>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
            >
              <i className="fa-solid fa-print text-xs text-muted-foreground" />
              Print / PDF
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-1"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* Lifecycle Stepper (CRM Status Progress) */}
        <div className="px-6 py-3 border-b border-border bg-muted/20 print:hidden overflow-x-auto">
          <div className="flex items-center justify-between w-full min-w-[500px]">
            {LIFECYCLE_STAGES.map((stage, idx) => {
              const isPassed = idx <= currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div key={stage.key} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0",
                        isCurrent
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : isPassed
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground border border-border"
                      )}
                    >
                      {isPassed && !isCurrent ? (
                        <i className="fa-solid fa-check text-[9px]" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-semibold whitespace-nowrap",
                        isCurrent
                          ? "text-primary font-bold"
                          : isPassed
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {idx < LIFECYCLE_STAGES.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-2 rounded min-w-[24px]",
                        idx < currentStageIndex ? "bg-emerald-500" : "bg-border"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div id="printable-proposal" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-card text-foreground">
          
          {/* Header Row: Company Brand + Proposal Meta */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
                  N
                </div>
                <span className="font-black text-lg tracking-tight text-foreground">NexAce Technologies</span>
              </div>
              <p className="text-xs text-muted-foreground">Strategic Consulting & Enterprise Technology</p>
              <p className="text-xs text-muted-foreground mt-1">proposals@nexace.io · +1 (800) 555-0199</p>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-2xl font-black text-primary tracking-tight block">PROPOSAL</span>
              <p className="text-xs font-mono font-semibold text-foreground">#{proposal.proposalCode}</p>
              <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
                <p>Issue Date: <span className="font-medium text-foreground">{fmtDate(proposal.issueDate)}</span></p>
                <p>Valid Till: <span className="font-medium text-foreground">{fmtDate(proposal.openTill)}</span></p>
              </div>
            </div>
          </div>

          {/* Client & Project Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-border">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Proposal Prepared For</p>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs", proposal.clientAvatarColor ?? "bg-blue-500")}>
                  {getInitials(proposal.clientName)}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{proposal.clientName}</p>
                  {proposal.clientCompany && (
                    <p className="text-xs font-semibold text-primary">{proposal.clientCompany}</p>
                  )}
                  {proposal.clientEmail && (
                    <p className="text-xs text-muted-foreground">{proposal.clientEmail}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Project Initiative</p>
              <p className="text-sm font-bold text-foreground">{proposal.projectName || proposal.subject}</p>
              <p className="text-xs text-muted-foreground">{proposal.subject}</p>
              {proposal.tags && proposal.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 sm:justify-end pt-1">
                  {proposal.tags.map((t, idx) => (
                    <span key={idx} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description / Scope of Work */}
          {proposal.description && (
            <div className="pb-6 border-b border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-align-left text-primary/70" />
                Executive Summary & Scope
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-3.5 rounded-xl border border-border/60">
                {proposal.description}
              </p>
            </div>
          )}

          {/* Line Items Table */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <i className="fa-solid fa-list-check text-primary/70" />
              Deliverables & Financial Breakdown
            </p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/60 border-b border-border text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Item & Deliverable Description</th>
                    <th className="py-2.5 px-3 text-center w-16">Qty</th>
                    <th className="py-2.5 px-3 text-right w-24">Rate ({proposal.currency})</th>
                    <th className="py-2.5 px-3 text-right w-28">Amount ({proposal.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-muted-foreground italic">No line items specified</td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-foreground">{item.description}</td>
                        <td className="py-2.5 px-3 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{fmt(item.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">{fmt(item.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 space-y-1.5 text-xs bg-muted/30 p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono font-medium text-foreground">{proposal.currency} {fmt(proposal.subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount {proposal.discountType === "percent" ? `(${proposal.discountValue}%)` : "(Fixed)"}</span>
                  <span className="font-mono font-medium">- {proposal.currency} {fmt(discountAmount)}</span>
                </div>
              )}
              {proposal.taxRate > 0 && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tax ({proposal.taxRate}%)</span>
                  <span className="font-mono font-medium text-foreground">{proposal.currency} {fmt(proposal.taxAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex items-center justify-between text-sm font-black text-foreground">
                <span>Total Investment</span>
                <span className="font-mono text-primary">{proposal.currency} {fmt(proposal.totalValue)}</span>
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          {attachments.length > 0 && (
            <div className="pb-4 border-b border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-paperclip text-primary/70" />
                Attached Documents & Specifications ({attachments.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                        <i className={cn("fa-solid text-sm", getAttachmentIcon(att.name, att.type))} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{att.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {att.type === "link" ? "External Resource" : formatFileSize(att.size)}
                        </p>
                      </div>
                    </div>
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Terms & Payment Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 pb-6 border-b border-border">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <i className="fa-solid fa-handshake text-primary/70" />
                Terms of Engagement
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                {proposal.terms || "Standard business terms apply. Payment due within 30 days of invoice."}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <i className="fa-solid fa-money-check-dollar text-primary/70" />
                Wire & Remittance Details
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Wire Transfer / ACH Remittance to: <br />
                <span className="font-medium text-foreground">Silicon Valley Commercial Bank</span><br />
                Account: NexAce Operations LLC · Routing: 121000358
              </p>
            </div>
          </div>

          {/* Signatory & Digital Signature Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-border pt-6 mt-4">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Authorized Signature (Provider)</p>
              <div className="h-14 border-b border-muted-foreground/40 flex items-end pb-1 font-serif italic text-base text-primary">
                NexAce Business Development
              </div>
              <p className="text-[10px] text-muted-foreground">Date: {fmtDate(proposal.issueDate)}</p>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Client Acceptance Signature</p>
              
              {proposal.signedBy ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <i className="fa-solid fa-certificate text-emerald-500" />
                    Digitally Signed & Accepted
                  </div>
                  
                  {proposal.signatureImage ? (
                    <div className="p-1 bg-white rounded-lg border border-border inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proposal.signatureImage} alt="Signature" className="h-10 w-auto object-contain" />
                    </div>
                  ) : (
                    <div className="font-serif italic text-lg text-foreground font-semibold">
                      {proposal.signedBy}
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground">
                    Timestamp: {fmtDateTime(proposal.signedAt)}
                  </p>
                  <p className="text-[9px] font-mono text-emerald-600/80 dark:text-emerald-400/80">
                    Fingerprint: ESIGN-{proposal.proposalCode}-VERIFIED
                  </p>
                </div>
              ) : proposal.status === "Accepted" ? (
                <div className="h-14 border-b border-muted-foreground/40 flex items-end pb-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <i className="fa-solid fa-circle-check" /> Accepted by {proposal.clientName}
                  </span>
                </div>
              ) : (
                <div className="h-14 border-b border-dashed border-muted-foreground/40 flex items-center justify-between pb-1">
                  <span className="italic text-xs text-muted-foreground">Pending client signature</span>
                  <button
                    type="button"
                    onClick={openSignModal}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <i className="fa-solid fa-file-signature text-[10px]" />
                    E-Sign Now
                  </button>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                Date: {proposal.signedAt ? fmtDate(proposal.signedAt) : proposal.status === "Accepted" ? fmtDate(new Date()) : "____________________"}
              </p>
            </div>
          </div>

          {/* Footer watermark */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-3">
            <span>Powered by NexAce Enterprise CRM</span>
            <span>Document #{proposal.proposalCode}</span>
          </div>

        </div>

        {/* Action Footer (Interactive for rapid CRM workflow, hidden when printed) */}
        <div className="px-6 py-3.5 border-t border-border bg-muted/40 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSendEmailClick?.(proposal)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
            >
              <i className="fa-solid fa-paper-plane text-sky-500" />
              Send to Client Email
            </button>

            {proposal.status === "Accepted" && (
              <>
                {proposal.convertedInvoiceId ? (
                  <Link
                    href="/dashboard/finance"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-all"
                  >
                    <i className="fa-solid fa-file-invoice-dollar" />
                    View in Finance
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  </Link>
                ) : onConvertToInvoice ? (
                  <button
                    onClick={() => onConvertToInvoice(proposal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  >
                    <i className="fa-solid fa-file-invoice-dollar" />
                    Convert to Invoice
                  </button>
                ) : null}

                {proposal.convertedProjectId ? (
                  <Link
                    href="/dashboard/projects"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400 hover:bg-violet-500/25 transition-all"
                  >
                    <i className="fa-solid fa-diagram-project" />
                    View in Projects
                    <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  </Link>
                ) : onConvertToProject ? (
                  <button
                    onClick={() => onConvertToProject(proposal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-all"
                  >
                    <i className="fa-solid fa-diagram-project" />
                    Convert to Project
                  </button>
                ) : null}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!proposal.signedBy && proposal.status !== "Accepted" && (
              <button
                disabled={isUpdatingStatus}
                onClick={openSignModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs"
              >
                <i className="fa-solid fa-file-signature" />
                Sign & Accept
              </button>
            )}

            {proposal.status !== "Accepted" && onStatusChange && !proposal.signedBy && (
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus("Accepted")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all"
              >
                <i className="fa-solid fa-circle-check" />
                Quick Accept
              </button>
            )}

            {proposal.status !== "Declined" && onStatusChange && (
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleQuickStatus("Declined")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all"
              >
                <i className="fa-solid fa-circle-xmark" />
                Mark Declined
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>

      {/* ── Electronic Signature Acceptance Dialog ── */}
      {showSignDialog && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs animate-in fade-in"
            onClick={() => setShowSignDialog(false)}
          />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <i className="fa-solid fa-file-signature text-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Digital Signature & Acceptance</h3>
                  <p className="text-[11px] text-muted-foreground">Proposal #{proposal.proposalCode}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSignDialog(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleConfirmSignature} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Authorized Signatory Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Signatory Email Address
                </label>
                <input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="e.g. eleanor@client.com"
                  className="w-full px-3 py-2 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Signature Mode Toggle */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Signature Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignType("drawn")}
                    className={cn(
                      "py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                      signType === "drawn"
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <i className="fa-solid fa-pen-nib" />
                    Hand-Drawn
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignType("typed")}
                    className={cn(
                      "py-1.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                      signType === "typed"
                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <i className="fa-solid fa-keyboard" />
                    Typed Font
                  </button>
                </div>
              </div>

              {/* Signature Drawing / Preview Canvas */}
              {signType === "drawn" ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Draw signature below:</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                    >
                      <i className="fa-solid fa-rotate-left text-[9px]" /> Clear
                    </button>
                  </div>
                  <div className="border border-border rounded-xl bg-white overflow-hidden shadow-inner cursor-crosshair">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={100}
                      className="w-full h-24 touch-none block"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-muted/40 rounded-xl border border-dashed border-emerald-500/40 text-center">
                  <span className="font-serif italic text-2xl text-emerald-600 dark:text-emerald-400 tracking-wider">
                    {signerName.trim() || "Your Signature"}
                  </span>
                </div>
              )}

              {/* Agreement Checkbox */}
              <label className="flex items-start gap-2.5 text-xs text-muted-foreground cursor-pointer pt-1">
                <input
                  required
                  type="checkbox"
                  checked={hasAgreedTerms}
                  onChange={(e) => setHasAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-input text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  I confirm that I am authorized to legally accept this proposal of{" "}
                  <strong className="text-foreground">{proposal.currency} {fmt(proposal.totalValue)}</strong> on behalf of{" "}
                  <strong className="text-foreground">{proposal.clientCompany || proposal.clientName}</strong>.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowSignDialog(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStatus || !signerName.trim() || !hasAgreedTerms}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-xs disabled:opacity-50"
                >
                  Confirm & E-Sign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
