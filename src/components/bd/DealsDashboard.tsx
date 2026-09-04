"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";
import type { Lead } from "@/components/bd/LeadDetailPanel";

interface DealsDashboardProps {
  deals: SalesDeal[];
  loading?: boolean;
  onNewDeal: () => void;
  onEditDeal: (deal: SalesDeal) => void;
  onDeleteDeal: (dealId: string, dealName: string) => void;
  onRefresh?: () => void;
  onStageChange?: (dealId: string, newStage: SalesDeal["stage"], notes?: string) => void;
  onConvertToProposal?: (deal: SalesDeal) => void;
  onGenerateInvoice?: (deal: SalesDeal) => void;
  onViewLead?: (clientAccount: string) => void;
  onNavigateToProposals?: () => void;
  onNavigateToLeads?: () => void;
  initialStageFilter?: string;
  onClearStageFilter?: () => void;
  leads?: Lead[];
  proposals?: Array<{ _id: string; proposalCode: string; subject: string; clientCompany?: string; clientName?: string; totalValue: number; status: string }>;
}

export const STAGE_ORDER: SalesDeal["stage"][] = [
  "Prospecting",
  "Discovery",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];


// Stage color & style mapping
const STAGE_CONFIG: Record<
  SalesDeal["stage"],
  { label: string; color: string; bg: string; border: string; text: string; icon: string }
> = {
  Prospecting: {
    label: "Prospecting",
    color: "#6366F1",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400",
    icon: "fa-magnifying-glass-dollar",
  },
  Discovery: {
    label: "Discovery",
    color: "#0EA5E9",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
    icon: "fa-compass",
  },
  "Proposal Sent": {
    label: "Proposal Sent",
    color: "#F59E0B",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    icon: "fa-file-invoice",
  },
  Negotiation: {
    label: "Negotiation",
    color: "#EC4899",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    text: "text-pink-600 dark:text-pink-400",
    icon: "fa-comments-dollar",
  },
  "Closed Won": {
    label: "Closed Won",
    color: "#10B981",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    icon: "fa-circle-check",
  },
  "Closed Lost": {
    label: "Closed Lost",
    color: "#EF4444",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    icon: "fa-circle-xmark",
  },
};

const COMPANY_PALETTE = [
  "from-blue-600 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-violet-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-sky-600",
];

const formatUSD = (val: number | string) => {
  const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0 : Number(val) || 0;
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num)}`;
};

export default function DealsDashboard({
  deals,
  loading = false,
  onNewDeal,
  onEditDeal,
  onDeleteDeal,
  onRefresh,
  onConvertToProposal,
  onGenerateInvoice,
  onViewLead,
  onNavigateToProposals,
  onNavigateToLeads,
  onStageChange,
  initialStageFilter,
  onClearStageFilter,
  leads = [],
  proposals = [],
}: DealsDashboardProps) {
  // View mode switcher: Dashboard Analytics vs Kanban Board vs Detailed Table
  const [viewMode, setViewMode] = useState<"dashboard" | "kanban" | "table">("dashboard");

  // Filters
  const [recentDealsTimeframe, setRecentDealsTimeframe] = useState<"15" | "30" | "90">("30");
  const [stageTimeframe, setStageTimeframe] = useState<"7" | "15" | "30">("30");
  const [pipelineSelection, setPipelineSelection] = useState<string>("Sales Pipeline");
  const [pipelineTimeframe, setPipelineTimeframe] = useState<string>("Last 30 Days");
  const [lostPipeline, setLostPipeline] = useState<string>("Marketing Pipeline");
  const [lostTimeframe, setLostTimeframe] = useState<string>("Last 3 months");
  const [wonPipeline, setWonPipeline] = useState<string>("Sales Pipeline");
  const [wonTimeframe, setWonTimeframe] = useState<string>("Last 3 months");

  const [dateRangeText, setDateRangeText] = useState("All Time");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => initialStageFilter || "All");
  const [ownerFilter, setOwnerFilter] = useState<string>("All");
  const [ventureFilter, setVentureFilter] = useState<string>("All");

  // Drag and drop states for Kanban stage transition
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<SalesDeal["stage"] | null>(null);

  // Closed Lost quick-reason dialog state
  const [losingDeal, setLosingDeal] = useState<SalesDeal | null>(null);
  const [lossReasonCategory, setLossReasonCategory] = useState("Budget / Price Constraint");
  const [lossNote, setLossNote] = useState("");

  // Deal Stage History & Audit Trail Modal state
  const [historyDeal, setHistoryDeal] = useState<SalesDeal | null>(null);

  // Aging Filter: all, active (<14d in stage), stale (>=14d in stage)
  const [agingFilter, setAgingFilter] = useState<"all" | "active" | "stale">("all");

  // Log Activity in History Modal state
  const [logActivityType, setLogActivityType] = useState<string>("Meeting Held");
  const [logActivityNote, setLogActivityNote] = useState<string>("");
  const [submittingActivity, setSubmittingActivity] = useState<boolean>(false);

  // Helper for stage duration in days
  const getDealStageDuration = (deal: SalesDeal) => {
    const lastHistory = deal.stageHistory && deal.stageHistory.length > 0
      ? deal.stageHistory[deal.stageHistory.length - 1]
      : null;
    const lastDate = lastHistory?.timestamp || (deal as any).updatedAt || (deal as any).createdAt;
    if (!lastDate) return 0;
    const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  const handleLogActivity = async () => {
    if (!historyDeal || !logActivityNote.trim()) return;
    setSubmittingActivity(true);
    try {
      const combinedNote = `[${logActivityType}] ${logActivityNote.trim()}`;
      const res = await fetch(`/api/operations/sales-deals/${historyDeal._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: historyDeal.stage,
          notes: combinedNote,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.deal) {
          setHistoryDeal(data.deal);
        }
        setLogActivityNote("");
        onRefresh?.();
      }
    } catch (err) {
      console.error("Error logging activity:", err);
    } finally {
      setSubmittingActivity(false);
    }
  };

  // Sync initialStageFilter when passed from parent navigation
  React.useEffect(() => {
    if (initialStageFilter) {
      setStatusFilter(initialStageFilter);
      setViewMode("table");
    }
  }, [initialStageFilter]);

  // Distinct Owners and Ventures from real deals data
  const distinctOwners = useMemo(() => {
    const s = new Set<string>();
    deals.forEach((d) => {
      if (d.owner?.trim()) s.add(d.owner.trim());
    });
    return Array.from(s);
  }, [deals]);

  const distinctVentures = useMemo(() => {
    const s = new Set<string>();
    deals.forEach((d) => {
      if (d.venture?.trim()) s.add(d.venture.trim());
    });
    return Array.from(s);
  }, [deals]);

  // Dynamically filter deals based on selected date range, owner, venture, and aging velocity
  const activeDealsList = useMemo(() => {
    return (deals || []).filter((d) => {
      if (ownerFilter !== "All" && (d.owner || "").toLowerCase() !== ownerFilter.toLowerCase()) return false;
      if (ventureFilter !== "All" && (d.venture || "").toLowerCase() !== ventureFilter.toLowerCase()) return false;
      if (agingFilter === "active" && (d.stage === "Closed Won" || d.stage === "Closed Lost" || getDealStageDuration(d) >= 14)) return false;
      if (agingFilter === "stale" && (d.stage === "Closed Won" || d.stage === "Closed Lost" || getDealStageDuration(d) < 14)) return false;
      if (!dateRangeText || dateRangeText === "All Time") return true;
      const rawDate = (d as any).createdAt || d.expectedClose;
      if (!rawDate) return true;
      const t = new Date(rawDate).getTime();
      if (isNaN(t)) return true;
      const now = Date.now();
      if (dateRangeText === "This Month") {
        const cur = new Date();
        const target = new Date(rawDate);
        return target.getMonth() === cur.getMonth() && target.getFullYear() === cur.getFullYear();
      }
      if (dateRangeText === "Last 30 Days") return t >= now - 30 * 86400000;
      if (dateRangeText === "This Quarter") return t >= now - 90 * 86400000;
      if (dateRangeText === "This Year") {
        return new Date(rawDate).getFullYear() === new Date().getFullYear();
      }
      return true;
    });
  }, [deals, dateRangeText, ownerFilter, ventureFilter]);

  // Dynamic Lost & Won breakdowns
  const lostDealsAnalysis = useMemo(() => {
    const lostDeals = activeDealsList.filter((d) => d.stage === "Closed Lost");
    if (lostDeals.length === 0) return [];
    const totalLost = lostDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0) || 1;
    return lostDeals.map((d, i) => ({
      reason: d.notes || d.dealName || `Lost Opportunity #${i + 1}`,
      client: d.clientAccount,
      value: Number(d.dealValue) || 0,
      pct: Math.max(5, Math.round(((Number(d.dealValue) || 0) / totalLost) * 100)),
      color: i % 3 === 0 ? "bg-rose-500" : i % 3 === 1 ? "bg-amber-500" : "bg-violet-500",
    }));
  }, [activeDealsList]);

  const wonDealsAnalysis = useMemo(() => {
    const wonDeals = activeDealsList.filter((d) => d.stage === "Closed Won");
    if (wonDeals.length === 0) return [];
    const totalWon = wonDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0) || 1;
    return wonDeals.map((d, i) => ({
      avenue: d.dealName || d.clientAccount,
      client: d.clientAccount,
      value: Number(d.dealValue) || 0,
      pct: Math.max(5, Math.round(((Number(d.dealValue) || 0) / totalWon) * 100)),
      color: i % 3 === 0 ? "bg-emerald-500" : i % 3 === 1 ? "bg-teal-500" : "bg-sky-500",
    }));
  }, [activeDealsList]);

  // ─── KPI Metrics ───
  const metrics = useMemo(() => {
    const totalPipeline = activeDealsList.reduce((acc, d) => acc + (d.dealValue || 0), 0);
    const wonDeals = activeDealsList.filter((d) => d.stage === "Closed Won");
    const wonValue = wonDeals.reduce((acc, d) => acc + (d.dealValue || 0), 0);
    const lostDeals = activeDealsList.filter((d) => d.stage === "Closed Lost");
    const lostValue = lostDeals.reduce((acc, d) => acc + (d.dealValue || 0), 0);
    const activeInPipeline = activeDealsList.filter(
      (d) => d.stage !== "Closed Won" && d.stage !== "Closed Lost"
    );
    const activePipelineValue = activeInPipeline.reduce((acc, d) => acc + (d.dealValue || 0), 0);
    const weightedPipeline = activeInPipeline.reduce(
      (acc, d) => acc + ((d.dealValue || 0) * (d.probability || 50)) / 100,
      0
    );
    const closedCount = wonDeals.length + lostDeals.length;
    const winRate = closedCount > 0 ? Math.round((wonDeals.length / closedCount) * 100) : 0;
    const avgDealSize = activeDealsList.length > 0 ? Math.round(totalPipeline / activeDealsList.length) : 0;

    return {
      totalPipeline,
      weightedPipeline,
      activePipelineValue,
      activeCount: activeInPipeline.length,
      wonValue,
      wonCount: wonDeals.length,
      lostValue,
      lostCount: lostDeals.length,
      winRate,
      avgDealSize,
    };
  }, [activeDealsList]);

  // ─── Stage Distribution ───
  const stageStats = useMemo(() => {
    const stages: Record<SalesDeal["stage"], { count: number; value: number }> = {
      Prospecting: { count: 0, value: 0 },
      Discovery: { count: 0, value: 0 },
      "Proposal Sent": { count: 0, value: 0 },
      Negotiation: { count: 0, value: 0 },
      "Closed Won": { count: 0, value: 0 },
      "Closed Lost": { count: 0, value: 0 },
    };

    activeDealsList.forEach((d) => {
      if (stages[d.stage]) {
        stages[d.stage].count += 1;
        stages[d.stage].value += d.dealValue || 0;
      }
    });

    const totalDeals = activeDealsList.length || 1;
    return Object.entries(stages).map(([stageName, stat]) => ({
      stage: stageName as SalesDeal["stage"],
      count: stat.count,
      value: stat.value,
      pct: Math.round((stat.count / totalDeals) * 100),
      config: STAGE_CONFIG[stageName as SalesDeal["stage"]] || STAGE_CONFIG.Prospecting,
    }));
  }, [activeDealsList]);

  // ─── Filtered Deals for Table ───
  const filteredDeals = useMemo(() => {
    return activeDealsList.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        !q ||
        d.dealName.toLowerCase().includes(q) ||
        d.clientAccount.toLowerCase().includes(q) ||
        (d.owner && d.owner.toLowerCase().includes(q));
      const matchStatus = statusFilter === "All" || d.stage === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [activeDealsList, searchQuery, statusFilter]);

  // Quick export CSV
  const handleExportCSV = () => {
    const headers = ["Deal Name", "Client Account", "Deal Value", "Stage", "Probability", "Owner", "Expected Close", "Notes"];
    const rows = activeDealsList.map((d) => [
      `"${d.dealName || ""}"`,
      `"${d.clientAccount || ""}"`,
      d.dealValue || 0,
      `"${d.stage || ""}"`,
      `${d.probability || 0}%`,
      `"${d.owner || ""}"`,
      `"${d.expectedClose || ""}"`,
      `"${(d.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Deals_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header Toolbar (Dreams Technologies Leads/Deals Header Style) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/40 dark:bg-slate-900/60 rounded-2xl border border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <i className="fa-solid fa-handshake text-sm" />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground tracking-tight">Deals Dashboard</h3>
              <p className="text-xs text-muted-foreground">
                Track deal pipelines, conversion velocity & stage performance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode buttons */}
          <div className="flex items-center bg-background/90 dark:bg-slate-950 p-1 rounded-xl border border-border/70 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("dashboard")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === "dashboard"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-chart-line text-[11px]" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-table-columns text-[11px]" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-table-list text-[11px]" />
              Table
            </button>
          </div>

          {/* Aging Pipeline Quick Filter */}
          <div className="flex items-center bg-background/90 dark:bg-slate-950 p-1 rounded-xl border border-border/70 shadow-2xs">
            <button
              type="button"
              onClick={() => setAgingFilter("all")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                agingFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setAgingFilter("active")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                agingFilter === "active"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Deals in stage < 14 days"
            >
              <i className="fa-solid fa-bolt text-[10px]" />
              Active
            </button>
            <button
              type="button"
              onClick={() => setAgingFilter("stale")}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1",
                agingFilter === "stale"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Deals in stage >= 14 days without movement"
            >
              <i className="fa-solid fa-triangle-exclamation text-[10px]" />
              Aging ({deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost" && getDealStageDuration(d) >= 14).length})
            </button>
          </div>

          {/* Date Picker Button / Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDateDropdown((p) => !p)}
              className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-background/80 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-calendar text-muted-foreground text-xs" />
              <span>{dateRangeText}</span>
              <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground ml-1" />
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 mt-1.5 w-52 bg-card border border-border rounded-xl shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95">
                {[
                  "28 August 26 - 28 August 27",
                  "This Month",
                  "Last 30 Days",
                  "This Quarter",
                  "This Year",
                ].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      setDateRangeText(range);
                      setShowDateDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs rounded-lg font-medium cursor-pointer transition-colors flex items-center justify-between",
                      dateRangeText === range
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span>{range}</span>
                    {dateRangeText === range && <i className="fa-solid fa-check text-[10px]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Owner Filter Dropdown */}
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-9 px-2.5 rounded-xl border border-border bg-background/80 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer shadow-2xs focus:outline-none"
            title="Filter by Deal Owner"
          >
            <option value="All">All Owners</option>
            {distinctOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>

          {/* Venture Filter Dropdown */}
          <select
            value={ventureFilter}
            onChange={(e) => setVentureFilter(e.target.value)}
            className="h-9 px-2.5 rounded-xl border border-border bg-background/80 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer shadow-2xs focus:outline-none"
            title="Filter by Venture"
          >
            <option value="All">All Ventures</option>
            {distinctVentures.map((venture) => (
              <option key={venture} value={venture}>
                {venture}
              </option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            className="w-9 h-9 rounded-xl border border-border bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="Refresh Deals"
          >
            <i className="fa-solid fa-rotate-right text-xs" />
          </button>

          {/* Export button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="w-9 h-9 rounded-xl border border-border bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
            title="Export CSV"
          >
            <i className="fa-solid fa-download text-xs" />
          </button>

          {/* Create Deal action */}
          <Button
            size="sm"
            onClick={onNewDeal}
            className="h-9 px-4 gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs" />
            Create Deal
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Pipeline Value
              </span>
              <p className="text-xl font-black font-mono tracking-tight text-foreground">
                {formatUSD(metrics.totalPipeline)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-primary font-semibold">
                <i className="fa-solid fa-handshake text-[10px]" />
                <span>{activeDealsList.length} deals</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-base border border-primary/20 shadow-2xs shrink-0">
              <i className="fa-solid fa-sack-dollar" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card via-card to-indigo-500/5 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Weighted Forecast
              </span>
              <p className="text-xl font-black font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
                {formatUSD(metrics.weightedPipeline)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <i className="fa-solid fa-calculator text-[10px] text-indigo-500" />
                <span>Prob-adjusted</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-base border border-indigo-500/20 shadow-2xs shrink-0">
              <i className="fa-solid fa-wand-magic-sparkles" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card via-card to-emerald-500/5 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Closed Won Revenue
              </span>
              <p className="text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {formatUSD(metrics.wonValue)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <i className="fa-solid fa-trophy text-amber-500 text-[10px]" />
                <span>{metrics.wonCount} won ({metrics.winRate}%)</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-base border border-emerald-500/20 shadow-2xs shrink-0">
              <i className="fa-solid fa-circle-check" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card via-card to-amber-500/5 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Active Open Pipeline
              </span>
              <p className="text-xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                {formatUSD(metrics.activePipelineValue)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <i className="fa-solid fa-hourglass-half text-[10px]" />
                <span>{metrics.activeCount} in negotiation</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-base border border-amber-500/20 shadow-2xs shrink-0">
              <i className="fa-solid fa-comments-dollar" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/80 bg-gradient-to-br from-card via-card to-rose-500/5 rounded-2xl shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Avg Deal Size
              </span>
              <p className="text-xl font-black font-mono tracking-tight text-foreground">
                {formatUSD(metrics.avgDealSize)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <i className="fa-solid fa-circle-xmark text-[10px] text-rose-500" />
                <span>{metrics.lostCount} lost ({formatUSD(metrics.lostValue)})</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-base border border-rose-500/20 shadow-2xs shrink-0">
              <i className="fa-solid fa-chart-pie" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── DASHBOARD VIEW (Dreams Technologies 2-Column Layout) ── */}
      {viewMode === "dashboard" && (
        <div className="space-y-6">
          {/* ── ROW 1: Recently Created Deals (Left 50%) & Deals by Stage (Right 50%) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 50%: Recently Created Deals Table */}
            <div className="lg:col-span-6">
              <Card className="h-full rounded-2xl border border-border/80 shadow-xs flex flex-col">
                <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <i className="fa-solid fa-clock-rotate-left text-primary text-xs" />
                      Recently Created Deals
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Latest high-priority client accounts in pipeline
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={recentDealsTimeframe}
                      onChange={(e) => setRecentDealsTimeframe(e.target.value as any)}
                      className="h-7 text-xs rounded-lg border border-border bg-background px-2 text-foreground font-semibold cursor-pointer focus:outline-none"
                    >
                      <option value="15">Last 15 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 text-left">Deal Name</th>
                        <th className="py-2.5 px-3 text-left">Company Name</th>
                        <th className="py-2.5 px-3 text-right">Value</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {activeDealsList.slice(0, 5).map((deal, idx) => {
                        const stageInfo = STAGE_CONFIG[deal.stage] || STAGE_CONFIG.Prospecting;
                        const avatarBg = COMPANY_PALETTE[idx % COMPANY_PALETTE.length];
                        const initials = deal.clientAccount.slice(0, 2).toUpperCase();

                        return (
                          <tr
                            key={deal._id}
                            className="hover:bg-muted/30 transition-colors group cursor-pointer"
                            onClick={() => onEditDeal(deal)}
                          >
                            <td className="py-3 px-3 font-semibold text-foreground max-w-[140px] truncate">
                              <div className="hover:text-primary transition-colors">{deal.dealName}</div>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                Close: {deal.expectedClose || "—"}
                              </span>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-2xs",
                                    avatarBg
                                  )}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onViewLead?.(deal.clientAccount);
                                    }}
                                    className="font-bold text-foreground text-xs leading-tight hover:text-primary transition-colors text-left flex items-center gap-1 cursor-pointer"
                                    title={`View Lead for "${deal.clientAccount}"`}
                                  >
                                    <span>{deal.clientAccount}</span>
                                    {onViewLead && <i className="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-0 group-hover:opacity-70 text-primary" />}
                                  </button>
                                  <p className="text-[10px] text-muted-foreground font-medium">
                                    {deal.owner || "Ace Team"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-bold text-foreground whitespace-nowrap">
                              {formatUSD(deal.dealValue)}
                            </td>

                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap",
                                  stageInfo.bg,
                                  stageInfo.text,
                                  stageInfo.border
                                )}
                              >
                                <i className={cn("fa-solid text-[9px]", stageInfo.icon)} />
                                {stageInfo.label}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                                {deal.stage === "Closed Won" && onGenerateInvoice && (
                                  <button
                                    type="button"
                                    onClick={() => onGenerateInvoice(deal)}
                                    className="w-7 h-7 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center cursor-pointer transition-colors"
                                    title="Generate Invoice for Won Deal"
                                  >
                                    <i className="fa-solid fa-file-invoice-dollar text-[10px]" />
                                  </button>
                                )}
                                {onConvertToProposal && (
                                  <button
                                    type="button"
                                    onClick={() => onConvertToProposal(deal)}
                                    className="w-7 h-7 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center justify-center cursor-pointer transition-colors"
                                    title="Create Proposal for this Deal"
                                  >
                                    <i className="fa-solid fa-file-contract text-[10px]" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onEditDeal(deal)}
                                  className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Edit Deal"
                                >
                                  <i className="fa-solid fa-pen text-[10px]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteDeal(deal._id, deal.dealName)}
                                  className="w-7 h-7 rounded-md bg-muted hover:bg-rose-500/15 flex items-center justify-center text-muted-foreground hover:text-rose-500 cursor-pointer"
                                  title="Delete Deal"
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
                </CardContent>
              </Card>
            </div>

            {/* Right 50%: Deals by Stage Chart */}
            <div className="lg:col-span-6">
              <Card className="h-full rounded-2xl border border-border/80 shadow-xs flex flex-col">
                <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <i className="fa-solid fa-chart-pie text-violet-500 text-xs" />
                      Deals By Stage
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Distribution & conversion progress across stages
                    </CardDescription>
                  </div>
                  <select
                    value={stageTimeframe}
                    onChange={(e) => setStageTimeframe(e.target.value as any)}
                    className="h-7 text-xs rounded-lg border border-border bg-background px-2 text-foreground font-semibold cursor-pointer focus:outline-none"
                  >
                    <option value="7">Last 7 Days</option>
                    <option value="15">Last 15 Days</option>
                    <option value="30">Last 30 Days</option>
                  </select>
                </CardHeader>

                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-5">
                  {/* Visual Segment Progress Bar Representation */}
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden flex shadow-inner">
                      {stageStats.map((st) => (
                        <div
                          key={st.stage}
                          style={{ width: `${Math.max(st.pct, 4)}%`, backgroundColor: st.config.color }}
                          className="h-full transition-all duration-500 hover:opacity-90 relative group"
                          title={`${st.stage}: ${st.count} deals (${st.pct}%) - ${formatUSD(st.value)}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                      <span>Pipeline Funnel Velocity</span>
                      <span className="font-bold text-foreground">{metrics.winRate}% Won Rate</span>
                    </div>
                  </div>

                  {/* Stage Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {stageStats.map((st) => (
                      <div
                        key={st.stage}
                        className={cn(
                          "p-2.5 rounded-xl border transition-all hover:scale-[1.02]",
                          st.config.bg,
                          st.config.border
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: st.config.color }}
                          />
                          <span className="text-[11px] font-bold text-foreground truncate">
                            {st.stage}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-base font-black font-mono text-foreground">
                            {st.count}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-muted-foreground">
                            {formatUSD(st.value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── ROW 2: Projects / Deals By Stage (Full Width Pipeline Visualization) ── */}
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardHeader className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-timeline text-primary text-xs" />
                  Deals Pipeline & Conversion Flow
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Visual stage transitions, drop-off analysis, and closing timeline
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={pipelineSelection}
                  onChange={(e) => setPipelineSelection(e.target.value)}
                  className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground font-semibold cursor-pointer focus:outline-none"
                >
                  <option value="Sales Pipeline">Sales Pipeline</option>
                  <option value="Enterprise Deals">Enterprise Deals</option>
                  <option value="Marketing Pipeline">Marketing Pipeline</option>
                  <option value="Operational">Operational</option>
                </select>

                <select
                  value={pipelineTimeframe}
                  onChange={(e) => setPipelineTimeframe(e.target.value)}
                  className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground font-semibold cursor-pointer focus:outline-none"
                >
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 15 Days">Last 15 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stageStats.map((st, i) => (
                  <div
                    key={st.stage}
                    className="p-3.5 rounded-xl border border-border/70 bg-card/60 flex flex-col justify-between space-y-3 relative group hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold font-mono text-muted-foreground uppercase">
                        Stage 0{i + 1}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white font-mono"
                        style={{ backgroundColor: st.config.color }}
                      >
                        {st.pct}%
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-foreground mb-0.5">{st.stage}</h4>
                      <p className="text-lg font-black font-mono text-foreground">
                        {formatUSD(st.value)}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {st.count} deal{st.count !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Mini visual volume meter */}
                    <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(st.pct * 2, 100)}%`, backgroundColor: st.config.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── ROW 3: Lost Deals Stage (Left 50%) & Won Deals Stage (Right 50%) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lost Deals Stage */}
            <div className="lg:col-span-6">
              <Card className="rounded-2xl border border-border/80 shadow-xs h-full flex flex-col">
                <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-xs" />
                      Lost Deals Stage
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Analysis of attrition and dropped opportunities
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={lostPipeline}
                      onChange={(e) => setLostPipeline(e.target.value)}
                      className="h-7 text-xs rounded-lg border border-border bg-background px-2 text-foreground font-semibold cursor-pointer focus:outline-none"
                    >
                      <option value="Marketing Pipeline">Marketing Pipeline</option>
                      <option value="Sales Pipeline">Sales Pipeline</option>
                      <option value="Operational">Operational</option>
                    </select>
                    <select
                      value={lostTimeframe}
                      onChange={(e) => setLostTimeframe(e.target.value)}
                      className="h-7 text-xs rounded-lg border border-border bg-background px-2 text-foreground font-semibold cursor-pointer focus:outline-none"
                    >
                      <option value="Last 3 months">Last 3 months</option>
                      <option value="Last 6 months">Last 6 months</option>
                      <option value="Last 12 months">Last 12 months</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-5 flex-1 space-y-4">
                  {lostDealsAnalysis.length > 0 ? (
                    lostDealsAnalysis.map((lostItem, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground truncate max-w-[200px]" title={lostItem.reason}>{lostItem.reason}</span>
                          <span className="font-mono font-bold text-rose-500">
                            {formatUSD(lostItem.value)} ({lostItem.pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", lostItem.color)}
                            style={{ width: `${lostItem.pct}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-muted-foreground/60">
                      <i className="fa-solid fa-shield-halved text-2xl mb-1 block opacity-30 text-emerald-500" />
                      <p className="text-xs font-semibold">Zero lost deals recorded in this timeframe.</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total Lost Value:</span>
                    <span className="font-mono font-bold text-foreground">{formatUSD(metrics.lostValue)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Won Deals Stage */}
            <div className="lg:col-span-6">
              <Card className="rounded-2xl border border-border/80 shadow-xs h-full flex flex-col">
                <CardHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <i className="fa-solid fa-trophy text-xs text-amber-500" />
                      Won Deals Stage
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Closing avenues & revenue drivers
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={wonPipeline}
                      onChange={(e) => setWonPipeline(e.target.value)}
                      className="h-7 text-xs rounded-lg border border-border bg-background px-2 text-foreground font-semibold cursor-pointer focus:outline-none"
                    >
                      <option value="Sales Pipeline">Sales Pipeline</option>
                      <option value="Enterprise Deals">Enterprise Deals</option>
                      <option value="Direct Inbound">Direct Inbound</option>
                    </select>
                    <select
                      value={wonTimeframe}
                      onChange={(e) => setWonTimeframe(e.target.value)}
                      className="h-7 text-xs rounded-lg border border-border bg-background px-2 text-foreground font-semibold cursor-pointer focus:outline-none"
                    >
                      <option value="Last 3 months">Last 3 months</option>
                      <option value="Last 6 months">Last 6 months</option>
                      <option value="Last 12 months">Last 12 months</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-5 flex-1 space-y-4">
                  {wonDealsAnalysis.length > 0 ? (
                    wonDealsAnalysis.map((wonItem, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground truncate max-w-[200px]" title={wonItem.avenue}>{wonItem.avenue}</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatUSD(wonItem.value)} ({wonItem.pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", wonItem.color)}
                            style={{ width: `${wonItem.pct}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-muted-foreground/60">
                      <i className="fa-solid fa-trophy text-2xl mb-1 block opacity-30 text-amber-500" />
                      <p className="text-xs font-semibold">No closed won deals yet in this timeframe.</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Total Won Revenue:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatUSD(metrics.wonValue)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-start">
          {stageStats.map((st) => {
            const columnDeals = activeDealsList.filter((d) => d.stage === st.stage);
            const isColOver = dragOverStage === st.stage;
            const curStageIdx = STAGE_ORDER.indexOf(st.stage);

            return (
              <div
                key={st.stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverStage !== st.stage) setDragOverStage(st.stage);
                }}
                onDragLeave={() => {
                  if (dragOverStage === st.stage) setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dealId = e.dataTransfer.getData("nexace/deal-id") || draggedDealId;
                  if (dealId && onStageChange) {
                    onStageChange(dealId, st.stage);
                  }
                  setDraggedDealId(null);
                  setDragOverStage(null);
                }}
                className={cn(
                  "rounded-2xl p-3 border transition-all flex flex-col min-h-[520px]",
                  isColOver
                    ? "bg-primary/10 border-primary shadow-md scale-[1.01]"
                    : "bg-muted/40 dark:bg-slate-900/50 border-border/80"
                )}
              >
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: st.config.color }} />
                    <h4 className="text-xs font-bold text-foreground truncate">{st.stage}</h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-background border border-border text-foreground shrink-0">
                    {columnDeals.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {columnDeals.map((deal) => {
                    const isBeingDragged = draggedDealId === deal._id;
                    const prevStage = curStageIdx > 0 ? STAGE_ORDER[curStageIdx - 1] : null;
                    const nextStage = curStageIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[curStageIdx + 1] : null;

                    return (
                      <div
                        key={deal._id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("nexace/deal-id", deal._id);
                          e.dataTransfer.effectAllowed = "move";
                          setDraggedDealId(deal._id);
                        }}
                        onDragEnd={() => {
                          setDraggedDealId(null);
                          setDragOverStage(null);
                        }}
                        onClick={() => onEditDeal(deal)}
                        className={cn(
                          "p-3 bg-card border border-border/80 rounded-xl shadow-2xs hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing space-y-2.5 group relative select-none",
                          isBeingDragged && "opacity-40 scale-[0.98] border-dashed border-primary"
                        )}
                      >
                        {/* Top Grip & Name */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <i className="fa-solid fa-grip-vertical text-muted-foreground/30 group-hover:text-muted-foreground/80 text-[10px] mt-0.5 cursor-grab active:cursor-grabbing shrink-0" title="Drag card to move stage" />
                            <h5 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-tight truncate">
                              {deal.dealName}
                            </h5>
                          </div>
                        </div>

                        {/* Company & Owner */}
                        <div className="flex items-center justify-between text-[11px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewLead?.(deal.clientAccount);
                            }}
                            className="text-muted-foreground hover:text-primary font-medium flex items-center gap-1 cursor-pointer transition-colors truncate max-w-[120px]"
                            title={`View Lead for "${deal.clientAccount}"`}
                          >
                            <i className="fa-solid fa-building text-[10px]" />
                            <span className="truncate">{deal.clientAccount}</span>
                            {onViewLead && <i className="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-0 group-hover:opacity-70" />}
                          </button>
                          <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px]">
                            {deal.owner || "Unassigned"}
                          </span>
                        </div>

                        {/* Cross-Lifecycle Connected Entities (Lead & Proposal badges) */}
                        {(() => {
                          const matchedLead = leads.find(
                            (l) =>
                              (l.companyName && deal.clientAccount && l.companyName.toLowerCase() === deal.clientAccount.toLowerCase()) ||
                              (l.leadName && deal.dealName && deal.dealName.toLowerCase().includes(l.leadName.toLowerCase()))
                          );
                          const matchedProposal = proposals.find(
                            (p) =>
                              (p.clientCompany && deal.clientAccount && p.clientCompany.toLowerCase() === deal.clientAccount.toLowerCase()) ||
                              (p.subject && deal.dealName && deal.dealName.toLowerCase().includes(p.subject.toLowerCase()))
                          );

                          if (!matchedLead && !matchedProposal) return null;

                          return (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {matchedLead && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewLead?.(matchedLead.companyName || matchedLead.leadName);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                  title={`Originating Lead: ${matchedLead.leadName}`}
                                >
                                  <i className="fa-solid fa-user-tag text-[8px]" />
                                  <span className="truncate max-w-[80px]">{matchedLead.leadName}</span>
                                </button>
                              )}
                              {matchedProposal && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateToProposals?.();
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                                  title={`Proposal: #${matchedProposal.proposalCode} (${matchedProposal.status})`}
                                >
                                  <i className="fa-solid fa-file-contract text-[8px]" />
                                  <span>#{matchedProposal.proposalCode}</span>
                                </button>
                              )}
                            </div>
                          );
                        })()}

                        {/* Stage Aging / Velocity Indicator */}
                        {(() => {
                          const daysInStage = getDealStageDuration(deal);
                          const isClosed = deal.stage === "Closed Won" || deal.stage === "Closed Lost";
                          if (isClosed) return null;

                          const isStale = daysInStage >= 14;
                          const isFast = daysInStage <= 4;

                          return (
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors",
                                  isStale
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                                    : isFast
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : "bg-muted text-muted-foreground border border-border/60"
                                )}
                                title={isStale ? `Opportunity has remained in ${deal.stage} for ${daysInStage} days without movement.` : `In ${deal.stage} for ${daysInStage} days`}
                              >
                                <i className={cn("fa-solid text-[8px]", isStale ? "fa-triangle-exclamation" : isFast ? "fa-bolt" : "fa-clock")} />
                                <span>{isStale ? `Aging: ${daysInStage}d` : `${daysInStage}d in stage`}</span>
                              </span>
                              {deal.expectedClose && (
                                <span className="font-mono text-[9px] text-muted-foreground truncate" title={`Expected Close: ${deal.expectedClose}`}>
                                  Target: {deal.expectedClose.slice(5, 10)}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        {/* Deal Value & Probability Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-black text-foreground">
                              {formatUSD(deal.dealValue)}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {deal.probability || 0}% prob (${formatUSD(Math.round(((deal.dealValue || 0) * (deal.probability || 0)) / 100))})
                            </span>
                          </div>
                          <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(100, Math.max(5, deal.probability || 0))}%` }}
                            />
                          </div>
                        </div>

                        {/* 5-Step Visual Mini-Stepper */}
                        <div className="flex items-center gap-1 pt-1">
                          {STAGE_ORDER.slice(0, 5).map((stKey, sIdx) => {
                            const isCurrent = deal.stage === stKey;
                            const isPast = STAGE_ORDER.indexOf(deal.stage) > sIdx;
                            return (
                              <button
                                key={stKey}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStageChange?.(deal._id, stKey);
                                }}
                                className={cn(
                                  "flex-1 h-1.5 rounded-full transition-all cursor-pointer hover:h-2",
                                  isCurrent
                                    ? "bg-primary ring-2 ring-primary/40"
                                    : isPast
                                    ? "bg-primary/50"
                                    : "bg-muted hover:bg-muted-foreground/30"
                                )}
                                title={`Jump to stage: ${stKey}`}
                              />
                            );
                          })}
                        </div>

                        {/* Lifecycle Progression Toolbar */}
                        <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* Quick Stage Shift Buttons */}
                          <div className="flex items-center gap-1">
                            {prevStage && onStageChange && (
                              <button
                                type="button"
                                onClick={() => onStageChange(deal._id, prevStage)}
                                className="w-6 h-6 rounded bg-muted/60 hover:bg-muted hover:text-foreground text-muted-foreground flex items-center justify-center text-[9px] cursor-pointer transition-colors"
                                title={`Move back to ${prevStage}`}
                              >
                                <i className="fa-solid fa-arrow-left" />
                              </button>
                            )}

                            {nextStage && onStageChange && (
                              <button
                                type="button"
                                onClick={() => onStageChange(deal._id, nextStage)}
                                className="w-6 h-6 rounded bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold cursor-pointer transition-colors"
                                title={`Advance to ${nextStage}`}
                              >
                                <i className="fa-solid fa-arrow-right" />
                              </button>
                            )}

                            {/* Stage quick dropdown */}
                            {onStageChange && (
                              <select
                                value={deal.stage}
                                onChange={(e) => onStageChange(deal._id, e.target.value as SalesDeal["stage"])}
                                className="h-6 text-[10px] font-bold bg-muted/40 hover:bg-muted text-foreground rounded px-1 border border-border/70 cursor-pointer outline-none"
                                title="Change deal stage directly"
                              >
                                {STAGE_ORDER.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* Quick Win / Quick Lose / Actions shortcuts */}
                          <div className="flex items-center gap-1">
                            {deal.stage !== "Closed Won" && onStageChange && (
                              <button
                                type="button"
                                onClick={() => {
                                  onStageChange(deal._id, "Closed Won");
                                  if (onGenerateInvoice) onGenerateInvoice(deal);
                                }}
                                className="h-6 px-1.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer"
                                title="Quick Win: Mark Closed Won & Generate Invoice"
                              >
                                <i className="fa-solid fa-trophy text-[9px]" />
                                <span className="hidden sm:inline">Won</span>
                              </button>
                            )}

                            {deal.stage !== "Closed Lost" && (
                              <button
                                type="button"
                                onClick={() => setLosingDeal(deal)}
                                className="h-6 px-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer"
                                title="Mark deal as Closed Lost"
                              >
                                <i className="fa-solid fa-circle-xmark text-[9px]" />
                                <span className="hidden sm:inline">Lost</span>
                              </button>
                            )}

                            {deal.stage === "Closed Won" && onGenerateInvoice && (
                              <button
                                type="button"
                                onClick={() => onGenerateInvoice(deal)}
                                className="h-6 px-1.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer"
                                title="Generate Invoice for Won Deal"
                              >
                                <i className="fa-solid fa-file-invoice-dollar text-[9px]" />
                                <span className="hidden sm:inline">Invoice</span>
                              </button>
                            )}
                            {onConvertToProposal && (
                              <button
                                type="button"
                                onClick={() => onConvertToProposal(deal)}
                                className={cn(
                                  "h-6 px-1.5 rounded border flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer",
                                  deal.stage === "Proposal Sent"
                                    ? "bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                    : "bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30"
                                )}
                                title="Create / View Proposal for this Deal"
                              >
                                <i className="fa-solid fa-file-contract text-[9px]" />
                                <span className="hidden sm:inline">Quote</span>
                              </button>
                            )}

                            {/* Stage History & Audit Trail Button */}
                            <button
                              type="button"
                              onClick={() => setHistoryDeal(deal)}
                              className="h-6 w-6 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                              title="View Stage History & Audit Trail"
                            >
                              <i className="fa-solid fa-clock-rotate-left" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {columnDeals.length === 0 && (
                    <div
                      className={cn(
                        "py-14 text-center rounded-xl border border-dashed transition-colors flex flex-col items-center justify-center gap-1",
                        isColOver ? "border-primary bg-primary/5 text-primary" : "border-border/60 text-muted-foreground/60"
                      )}
                    >
                      <i className={cn("text-2xl mb-1", isColOver ? "fa-solid fa-cloud-arrow-down fa-bounce text-primary" : "fa-solid fa-inbox opacity-30")} />
                      <p className="text-[11px] font-semibold">{isColOver ? "Drop to move here" : "No deals"}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <Card className="rounded-2xl border border-border/80 shadow-xs overflow-hidden">
          <CardHeader className="p-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">All Sales Deals</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Detailed table of all active &amp; archived deals
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                <Input
                  placeholder="Search deals, clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs w-44"
                />
              </div>

              {/* Owner Filter */}
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="h-8 text-xs rounded-lg border border-border bg-background px-2 text-foreground font-semibold cursor-pointer focus:outline-none"
              >
                <option value="All">All Owners</option>
                {distinctOwners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>

              {/* Venture Filter */}
              <select
                value={ventureFilter}
                onChange={(e) => setVentureFilter(e.target.value)}
                className="h-8 text-xs rounded-lg border border-border bg-background px-2 text-foreground font-semibold cursor-pointer focus:outline-none"
              >
                <option value="All">All Ventures</option>
                {distinctVentures.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>

              {statusFilter !== "All" && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter("All");
                    onClearStageFilter?.();
                  }}
                  className="h-8 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                  title="Clear stage filter"
                >
                  <span>Stage: {statusFilter}</span>
                  <i className="fa-solid fa-xmark text-[10px]" />
                </button>
              )}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 text-xs rounded-lg border border-border bg-background px-2.5 text-foreground font-semibold cursor-pointer focus:outline-none"
              >
                <option value="All">All Stages</option>
                {Object.keys(STAGE_CONFIG).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-left">Deal Name</th>
                  <th className="py-3 px-3 text-left">Client Account</th>
                  <th className="py-3 px-3 text-right">Value</th>
                  <th className="py-3 px-3 text-right">Weighted</th>
                  <th className="py-3 px-3 text-center">Stage</th>
                  <th className="py-3 px-3 text-center">Probability</th>
                  <th className="py-3 px-3 text-left">Owner</th>
                  <th className="py-3 px-3 text-left">Expected Close</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDeals.map((deal) => {
                  const stageInfo = STAGE_CONFIG[deal.stage] || STAGE_CONFIG.Prospecting;
                  const weightedVal = Math.round(((deal.dealValue || 0) * (deal.probability || 0)) / 100);
                  const matchedLead = leads.find(
                    (l) =>
                      (l.companyName && deal.clientAccount && l.companyName.toLowerCase() === deal.clientAccount.toLowerCase()) ||
                      (l.leadName && deal.dealName && deal.dealName.toLowerCase().includes(l.leadName.toLowerCase()))
                  );

                  return (
                    <tr
                      key={deal._id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                      onClick={() => onEditDeal(deal)}
                    >
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div className="hover:text-primary transition-colors">{deal.dealName}</div>
                        {deal.notes && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {deal.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewLead?.(deal.clientAccount);
                            }}
                            className="hover:text-primary font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            title={`View Lead for "${deal.clientAccount}"`}
                          >
                            <span>{deal.clientAccount}</span>
                            {onViewLead && <i className="fa-solid fa-arrow-up-right-from-square text-[8px] opacity-0 group-hover:opacity-70 text-primary" />}
                          </button>
                          {matchedLead && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20" title={`Lead: ${matchedLead.leadName}`}>
                              Lead
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                        {formatUSD(deal.dealValue)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-indigo-600 dark:text-indigo-400">
                        {formatUSD(weightedVal)}
                      </td>
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {onStageChange ? (
                          <select
                            value={deal.stage}
                            onChange={(e) => onStageChange(deal._id, e.target.value as SalesDeal["stage"])}
                            className={cn(
                              "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md border cursor-pointer outline-none transition-colors",
                              stageInfo.bg,
                              stageInfo.text,
                              stageInfo.border
                            )}
                            title="Change stage"
                          >
                            {STAGE_ORDER.map((s) => (
                              <option key={s} value={s} className="bg-card text-foreground font-semibold">
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md border whitespace-nowrap",
                              stageInfo.bg,
                              stageInfo.text,
                              stageInfo.border
                            )}
                          >
                            <i className={cn("fa-solid text-[9px]", stageInfo.icon)} />
                            {stageInfo.label}
                          </span>
                        )}
                        {(() => {
                          const daysInStage = getDealStageDuration(deal);
                          if (deal.stage === "Closed Won" || deal.stage === "Closed Lost") return null;
                          const isStale = daysInStage >= 14;
                          return (
                            <div className={cn("text-[9px] font-semibold mt-1", isStale ? "text-amber-500 font-bold flex items-center gap-0.5" : "text-muted-foreground")}>
                              {isStale && <i className="fa-solid fa-triangle-exclamation text-[8px]" />}
                              <span>{daysInStage}d in stage</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-semibold">
                        {deal.probability}%
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{deal.owner || "—"}</td>
                      <td className="py-3 px-3 text-muted-foreground font-mono">
                        {deal.expectedClose || "—"}
                      </td>
                      <td
                        className="py-3 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {deal.stage !== "Closed Won" && onStageChange && (
                            <button
                              type="button"
                              onClick={() => {
                                onStageChange(deal._id, "Closed Won");
                                if (onGenerateInvoice) onGenerateInvoice(deal);
                              }}
                              className="w-7 h-7 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center cursor-pointer transition-colors"
                              title="Quick Win: Mark Won & Generate Invoice"
                            >
                              <i className="fa-solid fa-trophy text-[10px]" />
                            </button>
                          )}
                          {deal.stage !== "Closed Lost" && (
                            <button
                              type="button"
                              onClick={() => setLosingDeal(deal)}
                              className="w-7 h-7 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center cursor-pointer transition-colors"
                              title="Mark Closed Lost"
                            >
                              <i className="fa-solid fa-circle-xmark text-[10px]" />
                            </button>
                          )}
                          {deal.stage === "Closed Won" && onGenerateInvoice && (
                            <button
                              type="button"
                              onClick={() => onGenerateInvoice(deal)}
                              className="w-7 h-7 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center cursor-pointer transition-colors"
                              title="Generate Invoice for Won Deal"
                            >
                              <i className="fa-solid fa-file-invoice-dollar text-[10px]" />
                            </button>
                          )}
                          {onConvertToProposal && (
                            <button
                              type="button"
                              onClick={() => onConvertToProposal(deal)}
                              className="w-7 h-7 rounded-md bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center justify-center cursor-pointer transition-colors"
                              title="Create Proposal"
                            >
                              <i className="fa-solid fa-file-contract text-[10px]" />
                            </button>
                          )}

                          {/* History & Audit Trail Button */}
                          <button
                            type="button"
                            onClick={() => setHistoryDeal(deal)}
                            className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            title="View Stage History & Audit Trail"
                          >
                            <i className="fa-solid fa-clock-rotate-left text-[10px]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onEditDeal(deal)}
                            className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit"
                          >
                            <i className="fa-solid fa-pen text-[10px]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDeal(deal._id, deal.dealName)}
                            className="w-7 h-7 rounded-md bg-muted hover:bg-rose-500/15 flex items-center justify-center text-muted-foreground hover:text-rose-500 cursor-pointer"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash text-[10px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDeals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-muted-foreground">
                      <i className="fa-solid fa-handshake-slash text-2xl mb-2 block opacity-30" />
                      <p className="text-xs font-semibold">No deals match your search criteria.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── MODAL: Structured Closed Lost Reason Recorder ── */}
      {losingDeal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setLosingDeal(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-base border border-rose-500/20 shrink-0">
                  <i className="fa-solid fa-circle-xmark" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Mark Deal as Closed Lost</h3>
                  <p className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                    {losingDeal.dealName} ({losingDeal.clientAccount})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLosingDeal(null)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Primary Reason for Loss</label>
                <select
                  value={lossReasonCategory}
                  onChange={(e) => setLossReasonCategory(e.target.value)}
                  className="w-full h-9 rounded-lg border border-input bg-background px-2.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="Budget / Price Constraint">Budget / Price Constraint</option>
                  <option value="Competitor Selected">Competitor Selected</option>
                  <option value="Project Deferred / Timing Issue">Project Deferred / Timing Issue</option>
                  <option value="Scope / Technical Mismatch">Scope / Technical Mismatch</option>
                  <option value="Client Unresponsive / Ghosted">Client Unresponsive / Ghosted</option>
                  <option value="Other / Internal Restructuring">Other / Internal Restructuring</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-foreground">Additional Context / Debrief Notes</label>
                <textarea
                  rows={3}
                  value={lossNote}
                  onChange={(e) => setLossNote(e.target.value)}
                  placeholder="e.g. Client opted for incumbent vendor due to pre-existing contract..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <Button type="button" variant="outline" size="sm" onClick={() => setLosingDeal(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1.5 cursor-pointer"
                onClick={() => {
                  const combinedNotes = lossNote.trim()
                    ? `[Lost: ${lossReasonCategory}] ${lossNote.trim()}`
                    : `[Lost: ${lossReasonCategory}]`;
                  onStageChange?.(losingDeal._id, "Closed Lost", combinedNotes);
                  setLosingDeal(null);
                  setLossNote("");
                }}
              >
                <i className="fa-solid fa-circle-xmark text-xs" />
                Confirm Closed Lost
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── DEAL STAGE HISTORY & AUDIT TRAIL MODAL ── */}
      {historyDeal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm shrink-0">
                  <i className="fa-solid fa-clock-rotate-left" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-foreground tracking-tight">
                    Deal Stage &amp; Audit History
                  </h4>
                  <p className="text-xs text-muted-foreground truncate max-w-xs">
                    {historyDeal.dealName} &bull; <strong className="text-foreground">{historyDeal.clientAccount}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryDeal(null)}
                className="w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>

            {/* Current Summary Bar */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-muted/40 rounded-xl border border-border/60 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Stage</p>
                <span className="text-xs font-extrabold text-primary">{historyDeal.stage}</span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Deal Value</p>
                <span className="text-xs font-mono font-bold text-foreground">{formatUSD(historyDeal.dealValue)}</span>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Probability</p>
                <span className="text-xs font-mono font-bold text-foreground">{historyDeal.probability}%</span>
              </div>
            </div>

            {/* Vertical Timeline */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border/70" />

                {historyDeal.stageHistory && historyDeal.stageHistory.length > 0 ? (
                  [...historyDeal.stageHistory].reverse().map((entry, idx, revArr) => {
                    const stageConfig = STAGE_CONFIG[entry.toStage as SalesDeal["stage"]] || STAGE_CONFIG.Prospecting;
                    return (
                      <div key={idx} className="relative flex items-start gap-3">
                        <div
                          className="absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] z-10 bg-background"
                          style={{ borderColor: stageConfig.color, color: stageConfig.color }}
                        >
                          <i className={cn("fa-solid", stageConfig.icon)} />
                        </div>
                        <div className="bg-card border border-border/70 rounded-xl p-3 flex-1 shadow-2xs space-y-1 hover:border-primary/40 transition-colors">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                              {entry.fromStage ? (
                                <>
                                  <span className="text-muted-foreground font-normal">{entry.fromStage}</span>
                                  <span className="text-primary text-[10px]">&rarr;</span>
                                  <span style={{ color: stageConfig.color }}>{entry.toStage}</span>
                                </>
                              ) : (
                                <span style={{ color: stageConfig.color }}>{entry.toStage}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {(() => {
                                const prevChronEvent = revArr[idx + 1];
                                if (!prevChronEvent) return null;
                                const diffMs = new Date(entry.timestamp).getTime() - new Date(prevChronEvent.timestamp).getTime();
                                if (isNaN(diffMs) || diffMs < 0) return null;
                                const daysSpent = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                const hoursSpent = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                return (
                                  <span className="text-[9px] font-semibold text-muted-foreground bg-muted/70 border border-border/50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <i className="fa-solid fa-hourglass-half text-[7px] text-primary" />
                                    <span>{daysSpent > 0 ? `${daysSpent}d ${hoursSpent}h` : `${hoursSpent || "<1"}h`} in {prevChronEvent.toStage}</span>
                                  </span>
                                );
                              })()}
                              <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                <i className="fa-solid fa-clock text-[8px]" />
                                {new Date(entry.timestamp).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/40 italic">
                              &ldquo;{entry.notes}&rdquo;
                            </p>
                          )}
                          <p className="text-[10px] text-muted-foreground pt-0.5">
                            Recorded by: <strong className="text-foreground">{entry.changedByName || "System"}</strong>
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="relative flex items-start gap-3">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full border-2 border-primary bg-primary text-primary-foreground flex items-center justify-center text-[8px] z-10">
                      <i className="fa-solid fa-flag-checkered" />
                    </div>
                    <div className="bg-card border border-border/70 rounded-xl p-3 flex-1 shadow-2xs space-y-1">
                      <p className="text-xs font-bold text-foreground">Deal Initialized</p>
                      <p className="text-xs text-muted-foreground">
                        Starting stage: <strong>{historyDeal.stage}</strong>
                      </p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
                        <i className="fa-solid fa-clock text-[8px]" />
                        {historyDeal.createdAt ? new Date(historyDeal.createdAt).toLocaleDateString() : "Created recently"}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Log Activity / Timeline Note */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-pen-to-square text-primary text-[11px]" />
                  <span>Log Activity / Note</span>
                </span>
                <span className="text-[10px] text-muted-foreground">Appends directly to deal timeline</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={logActivityType}
                  onChange={(e) => setLogActivityType(e.target.value)}
                  className="h-8 text-xs font-semibold rounded-lg border border-border bg-background px-2 text-foreground focus:outline-none"
                >
                  <option value="Meeting Held">Meeting Held</option>
                  <option value="Phone Call">Phone Call</option>
                  <option value="Email Sent">Email Sent</option>
                  <option value="Requirement Update">Requirement Update</option>
                  <option value="Internal Note">Internal Note</option>
                </select>
                <input
                  type="text"
                  value={logActivityNote}
                  onChange={(e) => setLogActivityNote(e.target.value)}
                  placeholder="Add quick update or client debrief..."
                  className="flex-1 min-w-[180px] h-8 text-xs px-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleLogActivity();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleLogActivity}
                  disabled={submittingActivity || !logActivityNote.trim()}
                  className="h-8 px-3 text-xs font-bold gap-1.5 cursor-pointer"
                >
                  {submittingActivity ? (
                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                  ) : (
                    <i className="fa-solid fa-plus text-xs" />
                  )}
                  Log Note
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-end">
              <Button type="button" size="sm" variant="outline" onClick={() => setHistoryDeal(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
