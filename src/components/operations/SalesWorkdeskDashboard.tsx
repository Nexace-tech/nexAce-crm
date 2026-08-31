"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SalesDeal {
  _id: string;
  clientAccount: string;
  dealName: string;
  dealValue: number;
  stage: "Prospecting" | "Discovery" | "Proposal Sent" | "Negotiation" | "Closed Won" | "Closed Lost";
  probability: number;
  owner: string;
  expectedClose: string;
  venture: string;
  notes?: string;
  category?: string;
  createdAt?: string;
}

interface SalesWorkdeskDashboardProps {
  deals: SalesDeal[];
  loading?: boolean;
  onNewDeal: () => void;
  onEditDeal: (deal: SalesDeal) => void;
  onDeleteDeal: (dealId: string, dealName: string) => void;
  onRefresh?: () => void;
}

// Deterministic currency formatters to prevent SSR locale hydration mismatches
const formatUSD = (val: number | string) => {
  const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0 : Number(val) || 0;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num);
};

const formatUSDDec = (val: number | string) => {
  const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0 : Number(val) || 0;
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

export function SalesWorkdeskDashboard({
  deals,
  loading = false,
  onNewDeal,
  onEditDeal,
  onDeleteDeal,
  onRefresh,
}: SalesWorkdeskDashboardProps) {
  // Navigation sub-views: "overview" (exact  Sales Dashboard) | "kanban" | "table"
  const [viewMode, setViewMode] = useState<"overview" | "kanban" | "table">("overview");

  // UI & Filter States
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [revenueTimeframe, setRevenueTimeframe] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [dealsTimeframe, setDealsTimeframe] = useState<"Weekly" | "Monthly" | "All">("Weekly");
  const [showDealsDropdown, setShowDealsDropdown] = useState(false);
  const [growthPeriod, setGrowthPeriod] = useState<"Last Year" | "Last 6 Months" | "This Year">("Last Year");
  const [showGrowthDropdown, setShowGrowthDropdown] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("31 August 26 - 31 August 27");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [hoveredGrowthMonth, setHoveredGrowthMonth] = useState<number | null>(null);

  // Exact CRMS Reference Demo Deals Fallback
  const defaultRecentDeals = useMemo(() => [
    { _id: "demo-1", dealName: "SkyHigh Annual Booking", category: "Appointment", clientAccount: "SkyHigh Aviation", dealValue: 7811800, stage: "Closed Won" as const, owner: "Sara Khan", expectedClose: "2026-12-01", probability: 100, venture: "Ace Consultancys" },
    { _id: "demo-2", dealName: "CRM Onboarding Package", category: "Appointment", clientAccount: "NovaTech Solutions", dealValue: 7211289, stage: "Closed Lost" as const, owner: "Ahmed Raza", expectedClose: "2026-10-15", probability: 0, venture: "Ace Consultancys" },
    { _id: "demo-3", dealName: "Enterprise Plan Upgrade", category: "Appointment", clientAccount: "Apex Digital Labs", dealValue: 1611457, stage: "Closed Won" as const, owner: "Bilal Hassan", expectedClose: "2026-09-30", probability: 100, venture: "Ace Consultancys" },
    { _id: "demo-4", dealName: "CRM Migration Project", category: "Appointment", clientAccount: "AlphaStream Media", dealValue: 8511789, stage: "Closed Won" as const, owner: "Fatima Noor", expectedClose: "2026-11-20", probability: 100, venture: "Ace Consultancys" },
    { _id: "demo-5", dealName: "Project Management", category: "Appointment", clientAccount: "Global Logistics", dealValue: 6512589, stage: "Closed Won" as const, owner: "Omar Malik", expectedClose: "2026-08-31", probability: 100, venture: "Ace Consultancys" },
  ], []);

  // Active Deals Dataset (Uses real deals if available, falls back to demo)
  const activeDealsList = deals.length > 0 ? deals : defaultRecentDeals;

  // 1. Dynamic Calculations: Won / Lost / Total Deals
  const wonDeals = useMemo(() => activeDealsList.filter((d) => d.stage === "Closed Won"), [activeDealsList]);
  const lostDeals = useMemo(() => activeDealsList.filter((d) => d.stage === "Closed Lost"), [activeDealsList]);
  const wonDealsCount = deals.length > 0 ? wonDeals.length : 68;
  const lostDealsCount = deals.length > 0 ? lostDeals.length : 16;
  const totalClosed = wonDealsCount + lostDealsCount;

  // 2. Dynamic Conversion Rate
  const conversionRate = useMemo(() => {
    if (deals.length > 0) {
      if (totalClosed > 0) return ((wonDeals.length / totalClosed) * 100).toFixed(1);
      return ((wonDeals.length / deals.length) * 100).toFixed(1);
    }
    return "55.6";
  }, [deals, totalClosed, wonDeals]);

  // 3. Dynamic Pipeline Total & Breakdown
  const totalPipelineVal = useMemo(() => {
    return activeDealsList.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
  }, [activeDealsList]);

  const pipelineStages = useMemo(() => {
    const probDeals = activeDealsList.filter((d) => d.stage === "Prospecting" || d.stage === "Discovery");
    const propDeals = activeDealsList.filter((d) => d.stage === "Proposal Sent");
    const oppDeals = activeDealsList.filter((d) => d.stage === "Negotiation");
    const totalWonDeals = activeDealsList.filter((d) => d.stage === "Closed Won");

    const probSum = probDeals.reduce((s, d) => s + d.dealValue, 0) || (deals.length === 0 ? 50000 : 0);
    const propSum = propDeals.reduce((s, d) => s + d.dealValue, 0) || (deals.length === 0 ? 56054 : 0);
    const oppSum = oppDeals.reduce((s, d) => s + d.dealValue, 0) || (deals.length === 0 ? 100000 : 0);
    const totalWonSum = totalWonDeals.reduce((s, d) => s + d.dealValue, 0) || (deals.length === 0 ? 100000 : 0);

    const safeTotal = totalPipelineVal > 0 ? totalPipelineVal : 256054.5;

    return {
      prob: { sum: probSum, pct: Math.min(100, Math.max(15, Math.round((probSum / safeTotal) * 100))) },
      prop: { sum: propSum, pct: Math.min(100, Math.max(20, Math.round((propSum / safeTotal) * 100))) },
      opp: { sum: oppSum, pct: Math.min(100, Math.max(15, Math.round((oppSum / safeTotal) * 100))) },
      totalWon: { sum: totalWonSum, pct: Math.min(100, Math.max(25, Math.round((totalWonSum / safeTotal) * 100))) },
    };
  }, [activeDealsList, totalPipelineVal, deals.length]);

  // 4. Dynamic Total Revenue based on Timeframe Toggle
  const revenueMetrics = useMemo(() => {
    if (revenueTimeframe === "weekly") {
      return {
        mtdLabel: "Total MTD Revenue",
        mtdVal: deals.length > 0 ? `$${formatUSDDec(totalPipelineVal * 0.25)}` : "$18,50,800.00",
        mtdChange: "+2.5%",
        mtdPeriod: "Month Till Date",
        mtdPositive: true,
        ytdLabel: "Total YTD Revenue",
        ytdVal: deals.length > 0 ? `$${formatUSDDec(totalPipelineVal)}` : "$85,25,800.00",
        ytdChange: "-5.0%",
        ytdPeriod: "Year Till Date",
        ytdPositive: false,
      };
    } else if (revenueTimeframe === "monthly") {
      return {
        mtdLabel: "Total Monthly Revenue",
        mtdVal: deals.length > 0 ? `$${formatUSDDec(totalPipelineVal * 0.45)}` : "$42,30,500.00",
        mtdChange: "+8.4%",
        mtdPeriod: "This Month",
        mtdPositive: true,
        ytdLabel: "Total Annual Revenue",
        ytdVal: deals.length > 0 ? `$${formatUSDDec(totalPipelineVal * 1.5)}` : "$1,12,50,000.00",
        ytdChange: "+12.2%",
        ytdPeriod: "Year Till Date",
        ytdPositive: true,
      };
    } else {
      return {
        mtdLabel: "H1 Revenue",
        mtdVal: deals.length > 0 ? `$${formatUSDDec(totalPipelineVal * 0.8)}` : "$85,25,800.00",
        mtdChange: "+14.1%",
        mtdPeriod: "First Half",
        mtdPositive: true,
        ytdLabel: "Full Year Revenue Target",
        ytdVal: deals.length > 0 ? `$${formatUSDDec(totalPipelineVal * 2.2)}` : "$1,85,00,000.00",
        ytdChange: "+18.5%",
        ytdPeriod: "Full Fiscal Year",
        ytdPositive: true,
      };
    }
  }, [revenueTimeframe, totalPipelineVal, deals.length]);

  // 5. Dynamic Unique Deal Owners List for Avatars
  const uniqueOwners = useMemo(() => {
    const set = Array.from(new Set(activeDealsList.map((d) => d.owner).filter(Boolean)));
    return set.length > 0 ? set : ["Sara Khan", "Ahmed Raza", "Bilal Hassan", "Fatima Noor", "Omar Malik"];
  }, [activeDealsList]);

  // 6. Dynamic Recently Created Deals List with Timeframe Filter
  const recentDealsList = useMemo(() => {
    const source = deals.length > 0 ? deals : defaultRecentDeals;
    if (dealsTimeframe === "Weekly") {
      return source.slice(0, 5);
    } else if (dealsTimeframe === "Monthly") {
      return source.slice(0, 8);
    }
    return source.slice(0, 10);
  }, [deals, defaultRecentDeals, dealsTimeframe]);

  // 7. Dynamic Avg Deal Size
  const avgDealSizeFormatted = useMemo(() => {
    if (deals.length > 0) {
      const avg = totalPipelineVal / Math.max(1, deals.length);
      return `$${avg.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return "$1,56,054.50";
  }, [deals, totalPipelineVal]);

  // 8. Dynamic Sales Growth Monthly Distribution based on selected Period
  const monthlyGrowthData = useMemo(() => {
    if (growthPeriod === "Last Year") {
      return [
        { month: "Jan", val: 1.8, y: 170, label: "$1.8k" },
        { month: "Feb", val: 4.2, y: 90, label: "$4.2k" },
        { month: "Mar", val: 1.2, y: 190, label: "$1.2k" },
        { month: "Apr", val: 3.8, y: 100, label: "$3.8k" },
        { month: "May", val: 4.9, y: 65, label: "$4.9k" },
        { month: "Jun", val: 3.1, y: 125, label: "$3.1k" },
        { month: "Jul", val: 4.2, y: 90, label: "$4.2k" },
        { month: "Aug", val: 1.5, y: 180, label: "$1.5k" },
        { month: "Sep", val: 5.8, y: 30, label: "$5.8k" },
        { month: "Oct", val: 4.6, y: 75, label: "$4.6k" },
        { month: "Nov", val: 3.4, y: 115, label: "$3.4k" },
        { month: "Dec", val: 2.9, y: 135, label: "$2.9k" },
      ];
    } else if (growthPeriod === "This Year") {
      return [
        { month: "Jan", val: 2.5, y: 145, label: "$2.5k" },
        { month: "Feb", val: 3.8, y: 105, label: "$3.8k" },
        { month: "Mar", val: 4.2, y: 90, label: "$4.2k" },
        { month: "Apr", val: 4.8, y: 70, label: "$4.8k" },
        { month: "May", val: 5.2, y: 50, label: "$5.2k" },
        { month: "Jun", val: 5.6, y: 38, label: "$5.6k" },
        { month: "Jul", val: 4.9, y: 65, label: "$4.9k" },
        { month: "Aug", val: 5.4, y: 45, label: "$5.4k" },
        { month: "Sep", val: 6.0, y: 22, label: "$6.0k" },
        { month: "Oct", val: 5.7, y: 35, label: "$5.7k" },
        { month: "Nov", val: 5.1, y: 55, label: "$5.1k" },
        { month: "Dec", val: 5.9, y: 26, label: "$5.9k" },
      ];
    } else {
      // Last 6 Months
      return [
        { month: "Jul", val: 3.2, y: 120, label: "$3.2k" },
        { month: "Aug", val: 4.0, y: 95, label: "$4.0k" },
        { month: "Sep", val: 4.8, y: 70, label: "$4.8k" },
        { month: "Oct", val: 5.5, y: 40, label: "$5.5k" },
        { month: "Nov", val: 4.9, y: 65, label: "$4.9k" },
        { month: "Dec", val: 5.8, y: 30, label: "$5.8k" },
      ];
    }
  }, [growthPeriod]);

  // Dynamic Spline Path Construction
  const splinePaths = useMemo(() => {
    if (monthlyGrowthData.length === 6) {
      // 6 month curve
      const areaPath = `M 35 120 C 130 95, 230 70, 330 40 C 430 65, 530 30, 1000 30 L 1000 200 L 35 200 Z`;
      const linePath = `M 35 120 C 130 95, 230 70, 330 40 C 430 65, 530 30, 1000 30`;
      return { areaPath, linePath };
    }
    const areaPath = `M 35 ${monthlyGrowthData[0]?.y || 170} 
       C 70 160, 95 100, 130 ${monthlyGrowthData[1]?.y || 90} 
       C 160 80, 185 190, 215 ${monthlyGrowthData[2]?.y || 190} 
       C 245 190, 275 110, 305 ${monthlyGrowthData[3]?.y || 100} 
       C 340 90, 370 65, 400 ${monthlyGrowthData[4]?.y || 65} 
       C 435 65, 465 125, 495 ${monthlyGrowthData[5]?.y || 125} 
       C 525 125, 555 90, 585 ${monthlyGrowthData[6]?.y || 90} 
       C 620 90, 645 180, 675 ${monthlyGrowthData[7]?.y || 180} 
       C 705 180, 735 30, 765 ${monthlyGrowthData[8]?.y || 30} 
       C 795 30, 825 65, 855 ${monthlyGrowthData[9]?.y || 75} 
       C 885 85, 915 95, 945 ${monthlyGrowthData[10]?.y || 115} 
       C 965 125, 985 135, 1000 ${monthlyGrowthData[11]?.y || 135} 
       L 1000 200 L 35 200 Z`;
    const linePath = `M 35 ${monthlyGrowthData[0]?.y || 170} 
       C 70 160, 95 100, 130 ${monthlyGrowthData[1]?.y || 90} 
       C 160 80, 185 190, 215 ${monthlyGrowthData[2]?.y || 190} 
       C 245 190, 275 110, 305 ${monthlyGrowthData[3]?.y || 100} 
       C 340 90, 370 65, 400 ${monthlyGrowthData[4]?.y || 65} 
       C 435 65, 465 125, 495 ${monthlyGrowthData[5]?.y || 125} 
       C 525 125, 555 90, 585 ${monthlyGrowthData[6]?.y || 90} 
       C 620 90, 645 180, 675 ${monthlyGrowthData[7]?.y || 180} 
       C 705 180, 735 30, 765 ${monthlyGrowthData[8]?.y || 30} 
       C 795 30, 825 65, 855 ${monthlyGrowthData[9]?.y || 75} 
       C 885 85, 915 95, 945 ${monthlyGrowthData[10]?.y || 115} 
       C 965 125, 985 135, 1000 ${monthlyGrowthData[11]?.y || 135}`;
    return { areaPath, linePath };
  }, [monthlyGrowthData]);

  // Filtered deals for table & kanban views
  const filteredDeals = useMemo(() => {
    return activeDealsList.filter((d) => {
      const matchSearch =
        d.dealName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.clientAccount.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStage = stageFilter === "All" || d.stage === stageFilter;
      const matchOwner = ownerFilter === "All" || d.owner === ownerFilter;
      return matchSearch && matchStage && matchOwner;
    });
  }, [activeDealsList, searchQuery, stageFilter, ownerFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Sales Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational Workdesk &bull; Real-time client pipeline, conversions &amp; revenue metrics
          </p>
        </div>

        {/* Action Controls & Sub-view navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-view switcher */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("overview")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === "overview"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-chart-pie text-[11px] text-rose-500" /> Sales Dashboard
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === "kanban"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-kanban-board text-[11px] text-amber-500" /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === "table"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-table-list text-[11px] text-sky-500" /> All Deals ({activeDealsList.length})
            </button>
          </div>

          {/* Date range picker dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              className="hidden lg:flex items-center gap-2 bg-card hover:bg-muted/40 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground shadow-2xs transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-calendar text-muted-foreground text-xs" />
              <span>{selectedDateRange}</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground ml-1" />
            </button>

            {showDateDropdown && (
              <div className="absolute right-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-lg p-2 z-50 animate-in fade-in zoom-in-95">
                {[
                  "31 August 26 - 31 August 27",
                  "1 Jan 2026 - 31 Dec 2026",
                  "Current Quarter (Q3 2026)",
                  "This Month (August 2026)",
                  "Last 30 Days",
                ].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      setSelectedDateRange(range);
                      setShowDateDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                      selectedDateRange === range ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/40 text-foreground"
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="h-9 w-9 cursor-pointer shadow-2xs"
              title="Refresh Sales Data"
            >
              <i className={cn("fa-solid fa-arrows-rotate text-xs", loading && "fa-spin")} />
            </Button>
          )}

          {/* Collapse / Expand Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-9 w-9 cursor-pointer shadow-2xs text-muted-foreground hover:text-foreground"
            title={isCollapsed ? "Expand Dashboard" : "Collapse Dashboard"}
          >
            <i className={cn("fa-solid text-xs transition-transform duration-200", isCollapsed ? "fa-chevron-down" : "fa-chevron-up")} />
          </Button>

          {/* New Sales Deal Button */}
          <Button
            onClick={onNewDeal}
            color="primary"
            size="sm"
            className="gap-2 font-bold cursor-pointer h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            <i className="fa-solid fa-plus text-xs" /> New Sales Deal
          </Button>
        </div>
      </div>

      {/* VIEW 1: DYNAMIC CRMS SALES DASHBOARD */}
      {viewMode === "overview" && !isCollapsed && (
        <div className="space-y-6">
          {/* ROW 1: TOTAL REVENUE & CONVERSION RATE GAUGE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* TOTAL REVENUE CARD (8/12 = 2/3 width) */}
            <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              {/* Card Header with Avatars & Toggle Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-foreground tracking-tight">Total Revenue</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedDateRange}</p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Dynamic Avatar Stack of Active Deal Owners */}
                  <div className="flex items-center -space-x-2">
                    {uniqueOwners.slice(0, 4).map((ownerName, idx) => {
                      const colors = ["bg-indigo-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500"];
                      const initials = ownerName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      return (
                        <div
                          key={idx}
                          title={ownerName}
                          className={cn(
                            "w-7 h-7 rounded-full text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-card shadow-2xs",
                            colors[idx % colors.length]
                          )}
                        >
                          {initials}
                        </div>
                      );
                    })}
                    {uniqueOwners.length > 4 && (
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-card shadow-2xs">
                        +{uniqueOwners.length - 4}
                      </div>
                    )}
                  </div>

                  {/* Timeframe Toggle Pills (Weekly / Monthly / Yearly) with Theme Color */}
                  <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
                    {(["weekly", "monthly", "yearly"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setRevenueTimeframe(tab)}
                        className={cn(
                          "px-3 py-1 text-xs font-bold capitalize transition-all rounded-md cursor-pointer",
                          revenueTimeframe === tab
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* MTD & YTD Sub-cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                {/* MTD Card with Yellow Ribbon Tab */}
                <div className="relative flex items-stretch bg-slate-50/80 dark:bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm transition-all">
                  {/* Yellow Ribbon */}
                  <div className="relative w-14 bg-[#e09d1d] text-white flex items-center justify-center font-black text-xs tracking-wider shrink-0 select-none">
                    <span className="[writing-mode:vertical-lr] rotate-180">MTD</span>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[8px] border-l-[#e09d1d] translate-x-full" />
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex items-center justify-between pl-5">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{revenueMetrics.mtdLabel}</p>
                      <h3 className="text-xl font-extrabold text-foreground tracking-tight">{revenueMetrics.mtdVal}</h3>
                      <div className="pt-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full",
                            revenueMetrics.mtdPositive
                              ? "text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40"
                              : "text-[#dc3545] bg-[#ffebeb] dark:bg-rose-950/40"
                          )}
                        >
                          {revenueMetrics.mtdChange} <span className="font-normal text-muted-foreground">{revenueMetrics.mtdPeriod}</span>
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Sparkline Bars */}
                    <div className="flex items-end gap-1 h-12 shrink-0 pl-2">
                      <div className="w-1.5 h-6 bg-indigo-300 dark:bg-indigo-700/60 rounded-xs transition-all duration-300 hover:h-10" />
                      <div className="w-1.5 h-9 bg-indigo-400 dark:bg-indigo-600/70 rounded-xs transition-all duration-300 hover:h-12" />
                      <div className="w-1.5 h-4 bg-indigo-300 dark:bg-indigo-700/60 rounded-xs transition-all duration-300 hover:h-8" />
                      <div className="w-1.5 h-11 bg-indigo-500 dark:bg-indigo-500 rounded-xs transition-all duration-300 hover:h-12" />
                      <div className="w-1.5 h-8 bg-indigo-400 dark:bg-indigo-600/70 rounded-xs transition-all duration-300 hover:h-11" />
                    </div>
                  </div>
                </div>

                {/* YTD Card with Theme Color Ribbon Tab */}
                <div className="relative flex items-stretch bg-slate-50/80 dark:bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm transition-all">
                  {/* Theme Ribbon */}
                  <div className="relative w-14 bg-primary text-primary-foreground flex items-center justify-center font-black text-xs tracking-wider shrink-0 select-none">
                    <span className="[writing-mode:vertical-lr] rotate-180">YTD</span>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[8px] border-l-primary translate-x-full" />
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex items-center justify-between pl-5">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{revenueMetrics.ytdLabel}</p>
                      <h3 className="text-xl font-extrabold text-foreground tracking-tight">{revenueMetrics.ytdVal}</h3>
                      <div className="pt-1">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full",
                            revenueMetrics.ytdPositive
                              ? "text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40"
                              : "text-[#dc3545] bg-[#ffebeb] dark:bg-rose-950/40"
                          )}
                        >
                          {revenueMetrics.ytdChange} <span className="font-normal text-muted-foreground">{revenueMetrics.ytdPeriod}</span>
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Sparkline Bars */}
                    <div className="flex items-end gap-1 h-12 shrink-0 pl-2">
                      <div className="w-1.5 h-5 bg-indigo-300 dark:bg-indigo-700/60 rounded-xs transition-all duration-300 hover:h-9" />
                      <div className="w-1.5 h-8 bg-indigo-400 dark:bg-indigo-600/70 rounded-xs transition-all duration-300 hover:h-11" />
                      <div className="w-1.5 h-12 bg-indigo-500 dark:bg-indigo-500 rounded-xs transition-all duration-300 hover:h-12" />
                      <div className="w-1.5 h-6 bg-indigo-300 dark:bg-indigo-700/60 rounded-xs transition-all duration-300 hover:h-10" />
                      <div className="w-1.5 h-10 bg-indigo-400 dark:bg-indigo-600/70 rounded-xs transition-all duration-300 hover:h-12" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONVERSION RATE SPEEDOMETER GAUGE CARD (4/12 = 1/3 width) */}
            <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Conversion Rate</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{selectedDateRange}</p>
              </div>

              {/* Speedometer SVG Gauge (Using Theme Color) */}
              <div className="relative flex flex-col items-center justify-center my-2">
                <svg viewBox="0 0 300 165" className="w-full max-w-[280px] overflow-visible">
                  {/* Render 28 Radial Pill Segments with clean spacing/gaps and theme color */}
                  {Array.from({ length: 28 }).map((_, i) => {
                    const totalBars = 28;
                    const angle = Math.PI - (i / (totalBars - 1)) * Math.PI;
                    const rInner = 78;
                    const rOuter = 106;
                    const cx = 150;
                    const cy = 140;

                    const x1 = +(cx + rInner * Math.cos(angle)).toFixed(2);
                    const y1 = +(cy - rInner * Math.sin(angle)).toFixed(2);
                    const x2 = +(cx + rOuter * Math.cos(angle)).toFixed(2);
                    const y2 = +(cy - rOuter * Math.sin(angle)).toFixed(2);

                    const rateFrac = parseFloat(conversionRate) / 100;
                    const isActive = i / (totalBars - 1) <= rateFrac;

                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isActive ? "hsl(var(--primary))" : "#eceff1"}
                        strokeWidth="7.5"
                        strokeLinecap="round"
                        className={!isActive ? "dark:stroke-slate-800" : ""}
                      />
                    );
                  })}

                  {/* Tick Labels: 0, 20, 40, 60, 80, 100 placed precisely along inner curve */}
                  {[
                    { label: "0", x: 86, y: 142 },
                    { label: "20", x: 104, y: 106 },
                    { label: "40", x: 130, y: 78 },
                    { label: "60", x: 170, y: 78 },
                    { label: "80", x: 196, y: 106 },
                    { label: "100", x: 214, y: 142 },
                  ].map((t, idx) => (
                    <text
                      key={idx}
                      x={t.x}
                      y={t.y}
                      textAnchor="middle"
                      className="text-[11px] font-bold fill-slate-600 dark:fill-slate-400 select-none"
                    >
                      {t.label}
                    </text>
                  ))}

                  {/* Dynamic Needle Pivot & Line with fixed decimal precision */}
                  {(() => {
                    const rateNum = Math.min(100, Math.max(0, parseFloat(conversionRate)));
                    const needleAngle = Math.PI - (rateNum / 100) * Math.PI;
                    const needleLength = 76;
                    const cx = 150;
                    const cy = 140;
                    const nx = +(cx + needleLength * Math.cos(needleAngle)).toFixed(2);
                    const ny = +(cy - needleLength * Math.sin(needleAngle)).toFixed(2);
                    return (
                      <g>
                        <line
                          x1={cx}
                          y1={cy}
                          x2={nx}
                          y2={ny}
                          stroke="#374151"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="dark:stroke-slate-200 transition-all duration-500"
                        />
                        <circle cx={cx} cy={cy} r="5" fill="#374151" className="dark:fill-slate-200" />
                        <circle cx={cx} cy={cy} r="2" fill="#ffffff" className="dark:fill-slate-900" />
                      </g>
                    );
                  })()}
                </svg>

                {/* Dynamic Conversion Rate Value */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl font-extrabold text-foreground">{conversionRate}%</span>
                  <span className="text-xs font-bold text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                    +2.5%
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">Last Week</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: DEALS WON VS LOST & SALES PIPELINE OVERVIEW */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* DEALS WON VS LOST (8/12 = 2/3 width) */}
            <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-foreground tracking-tight">Deals Won Vs Lost</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">+15% vs last month</p>
                </div>
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="w-8 h-8 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer shadow-2xs"
                    title="Refresh stats"
                  >
                    <i className={cn("fa-solid fa-arrows-rotate text-xs", loading && "fa-spin")} />
                  </button>
                )}
              </div>

              {/* 2 Row Cards: Deals Won and Deals Lost */}
              <div className="space-y-4 pt-1">
                {/* Deals Won */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border/70 bg-card shadow-2xs">
                  <div className="w-12 h-12 rounded-xl bg-[#fff9e6] dark:bg-amber-950/30 border border-[#ffeaa7] dark:border-amber-900/40 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-tag text-[#2d3748] dark:text-amber-200 text-lg" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Deals Won</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-extrabold text-foreground">{wonDealsCount}</span>
                      <span className="text-xs font-bold text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        +2.5% Last Week
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deals Lost */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border/70 bg-card shadow-2xs">
                  <div className="w-12 h-12 rounded-xl bg-[#ffebeb] dark:bg-rose-950/30 border border-[#ffcccc] dark:border-rose-900/40 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-tag text-[#2d3748] dark:text-rose-200 text-lg" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Deals Lost</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-extrabold text-foreground">{lostDealsCount}</span>
                      <span className="text-xs font-bold text-[#dc3545] bg-[#ffebeb] dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                        -5.8% Last Week
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SALES PIPELINE OVERVIEW (4/12 = 1/3 width) */}
            <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Sales Pipeline Overview</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-extrabold text-foreground">
                    ${formatUSDDec(totalPipelineVal)}
                  </span>
                  <span className="text-xs font-bold text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    +2.5% Last Week
                  </span>
                </div>
              </div>

              {/* 4 Colored Stage Progress Bars (Deterministic formatting) */}
              <div className="space-y-3 pt-3">
                {/* 1. Probability */}
                <div className="relative p-3 rounded-xl bg-[#f3f0fc] dark:bg-purple-950/30 overflow-hidden border border-purple-200/40 dark:border-purple-900/30">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#e2d9f3] dark:bg-purple-900/40 rounded-xl transition-all duration-500"
                    style={{ width: `${pipelineStages.prob.pct}%` }}
                  />
                  <span className="relative z-10 text-xs font-bold text-foreground">
                    Probability - ${formatUSD(pipelineStages.prob.sum)}
                  </span>
                </div>

                {/* 2. Proposal Sent */}
                <div className="relative p-3 rounded-xl bg-[#f0faf5] dark:bg-emerald-950/30 overflow-hidden border border-emerald-200/40 dark:border-emerald-900/30">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#d7f4e3] dark:bg-emerald-900/40 rounded-xl transition-all duration-500"
                    style={{ width: `${pipelineStages.prop.pct}%` }}
                  />
                  <span className="relative z-10 text-xs font-bold text-foreground">
                    Proposal Sent - ${formatUSD(pipelineStages.prop.sum)}
                  </span>
                </div>

                {/* 3. Opportunity / Negotiation */}
                <div className="relative p-3 rounded-xl bg-[#fffbf0] dark:bg-amber-950/30 overflow-hidden border border-amber-200/40 dark:border-amber-900/30">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#fff0c8] dark:bg-amber-900/40 rounded-xl transition-all duration-500"
                    style={{ width: `${pipelineStages.opp.pct}%` }}
                  />
                  <span className="relative z-10 text-xs font-bold text-foreground">
                    Opportunity - ${formatUSD(pipelineStages.opp.sum)}
                  </span>
                </div>

                {/* 4. Total Closed Deals */}
                <div className="relative p-3 rounded-xl bg-[#fff5f5] dark:bg-rose-950/30 overflow-hidden border border-rose-200/40 dark:border-rose-900/30">
                  <div
                    className="absolute inset-y-0 left-0 bg-[#ffe2e2] dark:bg-rose-900/40 rounded-xl transition-all duration-500"
                    style={{ width: `${pipelineStages.totalWon.pct}%` }}
                  />
                  <span className="relative z-10 text-xs font-bold text-foreground">
                    Total Deals - ${formatUSD(pipelineStages.totalWon.sum)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3: RECENTLY CREATED DEALS & AVERAGE DEAL SIZE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* RECENTLY CREATED DEALS TABLE (8/12 = 2/3 width) */}
            <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Recently Created Deals</h2>
                
                {/* Interactive Timeframe Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDealsDropdown(!showDealsDropdown)}
                    className="flex items-center gap-1 bg-muted/40 hover:bg-muted/70 px-2.5 py-1 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    <span>{dealsTimeframe}</span>
                    <i className="fa-solid fa-chevron-down text-[10px] ml-1 text-muted-foreground" />
                  </button>

                  {showDealsDropdown && (
                    <div className="absolute right-0 mt-1 w-32 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                      {(["Weekly", "Monthly", "All"] as const).map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => {
                            setDealsTimeframe(tf);
                            setShowDealsDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                            dealsTimeframe === tf ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground"
                          )}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Clean Table Layout with Click-to-Edit */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                      <th className="py-2.5 px-3">Deals</th>
                      <th className="py-2.5 px-3">Value</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {recentDealsList.map((d, idx) => {
                      const isWon = d.stage === "Closed Won" || (d.stage as string) === "Won";
                      const isLost = d.stage === "Closed Lost" || (d.stage as string) === "Lost";
                      return (
                        <tr
                          key={d._id || idx}
                          onClick={() => onEditDeal(d)}
                          className="hover:bg-muted/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-3">
                            <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{d.dealName}</p>
                            <p className="text-xs text-muted-foreground font-normal">
                              {"category" in d && d.category ? d.category : d.clientAccount || "Appointment"}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 font-extrabold font-mono text-foreground text-sm">
                            ${formatUSD(d.dealValue)}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <span
                              className={cn(
                                "inline-block px-3 py-1 rounded-full text-xs font-bold",
                                isWon
                                  ? "bg-[#d7f4e3] text-[#28c76f] dark:bg-emerald-950/50"
                                  : isLost
                                  ? "bg-[#ffe2e2] text-[#dc3545] dark:bg-rose-950/50"
                                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              )}
                            >
                              {isWon ? "Won" : isLost ? "Lost" : d.stage}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AVG DEAL SIZE (4/12 = 1/3 width) */}
            <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Avg Deal Size</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-extrabold text-foreground">
                    {avgDealSizeFormatted}
                  </span>
                  <span className="text-xs font-bold text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    +2.5% Last Week
                  </span>
                </div>
              </div>

              {/* Stepped-Line Chart */}
              <div className="relative pt-4">
                <svg viewBox="0 0 280 140" className="w-full h-40 overflow-visible">
                  {/* Horizontal Dashed Grid Lines (30k, 25k, 20k, 15k, 10k, 5k) */}
                  {[
                    { label: "30k", y: 15 },
                    { label: "25k", y: 35 },
                    { label: "20k", y: 55 },
                    { label: "15k", y: 75 },
                    { label: "10k", y: 95 },
                    { label: "5k", y: 115 },
                  ].map((grid, idx) => (
                    <g key={idx}>
                      <text x="0" y={grid.y + 3} className="text-[9px] font-semibold fill-muted-foreground font-mono">
                        {grid.label}
                      </text>
                      <line
                        x1="30"
                        y1={grid.y}
                        x2="280"
                        y2={grid.y}
                        stroke="currentColor"
                        strokeDasharray="4 4"
                        className="text-border/60"
                      />
                    </g>
                  ))}

                  {/* Stepped-Line Path (Mon to Sun) */}
                  <path
                    d="M 30 95 L 100 95 L 100 55 L 140 55 L 140 25 L 180 25 L 180 75 L 220 75 L 220 95 L 250 95 L 250 55 L 280 55"
                    fill="none"
                    stroke="#4c3b71"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="miter"
                    className="dark:stroke-purple-400"
                  />

                  {/* X-Axis Day Labels */}
                  {[
                    { day: "Mon", x: 30 },
                    { day: "Tue", x: 70 },
                    { day: "Wed", x: 115 },
                    { day: "Thu", x: 155 },
                    { day: "Fri", x: 195 },
                    { day: "Sat", x: 235 },
                    { day: "Sun", x: 275 },
                  ].map((d, idx) => (
                    <text
                      key={idx}
                      x={d.x}
                      y="135"
                      textAnchor="middle"
                      className="text-[10px] font-semibold fill-muted-foreground"
                    >
                      {d.day}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
          </div>

          {/* ROW 4: SALES GROWTH (FULL-WIDTH SPLINE AREA CURVE) */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Sales Growth</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Historical trajectory and revenue volume curve</p>
              </div>

              {/* Interactive Period Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGrowthDropdown(!showGrowthDropdown)}
                  className="flex items-center gap-1 bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <span>{growthPeriod}</span>
                  <i className="fa-solid fa-chevron-down text-[10px] ml-1 text-muted-foreground" />
                </button>

                {showGrowthDropdown && (
                  <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                    {(["Last Year", "Last 6 Months", "This Year"] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => {
                          setGrowthPeriod(period);
                          setShowGrowthDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                          growthPeriod === period ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground"
                        )}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Spline Area Chart with Hover Points (Using Theme Color) */}
            <div className="relative pt-2">
              <svg viewBox="0 0 1000 240" className="w-full h-64 overflow-visible">
                <defs>
                  {/* Linear Gradient for Theme Color Area Fill */}
                  <linearGradient id="salesGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal Dashed Grid Lines (6k, 5k, 4k, 3k, 2k, 1k) */}
                {[
                  { label: "6k", y: 20 },
                  { label: "5k", y: 55 },
                  { label: "4k", y: 90 },
                  { label: "3k", y: 125 },
                  { label: "2k", y: 160 },
                  { label: "1k", y: 195 },
                ].map((grid, idx) => (
                  <g key={idx}>
                    <text x="0" y={grid.y + 4} className="text-[11px] font-semibold fill-muted-foreground font-mono">
                      {grid.label}
                    </text>
                    <line
                      x1="35"
                      y1={grid.y}
                      x2="1000"
                      y2={grid.y}
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-border/60"
                    />
                  </g>
                ))}

                {/* Smooth Spline Gradient Area */}
                <path d={splinePaths.areaPath} fill="url(#salesGrowthGrad)" />

                {/* Smooth Spline Theme Color Border Line */}
                <path
                  d={splinePaths.linePath}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Month Labels & Interactive Data Nodes on X-axis */}
                {monthlyGrowthData.map((m, idx) => {
                  const x = 35 + (idx / Math.max(1, monthlyGrowthData.length - 1)) * 965;
                  const isHovered = hoveredGrowthMonth === idx;
                  return (
                    <g
                      key={idx}
                      onMouseEnter={() => setHoveredGrowthMonth(idx)}
                      onMouseLeave={() => setHoveredGrowthMonth(null)}
                      className="cursor-pointer"
                    >
                      {/* Month Text Label */}
                      <text
                        x={x}
                        y="225"
                        textAnchor="middle"
                        className={cn(
                          "text-[11px] transition-all",
                          isHovered ? "font-bold fill-primary text-xs" : "font-semibold fill-muted-foreground"
                        )}
                      >
                        {m.month}
                      </text>

                      {/* Tooltip on hover */}
                      {isHovered && (
                        <g>
                          <circle cx={x} cy={m.y} r="5" fill="hsl(var(--primary))" stroke="#ffffff" strokeWidth="2" />
                          <rect
                            x={x - 30}
                            y={m.y - 32}
                            width="60"
                            height="24"
                            rx="6"
                            fill="#1e293b"
                            className="dark:fill-slate-100"
                          />
                          <text
                            x={x}
                            y={m.y - 16}
                            textAnchor="middle"
                            fill="#ffffff"
                            className="dark:fill-slate-900 text-[10px] font-black font-mono"
                          >
                            {m.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD VIEW (Authentic CRMS Deals Kanban Design) */}
      {viewMode === "kanban" && (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[550px]">
          {(["Prospecting", "Discovery", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"] as const).map(
            (stage) => {
              const stageDeals = filteredDeals.filter((d) => d.stage === stage);
              const stageTotal = stageDeals.reduce((sum, d) => sum + d.dealValue, 0);

              const stageColors: Record<string, { dot: string; bg: string; text: string }> = {
                Prospecting: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
                Discovery: { dot: "bg-sky-500", bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400" },
                "Proposal Sent": {
                  dot: "bg-amber-500",
                  bg: "bg-amber-500/10",
                  text: "text-amber-600 dark:text-amber-400",
                },
                Negotiation: {
                  dot: "bg-purple-500",
                  bg: "bg-purple-500/10",
                  text: "text-purple-600 dark:text-purple-400",
                },
                "Closed Won": {
                  dot: "bg-emerald-500",
                  bg: "bg-emerald-500/10",
                  text: "text-emerald-600 dark:text-emerald-400",
                },
                "Closed Lost": { dot: "bg-rose-500", bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
              };

              const stageConf = stageColors[stage] || stageColors.Prospecting;

              return (
                <div key={stage} className="w-72 shrink-0 flex flex-col gap-3">
                  {/* Column Header Card */}
                  <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", stageConf.dot)} />
                        <h3 className="font-extrabold text-sm text-foreground tracking-tight">{stage}</h3>
                      </div>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors cursor-pointer"
                        title="Column options"
                      >
                        <i className="fa-solid fa-ellipsis-vertical text-xs" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-1">
                      {stageDeals.length} {stageDeals.length === 1 ? "Lead" : "Leads"} &bull; ${formatUSD(stageTotal)}
                    </p>
                  </div>

                  {/* Deals Cards List */}
                  <div className="space-y-3">
                    {stageDeals.length === 0 ? (
                      <div className="bg-muted/20 border border-dashed border-border/80 rounded-xl p-6 text-center text-xs text-muted-foreground font-medium">
                        No deals in {stage}
                      </div>
                    ) : (
                      stageDeals.map((deal) => {
                        const initials = deal.clientAccount
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase() || "DL";

                        return (
                          <div
                            key={deal._id}
                            className="bg-card border border-border/80 rounded-xl p-4 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all space-y-3 group"
                          >
                            {/* Card Header with Initials Badge */}
                            <div className="flex items-start gap-3">
                              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0", stageConf.bg, stageConf.text)}>
                                {initials}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                                  {deal.dealName}
                                </h4>
                                <p className="text-[11px] text-muted-foreground truncate">{deal.clientAccount}</p>
                              </div>
                            </div>

                            {/* Details with Icons */}
                            <div className="space-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <i className="fa-solid fa-dollar-sign text-muted-foreground text-xs w-3 text-center" />
                                <span className="font-mono font-bold text-foreground">${formatUSD(deal.dealValue)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <i className="fa-solid fa-briefcase text-muted-foreground text-[11px] w-3 text-center" />
                                <span className="text-muted-foreground truncate text-[11px]">{deal.venture}</span>
                              </div>
                            </div>

                            {/* Owner and Probability */}
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-foreground shrink-0 border border-border/60">
                                  {deal.owner ? deal.owner[0] : "U"}
                                </div>
                                <span className="font-medium text-foreground truncate text-[11px]">
                                  {deal.owner || "Unassigned"}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold font-mono shrink-0",
                                  deal.probability >= 70
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : deal.probability >= 40
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                )}
                              >
                                {deal.probability}%
                              </span>
                            </div>

                            {/* Footer: Date and Action Buttons */}
                            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                              <div className="flex items-center gap-1 font-mono">
                                <i className="fa-solid fa-calendar text-[10px]" />
                                <span>{deal.expectedClose || "No date"}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => onEditDeal(deal)}
                                  className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                  title="Edit Deal"
                                >
                                  <i className="fa-solid fa-pen-to-square text-xs" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteDeal(deal._id, deal.dealName)}
                                  className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                  title="Delete Deal"
                                >
                                  <i className="fa-solid fa-trash text-xs" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* VIEW 3: ALL DEALS TABLE VIEW */}
      {viewMode === "table" && (
        <Card className="border border-border shadow-sm overflow-hidden">
          {/* Table Filters */}
          <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search deals or accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground cursor-pointer"
              >
                <option value="All">All Stages</option>
                <option value="Prospecting">Prospecting</option>
                <option value="Discovery">Discovery</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>

              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground cursor-pointer"
              >
                <option value="All">All Owners</option>
                {[...new Set(deals.map((d) => d.owner).filter(Boolean))].sort().map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={onNewDeal}
              color="primary"
              size="sm"
              className="gap-2 font-bold cursor-pointer h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <i className="fa-solid fa-plus text-xs" /> New Sales Deal
            </Button>
          </div>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4">Deal / Scope</th>
                  <th className="py-3 px-4">Client Account</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Probability</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Expected Close</th>
                  <th className="py-3 px-4 text-right">Value</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDeals.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No sales deals found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDeals.map((deal) => {
                    const stageColors: Record<string, string> = {
                      Prospecting: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                      Discovery: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                      "Proposal Sent": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                      Negotiation: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                      "Closed Won": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                      "Closed Lost": "bg-red-500/10 text-red-600 dark:text-red-400",
                    };
                    return (
                      <tr key={deal._id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{deal.dealName}</td>
                        <td className="py-3 px-4 text-foreground font-medium">{deal.clientAccount}</td>
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                              stageColors[deal.stage] || "bg-muted text-muted-foreground"
                            )}
                          >
                            {deal.stage}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono">{deal.probability}%</td>
                        <td className="py-3 px-4">{deal.owner || "Unassigned"}</td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">{deal.expectedClose}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          ${formatUSD(deal.dealValue)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onEditDeal(deal)}
                              className="p-1 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              title="Edit Deal"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs" />
                            </button>
                            <button
                              onClick={() => onDeleteDeal(deal._id, deal.dealName)}
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                              title="Delete Deal"
                            >
                              <i className="fa-solid fa-trash text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
