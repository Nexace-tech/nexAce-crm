"use client";

import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";
import type { Lead } from "@/components/bd/LeadDetailPanel";
import { getCurrencySymbol } from "@/components/bd/LeadDetailPanel";

export interface AllSalesViewProps {
  deals: SalesDeal[];
  leads?: Lead[];
  onNewDeal?: () => void;
  onEditDeal?: (deal: SalesDeal) => void;
  onGenerateInvoice?: (deal: SalesDeal) => void;
  onConvertToProposal?: (deal: SalesDeal) => void;
  onViewLead?: (clientAccount: string) => void;
  onRefresh?: () => void;
  onBackToDashboard?: () => void;
  initialOwnerFilter?: string;
  initialStageFilter?: string;
}

const formatAmount = (val: number | string) => {
  const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0 : Number(val) || 0;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num);
};

const REP_COLORS = [
  "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30",
  "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
  "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
];

export default function AllSalesView({
  deals,
  leads = [],
  onNewDeal,
  onEditDeal,
  onGenerateInvoice,
  onConvertToProposal,
  onViewLead,
  onRefresh,
  onBackToDashboard,
  initialOwnerFilter,
  initialStageFilter,
}: AllSalesViewProps) {
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>(initialStageFilter || "All");
  const [ownerFilter, setOwnerFilter] = useState<string>(initialOwnerFilter || "All");
  const [ventureFilter, setVentureFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // Inspection Drawer
  const [selectedSale, setSelectedSale] = useState<SalesDeal | null>(null);

  // Invoices cache to display invoice tags
  const [invoices, setInvoices] = useState<Array<{ invoiceNo: string; client: string; status: string; amount: number }>>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [generatingInvoiceId, setGeneratingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInvoices = async () => {
      try {
        setLoadingInvoices(true);
        const res = await fetch("/api/finance/invoices");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.invoices) {
            setInvoices(data.invoices);
          }
        }
      } catch (err) {
        console.error("Error fetching invoices:", err);
      } finally {
        if (isMounted) setLoadingInvoices(false);
      }
    };
    fetchInvoices();
    return () => {
      isMounted = false;
    };
  }, []);

  // Collect distinct filter options
  const owners = useMemo(() => {
    const s = new Set<string>();
    deals.forEach((d) => {
      if (d.owner?.trim()) s.add(d.owner.trim());
    });
    return Array.from(s).sort();
  }, [deals]);

  const ventures = useMemo(() => {
    const s = new Set<string>();
    deals.forEach((d) => {
      if (d.venture?.trim()) s.add(d.venture.trim());
    });
    return Array.from(s).sort();
  }, [deals]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return deals.filter((d) => {
      // Stage filter
      if (stageFilter === "Closed Won" && d.stage !== "Closed Won") return false;
      if (stageFilter === "All Closed" && d.stage !== "Closed Won" && d.stage !== "Closed Lost") return false;
      if (stageFilter === "All Pipeline" && (d.stage === "Closed Won" || d.stage === "Closed Lost")) return false;
      if (stageFilter !== "All" && stageFilter !== "Closed Won" && stageFilter !== "All Closed" && stageFilter !== "All Pipeline") {
        if (d.stage !== stageFilter) return false;
      }

      // Owner filter
      if (ownerFilter !== "All" && (d.owner || "").toLowerCase() !== ownerFilter.toLowerCase()) return false;

      // Venture filter
      if (ventureFilter !== "All" && (d.venture || "").toLowerCase() !== ventureFilter.toLowerCase()) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = (d.dealName || "").toLowerCase().includes(q);
        const matchClient = (d.clientAccount || "").toLowerCase().includes(q);
        const matchOwner = (d.owner || "").toLowerCase().includes(q);
        const matchVenture = (d.venture || "").toLowerCase().includes(q);
        if (!matchName && !matchClient && !matchOwner && !matchVenture) return false;
      }

      // Date range filter
      if (dateFilter !== "All") {
        const dealDate = d.expectedClose || d.createdAt;
        if (!dealDate) return true;
        const dt = new Date(dealDate);
        const now = new Date();
        if (dateFilter === "2026" && dt.getFullYear() !== 2026) return false;
        if (dateFilter === "2025" && dt.getFullYear() !== 2025) return false;
        if (dateFilter === "30d") {
          const diffDays = (now.getTime() - dt.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30 || diffDays < -30) return false;
        }
      }

      return true;
    });
  }, [deals, stageFilter, ownerFilter, ventureFilter, searchTerm, dateFilter]);

  // Aggregated KPIs
  const wonSales = useMemo(() => deals.filter((d) => d.stage === "Closed Won"), [deals]);
  const totalRealizedRevenue = useMemo(() => wonSales.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0), [wonSales]);
  const avgSaleValue = useMemo(() => (wonSales.length > 0 ? Math.round(totalRealizedRevenue / wonSales.length) : 0), [wonSales.length, totalRealizedRevenue]);
  const winRate = useMemo(() => {
    const closedCount = deals.filter((d) => d.stage === "Closed Won" || d.stage === "Closed Lost").length;
    return closedCount > 0 ? Math.round((wonSales.length / closedCount) * 100) : 100;
  }, [deals, wonSales.length]);

  // Invoice helper
  const getDealInvoice = (deal: SalesDeal) => {
    return invoices.find((inv) => {
      const matchClient = inv.client && deal.clientAccount && inv.client.toLowerCase() === deal.clientAccount.toLowerCase();
      const matchAmount = Math.abs((inv.amount || 0) - (Number(deal.dealValue) || 0)) < 1;
      return matchClient || matchAmount;
    });
  };

  const handleInvoiceClick = async (deal: SalesDeal, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onGenerateInvoice) return;
    setGeneratingInvoiceId(deal._id);
    try {
      await onGenerateInvoice(deal);
    } finally {
      setGeneratingInvoiceId(null);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    const headers = ["Deal Name", "Client Account", "Value", "Currency", "Stage", "Owner", "Venture", "Expected Close"];
    const rows = filteredSales.map((d) => [
      `"${d.dealName.replace(/"/g, '""')}"`,
      `"${d.clientAccount.replace(/"/g, '""')}"`,
      d.dealValue,
      d.currency || "USD",
      d.stage,
      `"${(d.owner || "").replace(/"/g, '""')}"`,
      `"${(d.venture || "").replace(/"/g, '""')}"`,
      d.expectedClose || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `All_Sales_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDropdownOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & ACTIONS BAR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border/70 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xl shadow-2xs">
            <i className="fa-solid fa-file-invoice-dollar" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">All Sales &amp; Closed Transactions</h2>
              <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {wonSales.length} Won Deals
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                • Total Realized: <span className="font-bold text-foreground font-mono">${formatAmount(totalRealizedRevenue)}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live transaction register of verified sales contracts, deal values, reps, and billing fulfillment.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              className="px-3 py-1.5 rounded-xl border border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-arrow-left text-[11px]" />
              Executive Dashboard
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2 rounded-xl border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer shadow-2xs"
              title="Refresh Sales"
            >
              <i className="fa-solid fa-arrows-rotate text-xs" />
            </button>
          )}

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="px-3 py-1.5 rounded-xl border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/60 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-file-export text-[11px] text-muted-foreground" />
              Export
              <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-40 bg-card border border-border/80 rounded-xl shadow-lg p-1 z-30 divide-y divide-border/40">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/60 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-file-csv text-emerald-500" /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setExportDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/60 rounded-lg flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-print text-sky-500" /> Print Summary
                </button>
              </div>
            )}
          </div>

          {onNewDeal && (
            <button
              type="button"
              onClick={onNewDeal}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs" />
              New Sale / Deal
            </button>
          )}
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Realized Revenue */}
        <div className="p-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Realized Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs">
              <i className="fa-solid fa-trophy" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
            ${formatAmount(totalRealizedRevenue)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <i className="fa-solid fa-circle-check text-emerald-500 text-[10px]" />
            From {wonSales.length} closed won contracts
          </p>
        </div>

        {/* 2. Won Deals Count */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Total Sales Closed</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs">
              <i className="fa-solid fa-handshake" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground tracking-tight">
            {wonSales.length}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{winRate}%</span> win conversion
          </p>
        </div>

        {/* 3. Average Deal Value */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Average Sale Size</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center text-xs">
              <i className="fa-solid fa-chart-line" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground tracking-tight">
            ${formatAmount(avgSaleValue)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 text-muted-foreground">
            Per won contract
          </p>
        </div>

        {/* 4. Active Invoicing */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Invoice Fulfilled</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center text-xs">
              <i className="fa-solid fa-file-invoice" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-foreground tracking-tight">
            {invoices.length}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
            <i className="fa-solid fa-clock text-sky-500 text-[10px]" />
            Generated in Finance
          </p>
        </div>
      </div>

      {/* ── TOOLBAR: SEARCH & FILTERS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 bg-card border border-border/70 rounded-2xl shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by sale, customer, rep, or venture..."
              className="w-full pl-8 pr-8 py-1.5 text-xs rounded-xl bg-muted/40 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Stage Filter */}
          <div className="flex items-center gap-1">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              aria-label="Filter by deal stage"
              className="px-2.5 py-1.5 text-xs rounded-xl bg-muted/40 border border-border/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Stages (All Deals &amp; Sales)</option>
              <option value="Closed Won">Closed Won Sales Only</option>
              <option value="All Closed">All Closed (Won &amp; Lost)</option>
              <option value="All Pipeline">Active Pipeline Only</option>
              <option value="Prospecting">Prospecting</option>
              <option value="Discovery">Discovery</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Closed Lost">Closed Lost</option>
            </select>
          </div>

          {/* Sales Rep Filter */}
          {owners.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                aria-label="Filter by sales representative"
                className="px-2.5 py-1.5 text-xs rounded-xl bg-muted/40 border border-border/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="All">All Sales Reps</option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Venture Filter */}
          {ventures.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                value={ventureFilter}
                onChange={(e) => setVentureFilter(e.target.value)}
                aria-label="Filter by venture"
                className="px-2.5 py-1.5 text-xs rounded-xl bg-muted/40 border border-border/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="All">All Ventures</option>
                {ventures.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Filter */}
          <div className="flex items-center gap-1">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter by date range"
              className="px-2.5 py-1.5 text-xs rounded-xl bg-muted/40 border border-border/60 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Time</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* View Mode (Table vs Grid) & Result Count */}
        <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
          <span className="text-xs text-muted-foreground font-medium">
            Showing <span className="font-bold text-foreground font-mono">{filteredSales.length}</span> sales
          </span>

          <div className="flex items-center p-0.5 bg-muted/40 rounded-xl border border-border/50">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title="Table View"
              className={cn(
                "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                viewMode === "table" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-table-list text-xs" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={cn(
                "p-1.5 rounded-lg text-xs transition-all cursor-pointer",
                viewMode === "grid" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-border-all text-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* ── SALES CONTENT (TABLE OR GRID) ── */}
      {filteredSales.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border/80 flex items-center justify-center text-muted-foreground mx-auto text-2xl mb-3">
            <i className="fa-solid fa-filter" />
          </div>
          <h3 className="text-base font-bold text-foreground">No sales found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No sales or deals matched your selected filters or search query. Try clearing filters to see all transactions.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setStageFilter("Closed Won");
              setOwnerFilter("All");
              setVentureFilter("All");
              setDateFilter("All");
            }}
            className="mt-4 px-4 py-1.5 rounded-xl border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/60 transition-all cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/30 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Sale / Deal</th>
                  <th className="py-3 px-4">Client / Account</th>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4 text-right">Contract Value</th>
                  <th className="py-3 px-4">Stage &amp; Date</th>
                  <th className="py-3 px-4">Invoice Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredSales.map((deal, idx) => {
                  const isWon = deal.stage === "Closed Won";
                  const isLost = deal.stage === "Closed Lost";
                  const currSymbol = getCurrencySymbol(deal.currency || "USD");
                  const invoice = getDealInvoice(deal);
                  const repInitials = (deal.owner || "Unassigned")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const repColor = REP_COLORS[idx % REP_COLORS.length];

                  return (
                    <tr
                      key={deal._id || idx}
                      onClick={() => setSelectedSale(deal)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      {/* Deal Name & Venture */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border transition-transform group-hover:scale-105",
                              isWon
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : isLost
                                ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                                : "bg-primary/10 text-primary border-primary/20"
                            )}
                          >
                            <i
                              className={cn(
                                "fa-solid",
                                isWon ? "fa-trophy" : isLost ? "fa-circle-xmark" : "fa-handshake"
                              )}
                            />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-xs group-hover:text-primary transition-colors">
                              {deal.dealName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {deal.venture && (
                                <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded border border-border/40">
                                  {deal.venture}
                                </span>
                              )}
                              {deal.category && (
                                <span className="text-[10px] text-muted-foreground">
                                  • {deal.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Client Account */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-[10px]">
                            <i className="fa-solid fa-building" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{deal.clientAccount}</p>
                            {onViewLead && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewLead(deal.clientAccount);
                                }}
                                className="text-[10px] text-primary hover:underline flex items-center gap-1"
                              >
                                View Lead <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Sales Rep */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border",
                              repColor
                            )}
                          >
                            {repInitials}
                          </span>
                          <span className="font-medium text-foreground text-xs">{deal.owner || "Unassigned"}</span>
                        </div>
                      </td>

                      {/* Contract Value */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span
                            className={cn(
                              "font-black font-mono text-sm tracking-tight",
                              isWon ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                            )}
                          >
                            {currSymbol}
                            {formatAmount(deal.dealValue)}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {isWon ? "100% Realized" : `${deal.probability || 0}% Probability`}
                          </span>
                        </div>
                      </td>

                      {/* Stage & Date */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                              isWon
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : isLost
                                ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            )}
                          >
                            <i
                              className={cn(
                                "fa-solid text-[9px]",
                                isWon ? "fa-circle-check" : isLost ? "fa-circle-xmark" : "fa-arrows-rotate"
                              )}
                            />
                            {deal.stage}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            {deal.expectedClose
                              ? new Date(deal.expectedClose).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "No close date"}
                          </p>
                        </div>
                      </td>

                      {/* Invoice Status */}
                      <td className="py-3.5 px-4">
                        {invoice ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              <i className="fa-solid fa-check-double text-[9px]" />
                              {invoice.invoiceNo}
                            </span>
                            <span className="text-[10px] text-muted-foreground capitalize">
                              Status: <span className="font-semibold text-foreground">{invoice.status}</span>
                            </span>
                          </div>
                        ) : onGenerateInvoice ? (
                          <button
                            type="button"
                            onClick={(e) => handleInvoiceClick(deal, e)}
                            disabled={generatingInvoiceId === deal._id}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            {generatingInvoiceId === deal._id ? (
                              <i className="fa-solid fa-spinner fa-spin text-[10px]" />
                            ) : (
                              <i className="fa-solid fa-plus text-[10px]" />
                            )}
                            Generate Invoice
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Not Invoiced</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedSale(deal)}
                            title="Inspect Sale"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer"
                          >
                            <i className="fa-solid fa-eye text-xs" />
                          </button>

                          {onEditDeal && (
                            <button
                              type="button"
                              onClick={() => onEditDeal(deal)}
                              title="Edit Deal"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/60 transition-all cursor-pointer"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs" />
                            </button>
                          )}

                          {onConvertToProposal && (
                            <button
                              type="button"
                              onClick={() => onConvertToProposal(deal)}
                              title="Convert to Proposal"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-purple-500 hover:bg-muted/60 transition-all cursor-pointer"
                            >
                              <i className="fa-solid fa-file-contract text-xs" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── GRID VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSales.map((deal, idx) => {
            const isWon = deal.stage === "Closed Won";
            const isLost = deal.stage === "Closed Lost";
            const currSymbol = getCurrencySymbol(deal.currency || "USD");
            const invoice = getDealInvoice(deal);
            const repInitials = (deal.owner || "Unassigned")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const repColor = REP_COLORS[idx % REP_COLORS.length];

            return (
              <div
                key={deal._id || idx}
                onClick={() => setSelectedSale(deal)}
                className="p-4 rounded-2xl border border-border/70 bg-card hover:border-primary/50 transition-all cursor-pointer shadow-2xs flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold border",
                          isWon
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : isLost
                            ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                            : "bg-primary/10 text-primary border-primary/20"
                        )}
                      >
                        <i
                          className={cn(
                            "fa-solid",
                            isWon ? "fa-trophy" : isLost ? "fa-circle-xmark" : "fa-handshake"
                          )}
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors leading-tight">
                          {deal.dealName}
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5">
                          <i className="fa-solid fa-building text-[10px]" />
                          {deal.clientAccount}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        isWon
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : isLost
                          ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      )}
                    >
                      {deal.stage}
                    </span>
                  </div>

                  {deal.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2 my-2 bg-muted/20 p-2 rounded-lg border border-border/40">
                      {deal.notes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-border/50 mt-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                        Contract Value
                      </span>
                      <p
                        className={cn(
                          "font-black font-mono text-lg",
                          isWon ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                        )}
                      >
                        {currSymbol}
                        {formatAmount(deal.dealValue)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border",
                          repColor
                        )}
                      >
                        {repInitials}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{deal.owner || "Unassigned"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {invoice ? (
                      <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <i className="fa-solid fa-check-double text-[10px]" />
                        {invoice.invoiceNo}
                      </span>
                    ) : onGenerateInvoice ? (
                      <button
                        type="button"
                        onClick={(e) => handleInvoiceClick(deal, e)}
                        disabled={generatingInvoiceId === deal._id}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <i className="fa-solid fa-file-invoice text-[10px]" /> Generate Invoice
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Pending</span>
                    )}

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {onEditDeal && (
                        <button
                          type="button"
                          onClick={() => onEditDeal(deal)}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <i className="fa-solid fa-pen-to-square text-xs" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedSale(deal)}
                        className="px-2 py-1 rounded-md bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 cursor-pointer"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SALE INSPECTION SLIDE-OVER DRAWER ── */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-card border-l border-border/80 h-full flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-border/70 flex items-start justify-between gap-3 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg">
                  <i className="fa-solid fa-trophy" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                    Sale Transaction Details
                  </span>
                  <h3 className="text-base font-extrabold text-foreground leading-tight">{selectedSale.dealName}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="w-8 h-8 rounded-lg border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Value Highlight */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Contract Realized Value</span>
                <p className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {getCurrencySymbol(selectedSale.currency || "USD")}
                  {formatAmount(selectedSale.dealValue)}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {selectedSale.stage}
                  </span>
                  {selectedSale.venture && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-foreground border border-border/50">
                      {selectedSale.venture}
                    </span>
                  )}
                </div>
              </div>

              {/* Key Attributes */}
              <div className="space-y-3">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Transaction Metadata
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-[10px] text-muted-foreground">Client Account</span>
                    <p className="font-bold text-foreground mt-0.5">{selectedSale.clientAccount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-[10px] text-muted-foreground">Account Owner</span>
                    <p className="font-bold text-foreground mt-0.5">{selectedSale.owner || "Unassigned"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-[10px] text-muted-foreground">Expected / Close Date</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {selectedSale.expectedClose
                        ? new Date(selectedSale.expectedClose).toLocaleDateString()
                        : "Not set"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                    <span className="text-[10px] text-muted-foreground">Category</span>
                    <p className="font-bold text-foreground mt-0.5">{selectedSale.category || "General Sale"}</p>
                  </div>
                </div>
              </div>

              {/* Invoicing Section */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <i className="fa-solid fa-file-invoice-dollar text-emerald-500" />
                    Billing &amp; Tax Invoice
                  </h4>
                  {getDealInvoice(selectedSale) ? (
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      {getDealInvoice(selectedSale)?.invoiceNo}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-500 font-semibold">Not yet invoiced</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Generate a finance-ready commercial invoice with automatic tax and billing schedule for this sale.
                </p>
                {onGenerateInvoice && (
                  <button
                    type="button"
                    onClick={(e) => handleInvoiceClick(selectedSale, e)}
                    disabled={generatingInvoiceId === selectedSale._id}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    {generatingInvoiceId === selectedSale._id ? (
                      <i className="fa-solid fa-spinner fa-spin text-xs" />
                    ) : (
                      <i className="fa-solid fa-file-invoice-dollar text-xs" />
                    )}
                    {getDealInvoice(selectedSale) ? "Re-Generate Invoice" : "Generate Invoice Now"}
                  </button>
                )}
              </div>

              {/* Stage Journey */}
              {selectedSale.stageHistory && selectedSale.stageHistory.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                    Stage Timeline
                  </h4>
                  <div className="space-y-2 border-l-2 border-border/60 pl-3 ml-2">
                    {selectedSale.stageHistory.map((sh, sIdx) => (
                      <div key={sIdx} className="relative">
                        <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                        <p className="font-bold text-foreground text-xs">{(sh as any).toStage || (sh as any).stage || "Stage Update"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {sh.timestamp ? new Date(sh.timestamp).toLocaleString() : "Updated"}
                        </p>
                        {(sh as any).notes && <p className="text-[11px] text-muted-foreground mt-0.5 italic">"{(sh as any).notes}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedSale.notes && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                    Internal Sale Notes
                  </h4>
                  <p className="p-3 rounded-xl bg-muted/30 border border-border/50 text-foreground leading-relaxed">
                    {selectedSale.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-border/70 bg-muted/20 flex items-center justify-between gap-2">
              {onConvertToProposal && (
                <button
                  type="button"
                  onClick={() => {
                    onConvertToProposal(selectedSale);
                    setSelectedSale(null);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-border/80 text-xs font-semibold text-foreground hover:bg-muted/60 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-file-contract text-xs text-purple-500" />
                  Proposal
                </button>
              )}

              <div className="flex items-center gap-2">
                {onEditDeal && (
                  <button
                    type="button"
                    onClick={() => {
                      onEditDeal(selectedSale);
                      setSelectedSale(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-pen-to-square text-xs" />
                    Edit Deal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="px-3 py-1.5 rounded-xl border border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
