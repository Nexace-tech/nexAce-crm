"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Lead } from "@/components/bd/LeadDetailPanel";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";

export type { SalesDeal };

interface SalesExecutiveDashboardProps {
  deals: SalesDeal[];
  leads: Lead[];
  proposalsCount?: number;
  onNavigateToLeads?: (filterOwner?: string) => void;
  onNavigateToDeals?: (stageFilter?: string) => void;
  onNavigateToProposals?: () => void;
  onOpenDealModal?: (prefillOwner?: string) => void;
  onEditDeal?: (deal: SalesDeal) => void;
  onOpenLead?: (lead: Lead) => void;
  onRefresh?: () => void;
  onStageChange?: (dealId: string, newStage: SalesDeal["stage"]) => void;
  onGenerateInvoice?: (deal: SalesDeal) => void;
}


// Dynamically generated Executive Sales Rep model
export interface DynamicSalesRep {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  avatarBg: string;
  dealsClosed: number;
  totalDeals: number;
  revenue: number;
  quota: number;
  conversionPct: number;
  status: "Excellent" | "Good" | "Average";
  calls: number;
  emails: number;
  meetings: number;
  commission: number;
  territory: string;
  joinDate: string;
  stalledDealsCount: number;
  assignedDeals: SalesDeal[];
  assignedLeads: Lead[];
}

const REP_COLORS = [
  "bg-indigo-600",
  "bg-rose-600",
  "bg-amber-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-sky-600",
  "bg-blue-600",
  "bg-teal-600",
];

const TERRITORIES = [
  "North America (East)",
  "EMEA & UK",
  "APAC & Gulf",
  "North America (West)",
  "LATAM",
  "Enterprise Accounts",
  "Global Operations",
];

export function SalesExecutiveDashboard({
  deals,
  leads,
  proposalsCount = 0,
  onNavigateToLeads,
  onNavigateToDeals,
  onNavigateToProposals,
  onOpenDealModal,
  onEditDeal,
  onOpenLead,
  onRefresh,
  onStageChange,
  onGenerateInvoice,
}: SalesExecutiveDashboardProps) {

  // ── Filters & Timeframes ──
  const [timeframe, setTimeframe] = useState<"Weekly" | "Monthly" | "Last 6 Months" | "Yearly">("Yearly");
  const [salespersonTimeframe, setSalespersonTimeframe] = useState<"Last Month" | "Last 3 Months" | "Last 6 Months">("Last 6 Months");
  const [dealsYear, setDealsYear] = useState<"2026" | "2025" | "2024">("2026");
  const [forecastYear, setForecastYear] = useState<"2026" | "2025" | "2024">("2026");
  const [tableFilter, setTableFilter] = useState<"All" | "Excellent" | "Good" | "Average">("All");
  const [tableSortBy, setTableSortBy] = useState<"revenue_desc" | "deals_desc" | "conversion_desc" | "name">("revenue_desc");
  const [searchRep, setSearchRep] = useState("");

  // ── Dropdowns & Dialogs ──
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showSalespersonDropdown, setShowSalespersonDropdown] = useState(false);
  const [showDealsYearDropdown, setShowDealsYearDropdown] = useState(false);
  const [showForecastDropdown, setShowForecastDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Target Quota State — persisted to localStorage so it survives navigation ──
  const [teamTargetQuota, setTeamTargetQuota] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexace_bd_team_quota");
      if (saved) return Number(saved) || 400000;
    }
    return 400000;
  });
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetQuotaInput, setTargetQuotaInput] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nexace_bd_team_quota");
      return saved || "400000";
    }
    return "400000";
  });
  const [targetPeriod, setTargetPeriod] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nexace_bd_target_period") || "2026 Annual Target";
    }
    return "2026 Annual Target";
  });

  // ── Rep Profile Drilldown & Scenario Modal ──
  const [selectedRep, setSelectedRep] = useState<DynamicSalesRep | null>(null);
  const [showScenarioSimulator, setShowScenarioSimulator] = useState(false);

  // ── Scenario Simulator Sliders ──
  const [simLeadMultiplier, setSimLeadMultiplier] = useState(0); // -30% to +50%
  const [simWinRateDelta, setSimWinRateDelta] = useState(0); // -15% to +20%
  const [simAvgDealSize, setSimAvgDealSize] = useState(45000); // $10k to $100k

  // ── Forecast Chart Hover ──
  const [hoveredMonth, setHoveredMonth] = useState<{ month: string; projected: number; actual: number } | null>(null);

  // ══════════════════════════════════════════════════════════
  // ── 1. DYNAMICALLY COMPILE ALL SALES REPS FROM DATA FLOW ──
  // ══════════════════════════════════════════════════════════
  // ── 1. DYNAMICALLY COMPILE ALL SALES REPS FROM DATA FLOW ──
  // ══════════════════════════════════════════════════════════
  const dynamicReps: DynamicSalesRep[] = useMemo(() => {
    // Collect all distinct owners across live deals & leads
    const ownerSet = new Set<string>();
    deals.forEach(d => { if (d.owner?.trim()) ownerSet.add(d.owner.trim()); });
    leads.forEach(l => { if (l.owner?.trim()) ownerSet.add(l.owner.trim()); });

    // Only inject default team when DB has absolutely zero owners
    if (ownerSet.size === 0) {
      ["Sara Khan", "Ahmed Raza", "Bilal Hassan", "Fatima Noor", "Omar Malik"].forEach(n => ownerSet.add(n));
    }

    const owners = Array.from(ownerSet);
    const perRepQuota = Math.round(teamTargetQuota / Math.max(1, owners.length));

    return owners.map((name, idx) => {
      const assignedDeals = deals.filter(d => (d.owner || "").toLowerCase() === name.toLowerCase());
      const assignedLeads = leads.filter(l => (l.owner || "").toLowerCase() === name.toLowerCase());

      const wonDeals = assignedDeals.filter(d => d.stage === "Closed Won");
      const closedLeads = assignedLeads.filter(l => l.status === "Closed");

      // Dynamic closed revenue calculation purely from real data
      const dealWonVal = wonDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
      const leadWonVal = closedLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
      const totalRevenue = dealWonVal + leadWonVal;

      // Dynamic closed deals count
      const closedCount = wonDeals.length + closedLeads.length;
      const totalOpportunities = assignedDeals.length + assignedLeads.length;

      // Win rate percentage
      const conversionPct = totalOpportunities > 0 ? Math.round((closedCount / totalOpportunities) * 100) : 0;

      // Touchpoints dynamically correlated to real lead stages & status
      const calls = assignedLeads.filter(l => l.status === "Contacted" || l.stage === "Follow Up").length * 6;
      const emails = assignedLeads.length * 8;
      const meetings = assignedLeads.filter(l => l.stage === "Schedule Service" || l.stage === "Conversation").length * 2;

      const status: "Excellent" | "Good" | "Average" = conversionPct >= 70 ? "Excellent" : conversionPct >= 35 ? "Good" : "Average";
      const commission = Math.round(totalRevenue * 0.1);

      const stalledDealsCount = assignedDeals.filter(d => {
        if (d.stage === "Closed Won" || d.stage === "Closed Lost") return false;
        const lastHistory = d.stageHistory && d.stageHistory.length > 0
          ? d.stageHistory[d.stageHistory.length - 1]
          : null;
        const lastDate = lastHistory?.timestamp || (d as any).updatedAt || (d as any).createdAt;
        if (!lastDate) return false;
        const days = Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));
        return days >= 14;
      }).length;

      return {
        id: `rep-${idx + 1}`,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}@nexace.com`,
        phone: `+1 555-0${120 + idx * 11}`,
        role: idx === 0 ? "Enterprise Sales Lead" : idx === 1 ? "Key Account Manager" : idx === 2 ? "Senior Account Executive" : "BD Executive",
        avatarBg: REP_COLORS[idx % REP_COLORS.length],
        dealsClosed: closedCount,
        totalDeals: totalOpportunities,
        revenue: totalRevenue,
        quota: perRepQuota,
        conversionPct,
        status,
        calls,
        emails,
        meetings,
        commission,
        territory: TERRITORIES[idx % TERRITORIES.length],
        joinDate: `Q${(idx % 4) + 1} 2024`,
        stalledDealsCount,
        assignedDeals,
        assignedLeads,
      };
    });
  }, [deals, leads, teamTargetQuota]);

  // ══════════════════════════════════════════════════════════
  // ── 2. DYNAMICALLY COMPUTE AGGREGATED DASHBOARD METRICS ──
  // ══════════════════════════════════════════════════════════
  const totalClosedRevenue = useMemo(() => {
    return deals.filter(d => d.stage === "Closed Won").reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
  }, [deals]);

  const totalClosedDealsCount = useMemo(() => {
    return deals.filter(d => d.stage === "Closed Won").length;
  }, [deals]);

  const targetAchievementPct = useMemo(() => {
    if (teamTargetQuota <= 0) return 100;
    return Math.min(100, Math.round((totalClosedRevenue / teamTargetQuota) * 100));
  }, [totalClosedRevenue, teamTargetQuota]);

  const totalCalls = useMemo(() => dynamicReps.reduce((s, r) => s + r.calls, 0), [dynamicReps]);
  const totalEmails = useMemo(() => dynamicReps.reduce((s, r) => s + r.emails, 0), [dynamicReps]);
  const totalMeetings = useMemo(() => dynamicReps.reduce((s, r) => s + r.meetings, 0), [dynamicReps]);

  // Conversion split computation purely from live deals
  const conversionSplit = useMemo(() => {
    const wonCount = deals.filter(d => d.stage === "Closed Won").length;
    const lostCount = deals.filter(d => d.stage === "Closed Lost").length;
    const activeCount = deals.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost").length;
    const total = wonCount + lostCount + activeCount;
    const wonPct = total > 0 ? Math.round((wonCount / total) * 100) : 0;
    const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;
    const lostPct = total > 0 ? Math.max(0, 100 - wonPct - activePct) : 0;
    return { wonCount, wonPct, activeCount, activePct, lostCount, lostPct };
  }, [deals]);

  // Full-lifecycle conversion ratios (Lead -> Deal -> Proposal -> Won)
  const lifecycleFunnel = useMemo(() => {
    const totalLeads = leads.length;
    const totalDeals = deals.length;
    const totalProps = proposalsCount;
    const totalWon = deals.filter(d => d.stage === "Closed Won").length;

    const leadToDealPct = totalLeads > 0 ? Math.min(100, Math.round((totalDeals / totalLeads) * 100)) : 0;
    const dealToPropPct = totalDeals > 0 ? Math.min(100, Math.round((totalProps / totalDeals) * 100)) : 0;
    const propToWonPct = totalProps > 0 ? Math.min(100, Math.round((totalWon / totalProps) * 100)) : 0;
    const winRate = (deals.filter(d => d.stage === "Closed Won" || d.stage === "Closed Lost").length > 0)
      ? Math.round((totalWon / deals.filter(d => d.stage === "Closed Won" || d.stage === "Closed Lost").length) * 100)
      : 0;

    return {
      totalLeads,
      totalDeals,
      totalProps,
      totalWon,
      leadToDealPct,
      dealToPropPct,
      propToWonPct,
      winRate,
    };
  }, [leads.length, deals, proposalsCount]);

  // Stage pipeline volume calculated from real deals
  const pipelineBreakdown = useMemo(() => {
    const stages: Record<SalesDeal["stage"], { label: string; count: number; value: number; color: string; stageKey: SalesDeal["stage"] }> = {
      Prospecting:   { label: "Prospecting",   count: 0, value: 0, color: "from-purple-600 to-indigo-600", stageKey: "Prospecting" },
      Discovery:     { label: "Discovery",     count: 0, value: 0, color: "from-sky-600 to-blue-600", stageKey: "Discovery" },
      "Proposal Sent": { label: "Proposal",    count: 0, value: 0, color: "from-amber-500 to-orange-500", stageKey: "Proposal Sent" },
      Negotiation:   { label: "Negotiation",   count: 0, value: 0, color: "from-pink-500 to-rose-500", stageKey: "Negotiation" },
      "Closed Won":  { label: "Closing / Won", count: 0, value: 0, color: "from-emerald-500 to-teal-500", stageKey: "Closed Won" },
      "Closed Lost": { label: "Closed Lost",   count: 0, value: 0, color: "from-rose-500 to-red-600", stageKey: "Closed Lost" },
    };

    deals.forEach(d => {
      if (stages[d.stage]) {
        stages[d.stage].count += 1;
        stages[d.stage].value += Number(d.dealValue) || 0;
      }
    });

    const maxCount = Math.max(...Object.values(stages).map(s => s.count), 1);
    return Object.values(stages).map(s => ({
      name: s.label,
      dealsCount: s.count,
      value: s.value,
      pct: s.count > 0 ? Math.round((s.count / maxCount) * 100) : 0,
      color: s.color,
      stageKey: s.stageKey,
    }));
  }, [deals]);

  // Monthly forecast — built from real deal expectedClose dates bucketed by month
  const forecastMonths = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    // Bucket deals by expectedClose month for the selected forecastYear
    const wonByMonth = new Array(12).fill(0);
    const pipelineByMonth = new Array(12).fill(0);
    deals.forEach(d => {
      if (!d.expectedClose) return;
      const closeDate = new Date(d.expectedClose);
      if (isNaN(closeDate.getTime())) return;
      if (String(closeDate.getFullYear()) !== forecastYear) return;
      const m = closeDate.getMonth();
      const val = Number(d.dealValue) || 0;
      if (d.stage === "Closed Won") wonByMonth[m] += val;
      else pipelineByMonth[m] += val;
    });

    const projectedArr = monthNames.map((_, idx) => wonByMonth[idx] + pipelineByMonth[idx]);
    const actualArr = monthNames.map((_, idx) => wonByMonth[idx]);

    const maxVal = Math.max(...projectedArr, ...actualArr, 1000);
    return monthNames.map((month, idx) => {
      const projected = projectedArr[idx];
      const actual = actualArr[idx];
      const x = 50 + idx * (627 / 11);
      const yP = Math.max(15, Math.min(160, 160 - Math.round((projected / maxVal) * 140)));
      const yA = Math.max(10, Math.min(160, 160 - Math.round((actual / maxVal) * 140)));
      return { month, projected, actual, x, yP, yA };
    });
  }, [deals, forecastYear]);

  // Dynamic SVG paths for projected & actuals curves
  const forecastChartPaths = useMemo(() => {
    if (forecastMonths.length === 0) return { projectedPath: "", projectedArea: "", actualPath: "" };
    const projectedPath = forecastMonths.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yP}`).join(" ");
    const projectedArea = `${projectedPath} L ${forecastMonths[forecastMonths.length - 1].x} 170 L ${forecastMonths[0].x} 170 Z`;
    const actualPath = forecastMonths.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yA}`).join(" ");
    return { projectedPath, projectedArea, actualPath };
  }, [forecastMonths]);

  // Simulated projected revenue
  const simulatedProjectedRevenue = useMemo(() => {
    const base = totalClosedRevenue;
    const volumeFactor = 1 + (simLeadMultiplier / 100);
    const winFactor = 1 + (simWinRateDelta / 100);
    const sizeFactor = simAvgDealSize / 45000;
    return Math.round(base * volumeFactor * winFactor * sizeFactor);
  }, [totalClosedRevenue, simLeadMultiplier, simWinRateDelta, simAvgDealSize]);

  // Filtered and sorted representatives for leaderboard table
  const processedReps = useMemo(() => {
    let list = dynamicReps.filter(r => {
      const q = searchRep.toLowerCase();
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.territory.toLowerCase().includes(q);
      const matchStatus = tableFilter === "All" || r.status === tableFilter;
      return matchSearch && matchStatus;
    });

    if (tableSortBy === "revenue_desc") list = [...list].sort((a, b) => b.revenue - a.revenue);
    else if (tableSortBy === "deals_desc") list = [...list].sort((a, b) => b.dealsClosed - a.dealsClosed);
    else if (tableSortBy === "conversion_desc") list = [...list].sort((a, b) => b.conversionPct - a.conversionPct);
    else if (tableSortBy === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [dynamicReps, searchRep, tableFilter, tableSortBy]);

  const formatUSD = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
    return n.toLocaleString();
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh?.();
    setTimeout(() => setIsRefreshing(false), 600);
  };


  const handleExportCSV = () => {
    const headers = ["Executive Name", "Role", "Territory", "Email", "Phone", "Deals Closed", "Revenue Generated ($)", "Quota ($)", "Conversion %", "Status", "Commission ($)"];
    const rows = dynamicReps.map(r => [
      `"${r.name}"`,
      `"${r.role}"`,
      `"${r.territory}"`,
      `"${r.email}"`,
      `"${r.phone}"`,
      r.dealsClosed,
      r.revenue,
      r.quota,
      `${r.conversionPct}%`,
      `"${r.status}"`,
      r.commission,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Executive_Sales_Performance_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary flex items-center justify-center text-lg border border-primary/20 shadow-2xs shrink-0">
              <i className="fa-solid fa-chart-line" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2 flex-wrap">
                Executive Sales Dashboard
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Data Flow
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">High-level sales velocity, rep quotas, conversion leaderboards & forecasting</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Target Configuration Launcher */}
          <button
            type="button"
            onClick={() => setShowTargetModal(true)}
            className="flex items-center gap-1.5 bg-card hover:bg-muted/40 border border-border/80 px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-2xs"
            title="Set Team Targets & Quotas"
          >
            <i className="fa-solid fa-bullseye text-primary text-xs" />
            <span>Sales Quotas (${formatUSD(teamTargetQuota)})</span>
          </button>

          {/* Scenario Simulator Toggle */}
          <button
            type="button"
            onClick={() => setShowScenarioSimulator(!showScenarioSimulator)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs border",
              showScenarioSimulator
                ? "bg-purple-600 text-white border-purple-700 shadow-sm"
                : "bg-card hover:bg-muted/40 border-border/80 text-foreground"
            )}
            title="Toggle What-If Revenue Scenario Simulator"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-xs" />
            <span>{showScenarioSimulator ? "Hide Simulator" : "Scenario Simulator"}</span>
          </button>

          {/* Timeframe Selector */}
          <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
            {(["Weekly", "Monthly", "Last 6 Months", "Yearly"] as const).map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-3 py-1 text-xs font-bold transition-all rounded-md cursor-pointer",
                  timeframe === tf ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center gap-2 bg-card hover:bg-muted/40 border border-border/80 px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground transition-colors cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-file-export text-muted-foreground text-xs" />
              <span>Export</span>
              <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
            </button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted/40 flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-file-excel text-emerald-500 text-xs" />
                  <span>Export as Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => { window.print(); setShowExportDropdown(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted/40 flex items-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-file-pdf text-rose-500 text-xs" />
                  <span>Print / Save as PDF</span>
                </button>
              </div>
            )}
          </div>

          {/* New Deal button */}
          {onOpenDealModal && (
            <button
              type="button"
              onClick={() => onOpenDealModal()}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>New Deal</span>
            </button>
          )}

          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            className="w-8 h-8 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer shadow-2xs"
            title="Refresh Data"
          >
            <i className={cn("fa-solid fa-arrows-rotate text-xs", isRefreshing && "fa-spin")} />
          </button>
        </div>
      </div>

      {/* ── SCENARIO WHAT-IF SIMULATOR BANNER (EXPANDABLE) ── */}
      {showScenarioSimulator && (
        <div className="bg-gradient-to-br from-purple-900/10 via-card to-card border border-purple-500/30 rounded-2xl p-5 shadow-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm">
                <i className="fa-solid fa-wand-magic-sparkles" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground tracking-tight">Executive What-If Revenue Simulator</h3>
                <p className="text-xs text-muted-foreground">Adjust pipeline parameters to project forward cashflow impact</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium">Projected Revenue Output:</span>
              <span className="text-lg font-black font-mono text-purple-600 dark:text-purple-400">
                ${simulatedProjectedRevenue.toLocaleString()}
              </span>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                simulatedProjectedRevenue >= totalClosedRevenue ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              )}>
                {simulatedProjectedRevenue >= totalClosedRevenue ? "+" : ""}{(((simulatedProjectedRevenue - totalClosedRevenue) / totalClosedRevenue) * 100).toFixed(1)}% vs Current
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            {/* 1. Lead Volume Multiplier */}
            <div className="space-y-2 bg-card p-3.5 rounded-xl border border-border/70 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-user-tag text-blue-500 text-[11px]" /> Lead Generation Volume
                </span>
                <span className="font-mono font-bold text-primary">{simLeadMultiplier >= 0 ? `+${simLeadMultiplier}%` : `${simLeadMultiplier}%`}</span>
              </div>
              <input
                type="range"
                min="-30"
                max="50"
                step="5"
                value={simLeadMultiplier}
                onChange={e => setSimLeadMultiplier(Number(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>-30%</span>
                <span>Baseline (0%)</span>
                <span>+50%</span>
              </div>
            </div>

            {/* 2. Win Rate Delta */}
            <div className="space-y-2 bg-card p-3.5 rounded-xl border border-border/70 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-bullseye text-emerald-500 text-[11px]" /> Deal Win Rate Adjustment
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{simWinRateDelta >= 0 ? `+${simWinRateDelta}%` : `${simWinRateDelta}%`}</span>
              </div>
              <input
                type="range"
                min="-15"
                max="20"
                step="1"
                value={simWinRateDelta}
                onChange={e => setSimWinRateDelta(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>-15%</span>
                <span>Current ({conversionSplit.wonPct}%)</span>
                <span>+20%</span>
              </div>
            </div>

            {/* 3. Average Deal Size */}
            <div className="space-y-2 bg-card p-3.5 rounded-xl border border-border/70 shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-sack-dollar text-amber-500 text-[11px]" /> Average Deal Size
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">${simAvgDealSize.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="10000"
                max="100000"
                step="5000"
                value={simAvgDealSize}
                onChange={e => setSimAvgDealSize(Number(e.target.value))}
                className="w-full accent-amber-500 h-1.5 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>$10k</span>
                <span>$45k</span>
                <span>$100k</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ROW 1: 4 Key Executive KPI Cards + Activity Count & Conversion Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: 4 Stat Cards */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <h3 className="text-sm font-extrabold text-foreground tracking-tight">Executive Sales Performance Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Aggregated metrics dynamically computed from live deals & leads</p>
            </div>
            <span className="text-[11px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
              {timeframe} Metrics
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {/* 1. Sales Revenue */}
            <div
              onClick={() => onNavigateToDeals?.("Closed Won")}
              className="p-4 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent flex flex-col justify-between shadow-2xs hover:border-emerald-500/50 transition-all cursor-pointer group"
              title="Click to view Closed Won Deals"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                    <i className="fa-solid fa-arrow-trend-up" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-emerald-600 transition-colors">Sales Revenue</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Total closed deals</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-caret-up text-[10px]" />+12%
                </span>
              </div>
              <div className="flex items-end justify-between pt-2">
                <div>
                  <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">${formatUSD(totalClosedRevenue)}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">+12% vs Last Year</p>
                </div>
                {/* Mini Sparkline SVG */}
                <div className="w-20 h-10">
                  <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                    <path d="M 0 35 Q 20 20, 35 25 T 60 10 T 80 5" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="80" cy="5" r="3" fill="#10b981" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 2. New Customers */}
            <div
              onClick={() => onNavigateToLeads?.()}
              className="p-4 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent flex flex-col justify-between shadow-2xs hover:border-purple-500/50 transition-all cursor-pointer group"
              title="Click to view Customer Leads"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                    <i className="fa-solid fa-user-group" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-purple-600 transition-colors">New Customers</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Converted accounts</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-caret-up text-[10px]" />+8.2%
                </span>
              </div>
              <div className="flex items-end justify-between pt-2">
                <div>
                  <h3 className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 font-mono tracking-tight">{totalClosedDealsCount}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">+8.2% vs Last Year</p>
                </div>
                {/* Mini Sparkline SVG */}
                <div className="w-20 h-10">
                  <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                    <path d="M 0 30 Q 25 35, 45 15 T 70 20 T 80 8" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="80" cy="8" r="3" fill="#8b5cf6" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 3. Target Achievement */}
            <div
              onClick={() => setShowTargetModal(true)}
              className="p-4 rounded-xl border border-slate-500/20 bg-gradient-to-br from-slate-500/5 via-transparent to-transparent flex flex-col justify-between shadow-2xs hover:border-slate-500/50 transition-all cursor-pointer group"
              title="Click to configure sales targets"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 flex items-center justify-center text-base group-hover:scale-105 transition-transform">
                    <i className="fa-solid fa-bullseye" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">Target Quota</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Quota completion</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-caret-up text-[10px]" />{targetAchievementPct}%
                </span>
              </div>
              <div className="flex items-end justify-between pt-2">
                <div>
                  <h3 className="text-2xl font-extrabold text-foreground font-mono tracking-tight">{targetAchievementPct}%</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">${formatUSD(totalClosedRevenue)} of ${formatUSD(teamTargetQuota)} target</p>
                </div>
                {/* Mini Progress Bar */}
                <div className="w-24 space-y-1">
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-slate-700 dark:bg-slate-300 rounded-full transition-all duration-500" style={{ width: `${targetAchievementPct}%` }} />
                  </div>
                  <p className="text-[10px] text-right font-mono text-muted-foreground font-bold">{targetAchievementPct}%</p>
                </div>
              </div>
            </div>

            {/* 4. Profit Margin */}
            <div className="p-4 rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-transparent to-transparent flex flex-col justify-between shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 flex items-center justify-center text-base">
                    <i className="fa-solid fa-coins" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Net Margin</p>
                    <p className="text-[11px] text-muted-foreground font-medium">Gross revenue return</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <i className="fa-solid fa-caret-up text-[10px]" />+1.2%
                </span>
              </div>
              <div className="flex items-end justify-between pt-2">
                <div>
                  <h3 className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 font-mono tracking-tight">40%</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">+1.2% vs Last Year</p>
                </div>
                {/* Mini Sparkline SVG */}
                <div className="w-20 h-10">
                  <svg viewBox="0 0 80 40" className="w-full h-full overflow-visible">
                    <path d="M 0 30 Q 30 15, 50 25 T 80 10" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="80" cy="10" r="3" fill="#0284c7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Activity Count & Conversion Split */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Activity Count Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-extrabold text-foreground tracking-tight">Touchpoint Velocity</h3>
              <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded">Weekly Total</span>
            </div>

            <div className="space-y-3.5 pt-3">
              {/* Calls */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="88" strokeDashoffset="26" strokeLinecap="round" />
                    </svg>
                    <i className="fa-solid fa-phone text-[10px] text-emerald-600 dark:text-emerald-400 absolute" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Calls Made</p>
                    <p className="text-[10px] text-muted-foreground">70% quota reached</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-foreground font-mono">{totalCalls}</p>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">+12%</span>
                </div>
              </div>

              {/* Emails */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray="88" strokeDashoffset="13" strokeLinecap="round" />
                    </svg>
                    <i className="fa-solid fa-envelope text-[10px] text-purple-600 dark:text-purple-400 absolute" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Emails Sent</p>
                    <p className="text-[10px] text-muted-foreground">85% quota reached</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-foreground font-mono">{totalEmails}</p>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">+22%</span>
                </div>
              </div>

              {/* Meetings */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/40" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#0284c7" strokeWidth="3" strokeDasharray="88" strokeDashoffset="44" strokeLinecap="round" />
                    </svg>
                    <i className="fa-solid fa-video text-[10px] text-sky-600 dark:text-sky-400 absolute" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Client Demos</p>
                    <p className="text-[10px] text-muted-foreground">50% quota reached</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-foreground font-mono">{totalMeetings}</p>
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">+15%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Split Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight pb-3 border-b border-border/60">Conversion Split</h3>
            <div className="flex items-center justify-between gap-4 pt-3">
              {/* Donut Chart */}
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="5" className="dark:stroke-slate-800" />
                  {/* Converted */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="5"
                    strokeDasharray="88"
                    strokeDashoffset={88 - (88 * conversionSplit.wonPct) / 100}
                    strokeLinecap="round"
                  />
                  {/* In Progress */}
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="5"
                    strokeDasharray="88"
                    strokeDashoffset={88 - (88 * (conversionSplit.wonPct + conversionSplit.activePct)) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-extrabold text-foreground font-mono">{conversionSplit.wonPct}%</span>
                  <span className="text-[8px] text-muted-foreground uppercase font-bold">Won</span>
                </div>
              </div>

              {/* Legends */}
              <div className="space-y-2 flex-1">
                <div
                  onClick={() => onNavigateToDeals?.("Closed Won")}
                  className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  title="View Won Deals"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-foreground">Converted ({conversionSplit.wonCount})</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">{conversionSplit.wonPct}%</span>
                </div>
                <div
                  onClick={() => onNavigateToDeals?.()}
                  className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-between hover:bg-purple-500/20 transition-colors cursor-pointer"
                  title="View Deals Pipeline"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-[11px] font-bold text-foreground">In Pipeline ({conversionSplit.activeCount})</span>
                  </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 font-mono">{conversionSplit.activePct}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Top Revenue per Salesperson + Top Deals Closed per User ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Revenue per Salesperson */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <h3 className="text-sm font-extrabold text-foreground tracking-tight">Top Revenue per Salesperson</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Click any representative to open profile drawer</p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSalespersonDropdown(!showSalespersonDropdown)}
                className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted/70 px-2.5 py-1 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <span>{salespersonTimeframe}</span>
                <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
              </button>
              {showSalespersonDropdown && (
                <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                  {(["Last Month", "Last 3 Months", "Last 6 Months"] as const).map(tf => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => { setSalespersonTimeframe(tf); setShowSalespersonDropdown(false); }}
                      className={cn("w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer", salespersonTimeframe === tf ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground")}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Horizontal Bar Chart for Reps */}
          <div className="space-y-3.5 pt-4">
            {dynamicReps.slice(0, 5).map((rep) => {
              const maxRev = Math.max(...dynamicReps.map(r => r.revenue), 1);
              const widthPct = Math.round((rep.revenue / maxRev) * 100);
              return (
                <div
                  key={rep.id}
                  onClick={() => setSelectedRep(rep)}
                  className="group cursor-pointer hover:bg-muted/30 p-2 rounded-xl transition-all border border-transparent hover:border-border/60"
                  title={`Click to view ${rep.name}'s profile & quota stats`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0", rep.avatarBg)}>
                        {rep.name.split(" ").map(w => w[0]).join("")}
                      </div>
                      <span className="font-bold text-foreground group-hover:text-primary transition-colors">{rep.name}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">({rep.territory})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold font-mono text-foreground">${rep.revenue.toLocaleString()}</span>
                      <i className="fa-solid fa-chevron-right text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-700"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Deals Closed per User */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <h3 className="text-sm font-extrabold text-foreground tracking-tight">Top Deals Closed per User</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Annual volume breakdown per executive</p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDealsYearDropdown(!showDealsYearDropdown)}
                className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted/70 px-2.5 py-1 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <span>{dealsYear}</span>
                <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
              </button>
              {showDealsYearDropdown && (
                <div className="absolute right-0 mt-1 w-28 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                  {(["2026", "2025", "2024"] as const).map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => { setDealsYear(yr); setShowDealsYearDropdown(false); }}
                      className={cn("w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer", dealsYear === yr ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground")}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vertical Columns Representation */}
          <div className="pt-4 flex items-end justify-between gap-3 h-52">
            {dynamicReps.slice(0, 5).map((rep) => {
              const maxDeals = Math.max(...dynamicReps.map(r => r.dealsClosed), 1);
              const heightPct = Math.round((rep.dealsClosed / maxDeals) * 100);
              return (
                <div
                  key={rep.id}
                  onClick={() => setSelectedRep(rep)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  title={`${rep.name}: ${rep.dealsClosed} deals closed ($${rep.revenue.toLocaleString()})`}
                >
                  <span className="text-[11px] font-bold font-mono text-foreground mb-1 group-hover:text-primary transition-colors">{rep.dealsClosed}</span>
                  <div className="w-full max-w-[42px] bg-muted/40 rounded-t-lg h-full max-h-36 flex items-end p-1">
                    <div
                      className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 rounded-md transition-all duration-500"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground truncate w-full text-center mt-2 group-hover:text-foreground transition-colors">
                    {rep.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── ROW 3: Pipeline Velocity & Revenue Forecast ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Pipeline Stages */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <h3 className="text-sm font-extrabold text-foreground tracking-tight">Pipeline Breakdown</h3>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                Active Velocity
              </span>
            </div>

            <div className="space-y-3.5 pt-4">
              {pipelineBreakdown.map((stage) => (
                <div
                  key={stage.name}
                  onClick={() => onNavigateToDeals?.(stage.stageKey)}
                  className="group cursor-pointer hover:bg-muted/30 p-2 rounded-xl transition-all border border-transparent hover:border-border/60"
                  title={`View deals in ${stage.name}`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-muted-foreground group-hover:text-primary transition-colors">{stage.name}</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="font-extrabold text-foreground text-xs">{stage.dealsCount} Deals</span>
                      <span className="text-[11px] text-muted-foreground font-semibold">(${formatUSD(stage.value)})</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", stage.color)}
                      style={{ width: `${stage.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Lifecycle Conversion Ratios Funnel */}
            <div className="mt-4 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between text-[11px] font-bold text-foreground mb-2">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-filter text-purple-500 text-[10px]" />
                  Lifecycle Velocity Funnel
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{lifecycleFunnel.winRate}% Win</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div
                  onClick={() => onNavigateToLeads?.()}
                  className="p-1.5 rounded-lg bg-muted/40 border border-border/60 hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer"
                  title="Click to view Leads"
                >
                  <p className="text-muted-foreground font-medium truncate">Lead ➔ Deal</p>
                  <p className="font-black font-mono text-primary text-xs mt-0.5">{lifecycleFunnel.leadToDealPct}%</p>
                </div>
                <div
                  onClick={() => onNavigateToProposals?.()}
                  className="p-1.5 rounded-lg bg-muted/40 border border-border/60 hover:bg-amber-500/10 hover:border-amber-500/30 transition-colors cursor-pointer"
                  title="Click to view Proposals"
                >
                  <p className="text-muted-foreground font-medium truncate">Deal ➔ Quote</p>
                  <p className="font-black font-mono text-amber-600 dark:text-amber-400 text-xs mt-0.5">{lifecycleFunnel.dealToPropPct}%</p>
                </div>
                <div
                  onClick={() => onNavigateToDeals?.("Closed Won")}
                  className="p-1.5 rounded-lg bg-muted/40 border border-border/60 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors cursor-pointer"
                  title="Click to view Won Deals"
                >
                  <p className="text-muted-foreground font-medium truncate">Quote ➔ Won</p>
                  <p className="font-black font-mono text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">{lifecycleFunnel.propToWonPct}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded">30%</span>
              <p className="text-[11px] text-muted-foreground font-medium">Higher velocity vs prior period</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToDeals?.()}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              Pipeline <i className="fa-solid fa-arrow-right text-[9px]" />
            </button>
          </div>
        </div>

        {/* Right 8 Cols: Forecast Overview SVG Area Chart with Tooltips */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between relative">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-foreground tracking-tight">Revenue Forecast vs Actuals</h3>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">+18.5% Realized</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Projected pipeline cashflow vs realized revenue across months</p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowForecastDropdown(!showForecastDropdown)}
                className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted/70 px-2.5 py-1 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <span>{forecastYear}</span>
                <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
              </button>
              {showForecastDropdown && (
                <div className="absolute right-0 mt-1 w-28 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                  {(["2026", "2025", "2024"] as const).map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => { setForecastYear(yr); setShowForecastDropdown(false); }}
                      className={cn("w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer", forecastYear === yr ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground")}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SVG Forecast Curve */}
          <div className="pt-4 relative">
            <svg viewBox="0 0 700 190" className="w-full h-48 overflow-visible">
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="actualsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[30, 70, 110, 150].map((y, i) => (
                <g key={i}>
                  <line x1="40" y1={y} x2="680" y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-border/50" />
                  <text x="10" y={y + 3} className="text-[9px] fill-muted-foreground font-mono font-semibold">
                    ${(180 - y) * 2}k
                  </text>
                </g>
              ))}

              {/* Forecast Area & Line */}
              {forecastChartPaths.projectedArea && (
                <path
                  d={forecastChartPaths.projectedArea}
                  fill="url(#forecastGrad)"
                />
              )}
              {forecastChartPaths.projectedPath && (
                <path
                  d={forecastChartPaths.projectedPath}
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              )}

              {/* Actuals Line */}
              {forecastChartPaths.actualPath && (
                <path
                  d={forecastChartPaths.actualPath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="5 5"
                />
              )}

              {/* Interactive Month Touchpoints */}
              {forecastMonths.map((item) => (
                <g
                  key={item.month}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredMonth(item)}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  <circle cx={item.x} cy={item.yP} r="4.5" fill="#8B5CF6" stroke="white" strokeWidth="1.5" className="hover:r-6 transition-all" />
                  <circle cx={item.x} cy={item.yA} r="3.5" fill="#10B981" stroke="white" strokeWidth="1.5" className="hover:r-5 transition-all" />
                  <text x={item.x} y="185" textAnchor="middle" className="text-[10px] fill-muted-foreground font-medium">
                    {item.month}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredMonth && (
              <div className="absolute top-2 right-4 bg-popover/95 border border-border/80 rounded-xl p-3 shadow-xl backdrop-blur-sm z-30 animate-in fade-in text-xs space-y-1">
                <p className="font-extrabold text-foreground border-b border-border/50 pb-1">{hoveredMonth.month} {forecastYear} Cashflow</p>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">Projected:</span>
                  <span className="font-mono font-bold">${hoveredMonth.projected.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Actual:</span>
                  <span className="font-mono font-bold">${hoveredMonth.actual.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between gap-4 pt-1 text-[10px] text-muted-foreground border-t border-border/40">
                  <span>Variance:</span>
                  <span className="font-mono font-bold text-emerald-500">
                    +${(hoveredMonth.actual - hoveredMonth.projected).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-6 pt-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 bg-purple-500 rounded" />
                <span className="text-muted-foreground font-medium">Projected Forecast</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-1 border-t-2 border-dashed border-emerald-500" />
                <span className="text-muted-foreground font-medium">Actual Realized</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 4: Executive Performance Overview Table ── */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-border/60 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-foreground tracking-tight">Executive Performance Leaderboard</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Team conversion ratios, revenue quotas & individual drilldowns</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Segmented Buttons */}
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
              {(["All", "Excellent", "Good", "Average"] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setTableFilter(st)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-bold transition-all rounded-md cursor-pointer",
                    tableFilter === st ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              <input
                type="text"
                value={searchRep}
                onChange={e => setSearchRep(e.target.value)}
                placeholder="Search executive..."
                className="pl-8 pr-3 py-1.5 bg-muted/40 border border-border/70 rounded-lg text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
              />
            </div>

            {/* Sorting Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted/70 px-2.5 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-arrow-down-wide-short text-muted-foreground text-[11px]" />
                <span>Sort</span>
                <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
              </button>
              {showSortDropdown && (
                <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1 z-20 animate-in fade-in zoom-in-95">
                  {[
                    { key: "revenue_desc", label: "Highest Revenue" },
                    { key: "deals_desc", label: "Most Deals Closed" },
                    { key: "conversion_desc", label: "Highest Win Rate" },
                    { key: "name", label: "Alphabetical" },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => { setTableSortBy(opt.key as any); setShowSortDropdown(false); }}
                      className={cn("w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer", tableSortBy === opt.key ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground")}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left py-3 px-5 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Executive Name</th>
                <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Territory</th>
                <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Deals Closed</th>
                <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Revenue Generated</th>
                <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Quota Attainment</th>
                <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Status</th>
                <th className="text-right py-3 px-5 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Drill Down</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {processedReps.map((rep) => {
                const isExcellent = rep.status === "Excellent";
                const isGood = rep.status === "Good";
                const quotaPct = Math.round((rep.revenue / rep.quota) * 100);

                return (
                  <tr
                    key={rep.id}
                    className="hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedRep(rep)}
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ring-1 ring-border", rep.avatarBg)}>
                          {rep.name.split(" ").map(w => w[0]).join("")}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-xs group-hover:text-primary transition-colors">{rep.name}</p>
                          <p className="text-[10px] text-muted-foreground">{rep.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-muted-foreground font-medium">{rep.territory}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold font-mono text-emerald-600 dark:text-emerald-400 text-xs">{rep.dealsClosed}</span>
                        {rep.stalledDealsCount > 0 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-0.5"
                            title={`${rep.stalledDealsCount} deal(s) in current stage for ≥14 days`}
                          >
                            <i className="fa-solid fa-triangle-exclamation text-[7px]" />
                            {rep.stalledDealsCount} aging
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-extrabold font-mono text-foreground text-xs">${rep.revenue.toLocaleString()}</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                quotaPct >= 100 ? "bg-amber-500" : quotaPct >= 70 ? "bg-emerald-500" : "bg-blue-500"
                              )}
                              style={{ width: `${Math.min(100, quotaPct)}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px] text-foreground">{quotaPct}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {quotaPct >= 100 ? (
                            <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 inline-flex items-center gap-1">
                              <i className="fa-solid fa-trophy text-[8px]" /> Club
                            </span>
                          ) : quotaPct >= 70 ? (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 inline-flex items-center gap-1">
                              <i className="fa-solid fa-star text-[8px]" /> On Track
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-muted-foreground font-mono">
                              ${(rep.quota / 1000).toFixed(0)}k quota
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={cn(
                        "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase",
                        isExcellent ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                        isGood ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30" :
                        "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      )}>
                        {rep.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDealModal?.(rep.name);
                          }}
                          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-2 py-1 rounded-lg hover:bg-emerald-500/20 transition-all"
                          title={`Create Deal for ${rep.name}`}
                        >
                          <i className="fa-solid fa-plus text-[9px]" />
                          <span>Deal</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedRep(rep); }}
                          className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer bg-primary/10 px-2.5 py-1 rounded-lg hover:bg-primary/20 transition-all"
                        >
                          <i className="fa-solid fa-address-card text-[10px]" />
                          <span>Profile</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 1: EXECUTIVE REP PROFILE & CONNECTED ASSETS ──   */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedRep && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedRep(null)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95 duration-200 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3.5">
                <div className={cn("w-14 h-14 rounded-2xl text-white font-black text-xl flex items-center justify-center shrink-0 ring-2 ring-border shadow-md", selectedRep.avatarBg)}>
                  {selectedRep.name.split(" ").map(w => w[0]).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-foreground">{selectedRep.name}</h3>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                      {selectedRep.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedRep.role} &middot; {selectedRep.territory}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">Joined: {selectedRep.joinDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const repName = selectedRep.name;
                    setSelectedRep(null);
                    onOpenDealModal?.(repName);
                  }}
                  className="h-8 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-plus text-[10px]" />
                  <span>Assign Deal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRep(null)}
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Rep Financial & Quota Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-[11px] font-semibold text-muted-foreground">Revenue Closed</p>
                <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">${selectedRep.revenue.toLocaleString()}</p>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-card">
                <p className="text-[11px] font-semibold text-muted-foreground">Target Quota</p>
                <p className="text-lg font-extrabold text-foreground font-mono mt-0.5">${selectedRep.quota.toLocaleString()}</p>
              </div>
              <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <p className="text-[11px] font-semibold text-muted-foreground">Deals Closed</p>
                <p className="text-lg font-extrabold text-purple-600 dark:text-purple-400 font-mono mt-0.5">{selectedRep.dealsClosed}</p>
              </div>
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <p className="text-[11px] font-semibold text-muted-foreground">Commission (10%)</p>
                <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-0.5">${selectedRep.commission.toLocaleString()}</p>
              </div>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-2 bg-card p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">Annual Quota Realization</span>
                <span className="font-mono font-bold text-primary">{Math.round((selectedRep.revenue / selectedRep.quota) * 100)}%</span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, (selectedRep.revenue / selectedRep.quota) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>$0</span>
                <span>Current: ${selectedRep.revenue.toLocaleString()}</span>
                <span>Target: ${selectedRep.quota.toLocaleString()}</span>
              </div>
            </div>

            {/* ── Connected Deals Owned by this Rep ── */}
            <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-handshake text-emerald-500" />
                  <span>Assigned Sales Deals ({selectedRep.assignedDeals.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => { onNavigateToDeals?.(); setSelectedRep(null); }}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  All Deals &rarr;
                </button>
              </div>

              {selectedRep.assignedDeals.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedRep.assignedDeals.map((deal, dIdx) => (
                    <div
                      key={deal._id || dIdx}
                      onClick={() => { onEditDeal?.(deal); setSelectedRep(null); }}
                      className="p-2.5 rounded-lg bg-card border border-border/80 hover:border-primary/40 flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div>
                        <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{deal.dealName}</p>
                        <p className="text-[10px] text-muted-foreground">{deal.clientAccount}</p>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {deal.stage === "Closed Won" && onGenerateInvoice && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateInvoice(deal);
                            }}
                            className="h-6 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors"
                            title="Generate Invoice for Won Deal"
                          >
                            <i className="fa-solid fa-file-invoice-dollar text-[9px]" />
                            <span>Invoice</span>
                          </button>
                        )}
                        <span className="font-mono font-extrabold text-xs text-foreground">${Number(deal.dealValue).toLocaleString()}</span>
                        {onStageChange ? (
                          <select
                            value={deal.stage}
                            onChange={(e) => onStageChange(deal._id, e.target.value as SalesDeal["stage"])}
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 cursor-pointer outline-none"
                            title="Update deal stage"
                          >
                            {["Prospecting", "Discovery", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"].map((s) => (
                              <option key={s} value={s} className="bg-card text-foreground font-medium">
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{deal.stage}</span>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No specific deals tagged directly to this rep yet.</p>
              )}
            </div>

            {/* ── Connected Leads Assigned to this Rep ── */}
            <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-user-tag text-blue-500" />
                  <span>Assigned Client Leads ({selectedRep.assignedLeads.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => { onNavigateToLeads?.(selectedRep.name); setSelectedRep(null); }}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  Filter Leads &rarr;
                </button>
              </div>

              {selectedRep.assignedLeads.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedRep.assignedLeads.slice(0, 5).map((lead, lIdx) => (
                    <div
                      key={lead._id || lIdx}
                      onClick={() => { onOpenLead?.(lead); setSelectedRep(null); }}
                      className="p-2.5 rounded-lg bg-card border border-border/80 hover:border-primary/40 flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div>
                        <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">{lead.leadName}</p>
                        <p className="text-[10px] text-muted-foreground">{lead.companyName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">{lead.status}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{lead.stage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No specific leads assigned directly to this rep yet.</p>
              )}
            </div>

            {/* Contact & Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground">
                <span>{selectedRep.email}</span> &middot; <span>{selectedRep.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { onNavigateToLeads?.(selectedRep.name); setSelectedRep(null); }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
                >
                  View All Rep Leads
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ── MODAL 2: SALES TARGETS & QUOTA CONFIGURATOR ──        */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showTargetModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowTargetModal(false)} />
          <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-base">
                  <i className="fa-solid fa-bullseye" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Configure Sales Quotas & Targets</h3>
                  <p className="text-xs text-muted-foreground">Adjust executive benchmarks and team revenue targets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Target Period</label>
                <select
                  value={targetPeriod}
                  onChange={e => setTargetPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="2026 Annual Target">2026 Annual Target</option>
                  <option value="Q3 2026 Quarterly Quota">Q3 2026 Quarterly Quota</option>
                  <option value="Monthly Team Sprint">Monthly Team Sprint</option>
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Total Team Quota ($ USD)</label>
                <input
                  type="number"
                  value={targetQuotaInput}
                  onChange={e => setTargetQuotaInput(e.target.value)}
                  className="w-full px-3 py-2 bg-muted/40 border border-border rounded-lg text-foreground font-mono font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Territory Weight Breakdown */}
              <div className="space-y-2 bg-muted/20 p-3.5 rounded-xl border border-border">
                <p className="font-bold text-foreground">Territory Allocation Weight</p>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span>North America (East & West):</span>
                    <span className="font-mono font-bold">50% (${(Number(targetQuotaInput) * 0.5).toLocaleString()})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>EMEA & UK:</span>
                    <span className="font-mono font-bold">30% (${(Number(targetQuotaInput) * 0.3).toLocaleString()})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>APAC & Gulf:</span>
                    <span className="font-mono font-bold">20% (${(Number(targetQuotaInput) * 0.2).toLocaleString()})</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowTargetModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = Number(targetQuotaInput) || 400000;
                  setTeamTargetQuota(val);
                  // Persist to localStorage so quota survives tab navigation
                  if (typeof window !== "undefined") {
                    localStorage.setItem("nexace_bd_team_quota", String(val));
                    localStorage.setItem("nexace_bd_target_period", targetPeriod);
                  }
                  setShowTargetModal(false);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
              >
                Save Quota Target
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
