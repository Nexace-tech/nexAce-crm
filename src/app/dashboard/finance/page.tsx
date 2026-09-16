"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FinancePortalDashboard, FinanceInvoice, FinanceExpense } from "@/components/finance/FinancePortalDashboard";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

export default function FinancePage() {
  const { can, canAccessModule, isAdmin, isOPS, loading: permLoading } = usePermissions();

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

  // ── Generate Employee Invoice State ──
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genEmployees, setGenEmployees] = useState<Array<{ _id: string; name: string; email: string; department?: string; employmentType?: string; salary?: number; role?: string }>>([]);
  const [genLoadingEmps, setGenLoadingEmps] = useState(false);
  const [genSearch, setGenSearch] = useState("");
  const [genSelected, setGenSelected] = useState<typeof genEmployees[0] | null>(null);
  const [genType, setGenType] = useState<"Full-time" | "Freelancer">("Full-time");
  const [genForm, setGenForm] = useState({
    billingPeriod: new Date().toISOString().slice(0, 7), // YYYY-MM
    amount: "",
    currency: "USD",
    hours: "",
    hourlyRate: "",
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    notes: "",
    venture: "Ace Consultancys",
  });
  const [genSubmitting, setGenSubmitting] = useState(false);

  const fetchGenEmployees = useCallback(async () => {
    setGenLoadingEmps(true);
    try {
      const res = await fetch("/api/team?activeOnly=true");
      if (res.ok) {
        const data = await res.json();
        setGenEmployees(data.employees || data.users || []);
      }
    } catch { /* ignore */ } finally {
      setGenLoadingEmps(false);
    }
  }, []);

  useEffect(() => {
    if (showGenerateModal) fetchGenEmployees();
  }, [showGenerateModal, fetchGenEmployees]);

  const handleOpenGenerate = () => {
    setGenSelected(null);
    setGenSearch("");
    setGenType("Full-time");
    setGenForm({
      billingPeriod: new Date().toISOString().slice(0, 7),
      amount: "",
      currency: "USD",
      hours: "",
      hourlyRate: "",
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes: "",
      venture: "Ace Consultancys",
    });
    setShowGenerateModal(true);
  };

  const handleSelectGenEmployee = (emp: typeof genEmployees[0]) => {
    setGenSelected(emp);
    const isFreelancer = (emp.employmentType || "").toLowerCase().includes("freelan") || (emp.employmentType || "").toLowerCase().includes("contract");
    const type = isFreelancer ? "Freelancer" : "Full-time";
    setGenType(type);
    setGenForm(prev => ({
      ...prev,
      amount: type === "Full-time" ? String(emp.salary || "") : "",
      hourlyRate: "",
      hours: "",
    }));
    setGenSearch("");
  };

  const getGenInvoiceNo = () => {
    if (!genSelected) return "EMP-001";
    const initials = genSelected.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3);
    const period = genForm.billingPeriod.replace("-", "");
    return `EMP-${initials}-${period}`;
  };

  const computeGenAmount = () => {
    if (genType === "Full-time") return Number(genForm.amount) || 0;
    const hrs = Number(genForm.hours) || 0;
    const rate = Number(genForm.hourlyRate) || 0;
    return hrs * rate;
  };

  const handleSubmitGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genSelected) return;
    const amount = computeGenAmount();
    const [year, month] = genForm.billingPeriod.split("-");
    const periodLabel = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const issuedDate = new Date(Number(year), Number(month) - 1, 1).toISOString().split("T")[0];
    const payload = {
      invoiceNo: getGenInvoiceNo(),
      client: genSelected.name,
      amount,
      currency: genForm.currency,
      status: "Pending",
      issuedDate,
      dueDate: genForm.dueDate,
      category: genType === "Full-time" ? "Employee Payroll" : "Freelancer Payment",
      venture: genForm.venture,
      notes: genForm.notes || `${genType} invoice for ${periodLabel}. Dept: ${genSelected.department || "—"}.${genType === "Freelancer" ? ` Hours: ${genForm.hours}h @ ${genForm.currency} ${genForm.hourlyRate}/hr.` : ""}`,
    };
    setGenSubmitting(true);
    try {
      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchInvoices();
        setShowGenerateModal(false);
        showToast(`Invoice generated for ${genSelected.name}`);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to generate invoice.", "error");
      }
    } catch { showToast("Failed to generate invoice.", "error"); }
    finally { setGenSubmitting(false); }
  };

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
    fetchInvoices();
    fetchExpenses();
    fetchDeals();
  }, []);

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
    setInvoiceSubmitting(true);
    try {
      const url = editingInvoice ? `/api/finance/invoices/${editingInvoice._id}` : "/api/finance/invoices";
      const method = editingInvoice ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...invoiceFormData,
          amount: Number(invoiceFormData.amount) || 0,
        }),
      });
      if (res.ok) {
        await fetchInvoices();
        setShowInvoiceModal(false);
        showToast(editingInvoice ? "Invoice updated successfully." : "Invoice created successfully.");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save invoice.", "error");
      }
    } catch {
      showToast("Failed to save invoice.", "error");
    } finally {
      setInvoiceSubmitting(false);
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
          amount: Number(expenseFormData.amount) || 0,
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
      let url = "";
      if (deleteTarget.type === "invoice") url = `/api/finance/invoices/${deleteTarget.id}`;
      else if (deleteTarget.type === "expense") url = `/api/finance/expenses/${deleteTarget.id}`;
      else url = `/api/operations/sales-deals/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        if (deleteTarget.type === "invoice") await fetchInvoices();
        else if (deleteTarget.type === "expense") await fetchExpenses();
        else await fetchDeals();
        showToast(`${deleteTarget.type === "invoice" ? "Invoice" : deleteTarget.type === "expense" ? "Expense" : "Deal"} deleted.`);
        setDeleteTarget(null);
      } else {
        showToast("Failed to delete.", "error");
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
        body: JSON.stringify({ ...dealFormData, dealValue: Number(dealFormData.dealValue) || 0 }),
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
            Invoices, expenses, budget utilization, payroll overview, and sales pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(can("createInvoices") || isAdmin || isOPS) && (
            <>
              <Button variant="outline" size="sm" onClick={handleOpenGenerate} className="gap-2 h-8 font-semibold cursor-pointer border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                <i className="fa-solid fa-wand-magic-sparkles text-xs" /> Generate Invoice
              </Button>
              <Button size="sm" onClick={handleNewInvoice} className="gap-2 h-8 font-semibold cursor-pointer">
                <i className="fa-solid fa-file-invoice-dollar text-xs" /> New Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Dashboard */}
      <FinancePortalDashboard
        invoices={invoices}
        expenses={expenses}
        deals={deals}
        loadingInvoices={loadingInvoices}
        loadingExpenses={loadingExpenses}
        loadingDeals={loadingDeals}
        showToast={showToast}
        onNewInvoice={handleNewInvoice}
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


      {/* ── Generate Employee Invoice Modal ── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowGenerateModal(false)}>
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-emerald-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <i className="fa-solid fa-wand-magic-sparkles text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Generate Employee Invoice</h2>
                  <p className="text-xs text-muted-foreground">Select an employee to generate a payroll or freelancer invoice</p>
                </div>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="p-1.5 hover:bg-muted rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Step 1: Employee Search */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">1</div>
                  <h3 className="text-sm font-bold text-foreground">Select Employee</h3>
                </div>

                {/* Selected Employee Card */}
                {genSelected ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                      {genSelected.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{genSelected.name}</p>
                      <p className="text-xs text-muted-foreground">{genSelected.email} {genSelected.department && `· ${genSelected.department}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", genType === "Full-time" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" : "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20")}>
                        <i className={cn("fa-solid mr-1 text-[9px]", genType === "Full-time" ? "fa-id-badge" : "fa-laptop-code")} />{genType}
                      </span>
                      <button type="button" onClick={() => { setGenSelected(null); }} className="text-xs text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer font-semibold">
                        <i className="fa-solid fa-rotate-left text-[10px]" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                      <Input
                        className="pl-8 h-9 text-sm"
                        placeholder="Search employee by name or email..."
                        value={genSearch}
                        onChange={e => setGenSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {genLoadingEmps ? (
                      <div className="flex items-center justify-center py-6 text-muted-foreground text-xs gap-2">
                        <i className="fa-solid fa-spinner fa-spin" /> Loading employees...
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                        {genEmployees
                          .filter(e => {
                            if (!genSearch) return true;
                            const q = genSearch.toLowerCase();
                            return e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || (e.department || "").toLowerCase().includes(q);
                          })
                          .map((emp, i) => {
                            const isFree = (emp.employmentType || "").toLowerCase().includes("freelan") || (emp.employmentType || "").toLowerCase().includes("contract");
                            return (
                              <button
                                key={emp._id}
                                type="button"
                                onClick={() => handleSelectGenEmployee(emp)}
                                className={cn("w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors cursor-pointer", i > 0 && "border-t border-border/50")}
                              >
                                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                  {emp.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate">{emp.name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{emp.email} {emp.department && `· ${emp.department}`}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {emp.salary ? <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">${emp.salary?.toLocaleString()}</span> : null}
                                  <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", isFree ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500")}>
                                    {isFree ? "Freelancer" : "Full-time"}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        {genEmployees.filter(e => !genSearch || e.name.toLowerCase().includes(genSearch.toLowerCase()) || e.email.toLowerCase().includes(genSearch.toLowerCase())).length === 0 && (
                          <div className="py-8 text-center text-xs text-muted-foreground">No employees found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Invoice Details — only shown once an employee is selected */}
              {genSelected && (
                <form onSubmit={handleSubmitGenerate} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">2</div>
                    <h3 className="text-sm font-bold text-foreground">Invoice Details</h3>
                  </div>

                  {/* Employment Type override */}
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border/60">
                    <span className="text-xs text-muted-foreground font-semibold shrink-0">Invoice Type:</span>
                    <div className="flex items-center gap-1.5">
                      {(["Full-time", "Freelancer"] as const).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setGenType(t);
                            if (t === "Full-time") setGenForm(p => ({ ...p, amount: String(genSelected.salary || ""), hours: "", hourlyRate: "" }));
                            else setGenForm(p => ({ ...p, amount: "", hours: "", hourlyRate: "" }));
                          }}
                          className={cn("px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5",
                            genType === t ? "bg-primary text-primary-foreground border-primary shadow-xs" : "bg-background text-muted-foreground border-border hover:bg-muted"
                          )}
                        >
                          <i className={cn("fa-solid text-[10px]", t === "Full-time" ? "fa-id-badge" : "fa-laptop-code")} />{t}
                        </button>
                      ))}
                    </div>
                    <span className="ml-auto text-[10px] text-muted-foreground">Auto-detected from employee type</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Billing Period */}
                    <div className="space-y-1">
                      <label className={labelCls}>Billing Period <span className="text-rose-500">*</span></label>
                      <input
                        type="month"
                        required
                        value={genForm.billingPeriod}
                        onChange={e => setGenForm(p => ({ ...p, billingPeriod: e.target.value }))}
                        className="w-full h-9 rounded-md border border-input bg-background text-sm px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {/* Currency */}
                    <div className="space-y-1">
                      <label className={labelCls}>Currency</label>
                      <select value={genForm.currency} onChange={e => setGenForm(p => ({ ...p, currency: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                        {["USD", "EUR", "GBP", "PKR", "AED"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Amount section */}
                  {genType === "Full-time" ? (
                    <div className="space-y-1">
                      <label className={labelCls}>Monthly Salary / Amount <span className="text-rose-500">*</span></label>
                      <Input
                        type="number"
                        min="0"
                        required
                        className={inputCls}
                        value={genForm.amount}
                        onChange={e => setGenForm(p => ({ ...p, amount: e.target.value }))}
                        placeholder={genSelected.salary ? `${genSelected.salary} (from profile)` : "Enter salary amount"}
                      />
                      {genSelected.salary && <p className="text-[10px] text-emerald-600 dark:text-emerald-400"><i className="fa-solid fa-circle-info mr-1" />Auto-filled from employee profile ({genForm.currency} {genSelected.salary?.toLocaleString()})</p>}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className={labelCls}>Hours Worked <span className="text-rose-500">*</span></label>
                        <Input type="number" min="0" required className={inputCls} value={genForm.hours} onChange={e => setGenForm(p => ({ ...p, hours: e.target.value }))} placeholder="e.g. 80" />
                      </div>
                      <div className="space-y-1">
                        <label className={labelCls}>Hourly Rate <span className="text-rose-500">*</span></label>
                        <Input type="number" min="0" required className={inputCls} value={genForm.hourlyRate} onChange={e => setGenForm(p => ({ ...p, hourlyRate: e.target.value }))} placeholder="e.g. 25" />
                      </div>
                      {Number(genForm.hours) > 0 && Number(genForm.hourlyRate) > 0 && (
                        <div className="col-span-2 flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                          <i className="fa-solid fa-calculator text-emerald-500 text-xs" />
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Computed: {genForm.hours}h × {genForm.currency} {genForm.hourlyRate} = {genForm.currency} {(Number(genForm.hours) * Number(genForm.hourlyRate)).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelCls}>Invoice # (auto)</label>
                      <Input className={cn(inputCls, "font-mono bg-muted/30")} value={getGenInvoiceNo()} readOnly />
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Due Date</label>
                      <Input type="date" className={inputCls} value={genForm.dueDate} onChange={e => setGenForm(p => ({ ...p, dueDate: e.target.value }))} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>Venture</label>
                    <select value={genForm.venture} onChange={e => setGenForm(p => ({ ...p, venture: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                      {["Ace Consultancys", "NexAce Tech"].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={labelCls}>Notes (optional)</label>
                    <textarea rows={2} className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" value={genForm.notes} onChange={e => setGenForm(p => ({ ...p, notes: e.target.value }))} placeholder="Auto-generated if left blank..." />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowGenerateModal(false)} disabled={genSubmitting}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={genSubmitting || !genSelected} className="gap-2 font-semibold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border-0">
                      {genSubmitting ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Generating...</> : <><i className="fa-solid fa-wand-magic-sparkles text-xs" /> Generate Invoice</>}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
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
                  <Input type="number" min="0" className={inputCls} value={invoiceFormData.amount} onChange={e => setInvoiceFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
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
                  {invoiceSubmitting ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving...</> : <><i className="fa-solid fa-floppy-disk text-xs" /> {editingInvoice ? "Update Invoice" : "Create Invoice"}</>}
                </Button>
              </div>
            </form>
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
                  <Input type="number" min="0" className={inputCls} value={expenseFormData.amount} onChange={e => setExpenseFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
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
                  <Input type="number" min="0" className={inputCls} value={dealFormData.dealValue} onChange={e => setDealFormData(p => ({ ...p, dealValue: e.target.value }))} placeholder="0" />
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
