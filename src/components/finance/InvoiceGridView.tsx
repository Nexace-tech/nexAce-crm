"use client";

import React, { useState, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FinanceInvoice } from "./FinancePortalDashboard";
import { InvoiceDetailsView, type InvoiceDetailsData, type InvoiceDetailsItem } from "./InvoiceDetailsView";

interface InvoiceGridViewProps {
  invoices: FinanceInvoice[];
  loading?: boolean;
  scope?: "internal" | "external";
  onNewInvoice: () => void;
  onViewInvoice?: (inv: FinanceInvoice) => void;
  onEditInvoice: (inv: FinanceInvoice) => void;
  onDeleteInvoice: (id: string, name: string) => void;
  onRefresh?: () => void;
  showToast?: (message: string, type?: "success" | "error") => void;
}

const fmt = (val: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
const fmtDec = (val: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const fmtDate = (d?: string | Date) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return String(d); }
};

const fmtDateTime = (d?: string | Date) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(d);
  }
};

function getDaysUntilDue(dueDate?: string) {
  if (!dueDate) return null;
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; border: string; icon: string }> = {
  Paid:      { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500", border: "border-emerald-500/25", icon: "fa-circle-check" },
  Pending:   { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",     dot: "bg-amber-500",   border: "border-amber-500/25",   icon: "fa-clock" },
  Approved:  { bg: "bg-teal-500/10",    text: "text-teal-600 dark:text-teal-400",       dot: "bg-teal-500",    border: "border-teal-500/25",    icon: "fa-wallet" },
  Rejected:  { bg: "bg-rose-500/10",    text: "text-rose-600 dark:text-rose-400",       dot: "bg-rose-500",    border: "border-rose-500/25",    icon: "fa-ban" },
  Overdue:   { bg: "bg-rose-500/10",    text: "text-rose-600 dark:text-rose-400",        dot: "bg-rose-500",    border: "border-rose-500/25",    icon: "fa-triangle-exclamation" },
  Draft:     { bg: "bg-slate-500/10",   text: "text-slate-500 dark:text-slate-400",      dot: "bg-slate-400",   border: "border-slate-400/25",   icon: "fa-file-pen" },
  Cancelled: { bg: "bg-zinc-500/10",    text: "text-zinc-500",                            dot: "bg-zinc-400",    border: "border-zinc-400/25",    icon: "fa-ban" },
};

const AVATAR_COLORS = ["bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-indigo-500","bg-teal-500","bg-pink-500","bg-orange-500"];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatForInvoiceDetails(inv: any): InvoiceDetailsData {
  const rawItems = inv.items || inv.lineItems || [];
  const items: InvoiceDetailsItem[] = rawItems.length > 0
    ? rawItems.map((it: any) => ({
        description: it.description || "Services Rendered",
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice ?? it.amount) || Number(inv.amount) || 0,
        amount: Number(it.amount) || (Number(it.quantity || 1) * Number(it.unitPrice || 0)) || Number(inv.amount) || 0,
      }))
    : [
        {
          description: inv.notes || `${inv.category || "Professional Consulting"} Deliverables`,
          quantity: 1,
          unitPrice: Number(inv.amount) || 0,
          amount: Number(inv.amount) || 0,
        },
      ];

  const subtotal = Number(inv.subtotal) || items.reduce((s, it) => s + it.amount, 0) || Number(inv.amount) || 0;
  const taxRate = Number(inv.taxRate) || 0;
  const taxAmount = Number(inv.taxAmount) || 0;
  const total = Number(inv.total) || Number(inv.amount) || (subtotal + taxAmount);

  return {
    _id: inv._id,
    id: inv._id,
    invoiceNo: inv.invoiceNo,
    invoiceDate: inv.issuedDate || inv.invoiceDate || new Date().toISOString().slice(0, 10),
    dueDate: inv.dueDate || "",
    customerNo: inv.customerNo || "",
    businessName: inv.businessName || inv.client || "NexAce Technologies",
    businessAddress: inv.businessAddress || "",
    businessEmail: inv.businessEmail || "",
    billedToName: inv.billedToName || inv.venture || "NexAce Technologies",
    billedToAddress: inv.billedToAddress || "",
    billedToEmail: inv.billedToEmail || "",
    items,
    subtotal,
    taxRate,
    taxAmount,
    total,
    currency: inv.currency || "USD",
    status: inv.status || "Draft",
    notes: inv.notes || "",
    bankDetails: inv.bankDetails,
    paymentDetails: inv.paymentDetails,
    shiftAttendance: inv.shiftAttendance || null,
    timesheetEntries: inv.timesheetEntries || null,
    signatureUrl: inv.signatureUrl || "",
    approvedBy: inv.approvedBy || "",
    approvedAt: inv.approvedAt || "",
    approverRole: inv.approverRole,
    rejectionReason: inv.rejectionReason,
    rejectedBy: inv.rejectedBy,
    rejectedAt: inv.rejectedAt,
    rejectionHistory: inv.rejectionHistory,
    timeline: inv.timeline,
    approvalStage: inv.approvalStage,
    revisionCount: inv.revisionCount,
    userUpiId: inv.userUpiId || inv.bankDetails?.upiId,
  };
}

export default function InvoiceGridView({
  invoices,
  loading = false,
  scope = "internal",
  onNewInvoice,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onRefresh,
  showToast,
}: InvoiceGridViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [pipelineFilter, setPipelineFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "name">("date_desc");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<FinanceInvoice | null>(null);

  // Trace Lifecycle Modal
  const [traceInvoice, setTraceInvoice] = useState<FinanceInvoice | null>(null);

  // Reject Modal
  const [rejectModal, setRejectModal] = useState<{ open: boolean; invoice: FinanceInvoice | null; reason: string }>({
    open: false,
    invoice: null,
    reason: "",
  });

  // Payout / Settlement Modal
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    invoice: FinanceInvoice | null;
    method: "UPI" | "Bank Transfer" | "Cash";
    upiId: string;
    txnId: string;
    notes: string;
  }>({
    open: false,
    invoice: null,
    method: "UPI",
    upiId: "",
    txnId: "",
    notes: "",
  });

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const notify = (msg: string, type: "success" | "error" = "success") => {
    if (showToast) {
      showToast(msg, type);
    } else {
      alert(msg);
    }
  };

  const handleViewInvoice = (inv: FinanceInvoice) => {
    if (onViewInvoice) {
      onViewInvoice(inv);
    } else {
      setViewingInvoice(inv);
    }
  };

  /** Core Smart PATCH */
  const patchInvoice = async (invoiceId: string, body: Record<string, unknown>) => {
    setIsUpdatingStatus(true);
    try {
      const targetInv = invoices.find((i) => i._id === invoiceId);
      const cat = ((targetInv as any)?.category || "").toLowerCase();
      const isEmployee = cat.includes("employee") || !!(targetInv as any)?.shiftAttendance || !!(targetInv as any)?.timesheetEntries;

      const primary = isEmployee ? `/api/it/invoices/${invoiceId}` : `/api/finance/invoices/${invoiceId}`;
      const fallback = isEmployee ? `/api/finance/invoices/${invoiceId}` : `/api/it/invoices/${invoiceId}`;

      let res = await fetch(primary, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        res = await fetch(fallback, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (res.ok) {
        const data = await res.json();
        notify(data.message || "Invoice updated successfully", "success");
        if (onRefresh) onRefresh();

        // Update viewing invoice state if open
        if (viewingInvoice && viewingInvoice._id === invoiceId) {
          const updatedInv = data.invoice || { ...viewingInvoice, ...body };
          setViewingInvoice(updatedInv);
        }
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        notify(errData.error || "Failed to update invoice", "error");
        return false;
      }
    } catch (err: any) {
      console.error("Error updating invoice:", err);
      notify("Network error updating invoice", "error");
      return false;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  /** HR Approve */
  const handleApprove = async (inv: FinanceInvoice) => {
    await patchInvoice(inv._id, { status: "Approved" });
  };

  /** Open Reject Modal */
  const handleOpenReject = (inv: FinanceInvoice) => {
    setRejectModal({
      open: true,
      invoice: inv,
      reason: "",
    });
  };

  /** Confirm Rejection with Reason */
  const handleConfirmReject = async () => {
    if (!rejectModal.invoice) return;
    if (!rejectModal.reason.trim()) {
      notify("Please provide a reason for rejection", "error");
      return;
    }
    const ok = await patchInvoice(rejectModal.invoice._id, {
      status: "Rejected",
      rejectionReason: rejectModal.reason.trim(),
    });
    if (ok) {
      setRejectModal({ open: false, invoice: null, reason: "" });
    }
  };

  /** Open Payment Modal */
  const handleOpenPayout = (inv: FinanceInvoice) => {
    if (inv.status !== "Approved") {
      notify("Approval Mandatory: Invoice must be approved by HR or Admin before payout.", "error");
      return;
    }
    const targetUpi = (inv.userUpiId || inv.bankDetails?.upiId || "").trim();
    setPaymentModal({
      open: true,
      invoice: inv,
      method: "UPI",
      upiId: targetUpi,
      txnId: "",
      notes: "",
    });
  };

  /** Confirm Payout */
  const handleConfirmPayout = async () => {
    if (!paymentModal.invoice) return;
    if (paymentModal.method === "UPI" && !paymentModal.txnId.trim()) {
      notify("UPI Transaction ID is required to confirm settlement", "error");
      return;
    }
    const ok = await patchInvoice(paymentModal.invoice._id, {
      status: "Paid",
      paymentDetails: {
        method: paymentModal.method,
        transactionId: paymentModal.txnId.trim(),
        upiId: paymentModal.upiId.trim(),
        notes: paymentModal.notes.trim(),
        paidAt: new Date().toISOString(),
      },
    });
    if (ok) {
      setPaymentModal({ open: false, invoice: null, method: "UPI", upiId: "", txnId: "", notes: "" });
    }
  };

  // Pipeline Metrics
  const internalMetrics = useMemo(() => {
    return {
      all: invoices.length,
      pendingHr: invoices.filter((i) => i.approvalStage === "PENDING_HR" || (i.status === "Pending" && !i.approvalStage)).length,
      pendingAdmin: invoices.filter((i) => i.approvalStage === "PENDING_ADMIN" || i.status === "Approved").length,
      paid: invoices.filter((i) => i.status === "Paid").length,
      rejected: invoices.filter((i) => i.status === "Rejected" || i.approvalStage === "REJECTED").length,
    };
  }, [invoices]);

  const externalMetrics = useMemo(() => {
    return {
      all: invoices.length,
      draft: invoices.filter((i) => i.status === "Draft").length,
      pending: invoices.filter((i) => i.status === "Pending").length,
      approved: invoices.filter((i) => i.status === "Approved").length,
      paid: invoices.filter((i) => i.status === "Paid").length,
      overdue: invoices.filter((i) => i.status === "Overdue").length,
    };
  }, [invoices]);

  const kpis = useMemo(() => {
    return {
      total: invoices.length,
      paid: invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0),
      paidCount: invoices.filter((i) => i.status === "Paid").length,
      pending: invoices.filter((i) => i.status === "Pending").reduce((s, i) => s + i.amount, 0),
      pendingCount: invoices.filter((i) => i.status === "Pending").length,
      overdue: invoices.filter((i) => i.status === "Overdue").reduce((s, i) => s + i.amount, 0),
      overdueCount: invoices.filter((i) => i.status === "Overdue").length,
      draft: invoices.filter((i) => i.status === "Draft").length,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    const list = invoices.filter((inv) => {
      const q = search.toLowerCase();
      const matchSearch = !q || inv.invoiceNo.toLowerCase().includes(q) || inv.client.toLowerCase().includes(q) || (inv.category || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || inv.status === statusFilter;

      let matchPipeline = true;
      if (scope === "internal") {
        if (pipelineFilter === "PENDING_HR") {
          matchPipeline = inv.approvalStage === "PENDING_HR" || (inv.status === "Pending" && !inv.approvalStage);
        } else if (pipelineFilter === "PENDING_ADMIN") {
          matchPipeline = inv.approvalStage === "PENDING_ADMIN" || inv.status === "Approved";
        } else if (pipelineFilter === "PAID") {
          matchPipeline = inv.status === "Paid";
        } else if (pipelineFilter === "REJECTED") {
          matchPipeline = inv.status === "Rejected" || inv.approvalStage === "REJECTED";
        }
      } else {
        if (pipelineFilter === "DRAFT") matchPipeline = inv.status === "Draft";
        else if (pipelineFilter === "PENDING") matchPipeline = inv.status === "Pending";
        else if (pipelineFilter === "APPROVED") matchPipeline = inv.status === "Approved";
        else if (pipelineFilter === "PAID") matchPipeline = inv.status === "Paid";
        else if (pipelineFilter === "OVERDUE") matchPipeline = inv.status === "Overdue";
      }

      return matchSearch && matchStatus && matchPipeline;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "date_desc") {
        const timeA = new Date(a.createdAt || a.issuedDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.issuedDate || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return new Date(b.issuedDate || 0).getTime() - new Date(a.issuedDate || 0).getTime();
      }
      if (sortBy === "date_asc") {
        const timeA = new Date(a.createdAt || a.issuedDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.issuedDate || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return new Date(a.issuedDate || 0).getTime() - new Date(b.issuedDate || 0).getTime();
      }
      if (sortBy === "amount_desc") return b.amount - a.amount;
      if (sortBy === "amount_asc")  return a.amount - b.amount;
      if (sortBy === "name") return a.client.localeCompare(b.client);
      return 0;
    });
  }, [invoices, search, statusFilter, pipelineFilter, sortBy, scope]);

  const kpiCards = [
    { label: "Total Invoices", value: kpis.total, sub: `${kpis.draft} draft`, icon: "fa-file-invoice-dollar", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    { label: "Paid Revenue",   value: `$${fmt(kpis.paid)}`,    sub: `${kpis.paidCount} invoices`,    icon: "fa-circle-check",          color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Pending",        value: `$${fmt(kpis.pending)}`, sub: `${kpis.pendingCount} invoices`, icon: "fa-clock",                 color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
    { label: "Overdue",        value: `$${fmt(kpis.overdue)}`, sub: `${kpis.overdueCount} invoices`, icon: "fa-triangle-exclamation",  color: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-500/10",    border: "border-rose-500/20" },
  ];

  if (viewingInvoice) {
    return (
      <InvoiceDetailsView
        invoice={formatForInvoiceDetails(viewingInvoice)}
        onClose={() => setViewingInvoice(null)}
        onStatusChange={async (newStatus, reason) => {
          if (newStatus === "Rejected") {
            await patchInvoice(viewingInvoice._id, { status: "Rejected", rejectionReason: reason });
          } else if (newStatus === "Approved") {
            await patchInvoice(viewingInvoice._id, { status: "Approved" });
          } else if (newStatus === "Paid") {
            handleOpenPayout(viewingInvoice);
          } else {
            await patchInvoice(viewingInvoice._id, { status: newStatus });
          }
        }}
        onPaymentConfirm={() => handleOpenPayout(viewingInvoice)}
        isUpdatingStatus={isUpdatingStatus}
        scope={scope}
      />
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* KPI Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((m) => (
          <div key={m.label} className={cn("flex items-center justify-between p-4 bg-card border rounded-2xl shadow-xs hover:shadow-sm transition-all", m.border)}>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{m.label}</p>
              <p className={cn("text-xl font-extrabold", m.color)}>{m.value}</p>
              <p className="text-[11px] text-muted-foreground">{m.sub}</p>
            </div>
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", m.bg)}>
              <i className={cn("fa-solid text-lg", m.icon, m.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* Scope-Aware Pipeline Filter Chips */}
      <div className="bg-card border border-border/80 rounded-2xl p-2.5 shadow-xs">
        <div className="flex items-center justify-between pb-2 px-1 border-b border-border/40 mb-2">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-filter text-primary text-xs" />
            <span className="text-xs font-bold text-foreground">
              {scope === "internal" ? "Internal Lifecycle Pipeline" : "External Settlement Pipeline"}
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            Showing {filtered.length} of {invoices.length} invoices
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {scope === "internal" ? (
            <>
              <button
                type="button"
                onClick={() => setPipelineFilter("ALL")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "ALL"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                )}
              >
                <i className="fa-solid fa-list-check text-[10px]" />
                <span>All Lifecycle</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "ALL" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                  {internalMetrics.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineFilter("PENDING_HR")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "PENDING_HR"
                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                    : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                )}
              >
                <i className="fa-solid fa-user-clock text-[10px]" />
                <span>Awaiting HR Review</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "PENDING_HR" ? "bg-white/25 text-white" : "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold")}>
                  {internalMetrics.pendingHr}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineFilter("PENDING_ADMIN")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "PENDING_ADMIN"
                    ? "bg-teal-600 text-white border-teal-700 shadow-xs"
                    : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30"
                )}
              >
                <i className="fa-solid fa-wallet text-[10px]" />
                <span>Ready for Payout</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "PENDING_ADMIN" ? "bg-white/25 text-white" : "bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold")}>
                  {internalMetrics.pendingAdmin}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineFilter("PAID")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "PAID"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                )}
              >
                <i className="fa-solid fa-circle-check text-[10px]" />
                <span>Paid & Settled</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "PAID" ? "bg-white/25 text-white" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold")}>
                  {internalMetrics.paid}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineFilter("REJECTED")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "REJECTED"
                    ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                    : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30"
                )}
              >
                <i className="fa-solid fa-rotate-right text-[10px]" />
                <span>In Revision</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "REJECTED" ? "bg-white/25 text-white" : "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold")}>
                  {internalMetrics.rejected}
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPipelineFilter("ALL")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "ALL"
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                )}
              >
                <i className="fa-solid fa-list-check text-[10px]" />
                <span>All Invoices</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "ALL" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                  {externalMetrics.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineFilter("DRAFT")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "DRAFT"
                    ? "bg-slate-700 text-white border-slate-800 shadow-xs"
                    : "bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30"
                )}
              >
                <i className="fa-solid fa-file-pen text-[10px]" />
                <span>Drafts</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "DRAFT" ? "bg-white/25 text-white" : "bg-slate-500/20 text-slate-700 dark:text-slate-300 font-bold")}>
                  {externalMetrics.draft}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineFilter("PENDING")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "PENDING"
                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                    : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                )}
              >
                <i className="fa-solid fa-clock text-[10px]" />
                <span>Awaiting Sign-off</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "PENDING" ? "bg-white/25 text-white" : "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold")}>
                  {externalMetrics.pending}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineFilter("APPROVED")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "APPROVED"
                    ? "bg-teal-600 text-white border-teal-700 shadow-xs"
                    : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30"
                )}
              >
                <i className="fa-solid fa-check-double text-[10px]" />
                <span>Ready for Settlement</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "APPROVED" ? "bg-white/25 text-white" : "bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold")}>
                  {externalMetrics.approved}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineFilter("PAID")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "PAID"
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                )}
              >
                <i className="fa-solid fa-circle-check text-[10px]" />
                <span>Settled</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "PAID" ? "bg-white/25 text-white" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold")}>
                  {externalMetrics.paid}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setPipelineFilter("OVERDUE")}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer border",
                  pipelineFilter === "OVERDUE"
                    ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                    : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30"
                )}
              >
                <i className="fa-solid fa-triangle-exclamation text-[10px]" />
                <span>Overdue</span>
                <span className={cn("ml-1 px-1.5 py-0.2 rounded-full text-[10px]", pipelineFilter === "OVERDUE" ? "bg-white/25 text-white" : "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold")}>
                  {externalMetrics.overdue}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {["All", "Paid", "Pending", "Approved", "Rejected", "Overdue", "Draft", "Cancelled"].map((s) => (
              <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-8 px-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
            <option value="name">Client Name</option>
          </select>
          <span className="text-[11px] text-muted-foreground font-medium hidden md:inline-block">
            {filtered.length} found
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn("w-8 h-7 rounded-md flex items-center justify-center text-xs transition-all cursor-pointer", viewMode === "grid" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
              title="Grid View"
            >
              <i className="fa-solid fa-grip text-[11px]" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn("w-8 h-7 rounded-md flex items-center justify-center text-xs transition-all cursor-pointer", viewMode === "list" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
              title="List View"
            >
              <i className="fa-solid fa-list text-[11px]" />
            </button>
          </div>
          <button
            type="button"
            onClick={onNewInvoice}
            className="flex items-center gap-2 h-8 px-4 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-plus text-[10px]" />
            <span>New Invoice</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border/80 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="h-2.5 bg-muted rounded w-full" />
              <div className="h-2.5 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === "grid" && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card border border-border/80 rounded-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <i className="fa-solid fa-file-invoice-dollar text-2xl text-muted-foreground/40" />
            </div>
            <p className="text-sm font-bold text-foreground">No invoices found</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {search || statusFilter !== "All" || pipelineFilter !== "ALL"
                ? "Try adjusting your filters or search terms"
                : `No ${scope} invoices generated yet`}
            </p>
            <button
              onClick={onNewInvoice}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]" />Create Invoice
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((inv) => {
              const sc = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.Draft;
              const initials = getInitials(inv.client);
              const avatarColor = getAvatarColor(inv.client);
              const daysUntilDue = getDaysUntilDue(inv.dueDate);
              const isMenuOpen = actionMenu === inv._id;

              return (
                <div
                  key={inv._id}
                  className="group bg-card border border-border/80 rounded-2xl shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 flex flex-col overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="px-4 pt-3.5 pb-3 flex items-center justify-between gap-2 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleViewInvoice(inv)}
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 truncate max-w-[130px] shrink-0 cursor-pointer transition-colors text-left"
                        title="Click to view details"
                      >
                        {inv.invoiceNo}
                      </button>
                      {inv.category && (
                        <span className="text-[10px] font-medium text-muted-foreground truncate hidden sm:block">
                          {inv.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {inv.status !== "Paid" && inv.status !== "Cancelled" && daysUntilDue !== null && (
                        daysUntilDue < 0 ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">Overdue</span>
                        ) : daysUntilDue <= 5 ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            {daysUntilDue === 0 ? "Due today" : `${daysUntilDue}d`}
                          </span>
                        ) : null
                      )}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActionMenu(isMenuOpen ? null : inv._id)}
                          className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        >
                          <i className="fa-solid fa-ellipsis-vertical text-xs" />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 z-50 w-48 bg-popover border border-border rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                            <button
                              onClick={() => { handleViewInvoice(inv); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left cursor-pointer font-medium"
                            >
                              <i className="fa-solid fa-eye text-primary w-4" />View Details
                            </button>
                            <button
                              onClick={() => { setTraceInvoice(inv); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-indigo-500 transition-colors text-left cursor-pointer font-medium"
                            >
                              <i className="fa-solid fa-route w-4" />Trace Lifecycle
                            </button>
                            {inv.status === "Pending" && (
                              <>
                                <button
                                  onClick={() => { handleApprove(inv); setActionMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-teal-500/10 text-teal-600 dark:text-teal-400 transition-colors text-left cursor-pointer font-medium"
                                >
                                  <i className="fa-solid fa-user-check w-4" />Verify & Approve
                                </button>
                                <button
                                  onClick={() => { handleOpenReject(inv); setActionMenu(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-rose-500/10 text-rose-500 transition-colors text-left cursor-pointer font-medium"
                                >
                                  <i className="fa-solid fa-ban w-4" />Reject with Reason
                                </button>
                              </>
                            )}
                            {inv.status === "Approved" && (
                              <button
                                onClick={() => { handleOpenPayout(inv); setActionMenu(null); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors text-left cursor-pointer font-medium"
                              >
                                <i className="fa-solid fa-money-bill-transfer w-4" />Disburse Payout
                              </button>
                            )}
                            <button
                              onClick={() => { onEditInvoice(inv); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left cursor-pointer font-medium"
                            >
                              <i className="fa-solid fa-pen-to-square text-blue-500 w-4" />Edit Invoice
                            </button>
                            <button
                              onClick={() => { navigator.clipboard?.writeText(inv.invoiceNo); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left cursor-pointer font-medium"
                            >
                              <i className="fa-solid fa-copy text-violet-500 w-4" />Copy Invoice #
                            </button>
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => { onDeleteInvoice(inv._id, `${inv.invoiceNo} – ${inv.client}`); setActionMenu(null); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-rose-500/10 text-rose-500 transition-colors text-left cursor-pointer font-medium"
                            >
                              <i className="fa-solid fa-trash w-4" />Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-5 pt-4 pb-3 flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-2xs", avatarColor)}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {inv.client}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {inv.venture || (scope === "external" ? "External Client" : "Internal")}
                        </p>
                      </div>
                    </div>

                    {/* Stage Status Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {inv.status === "Paid" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <i className="fa-solid fa-circle-check text-[9px]" /> Settled
                        </span>
                      ) : inv.status === "Approved" || inv.approvalStage === "PENDING_ADMIN" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                          <i className="fa-solid fa-wallet text-[9px]" /> Ready for Payout
                        </span>
                      ) : inv.status === "Rejected" || inv.approvalStage === "REJECTED" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <i className="fa-solid fa-rotate-right text-[9px]" /> Revision Required {inv.revisionCount ? `(#${inv.revisionCount})` : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <i className="fa-solid fa-user-clock text-[9px]" /> Awaiting HR Review
                        </span>
                      )}
                    </div>

                    {/* Amount Block */}
                    <div className="bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Amount</span>
                      <span className="text-base font-black text-primary">
                        {inv.currency || "USD"} {fmtDec(inv.amount)}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                          <i className="fa-solid fa-calendar-days text-[9px]" />Issued
                        </p>
                        <p className="text-[11px] font-semibold text-foreground">{fmtDate(inv.issuedDate)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                          <i className="fa-solid fa-calendar-xmark text-[9px]" />Due
                        </p>
                        <p className={cn("text-[11px] font-semibold", inv.status !== "Paid" && daysUntilDue !== null && daysUntilDue < 0 ? "text-rose-500" : "text-foreground")}>
                          {fmtDate(inv.dueDate)}
                        </p>
                      </div>
                    </div>

                    {/* Rejection / Note Preview */}
                    {inv.status === "Rejected" && inv.rejectionReason && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] text-rose-600 dark:text-rose-400">
                        <span className="font-bold flex items-center gap-1">
                          <i className="fa-solid fa-triangle-exclamation text-[9px]" /> HR Note:
                        </span>
                        <p className="line-clamp-2 mt-0.5 italic">{inv.rejectionReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-4 py-3 border-t border-border/60 bg-muted/10 flex items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border", sc.bg, sc.text, sc.border)}>
                      <i className={cn("fa-solid text-[9px]", sc.icon)} />{inv.status}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Trace Lifecycle */}
                      <button
                        type="button"
                        onClick={() => setTraceInvoice(inv)}
                        className="h-7 px-2 text-[10px] font-bold rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/15 text-primary flex items-center gap-1 transition-all cursor-pointer"
                        title="Trace Lifecycle Audit Trail"
                      >
                        <i className="fa-solid fa-route text-[10px]" />
                        <span className="hidden sm:inline">Trace</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleViewInvoice(inv)}
                        className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-primary/10 hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-all cursor-pointer"
                        title="View Full Details"
                      >
                        <i className="fa-solid fa-eye text-[10px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditInvoice(inv)}
                        className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-primary/10 hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-all cursor-pointer"
                        title="Edit"
                      >
                        <i className="fa-solid fa-pen text-[10px]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteInvoice(inv._id, `${inv.invoiceNo} – ${inv.client}`)}
                        className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-rose-500/10 hover:border-rose-500/30 flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-all cursor-pointer"
                        title="Delete"
                      >
                        <i className="fa-solid fa-trash text-[10px]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* List View */}
      {!loading && viewMode === "list" && (
        <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <i className="fa-solid fa-file-invoice-dollar text-4xl mb-3 text-muted-foreground/30" />
              <p className="text-sm font-bold text-foreground">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap">Invoice #</th>
                    <th className="py-3 px-4 min-w-[200px]">Client</th>
                    <th className="py-3 px-4 whitespace-nowrap">Category</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Amount</th>
                    <th className="py-3 px-4 whitespace-nowrap">Due Date</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Status & Stage</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-xs">
                  {filtered.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.Draft;
                    const initials = getInitials(inv.client);
                    const avatarColor = getAvatarColor(inv.client);
                    const daysUntilDue = getDaysUntilDue(inv.dueDate);

                    return (
                      <tr key={inv._id} className="hover:bg-muted/30 transition-colors group">
                        {/* Invoice # */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewInvoice(inv)}
                            className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 inline-block cursor-pointer transition-colors"
                          >
                            {inv.invoiceNo}
                          </button>
                        </td>

                        {/* Client */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0", avatarColor)}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                {inv.client}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {inv.venture || (scope === "external" ? "External" : "Internal")}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground font-medium">
                          {inv.category || "—"}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="text-xs font-black text-foreground font-mono">
                            {inv.currency || "USD"} {fmtDec(inv.amount)}
                          </span>
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className={cn("text-xs font-semibold", inv.status !== "Paid" && daysUntilDue !== null && daysUntilDue < 0 ? "text-rose-500" : "text-foreground")}>
                            {fmtDate(inv.dueDate)}
                          </p>
                          {inv.status !== "Paid" && daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 5 && (
                            <p className="text-[10px] text-amber-500 font-bold">{daysUntilDue === 0 ? "Due today" : `${daysUntilDue}d left`}</p>
                          )}
                        </td>

                        {/* Status & Stage */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border", sc.bg, sc.text, sc.border)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                              {inv.status}
                            </span>
                            {scope === "internal" && (
                              <span className="text-[9px] font-semibold text-muted-foreground">
                                {inv.status === "Paid"
                                  ? "Settled"
                                  : inv.status === "Approved" || inv.approvalStage === "PENDING_ADMIN"
                                  ? "Ready for Payout"
                                  : inv.status === "Rejected"
                                  ? "Revision Req."
                                  : "Awaiting HR"}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setTraceInvoice(inv)}
                              className="w-7 h-7 rounded-lg border border-primary/25 bg-primary/5 hover:bg-primary/20 flex items-center justify-center text-primary transition-all cursor-pointer"
                              title="Trace Lifecycle Audit Trail"
                            >
                              <i className="fa-solid fa-route text-[10px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewInvoice(inv)}
                              className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-primary/10 hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-all cursor-pointer"
                              title="View Invoice"
                            >
                              <i className="fa-solid fa-eye text-[10px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditInvoice(inv)}
                              className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-primary/10 hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-all cursor-pointer"
                              title="Edit"
                            >
                              <i className="fa-solid fa-pen text-[10px]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteInvoice(inv._id, `${inv.invoiceNo} – ${inv.client}`)}
                              className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-rose-500/10 hover:border-rose-500/30 flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-all cursor-pointer"
                              title="Delete"
                            >
                              <i className="fa-solid fa-trash text-[10px]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── LIFECYCLE AUDIT TRACE MODAL ─── */}
      {traceInvoice && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-route text-base" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <span>Lifecycle Audit Trace</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {traceInvoice.invoiceNo}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {traceInvoice.client} &bull; {traceInvoice.currency || "USD"} {fmtDec(traceInvoice.amount)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTraceInvoice(null)}
                className="w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Visual 4-Stage Stepper */}
              <div className="bg-muted/20 border border-border/80 rounded-xl p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Current Pipeline Milestone
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {
                      label: "1. Submitted",
                      active: true,
                      done: true,
                      icon: "fa-paper-plane",
                    },
                    {
                      label: "2. HR Review",
                      active: traceInvoice.status === "Pending" && (traceInvoice.approvalStage === "PENDING_HR" || !traceInvoice.approvalStage),
                      done: traceInvoice.status === "Approved" || traceInvoice.status === "Paid" || traceInvoice.approvalStage === "PENDING_ADMIN",
                      icon: "fa-user-check",
                    },
                    {
                      label: "3. Admin Payout",
                      active: traceInvoice.status === "Approved" || traceInvoice.approvalStage === "PENDING_ADMIN",
                      done: traceInvoice.status === "Paid",
                      icon: "fa-wallet",
                    },
                    {
                      label: "4. Settled",
                      active: traceInvoice.status === "Paid",
                      done: traceInvoice.status === "Paid",
                      icon: "fa-circle-check",
                    },
                  ].map((step, idx) => (
                    <div
                      key={step.label}
                      className={cn(
                        "flex flex-col items-center text-center p-2 rounded-lg border transition-all",
                        step.done
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                          : step.active
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold"
                          : "bg-muted/40 border-border/60 text-muted-foreground opacity-60"
                      )}
                    >
                      <i className={cn("fa-solid text-xs mb-1", step.icon)} />
                      <span className="text-[10px] font-semibold leading-tight">{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revision Alert Box if Rejected */}
              {traceInvoice.status === "Rejected" && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
                    <i className="fa-solid fa-triangle-exclamation text-sm" />
                    <span>Revision Requested by HR / Reviewer</span>
                    {traceInvoice.revisionCount && traceInvoice.revisionCount > 1 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-[10px]">
                        Revision #{traceInvoice.revisionCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground bg-background/80 p-2.5 rounded-lg border border-rose-500/20 italic">
                    "{traceInvoice.rejectionReason || "No explicit reason logged."}"
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Rejected by {traceInvoice.rejectedBy || "HR Partner"} &bull; {fmtDateTime(traceInvoice.rejectedAt)}
                  </p>
                </div>
              )}

              {/* Chronological Timeline */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-timeline text-primary text-xs" />
                  <span>Audit Trail Events</span>
                </p>

                <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-border/80">
                  {(() => {
                    const events = traceInvoice.timeline && traceInvoice.timeline.length > 0
                      ? traceInvoice.timeline
                      : [
                          {
                            stage: "SUBMITTED",
                            status: "Pending",
                            actorName: traceInvoice.client || "Submitter",
                            actorRole: "Employee / Submitter",
                            note: "Invoice drafted and submitted for HR review",
                            timestamp: traceInvoice.createdAt || traceInvoice.issuedDate || new Date(),
                          },
                          ...(traceInvoice.status === "Approved" || traceInvoice.status === "Paid"
                            ? [
                                {
                                  stage: "HR_APPROVED",
                                  status: "Approved",
                                  actorName: traceInvoice.approvedBy || "HR Partner",
                                  actorRole: traceInvoice.approverRole || "HR",
                                  note: "Hours, attendance, and deliverables verified successfully",
                                  timestamp: traceInvoice.approvedAt || traceInvoice.issuedDate,
                                },
                              ]
                            : []),
                          ...(traceInvoice.status === "Rejected"
                            ? [
                                {
                                  stage: "REJECTED",
                                  status: "Rejected",
                                  actorName: traceInvoice.rejectedBy || "HR Partner",
                                  actorRole: "HR",
                                  note: traceInvoice.rejectionReason || "Disputed hours or attendance records",
                                  timestamp: traceInvoice.rejectedAt || new Date(),
                                },
                              ]
                            : []),
                          ...(traceInvoice.status === "Paid"
                            ? [
                                {
                                  stage: "PAID",
                                  status: "Paid",
                                  actorName: "Finance Disbursement",
                                  actorRole: "Admin",
                                  note: `Settled via ${traceInvoice.paymentDetails?.method || "Direct Transfer"}${traceInvoice.paymentDetails?.transactionId ? ` (Txn: ${traceInvoice.paymentDetails.transactionId})` : ""}`,
                                  timestamp: traceInvoice.paymentDetails?.paidAt || new Date(),
                                },
                              ]
                            : []),
                        ];

                    return events.map((ev: any, idx: number) => {
                      const isReject = ev.status === "Rejected" || ev.stage === "REJECTED";
                      const isApproved = ev.status === "Approved" || ev.stage === "HR_APPROVED";
                      const isPaid = ev.status === "Paid" || ev.stage === "PAID";
                      const isReinitiated = ev.stage === "RE_INITIATED";

                      return (
                        <div key={idx} className="relative flex items-start gap-3 pl-1">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 text-xs shadow-xs border",
                              isPaid
                                ? "bg-emerald-500 text-white border-emerald-600"
                                : isApproved
                                ? "bg-teal-500 text-white border-teal-600"
                                : isReject
                                ? "bg-rose-500 text-white border-rose-600"
                                : isReinitiated
                                ? "bg-amber-500 text-white border-amber-600"
                                : "bg-primary text-primary-foreground border-primary"
                            )}
                          >
                            <i
                              className={cn(
                                "fa-solid text-[10px]",
                                isPaid
                                  ? "fa-circle-check"
                                  : isApproved
                                  ? "fa-user-check"
                                  : isReject
                                  ? "fa-ban"
                                  : isReinitiated
                                  ? "fa-rotate-right"
                                  : "fa-paper-plane"
                              )}
                            />
                          </div>
                          <div className="flex-1 bg-card border border-border/80 rounded-xl p-3 shadow-2xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-xs font-bold text-foreground">
                                {ev.stage || ev.status}
                              </p>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {fmtDateTime(ev.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              By <strong className="text-foreground">{ev.actorName}</strong> ({ev.actorRole || "User"})
                            </p>
                            {ev.note && (
                              <p className="text-xs text-foreground/90 bg-muted/30 p-2 rounded-lg border border-border/50 mt-2 italic">
                                {ev.note}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTraceInvoice(null)}
                className="text-xs"
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    handleViewInvoice(traceInvoice);
                    setTraceInvoice(null);
                  }}
                  className="text-xs font-bold flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-file-invoice text-xs" />
                  <span>View Full Details</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECT REASON MODAL ─── */}
      {rejectModal.open && rejectModal.invoice && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border/80 bg-rose-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-ban text-base" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Reject Invoice</h3>
                  <p className="text-xs text-muted-foreground">
                    #{rejectModal.invoice.invoiceNo} &bull; {rejectModal.invoice.client}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, invoice: null, reason: "" })}
                className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Rejection Reason <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-muted-foreground">Required for submitter</span>
                </label>
                <textarea
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Explain why this invoice cannot be approved (e.g. Disputed shift on 12th Oct, mismatch in overtime billings, missing client timesheet sign-off)..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground">
                <i className="fa-solid fa-circle-info text-primary mr-1.5" />
                The submitter will receive an immediate in-app and email notification with your feedback, enabling them to fix the disputed hours and re-initiate this invoice.
              </div>
            </div>

            <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModal({ open: false, invoice: null, reason: "" })}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!rejectModal.reason.trim() || isUpdatingStatus}
                onClick={handleConfirmReject}
                className="text-xs font-bold flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isUpdatingStatus ? (
                  <i className="fa-solid fa-spinner fa-spin text-xs" />
                ) : (
                  <i className="fa-solid fa-ban text-xs" />
                )}
                <span>Confirm Rejection</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── PAYMENT DISBURSEMENT MODAL WITH DYNAMIC UPI QR ─── */}
      {paymentModal.open && paymentModal.invoice && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-border/80 bg-emerald-500/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-money-bill-transfer text-base" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Disburse Payment</h3>
                  <p className="text-xs text-muted-foreground">
                    #{paymentModal.invoice.invoiceNo} &bull; {paymentModal.invoice.client}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModal({ open: false, invoice: null, method: "UPI", upiId: "", txnId: "", notes: "" })}
                className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Payment Summary */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Disbursement Amount</p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {paymentModal.invoice.currency || "USD"} {fmtDec(paymentModal.invoice.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    <i className="fa-solid fa-user-check mr-1" />HR Approved
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["UPI", "Bank Transfer", "Cash"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentModal((prev) => ({ ...prev, method: m }))}
                      className={cn(
                        "py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                        paymentModal.method === m
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-muted/30 hover:bg-muted text-muted-foreground border-border"
                      )}
                    >
                      <i
                        className={cn(
                          "fa-solid text-xs",
                          m === "UPI" ? "fa-qrcode" : m === "Bank Transfer" ? "fa-building-columns" : "fa-money-bill-wave"
                        )}
                      />
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic UPI QR Code Block */}
              {paymentModal.method === "UPI" && (
                <div className="border border-emerald-500/25 bg-emerald-500/5 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-qrcode text-emerald-600 dark:text-emerald-400" />
                      <span>Scan & Pay via Mobile UPI</span>
                    </p>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      GPay / PhonePe / Paytm
                    </span>
                  </div>

                  {(() => {
                    const payeeUpi = paymentModal.upiId.trim();
                    const payeeName = (paymentModal.invoice.client || "Payee").replace(/[^a-zA-Z0-9 ]/g, "").trim() || "NexAcePayee";
                    const amount = Number(paymentModal.invoice.amount || 0);
                    const invoiceNo = paymentModal.invoice.invoiceNo || "INV";
                    const upiPayUrl = `upi://pay?pa=${encodeURIComponent(payeeUpi)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoiceNo}`)}`;
                    const qrCodeUrl = payeeUpi
                      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayUrl)}`
                      : "";

                    return (
                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-background/80 p-3 rounded-xl border border-border">
                        {qrCodeUrl ? (
                          <div className="bg-white p-2 rounded-xl shadow-xs border border-border shrink-0">
                            <img
                              src={qrCodeUrl}
                              alt="UPI QR Code"
                              className="w-32 h-32 object-contain rounded"
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-xl bg-muted/60 flex flex-col items-center justify-center text-center p-2 text-muted-foreground shrink-0">
                            <i className="fa-solid fa-qrcode text-2xl mb-1 opacity-50" />
                            <span className="text-[10px]">Enter Payee UPI ID</span>
                          </div>
                        )}

                        <div className="space-y-2 flex-1 w-full text-center sm:text-left">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-foreground">
                              Payee UPI ID
                            </label>
                            <Input
                              value={paymentModal.upiId}
                              onChange={(e) => setPaymentModal((prev) => ({ ...prev, upiId: e.target.value }))}
                              placeholder="e.g. employee@okhdfcbank"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          {payeeUpi && (
                            <a
                              href={upiPayUrl}
                              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
                            >
                              <i className="fa-solid fa-mobile-screen-button text-xs" />
                              <span>Open in Mobile UPI App</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Transaction ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Transaction Reference / ID <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-muted-foreground font-mono">Bank or UPI ref</span>
                </label>
                <Input
                  value={paymentModal.txnId}
                  onChange={(e) => setPaymentModal((prev) => ({ ...prev, txnId: e.target.value }))}
                  placeholder="e.g. 317492019482 or TXN-49201"
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Disbursement Notes</label>
                <Input
                  value={paymentModal.notes}
                  onChange={(e) => setPaymentModal((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional settlement notes or ledger reference..."
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/80 bg-muted/20 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentModal({ open: false, invoice: null, method: "UPI", upiId: "", txnId: "", notes: "" })}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!paymentModal.txnId.trim() || isUpdatingStatus}
                onClick={handleConfirmPayout}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs"
              >
                {isUpdatingStatus ? (
                  <i className="fa-solid fa-spinner fa-spin text-xs" />
                ) : (
                  <i className="fa-solid fa-circle-check text-xs" />
                )}
                <span>Confirm Settlement</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
