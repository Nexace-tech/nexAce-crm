"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Lead } from "@/components/bd/LeadDetailPanel";

interface LeadsDashboardViewProps {
  leads?: Lead[];
  onNavigateToLeads?: () => void;
  onOpenLead?: (lead: Lead) => void;
  onRefresh?: () => void;
}

// Sample demo leads from Dreams Technologies Leads Dashboard
const DREAMS_RECENT_LEADS = [
  {
    id: "lead-1",
    name: "Collins",
    avatarBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    initials: "CO",
    company: "NovaWave LLC",
    companyBg: "bg-blue-500/10 text-blue-600",
    phone: "+1 875455453",
    status: "Closed",
    statusColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  },
  {
    id: "lead-2",
    name: "Konopelski",
    avatarBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    initials: "KO",
    company: "BlueSky Industries",
    companyBg: "bg-sky-500/10 text-sky-600",
    phone: "+1 989757485",
    status: "Closed",
    statusColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  },
  {
    id: "lead-3",
    name: "Adams",
    avatarBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    initials: "AD",
    company: "Silver Hawk",
    companyBg: "bg-amber-500/10 text-amber-600",
    phone: "+1 546555455",
    status: "Closed",
    statusColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  },
  {
    id: "lead-4",
    name: "Schumm",
    avatarBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    initials: "SC",
    company: "Summit Peak",
    companyBg: "bg-emerald-500/10 text-emerald-600",
    phone: "+1 454478787",
    status: "Contacted",
    statusColor: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
  },
  {
    id: "lead-5",
    name: "Wisozk",
    avatarBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    initials: "WI",
    company: "RiverStone Ltd",
    companyBg: "bg-violet-500/10 text-violet-600",
    phone: "+1 1245427875",
    status: "Closed",
    statusColor: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
  },
];

// Stage donut distribution data matching Dreams Technologies
const STAGE_DONUT_DATA = [
  { label: "Inpipeline", value: 44, color: "#2F80ED" },
  { label: "Follow Up", value: 55, color: "#27AE60" },
  { label: "Schedule Service", value: 13, color: "#FFA201" },
  { label: "Conversation", value: 43, color: "#E41F07" },
];

// 12-month report spline data matching Dreams Technologies
const MONTHLY_REPORTS_DATA = [
  { month: "Jan", val: 3.0 },
  { month: "Feb", val: 4.5 },
  { month: "Mar", val: 2.0 },
  { month: "Apr", val: 3.0 },
  { month: "May", val: 2.5 },
  { month: "Jun", val: 4.0 },
  { month: "Jul", val: 2.0 },
  { month: "Aug", val: 4.0 },
  { month: "Sep", val: 3.5 },
  { month: "Oct", val: 5.0 },
  { month: "Nov", val: 3.0 },
  { month: "Dec", val: 2.0 },
];

export default function LeadsDashboardView({
  leads = [],
  onNavigateToLeads,
  onOpenLead,
  onRefresh,
}: LeadsDashboardViewProps) {
  // Dropdown states
  const [recentTimeframe, setRecentTimeframe] = useState<string>("Last 30 days");
  const [showRecentDropdown, setShowRecentDropdown] = useState<boolean>(false);

  const [pieTimeframe, setPieTimeframe] = useState<string>("Last 30 Days");
  const [showPieDropdown, setShowPieDropdown] = useState<boolean>(false);

  const [areaPipeline, setAreaPipeline] = useState<string>("Marketing Pipeline");
  const [showAreaPipelineDropdown, setShowAreaPipelineDropdown] = useState<boolean>(false);
  const [areaTimeframe, setAreaTimeframe] = useState<string>("Last 30 Days");
  const [showAreaTimeframeDropdown, setShowAreaTimeframeDropdown] = useState<boolean>(false);

  const [lostPipeline, setLostPipeline] = useState<string>("Marketing Pipeline");
  const [showLostPipelineDropdown, setShowLostPipelineDropdown] = useState<boolean>(false);
  const [lostTimeframe, setLostTimeframe] = useState<string>("Last 3 months");
  const [showLostTimeframeDropdown, setShowLostTimeframeDropdown] = useState<boolean>(false);

  const [wonPipeline, setWonPipeline] = useState<string>("Marketing Pipeline");
  const [showWonPipelineDropdown, setShowWonPipelineDropdown] = useState<boolean>(false);
  const [wonTimeframe, setWonTimeframe] = useState<string>("Last 3 months");
  const [showWonTimeframeDropdown, setShowWonTimeframeDropdown] = useState<boolean>(false);

  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Hover state for interactive SVG charts
  const [hoveredSplineIdx, setHoveredSplineIdx] = useState<number | null>(null);
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);

  // Combine real recent leads if available
  const recentLeadsList = useMemo(() => {
    if (leads && leads.length > 0) {
      const mapped = leads.slice(0, 5).map((l, idx) => {
        const leadDisplayName = l.leadName || "Lead";
        const words = leadDisplayName.trim().split(" ");
        const initials = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2).toUpperCase();
        return {
          id: l._id || `lead-real-${idx}`,
          name: leadDisplayName,
          avatarBg: "bg-primary/10 text-primary",
          initials,
          company: l.companyName || "Enterprise Client",
          companyBg: "bg-muted text-foreground",
          phone: l.phone || "+1 555-0199",
          status: l.status || "Contacted",
          statusColor: l.status === "Closed"
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
          rawLead: l,
        };
      });
      if (mapped.length >= 5) return mapped;
      return [...mapped, ...DREAMS_RECENT_LEADS.slice(mapped.length)];
    }
    return DREAMS_RECENT_LEADS;
  }, [leads]);

  // Donut chart path calculations
  const totalDonutValue = STAGE_DONUT_DATA.reduce((sum, item) => sum + item.value, 0);
  const donutAngles = useMemo(() => {
    let accAngle = 0;
    return STAGE_DONUT_DATA.map((item) => {
      const angle = (item.value / totalDonutValue) * 360;
      const startAngle = accAngle;
      const endAngle = accAngle + angle;
      accAngle = endAngle;
      return { ...item, startAngle, endAngle, pct: Math.round((item.value / totalDonutValue) * 100) };
    });
  }, [totalDonutValue]);

  // Helper to generate SVG Arc path
  const getArc = (startAngle: number, endAngle: number, innerR: number, outerR: number) => {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = 120 + outerR * Math.cos(startRad);
    const y1 = 120 + outerR * Math.sin(startRad);
    const x2 = 120 + outerR * Math.cos(endRad);
    const y2 = 120 + outerR * Math.sin(endRad);

    const x3 = 120 + innerR * Math.cos(endRad);
    const y3 = 120 + innerR * Math.sin(endRad);
    const x4 = 120 + innerR * Math.cos(startRad);
    const y4 = 120 + innerR * Math.sin(startRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  // 12-Month Spline Area calculation
  const splineCoords = useMemo(() => {
    const minVal = 1.0;
    const maxVal = 6.0;
    const width = 760;
    const height = 180;
    const paddingX = 40;
    const paddingTop = 20;
    const paddingBottom = 30;
    const chartHeight = height - paddingTop - paddingBottom;
    const chartWidth = width - paddingX * 2;

    const points = MONTHLY_REPORTS_DATA.map((d, i) => {
      const x = paddingX + (i / (MONTHLY_REPORTS_DATA.length - 1)) * chartWidth;
      const normalized = (d.val - minVal) / (maxVal - minVal);
      const y = paddingTop + chartHeight - normalized * chartHeight;
      return { x, y, val: d.val, month: d.month };
    });

    // Build cubic bezier curve
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      pathD += ` C ${cpX} ${p0.y}, ${cpX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

    return { points, pathD, areaD, height, width, paddingBottom, paddingTop };
  }, []);

  return (
    <div className="space-y-5 font-sans text-slate-800 dark:text-slate-100">
      {/* ── 1. Page Header Bar (Exact Dreams Technologies Layout) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>Leads Dashboard</span>
          </h1>
          <nav aria-label="breadcrumb" className="mt-1">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToLeads?.()}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li className="text-muted-foreground/60">/</li>
              <li className="text-foreground font-bold">Leads Dashboard</li>
            </ol>
          </nav>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 flex-wrap relative">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-border/80 bg-card hover:bg-muted/60 text-foreground transition-all shadow-xs cursor-pointer"
            >
              <i className="fa-solid fa-file-export text-primary text-xs" />
              <span>Export</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground ml-1" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => setExportDropdownOpen(false)}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-2.5 cursor-pointer"
                >
                  <i className="fa-solid fa-file-pdf text-rose-500" />
                  <span>Export as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportDropdownOpen(false)}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-2.5 cursor-pointer"
                >
                  <i className="fa-solid fa-file-excel text-emerald-600" />
                  <span>Export as Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => onRefresh?.()}
            className="w-9 h-9 rounded-xl border border-border/80 bg-card hover:bg-muted/60 text-foreground flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Refresh Leads Data"
          >
            <i className="fa-solid fa-arrows-rotate text-xs" />
          </button>

          {/* Collapse Header toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-9 h-9 rounded-xl border border-border/80 bg-card hover:bg-muted/60 text-foreground flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Collapse / Expand"
          >
            <i className={cn("fa-solid text-xs transition-transform duration-200", isCollapsed ? "fa-chevron-down" : "fa-chevron-up")} />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-6">
          {/* ── 2. ROW 1: Recently Created Leads (7 cols) + Projects By Stage Donut (5 cols) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Recently Created Leads Table (col-lg-7) */}
            <div className="lg:col-span-7 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <h6 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                    <i className="fa-solid fa-users text-primary text-xs" />
                    Recently Created Leads
                  </h6>

                  {/* Timeframe selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowRecentDropdown(!showRecentDropdown)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-foreground transition-all cursor-pointer"
                    >
                      <span>{recentTimeframe}</span>
                      <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                    </button>
                    {showRecentDropdown && (
                      <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-xl py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
                        {["Last 30 days", "Last 15 days", "Last 7 days"].map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => {
                              setRecentTimeframe(tf);
                              setShowRecentDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                              recentTimeframe === tf ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                            )}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Lead Name</th>
                        <th className="py-2.5 px-3">Company Name</th>
                        <th className="py-2.5 px-3">Phone</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {recentLeadsList.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={() => {
                            if ((lead as any).rawLead && onOpenLead) {
                              onOpenLead((lead as any).rawLead);
                            } else if (onNavigateToLeads) {
                              onNavigateToLeads();
                            }
                          }}
                          className="hover:bg-muted/40 transition-colors cursor-pointer group"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] shrink-0", lead.avatarBg)}>
                                {lead.initials}
                              </div>
                              <span className="font-extrabold text-foreground group-hover:text-primary transition-colors">
                                {lead.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
                              <i className="fa-solid fa-building text-[10px] text-muted-foreground" />
                              {lead.company}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-muted-foreground font-medium">
                            {lead.phone}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={cn("inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold", lead.statusColor)}>
                              {lead.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card Footer Link */}
              <div className="pt-3 mt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                <span>Showing {recentLeadsList.length} recent prospective leads</span>
                <button
                  type="button"
                  onClick={() => onNavigateToLeads?.()}
                  className="font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All Leads</span>
                  <i className="fa-solid fa-arrow-right text-[10px]" />
                </button>
              </div>
            </div>

            {/* Projects By Stage Pie / Donut Chart (col-lg-5) */}
            <div className="lg:col-span-5 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
                  <h6 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                    <i className="fa-solid fa-chart-pie text-primary text-xs" />
                    Projects By Stage
                  </h6>

                  {/* Timeframe selector */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPieDropdown(!showPieDropdown)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-foreground transition-all cursor-pointer"
                    >
                      <span>{pieTimeframe}</span>
                      <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                    </button>
                    {showPieDropdown && (
                      <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-xl py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
                        {["Last 30 Days", "Last 15 Days", "Last 7 Days"].map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => {
                              setPieTimeframe(tf);
                              setShowPieDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                              pieTimeframe === tf ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                            )}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Donut Chart Display */}
                <div className="py-4 flex flex-col items-center justify-center">
                  <div className="relative w-56 h-56">
                    <svg viewBox="0 0 240 240" className="w-full h-full transform -rotate-90">
                      {donutAngles.map((item, idx) => {
                        const isHovered = hoveredDonutIdx === idx;
                        const arcPath = getArc(item.startAngle, item.endAngle, isHovered ? 52 : 55, isHovered ? 100 : 96);
                        return (
                          <path
                            key={item.label}
                            d={arcPath}
                            fill={item.color}
                            onMouseEnter={() => setHoveredDonutIdx(idx)}
                            onMouseLeave={() => setHoveredDonutIdx(null)}
                            className="transition-all duration-200 cursor-pointer opacity-95 hover:opacity-100"
                            stroke="hsl(var(--card))"
                            strokeWidth="3"
                          />
                        );
                      })}
                    </svg>

                    {/* Center stats */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-2xl font-black text-foreground tracking-tight font-mono">
                        {hoveredDonutIdx !== null ? `${donutAngles[hoveredDonutIdx].value}` : `${totalDonutValue}`}
                      </span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {hoveredDonutIdx !== null ? donutAngles[hoveredDonutIdx].label : "Total Projects"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60">
                {STAGE_DONUT_DATA.map((item, idx) => (
                  <div
                    key={item.label}
                    onMouseEnter={() => setHoveredDonutIdx(idx)}
                    onMouseLeave={() => setHoveredDonutIdx(null)}
                    className={cn(
                      "flex items-center justify-between p-1.5 rounded-xl border text-xs transition-all cursor-pointer",
                      hoveredDonutIdx === idx ? "bg-muted/60 border-primary/40 shadow-xs scale-102" : "border-border/40 hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-semibold text-foreground truncate">{item.label}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-muted-foreground ml-1">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── 3. ROW 2: Projects By Stage (Full Width Area Spline Chart) ── */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <h6 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                <i className="fa-solid fa-chart-line text-primary text-xs" />
                Projects By Stage
              </h6>

              {/* Double Filters: Pipeline + Timeframe */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Pipeline Select */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAreaPipelineDropdown(!showAreaPipelineDropdown)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-foreground transition-all cursor-pointer"
                  >
                    <span>{areaPipeline}</span>
                    <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                  </button>
                  {showAreaPipelineDropdown && (
                    <div className="absolute right-0 mt-1 w-44 bg-card border border-border rounded-xl shadow-xl py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
                      {["Marketing Pipeline", "Sales Pipeline", "Email Chats", "Operational"].map((pipe) => (
                        <button
                          key={pipe}
                          type="button"
                          onClick={() => {
                            setAreaPipeline(pipe);
                            setShowAreaPipelineDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                            areaPipeline === pipe ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                          )}
                        >
                          {pipe}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timeframe Select */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAreaTimeframeDropdown(!showAreaTimeframeDropdown)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-border/80 bg-muted/30 hover:bg-muted text-foreground transition-all cursor-pointer"
                  >
                    <span>{areaTimeframe}</span>
                    <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                  </button>
                  {showAreaTimeframeDropdown && (
                    <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-xl py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
                      {["Last 30 Days", "Last 15 Days", "Last 7 Days"].map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => {
                            setAreaTimeframe(tf);
                            setShowAreaTimeframeDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                            areaTimeframe === tf ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                          )}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Spline Chart */}
            <div className="pt-4 relative">
              <svg viewBox={`0 0 ${splineCoords.width} ${splineCoords.height}`} className="w-full h-64 overflow-visible">
                <defs>
                  <linearGradient id="purpleAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A00E5" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#4A00E5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                {[1, 2, 3, 4, 5, 6].map((tick) => {
                  const normalized = (tick - 1) / 5;
                  const y = splineCoords.paddingTop + (splineCoords.height - splineCoords.paddingTop - splineCoords.paddingBottom) * (1 - normalized);
                  return (
                    <g key={tick}>
                      <text x="5" y={y + 3} className="text-[10px] fill-muted-foreground font-mono font-semibold">
                        {tick}K
                      </text>
                      <line x1="32" y1={y} x2={splineCoords.width} y2={y} stroke="currentColor" strokeDasharray="3 3" className="text-border/40" />
                    </g>
                  );
                })}

                {/* Shaded Area */}
                <path d={splineCoords.areaD} fill="url(#purpleAreaGrad)" />

                {/* Line Stroke */}
                <path d={splineCoords.pathD} fill="none" stroke="#4A00E5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                {/* Interactive Points and Labels */}
                {splineCoords.points.map((p, i) => {
                  const isHovered = hoveredSplineIdx === i;
                  return (
                    <g key={i}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 6 : 4}
                        fill="#4A00E5"
                        stroke="#ffffff"
                        strokeWidth="2"
                        className="transition-all cursor-pointer"
                        onMouseEnter={() => setHoveredSplineIdx(i)}
                        onMouseLeave={() => setHoveredSplineIdx(null)}
                      />
                      {/* Month Label */}
                      <text
                        x={p.x}
                        y={splineCoords.height - 8}
                        textAnchor="middle"
                        className={cn("text-[10px] font-mono transition-colors", isHovered ? "fill-primary font-bold" : "fill-muted-foreground")}
                      >
                        {p.month}
                      </text>
                      {/* Tooltip on hover */}
                      {isHovered && (
                        <g>
                          <rect
                            x={p.x - 28}
                            y={p.y - 32}
                            width="56"
                            height="22"
                            rx="6"
                            fill="#1e1b4b"
                            className="shadow-xl"
                          />
                          <text
                            x={p.x}
                            y={p.y - 18}
                            textAnchor="middle"
                            fill="#ffffff"
                            className="text-[10px] font-mono font-black"
                          >
                            {p.val}K
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* ── 4. ROW 3: Lost Deals Stage (6 cols) + Won Deals Stage (6 cols) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Lost Deals Stage (Horizontal Bar Chart) */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
                <h6 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <i className="fa-solid fa-circle-xmark text-rose-500 text-xs" />
                  Lost Deals Stage
                </h6>

                {/* Selectors */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Pipeline */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLostPipelineDropdown(!showLostPipelineDropdown)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border/80 bg-muted/30 text-foreground cursor-pointer"
                    >
                      <span className="truncate max-w-[100px]">{lostPipeline}</span>
                      <i className="fa-solid fa-chevron-down text-[8px]" />
                    </button>
                    {showLostPipelineDropdown && (
                      <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-xl py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
                        {["Marketing Pipeline", "Sales Pipeline", "Email Chats"].map((pipe) => (
                          <button
                            key={pipe}
                            type="button"
                            onClick={() => {
                              setLostPipeline(pipe);
                              setShowLostPipelineDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                              lostPipeline === pipe ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                            )}
                          >
                            {pipe}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timeframe */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowLostTimeframeDropdown(!showLostTimeframeDropdown)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border/80 bg-muted/30 text-foreground cursor-pointer"
                    >
                      <span>{lostTimeframe}</span>
                      <i className="fa-solid fa-chevron-down text-[8px]" />
                    </button>
                    {showLostTimeframeDropdown && (
                      <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-xl py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
                        {["Last 3 months", "Last 6 months", "Last 12 months"].map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => {
                              setLostTimeframe(tf);
                              setShowLostTimeframeDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                              lostTimeframe === tf ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                            )}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Horizontal Bar Visuals for Lost Deals */}
              <div className="pt-4 space-y-4">
                {[
                  { name: "Conversation", value: 400, max: 500, color: "#EF1E1E" },
                  { name: "Follow Up", value: 220, max: 500, color: "#EF1E1E" },
                  { name: "Inpipeline", value: 448, max: 500, color: "#EF1E1E" },
                ].map((item) => {
                  const pct = Math.round((item.value / item.max) * 100);
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{item.name}</span>
                        <span className="font-mono font-bold text-rose-500">{item.value}</span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-rose-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Won Deals Stage (Horizontal Bar Chart) */}
            <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/60">
                <h6 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500 text-xs" />
                  Won Deals Stage
                </h6>

                {/* Selectors */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Pipeline */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWonPipelineDropdown(!showWonPipelineDropdown)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border/80 bg-muted/30 text-foreground cursor-pointer"
                    >
                      <span className="truncate max-w-[100px]">{wonPipeline}</span>
                      <i className="fa-solid fa-chevron-down text-[8px]" />
                    </button>
                    {showWonPipelineDropdown && (
                      <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-xl shadow-xl py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
                        {["Marketing Pipeline", "Sales Pipeline", "Email Chats"].map((pipe) => (
                          <button
                            key={pipe}
                            type="button"
                            onClick={() => {
                              setWonPipeline(pipe);
                              setShowWonPipelineDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                              wonPipeline === pipe ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                            )}
                          >
                            {pipe}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timeframe */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowWonTimeframeDropdown(!showWonTimeframeDropdown)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-border/80 bg-muted/30 text-foreground cursor-pointer"
                    >
                      <span>{wonTimeframe}</span>
                      <i className="fa-solid fa-chevron-down text-[8px]" />
                    </button>
                    {showWonTimeframeDropdown && (
                      <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-xl shadow-xl py-1 z-20 animate-in fade-in zoom-in-95 duration-150">
                        {["Last 3 months", "Last 6 months", "Last 12 months"].map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => {
                              setWonTimeframe(tf);
                              setShowWonTimeframeDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer",
                              wonTimeframe === tf ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"
                            )}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Horizontal Bar Visuals for Won Deals */}
              <div className="pt-4 space-y-4">
                {[
                  { name: "Conversation", value: 400, max: 500, color: "#27AE60" },
                  { name: "Follow Up", value: 122, max: 500, color: "#27AE60" },
                  { name: "Inpipeline", value: 250, max: 500, color: "#27AE60" },
                ].map((item) => {
                  const pct = Math.round((item.value / item.max) * 100);
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{item.name}</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{item.value}</span>
                      </div>
                      <div className="w-full bg-muted/60 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
