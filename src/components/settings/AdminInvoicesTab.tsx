"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { InvoiceDetailsView } from "@/components/finance/InvoiceDetailsView";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

export interface IInvoiceObjection {
  category: string;
  itemRef?: string;
  remark: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface InvoiceObjectionFormItem {
  id: string;
  category: string;
  itemRef: string;
  customItemRef?: string;
  remark: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  _id?: string;
  id?: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerNo: string;
  businessName: string;
  businessAddress?: string;
  businessEmail?: string;
  billedToName: string;
  billedToAddress?: string;
  billedToEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: "Draft" | "Sent" | "Pending" | "Approved" | "Rejected" | "Paid" | "Overdue" | "Archived" | "Cancelled";
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNo?: string;
    ifscCode?: string;
    branch?: string;
  };
  paymentDetails?: {
    method: "Bank Transfer" | "UPI" | "Cash";
    upiId?: string;
    transactionId?: string;
    screenshotUrl?: string;
    paidAt?: string;
    paidBy?: string;
  };
  userUpiId?: string;
  signatureUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
  approverRole?: string;
  rejectionReason?: string;
  rejectionRemark?: string;
  objections?: IInvoiceObjection[];
  rejectedBy?: string;
  rejectedAt?: string;
  timeline?: Array<{
    stage: string;
    status: string;
    actorName: string;
    actorRole: string;
    actorId?: string;
    note?: string;
    timestamp: string | Date;
  }>;
  rejectionHistory?: Array<{
    reason: string;
    remark?: string;
    objections?: IInvoiceObjection[];
    rejectedBy: string;
    rejectedAt: string | Date;
    role: string;
  }>;
  revisionCount?: number;
  approvalStage?: string;
  hrReview?: {
    reviewedBy?: string;
    reviewedById?: string;
    reviewedAt?: string | Date;
    verifiedHours?: number;
    notes?: string;
  } | null;
}

type PaymentMethod = "Bank Transfer" | "UPI" | "Cash";

interface PaymentModalState {
  open: boolean;
  invoiceId: string;
  invoiceNo: string;
}

function getItemChoices(inv?: Invoice | null) {
  const choices: Array<{ label: string; value: string; group?: string }> = [
    { label: "General Invoice Issue (Whole Invoice)", value: "General Invoice Issue (Whole Invoice)" },
  ];
  if (!inv) return choices;

  if (inv.items && inv.items.length > 0) {
    inv.items.forEach((item, idx) => {
      choices.push({
        label: `Deliverable #${idx + 1}: ${item.description || "Line Item"} (${inv.currency || "$"}${item.amount || 0})`,
        value: `Line Item #${idx + 1}: ${item.description || "Deliverable"}`,
        group: "Deliverables",
      });
    });
  }

  const shifts = (inv as any).shiftAttendance?.records;
  if (Array.isArray(shifts) && shifts.length > 0) {
    shifts.forEach((shift: any, idx: number) => {
      choices.push({
        label: `Shift: ${shift.date || `Day ${idx + 1}`} (${shift.clockIn || "--"} - ${shift.clockOut || "--"}, ${shift.totalHours || 0} hrs)`,
        value: `Shift Attendance: ${shift.date || `Day ${idx + 1}`} (${shift.totalHours || 0} hrs)`,
        group: "Shift Attendance",
      });
    });
  }

  const ts = (inv as any).timesheetEntries?.records;
  if (Array.isArray(ts) && ts.length > 0) {
    ts.forEach((entry: any, idx: number) => {
      choices.push({
        label: `Timesheet #${idx + 1}: ${entry.date || ""} - ${entry.projectName || "Project"} (${entry.hours || 0} hrs)`,
        value: `Timesheet: ${entry.projectName || "Project"} on ${entry.date || `Entry ${idx + 1}`}`,
        group: "Timesheets",
      });
    });
  }

  choices.push({ label: "Custom / Other Item (Specify below)", value: "__CUSTOM__" });
  return choices;
}

interface AdminInvoicesTabProps {
  showToast: (message: string, type?: "success" | "error") => void;
  scope?: "internal" | "external";
}

export function AdminInvoicesTab({ showToast, scope = "internal" }: AdminInvoicesTabProps) {
  const searchParams = useSearchParams();
  const targetInvoiceNo = searchParams.get("invoiceNo") || searchParams.get("search");
  const targetInvoiceId = searchParams.get("invoiceId");

  const { can, isAdmin, isOPS } = usePermissions();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(targetInvoiceNo || "");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc" | "amount_asc">("newest");
  const [copiedNo, setCopiedNo] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({ open: false, invoiceId: "", invoiceNo: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Bank Transfer");
  const { user } = useAuth();
  const isHR = user?.role === "HR" || (Boolean(user?.role) && user!.role.trim().toLowerCase() === "hr");
  const canProcessPayment = Boolean((isAdmin || isOPS) && !isHR);
  const [timelineModalInvoice, setTimelineModalInvoice] = useState<Invoice | null>(null);

  // Admin's own UPI ID (used ONLY for "Paid From" source option, NEVER for "Paid To" payee)
  const adminProfileUpiId = (user?.bankDetails?.upiId || (user as any)?.upiId || "").trim();
  const [orgUpiId, setOrgUpiId] = useState<string>("nexace@okaxis");

  // Paid From (Sender)
  const [fromUpiId, setFromUpiId] = useState("");

  // Paid To (Recipient / Payee)
  const [toUpiId, setToUpiId] = useState<string>("");
  const [targetPayeeUpiId, setTargetPayeeUpiId] = useState<string>("");

  const [upiTxnId, setUpiTxnId] = useState("");
  const [upiScreenshot, setUpiScreenshot] = useState<File | null>(null);
  const [upiScreenshotPreview, setUpiScreenshotPreview] = useState<string>("");
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [quickApproveOpen, setQuickApproveOpen] = useState<string | null>(null);

  // Close quick-approve dropdown on outside click
  useEffect(() => {
    if (!quickApproveOpen) return;
    const close = () => setQuickApproveOpen(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [quickApproveOpen]);

  // Saved custom UPI IDs (persisted in localStorage for quick reuse)
  const [savedUpiIds, setSavedUpiIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("nexace_upi_ids") || "[]"); } catch { return []; }
  });
  const [orgLogoUrl, setOrgLogoUrl] = useState<string>("");
  const [orgSignatureUrl, setOrgSignatureUrl] = useState<string>("");
  const [orgBankDetails, setOrgBankDetails] = useState<{
    bankName?: string;
    accountName?: string;
    accountNo?: string;
    ifscCode?: string;
    branch?: string;
  }>({});

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance/invoices");
      if (res.ok) {
        const data = await res.json();
        const rawInvoices = data.invoices || [];
        const loadedInvoices: Invoice[] = rawInvoices.map((inv: any) => ({
          _id: inv._id?.toString() || inv._id,
          id: inv._id?.toString() || inv.id,
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.issuedDate || inv.invoiceDate || new Date().toISOString().split("T")[0],
          dueDate: inv.dueDate || "",
          customerNo: inv.customerNo || (inv.category === "Employee Invoice" ? `EMP-${inv.client}` : "EXT-CLIENT"),
          businessName: inv.category === "Employee Invoice" ? (inv.client || "Employee") : (inv.venture || "Ace Consultancys"),
          businessAddress: inv.businessAddress || (inv.category === "Employee Invoice" ? "Employee / Internal Team" : ""),
          businessEmail: inv.businessEmail || "",
          billedToName: inv.category === "Employee Invoice" ? (inv.venture || "Ace Consultancys") : (inv.client || "Client"),
          billedToAddress: inv.billedToAddress || "",
          billedToEmail: inv.billedToEmail || "",
          items: inv.lineItems || inv.items || [{ description: inv.category || "Services", quantity: 1, unitPrice: inv.amount || 0, amount: inv.amount || 0 }],
          subtotal: inv.amount || inv.subtotal || inv.total || 0,
          taxRate: inv.taxRate || 0,
          taxAmount: inv.taxAmount || 0,
          total: inv.amount || inv.total || 0,
          currency: inv.currency || "USD",
          status: inv.status || "Draft",
          notes: inv.notes || "",
          createdAt: inv.createdAt,
          updatedAt: inv.updatedAt,
          paymentDetails: inv.paymentDetails,
          bankDetails: inv.bankDetails,
          signatureUrl: inv.signatureUrl,
          approvedBy: inv.approvedBy,
          approvedAt: inv.approvedAt,
          timeline: inv.timeline || [],
          rejectionHistory: inv.rejectionHistory || [],
          revisionCount: inv.revisionCount || 0,
          approvalStage: inv.approvalStage,
          hrReview: inv.hrReview,
          ...(inv as any),
        }));
        setInvoices(loadedInvoices);

        // Auto-open target invoice if requested via notification deep-link
        if (targetInvoiceNo || targetInvoiceId) {
          const match = loadedInvoices.find((i) =>
            (targetInvoiceNo && i.invoiceNo?.toLowerCase() === targetInvoiceNo.toLowerCase()) ||
            (targetInvoiceId && (i._id === targetInvoiceId || i.id === targetInvoiceId))
          );
          if (match) {
            setViewInvoice(match);
          }
        }
      } else {
        showToast("Failed to fetch invoices", "error");
      }
    } catch (err) {
      console.error("Error fetching master invoices:", err);
      showToast("Could not load invoices list", "error");
    } finally {
      setLoading(false);
    }
  };

  const isExternalInvoice = (inv: Invoice) => {
    const cat = ((inv as any).category || "").toLowerCase();
    const cust = (inv.customerNo || "").toUpperCase();
    const busAddr = (inv.businessAddress || "").toLowerCase();
    const notes = (inv.notes || "").toLowerCase();
    const billedTo = (inv.billedToName || "").toLowerCase();
    const busName = (inv.businessName || "").toLowerCase();

    // ALL invoices generated by Employees strictly belong to Internal Team
    if (cat.includes("employee") || cat.includes("payroll") || cust.startsWith("EMP-") || busAddr.includes("employee") || (inv as any).shiftAttendance || (inv as any).timesheetEntries) {
      return false;
    }

    return cat.includes("client") || cat.includes("service") || cat.includes("sales") || cat.includes("external") || cust.startsWith("EXT-") || notes.includes("proposal") || (billedTo.includes("external") && !cust.startsWith("EMP-")) || busName.includes("external contractor") || busAddr.includes("vendor");
  };

  const scopedInvoices = React.useMemo(() => {
    if (scope === "external") {
      return invoices.filter((inv) => isExternalInvoice(inv));
    }
    // "internal" scope includes all employee-generated invoices and internal corporate invoices
    return invoices.filter((inv) => !isExternalInvoice(inv));
  }, [invoices, scope]);

  useEffect(() => {
    fetchInvoices();
    // Fetch organization default UPI ID, logo and bank details from company settings
    fetch("/api/settings/company")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.company) {
          if (data.company.logoUrl) {
            setOrgLogoUrl(data.company.logoUrl);
          }
          if (data.company.signatureUrl) {
            setOrgSignatureUrl(data.company.signatureUrl);
          }
          if (data.company.bankDetails) {
            setOrgBankDetails(data.company.bankDetails);
            if (data.company.bankDetails.upiId) {
              setOrgUpiId(data.company.bankDetails.upiId.trim());
            }
          }
        }
      })
      .catch((err) => console.error("Could not fetch org company details:", err));
  }, [scope]);

  // Rejection modal state
  const createBlankObjection = (initialTarget?: string): InvoiceObjectionFormItem => ({
    id: Math.random().toString(36).substring(2, 9),
    category: "Timesheet Hours Discrepancy",
    itemRef: initialTarget || "General Invoice Issue (Whole Invoice)",
    customItemRef: "",
    remark: "",
    attachmentUrl: "",
    attachmentName: "",
  });

  const [rejectModal, setRejectModal] = useState<{
    open: boolean;
    invoiceId: string;
    invoiceNo: string;
    targetInvoice: Invoice | null;
    objections: InvoiceObjectionFormItem[];
  }>({
    open: false,
    invoiceId: "",
    invoiceNo: "",
    targetInvoice: null,
    objections: [createBlankObjection()],
  });

  const openRejectModalForInvoice = (inv: Invoice) => {
    const invId = inv._id || inv.id || "";
    setRejectModal({
      open: true,
      invoiceId: invId,
      invoiceNo: inv.invoiceNo,
      targetInvoice: inv,
      objections: [createBlankObjection()],
    });
  };

  /** Opens payment modal if marking Paid, otherwise patches directly */
  const handleStatusChange = async (invoiceId: string, newStatus: string, invoiceNo?: string) => {
    if (newStatus === "Paid") {
      const targetInv = invoices.find((i) => (i._id || i.id) === invoiceId);
      if (targetInv?.status !== "Approved") {
        showToast("Approval Mandatory: This invoice must be approved by an HR Partner or Admin before payment can be processed.", "error");
        return;
      }

      setPaymentMethod("Bank Transfer");

      // Default Paid From
      setFromUpiId(orgUpiId || "nexace@okaxis");

      // Default Paid To (Auto-pick payee UPI ID if available for this invoice/creator)
      const invUserUpi = (
        targetInv?.userUpiId ||
        (targetInv as any)?.bankDetails?.upiId ||
        ""
      ).trim();

      setTargetPayeeUpiId(invUserUpi);
      setToUpiId(invUserUpi);

      setUpiTxnId("");
      setUpiScreenshot(null);
      setUpiScreenshotPreview("");
      setPaymentModal({ open: true, invoiceId, invoiceNo: invoiceNo || "" });
      return;
    }

    if (newStatus === "Rejected") {
      const targetInv = invoices.find((i) => (i._id || i.id) === invoiceId);
      if (targetInv) {
        openRejectModalForInvoice(targetInv);
      } else {
        setRejectModal({
          open: true,
          invoiceId,
          invoiceNo: invoiceNo || "",
          targetInvoice: null,
          objections: [createBlankObjection()],
        });
      }
      return;
    }

    await patchInvoice(invoiceId, { status: newStatus });
  };

  /** Core PATCH — smart-routes to IT or Finance endpoint to avoid sequential fallback */
  const patchInvoice = async (invoiceId: string, body: Record<string, unknown>) => {
    setUpdatingId(invoiceId);
    try {
      // Determine primary endpoint from in-memory invoice category — avoids wasteful fallback round-trip
      const targetInv = invoices.find((i) => (i._id || i.id) === invoiceId);
      const cat = ((targetInv as any)?.category || "").toLowerCase();
      const custNo = (targetInv?.customerNo || "").toUpperCase();
      const isEmployee = cat.includes("employee") || custNo.startsWith("EMP-") ||
        !!(targetInv as any)?.shiftAttendance || !!(targetInv as any)?.timesheetEntries;

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
        const updated = data.invoice || {};
        setInvoices((prev) =>
          prev.map((inv) => ((inv._id || inv.id) === invoiceId ? { ...inv, ...updated, status: updated.status || inv.status } : inv))
        );
        if (viewInvoice && (viewInvoice._id || viewInvoice.id) === invoiceId) {
          setViewInvoice((prev) => prev ? { ...prev, ...updated, status: updated.status || prev.status } : prev);
        }
        showToast(`Invoice status updated to "${updated.status || (body as any).status}"`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update invoice status", "error");
      }
    } catch (err) {
      console.error("Error updating invoice status:", err);
      showToast("Error updating invoice status", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  /** Confirm payment — validates UPI fields, converts screenshot to base64, patches */
  const handleConfirmPayment = async () => {
    const effectiveFromUpi = fromUpiId.trim();
    const effectiveToUpi = toUpiId.trim();

    if (paymentMethod === "UPI") {
      if (!effectiveFromUpi) {
        showToast("Please enter or select the 'Paid From' UPI ID", "error");
        return;
      }
      if (!effectiveToUpi) {
        showToast("Please enter the 'Pay UPI ID' (Paid To)", "error");
        return;
      }
      if (!upiTxnId.trim()) {
        showToast("Please enter the UPI Transaction ID", "error");
        return;
      }
    }

    // Save custom UPI IDs to localStorage for future use
    if (paymentMethod === "UPI") {
      const toSave = [
        ...(effectiveFromUpi && effectiveFromUpi !== orgUpiId && effectiveFromUpi !== adminProfileUpiId ? [effectiveFromUpi] : []),
        ...(effectiveToUpi && effectiveToUpi !== orgUpiId && effectiveToUpi !== targetPayeeUpiId && effectiveToUpi !== adminProfileUpiId ? [effectiveToUpi] : []),
      ];
      if (toSave.length > 0) {
        const updated = Array.from(new Set([...toSave, ...savedUpiIds])).slice(0, 10);
        setSavedUpiIds(updated);
        try {
          localStorage.setItem("nexace_upi_ids", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save UPI ID to localStorage:", e);
        }
      }
    }

    setConfirmingPayment(true);
    try {
      let screenshotUrl = "";
      if (paymentMethod === "UPI" && upiScreenshot) {
        screenshotUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || "");
          reader.readAsDataURL(upiScreenshot);
        });
      }
      await patchInvoice(paymentModal.invoiceId, {
        status: "Paid",
        paymentDetails: {
          method: paymentMethod,
          upiId: paymentMethod === "UPI" ? (effectiveToUpi || effectiveFromUpi) : "",
          fromUpiId: paymentMethod === "UPI" ? effectiveFromUpi : "",
          toUpiId: paymentMethod === "UPI" ? effectiveToUpi : "",
          transactionId: paymentMethod === "UPI" ? upiTxnId.trim() : "",
          screenshotUrl,
          paidAt: new Date().toISOString(),
        },
      });
      setPaymentModal({ open: false, invoiceId: "", invoiceNo: "" });
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpiScreenshot(file);
    const url = URL.createObjectURL(file);
    setUpiScreenshotPreview(url);
  };

  /**
   * Quick-approve: Bank Transfer / Cash → patch directly (no modal).
   * UPI → open the payment modal for transaction details.
   */
  const quickApprove = async (invoiceId: string, invoiceNo: string, method: PaymentMethod) => {
    setQuickApproveOpen(null);
    if (method === "UPI") {
      // UPI needs transaction details — open full modal
      setPaymentMethod("UPI");
      setFromUpiId(orgUpiId || "nexace@okaxis");
      const targetInv = invoices.find((i) => (i._id || i.id) === invoiceId);
      const invUserUpi = (targetInv?.userUpiId || (targetInv as any)?.bankDetails?.upiId || "").trim();
      setTargetPayeeUpiId(invUserUpi);
      setToUpiId(invUserUpi);
      setUpiTxnId("");
      setUpiScreenshot(null);
      setUpiScreenshotPreview("");
      setPaymentModal({ open: true, invoiceId, invoiceNo });
      return;
    }
    // Bank Transfer & Cash: approve instantly without modal
    await patchInvoice(invoiceId, {
      status: "Paid",
      paymentDetails: {
        method,
        paidAt: new Date().toISOString(),
      },
    });
  };

  const filteredInvoices = scopedInvoices
    .filter((inv) => {
      const q = search.toLowerCase();
      const matchesSearch =
        inv.invoiceNo.toLowerCase().includes(q) ||
        inv.businessName.toLowerCase().includes(q) ||
        inv.billedToName.toLowerCase().includes(q) ||
        inv.customerNo.toLowerCase().includes(q) ||
        (inv.businessEmail && inv.businessEmail.toLowerCase().includes(q)) ||
        (inv.billedToEmail && inv.billedToEmail.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "amount_desc") {
        return (b.total || 0) - (a.total || 0);
      }
      if (sortBy === "amount_asc") {
        return (a.total || 0) - (b.total || 0);
      }
      if (sortBy === "oldest") {
        const timeA = new Date((a as any).createdAt || a.invoiceDate || 0).getTime();
        const timeB = new Date((b as any).createdAt || b.invoiceDate || 0).getTime();
        return timeA - timeB;
      }
      const timeA = new Date((a as any).createdAt || a.invoiceDate || 0).getTime();
      const timeB = new Date((b as any).createdAt || b.invoiceDate || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return new Date(b.invoiceDate || 0).getTime() - new Date(a.invoiceDate || 0).getTime();
    });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { cls: string; dot: string; icon: string }> = {
      Paid: { cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25", dot: "bg-emerald-500", icon: "fa-shield-check" },
      Approved: { cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25", dot: "bg-sky-500", icon: "fa-check-double" },
      Pending: { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25", dot: "bg-amber-500 animate-pulse", icon: "fa-clock" },
      Rejected: { cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25", dot: "bg-rose-500", icon: "fa-ban" },
      Sent: { cls: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25", dot: "bg-indigo-500", icon: "fa-paper-plane" },
      Draft: { cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25", dot: "bg-slate-400", icon: "fa-pen-ruler" },
      Overdue: { cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25", dot: "bg-red-500 animate-pulse", icon: "fa-triangle-exclamation" },
      Cancelled: { cls: "bg-slate-500/10 text-slate-500 border-slate-500/20 line-through", dot: "bg-slate-500", icon: "fa-ban" },
      Archived: { cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25", dot: "bg-purple-500", icon: "fa-box-archive" },
    };
    const config = configs[status] || { cls: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground", icon: "fa-circle" };
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border whitespace-nowrap shadow-2xs", config.cls)}>
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
        <i className={cn("fa-solid text-[9px]", config.icon)} />
        <span>{status}</span>
      </span>
    );
  };

  const isPrivilegedAdmin = Boolean(isAdmin || isOPS || user?.role === "HR" || can("approveInvoices") || can("approveTimesheetsAndInvoices"));

  const getInitials = (name?: string) => {
    if (!name) return "EMP";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleCopyInvoiceNo = (e: React.MouseEvent, no: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(no);
    setCopiedNo(no);
    setTimeout(() => setCopiedNo(null), 2000);
    showToast(`Copied ${no} to clipboard!`, "success");
  };

  const formatCurrency = (amount: number, currency: string = "INR") => {
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "AED" ? "AED " : "₹";
    return `${symbol}${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleExportPDF = async (inv: Invoice) => {
    try {
      const isEmployeeInvoice =
        (inv.invoiceNo && inv.invoiceNo.startsWith("INV-SAL")) ||
        (inv.customerNo && (inv.customerNo.startsWith("EMP-") || inv.customerNo.includes("SAL"))) ||
        Boolean((inv as any).businessSubtitle && (inv as any).businessSubtitle.toUpperCase().includes("EMPLOYEE"));

      downloadInvoicePdf(
        {
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          customerNo: inv.customerNo,
          businessName: inv.businessName || "NexAce IT Team",
          businessAddress: inv.businessAddress,
          businessEmail: inv.businessEmail,
          billedToName: inv.billedToName || "Client",
          billedToAddress: inv.billedToAddress,
          billedToEmail: inv.billedToEmail,
          items: inv.items || [],
          subtotal: inv.subtotal || 0,
          taxRate: inv.taxRate,
          taxAmount: inv.taxAmount,
          total: inv.total || 0,
          currency: inv.currency || "INR",
          status: inv.status,
          notes: inv.notes,
          bankDetails: inv.bankDetails || orgBankDetails,
          paymentDetails: inv.paymentDetails,
          logoUrl: orgLogoUrl,
          signatureUrl: inv.signatureUrl,
          orgSignatureUrl: orgSignatureUrl,
          employeeSignatureUrl: isEmployeeInvoice ? inv.signatureUrl : undefined,
          approvedBy: inv.approvedBy,
          approvedAt: inv.approvedAt,
        },
        `Invoice_${inv.invoiceNo}.pdf`
      );
      showToast(`Invoice PDF (${inv.invoiceNo}) downloaded successfully!`, "success");
    } catch (err) {
      console.error("Failed to auto download PDF invoice:", err);
      showToast("Failed to download PDF invoice.", "error");
    }
  };

  const totalInvoiced = scopedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const pendingInvoices = scopedInvoices.filter((inv) => inv.status === "Pending");
  const pendingInvoiced = pendingInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const approvedInvoices = scopedInvoices.filter((inv) => inv.status === "Approved");
  const approvedInvoiced = approvedInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidInvoices = scopedInvoices.filter((inv) => inv.status === "Paid");
  const paidInvoiced = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  if (viewInvoice) {
    return (
      <InvoiceDetailsView
        invoice={viewInvoice}
        onClose={() => setViewInvoice(null)}
        onStatusChange={(newStatus, reason, remark, objections) => {
          const invId = viewInvoice._id || viewInvoice.id;
          if (invId) {
            if (newStatus === "Rejected") {
              if (objections && objections.length > 0) {
                patchInvoice(invId, {
                  status: "Rejected",
                  rejectionReason: objections[0].category,
                  rejectionRemark: objections[0].remark,
                  objections: objections.map((o) => ({
                    category: o.category,
                    itemRef: o.itemRef || "",
                    remark: o.remark,
                    attachmentUrl: o.attachmentUrl || "",
                    attachmentName: o.attachmentName || "",
                  })),
                });
              } else {
                openRejectModalForInvoice(viewInvoice);
              }
            } else {
              handleStatusChange(invId, newStatus, viewInvoice.invoiceNo);
            }
          }
        }}
        onPaymentConfirm={canProcessPayment ? () => {
          const invId = viewInvoice._id || viewInvoice.id || "";
          setPaymentMethod("Bank Transfer");
          setFromUpiId(orgUpiId || "nexace@okaxis");
          const invUserUpi = (
            viewInvoice?.userUpiId ||
            (viewInvoice as any)?.bankDetails?.upiId ||
            ""
          ).trim();

          setTargetPayeeUpiId(invUserUpi);
          setToUpiId(invUserUpi);

          setUpiTxnId("");
          setUpiScreenshot(null);
          setUpiScreenshotPreview("");
          setPaymentModal({ open: true, invoiceId: invId, invoiceNo: viewInvoice.invoiceNo });
        } : undefined}
        isUpdatingStatus={Boolean(updatingId)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* ── 1. Executive Metric KPI Banner ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Invoices */}
        <button
          type="button"
          onClick={() => setStatusFilter("All")}
          className={cn(
            "p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-2xs",
            statusFilter === "All"
              ? "bg-card border-primary ring-1 ring-primary/40 shadow-xs"
              : "bg-card/70 hover:bg-card border-border/70 hover:border-primary/40"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {scope === "external" ? "External Invoices" : "Total Master Invoices"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm border border-primary/20 shrink-0 group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-receipt" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-foreground truncate">
            {formatCurrency(totalInvoiced)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <span className="font-mono font-bold text-foreground">{scopedInvoices.length}</span>
            <span>records total</span>
          </div>
        </button>

        {/* Pending Review */}
        <button
          type="button"
          onClick={() => setStatusFilter("Pending")}
          className={cn(
            "p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-2xs",
            statusFilter === "Pending"
              ? "bg-card border-amber-500 ring-1 ring-amber-500/40 shadow-xs"
              : "bg-card/70 hover:bg-card border-border/70 hover:border-amber-500/40"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
              Pending Review
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-sm border border-amber-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-hourglass-half" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-foreground truncate">
            {formatCurrency(pendingInvoiced)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full border border-amber-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {pendingInvoices.length} Action Needed
            </span>
          </div>
        </button>

        {/* Approved / Ready to Pay */}
        <button
          type="button"
          onClick={() => setStatusFilter("Approved")}
          className={cn(
            "p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-2xs",
            statusFilter === "Approved"
              ? "bg-card border-sky-500 ring-1 ring-sky-500/40 shadow-xs"
              : "bg-card/70 hover:bg-card border-border/70 hover:border-sky-500/40"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
              Approved
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-sm border border-sky-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-check-double" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-foreground truncate">
            {formatCurrency(approvedInvoiced)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded-full border border-sky-500/20">
              {approvedInvoices.length} Ready to Disburse
            </span>
          </div>
        </button>

        {/* Settled / Paid */}
        <button
          type="button"
          onClick={() => setStatusFilter("Paid")}
          className={cn(
            "p-3.5 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group shadow-2xs",
            statusFilter === "Paid"
              ? "bg-card border-emerald-500 ring-1 ring-emerald-500/40 shadow-xs"
              : "bg-card/70 hover:bg-card border-border/70 hover:border-emerald-500/40"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
              Settled &amp; Paid
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm border border-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <i className="fa-solid fa-circle-check" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(paidInvoiced)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
              {paidInvoices.length} Disbursed
            </span>
          </div>
        </button>
      </div>

      {/* ── 2. Main Invoices Card ── */}
      <Card className="border border-border/80 shadow-xs overflow-hidden rounded-2xl bg-card">
        {/* Header Bar */}
        <CardHeader className="pb-3 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs shrink-0">
                <i className="fa-solid fa-file-invoice-dollar text-sm" />
              </div>
              <span>
                {scope === "external" ? "External Master Invoices & Billing Center" : "Admin Master Invoice Management Center"}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground pl-10.5">
              {scope === "external"
                ? "Review, approve, update status, and manage all external client and contractor invoices."
                : "Review, approve, update status, and manage all employee self-generated and corporate invoices."}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {/* Sort Selector */}
            <div className="relative">
              <select
                aria-label="Sort Invoices"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8 pl-7 pr-3 text-xs bg-background border border-border/80 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium appearance-none"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="amount_desc">Amount: High to Low</option>
                <option value="amount_asc">Amount: Low to High</option>
              </select>
              <i className="fa-solid fa-arrow-down-wide-short absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] pointer-events-none" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchInvoices}
              className="gap-1.5 text-xs font-semibold h-8 cursor-pointer border-border/70 hover:bg-muted"
              title="Refresh invoice list"
            >
              <i className={cn("fa-solid fa-rotate-right text-xs", loading && "fa-spin text-primary")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>

        {/* Filter & Search Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-border/70 bg-muted/15 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="relative w-full md:w-80 shrink-0">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search invoice #, employee, entity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-background/90 rounded-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                title="Clear search"
              >
                <i className="fa-solid fa-circle-xmark" />
              </button>
            )}
          </div>

          {/* Status Quick Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { key: "All", label: "All", count: scopedInvoices.length, activeCls: "bg-primary text-primary-foreground border-primary" },
              { key: "Pending", label: "Pending", count: scopedInvoices.filter(i => i.status === "Pending").length, activeCls: "bg-amber-500 text-white border-amber-500" },
              { key: "Approved", label: "Approved", count: scopedInvoices.filter(i => i.status === "Approved").length, activeCls: "bg-sky-600 text-white border-sky-600" },
              { key: "Paid", label: "Paid", count: scopedInvoices.filter(i => i.status === "Paid").length, activeCls: "bg-emerald-600 text-white border-emerald-600" },
              { key: "Rejected", label: "Rejected", count: scopedInvoices.filter(i => i.status === "Rejected").length, activeCls: "bg-rose-600 text-white border-rose-600" },
              { key: "Sent", label: "Sent", count: scopedInvoices.filter(i => i.status === "Sent").length, activeCls: "bg-indigo-600 text-white border-indigo-600" },
              { key: "Draft", label: "Draft", count: scopedInvoices.filter(i => i.status === "Draft").length, activeCls: "bg-slate-600 text-white border-slate-600" },
              { key: "Overdue", label: "Overdue", count: scopedInvoices.filter(i => i.status === "Overdue").length, activeCls: "bg-red-600 text-white border-red-600" },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                  statusFilter === st.key
                    ? cn(st.activeCls, "shadow-2xs font-bold")
                    : "bg-background/80 text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted/70"
                )}
              >
                <span>{st.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                  statusFilter === st.key ? "bg-black/20 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Desktop Table View (hidden md:block) ── */}
        <CardContent className="p-0 hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/70 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Invoice #</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Issued By</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Billed To</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Total Amount</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap sticky right-0 bg-card/95 backdrop-blur-md z-10 border-l border-border/40 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.12)]">
                  Actions &amp; Approvals
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <i className="fa-solid fa-spinner fa-spin text-2xl text-primary" />
                      <p className="text-xs font-semibold">Loading invoices...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center text-xl text-muted-foreground/60">
                        <i className="fa-solid fa-file-invoice" />
                      </div>
                      <p className="text-sm font-bold text-foreground">No invoices found</p>
                      <p className="text-xs text-muted-foreground">
                        {scope === "external"
                          ? "No external client or contractor invoices on record."
                          : "No employee or corporate invoices matched your filter criteria."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const invId = inv._id || inv.id || "";
                  const isUpdating = updatingId === invId;

                  return (
                    <tr key={invId} className="hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors group">
                      {/* Invoice # */}
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewInvoice(inv)}
                            className="text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
                            title="View Invoice Details"
                          >
                            {inv.invoiceNo}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCopyInvoiceNo(e, inv.invoiceNo)}
                            className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity text-muted-foreground p-0.5 rounded cursor-pointer"
                            title="Copy invoice #"
                          >
                            <i className={cn("fa-solid text-[10px]", copiedNo === inv.invoiceNo ? "fa-check text-emerald-500" : "fa-copy")} />
                          </button>
                        </div>
                      </td>

                      {/* Issued By (Employee) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px] shrink-0 font-mono shadow-2xs">
                            {getInitials(inv.businessName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate max-w-[170px]" title={inv.businessName}>
                              {inv.businessName}
                            </div>
                            <div className="text-muted-foreground text-[11px] font-medium truncate max-w-[170px]">
                              {inv.businessAddress || "Employee"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Billed To (Entity) — Compact badge */}
                      <td className="py-3 px-3">
                        {inv.billedToName === "Nex Ace" || inv.billedToName?.startsWith("Nex") ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-[11px] font-medium text-muted-foreground border border-border/50">
                            <i className="fa-solid fa-building text-[9px] text-primary" /> Nex Ace
                          </span>
                        ) : (
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate max-w-[140px]" title={inv.billedToName}>
                              {inv.billedToName}
                            </div>
                            {inv.billedToEmail && (
                              <div className="text-muted-foreground text-[10px] font-mono truncate max-w-[140px]">
                                {inv.billedToEmail}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3 text-muted-foreground font-mono whitespace-nowrap">
                        <div className="text-foreground font-medium">
                          {inv.invoiceDate}
                        </div>
                        {inv.status === "Paid" && inv.paymentDetails?.paidAt ? (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap flex items-center gap-1">
                            <i className="fa-solid fa-check text-[8px]" />
                            <span>Paid: {new Date(inv.paymentDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                          </div>
                        ) : isPrivilegedAdmin && inv.updatedAt ? (
                          <div className="text-[10px] text-muted-foreground/80 whitespace-nowrap flex items-center gap-1" title="Last Status/Admin Update Time">
                            <i className="fa-solid fa-clock-rotate-left text-[8px] opacity-70" />
                            <span>{new Date(inv.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setTimelineModalInvoice(inv)}
                          className="mt-1 text-[10px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                          title="View complete invoice lifecycle audit trail"
                        >
                          <i className="fa-solid fa-route text-[9px]" />
                          <span>Cycle History {inv.timeline && inv.timeline.length > 0 ? `(${inv.timeline.length})` : ""}</span>
                        </button>
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-3 text-right font-mono font-black text-foreground text-sm tracking-tight whitespace-nowrap">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center justify-center gap-1">
                          {getStatusBadge(inv.status)}
                          {inv.status === "Paid" && inv.paymentDetails?.method && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-muted-foreground bg-muted/60 dark:bg-slate-800/60 px-1.5 py-0.2 rounded border border-border/50 whitespace-nowrap">
                              <i className={cn(
                                "fa-solid text-[8px] shrink-0",
                                inv.paymentDetails.method === "UPI" ? "fa-qrcode text-purple-500" :
                                inv.paymentDetails.method === "Cash" ? "fa-money-bill-wave text-emerald-500" :
                                "fa-building-columns text-sky-500"
                              )} />
                              <span>{inv.paymentDetails.method}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions / Approvals (Sticky right, compact & never cropped) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap sticky right-0 bg-card/95 backdrop-blur-md z-10 border-l border-border/40 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.12)]">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pending: Approve + Reject + More Dropdown */}
                          {inv.status === "Pending" && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled={isUpdating}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  patchInvoice(invId, { status: "Approved" });
                                }}
                                className="gap-1 text-xs font-bold h-7 px-2.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all hover:scale-[1.02]"
                                title={isHR ? "Verify shift attendance & timesheets and approve" : "Approve invoice"}
                              >
                                <i className={cn("fa-solid text-[10px]", isHR ? "fa-clipboard-check" : "fa-check")} />
                                <span>{isHR ? "Verify & Approve" : "Approve"}</span>
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isUpdating}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRejectModalForInvoice(inv);
                                }}
                                className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                title="Reject with reason"
                              >
                                <i className="fa-solid fa-ban text-[10px]" /> Reject
                              </Button>
                            </>
                          )}

                          {/* Approved: Process Payment (Admin / OPS only) vs HR Verified Badge */}
                          {inv.status === "Approved" && (
                            canProcessPayment ? (
                              <Button
                                type="button"
                                size="sm"
                                disabled={isUpdating}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(invId, "Paid", inv.invoiceNo);
                                }}
                                className="gap-1.5 text-xs font-bold h-7 px-2.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all hover:scale-[1.02]"
                                title="Process payment disbursement"
                              >
                                <i className="fa-solid fa-credit-card text-[10px]" /> Process Payment
                              </Button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                                <i className="fa-solid fa-clock-rotate-left text-[9px]" /> Awaiting Payment
                              </span>
                            )
                          )}

                          {/* Paid: View + PDF */}
                          {inv.status === "Paid" && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setViewInvoice(inv)}
                                className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer border-border/70 hover:bg-muted"
                                title="View Invoice Details"
                              >
                                <i className="fa-solid fa-eye text-[10px] text-primary" /> View
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportPDF(inv)}
                                className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                                title="Download PDF"
                              >
                                <i className="fa-solid fa-file-pdf text-[10px]" /> PDF
                              </Button>
                            </>
                          )}

                          {/* Rejected: Re-open */}
                          {inv.status === "Rejected" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUpdating}
                              onClick={(e) => {
                                e.stopPropagation();
                                patchInvoice(invId, { status: "Pending" });
                              }}
                              className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer text-amber-600 border-amber-300 hover:bg-amber-50"
                              title="Re-open for review"
                            >
                              <i className="fa-solid fa-rotate-left text-[10px]" /> Re-open
                            </Button>
                          )}

                          {/* Other statuses: View + PDF */}
                          {!["Pending", "Approved", "Paid", "Rejected"].includes(inv.status) && (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setViewInvoice(inv)}
                                className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer border-border/70 hover:bg-muted"
                                title="View Details"
                              >
                                <i className="fa-solid fa-eye text-[10px] text-primary" /> View
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportPDF(inv)}
                                className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                                title="Download PDF"
                              >
                                <i className="fa-solid fa-file-pdf text-[10px]" /> PDF
                              </Button>
                            </>
                          )}

                          {/* ── Secondary Dropdown Menu (•••) ── */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted/80 rounded-lg shrink-0"
                                title="More actions"
                              >
                                <i className="fa-solid fa-ellipsis-vertical text-xs" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 shadow-xl border border-border/80">
                              <DropdownMenuItem
                                onClick={() => setViewInvoice(inv)}
                                className="gap-2.5 text-xs cursor-pointer py-1.5"
                              >
                                <i className="fa-solid fa-eye text-primary w-3.5 text-center" />
                                <span>View Full Invoice</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => setTimelineModalInvoice(inv)}
                                className="gap-2.5 text-xs cursor-pointer py-1.5 font-semibold text-primary"
                              >
                                <i className="fa-solid fa-route text-primary w-3.5 text-center" />
                                <span>View Cycle History</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleExportPDF(inv)}
                                className="gap-2.5 text-xs cursor-pointer py-1.5"
                              >
                                <i className="fa-solid fa-file-pdf text-rose-500 w-3.5 text-center" />
                                <span>Download PDF</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={(e) => handleCopyInvoiceNo(e, inv.invoiceNo)}
                                className="gap-2.5 text-xs cursor-pointer py-1.5"
                              >
                                <i className="fa-solid fa-copy text-muted-foreground w-3.5 text-center" />
                                <span>Copy Invoice #</span>
                              </DropdownMenuItem>

                              {inv.status === "Rejected" && (inv.rejectionReason || inv.rejectionRemark) && (
                                <>
                                  <DropdownMenuSeparator />
                                  <div className="px-2 py-1.5 text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-md mx-1 space-y-0.5">
                                    <div className="font-bold flex items-center gap-1">
                                      <i className="fa-solid fa-circle-exclamation text-[9px]" /> Rejection Category:
                                    </div>
                                    <p className="line-clamp-2 font-medium">{inv.rejectionReason || "Discrepancy"}</p>
                                    {inv.rejectionRemark && (
                                      <p className="text-[10px] text-rose-700 dark:text-rose-300 italic line-clamp-2">
                                        &ldquo;{inv.rejectionRemark}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}

                              {isPrivilegedAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1">
                                    Quick Status Change
                                  </DropdownMenuLabel>
                                  {["Pending", "Approved", "Paid", "Rejected", "Sent", "Draft", "Overdue", "Cancelled"]
                                    .filter((st) => (st === "Paid" ? canProcessPayment : true))
                                    .map((st) => (
                                      <DropdownMenuItem
                                        key={st}
                                        disabled={st === inv.status || (st === "Paid" && inv.status !== "Approved")}
                                        onClick={() => handleStatusChange(invId, st, inv.invoiceNo)}
                                        className={cn("gap-2.5 text-xs cursor-pointer py-1.5", inv.status === st && "font-bold text-primary")}
                                      >
                                        <span className={cn(
                                          "w-2 h-2 rounded-full shrink-0",
                                          st === "Paid" ? "bg-emerald-500" :
                                          st === "Approved" ? "bg-sky-500" :
                                          st === "Pending" ? "bg-amber-500" :
                                          st === "Rejected" ? "bg-rose-500" : "bg-slate-400"
                                        )} />
                                        <span>Mark as {st}</span>
                                      </DropdownMenuItem>
                                    ))}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>

        {/* ── Mobile Responsive Card View (block md:hidden) ── */}
        <div className="block md:hidden divide-y divide-border/60">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-primary mb-2" />
              <p className="text-xs font-semibold">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground px-4">
              <p className="text-sm font-bold text-foreground">No invoices found</p>
              <p className="text-xs text-muted-foreground mt-1">No invoices match your search or filter.</p>
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const invId = inv._id || inv.id || "";
              const isUpdating = updatingId === invId;

              return (
                <div key={invId} className="p-4 space-y-3 hover:bg-muted/20 transition-colors">
                  {/* Card Header: Invoice # & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewInvoice(inv)}
                        className="font-mono font-bold text-sm text-primary hover:underline"
                      >
                        {inv.invoiceNo}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleCopyInvoiceNo(e, inv.invoiceNo)}
                        className="text-muted-foreground hover:text-foreground p-1 text-xs"
                        title="Copy"
                      >
                        <i className={cn("fa-solid", copiedNo === inv.invoiceNo ? "fa-check text-emerald-500" : "fa-copy")} />
                      </button>
                    </div>
                    <div>{getStatusBadge(inv.status)}</div>
                  </div>

                  {/* Card Body: Employee + Amount */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        {getInitials(inv.businessName)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-xs">{inv.businessName}</p>
                        <p className="text-[11px] text-muted-foreground">{inv.businessAddress || "Employee"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-foreground text-base tracking-tight">{formatCurrency(inv.total, inv.currency)}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{inv.invoiceDate}</p>
                    </div>
                  </div>

                  {/* Rejection Note */}
                  {inv.status === "Rejected" && (inv.rejectionReason || inv.rejectionRemark) && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                      <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" />
                      <div className="space-y-0.5">
                        <div>
                          <span className="font-bold">Rejection Category: </span>
                          <span>{inv.rejectionReason || "Discrepancy"}</span>
                        </div>
                        {inv.rejectionRemark && (
                          <div className="text-[11px] text-rose-800 dark:text-rose-200">
                            <span className="font-semibold">Remarks: </span>
                            <span>{inv.rejectionRemark}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mobile Actions Toolbar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40 flex-wrap">
                    {inv.status === "Pending" && isPrivilegedAdmin && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => patchInvoice(invId, { status: "Approved" })}
                          className="flex-1 h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer text-xs"
                        >
                          <i className={cn("fa-solid", isHR ? "fa-clipboard-check" : "fa-check")} />
                          <span>{isHR ? "Verify & Approve" : "Approve"}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => openRejectModalForInvoice(inv)}
                          className="h-9 px-3 text-rose-600 border-rose-300 dark:border-rose-900/50 hover:bg-rose-50 gap-1.5 cursor-pointer text-xs"
                        >
                          <i className="fa-solid fa-ban" /> Reject
                        </Button>
                      </>
                    )}

                    {inv.status === "Approved" && (
                      canProcessPayment ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => handleStatusChange(invId, "Paid", inv.invoiceNo)}
                          className="flex-1 h-9 font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer text-xs"
                        >
                          <i className="fa-solid fa-credit-card" /> Process Payment
                        </Button>
                      ) : (
                        <div className="flex-1 py-1 px-2.5 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 text-xs font-semibold text-center border border-sky-500/20">
                          <i className="fa-solid fa-clock-rotate-left mr-1" /> Verified by HR &bull; Awaiting Admin Payment
                        </div>
                      )
                    )}

                    {inv.status === "Rejected" && isPrivilegedAdmin && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => patchInvoice(invId, { status: "Pending" })}
                        className="flex-1 h-9 text-amber-600 border-amber-300 hover:bg-amber-50 gap-1.5 cursor-pointer text-xs font-semibold"
                      >
                        <i className="fa-solid fa-rotate-left" /> Re-open
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelineModalInvoice(inv)}
                      className="h-9 px-3 gap-1.5 text-xs font-semibold cursor-pointer text-primary border-primary/30 hover:bg-primary/5"
                      title="View Cycle History"
                    >
                      <i className="fa-solid fa-route" /> History
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewInvoice(inv)}
                      className="h-9 px-3 gap-1.5 text-xs font-semibold cursor-pointer"
                    >
                      <i className="fa-solid fa-eye text-primary" /> View
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPDF(inv)}
                      className="h-9 px-3 gap-1.5 text-xs font-semibold cursor-pointer text-rose-500 border-rose-500/20"
                    >
                      <i className="fa-solid fa-file-pdf" /> PDF
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* ── Payment Method Modal ── */}
      {paymentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="shrink-0 px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500" />
                  Confirm Payment
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Invoice <span className="font-mono font-bold text-foreground">{paymentModal.invoiceNo}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModal({ open: false, invoiceId: "", invoiceNo: "" })}
                className="w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] min-h-[36px] rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Modal Body with internal scrolling */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Bank Transfer", "UPI", "Cash"] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method);
                        if (method === "UPI") {
                          if (!fromUpiId) setFromUpiId(orgUpiId || "nexace@okaxis");
                          if (!toUpiId) setToUpiId(targetPayeeUpiId || "");
                        }
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer",
                        paymentMethod === method
                          ? method === "UPI"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
                            : method === "Cash"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-xs"
                            : "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400 shadow-xs"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-border/80 hover:bg-muted/50"
                      )}
                    >
                      <i className={cn(
                        "fa-solid text-lg",
                        method === "UPI" ? "fa-qrcode" :
                        method === "Cash" ? "fa-money-bill-transfer" :
                        "fa-building-columns"
                      )} />
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bank Transfer — info only */}
              {paymentMethod === "Bank Transfer" && (
                <div className="p-3 rounded-xl bg-sky-500/5 border border-sky-500/20 text-xs text-sky-700 dark:text-sky-300 flex items-start gap-2">
                  <i className="fa-solid fa-circle-info mt-0.5 shrink-0" />
                  <span>Confirm that the bank transfer has been received before approving. No additional details required.</span>
                </div>
              )}

              {/* UPI — Paid From & Paid To + Transaction ID + Screenshot */}
              {paymentMethod === "UPI" && (
                <div className="space-y-3.5">
                  {/* ── 1. Paid From (Sender UPI) ── */}
                  <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-950/20 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-arrow-up-right-from-square text-sky-500 text-xs" />
                        <span>Paid From (Sender UPI) <span className="text-rose-500">*</span></span>
                      </label>
                      <span className="text-[10px] text-sky-600 dark:text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-full">
                        Payer / Source
                      </span>
                    </div>

                    {/* Sender UPI ID input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <i className="fa-solid fa-building-columns text-xs text-sky-500" />
                      </div>
                      <Input
                        className="h-9 font-mono text-xs pl-8 pr-8 bg-background border-border/80 focus:border-sky-500"
                        placeholder="e.g. org@okaxis or sender@okhdfcbank"
                        value={fromUpiId}
                        onChange={(e) => setFromUpiId(e.target.value)}
                      />
                      {fromUpiId && (
                        <button
                          type="button"
                          onClick={() => setFromUpiId("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                          title="Clear Sender UPI"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>

                    {/* Quick Pick Sender Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-muted-foreground font-medium">Quick Pick:</span>
                      {orgUpiId && (
                        <button
                          type="button"
                          onClick={() => setFromUpiId(orgUpiId)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border",
                            fromUpiId.trim() === orgUpiId
                              ? "border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold shadow-2xs"
                              : "border-border/60 bg-background/60 hover:bg-background text-muted-foreground"
                          )}
                        >
                          <i className="fa-solid fa-shield-halved text-[10px] text-sky-500" />
                          <span>Org Default ({orgUpiId})</span>
                        </button>
                      )}

                      {adminProfileUpiId && adminProfileUpiId !== orgUpiId && (
                        <button
                          type="button"
                          onClick={() => setFromUpiId(adminProfileUpiId)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border",
                            fromUpiId.trim() === adminProfileUpiId
                              ? "border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold shadow-2xs"
                              : "border-border/60 bg-background/60 hover:bg-background text-muted-foreground"
                          )}
                        >
                          <i className="fa-solid fa-user text-[10px] text-sky-500" />
                          <span>Admin Profile ({adminProfileUpiId})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── 2. Pay UPI ID (Paid To / Payee UPI) ── */}
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-arrow-down-left-and-up-right-to-ceiling text-emerald-500 text-xs" />
                        <span>Pay UPI ID (Paid To) <span className="text-rose-500">*</span></span>
                      </label>
                      {targetPayeeUpiId ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <i className="fa-solid fa-wand-magic-sparkles text-[9px]" /> Auto-picked User UPI
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <i className="fa-solid fa-pen text-[9px]" /> Enter Payee UPI
                        </span>
                      )}
                    </div>

                    {/* Direct Pay UPI ID Input — Auto-picked if user UPI exists, otherwise empty with dummy placeholder */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <i className="fa-solid fa-qrcode text-xs text-emerald-500" />
                      </div>
                      <Input
                        className="h-9 font-mono text-xs pl-8 pr-8 bg-background border-border/80 focus:border-emerald-500"
                        placeholder="e.g. username@okhdfcbank or 9876543210@paytm"
                        value={toUpiId}
                        onChange={(e) => setToUpiId(e.target.value)}
                      />
                      {toUpiId && (
                        <button
                          type="button"
                          onClick={() => setToUpiId("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                          title="Clear Pay UPI ID"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>

                    {/* Quick Pick Chips */}
                    {(targetPayeeUpiId || savedUpiIds.some(id => id && id !== targetPayeeUpiId && id !== orgUpiId && id !== adminProfileUpiId)) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Quick Pick:</span>
                        {targetPayeeUpiId && (
                          <button
                            type="button"
                            onClick={() => setToUpiId(targetPayeeUpiId)}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border",
                              toUpiId.trim() === targetPayeeUpiId
                                ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
                                : "border-border/60 bg-background/60 hover:bg-background text-muted-foreground"
                            )}
                          >
                            <i className="fa-solid fa-user-check text-[10px] text-emerald-500" />
                            <span>User UPI ({targetPayeeUpiId})</span>
                          </button>
                        )}

                        {savedUpiIds
                          .filter((id) => id && id !== targetPayeeUpiId && id !== orgUpiId && id !== adminProfileUpiId)
                          .map((savedId) => (
                          <div
                            key={savedId}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 border transition-all",
                              toUpiId.trim() === savedId
                                ? "border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold"
                                : "border-border/60 bg-background/60 text-muted-foreground"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setToUpiId(savedId)}
                              className="cursor-pointer hover:text-foreground"
                            >
                              {savedId}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const filtered = savedUpiIds.filter((id) => id !== savedId);
                                setSavedUpiIds(filtered);
                                try {
                                  localStorage.setItem("nexace_upi_ids", JSON.stringify(filtered));
                                } catch {}
                              }}
                              className="text-muted-foreground hover:text-rose-500 text-[9px] ml-0.5 cursor-pointer"
                              title="Remove"
                            >
                              <i className="fa-solid fa-xmark" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Dynamic UPI QR Code generator for quick Admin scanning */}
                  {toUpiId.trim() && (() => {
                    const paymentModalInvoice = invoices.find((i) => (i._id || i.id) === paymentModal.invoiceId);
                    const effectivePayAmount = paymentModalInvoice ? Number(paymentModalInvoice.total || 0) : 0;
                    const payeeDisplayName = paymentModalInvoice ? (paymentModalInvoice.businessName || "NexAce Payee") : "NexAce Payee";
                    const upiPayUrl = `upi://pay?pa=${encodeURIComponent(toUpiId.trim())}&pn=${encodeURIComponent(payeeDisplayName)}&am=${encodeURIComponent(effectivePayAmount > 0 ? effectivePayAmount : "")}&cu=INR&tn=${encodeURIComponent(paymentModal.invoiceNo || "Invoice Payout")}`;
                    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayUrl)}`;

                    return (
                      <div className="p-3 bg-muted/40 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-center gap-3.5">
                        <div className="bg-white p-2 rounded-xl border border-border shadow-xs shrink-0 flex items-center justify-center">
                          <img
                            src={qrCodeUrl}
                            alt="UPI QR Code"
                            className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-foreground">
                            <i className="fa-solid fa-qrcode text-emerald-500" />
                            <span>Scan to Pay via PhonePe / GPay / Paytm</span>
                          </div>
                          <p className="text-[11px] font-mono text-muted-foreground truncate">
                            To: <strong className="text-foreground">{toUpiId.trim()}</strong>
                          </p>
                          {effectivePayAmount > 0 && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold font-mono">
                              Disbursement: ₹{effectivePayAmount.toLocaleString("en-IN")}
                            </p>
                          )}
                          <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                            <a
                              href={upiPayUrl}
                              className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary hover:underline"
                            >
                              <i className="fa-solid fa-mobile-screen-button text-[10px]" /> Open Mobile UPI App
                            </a>
                            <span className="text-muted-foreground/40 text-[10px]">&bull;</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Ref: #{paymentModal.invoiceNo}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* UPI Transaction ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-receipt text-xs text-emerald-500" />
                      <span>UPI Transaction ID <span className="text-rose-500">*</span></span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <i className="fa-solid fa-hashtag text-xs" />
                      </div>
                      <Input
                        placeholder="e.g. 316748291034 or TXN-948210"
                        value={upiTxnId}
                        onChange={(e) => setUpiTxnId(e.target.value)}
                        className="h-9 text-xs font-mono pl-8 pr-8 bg-background border-border/80 focus:border-emerald-500"
                      />
                      {upiTxnId && (
                        <button
                          type="button"
                          onClick={() => setUpiTxnId("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                          title="Clear"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Screenshot Upload / Preview */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-image text-xs text-muted-foreground" />
                        <span>Payment Screenshot / Receipt</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      ref={screenshotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotChange}
                    />
                    {upiScreenshotPreview ? (
                      <div className="relative rounded-xl border border-border/80 overflow-hidden bg-muted/20 p-2.5 flex items-center gap-3">
                        <img
                          src={upiScreenshotPreview}
                          alt="Payment screenshot"
                          className="w-14 h-14 object-cover rounded-lg border border-border shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {upiScreenshot?.name || "Screenshot Attached"}
                          </p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <i className="fa-solid fa-circle-check text-[10px]" /> Ready to confirm
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setUpiScreenshot(null); setUpiScreenshotPreview(""); }}
                          className="w-8 h-8 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Remove screenshot"
                        >
                          <i className="fa-solid fa-trash-can text-xs" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => screenshotInputRef.current?.click()}
                        className="w-full h-16 border border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 rounded-xl flex items-center justify-center gap-2.5 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <i className="fa-solid fa-arrow-up-from-bracket text-xs" />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold">Attach payment proof</p>
                          <p className="text-[10px] text-muted-foreground">PNG, JPG, or PDF up to 5MB</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Cash — info only */}
              {paymentMethod === "Cash" && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                  <i className="fa-solid fa-circle-info mt-0.5 shrink-0" />
                  <span>Confirm that cash payment has been collected in hand before approving.</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setPaymentModal({ open: false, invoiceId: "", invoiceNo: "" })}
                className="h-9 px-4 font-semibold cursor-pointer"
                disabled={confirmingPayment}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={handleConfirmPayment}
                disabled={
                  confirmingPayment ||
                  (paymentMethod === "UPI" &&
                    (!fromUpiId.trim() || !toUpiId.trim() || !upiTxnId.trim()))
                }
                className="h-9 px-5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer gap-2"
              >
                {confirmingPayment
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Processing...</>
                  : <><i className="fa-solid fa-circle-check" /> Confirm {paymentMethod} Payment</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal with Multiple Structured Objections & Attachments */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between bg-rose-500/10 shrink-0">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-bold text-sm">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-ban text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span>Reject Invoice</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 font-black">
                      #{rejectModal.invoiceNo}
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground font-normal">
                    Submit itemized objections with flagged issue references &amp; proof screenshots
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectModal({ open: false, invoiceId: "", invoiceNo: "", targetInvoice: null, objections: [createBlankObjection()] })}
                className="w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] min-h-[36px] rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>

            {/* Scrollable Objections List */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              <div className="p-3 bg-muted/30 border border-border/60 rounded-xl text-xs text-muted-foreground flex items-start gap-2.5">
                <i className="fa-solid fa-circle-info text-primary mt-0.5 text-sm shrink-0" />
                <span>
                  Log one or multiple objections. For each issue, select the specific line item, shift, or timesheet affected, write actionable remarks, and optionally attach a screenshot/proof document. The employee will receive this structured feedback directly.
                </span>
              </div>

              {/* Itemized Objection Cards */}
              <div className="space-y-3.5">
                {rejectModal.objections.map((obj, index) => {
                  const targetChoices = getItemChoices(rejectModal.targetInvoice);
                  const isCustomTarget = obj.itemRef === "__CUSTOM__";

                  return (
                    <div
                      key={obj.id}
                      className="border border-border/80 rounded-xl bg-card p-4 space-y-3 relative shadow-2xs group hover:border-rose-400/40 transition-colors"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center justify-center border border-rose-500/20">
                            {index + 1}
                          </span>
                          <span className="font-bold text-xs text-foreground">
                            Objection #{index + 1}
                          </span>
                        </div>
                        {rejectModal.objections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModal((prev) => ({
                                ...prev,
                                objections: prev.objections.filter((o) => o.id !== obj.id),
                              }));
                            }}
                            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer hover:underline"
                          >
                            <i className="fa-solid fa-trash-can text-[10px]" />
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Reason Category & Target Item Pickers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-foreground block mb-1">
                            Reason Category <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={obj.category}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRejectModal((prev) => ({
                                ...prev,
                                objections: prev.objections.map((o) => o.id === obj.id ? { ...o, category: val } : o),
                              }));
                            }}
                            className="w-full text-xs h-9 px-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                          >
                            <option value="Timesheet Hours Discrepancy">Timesheet Hours Discrepancy</option>
                            <option value="Attendance & Punch Clock Mismatch">Attendance &amp; Punch Clock Mismatch</option>
                            <option value="Incorrect Billable Rate or Calculation">Incorrect Billable Rate or Calculation</option>
                            <option value="Missing Required Documentation or Proof">Missing Required Documentation or Proof</option>
                            <option value="Project / Task Scope Not Approved">Project / Task Scope Not Approved</option>
                            <option value="Duplicate Invoice Submission">Duplicate Invoice Submission</option>
                            <option value="Other / Custom Policy Violation">Other / Custom Policy Violation</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-foreground block mb-1">
                            Disputed Line Item / Shift / Task
                          </label>
                          <select
                            value={obj.itemRef}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRejectModal((prev) => ({
                                ...prev,
                                objections: prev.objections.map((o) => o.id === obj.id ? { ...o, itemRef: val } : o),
                              }));
                            }}
                            className="w-full text-xs h-9 px-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium truncate"
                          >
                            {targetChoices.map((choice, cIdx) => (
                              <option key={cIdx} value={choice.value}>
                                {choice.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Custom item input if selected */}
                      {isCustomTarget && (
                        <div>
                          <label className="text-[11px] font-bold text-foreground block mb-1">
                            Specify Item / Shift Name
                          </label>
                          <input
                            type="text"
                            value={obj.customItemRef || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRejectModal((prev) => ({
                                ...prev,
                                objections: prev.objections.map((o) => o.id === obj.id ? { ...o, customItemRef: val } : o),
                              }));
                            }}
                            placeholder="e.g. October 14 Overtime Shift or Deliverable Task A"
                            className="w-full text-xs h-8 px-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      )}

                      {/* Actionable Remarks */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-bold text-foreground">
                            Actionable Remarks &bull; Explanation for Submitter <span className="text-rose-500">*</span>
                          </label>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {obj.remark.trim().length} chars
                          </span>
                        </div>
                        <textarea
                          value={obj.remark}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRejectModal((prev) => ({
                              ...prev,
                              objections: prev.objections.map((o) => o.id === obj.id ? { ...o, remark: val } : o),
                            }));
                          }}
                          placeholder="e.g. Discrepancy on punch clock: logged 8 hrs but biometric showed 6.5 hrs. Please adjust hours to match attendance."
                          rows={2}
                          className="w-full p-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none font-medium"
                        />
                      </div>

                      {/* Proof Attachment */}
                      <div>
                        <label className="text-[11px] font-bold text-foreground flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-paperclip text-muted-foreground text-[10px]" />
                            Attach Issue Proof / Screenshot (Optional)
                          </span>
                          {obj.attachmentUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModal((prev) => ({
                                  ...prev,
                                  objections: prev.objections.map((o) => o.id === obj.id ? { ...o, attachmentUrl: "", attachmentName: "" } : o),
                                }));
                              }}
                              className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                            >
                              Remove Attachment
                            </button>
                          )}
                        </label>

                        {!obj.attachmentUrl ? (
                          <label className="flex items-center gap-2 p-2 border border-dashed border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors text-xs text-muted-foreground">
                            <i className="fa-solid fa-cloud-arrow-up text-primary text-sm" />
                            <span className="text-[11px]">Upload screenshot or proof PDF (max 5MB)</span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) {
                                  showToast("File size must be under 5MB", "error");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setRejectModal((prev) => ({
                                    ...prev,
                                    objections: prev.objections.map((o) => o.id === obj.id ? {
                                      ...o,
                                      attachmentUrl: reader.result as string,
                                      attachmentName: file.name,
                                    } : o),
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        ) : (
                          <div className="flex items-center gap-2.5 p-2 bg-muted/40 border border-border rounded-lg">
                            {obj.attachmentUrl.startsWith("data:image/") ? (
                              <img
                                src={obj.attachmentUrl}
                                alt="Proof Preview"
                                className="w-10 h-10 object-cover rounded-md border border-border shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 border border-rose-500/20">
                                <i className="fa-solid fa-file-pdf text-base" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {obj.attachmentName || "Attached Proof"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Ready to attach</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModal((prev) => ({
                                  ...prev,
                                  objections: prev.objections.map((o) => o.id === obj.id ? { ...o, attachmentUrl: "", attachmentName: "" } : o),
                                }));
                              }}
                              className="w-6 h-6 rounded-md hover:bg-rose-500/10 text-rose-500 flex items-center justify-center cursor-pointer shrink-0"
                            >
                              <i className="fa-solid fa-xmark text-xs" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Another Objection Button */}
              <button
                type="button"
                onClick={() => {
                  setRejectModal((prev) => ({
                    ...prev,
                    objections: [...prev.objections, createBlankObjection()],
                  }));
                }}
                className="w-full py-2.5 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 text-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-plus text-xs" />
                Add Another Objection
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-medium">
                {rejectModal.objections.length} objection{rejectModal.objections.length !== 1 ? "s" : ""} configured
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectModal({ open: false, invoiceId: "", invoiceNo: "", targetInvoice: null, objections: [createBlankObjection()] })}
                  className="h-8 px-3 font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={
                    rejectModal.objections.some((o) => !o.remark.trim()) ||
                    Boolean(updatingId)
                  }
                  onClick={async () => {
                    if (rejectModal.objections.some((o) => !o.remark.trim())) {
                      showToast("Please provide actionable remarks for all objections", "error");
                      return;
                    }

                    const formatted = rejectModal.objections.map((o) => ({
                      category: o.category,
                      itemRef: o.itemRef === "__CUSTOM__" ? (o.customItemRef?.trim() || "Custom Item") : o.itemRef,
                      remark: o.remark.trim(),
                      attachmentUrl: o.attachmentUrl || "",
                      attachmentName: o.attachmentName || "",
                    }));

                    await patchInvoice(rejectModal.invoiceId, {
                      status: "Rejected",
                      rejectionReason: formatted[0].category,
                      rejectionRemark: formatted[0].remark,
                      objections: formatted,
                    });

                    setRejectModal({
                      open: false,
                      invoiceId: "",
                      invoiceNo: "",
                      targetInvoice: null,
                      objections: [createBlankObjection()],
                    });
                  }}
                  className="h-8 px-4 font-semibold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer gap-1.5"
                >
                  <i className="fa-solid fa-ban text-[11px]" />
                  Confirm Rejection ({rejectModal.objections.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Cycle History & Audit Modal ── */}
      {timelineModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <i className="fa-solid fa-route text-base" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                    <span>Invoice Cycle History</span>
                    <span className="font-mono text-primary text-xs sm:text-sm font-black">
                      #{timelineModalInvoice.invoiceNo}
                    </span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Complete lifecycle audit trail: submissions, HR verifications, approvals &amp; settlements
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTimelineModalInvoice(null)}
                className="w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] min-h-[36px] rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Close"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Snapshot Info Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-muted/20 border border-border/70 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Value</span>
                  <span className="font-mono font-black text-sm text-foreground">
                    {formatCurrency(timelineModalInvoice.total, timelineModalInvoice.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Current Status</span>
                  <div className="mt-0.5">{getStatusBadge(timelineModalInvoice.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Issued By</span>
                  <span className="font-bold text-foreground truncate block" title={timelineModalInvoice.businessName}>
                    {timelineModalInvoice.businessName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Issued Date</span>
                  <span className="font-mono text-muted-foreground">
                    {timelineModalInvoice.invoiceDate}
                  </span>
                </div>
              </div>

              {/* 4-Step Cycle Visual Stepper */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Cycle Progression Stages
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Step 1: Submission */}
                  <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span className="text-[11px] font-bold flex items-center gap-1">
                        <i className="fa-solid fa-file-invoice text-[10px]" /> 1. Generated
                      </span>
                      <i className="fa-solid fa-circle-check text-xs" />
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {timelineModalInvoice.invoiceDate}
                    </p>
                  </div>

                  {/* Step 2: HR Audit */}
                  <div className={cn(
                    "p-2.5 rounded-xl border space-y-1",
                    timelineModalInvoice.status === "Rejected"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : ["Approved", "Paid"].includes(timelineModalInvoice.status)
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold flex items-center gap-1">
                        <i className={cn("fa-solid text-[10px]", timelineModalInvoice.status === "Rejected" ? "fa-circle-xmark text-rose-500" : ["Approved", "Paid"].includes(timelineModalInvoice.status) ? "fa-user-check text-emerald-600" : "fa-user-clock text-amber-500")} />
                        2. HR Audit
                      </span>
                      {timelineModalInvoice.status === "Rejected" ? (
                        <i className="fa-solid fa-circle-xmark text-xs text-rose-500" />
                      ) : ["Approved", "Paid"].includes(timelineModalInvoice.status) ? (
                        <i className="fa-solid fa-circle-check text-xs text-emerald-600" />
                      ) : (
                        <span className="text-[9px] font-bold px-1 rounded-full bg-amber-500/20 text-amber-600 uppercase">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] opacity-90 truncate">
                      {timelineModalInvoice.status === "Rejected"
                        ? "Rejected by HR"
                        : ["Approved", "Paid"].includes(timelineModalInvoice.status)
                        ? `Verified (${timelineModalInvoice.approvedBy || "HR"})`
                        : "Attendance Check"}
                    </p>
                  </div>

                  {/* Step 3: Admin Payout */}
                  <div className={cn(
                    "p-2.5 rounded-xl border space-y-1",
                    timelineModalInvoice.status === "Paid"
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      : timelineModalInvoice.status === "Approved"
                      ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/30"
                      : "border-border/60 bg-muted/30 text-muted-foreground opacity-60"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold flex items-center gap-1">
                        <i className={cn("fa-solid text-[10px]", timelineModalInvoice.status === "Paid" ? "fa-credit-card text-emerald-600" : timelineModalInvoice.status === "Approved" ? "fa-wallet text-sky-600" : "fa-clock text-muted-foreground")} />
                        3. Admin Payout
                      </span>
                      {timelineModalInvoice.status === "Paid" ? (
                        <i className="fa-solid fa-circle-check text-xs text-emerald-600" />
                      ) : timelineModalInvoice.status === "Approved" ? (
                        <span className="text-[9px] font-bold px-1 rounded-full bg-sky-500/20 text-sky-600 uppercase">
                          Ready
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] opacity-90 truncate">
                      {timelineModalInvoice.status === "Paid"
                        ? "Disbursed"
                        : timelineModalInvoice.status === "Approved"
                        ? "Awaiting Payout"
                        : "Requires HR Approval"}
                    </p>
                  </div>

                  {/* Step 4: Settled */}
                  <div className={cn(
                    "p-2.5 rounded-xl border space-y-1",
                    timelineModalInvoice.status === "Paid"
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                      : "border-border/60 bg-muted/30 text-muted-foreground opacity-60"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold flex items-center gap-1">
                        <i className="fa-solid fa-circle-check text-emerald-600 text-[10px]" /> 4. Settled
                      </span>
                      {timelineModalInvoice.status === "Paid" && (
                        <i className="fa-solid fa-circle-check text-xs text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[10px] opacity-90 truncate">
                      {timelineModalInvoice.status === "Paid" ? "Receipt Verified" : "Pending Settlement"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chronological Event History */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Chronological Audit Trail</span>
                  <span className="font-mono text-muted-foreground">
                    {timelineModalInvoice.timeline?.length || 1} Event(s)
                  </span>
                </h4>

                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
                  {/* If timeline events exist in DB */}
                  {timelineModalInvoice.timeline && timelineModalInvoice.timeline.length > 0 ? (
                    timelineModalInvoice.timeline.map((evt, idx) => {
                      const isPaid = evt.stage === "PAID";
                      const isApproved = evt.stage === "HR_APPROVED" || evt.stage === "APPROVED";
                      const isRejected = evt.stage === "HR_REJECTED" || evt.stage === "REJECTED";
                      const isReinitiated = evt.stage === "RE_INITIATED";

                      return (
                        <div key={idx} className="relative space-y-1 text-xs">
                          {/* Stepper Dot */}
                          <span className={cn(
                            "absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-background",
                            isPaid ? "bg-emerald-500 ring-2 ring-emerald-500/20" :
                            isApproved ? "bg-emerald-500 ring-2 ring-emerald-500/20" :
                            isRejected ? "bg-rose-500 ring-2 ring-rose-500/20" :
                            isReinitiated ? "bg-amber-500 ring-2 ring-amber-500/20" :
                            "bg-primary ring-2 ring-primary/20"
                          )} />

                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-foreground flex items-center gap-1.5">
                              <i className={cn(
                                "fa-solid text-[10px]",
                                isPaid ? "fa-shield-check text-emerald-500" :
                                isApproved ? "fa-circle-check text-emerald-500" :
                                isRejected ? "fa-ban text-rose-500" :
                                isReinitiated ? "fa-rotate-right text-amber-500" :
                                "fa-file-invoice text-primary"
                              )} />
                              <span>
                                {evt.stage === "SUBMITTED" ? "Invoice Generated & Submitted" :
                                 evt.stage === "HR_APPROVED" ? "Verified & Approved by HR" :
                                 evt.stage === "APPROVED" ? "Invoice Approved" :
                                 evt.stage === "HR_REJECTED" ? "Rejected by HR" :
                                 evt.stage === "REJECTED" ? "Invoice Rejected" :
                                 evt.stage === "RE_INITIATED" ? "Corrected & Re-initiated by User" :
                                 evt.stage === "PAID" ? "Payment Processed & Settled" : evt.stage}
                              </span>
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {evt.timestamp ? formatDateTime(evt.timestamp) : ""}
                            </span>
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>Actor: <strong className="text-foreground">{evt.actorName}</strong></span>
                            <span className="inline-block px-1.5 py-0.2 rounded bg-muted text-[10px] font-bold">
                              {evt.actorRole}
                            </span>
                          </div>

                          {evt.note && (
                            <div className={cn(
                              "text-xs p-2.5 rounded-xl border font-medium mt-1.5 leading-relaxed",
                              isRejected
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                                : isApproved
                                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                : "bg-muted/40 border-border text-foreground"
                            )}>
                              {isRejected && <i className="fa-solid fa-triangle-exclamation mr-1.5 text-rose-500" />}
                              {evt.note}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    /* Fallback synthetic history if invoice created before timeline tracking */
                    <>
                      {/* Step 1: Creation */}
                      <div className="relative space-y-1 text-xs">
                        <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-file-invoice text-primary text-[10px]" />
                            Invoice Generated &amp; Submitted
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {timelineModalInvoice.invoiceDate}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Actor: <strong className="text-foreground">{timelineModalInvoice.businessName}</strong> (Submitter)
                        </p>
                      </div>

                      {/* Step 2: Approval if exists */}
                      {timelineModalInvoice.approvedBy && (
                        <div className="relative space-y-1 text-xs">
                          <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-background bg-emerald-500 ring-2 ring-emerald-500/20" />
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-clipboard-check text-[10px]" />
                              Attendance &amp; Timesheets Verified
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {timelineModalInvoice.approvedAt ? formatDateTime(timelineModalInvoice.approvedAt) : "Confirmed"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Approved by: <strong className="text-foreground">{timelineModalInvoice.approvedBy}</strong> ({timelineModalInvoice.approverRole || "HR / Admin"})
                          </p>
                        </div>
                      )}

                      {/* Step 3: Rejection if exists */}
                      {timelineModalInvoice.status === "Rejected" && (
                        <div className="relative space-y-1.5 text-xs">
                          <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-background bg-rose-500 ring-2 ring-rose-500/20" />
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-ban text-[10px]" />
                              Invoice Returned / Disputed
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {timelineModalInvoice.rejectedAt ? formatDateTime(timelineModalInvoice.rejectedAt) : "Recorded"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Returned by: <strong className="text-foreground">{timelineModalInvoice.rejectedBy || "HR Partner"}</strong>
                          </p>
                          {(timelineModalInvoice.objections && timelineModalInvoice.objections.length > 0) ? (
                            <div className="space-y-1.5">
                              {timelineModalInvoice.objections.map((obj, oIdx) => (
                                <div
                                  key={oIdx}
                                  className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between flex-wrap gap-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                      <i className="fa-solid fa-circle-exclamation text-[10px]" />
                                      <span>#{oIdx + 1}. {obj.category}</span>
                                    </div>
                                    {obj.itemRef && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-200 font-semibold border border-rose-500/30">
                                        Target: {obj.itemRef}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-rose-900 dark:text-rose-100 font-medium">
                                    {obj.remark}
                                  </p>
                                  {obj.attachmentUrl && (
                                    <div className="pt-1 border-t border-rose-500/20 flex items-center gap-2">
                                      <a
                                        href={obj.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:underline flex items-center gap-1"
                                      >
                                        <i className="fa-solid fa-paperclip text-[10px]" />
                                        <span>View Proof: {obj.attachmentName || "Attachment"}</span>
                                      </a>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                              <div className="flex items-center gap-1.5 font-bold">
                                <i className="fa-solid fa-circle-exclamation text-[10px]" />
                                <span>Category: {timelineModalInvoice.rejectionReason || "Discrepancy"}</span>
                              </div>
                              {timelineModalInvoice.rejectionRemark && (
                                <p className="text-[11px] text-rose-800 dark:text-rose-200">
                                  <strong>Remarks:</strong> {timelineModalInvoice.rejectionRemark}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 4: Payment if Paid */}
                      {timelineModalInvoice.status === "Paid" && (
                        <div className="relative space-y-1 text-xs">
                          <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-background bg-emerald-500 ring-2 ring-emerald-500/20" />
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-shield-check text-[10px]" />
                              Payment Disbursed &amp; Settled
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {timelineModalInvoice.paymentDetails?.paidAt ? formatDateTime(timelineModalInvoice.paymentDetails.paidAt) : "Settled"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Settlement Method: <strong className="text-foreground">{timelineModalInvoice.paymentDetails?.method || "Bank Transfer"}</strong>
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Rejection History Audit if multiple revisions */}
              {timelineModalInvoice.rejectionHistory && timelineModalInvoice.rejectionHistory.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2 text-xs">
                  <h5 className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <i className="fa-solid fa-clock-rotate-left" /> Rejection &amp; Correction Logs ({timelineModalInvoice.rejectionHistory.length})
                  </h5>
                  <div className="space-y-2">
                    {timelineModalInvoice.rejectionHistory.map((item, rIdx) => (
                      <div key={rIdx} className="p-2.5 rounded-lg bg-background border border-rose-500/20 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground">
                            Rejected by <strong className="text-rose-600 dark:text-rose-400">{item.rejectedBy}</strong> ({item.role || "HR"})
                          </span>
                          <span className="font-mono text-muted-foreground text-[10px]">
                            {item.rejectedAt ? formatDateTime(item.rejectedAt) : ""}
                          </span>
                        </div>
                        <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                          <strong>Category:</strong> {item.reason}
                        </p>
                        {item.remark && (
                          <p className="text-[11px] text-muted-foreground font-normal">
                            <strong>Remarks:</strong> {item.remark}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Settlement Information if Paid */}
              {timelineModalInvoice.status === "Paid" && timelineModalInvoice.paymentDetails && (
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2 text-xs">
                  <h5 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                    <i className="fa-solid fa-receipt" /> Settlement Verification Details
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Payment Method:</span>{" "}
                      <strong className="text-foreground">{timelineModalInvoice.paymentDetails.method}</strong>
                    </div>
                    {timelineModalInvoice.paymentDetails.paidAt && (
                      <div>
                        <span className="text-muted-foreground">Disbursed Date:</span>{" "}
                        <strong className="text-foreground">{formatDateTime(timelineModalInvoice.paymentDetails.paidAt)}</strong>
                      </div>
                    )}
                    {timelineModalInvoice.paymentDetails.transactionId && (
                      <div className="col-span-full">
                        <span className="text-muted-foreground">Transaction ID:</span>{" "}
                        <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground font-semibold">
                          {timelineModalInvoice.paymentDetails.transactionId}
                        </span>
                      </div>
                    )}
                    {(timelineModalInvoice.paymentDetails as any).fromUpiId && (
                      <div>
                        <span className="text-muted-foreground">Paid From UPI:</span>{" "}
                        <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {(timelineModalInvoice.paymentDetails as any).fromUpiId}
                        </span>
                      </div>
                    )}
                    {((timelineModalInvoice.paymentDetails as any).toUpiId || timelineModalInvoice.paymentDetails.upiId) && (
                      <div>
                        <span className="text-muted-foreground">Paid To UPI:</span>{" "}
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {(timelineModalInvoice.paymentDetails as any).toUpiId || timelineModalInvoice.paymentDetails.upiId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimelineModalInvoice(null)}
                className="cursor-pointer text-xs"
              >
                Close Audit View
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportPDF(timelineModalInvoice)}
                  className="gap-1.5 cursor-pointer text-xs text-rose-500 border-rose-500/20 hover:bg-rose-500/10"
                >
                  <i className="fa-solid fa-file-pdf" /> PDF
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const inv = timelineModalInvoice;
                    setTimelineModalInvoice(null);
                    setViewInvoice(inv);
                  }}
                  className="gap-1.5 cursor-pointer text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <i className="fa-solid fa-eye" /> View Full Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
