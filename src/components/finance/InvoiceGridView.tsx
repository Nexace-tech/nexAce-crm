"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { FinanceInvoice } from "./FinancePortalDashboard";

interface InvoiceGridViewProps {
  invoices: FinanceInvoice[];
  loading?: boolean;
  scope?: "internal" | "external";
  onNewInvoice: () => void;
  onEditInvoice: (inv: FinanceInvoice) => void;
  onDeleteInvoice: (id: string, name: string) => void;
}

const fmt = (val: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(val);
const fmtDec = (val: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

const fmtDate = (d?: string) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
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

export default function InvoiceGridView({ invoices, loading = false, scope = "internal", onNewInvoice, onEditInvoice, onDeleteInvoice }: InvoiceGridViewProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "name">("date_desc");
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const kpis = useMemo(() => {
    return {
      total: invoices.length,
      paid: invoices.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0),
      paidCount: invoices.filter(i => i.status === "Paid").length,
      pending: invoices.filter(i => i.status === "Pending").reduce((s, i) => s + i.amount, 0),
      pendingCount: invoices.filter(i => i.status === "Pending").length,
      overdue: invoices.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0),
      overdueCount: invoices.filter(i => i.status === "Overdue").length,
      draft: invoices.filter(i => i.status === "Draft").length,
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    let list = invoices.filter(inv => {
      const q = search.toLowerCase();
      const matchSearch = !q || inv.invoiceNo.toLowerCase().includes(q) || inv.client.toLowerCase().includes(q) || (inv.category || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
    return [...list].sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.issuedDate || b.createdAt || 0).getTime() - new Date(a.issuedDate || a.createdAt || 0).getTime();
      if (sortBy === "date_asc")  return new Date(a.issuedDate || a.createdAt || 0).getTime() - new Date(b.issuedDate || b.createdAt || 0).getTime();
      if (sortBy === "amount_desc") return b.amount - a.amount;
      if (sortBy === "amount_asc")  return a.amount - b.amount;
      if (sortBy === "name") return a.client.localeCompare(b.client);
      return 0;
    });
  }, [invoices, search, statusFilter, sortBy]);

  const kpiCards = [
    { label: "Total Invoices", value: kpis.total, sub: `${kpis.draft} draft`, icon: "fa-file-invoice-dollar", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20" },
    { label: "Paid Revenue",   value: `$${fmt(kpis.paid)}`,    sub: `${kpis.paidCount} invoices`,    icon: "fa-circle-check",          color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Pending",        value: `$${fmt(kpis.pending)}`, sub: `${kpis.pendingCount} invoices`, icon: "fa-clock",                 color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
    { label: "Overdue",        value: `$${fmt(kpis.overdue)}`, sub: `${kpis.overdueCount} invoices`, icon: "fa-triangle-exclamation",  color: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-500/10",    border: "border-rose-500/20" },
  ];

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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..." className="h-8 pl-8 pr-3 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
            {["All","Paid","Pending","Overdue","Draft","Cancelled"].map(s => <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-8 px-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
            <option value="name">Client Name</option>
          </select>
          <span className="text-[11px] text-muted-foreground font-medium">{filtered.length} of {invoices.length}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
            <button type="button" onClick={() => setViewMode("grid")} className={cn("w-8 h-7 rounded-md flex items-center justify-center text-xs transition-all cursor-pointer", viewMode === "grid" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")} title="Grid View"><i className="fa-solid fa-grip text-[11px]" /></button>
            <button type="button" onClick={() => setViewMode("list")} className={cn("w-8 h-7 rounded-md flex items-center justify-center text-xs transition-all cursor-pointer", viewMode === "list" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")} title="List View"><i className="fa-solid fa-list text-[11px]" /></button>
          </div>
          <button type="button" onClick={onNewInvoice} className="flex items-center gap-2 h-8 px-4 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer">
            <i className="fa-solid fa-plus text-[10px]" />New Invoice
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border/80 rounded-2xl p-5 animate-pulse space-y-3">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-muted" /><div className="space-y-1.5 flex-1"><div className="h-3 bg-muted rounded w-3/4" /><div className="h-2.5 bg-muted rounded w-1/2" /></div></div>
              <div className="h-2.5 bg-muted rounded w-full" /><div className="h-2.5 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === "grid" && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-card border border-border/80 rounded-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4"><i className="fa-solid fa-file-invoice-dollar text-2xl text-muted-foreground/40" /></div>
            <p className="text-sm font-bold text-foreground">No invoices found</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">{search || statusFilter !== "All" ? "Try adjusting your filters" : `No ${scope} invoices yet`}</p>
            <button onClick={onNewInvoice} className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"><i className="fa-solid fa-plus text-[10px]" />Create Invoice</button>
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
                <div key={inv._id} className="group bg-card border border-border/80 rounded-2xl shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 flex flex-col overflow-hidden">
                  <div className="px-4 pt-3.5 pb-3 flex items-center justify-between gap-2 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 truncate max-w-[130px] shrink-0" title={inv.invoiceNo}>{inv.invoiceNo}</span>
                      {inv.category && <span className="text-[10px] font-medium text-muted-foreground truncate hidden sm:block">{inv.category}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {inv.status !== "Paid" && inv.status !== "Cancelled" && daysUntilDue !== null && (
                        daysUntilDue < 0 ? <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">Overdue</span>
                        : daysUntilDue <= 5 ? <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">{daysUntilDue === 0 ? "Due today" : `${daysUntilDue}d`}</span>
                        : null
                      )}
                      <div className="relative">
                        <button type="button" onClick={() => setActionMenu(isMenuOpen ? null : inv._id)} className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"><i className="fa-solid fa-ellipsis-vertical text-xs" /></button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 z-50 w-44 bg-popover border border-border rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                            <button onClick={() => { onEditInvoice(inv); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left cursor-pointer"><i className="fa-solid fa-pen-to-square text-blue-500 w-4" />Edit Invoice</button>
                            <button onClick={() => { navigator.clipboard?.writeText(inv.invoiceNo); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left cursor-pointer"><i className="fa-solid fa-copy text-violet-500 w-4" />Copy Invoice #</button>
                            <div className="border-t border-border my-1" />
                            <button onClick={() => { onDeleteInvoice(inv._id, `${inv.invoiceNo} – ${inv.client}`); setActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-rose-500/10 text-rose-500 transition-colors text-left cursor-pointer"><i className="fa-solid fa-trash w-4" />Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pt-4 pb-3 flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-2xs", avatarColor)}>{initials}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{inv.client}</p>
                        <p className="text-[11px] text-muted-foreground">{inv.venture || (scope === "external" ? "External Client" : "Internal")}</p>
                      </div>
                    </div>
                    <div className="bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Amount</span>
                      <span className="text-base font-black text-primary">{inv.currency || "USD"} {fmtDec(inv.amount)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><i className="fa-solid fa-calendar-days text-[9px]" />Issued</p>
                        <p className="text-[11px] font-semibold text-foreground">{fmtDate(inv.issuedDate)}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><i className="fa-solid fa-calendar-xmark text-[9px]" />Due</p>
                        <p className={cn("text-[11px] font-semibold", inv.status !== "Paid" && daysUntilDue !== null && daysUntilDue < 0 ? "text-rose-500" : "text-foreground")}>{fmtDate(inv.dueDate)}</p>
                      </div>
                    </div>
                    {inv.notes && <p className="text-[10px] text-muted-foreground line-clamp-1 italic border-t border-border/40 pt-2">{inv.notes}</p>}
                  </div>
                  <div className="px-5 py-3 border-t border-border/60 bg-muted/10 flex items-center justify-between gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border", sc.bg, sc.text, sc.border)}>
                      <i className={cn("fa-solid text-[9px]", sc.icon)} />{inv.status}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEditInvoice(inv)} className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-primary/10 hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-all cursor-pointer" title="Edit"><i className="fa-solid fa-pen text-[10px]" /></button>
                      <button onClick={() => onDeleteInvoice(inv._id, `${inv.invoiceNo} – ${inv.client}`)} className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-rose-500/10 hover:border-rose-500/30 flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-all cursor-pointer" title="Delete"><i className="fa-solid fa-trash text-[10px]" /></button>
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
                    <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
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
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 inline-block">
                            {inv.invoiceNo}
                          </span>
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

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border", sc.bg, sc.text, sc.border)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                            {inv.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onEditInvoice(inv)}
                              className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-primary/10 hover:border-primary/30 flex items-center justify-center text-muted-foreground hover:text-primary transition-all cursor-pointer"
                              title="Edit"
                            >
                              <i className="fa-solid fa-pen text-[10px]" />
                            </button>
                            <button
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
    </div>
  );
}
