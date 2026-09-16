"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";

interface RevenueSummaryDashboardProps {
  deals?: SalesDeal[];
  loading?: boolean;
  onNavigateToDeals?: () => void;
  onNewDeal?: () => void;
  onRefresh?: () => void;
}

export default function RevenueSummaryDashboard({
  deals = [],
  loading = false,
  onNavigateToDeals,
  onNewDeal,
  onRefresh,
}: RevenueSummaryDashboardProps) {
  // Year filter states
  const [selectedYearTrend, setSelectedYearTrend] = useState<string>("2026");
  const [selectedYearExpense, setSelectedYearExpense] = useState<string>("2026");
  const [selectedYearComparison, setSelectedYearComparison] = useState<string>("2026");

  // Dropdown toggles
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTrendYearMenu, setShowTrendYearMenu] = useState(false);
  const [showExpenseYearMenu, setShowExpenseYearMenu] = useState(false);
  const [showCompYearMenu, setShowCompYearMenu] = useState(false);

  // Hover states for tooltips
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [hoveredForecastIdx, setHoveredForecastIdx] = useState<number | null>(null);
  const [hoveredBreakdownIdx, setHoveredBreakdownIdx] = useState<number | null>(null);
  const [hoveredExpIdx, setHoveredExpIdx] = useState<number | null>(null);

  // Derive dynamic metrics from live deals or high-fidelity benchmark fallbacks
  const stats = useMemo(() => {
    const totalWon = deals
      .filter((d) => d.stage === "Closed Won")
      .reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
    const totalPipeline = deals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0);
    const closedCount = deals.filter((d) => d.stage === "Closed Won").length;
    const lostCount = deals.filter((d) => d.stage === "Closed Lost").length;
    const totalFinished = closedCount + lostCount;
    const computedWinRate = totalFinished > 0 ? ((closedCount / totalFinished) * 100).toFixed(1) : "28.4";
    const avgDeal = deals.length > 0 ? Math.round(totalPipeline / deals.length) : 43200;

    return {
      totalRevenueStr: totalWon > 0 ? `$${(totalWon / 1000000).toFixed(2)}M` : "$2.45M",
      revenueGrowth: "18.2%",
      annualRecurring: totalPipeline > 0 ? `$${(totalPipeline / 1000000).toFixed(1)}M` : "$28.4M",
      avgDealValue: avgDeal > 1000 ? `$${(avgDeal / 1000).toFixed(1)}K` : "$43.2K",
      previousDealValue: "$39.8K",
      forecastedRevenue: "$8.45M",
      dealsClosed: closedCount > 0 ? closedCount : 156,
      previousClosed: 152,
      winRate: computedWinRate,
      previousWinRate: "26.9%",
      salesCycleDays: 47,
      previousSalesCycle: 42,
    };
  }, [deals]);

  // Year datasets for Revenue Performance Trend (Area Chart)
  const trendYearData: Record<string, { actual: number[]; forecast: number[]; prior: number[] }> = {
    "2026": {
      actual: [120, 210, 290, 260, 240, 420, 460, 380, 300, 320, 480, 600],
      forecast: [110, 200, 270, 230, 220, 300, 270, 220, 180, 210, 420, 520],
      prior: [60, 120, 160, 140, 130, 220, 260, 210, 170, 160, 330, 510],
    },
    "2025": {
      actual: [100, 180, 250, 220, 210, 360, 400, 330, 270, 290, 410, 520],
      forecast: [95, 170, 240, 200, 190, 270, 240, 190, 160, 190, 380, 460],
      prior: [50, 100, 140, 120, 110, 190, 220, 180, 150, 140, 290, 450],
    },
    "2024": {
      actual: [80, 150, 210, 180, 170, 290, 330, 270, 220, 240, 340, 430],
      forecast: [75, 140, 200, 170, 160, 220, 200, 160, 130, 160, 310, 380],
      prior: [40, 80, 110, 100, 90, 150, 180, 150, 120, 110, 230, 360],
    },
    "2023": {
      actual: [60, 120, 170, 140, 130, 230, 260, 210, 170, 190, 270, 340],
      forecast: [55, 110, 160, 130, 120, 180, 160, 130, 100, 130, 240, 300],
      prior: [30, 60, 90, 80, 70, 120, 140, 120, 90, 80, 180, 280],
    },
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentTrend = trendYearData[selectedYearTrend] || trendYearData["2026"];

  // Calculate SVG spline path generator
  const getSplinePath = (data: number[], maxVal = 650, height = 280, width = 900) => {
    const paddingLeft = 45;
    const paddingBottom = 30;
    const paddingTop = 20;
    const chartW = width - paddingLeft;
    const chartH = height - paddingBottom - paddingTop;

    const points = data.map((val, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * chartW;
      const y = paddingTop + chartH - (val / maxVal) * chartH;
      return { x, y };
    });

    if (points.length === 0) return { linePath: "", areaPath: "", points: [] };

    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const lastX = points[points.length - 1].x;
    const baseY = paddingTop + chartH;
    const areaPath = `${linePath} L ${lastX} ${baseY} L ${points[0].x} ${baseY} Z`;

    return { linePath, areaPath, points };
  };

  const actualSpline = useMemo(() => getSplinePath(currentTrend.actual), [currentTrend]);
  const forecastSpline = useMemo(() => getSplinePath(currentTrend.forecast), [currentTrend]);
  const priorSpline = useMemo(() => getSplinePath(currentTrend.prior), [currentTrend]);

  // Export handlers
  const handleExport = (type: "pdf" | "excel") => {
    setShowExportMenu(false);
    if (typeof window !== "undefined") {
      if (type === "pdf") {
        window.print();
      } else {
        const rows = [
          ["Category", "Value", "Notes"],
          ["Total Revenue", stats.totalRevenueStr, "+2.5% vs Last Period"],
          ["Revenue Growth", stats.revenueGrowth, "+3.4% QoQ Improved"],
          ["Annual Recurring", stats.annualRecurring, "+2.5% ARR Growth"],
          ["Avg Deal Value", stats.avgDealValue, "+2.5% From Last Week"],
          ["Forecasted Revenue", stats.forecastedRevenue, "+5.1% Growth"],
          ["Deals Closed", stats.dealsClosed.toString(), "+3.3% YoY"],
          ["Win Rate", `${stats.winRate}%`, "+5.6% YoY"],
          ["Sales Cycle (days)", stats.salesCycleDays.toString(), "+10.6%"],
        ];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `revenue_summary_${selectedYearTrend}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <i className="fa-solid fa-chart-pie text-lg" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">Revenue Summary</h3>
            <p className="text-xs text-muted-foreground">Comprehensive revenue performance, trends and segment breakdown</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-file-export text-primary text-[11px]" />
              <span>Export</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground ml-0.5" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1.5 w-40 bg-card border border-border rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  className="w-full text-left px-3.5 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-file-pdf text-red-500 text-xs" />
                  <span>Export as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("excel")}
                  className="w-full text-left px-3.5 py-2 text-xs text-foreground hover:bg-muted flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-file-excel text-emerald-500 text-xs" />
                  <span>Export as Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            className="w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center transition-all cursor-pointer shadow-2xs"
            title="Refresh Metrics"
          >
            <i className={cn("fa-solid fa-arrows-rotate text-xs text-muted-foreground", loading && "fa-spin text-primary")} />
          </button>

          {/* View Deals Pipeline CTA */}
          {onNavigateToDeals && (
            <button
              type="button"
              onClick={onNavigateToDeals}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-2xs"
            >
              <i className="fa-solid fa-handshake text-xs" />
              <span>View Deals Pipeline</span>
            </button>
          )}

          {/* New Deal button */}
          {onNewDeal && (
            <button
              type="button"
              onClick={onNewDeal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
            >
              <i className="fa-solid fa-plus text-xs" />
              <span>New Deal</span>
            </button>
          )}
        </div>
      </div>

      {/* ── ROW 1: Statistics & Breakdown (col-xxl-7 and col-xxl-5) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Side: Overview Statistics + Deal Value + Forecasted Revenue (col-xxl-7) */}
        <div className="xl:col-span-7 space-y-6">
          {/* Card: Overview Statistics */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                <span>Overview Statistics</span>
              </h4>
              {onNavigateToDeals && (
                <button
                  type="button"
                  onClick={onNavigateToDeals}
                  className="w-7 h-7 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="View Deals Details"
                >
                  <i className="fa-solid fa-arrow-right text-xs" />
                </button>
              )}
            </div>

            {/* 3 Metric Columns with dividers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 border border-border/70 rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-border/70 bg-card">
              {/* Stat 1: Total Revenue */}
              <div className="p-4 text-center hover:bg-muted/30 transition-colors group">
                <div className="w-10 h-10 mx-auto rounded-xl bg-primary/15 text-primary flex items-center justify-center text-base mb-2 group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-dollar-sign text-base" />
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Revenue</p>
                <h4 className="text-xl font-black text-foreground tracking-tight mb-2">{stats.totalRevenueStr}</h4>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    +2.5%
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">vs Last Period</span>
                </div>
              </div>

              {/* Stat 2: Revenue Growth */}
              <div className="p-4 text-center hover:bg-muted/30 transition-colors group">
                <div className="w-10 h-10 mx-auto rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-base mb-2 group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-chart-simple text-base" />
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Revenue Growth</p>
                <h4 className="text-xl font-black text-foreground tracking-tight mb-2">{stats.revenueGrowth}</h4>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    +3.4%
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">QoQ Improved</span>
                </div>
              </div>

              {/* Stat 3: Annual Recurring */}
              <div className="p-4 text-center hover:bg-muted/30 transition-colors group">
                <div className="w-10 h-10 mx-auto rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center text-base mb-2 group-hover:scale-105 transition-transform">
                  <i className="fa-solid fa-box-archive text-base" />
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Annual Recurring</p>
                <h4 className="text-xl font-black text-foreground tracking-tight mb-2">{stats.annualRecurring}</h4>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    +2.5%
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">ARR Growth</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-row: Deal Value (col-5) & Forecasted Revenue (col-7) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Card: Deal Value */}
            <div className="md:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-foreground">Deal Value</h4>
                  {onNavigateToDeals && (
                    <button
                      type="button"
                      onClick={onNavigateToDeals}
                      className="w-6 h-6 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-right text-[10px]" />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="mb-2.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-0.5">
                        <span className="w-2 h-2 rounded-xs bg-purple-500 inline-block" />
                        <span>Avg Deal Value</span>
                      </p>
                      <h4 className="text-lg font-black text-foreground font-mono">{stats.avgDealValue}</h4>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mb-0.5">
                        <span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" />
                        <span>Previous</span>
                      </p>
                      <h4 className="text-lg font-black text-foreground font-mono">{stats.previousDealValue}</h4>
                    </div>
                  </div>

                  {/* Sparkline Bar Chart for Deal Value ([90, 55]) */}
                  <div className="w-20 h-24 flex items-end justify-center gap-2.5 pt-2">
                    <div className="w-6 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-md h-[90%] shadow-2xs relative group">
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border border-border text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow text-foreground pointer-events-none transition-opacity">
                        90%
                      </span>
                    </div>
                    <div className="w-6 bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-md h-[55%] shadow-2xs relative group">
                      <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border border-border text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow text-foreground pointer-events-none transition-opacity">
                        55%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  +2.5%
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">From Last Week</span>
              </div>
            </div>

            {/* Card: Forecasted Revenue */}
            <div className="md:col-span-7 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-base">
                      <i className="fa-solid fa-file-invoice-dollar text-base" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">Forecasted Revenue</p>
                      <h4 className="text-xl font-black text-foreground tracking-tight font-mono">{stats.forecastedRevenue}</h4>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    +5.1% Growth
                  </span>
                </div>

                {/* Vertical Bar Sparkline Chart */}
                <div className="h-16 w-full flex items-end justify-between gap-1.5 pt-2">
                  {[25, 35, 45, 30, 22, 40, 38, 28, 48, 26, 33].map((val, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredForecastIdx(idx)}
                      onMouseLeave={() => setHoveredForecastIdx(null)}
                      className="flex-1 bg-gradient-to-t from-teal-600 to-emerald-400 hover:from-teal-500 hover:to-emerald-300 rounded-t-sm transition-all cursor-pointer relative"
                      style={{ height: `${(val / 50) * 100}%` }}
                    >
                      {hoveredForecastIdx === idx && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-popover border border-border text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow text-foreground pointer-events-none z-10 whitespace-nowrap">
                          ${val * 10}K
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom info callout */}
              <div className="flex items-center justify-between border border-border/70 bg-muted/20 p-2.5 rounded-xl mt-3">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-0">
                  <i className="fa-solid fa-arrow-trend-up text-xs" />
                  <span>+15.2%</span>
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mb-0 font-medium">
                  <span>Forecast Increase</span>
                  <i className="fa-solid fa-circle-info text-[10px] text-muted-foreground/80" />
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Revenue Breakdown (col-xxl-5) */}
        <div className="xl:col-span-5 flex flex-col">
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-bold text-foreground tracking-tight">Revenue Breakdown</h4>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="w-7 h-7 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors cursor-pointer"
                  title="Refresh Breakdown"
                >
                  <i className={cn("fa-solid fa-arrows-rotate text-xs", loading && "fa-spin text-primary")} />
                </button>
              </div>

              {/* Horizontal Bar Chart */}
              <div className="space-y-3.5 py-2">
                {[
                  { label: "Enterprise Suite", val: "£2.3M", pct: 88, from: "#C594FA", to: "#7F24E3", subPct: "40.9%", trend: "+18.4%" },
                  { label: "Professional Plan", val: "£1.9M", pct: 73, from: "#ff6a6a", to: "#dc3545", subPct: "30.4%", trend: "+12.7%" },
                  { label: "Starter Package", val: "£1.4M", pct: 54, from: "#ffc107", to: "#ff9800", subPct: "16.4%", trend: "+8.9%" },
                  { label: "Add-ons & Services", val: "£0.9M", pct: 35, from: "#5bc0ff", to: "#0dcaf0", subPct: "12.2%", trend: "+22.1%" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredBreakdownIdx(idx)}
                    onMouseLeave={() => setHoveredBreakdownIdx(null)}
                    className="space-y-1 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-foreground group-hover:text-primary transition-colors">{item.label}</span>
                      <span className="font-mono text-muted-foreground">{item.val}</span>
                    </div>
                    <div className="w-full bg-muted/60 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.pct}%`,
                          background: `linear-gradient(to right, ${item.from}, ${item.to})`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2x2 Grid with Metrics & Percentage */}
            <div className="border border-border/70 rounded-xl overflow-hidden mt-4 bg-muted/20">
              <div className="grid grid-cols-2 divide-x divide-y divide-border/70">
                {/* 1: Enterprise Suite */}
                <div className="p-3 bg-muted/10 hover:bg-muted/30 transition-colors">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    <span>Enterprise Suite</span>
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-base font-black text-foreground font-mono">40.9%</span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <i className="fa-solid fa-arrow-trend-up text-[10px]" />
                      +18.4%
                    </span>
                  </div>
                </div>

                {/* 2: Professional Plan */}
                <div className="p-3 bg-muted/10 hover:bg-muted/30 transition-colors">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    <span>Professional Plan</span>
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-base font-black text-foreground font-mono">30.4%</span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <i className="fa-solid fa-arrow-trend-up text-[10px]" />
                      +12.7%
                    </span>
                  </div>
                </div>

                {/* 3: Starter Package */}
                <div className="p-3 bg-muted/10 hover:bg-muted/30 transition-colors">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    <span>Starter Package</span>
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-base font-black text-foreground font-mono">16.4%</span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <i className="fa-solid fa-arrow-trend-up text-[10px]" />
                      +8.9%
                    </span>
                  </div>
                </div>

                {/* 4: Add-ons & Services */}
                <div className="p-3 bg-muted/10 hover:bg-muted/30 transition-colors">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground mb-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                    <span>Add-ons &amp; Services</span>
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-base font-black text-foreground font-mono">12.2%</span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <i className="fa-solid fa-arrow-trend-up text-[10px]" />
                      +22.1%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Revenue Performance Trend (Full width) ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div>
            <h4 className="text-base font-extrabold text-foreground tracking-tight">Revenue Performance Trend</h4>
            <p className="text-xs text-muted-foreground mt-0.5">Comparing actual revenue vs. forecast and prior year</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Year Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTrendYearMenu(!showTrendYearMenu)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer shadow-2xs"
              >
                <span>{selectedYearTrend}</span>
                <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
              </button>
              {showTrendYearMenu && (
                <div className="absolute right-0 mt-1 w-28 bg-card border border-border rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                  {["2026", "2025", "2024", "2023"].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setSelectedYearTrend(yr);
                        setShowTrendYearMenu(false);
                      }}
                      className={cn(
                        "w-full text-left px-3.5 py-1.5 text-xs transition-colors cursor-pointer",
                        selectedYearTrend === yr ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
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

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 flex-wrap pt-3 pb-2">
          <span className="text-xs font-semibold border border-border/70 bg-muted/20 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[#3B44F6]" />
            <span>Actual Revenue</span>
          </span>
          <span className="text-xs font-semibold border border-border/70 bg-muted/20 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <span>Forecasted</span>
          </span>
          <span className="text-xs font-semibold border border-border/70 bg-muted/20 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[#FF3B30]" />
            <span>Prior Year</span>
          </span>
        </div>

        {/* SVG Area Chart */}
        <div className="relative pt-2">
          <svg viewBox="0 0 900 280" className="w-full h-72 sm:h-80 overflow-visible">
            <defs>
              <linearGradient id="actualRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B44F6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3B44F6" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="forecastRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.30" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="priorRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF3B30" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#FF3B30" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[600, 450, 300, 150, 0].map((val, idx) => {
              const y = 20 + 230 - (val / 650) * 230;
              return (
                <g key={idx}>
                  <text x="5" y={y + 4} className="text-[10px] font-mono font-semibold fill-muted-foreground">
                    ${val}K
                  </text>
                  <line x1="45" y1={y} x2="900" y2={y} stroke="currentColor" strokeDasharray="4 4" className="text-border/60" />
                </g>
              );
            })}

            {/* Area & Line paths */}
            {priorSpline.areaPath && <path d={priorSpline.areaPath} fill="url(#priorRevGrad)" />}
            {forecastSpline.areaPath && <path d={forecastSpline.areaPath} fill="url(#forecastRevGrad)" />}
            {actualSpline.areaPath && <path d={actualSpline.areaPath} fill="url(#actualRevGrad)" />}

            {priorSpline.linePath && <path d={priorSpline.linePath} fill="none" stroke="#FF3B30" strokeWidth="2" strokeDasharray="3 3" />}
            {forecastSpline.linePath && <path d={forecastSpline.linePath} fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />}
            {actualSpline.linePath && <path d={actualSpline.linePath} fill="none" stroke="#3B44F6" strokeWidth="3" strokeLinecap="round" />}

            {/* Month labels & interactive hover columns */}
            {months.map((m, i) => {
              const x = 45 + (i / (months.length - 1)) * 855;
              const isHov = hoveredTrendIdx === i;
              const actualVal = currentTrend.actual[i];
              const forecastVal = currentTrend.forecast[i];
              const priorVal = currentTrend.prior[i];

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredTrendIdx(i)}
                  onMouseLeave={() => setHoveredTrendIdx(null)}
                  className="cursor-pointer"
                >
                  <rect x={x - 25} y="10" width="50" height="250" fill="transparent" />
                  <text
                    x={x}
                    y="272"
                    textAnchor="middle"
                    className={cn("text-[11px] transition-colors", isHov ? "font-bold fill-primary" : "font-semibold fill-muted-foreground")}
                  >
                    {m}
                  </text>

                  {isHov && (
                    <g>
                      <line x1={x} y1="20" x2={x} y2="250" stroke="#3B44F6" strokeWidth="1" strokeDasharray="2 2" />
                      <circle cx={x} cy={actualSpline.points[i]?.y} r="5" fill="#3B44F6" stroke="#fff" strokeWidth="2" />

                      {/* Tooltip Card */}
                      <g transform={`translate(${Math.min(780, Math.max(70, x - 65))}, 25)`}>
                        <rect width="130" height="74" rx="8" fill="#1e293b" className="dark:fill-slate-900 border border-slate-700" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.3))" />
                        <text x="10" y="18" fill="#94a3b8" className="text-[10px] font-bold uppercase">{m} {selectedYearTrend}</text>
                        <circle cx="15" cy="32" r="3" fill="#3B44F6" />
                        <text x="24" y="35" fill="#fff" className="text-[10px] font-mono font-bold">Actual: ${actualVal}K</text>
                        <circle cx="15" cy="48" r="3" fill="#22C55E" />
                        <text x="24" y="51" fill="#fff" className="text-[10px] font-mono font-bold">Forecast: ${forecastVal}K</text>
                        <circle cx="15" cy="64" r="3" fill="#FF3B30" />
                        <text x="24" y="67" fill="#fff" className="text-[10px] font-mono font-bold">Prior: ${priorVal}K</text>
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bottom 3 Highlights */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap pt-4 mt-2 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#FF3B30]" />
            <span className="text-xs text-muted-foreground font-medium">Avg. Monthly Revenue</span>
            <span className="text-sm font-black text-foreground font-mono">$608K</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#3B44F6]" />
            <span className="text-xs text-muted-foreground font-medium">Forecast Accuracy</span>
            <span className="text-sm font-black text-foreground font-mono">96.3%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#22C55E]" />
            <span className="text-xs text-muted-foreground font-medium">YoY Growth</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">+24.8%</span>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Revenue VS Expense & Comparison (2 equal columns) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Column: Revenue VS Expense */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-2">
              <h4 className="text-base font-bold text-foreground tracking-tight">Revenue VS Expense</h4>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExpenseYearMenu(!showExpenseYearMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer shadow-2xs"
                >
                  <span>{selectedYearExpense}</span>
                  <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                </button>
                {showExpenseYearMenu && (
                  <div className="absolute right-0 mt-1 w-28 bg-card border border-border rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                    {["2026", "2025", "2024", "2023"].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setSelectedYearExpense(yr);
                          setShowExpenseYearMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-3.5 py-1.5 text-xs transition-colors cursor-pointer",
                          selectedYearExpense === yr ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                        )}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Horizontal Bar Chart for Revenue VS Expense */}
            <div className="space-y-5 py-4">
              {/* Revenue Bar */}
              <div
                onMouseEnter={() => setHoveredExpIdx(0)}
                onMouseLeave={() => setHoveredExpIdx(null)}
                className="space-y-1.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6D5EF3]" />
                    Revenue
                  </span>
                  <span className="font-mono text-foreground font-extrabold">2.4M (80%)</span>
                </div>
                <div className="w-full bg-muted/60 rounded-xl h-7 overflow-hidden p-0.5 border border-border/50">
                  <div
                    className="h-full rounded-lg transition-all duration-700 relative bg-gradient-to-r from-[#6D5EF3] to-[#8B7CF6] flex items-center justify-end pr-2"
                    style={{ width: "80%" }}
                  >
                    <span className="text-[10px] font-mono font-bold text-white">80%</span>
                  </div>
                </div>
              </div>

              {/* Expense Bar */}
              <div
                onMouseEnter={() => setHoveredExpIdx(1)}
                onMouseLeave={() => setHoveredExpIdx(null)}
                className="space-y-1.5 group cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5B5B]" />
                    Expense
                  </span>
                  <span className="font-mono text-foreground font-extrabold">1.35M (45%)</span>
                </div>
                <div className="w-full bg-muted/60 rounded-xl h-7 overflow-hidden p-0.5 border border-border/50">
                  <div
                    className="h-full rounded-lg transition-all duration-700 relative bg-gradient-to-r from-[#FF5B5B] to-[#FF7B7B] flex items-center justify-end pr-2"
                    style={{ width: "45%" }}
                  >
                    <span className="text-[10px] font-mono font-bold text-white">45%</span>
                  </div>
                </div>
              </div>

              {/* Ticks */}
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 px-1 border-t border-border/50">
                <span>0.0M</span>
                <span>0.6M</span>
                <span>1.2M</span>
                <span>1.8M</span>
                <span>2.4M</span>
                <span>3.0M</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
            Detailed revenue analysis by product segment
          </p>
        </div>

        {/* Right Column: Comparison */}
        <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-2">
              <h4 className="text-base font-bold text-foreground tracking-tight">Comparison</h4>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCompYearMenu(!showCompYearMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer shadow-2xs"
                >
                  <span>{selectedYearComparison}</span>
                  <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                </button>
                {showCompYearMenu && (
                  <div className="absolute right-0 mt-1 w-28 bg-card border border-border rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                    {["2026", "2025", "2024", "2023"].map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => {
                          setSelectedYearComparison(yr);
                          setShowCompYearMenu(false);
                        }}
                        className={cn(
                          "w-full text-left px-3.5 py-1.5 text-xs transition-colors cursor-pointer",
                          selectedYearComparison === yr ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                        )}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 3 Metric Comparison Blocks */}
            <div className="space-y-3 py-1">
              {/* Block 1: Deals Closed */}
              <div className="p-4 rounded-xl bg-purple-500/10 dark:bg-purple-950/30 border border-purple-500/20 hover:border-purple-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <p className="text-xs font-medium text-foreground mb-0.5">Deals Closed</p>
                      <h3 className="text-xl font-black text-foreground font-mono">{stats.dealsClosed}</h3>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Previous</p>
                      <h3 className="text-xl font-bold text-muted-foreground font-mono">{stats.previousClosed}</h3>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-background text-foreground border border-border shadow-2xs">
                    +3.3%
                  </span>
                </div>
              </div>

              {/* Block 2: Win Rate */}
              <div className="p-4 rounded-xl bg-sky-500/10 dark:bg-sky-950/30 border border-sky-500/20 hover:border-sky-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <p className="text-xs font-medium text-foreground mb-0.5">Win Rate</p>
                      <h3 className="text-xl font-black text-foreground font-mono">{stats.winRate}%</h3>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Previous</p>
                      <h3 className="text-xl font-bold text-muted-foreground font-mono">{stats.previousWinRate}</h3>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-background text-foreground border border-border shadow-2xs">
                    +5.6%
                  </span>
                </div>
              </div>

              {/* Block 3: Sales Cycle */}
              <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                      <p className="text-xs font-medium text-foreground mb-0.5">Sales Cycle (days)</p>
                      <h3 className="text-xl font-black text-foreground font-mono">{stats.salesCycleDays}</h3>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Previous</p>
                      <h3 className="text-xl font-bold text-muted-foreground font-mono">{stats.previousSalesCycle}</h3>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-background text-foreground border border-border shadow-2xs">
                    +10.6%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
            <span>Period-over-period performance metrics</span>
            <span className="font-mono text-[11px] text-muted-foreground">Updated live</span>
          </p>
        </div>
      </div>
    </div>
  );
}
