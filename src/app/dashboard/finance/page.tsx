"use client";

import React, { useState, useEffect } from "react";
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
          <Button variant="outline" size="sm" onClick={() => { fetchInvoices(); fetchExpenses(); fetchDeals(); }} className="gap-2 h-8 font-semibold cursor-pointer">
            <i className="fa-solid fa-rotate-right text-xs" /> Refresh
          </Button>
          {(can("manageExpenses") || isAdmin || isOPS) && (
            <Button variant="outline" size="sm" onClick={handleNewExpense} className="gap-2 h-8 font-semibold cursor-pointer">
              <i className="fa-solid fa-receipt text-xs" /> Log Expense
            </Button>
          )}
          {(can("manageDeals") || isAdmin || isOPS) && (
            <Button variant="outline" size="sm" onClick={handleNewDeal} className="gap-2 h-8 font-semibold cursor-pointer">
              <i className="fa-solid fa-handshake text-xs" /> New Deal
            </Button>
          )}
          {(can("createInvoices") || isAdmin || isOPS) && (
            <Button size="sm" onClick={handleNewInvoice} className="gap-2 h-8 font-semibold cursor-pointer">
              <i className="fa-solid fa-file-invoice-dollar text-xs" /> New Invoice
            </Button>
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
