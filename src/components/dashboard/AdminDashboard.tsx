"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

// ─── Default Fallback Revenue Analytics Data ──────────────────────────────────
const defaultWeeklyData = [
  { name: "Mon", revenue: 33000, sales: 18000 },
  { name: "Tue", revenue: 20000, sales: 12000 },
  { name: "Wed", revenue: 50000, sales: 28000 },
  { name: "Thu", revenue: 49000, sales: 25000 },
  { name: "Fri", revenue: 57000, sales: 30000 },
  { name: "Sat", revenue: 40000, sales: 22000 },
  { name: "Sun", revenue: 40000, sales: 21000 },
];
const defaultMonthlyData = [
  { name: "Jan", revenue: 120000, sales: 65000 },
  { name: "Feb", revenue: 95000, sales: 48000 },
  { name: "Mar", revenue: 140000, sales: 72000 },
  { name: "Apr", revenue: 110000, sales: 58000 },
  { name: "May", revenue: 160000, sales: 85000 },
  { name: "Jun", revenue: 130000, sales: 68000 },
  { name: "Jul", revenue: 175000, sales: 90000 },
  { name: "Aug", revenue: 155000, sales: 80000 },
  { name: "Sep", revenue: 145000, sales: 75000 },
  { name: "Oct", revenue: 185000, sales: 95000 },
  { name: "Nov", revenue: 200000, sales: 105000 },
  { name: "Dec", revenue: 220000, sales: 115000 },
];
const defaultYearlyData = [
  { name: "2022", revenue: 1350000, sales: 710000 },
  { name: "2023", revenue: 1600000, sales: 850000 },
  { name: "2024", revenue: 1900000, sales: 1000000 },
  { name: "2025", revenue: 2200000, sales: 1150000 },
  { name: "2026", revenue: 2450000, sales: 1300000 },
];

const fallbackTrafficData = [
  { name: "Organic Search", value: 6598, color: "#00c5a0", pct: 58 },
  { name: "Direct Traffic", value: 2458, color: "#0ea5e9", pct: 22 },
  { name: "Referral Traffic", value: 1456, color: "#f59e0b", pct: 13 },
  { name: "Social Media", value: 845, color: "#a855f7", pct: 7 },
];

const fallbackDeals = [
  { name: "Annual Software", stage: "Appointment", value: 1994938, tag: "Rated", tagColor: "#f59e0b", owner: "Robert Johnson", prob: "90%", status: "Won", statusColor: "#00c5a0" },
  { name: "CRM Onboarding", stage: "Appointment", value: 1544540, tag: "Collab", tagColor: "#00c5a0", owner: "Isabella Cooper", prob: "90%", status: "Lost", statusColor: "#f43f5e" },
  { name: "Enterprise Plan", stage: "Contact Made", value: 1036390, tag: "Promotion", tagColor: "#a855f7", owner: "John Smith", prob: "80%", status: "Won", statusColor: "#00c5a0" },
  { name: "BrightWorks", stage: "Presentation", value: 1611420, tag: "Rated", tagColor: "#f59e0b", owner: "Sophia Parker", prob: "72%", status: "Won", statusColor: "#00c5a0" },
  { name: "Sales Pipeline", stage: "Proposal Made", value: 9059472, tag: "Rejected", tagColor: "#f43f5e", owner: "Emma Reynolds", prob: "60%", status: "Open", statusColor: "#0ea5e9" },
];

const fallbackTopDeals = [
  { name: "NovaWave LLC", country: "Germany", value: "$19,94,938", initials: "N", bg: "#0ea5e9" },
  { name: "Silver Hawk", country: "Australia", value: "$15,44,540", initials: "S", bg: "#00c5a0" },
  { name: "Summit LLC", country: "Italy", value: "$10,36,390", initials: "Su", bg: "#6366f1" },
  { name: "Bluesky Industries", country: "Canada", value: "$10,15,280", initials: "B", bg: "#f43f5e" },
  { name: "HealthTech Innovations", country: "UK", value: "$10,14,112", initials: "H", bg: "#64748b" },
];

const ownerColors: Record<string, string> = {
  "Robert Johnson": "#00c5a0",
  "Isabella Cooper": "#0ea5e9",
  "John Smith": "#6366f1",
  "Sophia Parker": "#f59e0b",
  "Emma Reynolds": "#f43f5e",
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg p-2.5 shadow-xl text-xs">
        <p className="font-bold text-slate-700 dark:text-slate-300 m-0">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="font-semibold my-0.5" style={{ color: p.fill }}>
            {p.name}: ${Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function AdminDashboard({ user }: { user: any }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [revTab, setRevTab] = useState<"Weekly" | "Monthly" | "Yearly">("Weekly");
  const [topDealsFilter, setTopDealsFilter] = useState("Last 30 Days");
  const [topDealsOpen, setTopDealsOpen] = useState(false);
  const [pipelinePeriod, setPipelinePeriod] = useState("Weekly");
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [profitYear, setProfitYear] = useState("2026");
  const [profitOpen, setProfitOpen] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState("24 Aug 26 - 24 Aug 26");
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  // Active Feature Tab in the workspace feature hub
  const [featureTab, setFeatureTab] = useState<"projects" | "goals" | "timesheets" | "activity">("projects");

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Live API State
  const [summaryData, setSummaryData] = useState<any>(null);

  // Live Fetch Function with Cache Buster
  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard/summary?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Sync on Mount, on Window Focus, on Visibility Change, and with Fast Polling
  useEffect(() => {
    fetchDashboardData();

    const handleFocus = () => { fetchDashboardData(); };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardData();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    const timer = setInterval(fetchDashboardData, 8000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(timer);
    };
  }, [fetchDashboardData]);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // ── Dynamic Metric Values Directly from MongoDB ─────────────────────────────
  const totalRevenueNumber = summaryData?.metrics?.totalRevenue || 2366400;
  const activeDealsCount = summaryData?.metrics?.activeDeals || 26;
  const conversionRate = summaryData?.metrics?.conversionRate || 81.5;
  const totalContactsCount = summaryData?.metrics?.totalContacts || 37;
  const totalDealsCount = summaryData?.metrics?.totalDealsCount || 26;
  const dealsWonCount = summaryData?.metrics?.dealsWonCount || 18;

  // Dynamic Charts Data
  const dynamicRevData = useMemo(() => {
    if (summaryData?.charts) {
      if (revTab === "Weekly" && summaryData.charts.weekly) return summaryData.charts.weekly;
      if (revTab === "Monthly" && summaryData.charts.monthly) return summaryData.charts.monthly;
      if (revTab === "Yearly" && summaryData.charts.yearly) return summaryData.charts.yearly;
    }
    return revTab === "Weekly" ? defaultWeeklyData : revTab === "Monthly" ? defaultMonthlyData : defaultYearlyData;
  }, [summaryData?.charts, revTab]);

  const dynamicTrafficData = useMemo(() => {
    if (summaryData?.trafficSources && summaryData.trafficSources.length > 0) {
      return summaryData.trafficSources;
    }
    return fallbackTrafficData;
  }, [summaryData?.trafficSources]);

  const pipelineStats = summaryData?.pipelineStats || [
    { stage: "Lead", amount: "$20,010", deals: "80 Deals", color: "#00c5a0" },
    { stage: "Proposal", amount: "$17,210", deals: "23 Deals", color: "#f59e0b" },
    { stage: "Sales", amount: "$9,210", deals: "12 Deals", color: "#a855f7" },
    { stage: "Won", amount: "$8,210", deals: "21 Deals", color: "#0ea5e9" },
  ];

  const dealsOverview = summaryData?.dealsOverview || [
    { label: "Successful Deals", count: "1000 Deals", color: "#00c5a0", pct: 38 },
    { label: "Pending Deals", count: "1056 Deals", color: "#f59e0b", pct: 40 },
    { label: "Rejected Deals", count: "500 Deals", color: "#f43f5e", pct: 18 },
    { label: "Upcoming Deals", count: "100 Deals", color: "#0ea5e9", pct: 4 },
  ];

  const displayedTopDeals = (summaryData?.topDeals && summaryData.topDeals.length > 0)
    ? summaryData.topDeals
    : fallbackTopDeals;

  const mergedDeals = useMemo(() => {
    if (summaryData?.deals && summaryData.deals.length > 0) {
      return summaryData.deals.map((d: any) => ({
        name: d.name || d.clientAccount || "Deal",
        stage: d.stage || "Prospecting",
        value: d.value || 50000,
        tag: d.tag || (d.status === "Won" ? "Won" : d.status === "Lost" ? "Lost" : "Active"),
        tagColor: d.status === "Won" ? "#00c5a0" : d.status === "Lost" ? "#f43f5e" : "#f59e0b",
        owner: d.owner || user?.name || "Admin",
        prob: `${d.probability || 50}%`,
        status: d.status || "Open",
        statusColor: d.status === "Won" ? "#00c5a0" : d.status === "Lost" ? "#f43f5e" : "#0ea5e9",
      }));
    }
    return fallbackDeals;
  }, [summaryData?.deals, user?.name]);

  // Dynamic Revenue Title Number
  const revSummaryLabel = useMemo(() => {
    const sum = dynamicRevData.reduce((acc: number, d: any) => acc + Number(d.revenue || 0), 0);
    if (sum >= 1000000) return `${(sum / 1000000).toFixed(1)}M`;
    if (sum >= 1000) return `${Math.round(sum / 1000)}K`;
    return `${sum}`;
  }, [dynamicRevData]);

  // Export Dashboard to CSV Function
  const handleExportCSV = () => {
    const csvRows = [
      ["Deal Name", "Stage", "Deal Value", "Owner", "Probability", "Status"],
      ...mergedDeals.map((d: any) => [d.name, d.stage, `$${d.value}`, d.owner, d.prob, d.status]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NexAce_CRM_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Real Feature Arrays from MongoDB
  const projectsList = summaryData?.projects || [];
  const okrsList = summaryData?.okrs || [];
  const timesheetsList = summaryData?.timesheets || [];
  const activityLogsList = summaryData?.logs || [];

  return (
    <div className="space-y-6">

      {/* ── Page Title & Action Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white m-0">Dashboard</h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live Sync Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#00c5a0]/10 border border-[#00c5a0]/30 rounded-full text-[11px] text-[#00c5a0] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c5a0] animate-pulse" />
            <span>Live Sync</span>
          </div>

          {/* Avatar stack */}
          <div className="flex items-center">
            {["#6366f1", "#ec4899", "#00c5a0", "#f59e0b"].map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#161c24] flex items-center justify-center text-white text-[11px] font-bold -ml-2.5 first:ml-0" style={{ background: c, zIndex: 4 - i }}>
                {["RC", "IS", "JA", "EL"][i]}
              </div>
            ))}
            <Link href="/dashboard/team" className="w-8 h-8 rounded-full bg-[#00c5a0] border-2 border-white dark:border-[#161c24] flex items-center justify-center text-slate-950 text-xs -ml-2.5 z-0 hover:bg-[#00b08e] transition-colors" title="Invite or View Team">
              <i className="fa-solid fa-plus font-bold" />
            </Link>
          </div>

          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDateFilterOpen(!dateFilterOpen)}
              className="flex items-center gap-2 bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-[#1e2632] cursor-pointer transition-colors shadow-xs"
            >
              <i className="fa-regular fa-calendar text-slate-400" />
              <span>{dateRangeFilter}</span>
              <i className="fa-solid fa-chevron-down text-[9px] text-slate-400" />
            </button>
            {dateFilterOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg shadow-lg z-20 min-w-48 py-1">
                {["Today", "Last 7 Days", "Last 30 Days", "24 Aug 26 - 24 Aug 26", "This Quarter", "This Year"].map((opt) => (
                  <div
                    key={opt}
                    onClick={() => { setDateRangeFilter(opt); setDateFilterOpen(false); fetchDashboardData(); }}
                    className={cn(
                      "px-3.5 py-2 text-xs cursor-pointer transition-colors",
                      dateRangeFilter === opt ? "bg-[#00c5a0]/15 text-[#00c5a0] font-semibold" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1e2632]"
                    )}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Export Report */}
          <button
            onClick={handleExportCSV}
            title="Download CSV Report"
            className="w-9 h-9 border border-slate-200 dark:border-[#232d3b] rounded-lg bg-white dark:bg-[#161c24] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1e2632] flex items-center justify-center cursor-pointer transition-colors shadow-xs"
          >
            <i className="fa-solid fa-download text-xs" />
          </button>

          {/* Refresh Data */}
          <button
            onClick={fetchDashboardData}
            title="Refresh Live Data"
            className="w-9 h-9 border border-slate-200 dark:border-[#232d3b] rounded-lg bg-white dark:bg-[#161c24] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1e2632] flex items-center justify-center cursor-pointer transition-colors shadow-xs"
          >
            <i className={cn("fa-solid fa-rotate-right text-xs", isRefreshing && "fa-spin")} />
          </button>

          {/* Fullscreen Expand */}
          <button
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen"
            className="w-9 h-9 border border-slate-200 dark:border-[#232d3b] rounded-lg bg-white dark:bg-[#161c24] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1e2632] flex items-center justify-center cursor-pointer transition-colors shadow-xs"
          >
            <i className="fa-solid fa-expand text-xs" />
          </button>
        </div>
      </div>

      {/* ── Charts Row: Revenue Analytics (2/3) + Traffic Sources (1/3) ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Revenue Analytics */}
        <div className="lg:col-span-2 bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4.5 bg-[#00c5a0] rounded-full inline-block" />
              <span className="font-bold text-base text-slate-900 dark:text-white">Revenue Analytics</span>
            </div>
            {/* Weekly / Monthly / Yearly tabs */}
            <div className="flex bg-slate-100 dark:bg-[#11161d] rounded-lg p-0.5 border border-slate-200 dark:border-[#232d3b]">
              {(["Weekly", "Monthly", "Yearly"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRevTab(t)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all",
                    revTab === t ? "bg-[#00c5a0] text-slate-950 font-bold shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-extrabold text-2xl text-slate-900 dark:text-white">{revSummaryLabel}</span>
              <span className="text-slate-500 dark:text-slate-400 text-xs ml-2">Revenue with Sales (USD)</span>
            </div>
            <div className="flex gap-2.5 items-center">
              <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] rounded-md px-2.5 py-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#00c5a0] inline-block" /> Revenue
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] rounded-md px-2.5 py-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" /> Sales
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={dynamicRevData} barGap={2} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#232d3b" : "#e2e8f0"} vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? "#8b949e" : "#64748b" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: isDark ? "#8b949e" : "#64748b" }} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: isDark ? "rgba(0, 197, 160, 0.04)" : "rgba(0, 197, 160, 0.08)" }} />
              <Bar dataKey="revenue" name="Revenue" fill="#00c5a0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sales" name="Sales" fill={isDark ? "#334155" : "#94a3b8"} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Traffic Sources */}
        <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4.5 bg-[#00c5a0] rounded-full inline-block" />
              <span className="font-bold text-base text-slate-900 dark:text-white">Traffic Sources</span>
            </div>
            <Link href="/dashboard/clients" className="w-7 h-7 border border-slate-200 dark:border-[#232d3b] rounded-md bg-white dark:bg-[#161c24] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1e2632] transition-colors">
              <i className="fa-solid fa-arrow-right text-[11px]" />
            </Link>
          </div>

          <div className="relative mx-auto my-2 w-48 h-48 flex items-center justify-center">
            <PieChart width={190} height={190}>
              <Pie data={dynamicTrafficData} cx={90} cy={90} innerRadius={58} outerRadius={88} dataKey="value" startAngle={90} endAngle={-270} paddingAngle={2}>
                {dynamicTrafficData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <div className="text-xl font-extrabold text-[#00c5a0]">
                {dynamicTrafficData[0]?.pct || 58}%
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Primary</div>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            {dynamicTrafficData.map((item: any, i: number) => (
              <Link key={i} href="/dashboard/referrals" className="flex items-center justify-between text-xs no-underline hover:bg-slate-50 dark:hover:bg-[#1e2632] rounded-md px-1 py-0.5 -mx-1 transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white truncate max-w-[140px] transition-colors">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{Number(item.value).toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stat Cards Row (4 Columns) ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Revenue */}
        <Link href="/dashboard/clients" className="block no-underline">
          <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Revenue</span>
              <div className="w-10 h-10 rounded-xl bg-[#00c5a0]/15 text-[#00c5a0] flex items-center justify-center">
                <i className="fa-solid fa-chart-line text-sm" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white my-1">${totalRevenueNumber.toLocaleString()}</p>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold px-2 py-0.5 rounded-full bg-[#00c5a0]/15 text-[#00c5a0]">+2.5%</span>
              <span className="text-slate-500 dark:text-slate-400">From Last Week</span>
            </div>
          </div>
        </Link>

        {/* Card 2: Active Deals */}
        <Link href="/dashboard/clients" className="block no-underline">
          <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Deals</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                <i className="fa-solid fa-handshake text-sm" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white my-1">{activeDealsCount}</p>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 dark:text-rose-400">-21.15%</span>
              <span className="text-slate-500 dark:text-slate-400">From Last Week</span>
            </div>
          </div>
        </Link>

        {/* Card 3: Conversion Rate */}
        <Link href="/dashboard/clients" className="block no-underline">
          <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Conversion Rate</span>
              <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-500 dark:text-pink-400 flex items-center justify-center">
                <i className="fa-solid fa-arrow-trend-up text-sm" />
              </div>
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white my-1">{conversionRate}%</p>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold px-2 py-0.5 rounded-full bg-[#00c5a0]/15 text-[#00c5a0]">+15.5%</span>
              <span className="text-slate-500 dark:text-slate-400">From Last Week</span>
            </div>
          </div>
        </Link>

        {/* Card 4: Total Contacts */}
        <Link href="/dashboard/team" className="block no-underline">
          <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-5 shadow-xs hover:-translate-y-0.5 hover:shadow-md transition-all cursor-pointer">
            <div className="flex items-start justify-between mb-1">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Contacts</span>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white my-1">
                  {totalContactsCount.toLocaleString()}{" "}
                  <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-[#00c5a0]/15 text-[#00c5a0] align-middle">+2.5%</span>
                </p>
              </div>
              <div className="flex items-end gap-0.5 h-10">
                {[40, 65, 45, 75, 55, 85].map((h, j) => (
                  <div key={j} className="w-1.5 bg-[#00c5a0]/30 rounded-xs" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <div className="flex items-center">
                {["#6366f1", "#ec4899", "#f59e0b", "#00c5a0"].map((c, j) => (
                  <div key={j} className="w-5.5 h-5.5 rounded-full border-2 border-white dark:border-[#161c24] flex items-center justify-center text-[9px] text-white font-bold -ml-1.5 first:ml-0" style={{ background: c }}>
                    {["R", "I", "J", "E"][j]}
                  </div>
                ))}
              </div>
              <span className="text-[#00c5a0] font-bold">+4</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1">From Last Week</span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Middle Row: Top Deals (1/3) | Pipeline Statistics (1/3) | Deals Overview (1/3) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Top Deals */}
        <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4.5 bg-[#00c5a0] rounded-full inline-block" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">Top Deals</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setTopDealsOpen(!topDealsOpen)}
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e2632]"
              >
                {topDealsFilter} <i className="fa-solid fa-chevron-down text-[9px] ml-1" />
              </button>
              {topDealsOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg shadow-lg z-10 min-w-32 py-1">
                  {["Last 30 Days", "This Quarter", "This Year"].map((opt) => (
                    <div key={opt} onClick={() => { setTopDealsFilter(opt); setTopDealsOpen(false); fetchDashboardData(); }}
                      className={cn("px-3 py-1.5 text-xs cursor-pointer transition-colors", topDealsFilter === opt ? "text-[#00c5a0] font-semibold" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1e2632]")}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            {displayedTopDeals.map((deal: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-xs" style={{ background: deal.bg }}>
                    {deal.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white m-0">{deal.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">{deal.country}</p>
                  </div>
                </div>
                <span className="font-bold text-slate-900 dark:text-white">{deal.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#232d3b] text-center">
            <Link href="/dashboard/clients" className="text-xs text-slate-600 dark:text-slate-300 hover:text-[#00c5a0] font-semibold flex items-center justify-center gap-1.5 transition-colors">
              View All <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
          </div>
        </div>

        {/* Pipeline Statistics */}
        <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4.5 bg-[#00c5a0] rounded-full inline-block" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">Pipeline Statistics</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setPipelineOpen(!pipelineOpen)}
                className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] rounded-lg px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#1e2632]"
              >
                {pipelinePeriod} <i className="fa-solid fa-chevron-down text-[9px] ml-1" />
              </button>
              {pipelineOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-lg shadow-lg z-10 min-w-28 py-1">
                  {["Weekly", "Monthly", "Quarterly"].map((opt) => (
                    <div key={opt} onClick={() => { setPipelinePeriod(opt); setPipelineOpen(false); fetchDashboardData(); }}
                      className={cn("px-3 py-1.5 text-xs cursor-pointer transition-colors", pipelinePeriod === opt ? "text-[#00c5a0] font-semibold" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1e2632]")}>
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4 stage columns */}
          <div className="grid grid-cols-4 gap-1.5 mb-3.5 text-center">
            {pipelineStats.map((p: any, i: number) => (
              <div key={i}>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-0.5">{p.stage}</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white mb-0.5 truncate">{p.amount}</p>
                <p className="text-[10px] text-slate-400">{p.deals}</p>
              </div>
            ))}
          </div>

          {/* Color block indicators */}
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {["#00c5a0", "#f59e0b", "#a855f7", "#0ea5e9"].map((c, i) => (
              <div key={i} className="h-12 rounded-lg" style={{ background: c }} />
            ))}
          </div>

          {/* Profit Earned mini */}
          <div className="pt-3 border-t border-slate-200 dark:border-[#232d3b]">
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">Profit Earned <strong className="text-slate-900 dark:text-white">$85K</strong></span>
              <div className="relative">
                <button
                  onClick={() => setProfitOpen(!profitOpen)}
                  className="flex items-center gap-1 bg-slate-50 dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] rounded-md px-2 py-0.5 text-[11px] cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1e2632]"
                >
                  {profitYear} <i className="fa-solid fa-chevron-down text-[8px] ml-0.5" />
                </button>
                {profitOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-[#161c24] border border-slate-200 dark:border-[#232d3b] rounded-md shadow-lg z-10 min-w-24 py-1">
                    {["2024", "2025", "2026"].map((y) => (
                      <div key={y} onClick={() => { setProfitYear(y); setProfitOpen(false); }}
                        className={cn("px-2.5 py-1 text-[11px] cursor-pointer transition-colors", profitYear === y ? "text-[#00c5a0] font-semibold" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1e2632]")}>
                        {y}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-end gap-1 h-10">
              {[20, 30, 15, 45, 25, 55, 35, 60, 45, 65, 50, 75].map((v, i) => (
                <div key={i} className={cn("flex-1 rounded-t-xs min-h-1", v > 40 ? "bg-[#00c5a0]" : "bg-[#00c5a0]/30")} style={{ height: `${v}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Deals Overview */}
        <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4.5 bg-[#00c5a0] rounded-full inline-block" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">Deals Overview</span>
            </div>
            <Link href="/dashboard/clients" className="w-7 h-7 border border-slate-200 dark:border-[#232d3b] rounded-md bg-white dark:bg-[#161c24] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1e2632] transition-colors">
              <i className="fa-solid fa-arrow-right text-[11px]" />
            </Link>
          </div>

          {/* Segmented bar */}
          <div className="flex h-2 rounded-full overflow-hidden mb-3.5 gap-0.5">
            {dealsOverview.map((d: any, i: number) => (
              <div key={i} style={{ flex: d.pct, background: d.color }} />
            ))}
          </div>

          <div className="mb-3.5">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">{totalDealsCount.toLocaleString()}</span>
            <span className="text-xs text-[#00c5a0] font-bold ml-2">+12.5%</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">compared to last week</span>
          </div>

          <div className="flex flex-col gap-2 mb-3.5">
            {dealsOverview.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-slate-600 dark:text-slate-400">{d.label}</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">{d.count}</span>
              </div>
            ))}
          </div>

          {/* Deals Won inner card */}
          <div className="bg-slate-50 dark:bg-[#11161d] rounded-lg border border-slate-200 dark:border-[#232d3b] p-2.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 m-0">Deals Won</p>
              <p className="text-base font-extrabold text-slate-900 dark:text-white m-0">{dealsWonCount}</p>
            </div>
            <div className="flex items-center">
              {["#00c5a0", "#6366f1", "#ec4899", "#f59e0b", "#64748b"].map((c, j) => (
                <div key={j} className="w-6 h-6 rounded-full border-2 border-white dark:border-[#161c24] flex items-center justify-center text-[9px] text-white font-bold -ml-1.5 first:ml-0" style={{ background: c }}>
                  {["R", "I", "J", "S", "E"][j]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Feature Live Data Hub ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white m-0">Workspace Feature Live Data</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">Real-time status across Projects, Goals, Timesheets, and Activity</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-[#11161d] rounded-lg p-1 border border-slate-200 dark:border-[#232d3b] gap-1 overflow-x-auto">
            <button
              onClick={() => setFeatureTab("projects")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all whitespace-nowrap",
                featureTab === "projects" ? "bg-[#00c5a0] text-slate-950 shadow-xs font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <i className="fa-solid fa-folder-tree text-[11px]" />
              <span>Projects ({projectsList.length})</span>
            </button>
            <button
              onClick={() => setFeatureTab("goals")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all whitespace-nowrap",
                featureTab === "goals" ? "bg-[#00c5a0] text-slate-950 shadow-xs font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <i className="fa-solid fa-bullseye text-[11px]" />
              <span>Goals & OKRs ({okrsList.length})</span>
            </button>
            <button
              onClick={() => setFeatureTab("timesheets")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all whitespace-nowrap",
                featureTab === "timesheets" ? "bg-[#00c5a0] text-slate-950 shadow-xs font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <i className="fa-solid fa-calendar-days text-[11px]" />
              <span>Timesheets ({timesheetsList.length})</span>
            </button>
            <button
              onClick={() => setFeatureTab("activity")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all whitespace-nowrap",
                featureTab === "activity" ? "bg-[#00c5a0] text-slate-950 shadow-xs font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <i className="fa-solid fa-chart-line text-[11px]" />
              <span>Activity Logs ({activityLogsList.length})</span>
            </button>
          </div>
        </div>

        {/* 1. Projects */}
        {featureTab === "projects" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#232d3b] text-slate-500 dark:text-slate-400">
                  {["Project Name", "Status", "Priority", "Start Date", "Due Date", "Action"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3.5 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#232d3b]">
                {projectsList.slice(0, 5).map((proj: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#1e2632]/50 transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-[#00c5a0]/15 text-[#00c5a0] flex items-center justify-center font-bold text-xs shrink-0">
                          <i className="fa-solid fa-layer-group" />
                        </span>
                        <div>
                          <p className="m-0 font-bold">{proj.name}</p>
                          <p className="m-0 text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{proj.description || "Active Workspace Project"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
                        proj.status === "Completed" ? "bg-[#00c5a0]/15 text-[#00c5a0]" :
                        proj.status === "In Progress" ? "bg-blue-500/15 text-blue-500 dark:text-blue-400" :
                        "bg-amber-500/15 text-amber-500 dark:text-amber-400"
                      )}>
                        {proj.status || "In Progress"}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-[#11161d] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#232d3b]">
                        {proj.priority || "Medium"}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400">{proj.startDate ? new Date(proj.startDate).toLocaleDateString() : "—"}</td>
                    <td className="py-3 px-3.5 text-slate-900 dark:text-white font-medium">{proj.dueDate ? new Date(proj.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="py-3 px-3.5">
                      <Link href="/dashboard/projects" className="text-[#00c5a0] font-semibold hover:underline inline-flex items-center gap-1">
                        View <i className="fa-solid fa-arrow-right text-[10px]" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Goals */}
        {featureTab === "goals" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {okrsList.slice(0, 6).map((okr: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#00c5a0]/15 text-[#00c5a0] text-[10px] font-bold uppercase">
                      {okr.category || "Company OKR"}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">{okr.progress || 0}%</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">{okr.title}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{okr.description || "Strategic objective target."}</p>
                </div>
                <div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-[#232d3b] overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-[#00c5a0] to-[#0ea5e9] rounded-full" style={{ width: `${Math.min(100, Math.max(5, okr.progress || 0))}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Target: {okr.targetDate ? new Date(okr.targetDate).toLocaleDateString() : "End of Quarter"}</span>
                    <Link href="/dashboard/goals" className="text-[#00c5a0] font-semibold hover:underline">Manage</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. Timesheets */}
        {featureTab === "timesheets" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#232d3b] text-slate-500 dark:text-slate-400">
                  {["Task / Activity", "Project", "Hours Logged", "Date", "Status"].map((h) => (
                    <th key={h} className="text-left py-2.5 px-3.5 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#232d3b]">
                {timesheetsList.slice(0, 5).map((ts: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#1e2632]/50 transition-colors">
                    <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white">{ts.taskName || "Client Project Work"}</td>
                    <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400">{ts.project || "Internal Workspace"}</td>
                    <td className="py-3 px-3.5 font-extrabold text-[#00c5a0]">{ts.hours || 0} hrs</td>
                    <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400">{ts.date ? new Date(ts.date).toLocaleDateString() : "Today"}</td>
                    <td className="py-3 px-3.5">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-semibold",
                        ts.status === "Approved" ? "bg-[#00c5a0]/15 text-[#00c5a0]" : "bg-amber-500/15 text-amber-500 dark:text-amber-400"
                      )}>
                        {ts.status || "Submitted"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Activity Logs */}
        {featureTab === "activity" && (
          <div className="space-y-2.5">
            {activityLogsList.slice(0, 5).map((log: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#11161d] border border-slate-200 dark:border-[#232d3b] text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-[#00c5a0]/15 text-[#00c5a0] flex items-center justify-center font-bold text-xs shrink-0">
                    <i className="fa-solid fa-bolt" />
                  </span>
                  <div>
                    <p className="m-0 font-semibold text-slate-900 dark:text-white">
                      <strong>{log.userName || "System"}</strong>: {log.action}
                    </p>
                    <p className="m-0 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">{log.details || "Activity performed in workspace"}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap ml-2">
                  {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent Deals Table (Full-Width) ────────────────────────────────── */}
      <div className="bg-white dark:bg-[#161c24] rounded-2xl border border-slate-200 dark:border-[#232d3b] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-1 h-4.5 bg-[#00c5a0] rounded-full inline-block" />
            <span className="font-bold text-base text-slate-900 dark:text-white">Recent Deals</span>
          </div>
          <Link href="/dashboard/clients" className="text-xs text-[#00c5a0] hover:underline font-semibold flex items-center gap-1.5 transition-colors">
            View All <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#232d3b] text-slate-500 dark:text-slate-400">
                {["Deal Name", "Stage", "Deal Value", "Tags", "Owner", "Probability", "Status"].map((h) => (
                  <th key={h} className="text-left py-2.5 px-3.5 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#232d3b]">
              {mergedDeals.slice(0, 5).map((deal: any, i: number) => (
                <tr
                  key={i}
                  className="hover:bg-slate-50 dark:hover:bg-[#1e2632]/50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = "/dashboard/clients"}
                >
                  <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white">{deal.name}</td>
                  <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400">{deal.stage}</td>
                  <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white">
                    ${Number(deal.value).toLocaleString()}
                  </td>
                  <td className="py-3 px-3.5">
                    <span className="px-2.5 py-0.5 rounded-full border text-[11px] font-medium" style={{ borderColor: deal.tagColor, color: deal.tagColor }}>
                      {deal.tag}
                    </span>
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ background: ownerColors[deal.owner] || "#6b7280" }}>
                        {deal.owner.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <span className="text-slate-700 dark:text-slate-200">{deal.owner}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-slate-700 dark:text-slate-200">{deal.prob}</td>
                  <td className="py-3 px-3.5">
                    <span className="px-3 py-1 rounded-md text-[11px] font-bold text-slate-950 shadow-xs" style={{ background: deal.statusColor }}>
                      {deal.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-4 border-t border-slate-200 dark:border-[#232d3b] text-xs text-slate-500 dark:text-slate-400 gap-3">
        <span>
          Copyright © 2026{" "}
          <Link href="/dashboard" className="text-[#00c5a0] font-semibold hover:underline">CRMS</Link>
        </span>
        <div className="flex gap-5">
          <Link href="/guide" className="text-slate-600 dark:text-slate-300 hover:text-[#00c5a0] font-medium transition-colors">About</Link>
          <Link href="/dashboard/settings" className="text-slate-600 dark:text-slate-300 hover:text-[#00c5a0] font-medium transition-colors">Terms</Link>
          <Link href="/dashboard/chat" className="text-slate-600 dark:text-slate-300 hover:text-[#00c5a0] font-medium transition-colors">Contact Us</Link>
        </div>
      </div>

      {/* ── Floating Settings Button ───────────────────────────────────────── */}
      <Link href="/dashboard/settings" className="fixed right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#00c5a0] rounded-l-lg flex items-center justify-center shadow-lg shadow-[#00c5a0]/30 z-50 hover:bg-[#00b08e] transition-colors" title="Customize Theme & Settings">
        <i className="fa-solid fa-gear text-slate-950 text-base" />
      </Link>
    </div>
  );
}
