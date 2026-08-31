"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ResourceAllocation {
  _id: string;
  employeeName: string;
  role: string;
  department: string;
  assignedProject: string;
  allocatedHoursPerWeek: number;
  utilizationRate: number;
  status: "Deployed" | "Partially Allocated" | "Bench" | "On Leave";
  startDate: string;
  notes?: string;
}

interface HrWorkdeskDashboardProps {
  allocations: ResourceAllocation[];
  loading?: boolean;
  onNewAllocation: () => void;
  onEditAllocation: (allocation: ResourceAllocation) => void;
  onDeleteAllocation: (id: string) => void;
  onRefresh?: () => void;
}

export default function HrWorkdeskDashboard({
  allocations,
  loading = false,
  onNewAllocation,
  onEditAllocation,
  onDeleteAllocation,
  onRefresh,
}: HrWorkdeskDashboardProps) {
  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Filtered allocations
  const filteredAllocations = useMemo(() => {
    return allocations.filter((item) => {
      const matchSearch =
        !searchQuery ||
        item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assignedProject.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      const matchDept = deptFilter === "All" || item.department === deptFilter;

      return matchSearch && matchStatus && matchDept;
    });
  }, [allocations, searchQuery, statusFilter, deptFilter]);

  // Derived metrics
  const totalEmployees = allocations.length || 8;
  const deployedCount = allocations.filter((a) => a.status === "Deployed").length || 4;
  const benchOrLeaveCount = allocations.filter((a) => a.status === "Bench" || a.status === "On Leave").length || 2;
  const avgUtilization =
    allocations.length === 0
      ? 75
      : Math.round(allocations.reduce((sum, a) => sum + a.utilizationRate, 0) / allocations.length);

  // Checkbox toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAllocations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAllocations.map((a) => a._id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Avatar color palette
  const AVATAR_COLORS = [
    "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
    "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  ];

  // Upcoming meetings schedule mock data
  const scheduleMeetings = [
    {
      id: "1",
      title: "Meeting with Candidate #1",
      name: "Sophia Martinez",
      date: "January 17, 2026",
      time: "10.00 - 11.00",
      avatarInitials: "SM",
      avatarColor: "bg-purple-500 text-white",
    },
    {
      id: "2",
      title: "Meeting with Candidate #2",
      name: "David Kim",
      date: "January 17, 2026",
      time: "11.30 - 12.30",
      avatarInitials: "DK",
      avatarColor: "bg-cyan-500 text-white",
    },
    {
      id: "3",
      title: "Meeting with Candidate #3",
      name: "Emma Wilson",
      date: "January 17, 2026",
      time: "14.00 - 15.00",
      avatarInitials: "EW",
      avatarColor: "bg-pink-500 text-white",
    },
    {
      id: "4",
      title: "Quarterly Performance Sync",
      name: "Tech Leads",
      date: "January 18, 2026",
      time: "16.00 - 17.00",
      avatarInitials: "TL",
      avatarColor: "bg-emerald-500 text-white",
    },
  ];

  // Calendar dates matrix for August 2026
  const calendarDays = [
    { num: 26, isCurrMonth: false },
    { num: 27, isCurrMonth: false },
    { num: 28, isCurrMonth: false },
    { num: 29, isCurrMonth: false },
    { num: 30, isCurrMonth: false },
    { num: 31, isCurrMonth: false },
    { num: 1, isCurrMonth: true },
    { num: 2, isCurrMonth: true },
    { num: 3, isCurrMonth: true },
    { num: 4, isCurrMonth: true },
    { num: 5, isCurrMonth: true },
    { num: 6, isCurrMonth: true },
    { num: 7, isCurrMonth: true },
    { num: 8, isCurrMonth: true },
    { num: 9, isCurrMonth: true },
    { num: 10, isCurrMonth: true },
    { num: 11, isCurrMonth: true },
    { num: 12, isCurrMonth: true },
    { num: 13, isCurrMonth: true },
    { num: 14, isCurrMonth: true },
    { num: 15, isCurrMonth: true },
    { num: 16, isCurrMonth: true },
    { num: 17, isCurrMonth: true },
    { num: 18, isCurrMonth: true },
    { num: 19, isCurrMonth: true },
    { num: 20, isCurrMonth: true },
    { num: 21, isCurrMonth: true },
    { num: 22, isCurrMonth: true },
    { num: 23, isCurrMonth: true },
    { num: 24, isCurrMonth: true },
    { num: 25, isCurrMonth: true },
    { num: 26, isCurrMonth: true },
    { num: 27, isCurrMonth: true },
    { num: 28, isCurrMonth: true },
    { num: 29, isCurrMonth: true },
    { num: 30, isCurrMonth: true },
    { num: 31, isCurrMonth: true, isToday: true },
    { num: 1, isCurrMonth: false },
    { num: 2, isCurrMonth: false },
    { num: 3, isCurrMonth: false },
    { num: 4, isCurrMonth: false },
    { num: 5, isCurrMonth: false },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header Section (Title, Search, Action Button) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            Dashboard
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Welcome to HR Workdesk • Manage workforce, recruitment & allocations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64 md:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-primary" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 h-10 rounded-full bg-card border-border/80 text-xs shadow-xs focus-visible:ring-primary"
            />
          </div>

          <Button
            onClick={onNewAllocation}
            className="h-10 px-4 gap-2 rounded-full font-semibold shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <i className="fa-solid fa-user-plus text-xs" />
            <span>Allocate Staff</span>
          </Button>

          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              className="h-10 w-10 rounded-full cursor-pointer hover:bg-muted"
              title="Refresh"
            >
              <i className="fa-solid fa-rotate-right text-xs" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Two-Column Main Layout (75% Left Main Column / 25% Right Widgets Column) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ════════════════════════════════════════════════════════════════
            LEFT MAIN COLUMN (Col Span 8 on XL)
        ════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-8 space-y-6">
          {/* ── Row 1: 3 Kleon Modern KPI Cards with Bottom Colored Banners ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Card 1: Total Employees (Purple/Primary Theme) */}
            <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card flex flex-col justify-between transition-all hover:shadow-md">
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-base shadow-xs">
                    <i className="fa-solid fa-users" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Total Employees
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {totalEmployees}
                  </span>

                  {/* Sparkline Curve SVG */}
                  <svg viewBox="0 0 80 30" className="w-20 h-8 overflow-visible">
                    <path
                      d="M2,20 Q20,5 40,16 T78,8"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Bottom Solid Banner */}
              <div className="bg-purple-600 text-white px-4 py-2 text-xs font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-arrow-up text-[10px]" />
                <span>+15% than last month</span>
              </div>
            </Card>

            {/* Card 2: New Employees / Active (Cyan Theme) */}
            <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card flex flex-col justify-between transition-all hover:shadow-md">
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-base shadow-xs">
                    <i className="fa-solid fa-user-check" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Active Deployed
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {deployedCount}
                  </span>

                  {/* Sparkline Curve SVG */}
                  <svg viewBox="0 0 80 30" className="w-20 h-8 overflow-visible">
                    <path
                      d="M2,15 Q20,25 40,8 T78,18"
                      fill="none"
                      stroke="#06b6d4"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Bottom Solid Banner */}
              <div className="bg-cyan-500 text-white px-4 py-2 text-xs font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-arrow-up text-[10px]" />
                <span>+8% than last month</span>
              </div>
            </Card>

            {/* Card 3: Employees Turnover / Bench (Pink Theme) */}
            <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card flex flex-col justify-between transition-all hover:shadow-md">
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center text-base shadow-xs">
                    <i className="fa-solid fa-user-clock" />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Bench & Leave
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-4">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {benchOrLeaveCount}
                  </span>

                  {/* Sparkline Curve SVG */}
                  <svg viewBox="0 0 80 30" className="w-20 h-8 overflow-visible">
                    <path
                      d="M2,22 Q20,10 40,24 T78,6"
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Bottom Solid Banner */}
              <div className="bg-pink-600 text-white px-4 py-2 text-xs font-semibold flex items-center gap-1.5">
                <i className="fa-solid fa-arrow-down text-[10px]" />
                <span>-4% than last month</span>
              </div>
            </Card>
          </div>

          {/* ── Row 2: Application Received (Dual-Spline Line Chart) ── */}
          <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Application Recieved
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                    <span className="font-semibold text-foreground">Approved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />
                    <span className="font-semibold text-foreground">Pending</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                  className="h-8 px-3 text-xs font-semibold bg-muted/50 border border-border/80 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>

                <button
                  type="button"
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer"
                >
                  <i className="fa-solid fa-ellipsis-vertical text-xs" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-3">
              {/* Spline Area Double-Curve Chart */}
              <div className="relative w-full h-64 pt-2">
                <svg viewBox="0 0 700 220" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="purpleSplineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="pinkSplineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Dashed Gridlines */}
                  {[
                    { val: 100, y: 20 },
                    { val: 80, y: 60 },
                    { val: 60, y: 100 },
                    { val: 40, y: 140 },
                    { val: 20, y: 180 },
                    { val: 0, y: 210 },
                  ].map((grid, idx) => (
                    <g key={idx}>
                      <line
                        x1="35"
                        y1={grid.y}
                        x2="690"
                        y2={grid.y}
                        stroke="currentColor"
                        strokeOpacity="0.08"
                        strokeDasharray={idx === 5 ? "0" : "4 4"}
                      />
                      <text
                        x="25"
                        y={grid.y + 4}
                        textAnchor="end"
                        className="text-[10px] fill-muted-foreground font-mono font-medium"
                      >
                        {grid.val}
                      </text>
                    </g>
                  ))}

                  {/* Purple Curve Fill & Stroke (Approved) */}
                  <path
                    d="M 50,210 C 90,140 120,60 180,65 C 240,70 270,30 330,40 C 390,50 420,120 480,45 C 540,40 570,110 630,90 L 680,105 L 680,210 L 50,210 Z"
                    fill="url(#purpleSplineGrad)"
                  />
                  <path
                    d="M 50,210 C 90,140 120,60 180,65 C 240,70 270,30 330,40 C 390,50 420,120 480,45 C 540,40 570,110 630,90 L 680,105"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Pink Curve Fill & Stroke (Pending) */}
                  <path
                    d="M 50,110 C 90,170 120,165 180,150 C 240,145 270,90 330,95 C 390,160 420,175 480,165 C 540,25 570,95 630,110 L 680,95 L 680,210 L 50,210 Z"
                    fill="url(#pinkSplineGrad)"
                  />
                  <path
                    d="M 50,110 C 90,170 120,165 180,150 C 240,145 270,90 330,95 C 390,160 420,175 480,165 C 540,25 570,95 630,110 L 680,95"
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Days of week on X-Axis */}
                  {[
                    { day: "Sunday", x: 50 },
                    { day: "Monday", x: 155 },
                    { day: "Tuesday", x: 260 },
                    { day: "Wednesday", x: 365 },
                    { day: "Thursday", x: 470 },
                    { day: "Friday", x: 575 },
                    { day: "Saturday", x: 670 },
                  ].map((item, idx) => (
                    <text
                      key={idx}
                      x={item.x}
                      y="218"
                      textAnchor="middle"
                      className="text-[10px] fill-muted-foreground font-medium"
                    >
                      {item.day}
                    </text>
                  ))}
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* ── Row 3: Employee Status Data Table Card ── */}
          <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Employee Status
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete staff deployment and resource status registry
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Show</span>
                  <select
                    value={entriesPerPage}
                    onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                    className="h-8 px-2 text-xs font-semibold bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                  <span>entries</span>
                </div>

                <div className="relative w-48">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-purple-500" />
                  <Input
                    type="text"
                    placeholder="Search here..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 h-8 text-xs rounded-lg bg-muted/30 border-border"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length === filteredAllocations.length
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                        <i className="fa-solid fa-sort text-[10px] opacity-70" />
                        <span>Employee</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                        <i className="fa-solid fa-sort text-[10px] opacity-70" />
                        <span>Role & Dept</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                        <i className="fa-solid fa-sort text-[10px] opacity-70" />
                        <span>Status</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                        <i className="fa-solid fa-sort text-[10px] opacity-70" />
                        <span>Join Date</span>
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border/40">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <i className="fa-solid fa-spinner fa-spin mr-2 text-primary" />
                        Loading employee registry...
                      </td>
                    </tr>
                  ) : filteredAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        No employees found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAllocations.slice(0, entriesPerPage).map((emp, idx) => {
                      const initials = emp.employeeName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      const isSelected = selectedIds.includes(emp._id);

                      // Kleon status indicator styling
                      let statusBadge = (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      );

                      if (emp.status === "Bench") {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Onboarding</span>
                          </span>
                        );
                      } else if (emp.status === "On Leave") {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>Inactive</span>
                          </span>
                        );
                      } else if (emp.status === "Partially Allocated") {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1.5 font-medium text-cyan-600 dark:text-cyan-400">
                            <span className="w-2 h-2 rounded-full bg-cyan-500" />
                            <span>Partial</span>
                          </span>
                        );
                      }

                      const email = `${emp.employeeName
                        .toLowerCase()
                        .replace(/\s+/g, "")}@nexace.com`;

                      return (
                        <tr
                          key={emp._id}
                          className={cn(
                            "hover:bg-muted/20 transition-colors",
                            isSelected && "bg-primary/5"
                          )}
                        >
                          {/* Checkbox */}
                          <td className="py-4 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(emp._id)}
                              className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                            />
                          </td>

                          {/* Employee (Avatar + Name + Email) */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs",
                                  AVATAR_COLORS[idx % AVATAR_COLORS.length]
                                )}
                              >
                                {initials}
                              </div>
                              <div>
                                <p className="font-bold text-foreground hover:text-primary cursor-pointer">
                                  {emp.employeeName}
                                </p>
                                <p className="text-[11px] text-muted-foreground">{email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Role & Department */}
                          <td className="py-4 px-4">
                            <p className="font-semibold text-foreground">{emp.role}</p>
                            <p className="text-[11px] text-muted-foreground">{emp.department}</p>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">{statusBadge}</td>

                          {/* Join Date */}
                          <td className="py-4 px-4 text-muted-foreground font-medium">
                            {emp.startDate || "June 1, 2026"}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-right relative">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditAllocation(emp)}
                                className="h-7 w-7 p-0 rounded-lg hover:bg-muted cursor-pointer"
                                title="Edit"
                              >
                                <i className="fa-solid fa-pen text-xs text-primary" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteAllocation(emp._id)}
                                className="h-7 w-7 p-0 rounded-lg hover:bg-muted text-destructive hover:text-destructive cursor-pointer"
                                title="Delete"
                              >
                                <i className="fa-solid fa-trash text-xs" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Table Pagination */}
              <div className="p-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <p>
                  Showing 1 to {Math.min(entriesPerPage, filteredAllocations.length)} of{" "}
                  {filteredAllocations.length} entries
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs" disabled>
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg text-xs font-bold bg-primary text-primary-foreground"
                  >
                    1
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 rounded-lg text-xs"
                    disabled={filteredAllocations.length <= entriesPerPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT WIDGETS COLUMN (Col Span 4 on XL)
        ════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-4 space-y-6">
          {/* ── Widget 1: Interactive Mini Calendar ── */}
          <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-foreground">August 2026</span>
                <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer text-xs"
                >
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <button
                  type="button"
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer text-xs"
                >
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {calendarDays.map((d, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-8 flex items-center justify-center rounded-full font-medium transition-colors",
                      !d.isCurrMonth && "text-muted-foreground/40",
                      d.isCurrMonth && !d.isToday && "text-foreground hover:bg-muted/50 cursor-pointer",
                      d.isToday && "bg-purple-600 text-white font-bold shadow-xs cursor-pointer"
                    )}
                  >
                    {d.num}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Widget 2: Schedule / Upcoming Candidate Meetings ── */}
          <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Schedule</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Thursday, August 31st, 2026
                </p>
              </div>
              <button
                type="button"
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer"
              >
                <i className="fa-solid fa-ellipsis-vertical text-xs" />
              </button>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {scheduleMeetings.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors border border-border/30 bg-muted/10"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs",
                      item.avatarColor
                    )}
                  >
                    {item.avatarInitials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <i className="fa-regular fa-calendar text-[10px]" />
                        <span>{item.date.split(",")[0]}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <i className="fa-regular fa-clock text-[10px]" />
                        <span>{item.time}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full h-9 rounded-xl text-xs font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 cursor-pointer"
              >
                View All
              </Button>
            </CardContent>
          </Card>

          {/* ── Widget 3: Employee Paid Leave / Utilization Donut ── */}
          <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground">
                Employee Paid Leave
              </CardTitle>
              <button
                type="button"
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer"
              >
                <i className="fa-solid fa-ellipsis-vertical text-xs" />
              </button>
            </CardHeader>

            <CardContent className="p-5 flex flex-col items-center justify-center">
              {/* Radial Donut Progress Gauge */}
              <div className="relative w-44 h-44 flex items-center justify-center my-2">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  {/* Background Circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity="0.08"
                    strokeWidth="22"
                  />
                  {/* Active 75% Purple Arc */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="22"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - 0.75)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {avgUtilization}%
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    of Employee
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
