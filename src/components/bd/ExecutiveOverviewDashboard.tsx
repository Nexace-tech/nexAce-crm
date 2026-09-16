"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Lead } from "@/components/bd/LeadDetailPanel";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";

interface ExecutiveOverviewDashboardProps {
  deals?: SalesDeal[];
  leads?: Lead[];
  proposalsCount?: number;
  onNavigateToLeads?: () => void;
  onNavigateToDeals?: () => void;
  onNavigateToProposals?: () => void;
  onRefresh?: () => void;
}

// Executive performance rep model
interface ExecutivePerformanceRep {
  id: string;
  name: string;
  avatar: string;
  initials: string;
  dealsClosed: number;
  revenueGenerated: number;
  conversionRate: number;
  status: "Excellent" | "Good" | "Average";
  dealsBarVal: number;
}

export default function ExecutiveOverviewDashboard({
  deals = [],
  leads = [],
  proposalsCount = 10,
  onNavigateToLeads,
  onNavigateToDeals,
  onNavigateToProposals,
  onRefresh,
}: ExecutiveOverviewDashboardProps) {
  // Dropdown states
  const [exportOpen, setExportOpen] = useState(false);
  const [revenueTimeframe, setRevenueTimeframe] = useState<"Last Month" | "Last 6 Months" | "Last 3 Months">("Last 6 Months");
  const [revenueDropdownOpen, setRevenueDropdownOpen] = useState(false);

  const [dealsYear, setDealsYear] = useState<"2025" | "2024" | "2023">("2025");
  const [dealsDropdownOpen, setDealsDropdownOpen] = useState(false);

  const [forecastYear, setForecastYear] = useState<"2025" | "2024" | "2023">("2025");
  const [forecastDropdownOpen, setForecastDropdownOpen] = useState(false);

  const [tablePeriod, setTablePeriod] = useState<"Weekly" | "Monthly" | "Yearly">("Weekly");
  const [tableDropdownOpen, setTableDropdownOpen] = useState(false);

  const [hoveredForecastIdx, setHoveredForecastIdx] = useState<number | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Trigger export feedback
  const handleExport = (type: "PDF" | "Excel") => {
    setExportOpen(false);
    setExportNotice(`Exporting executive report as ${type}...`);
    setTimeout(() => setExportNotice(null), 3500);
  };

  // Performance data (matching Dreamstechnologies Executive Dashboard)
  const executiveReps: ExecutivePerformanceRep[] = useMemo(() => [
    {
      id: "rep-1",
      name: "Robert Johnson",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
      initials: "RJ",
      dealsClosed: 98,
      revenueGenerated: 7500,
      conversionRate: 100,
      status: "Excellent",
      dealsBarVal: 9500,
    },
    {
      id: "rep-2",
      name: "Isabella Cooper",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces",
      initials: "IC",
      dealsClosed: 87,
      revenueGenerated: 2000,
      conversionRate: 100,
      status: "Excellent",
      dealsBarVal: 7200,
    },
    {
      id: "rep-3",
      name: "John Smith",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces",
      initials: "JS",
      dealsClosed: 56,
      revenueGenerated: 1600,
      conversionRate: 85,
      status: "Good",
      dealsBarVal: 3800,
    },
    {
      id: "rep-4",
      name: "Sophia Parker",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces",
      initials: "SP",
      dealsClosed: 10,
      revenueGenerated: 600,
      conversionRate: 30,
      status: "Average",
      dealsBarVal: 2100,
    },
    {
      id: "rep-5",
      name: "Ethan Reynolds",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces",
      initials: "ER",
      dealsClosed: 87,
      revenueGenerated: 2800,
      conversionRate: 100,
      status: "Excellent",
      dealsBarVal: 5400,
    },
    {
      id: "rep-6",
      name: "Liam Carter",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
      initials: "LC",
      dealsClosed: 87,
      revenueGenerated: 6955,
      conversionRate: 85,
      status: "Average",
      dealsBarVal: 6955,
    },
  ], []);

  // Forecast data across months
  const forecastData = useMemo(() => [
    { month: "Jan", forecast: 45, actual: 38 },
    { month: "Feb", forecast: 55, actual: 48 },
    { month: "Mar", forecast: 48, actual: 52 },
    { month: "Apr", forecast: 65, actual: 59 },
    { month: "May", forecast: 70, actual: 68 },
    { month: "Jun", forecast: 80, actual: 74 },
    { month: "Jul", forecast: 85, actual: 82 },
    { month: "Aug", forecast: 75, actual: 78 },
    { month: "Sep", forecast: 90, actual: 88 },
    { month: "Oct", forecast: 95, actual: 91 },
    { month: "Nov", forecast: 88, actual: 85 },
    { month: "Dec", forecast: 110, actual: 105 },
  ], []);

  // Top Deals Closed per user chart data
  const dealsByUser = useMemo(() => [
    { name: "Robert J.", deals: 98, color: "bg-emerald-500", barHeight: 95 },
    { name: "Isabella C.", deals: 87, color: "bg-purple-500", barHeight: 84 },
    { name: "Ethan R.", deals: 87, color: "bg-blue-500", barHeight: 84 },
    { name: "Liam C.", deals: 87, color: "bg-indigo-500", barHeight: 84 },
    { name: "John S.", deals: 56, color: "bg-amber-500", barHeight: 55 },
    { name: "Sophia P.", deals: 10, color: "bg-rose-500", barHeight: 18 },
  ], []);

  // Revenue per salesperson data
  const revenueByRep = useMemo(() => [
    { name: "Robert Johnson", amount: "$9,500", pct: 95, color: "bg-emerald-500" },
    { name: "Isabella Cooper", amount: "$7,200", pct: 72, color: "bg-purple-500" },
    { name: "Liam Carter", amount: "$6,955", pct: 69, color: "bg-indigo-500" },
    { name: "Ethan Reynolds", amount: "$5,400", pct: 54, color: "bg-blue-500" },
    { name: "John Smith", amount: "$3,800", pct: 38, color: "bg-amber-500" },
    { name: "Sophia Parker", amount: "$2,100", pct: 21, color: "bg-rose-500" },
  ], []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast / Export Notification */}
      {exportNotice && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 animate-in slide-in-from-right-5">
          <i className="fa-solid fa-circle-check text-base" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* ── Dashboard Section Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-xl font-extrabold text-foreground tracking-tight">Executive Dashboard</h3>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted/70 text-foreground text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <i className="fa-solid fa-file-export text-primary text-xs" />
              <span>Export</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground ml-0.5" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-border bg-card shadow-xl p-1 z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleExport("PDF")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer text-left"
                >
                  <i className="fa-solid fa-file-pdf text-rose-500 text-xs" />
                  <span>Export as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("Excel")}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer text-left"
                >
                  <i className="fa-solid fa-file-excel text-emerald-500 text-xs" />
                  <span>Export as Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={onRefresh}
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-muted/70 text-foreground transition-all shadow-xs cursor-pointer"
            title="Refresh Executive Dashboard"
          >
            <i className="fa-solid fa-arrows-rotate text-xs" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ROW 1: KPI CARDS (8 COLS) + ACTIVITY & CONVERSION (4 COLS)  */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): 2x2 KPI Cards container */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Sales Revenue */}
            <div className="border border-border/70 rounded-xl p-4 bg-background/50 hover:bg-muted/30 transition-all flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base">
                  <i className="fa-solid fa-arrow-trend-up" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sales Revenue</p>
              </div>

              <div className="border border-border/60 rounded-xl p-3 flex items-center justify-between gap-3 bg-card/60">
                <div>
                  <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">$400k</h2>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1">
                    <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                      <i className="fa-solid fa-arrow-up text-[10px]" /> +12%
                    </span>
                    <span>vs Last Year</span>
                  </p>
                </div>

                {/* Mini Area Sparkline */}
                <div className="w-24 h-12">
                  <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="execSalesSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 32 Q 25 10, 50 25 T 100 8 L 100 40 L 0 40 Z" fill="url(#execSalesSpark)" />
                    <path d="M 0 32 Q 25 10, 50 25 T 100 8" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: New Customers */}
            <div className="border border-border/70 rounded-xl p-4 bg-background/50 hover:bg-muted/30 transition-all flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-base">
                  <i className="fa-solid fa-user-plus" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Customers</p>
              </div>

              <div className="border border-border/60 rounded-xl p-3 flex items-center justify-between gap-3 bg-card/60">
                <div>
                  <h2 className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">450</h2>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1">
                    <span className="text-purple-500 font-bold flex items-center gap-0.5">
                      <i className="fa-solid fa-arrow-up text-[10px]" /> +8.2%
                    </span>
                    <span>vs Last Year</span>
                  </p>
                </div>

                {/* Mini Area Sparkline */}
                <div className="w-24 h-12">
                  <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="execCustomerSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 35 Q 30 18, 55 20 T 100 6 L 100 40 L 0 40 Z" fill="url(#execCustomerSpark)" />
                    <path d="M 0 35 Q 30 18, 55 20 T 100 6" fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 3: Target Achievement */}
            <div className="border border-border/70 rounded-xl p-4 bg-background/50 hover:bg-muted/30 transition-all flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base">
                  <i className="fa-solid fa-bullseye" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Target Achievement</p>
              </div>

              <div className="border border-border/60 rounded-xl p-3 flex items-center justify-between gap-3 bg-card/60">
                <div>
                  <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">68%</h2>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1">
                    <span className="text-rose-500 font-bold flex items-center gap-0.5">
                      <i className="fa-solid fa-arrow-down text-[10px]" /> -1.2%
                    </span>
                    <span>vs Last Year</span>
                  </p>
                </div>

                {/* Mini Area Sparkline */}
                <div className="w-24 h-12">
                  <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="execTargetSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 15 Q 25 35, 55 18 T 100 28 L 100 40 L 0 40 Z" fill="url(#execTargetSpark)" />
                    <path d="M 0 15 Q 25 35, 55 18 T 100 28" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 4: Profit */}
            <div className="border border-border/70 rounded-xl p-4 bg-background/50 hover:bg-muted/30 transition-all flex flex-col justify-between">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center text-base">
                  <i className="fa-solid fa-chart-pie" />
                </div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Profit</p>
              </div>

              <div className="border border-border/60 rounded-xl p-3 flex items-center justify-between gap-3 bg-card/60">
                <div>
                  <h2 className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono tracking-tight">40%</h2>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1">
                    <span className="text-sky-500 font-bold flex items-center gap-0.5">
                      <i className="fa-solid fa-arrow-up text-[10px]" /> +1.2%
                    </span>
                    <span>vs Last Year</span>
                  </p>
                </div>

                {/* Mini Area Sparkline */}
                <div className="w-24 h-12">
                  <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="execProfitSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path d="M 0 30 Q 30 10, 60 22 T 100 12 L 100 40 L 0 40 Z" fill="url(#execProfitSpark)" />
                    <path d="M 0 30 Q 30 10, 60 22 T 100 12" fill="none" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Activity Count & Conversion Split */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Activity Count Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <h4 className="text-sm font-bold text-foreground mb-3">Activity Count</h4>

            <div className="space-y-3">
              {/* Calls */}
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#27AE60" strokeWidth="3" strokeDasharray="88" strokeDashoffset={88 * (1 - 0.70)} strokeLinecap="round" />
                    </svg>
                    <i className="fa-solid fa-phone text-[#27AE60] text-[11px] absolute" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Calls</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-foreground font-mono">342</p>
                  <p className="text-[11px] font-bold text-emerald-500">+12%</p>
                </div>
              </div>

              {/* Emails */}
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#800080" strokeWidth="3" strokeDasharray="88" strokeDashoffset={88 * (1 - 0.85)} strokeLinecap="round" />
                    </svg>
                    <i className="fa-solid fa-envelope text-purple-600 text-[11px] absolute" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Emails</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-foreground font-mono">567</p>
                  <p className="text-[11px] font-bold text-purple-500">+22%</p>
                </div>
              </div>

              {/* Meetings */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#2F80ED" strokeWidth="3" strokeDasharray="88" strokeDashoffset={88 * (1 - 0.50)} strokeLinecap="round" />
                    </svg>
                    <i className="fa-solid fa-users text-[#2F80ED] text-[11px] absolute" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">Meetings</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-foreground font-mono">42</p>
                  <p className="text-[11px] font-bold text-sky-500">+15%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Split Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <h4 className="text-sm font-bold text-foreground mb-2">Conversion Split</h4>

            <div className="flex items-center justify-between gap-4">
              {/* Donut Chart */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/20" />
                  {/* Converted (65%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="12"
                    strokeDasharray="238.76"
                    strokeDashoffset="83.56"
                    strokeLinecap="round"
                  />
                  {/* On Progress (35%) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="12"
                    strokeDasharray="238.76"
                    strokeDashoffset="155.19"
                    transform="rotate(234 50 50)"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-sm font-black text-foreground font-mono">65%</span>
                  <p className="text-[9px] text-muted-foreground uppercase font-semibold">Won</p>
                </div>
              </div>

              {/* Legend Boxes */}
              <div className="flex-1 space-y-2">
                <div className="bg-muted/40 border border-border/60 p-2.5 rounded-xl flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                    Converted
                  </p>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">65%</span>
                </div>
                <div className="bg-muted/40 border border-border/60 p-2.5 rounded-xl flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs" />
                    On Progress
                  </p>
                  <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">35%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ROW 2: TOP REVENUE PER SALESPERSON + TOP DEALS CLOSED PER USER */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Revenue per Salesperson */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h4 className="text-sm font-bold text-foreground">Top Revenue per Salesperson</h4>

            <div className="relative">
              <button
                type="button"
                onClick={() => setRevenueDropdownOpen(!revenueDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground cursor-pointer shadow-2xs"
              >
                <span>{revenueTimeframe}</span>
                <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
              </button>
              {revenueDropdownOpen && (
                <div className="absolute right-0 mt-1 w-36 rounded-xl border border-border bg-card shadow-lg p-1 z-40">
                  {(["Last Month", "Last 6 Months", "Last 3 Months"] as const).map(tf => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => { setRevenueTimeframe(tf); setRevenueDropdownOpen(false); }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                        revenueTimeframe === tf ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {revenueByRep.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{item.name}</span>
                  <span className="font-mono font-bold text-foreground">{item.amount}</span>
                </div>
                <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden p-0.5 border border-border/50">
                  <div
                    style={{ width: `${item.pct}%` }}
                    className={cn("h-full rounded-full transition-all duration-500", item.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Deals Closed per User */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h4 className="text-sm font-bold text-foreground">Top Deals Closed per User</h4>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDealsDropdownOpen(!dealsDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground cursor-pointer shadow-2xs"
              >
                <span>{dealsYear}</span>
                <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
              </button>
              {dealsDropdownOpen && (
                <div className="absolute right-0 mt-1 w-28 rounded-xl border border-border bg-card shadow-lg p-1 z-40">
                  {(["2025", "2024", "2023"] as const).map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => { setDealsYear(yr); setDealsDropdownOpen(false); }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                        dealsYear === yr ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                      )}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bar Chart Representation */}
          <div className="flex items-end justify-between gap-2 h-52 pt-4 px-2 border-b border-border/60">
            {dealsByUser.map((rep, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end cursor-pointer">
                <span className="text-[11px] font-mono font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {rep.deals}
                </span>
                <div
                  style={{ height: `${rep.barHeight}%` }}
                  className={cn("w-full max-w-[32px] rounded-t-lg transition-all duration-300 group-hover:brightness-110", rep.color)}
                />
                <span className="text-[10px] font-semibold text-muted-foreground truncate max-w-[48px] text-center">
                  {rep.name}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>Aggregated Closed Deals by sales representative</span>
            <span className="font-mono font-bold text-foreground">Total: 425 Deals</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ROW 3: PIPELINE (4 COLS) + FORECAST OVERVIEW (8 COLS)      */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Pipeline Card (4 cols) */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground mb-4">Pipeline</h4>

            <div className="space-y-4">
              {[
                { stage: "Prospecting", deals: "15 Deals", pct: 100 },
                { stage: "Qualification", deals: "10 Deals", pct: 80 },
                { stage: "Proposal", deals: "8 Deals", pct: 60 },
                { stage: "Negotiation", deals: "5 Deals", pct: 40 },
                { stage: "Closing", deals: "2 Deals", pct: 30 },
              ].map((pipe, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-foreground w-24 shrink-0 truncate">{pipe.stage}</span>
                  <div className="flex-1 flex items-center gap-2.5">
                    <div className="h-3 w-full bg-muted/40 rounded-full overflow-hidden p-0.5 border border-border/50">
                      <div
                        style={{ width: `${pipe.pct}%` }}
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-foreground shrink-0 w-16 text-right">
                      {pipe.deals}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">30%</span>
              <span>The performance is 30% better compare to last week</span>
            </p>
          </div>
        </div>

        {/* Forecast Overview Card (8 cols) */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h4 className="text-sm font-bold text-foreground">Forecast Overview</h4>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Forecast
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Actual
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setForecastDropdownOpen(!forecastDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium text-foreground cursor-pointer shadow-2xs"
                >
                  <span>{forecastYear}</span>
                  <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
                </button>
                {forecastDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-28 rounded-xl border border-border bg-card shadow-lg p-1 z-40">
                    {(["2025", "2024", "2023"] as const).map(yr => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => { setForecastYear(yr); setForecastDropdownOpen(false); }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                          forecastYear === yr ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                        )}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Spline Area Chart */}
          <div className="relative pt-2">
            <svg viewBox="0 0 1000 220" className="w-full h-56 overflow-visible">
              <defs>
                <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[{ val: "$120k", y: 25 }, { val: "$80k", y: 85 }, { val: "$40k", y: 145 }, { val: "$0", y: 190 }].map((g, i) => (
                <g key={i}>
                  <text x="0" y={g.y + 4} className="text-[11px] font-semibold fill-muted-foreground font-mono">{g.val}</text>
                  <line x1="45" y1={g.y} x2="1000" y2={g.y} stroke="currentColor" strokeDasharray="3 3" className="text-border/50" />
                </g>
              ))}

              {/* Area & Line for Forecast */}
              <path
                d="M 50 140 Q 150 110, 250 120 T 450 85 T 650 65 T 850 50 T 980 35 L 980 190 L 50 190 Z"
                fill="url(#forecastAreaGrad)"
              />
              <path
                d="M 50 140 Q 150 110, 250 120 T 450 85 T 650 65 T 850 50 T 980 35"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Area & Line for Actual */}
              <path
                d="M 50 155 Q 150 130, 250 110 T 450 100 T 650 78 T 850 60 T 980 45 L 980 190 L 50 190 Z"
                fill="url(#actualAreaGrad)"
              />
              <path
                d="M 50 155 Q 150 130, 250 110 T 450 100 T 650 78 T 850 60 T 980 45"
                fill="none"
                stroke="#10B981"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                strokeLinecap="round"
              />

              {/* Data points & X axis */}
              {forecastData.map((f, i) => {
                const x = 50 + (i / 11) * 930;
                const isHovered = hoveredForecastIdx === i;
                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHoveredForecastIdx(i)}
                    onMouseLeave={() => setHoveredForecastIdx(null)}
                    className="cursor-pointer"
                  >
                    <text
                      x={x}
                      y="210"
                      textAnchor="middle"
                      className={cn("text-[11px] transition-colors", isHovered ? "fill-primary font-bold" : "fill-muted-foreground font-semibold")}
                    >
                      {f.month}
                    </text>
                    {isHovered && (
                      <g>
                        <circle cx={x} cy={60} r="5" fill="#8B5CF6" stroke="#fff" strokeWidth="2" />
                        <rect x={x - 45} y={15} width="90" height="30" rx="8" fill="#1e293b" className="dark:fill-slate-100" />
                        <text x={x} y={34} textAnchor="middle" fill="#fff" className="dark:fill-slate-900 text-[10px] font-black font-mono">
                          ${f.forecast}k / ${f.actual}k
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

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ROW 4: EXECUTIVE PERFORMANCE OVERVIEW DATA TABLE           */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-bold text-foreground">Executive Performance Overview</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Individual representative closing rate, revenue volume, and performance level</p>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setTableDropdownOpen(!tableDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground cursor-pointer shadow-2xs"
            >
              <span>{tablePeriod}</span>
              <i className="fa-solid fa-chevron-down text-[9px] text-muted-foreground" />
            </button>
            {tableDropdownOpen && (
              <div className="absolute right-0 mt-1 w-32 rounded-xl border border-border bg-card shadow-xl p-1 z-40">
                {(["Weekly", "Monthly", "Yearly"] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setTablePeriod(p); setTableDropdownOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors",
                      tablePeriod === p ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-foreground"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Executive Name</th>
                <th className="py-3 px-4">Deal Closed</th>
                <th className="py-3 px-4">Revenue Generated</th>
                <th className="py-3 px-4">Conversion %</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {executiveReps.map((rep) => (
                <tr key={rep.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={rep.avatar}
                        alt={rep.name}
                        className="w-8 h-8 rounded-full object-cover border border-border shadow-2xs"
                        onError={(e) => {
                          // Fallback to initials if image fails
                          const target = e.currentTarget;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement("div");
                            fallback.className = "w-8 h-8 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center border border-primary/20";
                            fallback.innerText = rep.initials;
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                      <span className="font-semibold text-foreground text-xs">{rep.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "font-mono font-bold text-xs",
                      rep.dealsClosed >= 80 ? "text-emerald-500" : rep.dealsClosed >= 50 ? "text-sky-500" : "text-rose-500"
                    )}>
                      {rep.dealsClosed}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    ${rep.revenueGenerated.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border",
                      rep.conversionRate >= 90
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : rep.conversionRate >= 70
                        ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                    )}>
                      {rep.conversionRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs",
                      rep.status === "Excellent"
                        ? "bg-emerald-500"
                        : rep.status === "Good"
                        ? "bg-sky-500"
                        : "bg-rose-500"
                    )}>
                      {rep.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
