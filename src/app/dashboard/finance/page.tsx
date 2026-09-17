"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FinancePortalDashboard, FinanceInvoice, FinanceExpense } from "@/components/finance/FinancePortalDashboard";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { Preloader } from "@/components/ui/Preloader";
import { SelfServiceInvoiceTab } from "@/components/settings/SelfServiceInvoiceTab";

function FinancePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const { can, canAccessModule, isAdmin, isOPS, loading: permLoading } = usePermissions();
  const isRegularUser = !isAdmin && !isOPS;

  // ── Invoice State ──
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<FinanceInvoice | null>(null);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    invoiceNo: "",
    client: "",
    amount: "",
    currency: "USD",
    status: "Draft" as FinanceInvoice["status"],
    issuedDate: "",
    dueDate: "",
    category: "Services",
    venture: "Ace Consultancys",
    notes: "",
  });

  // ── Expense State ──
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    title: "",
    category: "Operations",
    amount: "",
    currency: "USD",
    date: "",
    paidBy: "",
    department: "General",
    venture: "Ace Consultancys",
    status: "Pending" as FinanceExpense["status"],
    notes: "",
  });

  // ── Delete State ──
  const [deleteTarget, setDeleteTarget] = useState<{ type: "invoice" | "expense" | "deal"; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Auth & Organization Info ──
  const { user } = useAuth();
  // Admin user's profile UPI ID (used ONLY for "Paid From" source option, NEVER for "Paid To")
  const adminProfileUpiId = (user?.bankDetails?.upiId || (user as any)?.upiId || "").trim();
  const [orgUpiId, setOrgUpiId] = useState<string>("nexace@okaxis");
  const [savedUpiIds, setSavedUpiIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("nexace_upi_ids") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetch("/api/settings/company")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.company?.bankDetails?.upiId) {
          setOrgUpiId(data.company.bankDetails.upiId.trim());
        }
      })
      .catch(() => {});
  }, []);

  // ── Payment Method Modal (for marking invoice Paid) ──
  const [paymentModal, setPaymentModal] = useState<{
    open: boolean;
    invoiceId: string;
    invoiceNo: string;
    pendingPayload: Record<string, unknown>;
  }>({ open: false, invoiceId: "", invoiceNo: "", pendingPayload: {} });
  const [payMethod, setPayMethod] = useState<"Bank Transfer" | "UPI" | "Cash">("Bank Transfer");

  // Paid From (Sender)
  const [fromUpiId, setFromUpiId] = useState("");

  // Paid To (Recipient / Payee)
  const [toUpiId, setToUpiId] = useState("");
  const [targetPayeeUpiId, setTargetPayeeUpiId] = useState("");

  const [payTxnId, setPayTxnId]   = useState("");
  const [payScreenshot, setPayScreenshot] = useState<File | null>(null);
  const [payScreenshotPreview, setPayScreenshotPreview] = useState("");
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const [confirmingPay, setConfirmingPay] = useState(false);

  // ── Sales Deals State ──
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<SalesDeal | null>(null);
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [dealFormData, setDealFormData] = useState({
    clientAccount: "",
    dealName: "",
    dealValue: "",
    stage: "Prospecting" as SalesDeal["stage"],
    probability: 50,
    owner: "",
    expectedClose: "",
    venture: "Ace Consultancys",
    notes: "",
  });

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──
  const fetchInvoices = async () => {
    try {
      setLoadingInvoices(true);
      const res = await fetch("/api/finance/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoadingExpenses(true);
      const res = await fetch("/api/finance/expenses");
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) {
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const fetchDeals = async () => {
    try {
      setLoadingDeals(true);
      const res = await fetch("/api/operations/sales-deals");
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
    } catch (err) {
      console.error("Failed to fetch deals:", err);
    } finally {
      setLoadingDeals(false);
    }
  };

  useEffect(() => {
    if (isAdmin || isOPS) {
      fetchInvoices();
      fetchExpenses();
      fetchDeals();
    }
  }, [isAdmin, isOPS]);

  // ── Invoice Auto-number ──
  const getNextInvoiceNo = () => {
    const nums = invoices
      .map((i) => parseInt(i.invoiceNo.replace(/[^0-9]/g, ""), 10))
      .filter((n) => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `INV-${String(max + 1).padStart(3, "0")}`;
  };

  // ── Invoice Handlers ──
  const handleNewInvoice = () => {
    setEditingInvoice(null);
    setInvoiceFormData({
      invoiceNo: getNextInvoiceNo(),
      client: "",
      amount: "",
      currency: "USD",
      status: "Draft",
      issuedDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      category: "Services",
      venture: "Ace Consultancys",
      notes: "",
    });
    setShowInvoiceModal(true);
  };

  const handleEditInvoice = (inv: FinanceInvoice) => {
    setEditingInvoice(inv);
    setInvoiceFormData({
      invoiceNo: inv.invoiceNo,
      client: inv.client,
      amount: String(inv.amount),
      currency: inv.currency || "USD",
      status: inv.status,
      issuedDate: inv.issuedDate?.split("T")[0] || "",
      dueDate: inv.dueDate?.split("T")[0] || "",
      category: inv.category || "Services",
      venture: inv.venture || "Ace Consultancys",
      notes: inv.notes || "",
    });
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceFormData.client || !invoiceFormData.invoiceNo) return;

    const roundedAmount = Math.round(parseFloat(invoiceFormData.amount) || 0);
    const basePayload = {
      ...invoiceFormData,
      amount: roundedAmount,
    };

    // If setting to Paid, intercept and show payment method modal first
    if (editingInvoice && invoiceFormData.status === "Paid") {
      setPayMethod("Bank Transfer");

      // Set default Paid From (Sender)
      setFromUpiId(orgUpiId || "nexace@okaxis");

      // Set default Paid To (Payee / Recipient) - Auto-pick payee UPI ID if available on invoice/creator
      const invPayeeUpi = (
        (editingInvoice as any)?.userUpiId ||
        (editingInvoice as any)?.bankDetails?.upiId ||
        ""
      ).trim();
      setTargetPayeeUpiId(invPayeeUpi);
      setToUpiId(invPayeeUpi);

      setPayTxnId("");
      setPayScreenshot(null);
      setPayScreenshotPreview("");
      setPaymentModal({
        open: true,
        invoiceId: editingInvoice._id,
        invoiceNo: editingInvoice.invoiceNo,
        pendingPayload: basePayload,
      });
      return; // Wait for payment modal confirmation
    }

    setInvoiceSubmitting(true);
    try {
      const payload = JSON.stringify(basePayload);

      if (editingInvoice) {
        // Try FinanceInvoice first; fall back to ITInvoice (employee invoices)
        let res = await fetch(`/api/finance/invoices/${editingInvoice._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        if (!res.ok && res.status === 404) {
          res = await fetch(`/api/it/invoices/${editingInvoice._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: payload,
          });
        }
        if (res.ok) {
          await fetchInvoices();
          setShowInvoiceModal(false);
          showToast("Invoice updated successfully.");
        } else {
          const err = await res.json();
          showToast(err.error || "Failed to update invoice.", "error");
        }
      } else {
        // New invoice — always creates in FinanceInvoice
        const res = await fetch("/api/finance/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
        if (res.ok) {
          await fetchInvoices();
          setShowInvoiceModal(false);
          showToast("Invoice created successfully.");
        } else {
          const err = await res.json();
          showToast(err.error || "Failed to create invoice.", "error");
        }
      }
    } catch {
      showToast("Failed to save invoice.", "error");
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  /** Called after user confirms payment details in the payment modal */
  const handleConfirmPayment = async () => {
    const effectiveFromUpi = fromUpiId.trim();
    const effectiveToUpi = toUpiId.trim();

    if (payMethod === "UPI") {
      if (!effectiveFromUpi) {
        showToast("Please enter or select the 'Paid From' UPI ID.", "error");
        return;
      }
      if (!effectiveToUpi) {
        showToast("Please enter the 'Pay UPI ID' (Paid To).", "error");
        return;
      }
      if (!payTxnId.trim()) {
        showToast("Please enter the UPI Transaction ID.", "error");
        return;
      }
    }

    // Save custom / other UPI IDs to localStorage for future reuse
    if (payMethod === "UPI") {
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

    setConfirmingPay(true);
    try {
      const { invoiceId, pendingPayload } = paymentModal;

      // Convert screenshot to base64 if provided
      let screenshotUrl = "";
      if (payMethod === "UPI" && payScreenshot) {
        screenshotUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(payScreenshot);
        });
      }

      const fullPayload = JSON.stringify({
        ...pendingPayload,
        status: "Paid",
        paymentDetails: {
          method: payMethod,
          ...(payMethod === "UPI" ? {
            upiId: effectiveToUpi.trim() || effectiveFromUpi.trim(),
            fromUpiId: effectiveFromUpi.trim(),
            toUpiId: effectiveToUpi.trim(),
            transactionId: payTxnId.trim(),
            ...(screenshotUrl ? { screenshotUrl } : {}),
          } : {}),
          paidAt: new Date().toISOString(),
        },
      });

      // Try FinanceInvoice first, fall back to ITInvoice
      let res = await fetch(`/api/finance/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: fullPayload,
      });
      if (!res.ok && res.status === 404) {
        res = await fetch(`/api/it/invoices/${invoiceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: fullPayload,
        });
      }

      if (res.ok) {
        await fetchInvoices();
        setPaymentModal({ open: false, invoiceId: "", invoiceNo: "", pendingPayload: {} });
        setPayScreenshot(null);
        setPayScreenshotPreview("");
        setShowInvoiceModal(false);
        showToast("Invoice marked as Paid successfully.");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to mark invoice as Paid.", "error");
      }
    } catch {
      showToast("Failed to confirm payment.", "error");
    } finally {
      setConfirmingPay(false);
    }
  };

  // ── Expense Handlers ──
  const handleNewExpense = () => {
    setEditingExpense(null);
    setExpenseFormData({
      title: "",
      category: "Operations",
      amount: "",
      currency: "USD",
      date: new Date().toISOString().split("T")[0],
      paidBy: "",
      department: "General",
      venture: "Ace Consultancys",
      status: "Pending",
      notes: "",
    });
    setShowExpenseModal(true);
  };

  const handleEditExpense = (exp: FinanceExpense) => {
    setEditingExpense(exp);
    setExpenseFormData({
      title: exp.title,
      category: exp.category,
      amount: String(exp.amount),
      currency: exp.currency || "USD",
      date: exp.date?.split("T")[0] || "",
      paidBy: exp.paidBy || "",
      department: exp.department || "General",
      venture: exp.venture || "Ace Consultancys",
      status: exp.status,
      notes: exp.notes || "",
    });
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.title) return;
    setExpenseSubmitting(true);
    try {
      const url = editingExpense ? `/api/finance/expenses/${editingExpense._id}` : "/api/finance/expenses";
      const method = editingExpense ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseFormData,
          amount: Math.round(parseFloat(expenseFormData.amount) || 0),
        }),
      });
      if (res.ok) {
        await fetchExpenses();
        setShowExpenseModal(false);
        showToast(editingExpense ? "Expense updated successfully." : "Expense logged successfully.");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save expense.", "error");
      }
    } catch {
      showToast("Failed to save expense.", "error");
    } finally {
      setExpenseSubmitting(false);
    }
  };

  // ── Delete Handler ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "invoice") {
        // Try FinanceInvoice first; fall back to ITInvoice (employee invoices)
        let res = await fetch(`/api/finance/invoices/${deleteTarget.id}`, { method: "DELETE" });
        if (!res.ok && res.status === 404) {
          res = await fetch(`/api/it/invoices/${deleteTarget.id}`, { method: "DELETE" });
        }
        if (res.ok) {
          await fetchInvoices();
          showToast("Invoice deleted.");
          setDeleteTarget(null);
        } else {
          showToast("Failed to delete invoice.", "error");
        }
      } else {
        const url = deleteTarget.type === "expense"
          ? `/api/finance/expenses/${deleteTarget.id}`
          : `/api/operations/sales-deals/${deleteTarget.id}`;
        const res = await fetch(url, { method: "DELETE" });
        if (res.ok) {
          if (deleteTarget.type === "expense") await fetchExpenses();
          else await fetchDeals();
          showToast(`${deleteTarget.type === "expense" ? "Expense" : "Deal"} deleted.`);
          setDeleteTarget(null);
        } else {
          showToast("Failed to delete.", "error");
        }
      }
    } catch {
      showToast("Failed to delete.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Deal Handlers ──
  const handleNewDeal = () => {
    setEditingDeal(null);
    setDealFormData({
      clientAccount: "",
      dealName: "",
      dealValue: "",
      stage: "Prospecting",
      probability: 50,
      owner: "",
      expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      venture: "Ace Consultancys",
      notes: "",
    });
    setShowDealModal(true);
  };

  const handleEditDeal = (deal: SalesDeal) => {
    setEditingDeal(deal);
    setDealFormData({
      clientAccount: deal.clientAccount,
      dealName: deal.dealName,
      dealValue: String(deal.dealValue),
      stage: deal.stage,
      probability: deal.probability,
      owner: deal.owner || "",
      expectedClose: deal.expectedClose?.split("T")[0] || "",
      venture: deal.venture || "Ace Consultancys",
      notes: deal.notes || "",
    });
    setShowDealModal(true);
  };

  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealFormData.clientAccount || !dealFormData.dealName) return;
    setDealSubmitting(true);
    try {
      const url = editingDeal ? `/api/operations/sales-deals/${editingDeal._id}` : "/api/operations/sales-deals";
      const method = editingDeal ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dealFormData, dealValue: Math.round(parseFloat(dealFormData.dealValue) || 0) }),
      });
      if (res.ok) {
        await fetchDeals();
        setShowDealModal(false);
        showToast(editingDeal ? "Deal updated successfully." : "Deal created successfully.");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save deal.", "error");
      }
    } catch {
      showToast("Failed to save deal.", "error");
    } finally {
      setDealSubmitting(false);
    }
  };

  const inputCls = "h-9 text-sm bg-background border-input focus:ring-1 focus:ring-primary";
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";
  const EXPENSE_CATEGORIES = ["Operations", "Technology", "Marketing", "HR & Training", "Facilities", "Travel", "Legal", "Finance", "Other"];
  const INVOICE_CATEGORIES = ["Services", "Consulting", "Software Development", "Content Operations", "HR Services", "Platform Development", "Compliance & Audit", "Project Management", "Other"];

  const hasAccess = isAdmin || isOPS || canAccessModule("finance") || can("viewFinancePortal");

  if (!permLoading && !hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 text-2xl">
          <i className="fa-solid fa-shield-halved" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          You do not have permission to view the Finance Portal. Please contact your workspace administrator to request access.
        </p>
      </div>
    );
  }

  if (isRegularUser) {
    return (
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div className={cn(
            "fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold max-w-sm animate-in slide-in-from-right-5",
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
          )}>
            <i className={cn("fa-solid text-base", toast.type === "success" ? "fa-circle-check" : "fa-circle-xmark")} />
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <i className="fa-solid fa-coins text-primary text-xl" /> Finance Portal
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review your personal invoice history and generate monthly salary or contractor billing.
            </p>
          </div>
        </div>

        {/* Self-Service Portal for regular users */}
        <SelfServiceInvoiceTab showToast={showToast} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold max-w-sm animate-in slide-in-from-right-5",
          toast.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
        )}>
          <i className={cn("fa-solid text-base", toast.type === "success" ? "fa-circle-check" : "fa-circle-xmark")} />
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <i className="fa-solid fa-coins text-primary text-xl" /> Finance Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {currentTab === "generate"
              ? "Generate self-service monthly salary or contractor fee invoices."
              : "Invoices, expenses, budget utilization, payroll overview, and sales pipeline."}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentTab === "generate" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/finance?tab=invoices")}
              className="gap-2 h-8 font-semibold cursor-pointer border-border hover:bg-muted"
            >
              <i className="fa-solid fa-building-columns text-xs text-primary" /> Corporate Financials
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/finance?tab=generate")}
              className="gap-2 h-8 font-semibold cursor-pointer border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              <i className="fa-solid fa-wand-magic-sparkles text-xs" /> Generate My Invoice
            </Button>
          )}
          {(can("createInvoices") || isAdmin || isOPS) && (
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/finance/invoices/new")} className="gap-2 h-8 font-semibold cursor-pointer border-primary/40 text-primary hover:bg-primary/10">
              <i className="fa-solid fa-plus text-xs" /> Create Corporate Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Main Dashboard / Self-Service view */}
      {currentTab === "generate" ? (
        <SelfServiceInvoiceTab showToast={showToast} />
      ) : (
        <FinancePortalDashboard
          invoices={invoices}
          expenses={expenses}
          deals={deals}
          loadingInvoices={loadingInvoices}
          loadingExpenses={loadingExpenses}
          loadingDeals={loadingDeals}
          showToast={showToast}
          onNewInvoice={() => router.push("/dashboard/finance/invoices/new")}
          onEditInvoice={handleEditInvoice}
          onDeleteInvoice={(id, name) => setDeleteTarget({ type: "invoice", id, name })}
          onNewExpense={handleNewExpense}
          onEditExpense={handleEditExpense}
          onDeleteExpense={(id, name) => setDeleteTarget({ type: "expense", id, name })}
          onNewDeal={handleNewDeal}
          onEditDeal={handleEditDeal}
          onDeleteDeal={(id, name) => setDeleteTarget({ type: "deal", id, name })}
          onRefresh={() => { fetchInvoices(); fetchExpenses(); fetchDeals(); }}
        />
      )}


      {/* ── Invoice Modal ── */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-file-invoice-dollar text-primary" />
                {editingInvoice ? "Edit Invoice" : "New Invoice"}
              </h2>
              <button onClick={() => setShowInvoiceModal(false)} className="p-1.5 hover:bg-muted rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleSaveInvoice} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Invoice #</label>
                  <Input className={inputCls} value={invoiceFormData.invoiceNo} onChange={e => setInvoiceFormData(p => ({ ...p, invoiceNo: e.target.value }))} placeholder="INV-001" required />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Currency</label>
                  <select value={invoiceFormData.currency} onChange={e => setInvoiceFormData(p => ({ ...p, currency: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    {["USD", "EUR", "GBP", "PKR", "AED"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Client / Account <span className="text-rose-500">*</span></label>
                <Input className={inputCls} value={invoiceFormData.client} onChange={e => setInvoiceFormData(p => ({ ...p, client: e.target.value }))} placeholder="Client name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className={inputCls}
                    value={invoiceFormData.amount}
                    onChange={e => setInvoiceFormData(p => ({ ...p, amount: e.target.value }))}
                    onBlur={() => {
                      if (invoiceFormData.amount) {
                        const n = parseFloat(invoiceFormData.amount);
                        if (!isNaN(n)) setInvoiceFormData(p => ({ ...p, amount: String(Math.round(n)) }));
                      }
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Status</label>
                  <select value={invoiceFormData.status} onChange={e => setInvoiceFormData(p => ({ ...p, status: e.target.value as FinanceInvoice["status"] }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    {["Draft", "Pending", "Paid", "Overdue", "Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Issued Date</label>
                  <Input type="date" className={inputCls} value={invoiceFormData.issuedDate} onChange={e => setInvoiceFormData(p => ({ ...p, issuedDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Due Date</label>
                  <Input type="date" className={inputCls} value={invoiceFormData.dueDate} onChange={e => setInvoiceFormData(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Category</label>
                <select value={invoiceFormData.category} onChange={e => setInvoiceFormData(p => ({ ...p, category: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                  {INVOICE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Notes</label>
                <textarea rows={2} className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" value={invoiceFormData.notes} onChange={e => setInvoiceFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowInvoiceModal(false)} disabled={invoiceSubmitting}>Cancel</Button>
                <Button type="submit" size="sm" disabled={invoiceSubmitting} className="gap-2 font-semibold cursor-pointer">
                  {invoiceSubmitting
                    ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving...</>
                    : editingInvoice && invoiceFormData.status === "Paid"
                      ? <><i className="fa-solid fa-money-bill-wave text-xs" /> Proceed to Payment</>
                      : editingInvoice
                        ? <><i className="fa-solid fa-floppy-disk text-xs" /> Update Invoice</>
                        : <><i className="fa-solid fa-floppy-disk text-xs" /> Create Invoice</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Payment Method Modal ── */}
      {paymentModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setPaymentModal(p => ({ ...p, open: false }))}>
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-muted/30">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-money-bill-wave text-emerald-500" />
                Confirm Payment
              </h2>
              <button
                type="button"
                onClick={() => setPaymentModal(p => ({ ...p, open: false }))}
                className="p-1.5 hover:bg-muted rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Body with internal scrolling */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Invoice info banner */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-file-invoice-dollar text-sm" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{paymentModal.invoiceNo}</p>
                  <p className="text-[11px] text-muted-foreground">Marking this invoice as <strong className="text-emerald-500">Paid</strong></p>
                </div>
              </div>

              {/* Payment method selector */}
              <div className="space-y-1.5">
                <label className={labelCls}>Payment Method <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Bank Transfer", "UPI", "Cash"] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setPayMethod(m);
                        if (m === "UPI") {
                          if (!fromUpiId) setFromUpiId(orgUpiId || "nexace@okaxis");
                          if (!toUpiId) setToUpiId(targetPayeeUpiId || "");
                        }
                      }}
                      className={cn(
                        "py-2.5 px-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer",
                        payMethod === m
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <i className={cn("fa-solid text-base",
                        m === "Bank Transfer" ? "fa-building-columns" :
                        m === "UPI"           ? "fa-mobile-screen-button" :
                        "fa-money-bills"
                      )} />
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* UPI-specific fields */}
              {payMethod === "UPI" && (
                <div className="space-y-3.5">
                  {/* ── 1. Paid From (Sender UPI ID) ── */}
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

                    {/* Sender UPI ID Input */}
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                        <i className="fa-solid fa-building-columns text-xs text-sky-500" />
                      </div>
                      <Input
                        className={cn(inputCls, "h-9 font-mono text-xs pl-8 pr-8 bg-background border-border/80 focus:border-sky-500")}
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
                        className={cn(inputCls, "h-9 font-mono text-xs pl-8 pr-8 bg-background border-border/80 focus:border-emerald-500")}
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
                        className={cn(inputCls, "h-9 font-mono text-xs pl-8 pr-8 bg-background border-border/80 focus:border-emerald-500")}
                        placeholder="e.g. 316748291034 or TXN-948210"
                        value={payTxnId}
                        onChange={e => setPayTxnId(e.target.value)}
                      />
                      {payTxnId && (
                        <button
                          type="button"
                          onClick={() => setPayTxnId("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                          title="Clear"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Screenshot / Receipt Upload */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <i className="fa-solid fa-image text-xs text-muted-foreground" />
                        <span>Payment Screenshot / Receipt</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
                    </label>

                    {/* Hidden file input */}
                    <input
                      ref={screenshotInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setPayScreenshot(file);
                        const reader = new FileReader();
                        reader.onload = () => setPayScreenshotPreview(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />

                    {payScreenshotPreview ? (
                      /* Preview */
                      <div className="relative rounded-xl border border-border/80 overflow-hidden bg-muted/20 p-2.5 flex items-center gap-3">
                        <img
                          src={payScreenshotPreview}
                          alt="Payment receipt preview"
                          className="w-14 h-14 object-cover rounded-lg border border-border shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {payScreenshot?.name || "Screenshot Attached"}
                          </p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <i className="fa-solid fa-circle-check text-[10px]" /> Ready to confirm
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setPayScreenshot(null); setPayScreenshotPreview(""); if (screenshotInputRef.current) screenshotInputRef.current.value = ""; }}
                          className="w-8 h-8 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Remove screenshot"
                        >
                          <i className="fa-solid fa-trash-can text-xs" />
                        </button>
                      </div>
                    ) : (
                      /* Upload area */
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
                          <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP up to 5MB</p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Bank Transfer info */}
              {payMethod === "Bank Transfer" && (
                <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                  <i className="fa-solid fa-circle-info text-sm mt-0.5 shrink-0" />
                  <span>Ensure the bank transfer has been completed before confirming. This will mark the invoice as Paid and notify the recipient.</span>
                </div>
              )}

              {payMethod === "Cash" && (
                <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                  <i className="fa-solid fa-circle-info text-sm mt-0.5 shrink-0" />
                  <span>Confirm that the cash payment has been collected before marking this invoice as Paid.</span>
                </div>
              )}
            </div>

            {/* Actions / Footer */}
            <div className="shrink-0 p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentModal(p => ({ ...p, open: false }))}
                disabled={confirmingPay}
                className="h-9 px-4 font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmPayment}
                disabled={
                  confirmingPay ||
                  (payMethod === "UPI" && (!fromUpiId.trim() || !toUpiId.trim() || !payTxnId.trim()))
                }
                className="h-9 px-5 gap-2 font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                {confirmingPay
                  ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Confirming...</>
                  : <><i className="fa-solid fa-circle-check text-xs" /> Confirm {payMethod} Payment</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Expense Modal ── */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-receipt text-primary" />
                {editingExpense ? "Edit Expense" : "Log Expense"}
              </h2>
              <button onClick={() => setShowExpenseModal(false)} className="p-1.5 hover:bg-muted rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className={labelCls}>Title <span className="text-rose-500">*</span></label>
                <Input className={inputCls} value={expenseFormData.title} onChange={e => setExpenseFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g. AWS Infrastructure costs" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className={inputCls}
                    value={expenseFormData.amount}
                    onChange={e => setExpenseFormData(p => ({ ...p, amount: e.target.value }))}
                    onBlur={() => {
                      if (expenseFormData.amount) {
                        const n = parseFloat(expenseFormData.amount);
                        if (!isNaN(n)) setExpenseFormData(p => ({ ...p, amount: String(Math.round(n)) }));
                      }
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Currency</label>
                  <select value={expenseFormData.currency} onChange={e => setExpenseFormData(p => ({ ...p, currency: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    {["USD", "EUR", "GBP", "PKR", "AED"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Category</label>
                  <select value={expenseFormData.category} onChange={e => setExpenseFormData(p => ({ ...p, category: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Department</label>
                  <select value={expenseFormData.department} onChange={e => setExpenseFormData(p => ({ ...p, department: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    {["General", "Engineering", "Marketing", "HR", "IT", "Operations", "Legal", "Finance", "Management"].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Date</label>
                  <Input type="date" className={inputCls} value={expenseFormData.date} onChange={e => setExpenseFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Status</label>
                  <select value={expenseFormData.status} onChange={e => setExpenseFormData(p => ({ ...p, status: e.target.value as FinanceExpense["status"] }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    {["Pending", "Approved", "Rejected"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Paid By</label>
                <Input className={inputCls} value={expenseFormData.paidBy} onChange={e => setExpenseFormData(p => ({ ...p, paidBy: e.target.value }))} placeholder="Team / person name" />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Notes</label>
                <textarea rows={2} className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" value={expenseFormData.notes} onChange={e => setExpenseFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowExpenseModal(false)} disabled={expenseSubmitting}>Cancel</Button>
                <Button type="submit" size="sm" disabled={expenseSubmitting} className="gap-2 font-semibold cursor-pointer">
                  {expenseSubmitting ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving...</> : <><i className="fa-solid fa-floppy-disk text-xs" /> {editingExpense ? "Update Expense" : "Log Expense"}</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Deal Modal ── */}
      {showDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDealModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-handshake text-primary" />
                {editingDeal ? "Edit Sales Deal" : "New Sales Deal"}
              </h2>
              <button onClick={() => setShowDealModal(false)} className="p-1.5 hover:bg-muted rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleSaveDeal} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Client Account <span className="text-rose-500">*</span></label>
                  <Input className={inputCls} value={dealFormData.clientAccount} onChange={e => setDealFormData(p => ({ ...p, clientAccount: e.target.value }))} placeholder="e.g. Apex Digital Labs" required />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Deal Name <span className="text-rose-500">*</span></label>
                  <Input className={inputCls} value={dealFormData.dealName} onChange={e => setDealFormData(p => ({ ...p, dealName: e.target.value }))} placeholder="e.g. Enterprise Migration" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Deal Value ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    className={inputCls}
                    value={dealFormData.dealValue}
                    onChange={e => setDealFormData(p => ({ ...p, dealValue: e.target.value }))}
                    onBlur={() => {
                      if (dealFormData.dealValue) {
                        const n = parseFloat(dealFormData.dealValue);
                        if (!isNaN(n)) setDealFormData(p => ({ ...p, dealValue: String(Math.round(n)) }));
                      }
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Pipeline Stage</label>
                  <select value={dealFormData.stage} onChange={e => setDealFormData(p => ({ ...p, stage: e.target.value as SalesDeal["stage"] }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    {["Prospecting","Discovery","Proposal Sent","Negotiation","Closed Won","Closed Lost"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Win Probability ({dealFormData.probability}%)</label>
                  <input type="range" min="0" max="100" step="5" value={dealFormData.probability} onChange={e => setDealFormData(p => ({ ...p, probability: Number(e.target.value) }))} className="w-full cursor-pointer accent-primary" />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Expected Close</label>
                  <Input type="date" className={inputCls} value={dealFormData.expectedClose} onChange={e => setDealFormData(p => ({ ...p, expectedClose: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Deal Owner</label>
                  <Input className={inputCls} value={dealFormData.owner} onChange={e => setDealFormData(p => ({ ...p, owner: e.target.value }))} placeholder="e.g. Sara Khan" />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Venture</label>
                  <select value={dealFormData.venture} onChange={e => setDealFormData(p => ({ ...p, venture: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                    {["Ace Consultancys", "NexAce Tech"].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Notes</label>
                <textarea rows={2} className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" value={dealFormData.notes} onChange={e => setDealFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Key requirements, client context..." />
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDealModal(false)} disabled={dealSubmitting}>Cancel</Button>
                <Button type="submit" size="sm" disabled={dealSubmitting} className="gap-2 font-semibold cursor-pointer">
                  {dealSubmitting ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving...</> : <><i className="fa-solid fa-floppy-disk text-xs" /> {editingDeal ? "Update Deal" : "Create Deal"}</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete {deleteTarget.type === "invoice" ? "Invoice" : deleteTarget.type === "expense" ? "Expense" : "Sales Deal"}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <strong className="text-foreground">{deleteTarget.name}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
              <Button color="destructive" size="sm" onClick={handleDeleteConfirm} disabled={isDeleting} className="gap-2 font-semibold cursor-pointer">
                {isDeleting ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Deleting...</> : <><i className="fa-solid fa-trash-can text-xs" /> Confirm Delete</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FinancePage() {
  return (
    <Suspense fallback={<Preloader label="Loading Finance Portal..." />}>
      <FinancePageContent />
    </Suspense>
  );
}
