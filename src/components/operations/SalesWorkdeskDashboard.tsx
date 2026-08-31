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

  // Filters & State
  const [revenueTimeframe, setRevenueTimeframe] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [dealsTimeframe, setDealsTimeframe] = useState<"Weekly" | "Monthly" | "All">("Weekly");
  const [growthPeriod, setGrowthPeriod] = useState<"Last Year" | "Last 6 Months" | "This Year">("Last Year");
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("All");
  const [hoveredGrowthMonth, setHoveredGrowthMonth] = useState<number | null>(null);

  // Exact CRMS Reference Demo Deals
  const defaultRecentDeals = [
    { _id: "demo-1", dealName: "SkyHigh Annual Booking", category: "Appointment", clientAccount: "SkyHigh Aviation", dealValue: 7811800, stage: "Closed Won" as const, owner: "Sara Khan" },
    { _id: "demo-2", dealName: "CRM Onboarding Package", category: "Appointment", clientAccount: "NovaTech Solutions", dealValue: 7211289, stage: "Closed Lost" as const, owner: "Ahmed Raza" },
    { _id: "demo-3", dealName: "Enterprise Plan Upgrade", category: "Appointment", clientAccount: "Apex Digital Labs", dealValue: 1611457, stage: "Closed Won" as const, owner: "Bilal Hassan" },
    { _id: "demo-4", dealName: "CRM Migration Project", category: "Appointment", clientAccount: "AlphaStream Media", dealValue: 8511789, stage: "Closed Won" as const, owner: "Fatima Noor" },
    { _id: "demo-5", dealName: "Project Management", category: "Appointment", clientAccount: "Global Logistics", dealValue: 6512589, stage: "Closed Won" as const, owner: "Omar Malik" },
  ];

  // Reference Values
  const wonDealsCount = 68;
  const lostDealsCount = 16;
  const conversionRate = "55.6";
  const totalPipelineValue = "$2,56,054.50";
  const avgDealSize = "$1,56,054.50";

  // Filtered deals for table/kanban
  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      const matchSearch =
        d.dealName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.clientAccount.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.owner.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStage = stageFilter === "All" || d.stage === stageFilter;
      const matchOwner = ownerFilter === "All" || d.owner === ownerFilter;
      return matchSearch && matchStage && matchOwner;
    });
  }, [deals, searchQuery, stageFilter, ownerFilter]);

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
              <i className="fa-solid fa-table-list text-[11px] text-sky-500" /> All Deals ({deals.length})
            </button>
          </div>

          {/* Date range display */}
          <div className="hidden lg:flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground shadow-2xs">
            <i className="fa-solid fa-calendar text-muted-foreground text-xs" />
            <span>31 August 26 - 31 August 27</span>
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

          {/* Collapse Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 cursor-pointer shadow-2xs text-muted-foreground hover:text-foreground"
            title="Collapse / Expand"
          >
            <i className="fa-solid fa-chevron-up text-xs" />
          </Button>

          {/* New Sales Deal Button */}
          <Button
            onClick={onNewDeal}
            color="primary"
            size="sm"
            className="gap-2 font-bold cursor-pointer h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <i className="fa-solid fa-plus text-xs" /> New Sales Deal
          </Button>
        </div>
      </div>

      {/* VIEW 1: EXACT  SALES DASHBOARD */}
      {viewMode === "overview" && (
        <div className="space-y-6">
          {/* ROW 1: TOTAL REVENUE & CONVERSION RATE GAUGE */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* TOTAL REVENUE CARD (8/12 = 2/3 width) */}
            <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              {/* Card Header with Avatars & Toggle Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-foreground tracking-tight">Total Revenue</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">26 Jan 2026 - 26 Jan 2027</p>
                </div>

                <div className="flex items-center gap-4">
                  {/* Avatar Stack */}
                  <div className="flex items-center -space-x-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-card shadow-2xs">
                      SK
                    </div>
                    <div className="w-7 h-7 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-card shadow-2xs">
                      AR
                    </div>
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-card shadow-2xs">
                      BH
                    </div>
                    <div className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-card shadow-2xs">
                      FN
                    </div>
                    <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-card shadow-2xs">
                      +4
                    </div>
                  </div>

                  {/* Timeframe Toggle Pills (Weekly / Monthly / Yearly) */}
                  <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
                    {(["weekly", "monthly", "yearly"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setRevenueTimeframe(tab)}
                        className={cn(
                          "px-3 py-1 text-xs font-bold capitalize transition-all rounded-md cursor-pointer",
                          revenueTimeframe === tab
                            ? "bg-rose-600 text-white shadow-xs"
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
                    {/* Ribbon pointed bookmark arrow */}
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[8px] border-l-[#e09d1d] translate-x-full"
                    />
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex items-center justify-between pl-5">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Total MTD Revenue</p>
                      <h3 className="text-xl font-extrabold text-foreground tracking-tight">$18,50,800.00</h3>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          +2.5% <span className="font-normal text-muted-foreground">Month Till Date</span>
                        </span>
                      </div>
                    </div>

                    {/* Sparkline Bar Graph */}
                    <div className="flex items-end gap-1 h-12 shrink-0 pl-2">
                      <div className="w-1.5 h-6 bg-indigo-300 dark:bg-indigo-700/60 rounded-xs" />
                      <div className="w-1.5 h-9 bg-indigo-400 dark:bg-indigo-600/70 rounded-xs" />
                      <div className="w-1.5 h-4 bg-indigo-300 dark:bg-indigo-700/60 rounded-xs" />
                      <div className="w-1.5 h-11 bg-indigo-500 dark:bg-indigo-500 rounded-xs" />
                      <div className="w-1.5 h-8 bg-indigo-400 dark:bg-indigo-600/70 rounded-xs" />
                    </div>
                  </div>
                </div>

                {/* YTD Card with Red Ribbon Tab */}
                <div className="relative flex items-stretch bg-slate-50/80 dark:bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm transition-all">
                  {/* Red Ribbon */}
                  <div className="relative w-14 bg-[#dc3545] text-white flex items-center justify-center font-black text-xs tracking-wider shrink-0 select-none">
                    <span className="[writing-mode:vertical-lr] rotate-180">YTD</span>
                    {/* Ribbon pointed bookmark arrow */}
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[8px] border-l-[#dc3545] translate-x-full"
                    />
                  </div>

                  {/* Card Content */}
                  <div className="p-4 flex-1 flex items-center justify-between pl-5">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Total YTD Revenue</p>
                      <h3 className="text-xl font-extrabold text-foreground tracking-tight">$85,25,800.00</h3>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#dc3545] bg-[#ffebeb] dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                          -5.0% <span className="font-normal text-muted-foreground">Year Till Date</span>
                        </span>
                      </div>
                    </div>

                    {/* Sparkline Bar Graph */}
                    <div className="flex items-end gap-1 h-12 shrink-0 pl-2">
                      <div className="w-1.5 h-5 bg-indigo-300 dark:bg-indigo-700/60 rounded-xs" />
                      <div className="w-1.5 h-8 bg-indigo-400 dark:bg-indigo-600/70 rounded-xs" />
                      <div className="w-1.5 h-12 bg-indigo-500 dark:bg-indigo-500 rounded-xs" />
                      <div className="w-1.5 h-6 bg-indigo-300 dark:bg-indigo-700/60 rounded-xs" />
                      <div className="w-1.5 h-10 bg-indigo-400 dark:bg-indigo-600/70 rounded-xs" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONVERSION RATE SPEEDOMETER GAUGE CARD (4/12 = 1/3 width) */}
            <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Conversion Rate</h2>
                <p className="text-xs text-muted-foreground mt-0.5">26 Jan 2026 - 26 Jan 2027</p>
              </div>

              {/* Speedometer SVG Gauge */}
              <div className="relative flex flex-col items-center justify-center my-2">
                <svg viewBox="0 0 300 160" className="w-full max-w-[260px] overflow-visible">
                  {/* Render 28 Radial Bar Segments */}
                  {Array.from({ length: 28 }).map((_, i) => {
                    const totalBars = 28;
                    // Angle in radians from PI (180deg - left) to 0 (0deg - right)
                    const angle = Math.PI - (i / (totalBars - 1)) * Math.PI;
                    const rInner = 80;
                    const rOuter = 110;
                    const cx = 150;
                    const cy = 135;

                    const x1 = cx + rInner * Math.cos(angle);
                    const y1 = cy - rInner * Math.sin(angle);
                    const x2 = cx + rOuter * Math.cos(angle);
                    const y2 = cy - rOuter * Math.sin(angle);

                    // Active bars up to 55.6% (approx 16 bars)
                    const isActive = i / (totalBars - 1) <= 0.56;
                    const strokeColor = isActive ? "#e84b4b" : "#e9ecef";

                    return (
                      <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={strokeColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                        className={!isActive ? "dark:stroke-slate-800" : ""}
                      />
                    );
                  })}

                  {/* Tick Labels: 0, 20, 40, 60, 80, 100 */}
                  {[
                    { label: "0", angle: Math.PI },
                    { label: "20", angle: Math.PI * 0.8 },
                    { label: "40", angle: Math.PI * 0.6 },
                    { label: "60", angle: Math.PI * 0.4 },
                    { label: "80", angle: Math.PI * 0.2 },
                    { label: "100", angle: 0 },
                  ].map((t, idx) => {
                    const rText = 62;
                    const tx = 150 + rText * Math.cos(t.angle);
                    const ty = 135 - rText * Math.sin(t.angle);
                    return (
                      <text
                        key={idx}
                        x={tx}
                        y={ty + 4}
                        textAnchor="middle"
                        className="text-[10px] font-bold fill-muted-foreground"
                      >
                        {t.label}
                      </text>
                    );
                  })}

                  {/* Needle Pivot & Needle Line */}
                  {(() => {
                    const needleAngle = Math.PI - 0.556 * Math.PI; // ~79.9 degrees
                    const needleLength = 82;
                    const nx = 150 + needleLength * Math.cos(needleAngle);
                    const ny = 135 - needleLength * Math.sin(needleAngle);
                    return (
                      <g>
                        <line
                          x1="150"
                          y1="135"
                          x2={nx}
                          y2={ny}
                          stroke="#1e293b"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          className="dark:stroke-slate-100"
                        />
                        <circle cx="150" cy="135" r="7" fill="#1e293b" className="dark:fill-slate-100" />
                        <circle cx="150" cy="135" r="3" fill="#ffffff" className="dark:fill-slate-900" />
                      </g>
                    );
                  })()}
                </svg>

                {/* Conversion Rate Value */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-extrabold text-foreground">{conversionRate}%</span>
                  <span className="text-xs font-bold text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    +2.5% Last Week
                  </span>
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
                <button
                  type="button"
                  onClick={onRefresh}
                  className="w-8 h-8 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer shadow-2xs"
                  title="Refresh stats"
                >
                  <i className="fa-solid fa-arrows-rotate text-xs" />
                </button>
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
                    $2,56,054.50
                  </span>
                  <span className="text-xs font-bold text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    +2.5% Last Week
                  </span>
                </div>
              </div>

              {/* 4 Colored Stage Progress Bars */}
              <div className="space-y-3 pt-3">
                {/* 1. Probability */}
                <div className="relative p-3 rounded-xl bg-[#f3f0fc] dark:bg-purple-950/30 overflow-hidden border border-purple-200/40 dark:border-purple-900/30">
                  <div className="absolute inset-y-0 left-0 bg-[#e2d9f3] dark:bg-purple-900/40 rounded-xl" style={{ width: "30%" }} />
                  <span className="relative z-10 text-xs font-bold text-foreground">Probability - $50,000</span>
                </div>

                {/* 2. Proposal Sent */}
                <div className="relative p-3 rounded-xl bg-[#f0faf5] dark:bg-emerald-950/30 overflow-hidden border border-emerald-200/40 dark:border-emerald-900/30">
                  <div className="absolute inset-y-0 left-0 bg-[#d7f4e3] dark:bg-emerald-900/40 rounded-xl" style={{ width: "70%" }} />
                  <span className="relative z-10 text-xs font-bold text-foreground">Proposal Sent - $56,054</span>
                </div>

                {/* 3. Opportunity */}
                <div className="relative p-3 rounded-xl bg-[#fffbf0] dark:bg-amber-950/30 overflow-hidden border border-amber-200/40 dark:border-amber-900/30">
                  <div className="absolute inset-y-0 left-0 bg-[#fff0c8] dark:bg-amber-900/40 rounded-xl" style={{ width: "25%" }} />
                  <span className="relative z-10 text-xs font-bold text-foreground">Opportunity - $1,00,000</span>
                </div>

                {/* 4. Total Deals */}
                <div className="relative p-3 rounded-xl bg-[#fff5f5] dark:bg-rose-950/30 overflow-hidden border border-rose-200/40 dark:border-rose-900/30">
                  <div className="absolute inset-y-0 left-0 bg-[#ffe2e2] dark:bg-rose-900/40 rounded-xl" style={{ width: "40%" }} />
                  <span className="relative z-10 text-xs font-bold text-foreground">Total Deals - $1,00,000</span>
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
                <div className="flex items-center gap-1 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/60 text-xs font-semibold text-foreground cursor-pointer">
                  <span>Weekly</span>
                  <i className="fa-solid fa-chevron-down text-[10px] ml-1 text-muted-foreground" />
                </div>
              </div>

              {/* Clean Table Layout */}
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
                    {defaultRecentDeals.map((d, idx) => {
                      const isWon = d.stage === "Closed Won" || (d.stage as string) === "Won";
                      return (
                        <tr key={d._id || idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-3">
                            <p className="font-bold text-foreground text-sm">{d.dealName}</p>
                            <p className="text-xs text-muted-foreground font-normal">
                              {"category" in d && d.category ? d.category : d.clientAccount || "Appointment"}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 font-extrabold font-mono text-foreground text-sm">
                            ${Number(d.dealValue).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <span
                              className={cn(
                                "inline-block px-3 py-1 rounded-full text-xs font-bold",
                                isWon
                                  ? "bg-[#d7f4e3] text-[#28c76f] dark:bg-emerald-950/50"
                                  : "bg-[#ffe2e2] text-[#dc3545] dark:bg-rose-950/50"
                              )}
                            >
                              {isWon ? "Won" : "Lost"}
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
                    $1,56,054.50
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
              <h2 className="text-base font-extrabold text-foreground tracking-tight">Sales Growth</h2>
              <div className="flex items-center gap-1 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-foreground cursor-pointer">
                <span>Last Year</span>
                <i className="fa-solid fa-chevron-down text-[10px] ml-1 text-muted-foreground" />
              </div>
            </div>

            {/* Spline Area Chart */}
            <div className="relative pt-2">
              <svg viewBox="0 0 1000 240" className="w-full h-64 overflow-visible">
                <defs>
                  {/* Linear Gradient for Red Area Fill */}
                  <linearGradient id="salesGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e84b4b" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#e84b4b" stopOpacity="0.02" />
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
                <path
                  d="M 35 170 
                     C 70 160, 95 100, 130 90 
                     C 160 80, 185 190, 215 190 
                     C 245 190, 275 110, 305 100 
                     C 340 90, 370 65, 400 65 
                     C 435 65, 465 125, 495 125 
                     C 525 125, 555 90, 585 90 
                     C 620 90, 645 180, 675 180 
                     C 705 180, 735 30, 765 30 
                     C 795 30, 825 65, 855 75 
                     C 885 85, 915 95, 945 115 
                     C 965 125, 985 135, 1000 135 
                     L 1000 200 L 35 200 Z"
                  fill="url(#salesGrowthGrad)"
                />

                {/* Smooth Spline Red Border Line */}
                <path
                  d="M 35 170 
                     C 70 160, 95 100, 130 90 
                     C 160 80, 185 190, 215 190 
                     C 245 190, 275 110, 305 100 
                     C 340 90, 370 65, 400 65 
                     C 435 65, 465 125, 495 125 
                     C 525 125, 555 90, 585 90 
                     C 620 90, 645 180, 675 180 
                     C 705 180, 735 30, 765 30 
                     C 795 30, 825 65, 855 75 
                     C 885 85, 915 95, 945 115 
                     C 965 125, 985 135, 1000 135"
                  fill="none"
                  stroke="#e84b4b"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Month Labels on X-axis */}
                {[
                  { month: "Jan", x: 35 },
                  { month: "Feb", x: 130 },
                  { month: "Mar", x: 215 },
                  { month: "Apr", x: 305 },
                  { month: "May", x: 400 },
                  { month: "Jun", x: 495 },
                  { month: "Jul", x: 585 },
                  { month: "Aug", x: 675 },
                  { month: "Sep", x: 765 },
                  { month: "Oct", x: 855 },
                  { month: "Nov", x: 945 },
                  { month: "Dec", x: 1000 },
                ].map((m, idx) => (
                  <text
                    key={idx}
                    x={m.x}
                    y="225"
                    textAnchor="middle"
                    className="text-[11px] font-semibold fill-muted-foreground"
                  >
                    {m.month}
                  </text>
                ))}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD VIEW */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {(["Prospecting", "Discovery", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"] as const).map(
            (stage) => {
              const stageDeals = filteredDeals.filter((d) => d.stage === stage);
              const stageTotal = stageDeals.reduce((sum, d) => sum + d.dealValue, 0);

              const stageColors: Record<string, { badge: string; border: string }> = {
                Prospecting: { badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400", border: "border-t-blue-500" },
                Discovery: { badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400", border: "border-t-sky-500" },
                "Proposal Sent": {
                  badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  border: "border-t-amber-500",
                },
                Negotiation: {
                  badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                  border: "border-t-purple-500",
                },
                "Closed Won": {
                  badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  border: "border-t-emerald-500",
                },
                "Closed Lost": { badge: "bg-red-500/10 text-red-600 dark:text-red-400", border: "border-t-red-500" },
              };

              return (
                <div
                  key={stage}
                  className={cn(
                    "bg-card border border-border rounded-xl p-3.5 space-y-3 border-t-4 flex flex-col justify-between min-w-[220px] shadow-2xs",
                    stageColors[stage].border
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-xs font-bold text-foreground">{stage}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", stageColors[stage].badge)}>
                        {stageDeals.length}
                      </span>
                    </div>
                    <div className="py-1 text-[11px] font-mono font-bold text-muted-foreground">
                      ${stageTotal.toLocaleString()}
                    </div>

                    <div className="space-y-2.5 mt-2">
                      {stageDeals.length === 0 ? (
                        <div className="text-[11px] text-muted-foreground text-center py-8 border border-dashed border-border/60 rounded-lg">
                          No deals in {stage}
                        </div>
                      ) : (
                        stageDeals.map((deal) => (
                          <div
                            key={deal._id}
                            className="p-3 bg-muted/30 hover:bg-muted/60 border border-border/80 rounded-lg space-y-2 transition-all shadow-2xs group"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-bold text-foreground line-clamp-1">{deal.clientAccount}</h4>
                                <p className="text-[10px] text-muted-foreground line-clamp-1">{deal.dealName}</p>
                              </div>
                              <span className="text-xs font-mono font-extrabold text-rose-600 dark:text-rose-400 shrink-0 ml-1">
                                ${deal.dealValue.toLocaleString()}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                              <span className="flex items-center gap-1 font-medium">
                                <i className="fa-solid fa-user-tie text-[9px] text-primary" /> {deal.owner}
                              </span>
                              <span className="font-mono">{deal.probability}% win</span>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] font-mono text-muted-foreground">
                                <i className="fa-solid fa-calendar text-[9px] mr-1" /> {deal.expectedClose}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => onEditDeal(deal)}
                                  className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  title="Edit Deal"
                                >
                                  <i className="fa-solid fa-pen text-[10px]" />
                                </button>
                                <button
                                  onClick={() => onDeleteDeal(deal._id, deal.dealName)}
                                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                  title="Delete Deal"
                                >
                                  <i className="fa-solid fa-trash text-[10px]" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
              className="gap-2 font-bold cursor-pointer h-9 px-4 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
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
                          ${deal.dealValue.toLocaleString()}
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
