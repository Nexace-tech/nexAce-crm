"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { InvoiceDetailsView } from "@/components/finance/InvoiceDetailsView";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

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
  status: "Draft" | "Sent" | "Pending" | "Paid" | "Overdue" | "Archived" | "Cancelled";
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
}

type PaymentMethod = "Bank Transfer" | "UPI" | "Cash";

interface PaymentModalState {
  open: boolean;
  invoiceId: string;
  invoiceNo: string;
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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>({ open: false, invoiceId: "", invoiceNo: "" });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Bank Transfer");
  const [orgUpiId, setOrgUpiId] = useState<string>("nexace@okaxis");
  const [upiSelection, setUpiSelection] = useState<string>("org"); // "org" | "custom" | <saved_id>
  const [customUpiInput, setCustomUpiInput] = useState<string>("");
  const [upiDropdownOpen, setUpiDropdownOpen] = useState(false);
  const [upiTxnId, setUpiTxnId] = useState("");
  const [upiScreenshot, setUpiScreenshot] = useState<File | null>(null);
  const [upiScreenshotPreview, setUpiScreenshotPreview] = useState<string>("");
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  // Saved custom UPI IDs (persisted in localStorage for quick reuse)
  const [savedUpiIds, setSavedUpiIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("nexace_upi_ids") || "[]"); } catch { return []; }
  });
  const [orgLogoUrl, setOrgLogoUrl] = useState<string>("");
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

  /** Opens payment modal if marking Paid, otherwise patches directly */
  const handleStatusChange = async (invoiceId: string, newStatus: string, invoiceNo?: string) => {
    if (newStatus === "Paid") {
      setPaymentMethod("Bank Transfer");
      setUpiSelection("org");
      setCustomUpiInput("");
      setUpiDropdownOpen(false);
      setUpiTxnId("");
      setUpiScreenshot(null);
      setUpiScreenshotPreview("");
      setPaymentModal({ open: true, invoiceId, invoiceNo: invoiceNo || "" });
      return;
    }
    await patchInvoice(invoiceId, { status: newStatus });
  };

  /** Core PATCH — sends status + optional paymentDetails */
  const patchInvoice = async (invoiceId: string, body: Record<string, unknown>) => {
    setUpdatingId(invoiceId);
    try {
      let res = await fetch(`/api/finance/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        res = await fetch(`/api/it/invoices/${invoiceId}`, {
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
    const effectiveUpiId =
      upiSelection === "org"
        ? orgUpiId
        : upiSelection === "custom"
        ? customUpiInput.trim()
        : upiSelection;

    if (paymentMethod === "UPI" && !effectiveUpiId) {
      showToast("Please select or enter a valid UPI ID", "error");
      return;
    }
    if (paymentMethod === "UPI" && !upiTxnId.trim()) {
      showToast("Please enter the UPI Transaction ID", "error");
      return;
    }

    // Save custom UPI ID to localStorage for future use
    if (paymentMethod === "UPI" && upiSelection === "custom" && customUpiInput.trim()) {
      const trimmed = customUpiInput.trim();
      const updated = Array.from(new Set([trimmed, ...savedUpiIds])).slice(0, 10);
      setSavedUpiIds(updated);
      try {
        localStorage.setItem("nexace_upi_ids", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save UPI ID to localStorage:", e);
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
          upiId: paymentMethod === "UPI" ? effectiveUpiId : "",
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

  const filteredInvoices = scopedInvoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.businessName.toLowerCase().includes(q) ||
      inv.billedToName.toLowerCase().includes(q) ||
      inv.customerNo.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { cls: string; icon: string }> = {
      Paid: { cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: "fa-circle-check" },
      Pending: { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: "fa-clock" },
      Sent: { cls: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20", icon: "fa-paper-plane" },
      Draft: { cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20", icon: "fa-pen-ruler" },
      Overdue: { cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: "fa-triangle-exclamation" },
      Cancelled: { cls: "bg-slate-500/10 text-slate-500 border-slate-500/20 line-through", icon: "fa-ban" },
      Archived: { cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", icon: "fa-box-archive" },
    };
    const config = configs[status] || { cls: "bg-muted text-muted-foreground", icon: "fa-circle" };
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border whitespace-nowrap", config.cls)}>
        <i className={cn("fa-solid text-[9px]", config.icon)} />
        {status}
      </span>
    );
  };

  const isPrivilegedAdmin = Boolean(isAdmin || isOPS || can("approveInvoices"));

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
  const pendingInvoiced = scopedInvoices.filter((inv) => inv.status === "Pending").reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidInvoiced = scopedInvoices.filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + (inv.total || 0), 0);

  if (viewInvoice) {
    return (
      <InvoiceDetailsView
        invoice={viewInvoice}
        onClose={() => setViewInvoice(null)}
        onStatusChange={(newStatus) => {
          const invId = viewInvoice._id || viewInvoice.id;
          if (invId) handleStatusChange(invId, newStatus, viewInvoice.invoiceNo);
        }}
        onPaymentConfirm={() => {
          const invId = viewInvoice._id || viewInvoice.id || "";
          setPaymentMethod("Bank Transfer");
          setUpiSelection("org");
          setCustomUpiInput("");
          setUpiDropdownOpen(false);
          setUpiTxnId("");
          setUpiScreenshot(null);
          setUpiScreenshotPreview("");
          setPaymentModal({ open: true, invoiceId: invId, invoiceNo: viewInvoice.invoiceNo });
        }}
        isUpdatingStatus={Boolean(updatingId)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card/90 via-card to-primary/5 shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {scope === "external" ? "External Invoices" : "Total Master Invoices"}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  {scopedInvoices.length}
                </span>
              </div>
              <p className="text-2xl font-black font-mono tracking-tight text-foreground">
                {formatCurrency(totalInvoiced)}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <i className="fa-solid fa-list-check text-[9px] text-primary" /> All records in scope
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl border border-primary/20 shadow-xs shrink-0">
              <i className="fa-solid fa-file-invoice" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card/90 via-card to-amber-500/5 shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  Pending Approval
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {scopedInvoices.filter((i) => i.status === "Pending").length}
                </span>
              </div>
              <p className="text-2xl font-black font-mono tracking-tight text-foreground">
                {formatCurrency(pendingInvoiced)}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <i className="fa-solid fa-hourglass-half text-[9px] text-amber-500" /> Awaiting admin review
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-xl border border-amber-500/20 shadow-xs shrink-0">
              <i className="fa-solid fa-clock" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card/90 via-card to-emerald-500/5 shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Settled / Paid
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  {scopedInvoices.filter((i) => i.status === "Paid").length}
                </span>
              </div>
              <p className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatCurrency(paidInvoiced)}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <i className="fa-solid fa-shield-check text-[9px] text-emerald-500" /> Verified &amp; completed
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl border border-emerald-500/20 shadow-xs shrink-0">
              <i className="fa-solid fa-circle-check" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/80 shadow-xs overflow-hidden rounded-2xl bg-card">
        <CardHeader className="pb-3 border-b border-border/70 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="fa-solid fa-file-invoice-dollar text-primary" />
              {scope === "external" ? "External Master Invoices & Billing Center" : "Admin Master Invoice Management Center"}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {scope === "external"
                ? "Review, approve, update status, and manage all external client and contractor invoices."
                : "Review, approve, update status, and manage all employee self-generated and corporate invoices."}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            className="gap-1.5 text-xs font-semibold h-8 cursor-pointer shrink-0 border-border/70 hover:bg-muted"
          >
            <i className="fa-solid fa-rotate-right text-xs" /> Refresh List
          </Button>
        </CardHeader>

        {/* Filter & Search Toolbar */}
        <div className="p-3.5 border-b border-border/70 bg-card/50 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
          <div className="relative w-full lg:w-84">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search invoice #, employee, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-background/80"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer text-xs"
              >
                <i className="fa-solid fa-circle-xmark" />
              </button>
            )}
          </div>

          {/* Status Quick Pill Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { key: "All", label: "All", count: scopedInvoices.length },
              { key: "Pending", label: "Pending", count: scopedInvoices.filter(i => i.status === "Pending").length },
              { key: "Paid", label: "Paid", count: scopedInvoices.filter(i => i.status === "Paid").length },
              { key: "Sent", label: "Sent", count: scopedInvoices.filter(i => i.status === "Sent").length },
              { key: "Draft", label: "Draft", count: scopedInvoices.filter(i => i.status === "Draft").length },
              { key: "Overdue", label: "Overdue", count: scopedInvoices.filter(i => i.status === "Overdue").length },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setStatusFilter(st.key)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                  statusFilter === st.key
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/50 hover:bg-muted/70"
                )}
              >
                <span>{st.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                  statusFilter === st.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {st.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Invoice Table */}
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border/70 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Invoice #</th>
                <th className="py-3 px-3 whitespace-nowrap">Issued By (Employee)</th>
                <th className="py-3 px-3 whitespace-nowrap">Billed To (Entity)</th>
                <th className="py-3 px-3 whitespace-nowrap">Date</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Total Amount</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Actions / Approval</th>
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
                    <tr key={invId} className="hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary whitespace-nowrap">
                        {inv.invoiceNo}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-foreground">
                          {inv.businessName}
                        </div>
                        <div className="text-muted-foreground text-[11px] font-medium">
                          {inv.businessAddress || "Employee"}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">
                          {inv.billedToName}
                        </div>
                        <div className="text-muted-foreground text-[11px] font-mono">
                          {inv.billedToEmail || "—"}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-muted-foreground font-mono whitespace-nowrap">
                        <div className="text-foreground font-medium">
                          {inv.invoiceDate}
                        </div>
                        {inv.status === "Paid" && inv.paymentDetails?.paidAt ? (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap flex items-center gap-1">
                            <span>Paid: {isPrivilegedAdmin ? formatDateTime(inv.paymentDetails.paidAt) : new Date(inv.paymentDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                        ) : isPrivilegedAdmin && inv.updatedAt ? (
                          <div className="text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1" title="Last Status/Admin Update Time">
                            <i className="fa-solid fa-clock-rotate-left text-[8px] opacity-70" />
                            <span>Updated: {formatDateTime(inv.updatedAt)}</span>
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground text-sm whitespace-nowrap">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex flex-col items-center justify-center gap-1">
                          {getStatusBadge(inv.status)}
                          {inv.status === "Paid" && inv.paymentDetails?.method && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/60 dark:bg-slate-800/60 px-2 py-0.5 rounded-md border border-border/50 whitespace-nowrap">
                              <i className={cn(
                                "fa-solid text-[9px] shrink-0",
                                inv.paymentDetails.method === "UPI" ? "fa-qrcode text-purple-500" :
                                inv.paymentDetails.method === "Cash" ? "fa-money-bill-wave text-emerald-500" :
                                "fa-building-columns text-sky-500"
                              )} />
                              <span>{inv.paymentDetails.method}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
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
                            className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer border-rose-500/20 hover:border-rose-500/50 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10"
                            title="Export Invoice to PDF"
                          >
                            <i className="fa-solid fa-file-pdf text-[10px]" /> PDF
                          </Button>

                          {(can("approveInvoices") || isAdmin || isOPS) && (
                            <>
                              {inv.status === "Pending" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isUpdating}
                                  onClick={() => handleStatusChange(invId, "Paid", inv.invoiceNo)}
                                  className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  title="Approve & Mark as Paid"
                                >
                                  <i className="fa-solid fa-check text-[10px]" /> Approve
                                </Button>
                              )}

                              <select
                                disabled={isUpdating}
                                value={inv.status}
                                onChange={(e) => handleStatusChange(invId, e.target.value, inv.invoiceNo)}
                                className="h-7 px-2 text-[11px] bg-background border border-border/80 rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Paid">Paid</option>
                                <option value="Sent">Sent</option>
                                <option value="Draft">Draft</option>
                                <option value="Overdue">Overdue</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ── Payment Method Modal ── */}
      {paymentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
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
                onClick={() => setPaymentModal({ open: false, invoiceId: "", invoiceNo: "" })}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Bank Transfer", "UPI", "Cash"] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer",
                        paymentMethod === method
                          ? method === "UPI"
                            ? "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400 shadow-xs"
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

              {/* UPI — Dropdown (Org default / Saved / Custom) + Transaction ID + Screenshot */}
              {paymentMethod === "UPI" && (
                <div className="space-y-3">
                  {/* UPI ID selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>UPI ID <span className="text-rose-500">*</span></span>
                      {upiSelection === "org" && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <i className="fa-solid fa-shield-halved text-[9px]" /> Organization Default
                        </span>
                      )}
                    </label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setUpiDropdownOpen((prev) => !prev)}
                        className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg text-foreground flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-medium hover:border-border/80"
                      >
                        <span className="flex items-center gap-2 truncate">
                          {upiSelection === "org" ? (
                            <>
                              <i className="fa-solid fa-shield-halved text-violet-500" />
                              <span className="font-mono font-semibold">{orgUpiId || "nexace@okaxis"}</span>
                              <span className="text-muted-foreground text-[10px]">(Org Default)</span>
                            </>
                          ) : upiSelection === "custom" ? (
                            <>
                              <i className="fa-solid fa-pen-to-square text-amber-500" />
                              <span>Custom UPI ID {customUpiInput ? `(${customUpiInput})` : ""}</span>
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-clock-rotate-left text-sky-500" />
                              <span className="font-mono font-semibold">{upiSelection}</span>
                              <span className="text-muted-foreground text-[10px]">(Saved)</span>
                            </>
                          )}
                        </span>
                        <i className={cn("fa-solid fa-chevron-down text-[10px] text-muted-foreground transition-transform", upiDropdownOpen && "rotate-180")} />
                      </button>

                      {upiDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            type="button"
                            onClick={() => {
                              setUpiSelection("org");
                              setUpiDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-xs rounded-lg flex items-center justify-between text-left cursor-pointer transition-colors",
                              upiSelection === "org"
                                ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold"
                                : "hover:bg-muted text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <i className="fa-solid fa-shield-halved text-violet-500" />
                              <span className="font-mono">{orgUpiId || "nexace@okaxis"}</span>
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              Org Default
                            </span>
                          </button>

                          {savedUpiIds
                            .filter((id) => id !== orgUpiId)
                            .map((id) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  setUpiSelection(id);
                                  setUpiDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full px-3 py-2 text-xs rounded-lg flex items-center justify-between text-left cursor-pointer transition-colors",
                                  upiSelection === id
                                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold"
                                    : "hover:bg-muted text-foreground"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <i className="fa-solid fa-clock-rotate-left text-sky-500" />
                                  <span className="font-mono">{id}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-medium">Saved</span>
                              </button>
                            ))}

                          <div className="border-t border-border/60 my-1" />

                          <button
                            type="button"
                            onClick={() => {
                              setUpiSelection("custom");
                              setUpiDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-xs rounded-lg flex items-center gap-2 text-left cursor-pointer transition-colors",
                              upiSelection === "custom"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                                : "hover:bg-muted text-foreground"
                            )}
                          >
                            <i className="fa-solid fa-pen-to-square text-amber-500" />
                            <span>Custom UPI ID...</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Custom UPI ID Input (only shown if user chooses Custom) */}
                  {upiSelection === "custom" && (
                    <div className="space-y-1.5 animate-in fade-in duration-200">
                      <label className="text-xs font-bold text-foreground">
                        Custom UPI ID <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          autoFocus
                          placeholder="e.g. yourname@okhdfcbank"
                          value={customUpiInput}
                          onChange={(e) => setCustomUpiInput(e.target.value)}
                          className="h-9 text-xs font-mono pl-8"
                        />
                        <i className="fa-solid fa-pen-to-square text-xs text-muted-foreground absolute left-2.5 top-2.5" />
                      </div>
                    </div>
                  )}

                  {/* UPI Transaction ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      UPI Transaction ID <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="e.g. 316748291034"
                        value={upiTxnId}
                        onChange={(e) => setUpiTxnId(e.target.value)}
                        className="h-9 text-xs font-mono pl-8"
                      />
                      <i className="fa-solid fa-receipt text-xs text-muted-foreground absolute left-2.5 top-2.5" />
                    </div>
                  </div>

                  {/* Screenshot */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">
                      Payment Screenshot <span className="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      ref={screenshotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleScreenshotChange}
                    />
                    {upiScreenshotPreview ? (
                      <div className="relative group">
                        <img
                          src={upiScreenshotPreview}
                          alt="Payment screenshot"
                          className="w-full h-36 object-cover rounded-xl border border-border"
                        />
                        <button
                          onClick={() => { setUpiScreenshot(null); setUpiScreenshotPreview(""); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg"
                        >
                          <i className="fa-solid fa-xmark text-xs" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => screenshotInputRef.current?.click()}
                        className="w-full h-20 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                      >
                        <i className="fa-solid fa-arrow-up-from-bracket text-base" />
                        <span className="text-xs font-medium">Click to attach screenshot</span>
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
            <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaymentModal({ open: false, invoiceId: "", invoiceNo: "" })}
                className="h-9 px-4 font-semibold cursor-pointer"
                disabled={confirmingPayment}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmPayment}
                disabled={
                  confirmingPayment ||
                  (paymentMethod === "UPI" &&
                    (!(upiSelection === "org" ? orgUpiId : upiSelection === "custom" ? customUpiInput.trim() : upiSelection) ||
                      !upiTxnId.trim()))
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
    </div>
  );
}
