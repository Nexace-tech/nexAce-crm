"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SalesWorkdeskDashboard } from "@/components/operations/SalesWorkdeskDashboard";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";
import { AdminInvoicesTab } from "@/components/settings/AdminInvoicesTab";

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

// ─── Budget Data (static demo) ───────────────────────────────────────────────

const BUDGET_DATA = [
  { dept: "Engineering",    budget: 85000, spent: 67200, color: "bg-blue-500" },
  { dept: "Marketing",      budget: 45000, spent: 38900, color: "bg-purple-500" },
  { dept: "HR & People",    budget: 32000, spent: 18400, color: "bg-emerald-500" },
  { dept: "IT & Infra",     budget: 28000, spent: 22100, color: "bg-amber-500" },
  { dept: "Operations",     budget: 55000, spent: 49300, color: "bg-rose-500" },
  { dept: "Legal",          budget: 18000, spent: 12700, color: "bg-cyan-500" },
];

const PAYROLL_DATA = [
  { period: "Aug 2026", total: 186400, headcount: 24, status: "Paid",       date: "2026-08-28" },
  { period: "Jul 2026", total: 184200, headcount: 24, status: "Paid",       date: "2026-07-28" },
  { period: "Jun 2026", total: 179800, headcount: 23, status: "Paid",       date: "2026-06-28" },
  { period: "May 2026", total: 176500, headcount: 23, status: "Paid",       date: "2026-05-28" },
  { period: "Sep 2026", total: 188000, headcount: 25, status: "Processing", date: "2026-09-28" },
];

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

// ─── Monthly Revenue/Expense Bar Data ────────────────────────────────────────

const MONTHLY_DATA = [
  { month: "Mar", revenue: 142000, expenses: 98000 },
  { month: "Apr", revenue: 168000, expenses: 112000 },
  { month: "May", revenue: 155000, expenses: 105000 },
  { month: "Jun", revenue: 198000, expenses: 131000 },
  { month: "Jul", revenue: 211000, expenses: 144000 },
  { month: "Aug", revenue: 243000, expenses: 152000 },
];

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
  const [activeTab, setActiveTab] = useState<"overview" | "invoices" | "expenses" | "budget" | "payroll">("overview");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("All");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCatFilter, setExpenseCatFilter] = useState("All");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("All");
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // ── KPI Calculations ──
  const kpis = useMemo(() => {
    const totalRevenue = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
    const outstanding = invoices.filter(i => i.status === "Pending" || i.status === "Overdue").reduce((s, i) => s + i.amount, 0);
    const overdue = invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
    const paidCount = invoices.filter(i => i.status === "Paid").length;
    const pendingCount = invoices.filter(i => i.status === "Pending").length;
    const overdueCount = invoices.filter(i => i.status === "Overdue").length;
    return { totalRevenue, outstanding, overdue, totalExpenses, netProfit, profitMargin, paidCount, pendingCount, overdueCount };
  }, [invoices, expenses]);

  // ── Expense Categories ──
  const expenseCategories = useMemo(() => {
    const cats: Record<string, number> = {};
    expenses.filter(e => e.status === "Approved").forEach(e => {
      cats[e.category] = (cats[e.category] || 0) + e.amount;
    });
    const total = Object.values(cats).reduce((s, v) => s + v, 0) || 1;
    const palette = ["#6366f1","#10b981","#f59e0b","#f43f5e","#06b6d4","#8b5cf6","#ec4899","#14b8a6"];
    return Object.entries(cats).map(([name, val], i) => ({
      name, val, pct: Math.round((val / total) * 100), color: palette[i % palette.length],
    })).sort((a, b) => b.val - a.val);
  }, [expenses]);

  // ── Chart max ──
  const chartMax = useMemo(() => Math.max(...MONTHLY_DATA.flatMap(d => [d.revenue, d.expenses]), 1), []);

  // ── Filtered Lists ──
  const filteredInvoices = useMemo(() =>
    invoices.filter(inv => {
      const q = invoiceSearch.toLowerCase();
      const matchSearch = !q || inv.client.toLowerCase().includes(q) || inv.invoiceNo.toLowerCase().includes(q) || inv.category.toLowerCase().includes(q);
      const matchStatus = invoiceStatusFilter === "All" || inv.status === invoiceStatusFilter;
      return matchSearch && matchStatus;
    }), [invoices, invoiceSearch, invoiceStatusFilter]);

  const filteredExpenses = useMemo(() =>
    expenses.filter(exp => {
      const q = expenseSearch.toLowerCase();
      const matchSearch = !q || exp.title.toLowerCase().includes(q) || exp.category.toLowerCase().includes(q) || exp.department.toLowerCase().includes(q);
      const matchCat = expenseCatFilter === "All" || exp.category === expenseCatFilter;
      const matchStatus = expenseStatusFilter === "All" || exp.status === expenseStatusFilter;
      return matchSearch && matchCat && matchStatus;
    }), [expenses, expenseSearch, expenseCatFilter, expenseStatusFilter]);

  const expenseCatOptions = useMemo(() => ["All", ...Array.from(new Set(expenses.map(e => e.category)))], [expenses]);

  const tabs = [
    { key: "overview",  label: "Overview",   icon: "fa-handshake", count: deals.length },
    { key: "invoices",  label: "Invoices",   icon: "fa-file-invoice-dollar", count: invoices.length },
    { key: "expenses",  label: "Expenses",   icon: "fa-receipt", count: expenses.length },
    { key: "budget",    label: "Budget",     icon: "fa-wallet" },
    { key: "payroll",   label: "Payroll",    icon: "fa-money-check-dollar" },
  ] as const;

  return (
    <div className="space-y-6">
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
        <AdminInvoicesTab showToast={showToast} />
      )}

      {/* ── EXPENSES TAB ── */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Approved",  val: expenses.filter(e => e.status === "Approved").reduce((s, e) => s + e.amount, 0), color: "text-foreground", bg: "bg-primary/10 text-primary", icon: "fa-circle-check" },
              { label: "Pending Approval",val: expenses.filter(e => e.status === "Pending").reduce((s, e) => s + e.amount, 0),  color: "text-amber-500",  bg: "bg-amber-500/10 text-amber-500", icon: "fa-clock" },
              { label: "Rejected",         val: expenses.filter(e => e.status === "Rejected").reduce((s, e) => s + e.amount, 0), color: "text-rose-500",   bg: "bg-rose-500/10 text-rose-500",  icon: "fa-xmark-circle" },
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
                  <i className="fa-solid fa-plus text-xs" /> Log Expense
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
                          <i className="fa-solid fa-receipt text-3xl mb-3 block opacity-20" />No expenses found.
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
                  <p className="text-xs text-muted-foreground text-center py-8">No expense data yet.</p>
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
              const totalBudget = BUDGET_DATA.reduce((s, b) => s + b.budget, 0);
              const totalSpent  = BUDGET_DATA.reduce((s, b) => s + b.spent, 0);
              const remaining   = totalBudget - totalSpent;
              const overBudget  = BUDGET_DATA.filter(b => b.spent > b.budget).length;
              return [
                { label: "Total Budget",    val: `$${fmt(totalBudget)}`, sub: `${BUDGET_DATA.length} departments`, icon: "fa-wallet",              bg: "bg-primary/10 text-primary"    },
                { label: "Total Spent",     val: `$${fmt(totalSpent)}`,  sub: `${Math.round((totalSpent/totalBudget)*100)}% utilized`, icon: "fa-money-bill-wave", bg: "bg-amber-500/10 text-amber-500" },
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
                <i className="fa-solid fa-bars-progress text-primary" /> Department Budget Utilization
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-5">
              {BUDGET_DATA.map(dept => {
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
              const lastPaid    = PAYROLL_DATA.find(p => p.status === "Paid");
              const totalYTD    = PAYROLL_DATA.filter(p => p.status === "Paid").reduce((s, p) => s + p.total, 0);
              const processing  = PAYROLL_DATA.find(p => p.status === "Processing");
              return [
                { label: "YTD Payroll",         val: `$${fmt(totalYTD)}`,             sub: `${PAYROLL_DATA.filter(p => p.status === "Paid").length} cycles paid`, icon: "fa-coins",              bg: "bg-emerald-500/10 text-emerald-500" },
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
                  <i className="fa-solid fa-table text-primary" /> Payroll History
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
                  {PAYROLL_DATA.sort((a, b) => b.date.localeCompare(a.date)).map((p, i) => (
                    <tr key={p.period} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", i % 2 === 1 && "bg-muted/10")}>
                      <td className="py-3 px-3 font-semibold text-foreground">{p.period}</td>
                      <td className="py-3 px-3 font-bold text-foreground">${fmt(p.total)}</td>
                      <td className="py-3 px-3 text-muted-foreground">{p.headcount} employees</td>
                      <td className="py-3 px-3 text-muted-foreground text-xs">{p.date}</td>
                      <td className="py-3 px-3">
                        <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full border", payrollStatusStyle[p.status])}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2.5">
            <i className="fa-solid fa-circle-info mt-0.5 shrink-0" />
            <span>Payroll data is currently showing demo records. Connect your payroll provider or enter actual payroll runs to reflect live data.</span>
          </div>
        </div>
      )}
      {/* ── OVERVIEW TAB (Sales Pipeline) ── */}
      {activeTab === "overview" && (
        <SalesWorkdeskDashboard
          deals={deals}
          loading={loadingDeals}
          onNewDeal={onNewDeal}
          onEditDeal={onEditDeal}
          onDeleteDeal={onDeleteDeal}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
