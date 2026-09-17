"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
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
  userUpiId?: string;
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
  const { user } = useAuth();
  const userUpiId = (user?.bankDetails?.upiId || (user as any)?.upiId || "").trim();
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

      // Default Paid From
      setFromUpiId(orgUpiId || "nexace@okaxis");

      // Default Paid To (Auto-pick User UPI ID)
      const targetInv = invoices.find((i) => (i._id || i.id) === invoiceId);
      const invUserUpi = (
        targetInv?.userUpiId ||
        (targetInv as any)?.bankDetails?.upiId ||
        (targetInv as any)?.paymentDetails?.toUpiId ||
        (targetInv as any)?.paymentDetails?.upiId ||
        userUpiId ||
        ""
      ).trim();

      setTargetPayeeUpiId(invUserUpi);
      setToUpiId(invUserUpi || userUpiId || "");

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
        ...(effectiveFromUpi && effectiveFromUpi !== orgUpiId && effectiveFromUpi !== userUpiId ? [effectiveFromUpi] : []),
        ...(effectiveToUpi && effectiveToUpi !== orgUpiId && effectiveToUpi !== targetPayeeUpiId && effectiveToUpi !== userUpiId ? [effectiveToUpi] : []),
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
          setFromUpiId(orgUpiId || "nexace@okaxis");
          const invUserUpi = (
            viewInvoice?.userUpiId ||
            (viewInvoice as any)?.bankDetails?.upiId ||
            (viewInvoice as any)?.paymentDetails?.toUpiId ||
            (viewInvoice as any)?.paymentDetails?.upiId ||
            userUpiId ||
            ""
          ).trim();

          setTargetPayeeUpiId(invUserUpi);
          setToUpiId(invUserUpi || userUpiId || "");

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
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
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
                          if (!toUpiId) setToUpiId(targetPayeeUpiId || userUpiId || "");
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

                      {userUpiId && userUpiId !== orgUpiId && (
                        <button
                          type="button"
                          onClick={() => setFromUpiId(userUpiId)}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border",
                            fromUpiId.trim() === userUpiId
                              ? "border-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold shadow-2xs"
                              : "border-border/60 bg-background/60 hover:bg-background text-muted-foreground"
                          )}
                        >
                          <i className="fa-solid fa-user text-[10px] text-sky-500" />
                          <span>User Profile ({userUpiId})</span>
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
                      {(targetPayeeUpiId || userUpiId) ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <i className="fa-solid fa-wand-magic-sparkles text-[9px]" /> Auto-picked User UPI
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Payee / Destination
                        </span>
                      )}
                    </div>

                    {/* Direct Pay UPI ID Input — Auto-picked and editable */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <i className="fa-solid fa-qrcode text-xs text-emerald-500" />
                      </div>
                      <Input
                        className="h-9 font-mono text-xs pl-8 pr-8 bg-background border-border/80 focus:border-emerald-500"
                        placeholder="e.g. user@okaxis or 9876543210@paytm"
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
                    {((targetPayeeUpiId || userUpiId) || savedUpiIds.some(id => id && id !== (targetPayeeUpiId || userUpiId) && id !== orgUpiId)) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Quick Pick:</span>
                        {(targetPayeeUpiId || userUpiId) && (
                          <button
                            type="button"
                            onClick={() => setToUpiId(targetPayeeUpiId || userUpiId)}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer border",
                              toUpiId.trim() === (targetPayeeUpiId || userUpiId)
                                ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
                                : "border-border/60 bg-background/60 hover:bg-background text-muted-foreground"
                            )}
                          >
                            <i className="fa-solid fa-user-check text-[10px] text-emerald-500" />
                            <span>User UPI ({targetPayeeUpiId || userUpiId})</span>
                          </button>
                        )}

                      {savedUpiIds
                        .filter((id) => id && id !== (targetPayeeUpiId || userUpiId) && id !== orgUpiId)
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
    </div>
  );
}
