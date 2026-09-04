"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SalesWorkdeskDashboard } from "@/components/operations/SalesWorkdeskDashboard";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";
import { AdminInvoicesTab } from "@/components/settings/AdminInvoicesTab";
import { ExternalFinanceOverview } from "./ExternalFinanceOverview";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FinanceInvoice {
  _id: string;
  invoiceNo: string;
  client: string;
  amount: number;
  currency: string;
  status: "Draft" | "Pending" | "Paid" | "Overdue" | "Cancelled";
  issuedDate: string;
  dueDate: string;
  category: string;
  venture: string;
  notes?: string;
  lineItems?: Array<{ description: string; quantity: number; unitPrice: number; amount: number }>;
  createdAt?: string;
}

export interface FinanceExpense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string;
  department: string;
  venture: string;
  status: "Approved" | "Pending" | "Rejected";
  notes?: string;
  createdAt?: string;
}

interface FinancePortalDashboardProps {
  invoices: FinanceInvoice[];
  expenses: FinanceExpense[];
  deals: SalesDeal[];
  loadingInvoices?: boolean;
  loadingExpenses?: boolean;
  loadingDeals?: boolean;
  showToast: (message: string, type?: "success" | "error") => void;
  onNewInvoice: () => void;
  onEditInvoice: (inv: FinanceInvoice) => void;
  onDeleteInvoice: (id: string, name: string) => void;
  onNewExpense: () => void;
  onEditExpense: (exp: FinanceExpense) => void;
  onDeleteExpense: (id: string, name: string) => void;
  onNewDeal: () => void;
  onEditDeal: (deal: SalesDeal) => void;
  onDeleteDeal: (id: string, name: string) => void;
  onRefresh?: () => void;
}

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = (val: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
const fmtDec = (val: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

// ─── Status Styles ───────────────────────────────────────────────────────────

const invoiceStatusStyle: Record<string, string> = {
  Paid:      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Pending:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Overdue:   "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  Draft:     "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  Cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const expenseStatusStyle: Record<string, string> = {
  Approved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Pending:  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

const payrollStatusStyle: Record<string, string> = {
  Paid:       "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Processing: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Pending:    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancePortalDashboard({
  invoices,
  expenses,
  deals,
  loadingInvoices = false,
  loadingExpenses = false,
  loadingDeals = false,
  showToast,
  onNewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onNewExpense,
  onEditExpense,
  onDeleteExpense,
  onNewDeal,
  onEditDeal,
  onDeleteDeal,
  onRefresh,
}: FinancePortalDashboardProps) {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"overview" | "invoices" | "expenses" | "budget" | "payroll">(
    urlTab === "invoices" || urlTab === "expenses" || urlTab === "budget" || urlTab === "payroll" ? urlTab : "overview"
  );

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "invoices", "expenses", "budget", "payroll"].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const [financeScope, setFinanceScope] = useState<"internal" | "external">("internal");
  const [externalDeals, setExternalDeals] = useState<SalesDeal[]>([]);
  const [externalPayroll, setExternalPayroll] = useState<Array<{ period: string; total: number; headcount: number; status: string; date: string }>>([]);

  const isExternalInvoice = (inv: FinanceInvoice) => {
    const cat = (inv.category || "").toLowerCase();
    const notes = (inv.notes || "").toLowerCase();
    const invNo = (inv.invoiceNo || "").toUpperCase();
    return cat.includes("client") || cat.includes("service") || cat.includes("external") || notes.includes("proposal") || invNo.startsWith("EXT-") || (!cat.includes("employee") && !cat.includes("payroll"));
  };

  const internalInvoices = useMemo(() => invoices.filter((inv) => !isExternalInvoice(inv)), [invoices]);
  const externalInvoices = useMemo(() => invoices.filter((inv) => isExternalInvoice(inv)), [invoices]);

  const isExternalExpense = (exp: FinanceExpense) => {
    const cat = (exp.category || "").toLowerCase();
    if (cat.includes("payroll") || cat.includes("internal salary") || cat.includes("employee reimbursement")) {
      return false;
    }
    return true;
  };

  const internalExpenses = useMemo(() => expenses.filter((e) => !isExternalExpense(e)), [expenses]);
  const externalExpensesList = useMemo(() => expenses.filter((e) => isExternalExpense(e)), [expenses]);
  const activeExpenses = financeScope === "internal" ? expenses : (externalExpensesList.length > 0 ? externalExpensesList : expenses);

  const activeInvoices = financeScope === "internal" ? internalInvoices : externalInvoices;
  const activeDeals = financeScope === "internal" ? deals : externalDeals;

  const activeBudgetData = useMemo(() => {
    const palette = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500"];
    
    if (financeScope === "internal") {
      const depts: Record<string, number> = {};
      activeExpenses.forEach((e) => {
        const deptName = e.department?.trim() || "General";
        depts[deptName] = (depts[deptName] || 0) + (e.status === "Approved" ? Number(e.amount) || 0 : 0);
      });

      const deptNames = Array.from(new Set([
        "Engineering", "Marketing", "HR & People", "IT & Infra", "Operations", "Legal",
        ...Object.keys(depts),
      ]));

      return deptNames.map((dept, i) => {
        const spent = depts[dept] || 0;
        const budget = spent > 0 ? Math.max(Math.ceil((spent * 1.35) / 5000) * 5000, 20000) : 25000;
        return {
          dept,
          budget,
          spent,
          color: palette[i % palette.length],
        };
      });
    }

    // External Scope: Aggregate real external expenses by category
    const cats: Record<string, number> = {};
    activeExpenses.forEach((e) => {
      const catName = e.category?.trim() || "Operations";
      cats[catName] = (cats[catName] || 0) + (e.status === "Approved" ? Number(e.amount) || 0 : 0);
    });

    const externalCategoryNames = Array.from(new Set([
      "Technology", "Marketing", "Facilities", "HR & Training", "IT", "Operations",
      ...Object.keys(cats),
    ]));

    return externalCategoryNames.map((cat, i) => {
      const spent = cats[cat] || 0;
      const budget = spent > 0 ? Math.max(Math.ceil((spent * 1.3) / 5000) * 5000, 15000) : 20000;
      return {
        dept: cat,
        budget,
        spent,
        color: palette[i % palette.length],
      };
    });
  }, [financeScope, activeExpenses]);

  const activePayrollData = useMemo(() => {
    if (financeScope === "external") {
      const contractorExpenses = activeExpenses.filter(e =>
        (e.category || "").toLowerCase().includes("contractor") ||
        (e.department || "").toLowerCase().includes("contractor")
      );
      if (contractorExpenses.length === 0) return [];
      const groups: Record<string, { total: number; count: number; date: string; status: string }> = {};
      contractorExpenses.forEach((exp) => {
        const date = new Date(exp.date || Date.now());
        const period = !isNaN(date.getTime())
          ? date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : "Current Period";
        if (!groups[period]) {
          groups[period] = { total: 0, count: 0, date: exp.date, status: exp.status === "Approved" ? "Paid" : "Pending" };
        }
        groups[period].total += Number(exp.amount) || 0;
        groups[period].count += 1;
      });
      return Object.entries(groups).map(([period, data]) => ({
        period,
        total: data.total,
        headcount: data.count,
        status: data.status,
        date: data.date,
      }));
    }

    // Internal Scope: group real employee invoices from MongoDB by billing period
    const empInvoices = internalInvoices;
    if (empInvoices.length === 0) return [];

    const groups: Record<string, { total: number; count: number; date: string; paidCount: number }> = {};
    empInvoices.forEach((inv) => {
      const dateStr = inv.issuedDate || (inv.createdAt ? new Date(inv.createdAt).toISOString().split("T")[0] : "");
      const dateObj = dateStr ? new Date(dateStr) : new Date();
      const period = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : "Current Period";

      if (!groups[period]) {
        groups[period] = { total: 0, count: 0, date: dateStr || new Date().toISOString().split("T")[0], paidCount: 0 };
      }
      groups[period].total += Number(inv.amount) || 0;
      groups[period].count += 1;
      if (inv.status === "Paid") groups[period].paidCount += 1;
    });

    return Object.entries(groups).map(([period, data]) => ({
      period,
      total: data.total,
      headcount: data.count,
      status: data.paidCount === data.count ? "Paid" : data.paidCount > 0 ? "Processing" : "Pending",
      date: data.date,
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [financeScope, internalInvoices, activeExpenses]);

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("All");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCatFilter, setExpenseCatFilter] = useState("All");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("All");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // ── KPI Calculations ──
  const kpis = useMemo(() => {
    const totalRevenue = activeInvoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
    const outstanding = activeInvoices.filter(i => i.status === "Pending" || i.status === "Overdue").reduce((s, i) => s + i.amount, 0);
    const overdue = activeInvoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);
    const totalExpenses = activeExpenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
    const paidCount = activeInvoices.filter(i => i.status === "Paid").length;
    const pendingCount = activeInvoices.filter(i => i.status === "Pending").length;
    const overdueCount = activeInvoices.filter(i => i.status === "Overdue").length;
    return { totalRevenue, outstanding, overdue, totalExpenses, netProfit, profitMargin, paidCount, pendingCount, overdueCount };
  }, [activeInvoices, activeExpenses]);

  // ── Expense Categories ──
  const expenseCategories = useMemo(() => {
    const cats: Record<string, number> = {};
    activeExpenses.filter(e => e.status === "Approved").forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + e.amount;
    });
    const total = Object.values(cats).reduce((s, v) => s + v, 0) || 1;
    const palette = ["#6366f1","#10b981","#f59e0b","#f43f5e","#06b6d4","#8b5cf6","#ec4899","#14b8a6"];
    return Object.entries(cats).map(([name, val], i) => ({
      name, val, pct: Math.round((val / total) * 100), color: palette[i % palette.length],
    })).sort((a, b) => b.val - a.val);
  }, [activeExpenses]);


  // ── Filtered Lists ──
  const filteredInvoices = useMemo(() =>
    activeInvoices.filter(inv => {
      const q = invoiceSearch.toLowerCase();
      const matchSearch = !q || inv.client.toLowerCase().includes(q) || inv.invoiceNo.toLowerCase().includes(q) || inv.category.toLowerCase().includes(q);
      const matchStatus = invoiceStatusFilter === "All" || inv.status === invoiceStatusFilter;
      return matchSearch && matchStatus;
    }), [activeInvoices, invoiceSearch, invoiceStatusFilter]);

  const filteredExpenses = useMemo(() =>
    activeExpenses.filter(exp => {
      const q = expenseSearch.toLowerCase();
      const matchSearch = !q || exp.title.toLowerCase().includes(q) || exp.category.toLowerCase().includes(q) || exp.department.toLowerCase().includes(q);
      const matchCat = expenseCatFilter === "All" || exp.category === expenseCatFilter;
      const matchStatus = expenseStatusFilter === "All" || exp.status === expenseStatusFilter;
      return matchSearch && matchCat && matchStatus;
    }), [activeExpenses, expenseSearch, expenseCatFilter, expenseStatusFilter]);

  const expenseCatOptions = useMemo(() => ["All", ...Array.from(new Set(activeExpenses.map(e => e.category)))], [activeExpenses]);

  const tabs = useMemo(() => [
    {
      key: "overview" as const,
      label: "Overview",
      icon: financeScope === "external" ? "fa-chart-pie" : "fa-handshake",
      count: financeScope === "external" ? externalInvoices.length : activeDeals.length,
    },
    { key: "invoices" as const,  label: "Invoices",   icon: "fa-file-invoice-dollar", count: activeInvoices.length },
    { key: "expenses" as const,  label: "Expenses",   icon: "fa-receipt", count: activeExpenses.length },
    { key: "budget" as const,    label: "Budget",     icon: "fa-wallet" },
    { key: "payroll" as const,   label: "Payroll",    icon: "fa-money-check-dollar" },
  ], [financeScope, externalInvoices.length, activeDeals.length, activeInvoices.length, activeExpenses.length]);

  return (
    <div className="space-y-6">
      {/* ── Top Scope Switcher: Internal vs External Finance ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 bg-muted/40 dark:bg-slate-900/50 rounded-2xl border border-border/80">
        <div className="flex items-center gap-1.5 p-1 bg-background/90 dark:bg-slate-950/90 rounded-xl border border-border/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setFinanceScope("internal")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer",
              financeScope === "internal"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <i className="fa-solid fa-building text-xs" />
            Internal Finance
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
              financeScope === "internal" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {internalInvoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFinanceScope("external")}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer",
              financeScope === "external"
                ? "bg-primary text-primary-foreground shadow-xs font-black"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <i className="fa-solid fa-globe text-xs" />
            External Finance
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
              financeScope === "external" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
            )}>
              {externalInvoices.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-muted-foreground px-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Viewing <strong className="text-foreground font-semibold">{financeScope === "internal" ? "Internal Corporate Financials" : "External & Vendor Accounts"}</strong>
          </span>
        </div>
      </div>

      {/* ── Sub-Navigation ── */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap",
              activeTab === tab.key
                ? "border-primary text-primary bg-primary/10 rounded-t-md font-bold -mb-px"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <i className={`fa-solid ${tab.icon} text-sm`} />
            {tab.label}
            {"count" in tab && (
              <Badge variant="soft" color="primary" className="ml-1 text-[10px] px-1.5 py-0">
                {tab.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* ── INVOICES TAB (Master Invoices) ── */}
      {activeTab === "invoices" && (
        <AdminInvoicesTab showToast={showToast} scope={financeScope} />
      )}

      {/* ── EXPENSES TAB ── */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Approved",  val: activeExpenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.amount, 0), color: "text-foreground", bg: "bg-primary/10 text-primary", icon: "fa-circle-check" },
              { label: "Pending Approval",val: activeExpenses.filter(e => e.status === "Pending").reduce((s, e) => s + e.amount, 0),  color: "text-amber-500",  bg: "bg-amber-500/10 text-amber-500", icon: "fa-clock" },
              { label: "Rejected",         val: activeExpenses.filter(e => e.status === "Rejected").reduce((s, e) => s + e.amount, 0), color: "text-rose-500",   bg: "bg-rose-500/10 text-rose-500",  icon: "fa-xmark-circle" },
            ].map(m => (
              <Card key={m.label}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className={cn("text-xl font-bold", m.color)}>${fmt(m.val)}</p>
                  </div>
                  <div className={cn("p-3 rounded-xl", m.bg)}><i className={`fa-solid ${m.icon} text-lg`} /></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Expense Table */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                  <Input placeholder="Search expenses..." value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                </div>
                <select value={expenseCatFilter} onChange={e => setExpenseCatFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                  {expenseCatOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={expenseStatusFilter} onChange={e => setExpenseStatusFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
                  {["All", "Approved", "Pending", "Rejected"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <Button size="sm" onClick={onNewExpense} className="gap-2 font-semibold h-8 cursor-pointer">
                  <i className="fa-solid fa-plus text-xs" /> {financeScope === "external" ? "Log External Expense" : "Log Expense"}
                </Button>
              </div>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="border-b border-border">
                        {["Title", "Category", "Dept", "Amount", "Date", "Status", ""].map(h => (
                          <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((exp, i) => (
                        <tr key={exp._id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", i % 2 === 1 && "bg-muted/10")}>
                          <td className="py-3 px-3 font-semibold text-foreground max-w-[160px] truncate">{exp.title}</td>
                          <td className="py-3 px-3 text-xs text-muted-foreground">{exp.category}</td>
                          <td className="py-3 px-3 text-xs text-muted-foreground">{exp.department}</td>
                          <td className="py-3 px-3 font-bold text-foreground">${fmtDec(exp.amount)}</td>
                          <td className="py-3 px-3 text-xs text-muted-foreground">{exp.date?.split("T")[0]}</td>
                          <td className="py-3 px-3">
                            <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", expenseStatusStyle[exp.status])}>{exp.status}</span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => onEditExpense(exp)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors cursor-pointer"><i className="fa-solid fa-pen text-xs" /></button>
                              <button onClick={() => onDeleteExpense(exp._id, exp.title)} className="p-1.5 hover:bg-rose-500/10 rounded text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"><i className="fa-solid fa-trash-can text-xs" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredExpenses.length === 0 && (
                        <tr><td colSpan={7} className="py-16 text-center text-muted-foreground text-sm">
                          <i className="fa-solid fa-receipt text-3xl mb-3 block opacity-20" />
                          {financeScope === "external" ? "No external expenses recorded yet." : "No expenses found."}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-primary" /> By Category
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {expenseCategories.map(cat => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </span>
                      <span className="text-muted-foreground">${fmt(cat.val)} <span className="text-[10px]">({cat.pct}%)</span></span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                ))}
                {expenseCategories.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    {financeScope === "external" ? "No external expense categories." : "No expense data yet."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── BUDGET TAB ── */}
      {activeTab === "budget" && (
        <div className="space-y-5">
          {/* Budget KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(() => {
              const totalBudget = activeBudgetData.reduce((s, b) => s + b.budget, 0);
              const totalSpent  = activeBudgetData.reduce((s, b) => s + b.spent, 0);
              const remaining   = totalBudget - totalSpent;
              const overBudget  = activeBudgetData.filter(b => b.spent > b.budget).length;
              return [
                { label: "Total Budget",    val: `$${fmt(totalBudget)}`, sub: `${activeBudgetData.length} departments`, icon: "fa-wallet",              bg: "bg-primary/10 text-primary"    },
                { label: "Total Spent",     val: `$${fmt(totalSpent)}`,  sub: `${totalBudget > 0 ? Math.round((totalSpent/totalBudget)*100) : 0}% utilized`, icon: "fa-money-bill-wave", bg: "bg-amber-500/10 text-amber-500" },
                { label: "Remaining",       val: `$${fmt(remaining)}`,   sub: `${overBudget} dept(s) over budget`, icon: "fa-piggy-bank",         bg: overBudget > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500" },
              ];
            })().map(m => (
              <Card key={m.label}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold text-foreground">{m.val}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
                  </div>
                  <div className={cn("p-3 rounded-xl", m.bg)}><i className={`fa-solid ${m.icon} text-lg`} /></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Budget Bars */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <i className="fa-solid fa-bars-progress text-primary" /> {financeScope === "external" ? "External Project & Vendor Budgets" : "Department Budget Utilization"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-5">
              {activeBudgetData.map(dept => {
                const pct = Math.min(100, Math.round((dept.spent / dept.budget) * 100));
                const over = dept.spent > dept.budget;
                return (
                  <div key={dept.dept} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground">{dept.dept}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>Spent: <strong className={over ? "text-rose-500" : "text-foreground"}>${fmt(dept.spent)}</strong></span>
                        <span>Budget: <strong>${fmt(dept.budget)}</strong></span>
                        <span className={cn("font-bold px-1.5 py-0.5 rounded text-[11px]", over ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500")}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500", over ? "bg-rose-500" : dept.color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {over && (
                      <p className="text-[11px] text-rose-500">
                        <i className="fa-solid fa-triangle-exclamation mr-1" />
                        Over budget by ${fmt(dept.spent - dept.budget)}
                      </p>
                    )}
                  </div>
                );
              })}
              {activeBudgetData.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <i className="fa-solid fa-wallet text-3xl mb-3 block opacity-25" />
                  <p className="text-sm font-semibold">No external budget allocations recorded yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Configure external project allocations to track vendor spending against budget.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── PAYROLL TAB ── */}
      {activeTab === "payroll" && (
        <div className="space-y-5">
          {/* Payroll KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(() => {
              const lastPaid    = activePayrollData.find(p => p.status === "Paid");
              const totalYTD    = activePayrollData.filter(p => p.status === "Paid").reduce((s, p) => s + p.total, 0);
              const processing  = activePayrollData.find(p => p.status === "Processing");
              return [
                { label: "YTD Payroll",         val: `$${fmt(totalYTD)}`,             sub: `${activePayrollData.filter(p => p.status === "Paid").length} cycles paid`, icon: "fa-coins",              bg: "bg-emerald-500/10 text-emerald-500" },
                { label: "Last Disbursement",    val: lastPaid ? `$${fmt(lastPaid.total)}` : "—", sub: lastPaid?.period || "—", icon: "fa-money-check-dollar", bg: "bg-primary/10 text-primary" },
                { label: "Next Processing",      val: processing ? `$${fmt(processing.total)}` : "—", sub: processing ? `Due ${processing.date}` : "—", icon: "fa-clock",            bg: "bg-amber-500/10 text-amber-500" },
              ];
            })().map(m => (
              <Card key={m.label}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold text-foreground">{m.val}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
                  </div>
                  <div className={cn("p-3 rounded-xl", m.bg)}><i className={`fa-solid ${m.icon} text-lg`} /></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Payroll Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-table text-primary" /> {financeScope === "external" ? "External Contractor Payout History" : "Payroll History"}
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-2 h-8 font-semibold cursor-pointer">
                  <i className="fa-solid fa-download text-xs" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border">
                    {["Pay Period", "Total Payroll", "Headcount", "Disbursement Date", "Status"].map(h => (
                      <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activePayrollData.sort((a, b) => b.date.localeCompare(a.date)).map((p, i) => (
                    <tr key={p.period} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", i % 2 === 1 && "bg-muted/10")}>
                      <td className="py-3 px-3 font-semibold text-foreground">{p.period}</td>
                      <td className="py-3 px-3 font-bold text-foreground">${fmt(p.total)}</td>
                      <td className="py-3 px-3 text-muted-foreground">{p.headcount} recipients</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{p.date}</td>
                      <td className="py-3 px-3">
                        <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", payrollStatusStyle[p.status])}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                  {activePayrollData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        <i className="fa-solid fa-money-check-dollar text-3xl mb-3 block opacity-25" />
                        <p className="text-sm font-semibold">No external contractor disbursements recorded.</p>
                        <p className="text-xs text-muted-foreground mt-1">Disbursements to external agencies and freelance staff will appear here.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

        </div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        financeScope === "external" ? (
          <ExternalFinanceOverview
            invoices={externalInvoices}
            expenses={activeExpenses}
            budgetData={activeBudgetData}
            loadingInvoices={loadingInvoices}
            loadingExpenses={loadingExpenses}
            showToast={showToast}
            onNewInvoice={onNewInvoice}
            onEditInvoice={onEditInvoice}
            onNewExpense={onNewExpense}
            onEditExpense={onEditExpense}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onRefresh={onRefresh}
          />
        ) : (
          <SalesWorkdeskDashboard
            deals={activeDeals}
            loading={loadingDeals}
            onNewDeal={onNewDeal}
            onEditDeal={onEditDeal}
            onDeleteDeal={onDeleteDeal}
            onRefresh={onRefresh}
          />
        )
      )}
    </div>
  );
}
