"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FinanceInvoice, FinanceExpense } from "./FinancePortalDashboard";

interface ExternalFinanceOverviewProps {
  invoices: FinanceInvoice[];
  expenses: FinanceExpense[];
  budgetData: Array<{ dept: string; budget: number; spent: number; color: string }>;
  loadingInvoices?: boolean;
  loadingExpenses?: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  onNewInvoice: () => void;
  onEditInvoice: (inv: FinanceInvoice) => void;
  onNewExpense: () => void;
  onEditExpense: (exp: FinanceExpense) => void;
  onNavigateTab: (tab: "invoices" | "expenses" | "budget" | "payroll") => void;
  onRefresh?: () => void;
}

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);

const invoiceStatusStyle: Record<string, string> = {
  Paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Overdue: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  Draft: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  Cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const expenseStatusStyle: Record<string, string> = {
  Approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

export function ExternalFinanceOverview({
  invoices,
  expenses,
  budgetData,
  loadingInvoices = false,
  loadingExpenses = false,
  showToast,
  onNewInvoice,
  onEditInvoice,
  onNewExpense,
  onEditExpense,
  onNavigateTab,
  onRefresh,
}: ExternalFinanceOverviewProps) {
  // ─── Time Horizon Filter ──────────────────────────────────────────────────
  const [timeHorizon, setTimeHorizon] = useState<"all" | "ytd" | "q3" | "month">("all");

  // Helper to filter dates by horizon
  const filterByHorizon = (dateStr?: string) => {
    if (timeHorizon === "all" || !dateStr) return true;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return true;
    const now = new Date();

    if (timeHorizon === "month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (timeHorizon === "q3") {
      const q = Math.floor(d.getMonth() / 3);
      const currentQ = Math.floor(now.getMonth() / 3);
      return d.getFullYear() === now.getFullYear() && q === currentQ;
    }
    if (timeHorizon === "ytd") {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const horizonInvoices = useMemo(() => {
    return invoices.filter((i) =>
      filterByHorizon(i.issuedDate || (i.createdAt ? new Date(i.createdAt).toISOString().split("T")[0] : ""))
    );
  }, [invoices, timeHorizon]);

  const horizonExpenses = useMemo(() => {
    return expenses.filter((e) =>
      filterByHorizon(e.date || (e.createdAt ? new Date(e.createdAt).toISOString().split("T")[0] : ""))
    );
  }, [expenses, timeHorizon]);

  // ─── Local State for Interactive Filtering & Search ────────────────────────
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("All");
  const [invoiceSort, setInvoiceSort] = useState<"newest" | "highest" | "dueSoon">("newest");
  const [highValueOnly, setHighValueOnly] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);

  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCatFilter, setExpenseCatFilter] = useState("All");
  const [updatingExpenseId, setUpdatingExpenseId] = useState<string | null>(null);

  // Chart Display Toggle (Dual Bar vs Net Margin Area)
  const [chartMode, setChartMode] = useState<"bar" | "net">("bar");
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  // Settlement Dialog State
  const [settlingInvoice, setSettlingInvoice] = useState<FinanceInvoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("Bank Transfer");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Quick Snapshot Preview State
  const [previewingInvoice, setPreviewingInvoice] = useState<FinanceInvoice | null>(null);

  // ─── 1. Computed Metrics ──────────────────────────────────────────────────
  const invoiceMetrics = useMemo(() => {
    const targetInvoices = horizonInvoices;
    const totalBilled = targetInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const paidInvoices = targetInvoices.filter((i) => i.status === "Paid");
    const paidAmount = paidInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const pendingInvoices = targetInvoices.filter((i) => i.status === "Pending");
    const pendingAmount = pendingInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const overdueInvoices = targetInvoices.filter((i) => i.status === "Overdue");
    const overdueAmount = overdueInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const draftInvoices = targetInvoices.filter((i) => i.status === "Draft");
    const draftAmount = draftInvoices.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const collectionRate = totalBilled > 0 ? Math.round((paidAmount / totalBilled) * 100) : 0;

    // Days Sales Outstanding (DSO) / Average Collection Velocity
    let totalDaysToPay = 0;
    let countedPaid = 0;
    paidInvoices.forEach((i) => {
      if (i.issuedDate) {
        const issue = new Date(i.issuedDate).getTime();
        const due = i.dueDate ? new Date(i.dueDate).getTime() : issue + 30 * 86400000;
        const days = Math.max(1, Math.round((due - issue) / 86400000));
        totalDaysToPay += days;
        countedPaid++;
      }
    });
    const avgCollectionDays = countedPaid > 0 ? Math.round(totalDaysToPay / countedPaid) : 21;

    return {
      totalBilled,
      paidAmount,
      paidCount: paidInvoices.length,
      pendingAmount,
      pendingCount: pendingInvoices.length,
      overdueAmount,
      overdueCount: overdueInvoices.length,
      draftAmount,
      draftCount: draftInvoices.length,
      collectionRate,
      avgCollectionDays,
    };
  }, [horizonInvoices]);

  const expenseMetrics = useMemo(() => {
    const targetExpenses = horizonExpenses;
    const totalSpent = targetExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const approvedExpenses = targetExpenses.filter((e) => e.status === "Approved");
    const approvedAmount = approvedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const pendingExpenses = targetExpenses.filter((e) => e.status === "Pending");
    const pendingAmount = pendingExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // Category breakdown
    const cats: Record<string, number> = {};
    approvedExpenses.forEach((e) => {
      const cat = e.category || "Operations";
      cats[cat] = (cats[cat] || 0) + (Number(e.amount) || 0);
    });
    const totalCatsVal = Object.values(cats).reduce((s, v) => s + v, 0) || 1;
    const catList = Object.entries(cats)
      .map(([name, val]) => ({
        name,
        val,
        pct: Math.round((val / totalCatsVal) * 100),
      }))
      .sort((a, b) => b.val - a.val);

    return {
      totalSpent,
      approvedAmount,
      approvedCount: approvedExpenses.length,
      pendingAmount,
      pendingCount: pendingExpenses.length,
      categories: catList,
    };
  }, [horizonExpenses]);

  const budgetMetrics = useMemo(() => {
    const totalBudget = budgetData.reduce((s, b) => s + (Number(b.budget) || 0), 0);
    const totalSpent = budgetData.reduce((s, b) => s + (Number(b.spent) || 0), 0);
    const remaining = totalBudget - totalSpent;
    const utilizationPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const overBudgetCount = budgetData.filter((b) => b.spent > b.budget).length;

    return {
      totalBudget,
      totalSpent,
      remaining,
      utilizationPct,
      overBudgetCount,
    };
  }, [budgetData]);

  // Net Operating Cash Flow & Operating Margin
  const netCashFlow = invoiceMetrics.paidAmount - expenseMetrics.approvedAmount;
  const operatingMargin =
    invoiceMetrics.paidAmount > 0
      ? Math.round((netCashFlow / invoiceMetrics.paidAmount) * 100)
      : 0;

  // Monthly Burn Rate and Operational Runway
  const monthlyBurn = useMemo(() => {
    const approvedTotal = expenseMetrics.approvedAmount;
    return approvedTotal > 0 ? Math.round(approvedTotal / 3) : 3500;
  }, [expenseMetrics.approvedAmount]);

  const runwayMonths = useMemo(() => {
    if (monthlyBurn <= 0) return 12;
    const availableReserves = Math.max(0, budgetMetrics.remaining + (netCashFlow > 0 ? netCashFlow : 0));
    return (availableReserves / monthlyBurn).toFixed(1);
  }, [budgetMetrics.remaining, netCashFlow, monthlyBurn]);

  // ─── 2. Live 6-Month Cash Flow Trend ───────────────────────────────────────
  const monthlyTrendData = useMemo(() => {
    const months: { key: string; label: string; revenue: number; expenses: number; net: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short" });
      months.push({ key, label, revenue: 0, expenses: 0, net: 0 });
    }

    invoices.forEach((inv) => {
      const dateStr = inv.issuedDate || (inv.createdAt ? new Date(inv.createdAt).toISOString().split("T")[0] : "");
      if (!dateStr) return;
      const key = dateStr.substring(0, 7);
      const m = months.find((item) => item.key === key);
      if (m && inv.status === "Paid") {
        m.revenue += Number(inv.amount) || 0;
      }
    });

    expenses.forEach((exp) => {
      const dateStr = exp.date || (exp.createdAt ? new Date(exp.createdAt).toISOString().split("T")[0] : "");
      if (!dateStr) return;
      const key = dateStr.substring(0, 7);
      const m = months.find((item) => item.key === key);
      if (m && exp.status === "Approved") {
        m.expenses += Number(exp.amount) || 0;
      }
    });

    months.forEach((m) => {
      m.net = m.revenue - m.expenses;
    });

    return months;
  }, [invoices, expenses]);

  const maxMonthlyVal = useMemo(() => {
    const maxVal = Math.max(...monthlyTrendData.flatMap((d) => [d.revenue, d.expenses]), 5000);
    return Math.ceil(maxVal / 5000) * 5000;
  }, [monthlyTrendData]);

  // ─── Filtered & Sorted Invoices ───────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return horizonInvoices
      .filter((inv) => {
        const q = invoiceSearch.toLowerCase();
        const matchesQuery =
          !q ||
          inv.client.toLowerCase().includes(q) ||
          inv.invoiceNo.toLowerCase().includes(q) ||
          inv.category.toLowerCase().includes(q);
        const matchesStatus =
          invoiceStatusFilter === "All" || inv.status === invoiceStatusFilter;
        const matchesHighValue = !highValueOnly || Number(inv.amount) >= 5000;
        return matchesQuery && matchesStatus && matchesHighValue;
      })
      .sort((a, b) => {
        if (invoiceSort === "highest") {
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        }
        if (invoiceSort === "dueSoon") {
          return (a.dueDate || "").localeCompare(b.dueDate || "");
        }
        return (b.issuedDate || "").localeCompare(a.issuedDate || "");
      });
  }, [horizonInvoices, invoiceSearch, invoiceStatusFilter, highValueOnly, invoiceSort]);

  // ─── Filtered Expenses ────────────────────────────────────────────────────
  const filteredExpenses = useMemo(() => {
    return horizonExpenses.filter((exp) => {
      const q = expenseSearch.toLowerCase();
      const matchesQuery =
        !q ||
        exp.title.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q) ||
        exp.department.toLowerCase().includes(q);
      const matchesCategory =
        expenseCatFilter === "All" || exp.category === expenseCatFilter;
      return matchesQuery && matchesCategory;
    });
  }, [horizonExpenses, expenseSearch, expenseCatFilter]);

  // ─── Export Financial Report (CSV) ─────────────────────────────────────────
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rows = [
      ["EXTERNAL FINANCIAL STATEMENT & AUDIT REPORT"],
      ["Report Horizon", timeHorizon.toUpperCase()],
      ["Generated At", new Date().toLocaleString()],
      [],
      ["EXECUTIVE OVERVIEW METRICS"],
      ["Total External Invoiced", `$${fmt(invoiceMetrics.totalBilled)}`],
      ["Paid Receivables", `$${fmt(invoiceMetrics.paidAmount)} (${invoiceMetrics.paidCount} invoices)`],
      ["Pending Receivables", `$${fmt(invoiceMetrics.pendingAmount)} (${invoiceMetrics.pendingCount} invoices)`],
      ["Overdue Receivables", `$${fmt(invoiceMetrics.overdueAmount)} (${invoiceMetrics.overdueCount} invoices)`],
      ["Total Vendor Disbursements", `$${fmt(expenseMetrics.totalSpent)}`],
      ["Approved Disbursements", `$${fmt(expenseMetrics.approvedAmount)} (${expenseMetrics.approvedCount} items)`],
      ["Net Operating Cash Flow", `$${fmt(netCashFlow)}`],
      ["Operating Margin", `${operatingMargin}%`],
      ["Average Collection Velocity (DSO)", `${invoiceMetrics.avgCollectionDays} days`],
      ["Estimated Monthly Burn", `$${fmt(monthlyBurn)}`],
      ["Reserve Runway", `${runwayMonths} months`],
      ["Total Project Budget", `$${fmt(budgetMetrics.totalBudget)}`],
      ["Total Budget Spent", `$${fmt(budgetMetrics.totalSpent)} (${budgetMetrics.utilizationPct}% utilized)`],
      ["Available Reserves", `$${fmt(budgetMetrics.remaining)}`],
      [],
      ["EXTERNAL CLIENT INVOICES"],
      ["Invoice No", "Client", "Category", "Issued Date", "Due Date", "Amount (USD)", "Status", "Notes"],
      ...invoices.map((inv) => [
        inv.invoiceNo,
        `"${(inv.client || "").replace(/"/g, '""')}"`,
        `"${(inv.category || "Services").replace(/"/g, '""')}"`,
        inv.issuedDate,
        inv.dueDate || "",
        inv.amount,
        inv.status,
        `"${(inv.notes || "").replace(/"/g, '""')}"`,
      ]),
      [],
      ["EXTERNAL VENDOR & SERVICE EXPENSES"],
      ["Expense Title", "Category", "Department", "Date", "Amount (USD)", "Status", "Notes"],
      ...expenses.map((exp) => [
        `"${(exp.title || "").replace(/"/g, '""')}"`,
        `"${(exp.category || "Operations").replace(/"/g, '""')}"`,
        `"${(exp.department || "General").replace(/"/g, '""')}"`,
        exp.date,
        exp.amount,
        exp.status,
        `"${(exp.notes || "").replace(/"/g, '""')}"`,
      ]),
      [],
      ["PROJECT & VENDOR BUDGET ALLOCATIONS"],
      ["Allocation / Category", "Budget (USD)", "Spent (USD)", "Remaining (USD)", "Utilization %"],
      ...budgetData.map((b) => [
        `"${b.dept.replace(/"/g, '""')}"`,
        b.budget,
        b.spent,
        b.budget - b.spent,
        `${Math.round(((b.spent || 0) / (b.budget || 1)) * 100)}%`,
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `External_Finance_Audit_${timeHorizon}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("External financial audit report downloaded as CSV!", "success");
  };

  // ─── Settlement Handlers ───────────────────────────────────────────────────
  const handleConfirmSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingInvoice) return;
    try {
      setUpdatingInvoiceId(settlingInvoice._id);
      const updatedNotes = settlingInvoice.notes
        ? `${settlingInvoice.notes} | Paid via ${paymentMethod} (Ref: ${paymentRef || "N/A"}) on ${paymentDate}`
        : `Paid via ${paymentMethod} (Ref: ${paymentRef || "N/A"}) on ${paymentDate}`;

      const res = await fetch(`/api/finance/invoices/${settlingInvoice._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Paid",
          notes: updatedNotes,
        }),
      });
      if (res.ok) {
        showToast(`Invoice ${settlingInvoice.invoiceNo} marked as Paid via ${paymentMethod}!`, "success");
        setSettlingInvoice(null);
        setPaymentRef("");
        if (onRefresh) onRefresh();
      } else {
        showToast("Failed to record settlement", "error");
      }
    } catch {
      showToast("Error updating invoice status", "error");
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleQuickApproveExpense = async (exp: FinanceExpense) => {
    try {
      setUpdatingExpenseId(exp._id);
      const res = await fetch(`/api/finance/expenses/${exp._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved" }),
      });
      if (res.ok) {
        showToast(`Expense "${exp.title}" approved!`, "success");
        if (onRefresh) onRefresh();
      } else {
        showToast("Failed to approve expense", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error approving expense", "error");
    } finally {
      setUpdatingExpenseId(null);
    }
  };

  const handleCopyInvoiceSummary = (inv: FinanceInvoice) => {
    const summary = `Invoice: ${inv.invoiceNo}\nClient: ${inv.client}\nAmount: $${fmt(inv.amount)} ${inv.currency || "USD"}\nStatus: ${inv.status}\nDue Date: ${inv.dueDate || "Upon Receipt"}`;
    navigator.clipboard.writeText(summary);
    showToast(`Invoice details copied for ${inv.invoiceNo}`, "success");
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner & Quick Controls ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-card/95 via-card/85 to-card/95 border border-border/80 shadow-xs relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
              <span>External Financial Command Center</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Executive Live Hub
              </span>
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Holistic management of client billing receivables, outbound vendor disbursements, cash runway, and external budgets.
          </p>
        </div>

        {/* Time Horizon & Actions Bar */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {/* Horizon Selector */}
          <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border/60 text-xs">
            {[
              { key: "all", label: "All Time" },
              { key: "ytd", label: "YTD" },
              { key: "q3", label: "This Quarter" },
              { key: "month", label: "This Month" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTimeHorizon(tab.key as any)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  timeHorizon === tab.key
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={onNewInvoice}
            className="gap-2 font-bold h-8.5 bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer shadow-xs"
          >
            <i className="fa-solid fa-file-invoice text-xs" />
            New Client Invoice
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onNewExpense}
            className="gap-2 font-bold h-8.5 border-border/80 hover:bg-muted/50 transition-all cursor-pointer shadow-xs"
          >
            <i className="fa-solid fa-receipt text-xs text-amber-500" />
            Log Expense
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className="gap-1.5 font-bold h-8.5 border-border/80 hover:bg-muted/50 transition-all cursor-pointer shadow-xs"
            title="Download CSV Statement"
          >
            <i className="fa-solid fa-file-csv text-xs text-emerald-500" />
            Export CSV
          </Button>
          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              className="h-8.5 w-8.5 p-0 border-border/80 hover:bg-muted/50 cursor-pointer"
              title="Refresh financial data"
            >
              <i className="fa-solid fa-rotate text-xs text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* ── 4 Executive Financial KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Invoices / Receivables */}
        <div
          onClick={() => onNavigateTab("invoices")}
          className="relative overflow-hidden bg-card hover:bg-muted/20 border border-border/80 hover:border-blue-500/50 rounded-2xl p-4.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/60 via-blue-500/20 to-transparent" />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-950/40 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base group-hover:scale-105 transition-transform shadow-2xs">
                <i className="fa-solid fa-file-invoice-dollar" />
              </div>
              <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                {invoiceMetrics.collectionRate}% Paid
              </span>
            </div>
            <p className="text-xs font-bold text-muted-foreground">External Invoices Billed</p>
            <p className="text-2xl font-black text-foreground font-mono mt-1 tracking-tight">
              ${fmt(invoiceMetrics.totalBilled)}
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">
              ${fmt(invoiceMetrics.paidAmount)} paid • {invoiceMetrics.pendingCount} pending
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              Invoices <i className="fa-solid fa-arrow-right text-[9px]" />
            </span>
          </div>
        </div>

        {/* KPI 2: Expenses / Disbursements */}
        <div
          onClick={() => onNavigateTab("expenses")}
          className="relative overflow-hidden bg-card hover:bg-muted/20 border border-border/80 hover:border-amber-500/50 rounded-2xl p-4.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/60 via-amber-500/20 to-transparent" />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base group-hover:scale-105 transition-transform shadow-2xs">
                <i className="fa-solid fa-receipt" />
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20">
                {expenseMetrics.approvedCount} Approved
              </span>
            </div>
            <p className="text-xs font-bold text-muted-foreground">Vendor &amp; Service Expenses</p>
            <p className="text-2xl font-black text-foreground font-mono mt-1 tracking-tight">
              ${fmt(expenseMetrics.totalSpent)}
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">
              ${fmt(expenseMetrics.approvedAmount)} approved • {expenseMetrics.pendingCount} pending
            </span>
            <span className="font-bold text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              Expenses <i className="fa-solid fa-arrow-right text-[9px]" />
            </span>
          </div>
        </div>

        {/* KPI 3: Net Cash Flow / Margin */}
        <div className="relative overflow-hidden bg-card border border-border/80 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/60 via-emerald-500/20 to-transparent" />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shadow-2xs">
                <i className="fa-solid fa-scale-balanced" />
              </div>
              <span className={cn(
                "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
                netCashFlow >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              )}>
                {operatingMargin}% Margin
              </span>
            </div>
            <p className="text-xs font-bold text-muted-foreground">Net Realized Cash Flow</p>
            <p className={cn("text-2xl font-black font-mono mt-1 tracking-tight", netCashFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600")}>
              ${fmt(netCashFlow)}
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
            <span>Collected: ${fmt(invoiceMetrics.paidAmount)}</span>
            <span>Spent: ${fmt(expenseMetrics.approvedAmount)}</span>
          </div>
        </div>

        {/* KPI 4: External Budget Allocation */}
        <div
          onClick={() => onNavigateTab("budget")}
          className="relative overflow-hidden bg-card hover:bg-muted/20 border border-border/80 hover:border-purple-500/50 rounded-2xl p-4.5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500/60 via-purple-500/20 to-transparent" />
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-base group-hover:scale-105 transition-transform shadow-2xs">
                <i className="fa-solid fa-wallet" />
              </div>
              <span className={cn(
                "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border",
                budgetMetrics.utilizationPct > 90
                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              )}>
                {budgetMetrics.utilizationPct}% Utilized
              </span>
            </div>
            <p className="text-xs font-bold text-muted-foreground">External Budget Allocated</p>
            <p className="text-2xl font-black text-foreground font-mono mt-1 tracking-tight">
              ${fmt(budgetMetrics.totalBudget)}
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-medium">
              ${fmt(budgetMetrics.remaining)} remaining balance
            </span>
            <span className="font-bold text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              Budgets <i className="fa-solid fa-arrow-right text-[9px]" />
            </span>
          </div>
        </div>
      </div>

      {/* ── EXECUTIVE RUNWAY & FINANCIAL HEALTH INTELLIGENCE STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-card border border-border/70 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm shrink-0 border border-emerald-500/20">
            <i className="fa-solid fa-hourglass-half" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Operational Runway</p>
            <p className="text-sm font-black text-foreground font-mono">
              {runwayMonths} Months <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 font-sans font-semibold">Reserves Safe</span>
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border/70 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm shrink-0 border border-amber-500/20">
            <i className="fa-solid fa-fire-flame-curved" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Est. Monthly Burn Rate</p>
            <p className="text-sm font-black text-foreground font-mono">
              ${fmt(monthlyBurn)} <span className="text-[10px] font-normal text-muted-foreground font-sans">/ month avg</span>
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-card border border-border/70 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm shrink-0 border border-blue-500/20">
            <i className="fa-solid fa-bolt" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg Collection DSO</p>
            <p className="text-sm font-black text-foreground font-mono">
              {invoiceMetrics.avgCollectionDays} Days <span className="text-[10px] font-normal text-blue-600 dark:text-blue-400 font-sans font-semibold">Fast Turnaround</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── LIVE CASH FLOW & RUNWAY ANALYTICS (SVG CHART WITH VIEW TOGGLE) ── */}
      <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                <i className="fa-solid fa-chart-column text-primary" />
                <span>6-Month External Cash Flow &amp; Margin Dynamics</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  Realized Trend
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Monthly comparison between realized client revenues and outbound approved disbursements.
              </CardDescription>
            </div>

            <div className="flex items-center gap-4">
              {/* Toggle Chart View */}
              <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setChartMode("bar")}
                  className={cn(
                    "px-2 py-0.8 rounded-md transition-all cursor-pointer flex items-center gap-1",
                    chartMode === "bar"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <i className="fa-solid fa-chart-simple text-[10px]" /> Dual Bars
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode("net")}
                  className={cn(
                    "px-2 py-0.8 rounded-md transition-all cursor-pointer flex items-center gap-1",
                    chartMode === "net"
                      ? "bg-background text-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <i className="fa-solid fa-chart-area text-[10px]" /> Net Margin
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Paid Inflow</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Approved Outflow</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          <div className="h-56 w-full">
            <svg viewBox="0 0 700 190" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="netGainGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.33, 0.66, 1].map((ratio, idx) => {
                const y = 145 - ratio * 125;
                const labelVal = Math.round(maxMonthlyVal * ratio);
                return (
                  <g key={idx}>
                    <line x1="45" y1={y} x2="690" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-border/40" />
                    <text x="40" y={y + 3} textAnchor="end" className="text-[9px] fill-muted-foreground font-mono">
                      ${fmt(labelVal)}
                    </text>
                  </g>
                );
              })}

              {/* ── VIEW 1: DUAL BAR CHART ── */}
              {chartMode === "bar" &&
                monthlyTrendData.map((m, i) => {
                  const groupX = 80 + i * 105;
                  const revHeight = Math.max(2, (m.revenue / maxMonthlyVal) * 125);
                  const expHeight = Math.max(2, (m.expenses / maxMonthlyVal) * 125);
                  const isHovered = hoveredMonthIdx === i;

                  return (
                    <g
                      key={m.key}
                      onMouseEnter={() => setHoveredMonthIdx(i)}
                      onMouseLeave={() => setHoveredMonthIdx(null)}
                      className="cursor-pointer"
                    >
                      {/* Background hover highlight */}
                      {isHovered && (
                        <rect
                          x={groupX - 15}
                          y="10"
                          width="70"
                          height="145"
                          rx="8"
                          className="fill-muted/40"
                        />
                      )}

                      {/* Revenue Bar */}
                      <rect
                        x={groupX - 5}
                        y={145 - revHeight}
                        width="20"
                        height={revHeight}
                        rx="4"
                        className="fill-emerald-500 hover:fill-emerald-400 transition-colors"
                      />

                      {/* Expense Bar */}
                      <rect
                        x={groupX + 20}
                        y={145 - expHeight}
                        width="20"
                        height={expHeight}
                        rx="4"
                        className="fill-amber-500 hover:fill-amber-400 transition-colors"
                      />

                      {/* Month Label */}
                      <text
                        x={groupX + 17}
                        y="166"
                        textAnchor="middle"
                        className={cn(
                          "text-[10px] font-mono transition-colors",
                          isHovered ? "fill-foreground font-bold" : "fill-muted-foreground"
                        )}
                      >
                        {m.label}
                      </text>

                      {/* Floating Tooltip */}
                      {isHovered && (
                        <g>
                          <rect
                            x={groupX - 35}
                            y={Math.min(145 - Math.max(revHeight, expHeight) - 40, 95)}
                            width="110"
                            height="34"
                            rx="6"
                            className="fill-slate-900 dark:fill-slate-800 shadow-md"
                          />
                          <text
                            x={groupX + 20}
                            y={Math.min(145 - Math.max(revHeight, expHeight) - 25, 110)}
                            textAnchor="middle"
                            className="text-[9px] font-mono font-bold fill-white"
                          >
                            +{fmt(m.revenue)} | -{fmt(m.expenses)}
                          </text>
                          <text
                            x={groupX + 20}
                            y={Math.min(145 - Math.max(revHeight, expHeight) - 13, 122)}
                            textAnchor="middle"
                            className={cn(
                              "text-[8px] font-mono font-black",
                              m.net >= 0 ? "fill-emerald-400" : "fill-rose-400"
                            )}
                          >
                            Net: ${fmt(m.net)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

              {/* ── VIEW 2: NET MARGIN AREA / SPLINE ── */}
              {chartMode === "net" && (
                <g>
                  {/* Draw polygon for area */}
                  {(() => {
                    const points = monthlyTrendData.map((m, i) => {
                      const x = 97 + i * 105;
                      const y = 145 - Math.max(0, (m.net / maxMonthlyVal) * 125);
                      return `${x},${y}`;
                    });
                    const areaPoints = `97,145 ${points.join(" ")} ${97 + 5 * 105},145`;
                    return (
                      <>
                        <polygon points={areaPoints} fill="url(#netGainGradient)" />
                        <polyline
                          points={points.join(" ")}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    );
                  })()}

                  {monthlyTrendData.map((m, i) => {
                    const cx = 97 + i * 105;
                    const cy = 145 - Math.max(0, (m.net / maxMonthlyVal) * 125);
                    const isHovered = hoveredMonthIdx === i;

                    return (
                      <g
                        key={m.key}
                        onMouseEnter={() => setHoveredMonthIdx(i)}
                        onMouseLeave={() => setHoveredMonthIdx(null)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 6 : 4}
                          className="fill-emerald-500 stroke-background stroke-2 transition-all"
                        />
                        <text
                          x={cx}
                          y="166"
                          textAnchor="middle"
                          className={cn(
                            "text-[10px] font-mono transition-colors",
                            isHovered ? "fill-foreground font-bold" : "fill-muted-foreground"
                          )}
                        >
                          {m.label}
                        </text>
                        {isHovered && (
                          <g>
                            <rect
                              x={cx - 45}
                              y={Math.max(15, cy - 36)}
                              width="90"
                              height="26"
                              rx="5"
                              className="fill-slate-900 dark:fill-slate-800 shadow-md"
                            />
                            <text
                              x={cx}
                              y={Math.max(15, cy - 36) + 17}
                              textAnchor="middle"
                              className="text-[9px] font-mono font-bold fill-white"
                            >
                              Net: ${fmt(m.net)}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 1: INVOICES COMMAND DECK ── */}
      <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                <i className="fa-solid fa-file-invoice text-blue-500" />
                <span>External Client Invoices &amp; Receivables</span>
                <Badge variant="soft" color="primary" className="text-[10px] font-mono px-2 py-0.5 font-bold">
                  {filteredInvoices.length} of {invoices.length}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Active customer contracts, receivables tracking, live sorting, and 1-click status settlement.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort Dropdown */}
              <select
                value={invoiceSort}
                onChange={(e) => setInvoiceSort(e.target.value as any)}
                className="h-8 rounded-lg border border-border/80 bg-background text-xs px-2.5 text-foreground font-semibold cursor-pointer focus:ring-1 focus:ring-primary"
              >
                <option value="newest">Sort: Newest Issued</option>
                <option value="highest">Sort: Highest Amount</option>
                <option value="dueSoon">Sort: Due Date</option>
              </select>

              {/* High Value Toggle */}
              <button
                type="button"
                onClick={() => setHighValueOnly(!highValueOnly)}
                className={cn(
                  "h-8 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                  highValueOnly
                    ? "bg-blue-500 text-white border-blue-600 shadow-2xs"
                    : "bg-background text-muted-foreground border-border/80 hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-gem text-[10px]" />
                <span>&gt; $5,000</span>
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab("invoices")}
                className="h-8 text-xs font-bold text-blue-600 dark:text-blue-400 gap-1.5 cursor-pointer hover:bg-blue-500/10"
              >
                <span>View Full Registry</span>
                <i className="fa-solid fa-arrow-right text-[10px]" />
              </Button>
            </div>
          </div>

          {/* Collection Status Pill Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
            <div
              onClick={() => setInvoiceStatusFilter("Paid")}
              className={cn(
                "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                invoiceStatusFilter === "Paid"
                  ? "bg-emerald-500/15 border-emerald-500/40 ring-1 ring-emerald-500/30"
                  : "bg-background/80 border-border/60 hover:border-emerald-500/30"
              )}
            >
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Paid Revenue</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">${fmt(invoiceMetrics.paidAmount)}</p>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{invoiceMetrics.paidCount} inv</span>
            </div>

            <div
              onClick={() => setInvoiceStatusFilter("Pending")}
              className={cn(
                "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                invoiceStatusFilter === "Pending"
                  ? "bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/30"
                  : "bg-background/80 border-border/60 hover:border-amber-500/30"
              )}
            >
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Pending Payment</p>
                <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">${fmt(invoiceMetrics.pendingAmount)}</p>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{invoiceMetrics.pendingCount} inv</span>
            </div>

            <div
              onClick={() => setInvoiceStatusFilter("Overdue")}
              className={cn(
                "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                invoiceStatusFilter === "Overdue"
                  ? "bg-rose-500/15 border-rose-500/40 ring-1 ring-rose-500/30"
                  : "bg-background/80 border-border/60 hover:border-rose-500/30"
              )}
            >
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Overdue Receivables</p>
                <p className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">${fmt(invoiceMetrics.overdueAmount)}</p>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{invoiceMetrics.overdueCount} inv</span>
            </div>

            <div
              onClick={() => setInvoiceStatusFilter("Draft")}
              className={cn(
                "p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                invoiceStatusFilter === "Draft"
                  ? "bg-slate-500/15 border-slate-500/40 ring-1 ring-slate-500/30"
                  : "bg-background/80 border-border/60 hover:border-slate-500/30"
              )}
            >
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Drafts &amp; Quotes</p>
                <p className="text-sm font-black text-slate-600 dark:text-slate-400 font-mono">${fmt(invoiceMetrics.draftAmount)}</p>
              </div>
              <span className="text-xs font-mono font-bold text-muted-foreground">{invoiceMetrics.draftCount} inv</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Search and Filters */}
          <div className="p-3 border-b border-border/40 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              <Input
                placeholder="Search by client name, invoice number, or category..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["All", "Paid", "Pending", "Overdue", "Draft"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setInvoiceStatusFilter(status)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap",
                    invoiceStatusFilter === status
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b border-border/50">
                <tr>
                  <th className="text-left py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Invoice #</th>
                  <th className="text-left py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Client &amp; Venture</th>
                  <th className="text-left py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-left py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Dates</th>
                  <th className="text-right py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                  <th className="text-center py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredInvoices.slice(0, 8).map((inv, idx) => (
                  <tr key={inv._id || idx} className="hover:bg-muted/20 transition-colors group">
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      <button
                        type="button"
                        onClick={() => setPreviewingInvoice(inv)}
                        className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer text-left"
                      >
                        <i className="fa-solid fa-file-invoice text-muted-foreground group-hover:text-primary transition-colors text-[11px]" />
                        <span>{inv.invoiceNo}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-foreground">{inv.client}</p>
                      <p className="text-[10px] text-muted-foreground font-medium">{inv.venture || "Ace Consultancys"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-muted/50 text-foreground px-2 py-0.5 rounded-md text-[10px] font-semibold border border-border/50">
                        {inv.category || "Services"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-muted-foreground font-mono">
                      <div>Issued: {inv.issuedDate}</div>
                      {inv.dueDate && <div className="text-[10px]">Due: {inv.dueDate}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-sm text-foreground">
                      ${fmt(inv.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", invoiceStatusStyle[inv.status] || invoiceStatusStyle.Draft)}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status !== "Paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSettlingInvoice(inv)}
                            disabled={updatingInvoiceId === inv._id}
                            className="h-7 px-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                            title="Settle & Mark Paid"
                          >
                            <i className="fa-solid fa-check text-[9px] mr-1" /> Settle
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewingInvoice(inv)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Quick Snapshot"
                        >
                          <i className="fa-solid fa-eye text-xs" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyInvoiceSummary(inv)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Copy Invoice Summary"
                        >
                          <i className="fa-solid fa-copy text-xs" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditInvoice(inv)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                          title="View / Edit Invoice"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <i className="fa-solid fa-folder-open text-2xl mb-2 block opacity-30" />
                      <p className="text-xs font-semibold">No external invoices match your search or filter.</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onNewInvoice}
                        className="text-xs text-primary hover:text-primary hover:bg-primary/10 font-bold mt-1 cursor-pointer"
                      >
                        Create your first external client invoice &rarr;
                      </Button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION 2 & 3: EXPENSES & BUDGET (2-COLUMN GRID) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── EXPENSES COMMAND DECK ── */}
        <Card className="rounded-2xl border-border/80 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-receipt text-amber-500" />
                    <span>External Vendor Expenses</span>
                    <Badge variant="soft" color="warning" className="text-[10px] font-mono px-2 py-0.5 font-bold">
                      {filteredExpenses.length} logged
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Cloud infrastructure, SaaS tools, marketing and contractor payouts.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab("expenses")}
                  className="h-8 text-xs font-bold text-amber-600 dark:text-amber-400 gap-1.5 cursor-pointer hover:bg-amber-500/10"
                >
                  <span>All Expenses</span>
                  <i className="fa-solid fa-arrow-right text-[10px]" />
                </Button>
              </div>

              {/* Expense Category Distribution Bars (Click to Filter) */}
              <div className="pt-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                  <span>Top Spend Categories</span>
                  {expenseCatFilter !== "All" && (
                    <button
                      type="button"
                      onClick={() => setExpenseCatFilter("All")}
                      className="text-primary hover:underline cursor-pointer lowercase"
                    >
                      clear filter
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {expenseMetrics.categories.slice(0, 4).map((cat, i) => (
                    <div
                      key={cat.name}
                      onClick={() => setExpenseCatFilter(expenseCatFilter === cat.name ? "All" : cat.name)}
                      className={cn(
                        "p-2 rounded-lg border text-xs cursor-pointer transition-all",
                        expenseCatFilter === cat.name
                          ? "bg-amber-500/15 border-amber-500/40 ring-1 ring-amber-500/30"
                          : "bg-background/80 border-border/60 hover:border-amber-500/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1 font-semibold">
                        <span className="truncate text-foreground text-[11px]">{cat.name}</span>
                        <span className="font-mono font-bold text-muted-foreground text-[10px]">${fmt(cat.val)}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", i === 0 ? "bg-amber-500" : i === 1 ? "bg-blue-500" : i === 2 ? "bg-purple-500" : "bg-emerald-500")}
                          style={{ width: `${cat.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>

            {/* Expenses Mini-Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Expense Item</th>
                    <th className="text-left py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Category</th>
                    <th className="text-right py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="text-center py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right py-2.5 px-4 font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredExpenses.slice(0, 5).map((exp, idx) => (
                    <tr key={exp._id || idx} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4">
                        <p className="font-bold text-foreground truncate max-w-[150px]">{exp.title}</p>
                        <p className="text-[10px] text-muted-foreground">{exp.date} • {exp.department}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                        ${fmt(exp.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", expenseStatusStyle[exp.status] || expenseStatusStyle.Pending)}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {exp.status === "Pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickApproveExpense(exp)}
                              disabled={updatingExpenseId === exp._id}
                              className="h-6.5 px-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                              title="Approve Expense"
                            >
                              {updatingExpenseId === exp._id ? (
                                <i className="fa-solid fa-spinner animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditExpense(exp)}
                            className="h-6.5 w-6.5 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit Expense"
                          >
                            <i className="fa-solid fa-pen-to-square text-xs" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        <i className="fa-solid fa-receipt text-xl mb-1 block opacity-30" />
                        <p className="text-xs font-semibold">No vendor expenses match active filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 border-t border-border/40 bg-muted/10 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground font-medium">
              Approved: <strong className="text-foreground">${fmt(expenseMetrics.approvedAmount)}</strong>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onNewExpense}
              className="h-7 text-xs font-bold gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-[10px]" /> Add Expense
            </Button>
          </div>
        </Card>

        {/* ── BUDGET COMMAND DECK ── */}
        <Card className="rounded-2xl border-border/80 shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="p-5 border-b border-border/60 bg-muted/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-wallet text-purple-500" />
                    <span>External Project &amp; Vendor Budgets</span>
                    <Badge variant="soft" color="secondary" className="text-[10px] font-mono px-2 py-0.5 font-bold">
                      {budgetData.length} active
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
                    Target allocations vs actual expenditure across external operational branches.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab("budget")}
                  className="h-8 text-xs font-bold text-purple-600 dark:text-purple-400 gap-1.5 cursor-pointer hover:bg-purple-500/10"
                >
                  <span>Full Budget View</span>
                  <i className="fa-solid fa-arrow-right text-[10px]" />
                </Button>
              </div>

              {/* Budget Total Summary Pill */}
              <div className="grid grid-cols-3 gap-2 pt-3">
                <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Budgeted</p>
                  <p className="text-sm font-black text-foreground font-mono">${fmt(budgetMetrics.totalBudget)}</p>
                </div>
                <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Utilized</p>
                  <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">${fmt(budgetMetrics.totalSpent)}</p>
                </div>
                <div className="bg-background/80 p-2.5 rounded-xl border border-border/60">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Remaining</p>
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">${fmt(budgetMetrics.remaining)}</p>
                </div>
              </div>
            </CardHeader>

            {/* Department Utilization Bars */}
            <CardContent className="p-5 space-y-4">
              {budgetData.map((item) => {
                const pct = Math.min(100, Math.round(((Number(item.spent) || 0) / (Number(item.budget) || 1)) * 100));
                const isOver = item.spent > item.budget;
                const isNear = pct >= 80 && !isOver;

                return (
                  <div key={item.dept} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5 truncate max-w-[200px]">
                        <i className="fa-solid fa-folder-tree text-[10px] text-muted-foreground" />
                        {item.dept}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-muted-foreground">
                          ${fmt(item.spent)} / <strong className="text-foreground">${fmt(item.budget)}</strong>
                        </span>
                        <span
                          className={cn(
                            "font-bold text-[10px] px-1.5 py-0.2 rounded-md",
                            isOver
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : isNear
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}
                        >
                          {pct}%
                        </span>
                      </div>
                    </div>

                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isOver ? "bg-rose-500" : isNear ? "bg-amber-500" : item.color || "bg-primary"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {budgetData.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <i className="fa-solid fa-wallet text-2xl mb-2 block opacity-30" />
                  <p className="text-xs font-semibold">No external budget allocations defined.</p>
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-3 border-t border-border/40 bg-muted/10 flex items-center justify-between text-xs">
            <span className="text-muted-foreground text-[11px]">
              {budgetMetrics.overBudgetCount > 0 ? (
                <span className="text-rose-500 font-bold flex items-center gap-1">
                  <i className="fa-solid fa-triangle-exclamation" /> {budgetMetrics.overBudgetCount} item(s) exceeding budget
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <i className="fa-solid fa-circle-check" /> All allocations within safe threshold
                </span>
              )}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigateTab("budget")}
              className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 p-1.5 h-auto cursor-pointer"
            >
              Adjust Allocations &rarr;
            </Button>
          </div>
        </Card>
      </div>

      {/* ── SETTLEMENT DIALOG MODAL (AUDIT-READY PAYMENT LOGGER) ── */}
      {settlingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-file-invoice-dollar text-emerald-500" />
                  <span>Settle Client Invoice</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {settlingInvoice.invoiceNo} • {settlingInvoice.client}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettlingInvoice(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement} className="p-5 space-y-4">
              <div className="bg-muted/30 p-3.5 rounded-xl border border-border/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Receivable</p>
                  <p className="text-xl font-black font-mono text-foreground">${fmt(settlingInvoice.amount)}</p>
                </div>
                <Badge variant="soft" color="primary" className="text-xs font-mono font-bold">
                  {settlingInvoice.currency || "USD"}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background text-xs px-3 text-foreground font-semibold focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT / IMPS / ACH)</option>
                  <option value="Wire Transfer">International Wire (SWIFT)</option>
                  <option value="UPI / Online">UPI / Instant Online</option>
                  <option value="Credit Card">Corporate Credit Card</option>
                  <option value="Cash / Check">Cash / Cheque</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Transaction Reference / UTR #</label>
                <Input
                  placeholder="e.g. TXN-948291, UTR-491029..."
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Settlement Date</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSettlingInvoice(null)}
                  className="h-8.5 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updatingInvoiceId === settlingInvoice._id}
                  className="h-8.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
                >
                  {updatingInvoiceId === settlingInvoice._id ? (
                    <i className="fa-solid fa-spinner animate-spin" />
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs" /> Confirm Settlement
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK SNAPSHOT INVOICE PREVIEW MODAL ── */}
      {previewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm border border-blue-500/20">
                  <i className="fa-solid fa-file-invoice" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                    <span>{previewingInvoice.invoiceNo}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", invoiceStatusStyle[previewingInvoice.status])}>
                      {previewingInvoice.status}
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">
                    {previewingInvoice.client} • {previewingInvoice.venture || "Ace Consultancys"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewingInvoice(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/30 p-3.5 rounded-xl border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Issue Date</span>
                  <span className="font-mono font-semibold text-foreground">{previewingInvoice.issuedDate}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Due Date</span>
                  <span className="font-mono font-semibold text-foreground">{previewingInvoice.dueDate || "Due Upon Receipt"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Category</span>
                  <span className="font-semibold text-foreground">{previewingInvoice.category || "Services"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Invoiced Amount</span>
                  <span className="font-mono font-black text-base text-foreground">${fmt(previewingInvoice.amount)} {previewingInvoice.currency || "USD"}</span>
                </div>
              </div>

              {previewingInvoice.notes && (
                <div className="bg-muted/20 p-3 rounded-xl border border-border/40 text-xs">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Invoice Remarks &amp; Settlement Log</span>
                  <p className="text-muted-foreground italic font-sans">{previewingInvoice.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyInvoiceSummary(previewingInvoice)}
                className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <i className="fa-solid fa-copy text-xs" /> Copy Summary
              </Button>
              <div className="flex items-center gap-2">
                {previewingInvoice.status !== "Paid" && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const inv = previewingInvoice;
                      setPreviewingInvoice(null);
                      setSettlingInvoice(inv);
                    }}
                    className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
                  >
                    <i className="fa-solid fa-check text-xs" /> Settle &amp; Mark Paid
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const inv = previewingInvoice;
                    setPreviewingInvoice(null);
                    onEditInvoice(inv);
                  }}
                  className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-pen-to-square text-xs" /> Edit in Registry
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
