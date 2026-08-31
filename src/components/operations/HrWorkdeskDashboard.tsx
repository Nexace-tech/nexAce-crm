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

interface ScheduleMeeting {
  id: string;
  title: string;
  name: string;
  date: string;
  time: string;
  avatarInitials: string;
  avatarColor: string;
  type: "Candidate Interview" | "Performance Review" | "Team Sync";
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
  // ── Filters & Search State ──
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [deptFilter, setDeptFilter] = useState<string>("All");
  const [activeKpiFilter, setActiveKpiFilter] = useState<"all" | "deployed" | "bench" | null>(null);

  // ── Sorting State ──
  const [sortField, setSortField] = useState<"name" | "role" | "status" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // ── Selection & Pagination State ──
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [entriesPerPage, setEntriesPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // ── Chart State ──
  const [chartTimeframe, setChartTimeframe] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [showApprovedSeries, setShowApprovedSeries] = useState<boolean>(true);
  const [showPendingSeries, setShowPendingSeries] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<{
    idx: number;
    x: number;
    yApp: number;
    yPend: number;
    label: string;
    appVal: number;
    pendVal: number;
  } | null>(null);

  // ── Calendar & Schedule State ──
  const [calendarDate, setCalendarDate] = useState<Date>(new Date(2026, 7, 31)); // Aug 31, 2026
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(31);
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState<boolean>(false);

  // ── Schedule Meetings List ──
  const [meetings, setMeetings] = useState<ScheduleMeeting[]>([
    {
      id: "1",
      title: "Meeting with Candidate #1",
      name: "Sophia Martinez",
      date: "2026-08-31",
      time: "10.00 - 11.00",
      avatarInitials: "SM",
      avatarColor: "bg-purple-500 text-white",
      type: "Candidate Interview",
    },
    {
      id: "2",
      title: "Meeting with Candidate #2",
      name: "David Kim",
      date: "2026-08-31",
      time: "11.30 - 12.30",
      avatarInitials: "DK",
      avatarColor: "bg-cyan-500 text-white",
      type: "Candidate Interview",
    },
    {
      id: "3",
      title: "Meeting with Candidate #3",
      name: "Emma Wilson",
      date: "2026-08-31",
      time: "14.00 - 15.00",
      avatarInitials: "EW",
      avatarColor: "bg-pink-500 text-white",
      type: "Candidate Interview",
    },
    {
      id: "4",
      title: "Quarterly Performance Sync",
      name: "Engineering Leads",
      date: "2026-09-01",
      time: "16.00 - 17.00",
      avatarInitials: "EL",
      avatarColor: "bg-emerald-500 text-white",
      type: "Performance Review",
    },
  ]);

  const [newMeetingForm, setNewMeetingForm] = useState({
    title: "",
    name: "",
    time: "10:00 - 11:00",
    type: "Candidate Interview" as ScheduleMeeting["type"],
  });

  // ── Quick Status Change Popover State ──
  const [quickStatusMenuId, setQuickStatusMenuId] = useState<string | null>(null);

  // ── Derived Department List ──
  const departmentsList = useMemo(() => {
    return Array.from(new Set(allocations.map((a) => a.department).filter(Boolean))).sort();
  }, [allocations]);

  // ── KPI Filtering Handler ──
  const handleKpiCardClick = (type: "all" | "deployed" | "bench") => {
    if (activeKpiFilter === type) {
      setActiveKpiFilter(null);
      setStatusFilter("All");
    } else {
      setActiveKpiFilter(type);
      if (type === "all") setStatusFilter("All");
      if (type === "deployed") setStatusFilter("Deployed");
      if (type === "bench") setStatusFilter("Bench");
    }
    setCurrentPage(1);
  };

  // ── Filtered & Sorted Allocations ──
  const filteredAndSortedAllocations = useMemo(() => {
    let result = allocations.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.employeeName.toLowerCase().includes(q) ||
        item.role.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.assignedProject.toLowerCase().includes(q);

      const matchStatus = statusFilter === "All" || item.status === statusFilter;
      const matchDept = deptFilter === "All" || item.department === deptFilter;

      return matchSearch && matchStatus && matchDept;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: string | number = "";
      let valB: string | number = "";

      if (sortField === "name") {
        valA = a.employeeName.toLowerCase();
        valB = b.employeeName.toLowerCase();
      } else if (sortField === "role") {
        valA = a.role.toLowerCase();
        valB = b.role.toLowerCase();
      } else if (sortField === "status") {
        valA = a.status.toLowerCase();
        valB = b.status.toLowerCase();
      } else if (sortField === "date") {
        valA = a.startDate || "";
        valB = b.startDate || "";
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [allocations, searchQuery, statusFilter, deptFilter, sortField, sortOrder]);

  // ── Paginated Records ──
  const totalPages = Math.ceil(filteredAndSortedAllocations.length / entriesPerPage) || 1;
  const paginatedAllocations = useMemo(() => {
    const start = (currentPage - 1) * entriesPerPage;
    return filteredAndSortedAllocations.slice(start, start + entriesPerPage);
  }, [filteredAndSortedAllocations, currentPage, entriesPerPage]);

  // ── KPI Metrics ──
  const totalEmployees = allocations.length;
  const deployedCount = allocations.filter((a) => a.status === "Deployed").length;
  const benchCount = allocations.filter((a) => a.status === "Bench").length;
  const leaveCount = allocations.filter((a) => a.status === "On Leave").length;
  const avgUtilization =
    allocations.length === 0
      ? 0
      : Math.round(
          allocations.reduce((sum, a) => sum + (a.utilizationRate || 0), 0) / allocations.length
        );

  // ── Checkbox Selection ──
  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedAllocations.length && paginatedAllocations.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedAllocations.map((a) => a._id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ── Sorting Toggle ──
  const handleSort = (field: "name" | "role" | "status" | "date") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // ── Bulk Delete ──
  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} staff record(s)?`)) {
      selectedIds.forEach((id) => onDeleteAllocation(id));
      setSelectedIds([]);
    }
  };

  // ── CSV Export Functionality ──
  const handleExportCSV = () => {
    const headers = [
      "Employee Name",
      "Email",
      "Role",
      "Department",
      "Assigned Project",
      "Allocated Hours/Wk",
      "Utilization Rate %",
      "Status",
      "Start Date",
    ];

    const rows = filteredAndSortedAllocations.map((emp) => [
      `"${emp.employeeName.replace(/"/g, '""')}"`,
      `"${emp.employeeName.toLowerCase().replace(/\s+/g, "")}@nexace.com"`,
      `"${emp.role.replace(/"/g, '""')}"`,
      `"${emp.department.replace(/"/g, '""')}"`,
      `"${emp.assignedProject.replace(/"/g, '""')}"`,
      emp.allocatedHoursPerWeek,
      `${emp.utilizationRate}%`,
      emp.status,
      emp.startDate || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `staff_registry_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Chart Dynamic Data based on Timeframe ──
  const chartData = useMemo(() => {
    if (chartTimeframe === "Daily") {
      return {
        labels: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        approved: [25, 68, 88, 72, 95, 65, 78],
        pending: [52, 28, 48, 62, 28, 82, 58],
      };
    } else if (chartTimeframe === "Weekly") {
      return {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        approved: [62, 85, 74, 96],
        pending: [45, 55, 38, 60],
      };
    } else {
      return {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        approved: [45, 58, 62, 78, 82, 90, 85, 94, 88, 76, 92, 98],
        pending: [32, 40, 35, 50, 48, 55, 60, 45, 52, 48, 38, 42],
      };
    }
  }, [chartTimeframe]);

  // ── Calendar Computations ──
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const totalDaysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{ day: number; isCurrMonth: boolean; isSelected: boolean }> = [];

    // Prev month overflow days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: totalDaysInPrevMonth - i, isCurrMonth: false, isSelected: false });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        day: i,
        isCurrMonth: true,
        isSelected: i === selectedCalendarDay,
      });
    }

    // Next month fill days (complete 35 or 42 grid cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrMonth: false, isSelected: false });
    }

    return days;
  }, [currentYear, currentMonth, selectedCalendarDay]);

  const handlePrevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Add Meeting Handler
  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingForm.title || !newMeetingForm.name) return;

    const colors = ["bg-purple-500 text-white", "bg-cyan-500 text-white", "bg-pink-500 text-white", "bg-emerald-500 text-white"];
    const initials = newMeetingForm.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

    const newM: ScheduleMeeting = {
      id: Date.now().toString(),
      title: newMeetingForm.title,
      name: newMeetingForm.name,
      date: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(selectedCalendarDay).padStart(2, "0")}`,
      time: newMeetingForm.time,
      avatarInitials: initials || "M",
      avatarColor: colors[meetings.length % colors.length],
      type: newMeetingForm.type,
    };

    setMeetings((prev) => [newM, ...prev]);
    setShowAddMeetingModal(false);
    setNewMeetingForm({ title: "", name: "", time: "10:00 - 11:00", type: "Candidate Interview" });
  };

  const handleDeleteMeeting = (id: string) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
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

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Search */}
          <div className="relative w-60 md:w-72">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-primary" />
            <Input
              type="text"
              placeholder="Search staff, role, project..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-8 h-10 rounded-full bg-card border-border/80 text-xs shadow-xs focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="h-10 px-3.5 gap-2 rounded-full font-semibold text-xs shadow-xs cursor-pointer hover:bg-muted"
            title="Export to CSV"
          >
            <i className="fa-solid fa-download text-xs text-primary" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Allocate Staff Primary Button */}
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
              title="Refresh Data"
            >
              <i className={cn("fa-solid fa-rotate-right text-xs", loading && "fa-spin text-primary")} />
            </Button>
          )}
        </div>
      </div>

      {/* ── Active Filter Banner (if KPI card clicked or filters applied) ── */}
      {(activeKpiFilter || statusFilter !== "All" || deptFilter !== "All") && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-xs text-primary">
          <i className="fa-solid fa-filter text-[11px]" />
          <span className="font-semibold">Filtered by:</span>
          {statusFilter !== "All" && (
            <span className="px-2 py-0.5 rounded-md bg-primary/20 font-bold">
              Status: {statusFilter}
            </span>
          )}
          {deptFilter !== "All" && (
            <span className="px-2 py-0.5 rounded-md bg-primary/20 font-bold">
              Dept: {deptFilter}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setActiveKpiFilter(null);
              setStatusFilter("All");
              setDeptFilter("All");
              setSearchQuery("");
            }}
            className="ml-auto text-xs underline font-semibold hover:opacity-80 flex items-center gap-1 cursor-pointer"
          >
            <i className="fa-solid fa-xmark" /> Clear All Filters
          </button>
        </div>
      )}

      {/* ── Two-Column Main Layout (75% Left Main Column / 25% Right Widgets Column) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ════════════════════════════════════════════════════════════════
            LEFT MAIN COLUMN (Col Span 8 on XL)
        ════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-8 space-y-6">
          {/* ── Row 1: 3 Kleon Modern KPI Cards with Clickable Filters ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Card 1: Total Employees (Purple Theme) */}
            <Card
              onClick={() => handleKpiCardClick("all")}
              className={cn(
                "border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card flex flex-col justify-between transition-all hover:shadow-md cursor-pointer",
                activeKpiFilter === "all" && "ring-2 ring-purple-500 shadow-md"
              )}
            >
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
              <div className="bg-purple-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-arrow-up text-[10px]" />
                  <span>+15% than last month</span>
                </div>
                <span className="text-[10px] opacity-80">Click to view all</span>
              </div>
            </Card>

            {/* Card 2: Active Deployed (Cyan Theme) */}
            <Card
              onClick={() => handleKpiCardClick("deployed")}
              className={cn(
                "border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card flex flex-col justify-between transition-all hover:shadow-md cursor-pointer",
                activeKpiFilter === "deployed" && "ring-2 ring-cyan-500 shadow-md"
              )}
            >
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
              <div className="bg-cyan-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-arrow-up text-[10px]" />
                  <span>+8% than last month</span>
                </div>
                <span className="text-[10px] opacity-80">Filter deployed</span>
              </div>
            </Card>

            {/* Card 3: Bench & Leave (Pink Theme) */}
            <Card
              onClick={() => handleKpiCardClick("bench")}
              className={cn(
                "border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card flex flex-col justify-between transition-all hover:shadow-md cursor-pointer",
                activeKpiFilter === "bench" && "ring-2 ring-pink-500 shadow-md"
              )}
            >
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
                    {benchCount + leaveCount}
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
              <div className="bg-pink-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-arrow-down text-[10px]" />
                  <span>-4% than last month</span>
                </div>
                <span className="text-[10px] opacity-80">Filter bench</span>
              </div>
            </Card>
          </div>

          {/* ── Row 2: Application Received (Interactive Dual-Spline Line Chart) ── */}
          <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Application Recieved
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-xs select-none">
                  {/* Toggle Approved Series */}
                  <button
                    type="button"
                    onClick={() => setShowApprovedSeries(!showApprovedSeries)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-opacity cursor-pointer",
                      showApprovedSeries ? "opacity-100 bg-purple-50 dark:bg-purple-950/30" : "opacity-40"
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                    <span className="font-semibold text-foreground">Approved</span>
                  </button>

                  {/* Toggle Pending Series */}
                  <button
                    type="button"
                    onClick={() => setShowPendingSeries(!showPendingSeries)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-opacity cursor-pointer",
                      showPendingSeries ? "opacity-100 bg-pink-50 dark:bg-pink-950/30" : "opacity-40"
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />
                    <span className="font-semibold text-foreground">Pending</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Timeframe Switcher */}
                <div className="flex items-center bg-muted/50 rounded-lg p-0.5 text-xs font-semibold">
                  {(["Daily", "Weekly", "Monthly"] as const).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setChartTimeframe(tf)}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all cursor-pointer",
                        chartTimeframe === tf
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-3">
              {/* Spline Area Double-Curve Chart */}
              <div className="relative w-full h-64 pt-2">
                {/* Interactive Tooltip Overlay */}
                {hoveredPoint && (
                  <div
                    className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-foreground text-background text-[11px] rounded-lg px-3 py-1.5 shadow-lg border border-border flex flex-col gap-0.5"
                    style={{
                      left: `${(hoveredPoint.x / 700) * 100}%`,
                      top: `${Math.min(hoveredPoint.yApp, hoveredPoint.yPend) * 0.9}px`,
                    }}
                  >
                    <span className="font-bold border-b border-background/20 pb-0.5">
                      {hoveredPoint.label}
                    </span>
                    {showApprovedSeries && (
                      <span className="text-purple-400 font-semibold">
                        ● Approved: {hoveredPoint.appVal} apps
                      </span>
                    )}
                    {showPendingSeries && (
                      <span className="text-pink-400 font-semibold">
                        ● Pending: {hoveredPoint.pendVal} apps
                      </span>
                    )}
                  </div>
                )}

                <svg
                  viewBox="0 0 700 220"
                  className="w-full h-full overflow-visible"
                  onMouseLeave={() => setHoveredPoint(null)}
                >
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

                  {/* Dynamic Points Calculation */}
                  {(() => {
                    const N = chartData.labels.length;
                    const step = 640 / (N - 1 || 1);
                    const startX = 45;

                    const appPoints = chartData.approved.map((v, i) => ({
                      x: startX + i * step,
                      y: 210 - (v / 100) * 190,
                      val: v,
                    }));

                    const pendPoints = chartData.pending.map((v, i) => ({
                      x: startX + i * step,
                      y: 210 - (v / 100) * 190,
                      val: v,
                    }));

                    // Generate SVG path strings
                    const makeSmoothPath = (pts: Array<{ x: number; y: number }>) => {
                      if (pts.length === 0) return "";
                      let d = `M ${pts[0].x},${pts[0].y}`;
                      for (let i = 0; i < pts.length - 1; i++) {
                        const xc = (pts[i].x + pts[i + 1].x) / 2;
                        const yc = (pts[i].y + pts[i + 1].y) / 2;
                        d += ` Q ${pts[i].x},${pts[i].y} ${xc},${yc}`;
                      }
                      d += ` T ${pts[pts.length - 1].x},${pts[pts.length - 1].y}`;
                      return d;
                    };

                    const appPath = makeSmoothPath(appPoints);
                    const pendPath = makeSmoothPath(pendPoints);
                    const appArea = `${appPath} L ${appPoints[appPoints.length - 1].x},210 L ${appPoints[0].x},210 Z`;
                    const pendArea = `${pendPath} L ${pendPoints[pendPoints.length - 1].x},210 L ${pendPoints[0].x},210 Z`;

                    return (
                      <g>
                        {/* Purple Area + Stroke */}
                        {showApprovedSeries && (
                          <>
                            <path d={appArea} fill="url(#purpleSplineGrad)" />
                            <path
                              d={appPath}
                              fill="none"
                              stroke="#8b5cf6"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                            {appPoints.map((pt, idx) => (
                              <circle
                                key={`app-pt-${idx}`}
                                cx={pt.x}
                                cy={pt.y}
                                r="4.5"
                                fill="#8b5cf6"
                                stroke="white"
                                strokeWidth="2"
                                className="cursor-pointer transition-transform hover:scale-150"
                                onMouseEnter={() =>
                                  setHoveredPoint({
                                    idx,
                                    x: pt.x,
                                    yApp: pt.y,
                                    yPend: pendPoints[idx].y,
                                    label: chartData.labels[idx],
                                    appVal: pt.val,
                                    pendVal: pendPoints[idx].val,
                                  })
                                }
                              />
                            ))}
                          </>
                        )}

                        {/* Pink Area + Stroke */}
                        {showPendingSeries && (
                          <>
                            <path d={pendArea} fill="url(#pinkSplineGrad)" />
                            <path
                              d={pendPath}
                              fill="none"
                              stroke="#ec4899"
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                            {pendPoints.map((pt, idx) => (
                              <circle
                                key={`pend-pt-${idx}`}
                                cx={pt.x}
                                cy={pt.y}
                                r="4.5"
                                fill="#ec4899"
                                stroke="white"
                                strokeWidth="2"
                                className="cursor-pointer transition-transform hover:scale-150"
                                onMouseEnter={() =>
                                  setHoveredPoint({
                                    idx,
                                    x: pt.x,
                                    yApp: appPoints[idx].y,
                                    yPend: pt.y,
                                    label: chartData.labels[idx],
                                    appVal: appPoints[idx].val,
                                    pendVal: pt.val,
                                  })
                                }
                              />
                            ))}
                          </>
                        )}

                        {/* X-Axis Labels */}
                        {chartData.labels.map((lbl, idx) => {
                          const x = startX + idx * step;
                          return (
                            <text
                              key={`lbl-${idx}`}
                              x={x}
                              y="218"
                              textAnchor="middle"
                              className="text-[10px] fill-muted-foreground font-medium"
                            >
                              {lbl.length > 5 ? lbl.slice(0, 3) : lbl}
                            </text>
                          );
                        })}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </CardContent>
          </Card>

          {/* ── Row 3: Employee Status Data Table Card ── */}
          <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Employee Status</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-normal">
                    {filteredAndSortedAllocations.length} total
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete staff deployment and resource status registry
                </p>
              </div>

              {/* Status Tabs & Department Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Department Dropdown */}
                <select
                  value={deptFilter}
                  onChange={(e) => {
                    setDeptFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2.5 text-xs font-semibold bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  {departmentsList.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                {/* Status Dropdown */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setActiveKpiFilter(null);
                    setCurrentPage(1);
                  }}
                  className="h-8 px-2.5 text-xs font-semibold bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Deployed">Active (Deployed)</option>
                  <option value="Partially Allocated">Partial</option>
                  <option value="Bench">Onboarding (Bench)</option>
                  <option value="On Leave">Inactive (On Leave)</option>
                </select>

                {/* Show Entries */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Show</span>
                  <select
                    value={entriesPerPage}
                    onChange={(e) => {
                      setEntriesPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2 text-xs font-semibold bg-muted/40 border border-border rounded-lg text-foreground focus:outline-none cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </CardHeader>

            {/* Bulk Action Toolbar if rows selected */}
            {selectedIds.length > 0 && (
              <div className="px-5 py-2.5 bg-primary/10 border-b border-primary/20 flex items-center justify-between text-xs text-primary animate-in fade-in">
                <span className="font-bold flex items-center gap-2">
                  <i className="fa-solid fa-check-double" />
                  {selectedIds.length} staff member(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds([])}
                    className="h-7 text-xs px-2.5 cursor-pointer"
                  >
                    Deselect All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="h-7 text-xs px-2.5 gap-1 cursor-pointer text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <i className="fa-solid fa-trash text-[10px]" />
                    Bulk Delete
                  </Button>
                </div>
              </div>
            )}

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 border-b border-border/50 text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length > 0 &&
                          paginatedAllocations.length > 0 &&
                          paginatedAllocations.every((a) => selectedIds.includes(a._id))
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1.5">
                        <i
                          className={cn(
                            "fa-solid text-[10px]",
                            sortField === "name"
                              ? sortOrder === "asc"
                                ? "fa-sort-up text-primary"
                                : "fa-sort-down text-primary"
                              : "fa-sort opacity-40"
                          )}
                        />
                        <span>Employee</span>
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("role")}
                    >
                      <div className="flex items-center gap-1.5">
                        <i
                          className={cn(
                            "fa-solid text-[10px]",
                            sortField === "role"
                              ? sortOrder === "asc"
                                ? "fa-sort-up text-primary"
                                : "fa-sort-down text-primary"
                              : "fa-sort opacity-40"
                          )}
                        />
                        <span>Role & Dept</span>
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1.5">
                        <i
                          className={cn(
                            "fa-solid text-[10px]",
                            sortField === "status"
                              ? sortOrder === "asc"
                                ? "fa-sort-up text-primary"
                                : "fa-sort-down text-primary"
                              : "fa-sort opacity-40"
                          )}
                        />
                        <span>Status</span>
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-4 cursor-pointer hover:text-foreground select-none"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center gap-1.5">
                        <i
                          className={cn(
                            "fa-solid text-[10px]",
                            sortField === "date"
                              ? sortOrder === "asc"
                                ? "fa-sort-up text-primary"
                                : "fa-sort-down text-primary"
                              : "fa-sort opacity-40"
                          )}
                        />
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
                        <i className="fa-solid fa-spinner fa-spin mr-2 text-primary text-base" />
                        Loading employee registry...
                      </td>
                    </tr>
                  ) : paginatedAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <i className="fa-solid fa-user-slash text-2xl opacity-40" />
                          <p className="font-semibold text-sm">No employees match your search</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSearchQuery("");
                              setStatusFilter("All");
                              setDeptFilter("All");
                            }}
                            className="mt-1 text-xs cursor-pointer"
                          >
                            Reset Filters
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAllocations.map((emp, idx) => {
                      const initials = emp.employeeName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      const isSelected = selectedIds.includes(emp._id);

                      // Status dot badge
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

                          {/* Employee Avatar + Full Name + Email */}
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
                                <p
                                  onClick={() => onEditAllocation(emp)}
                                  className="font-bold text-foreground hover:text-primary cursor-pointer transition-colors"
                                >
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
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditAllocation(emp)}
                                className="h-8 px-2.5 rounded-lg hover:bg-muted font-semibold text-xs gap-1.5 cursor-pointer text-primary"
                                title="Edit Employee Allocation"
                              >
                                <i className="fa-solid fa-pen text-[10px]" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteAllocation(emp._id)}
                                className="h-8 px-2 rounded-lg hover:bg-muted text-destructive hover:text-destructive cursor-pointer"
                                title="Remove from registry"
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

              {/* Table Pagination Toolbar */}
              <div className="p-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                <p>
                  Showing {Math.min((currentPage - 1) * entriesPerPage + 1, filteredAndSortedAllocations.length)} to{" "}
                  {Math.min(currentPage * entriesPerPage, filteredAndSortedAllocations.length)} of{" "}
                  {filteredAndSortedAllocations.length} entries
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 rounded-lg text-xs cursor-pointer disabled:opacity-40"
                  >
                    Previous
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Button
                      key={pageNum}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg text-xs font-bold cursor-pointer",
                        currentPage === pageNum
                          ? "bg-primary text-primary-foreground"
                          : "bg-transparent text-foreground hover:bg-muted border border-border"
                      )}
                    >
                      {pageNum}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="h-8 px-3 rounded-lg text-xs cursor-pointer disabled:opacity-40"
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
                <span className="text-base font-bold text-foreground">
                  {monthNames[currentMonth]} {currentYear}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer text-xs transition-colors"
                  title="Previous Month"
                >
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground cursor-pointer text-xs transition-colors"
                  title="Next Month"
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
                {calendarGrid.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (d.isCurrMonth) {
                        setSelectedCalendarDay(d.day);
                      }
                    }}
                    className={cn(
                      "h-8 flex items-center justify-center rounded-full font-medium transition-all",
                      !d.isCurrMonth && "text-muted-foreground/30 pointer-events-none",
                      d.isCurrMonth && !d.isSelected && "text-foreground hover:bg-muted/60 cursor-pointer",
                      d.isSelected &&
                        "bg-purple-600 text-white font-bold shadow-xs cursor-pointer scale-105"
                    )}
                  >
                    {d.day}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ── Widget 2: Schedule / Upcoming Candidate Meetings ── */}
          <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Schedule</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold">
                    {meetings.length} Events
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {monthNames[currentMonth]} {selectedCalendarDay}, {currentYear}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddMeetingModal(true)}
                className="h-8 px-2.5 gap-1.5 text-xs font-semibold rounded-lg cursor-pointer hover:bg-muted"
              >
                <i className="fa-solid fa-plus text-[10px]" />
                <span>Add</span>
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              {meetings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No upcoming meetings scheduled.
                </div>
              ) : (
                meetings.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors border border-border/30 bg-muted/10 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-xs",
                          item.avatarColor
                        )}
                      >
                        {item.avatarInitials}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                        <div className="flex items-center gap-2.5 mt-0.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <i className="fa-regular fa-clock text-[9px]" />
                            <span>{item.time}</span>
                          </span>
                          <span className="text-foreground/70 font-medium truncate">• {item.name}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive text-xs p-1 transition-opacity cursor-pointer"
                      title="Delete event"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                ))
              )}

              <Button
                variant="outline"
                onClick={() => setShowScheduleModal(true)}
                className="w-full h-9 rounded-xl text-xs font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 cursor-pointer transition-colors"
              >
                View All ({meetings.length})
              </Button>
            </CardContent>
          </Card>

          {/* ── Widget 3: Employee Paid Leave / Utilization Donut Gauge ── */}
          <Card className="border border-border/70 shadow-xs rounded-2xl overflow-hidden bg-card">
            <CardHeader className="p-5 pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground">
                Employee Paid Leave
              </CardTitle>
              <div className="text-xs text-muted-foreground font-semibold">
                {leaveCount} on leave
              </div>
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
                  {/* Active Dynamic Purple Arc */}
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth="22"
                    strokeDasharray={2 * Math.PI * 60}
                    strokeDashoffset={2 * Math.PI * 60 * (1 - (avgUtilization || 75) / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>

                {/* Center Content */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">
                    {avgUtilization || 75}%
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                    of Employee
                  </span>
                </div>
              </div>

              {/* Status Breakdown Pills */}
              <div className="grid grid-cols-2 gap-2 w-full mt-2 pt-3 border-t border-border/40 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Deployed:</span>
                  <span className="font-bold text-foreground">{deployedCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground">Bench:</span>
                  <span className="font-bold text-foreground">{benchCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-muted-foreground">On Leave:</span>
                  <span className="font-bold text-foreground">{leaveCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">Total Staff:</span>
                  <span className="font-bold text-foreground">{totalEmployees}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Add Meeting Schedule Modal ── */}
      {showAddMeetingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <i className="fa-solid fa-calendar-plus text-primary" />
                Schedule Meeting / Interview
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMeetingModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleAddMeeting} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1">Meeting Title</label>
                <Input
                  required
                  placeholder="e.g. Meeting with Candidate #4"
                  value={newMeetingForm.title}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, title: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">Participant / Candidate Name</label>
                <Input
                  required
                  placeholder="e.g. Alex Henderson"
                  value={newMeetingForm.name}
                  onChange={(e) => setNewMeetingForm({ ...newMeetingForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">Time Slot</label>
                  <Input
                    placeholder="e.g. 15.00 - 16.00"
                    value={newMeetingForm.time}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, time: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground block mb-1">Category</label>
                  <select
                    value={newMeetingForm.type}
                    onChange={(e) =>
                      setNewMeetingForm({
                        ...newMeetingForm,
                        type: e.target.value as ScheduleMeeting["type"],
                      })
                    }
                    className="w-full h-9 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none"
                  >
                    <option value="Candidate Interview">Candidate Interview</option>
                    <option value="Performance Review">Performance Review</option>
                    <option value="Team Sync">Team Sync</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMeetingModal(false)}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold cursor-pointer"
                >
                  Save Meeting
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View All Schedule Meetings Modal ── */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <i className="fa-regular fa-calendar-check text-purple-600" />
                  Upcoming HR Schedule &amp; Meetings
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total {meetings.length} scheduled event(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
              {meetings.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-border/40 bg-muted/15 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                        item.avatarColor
                      )}
                    >
                      {item.avatarInitials}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">{item.name} • {item.type}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <i className="fa-regular fa-calendar" /> {item.date}
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <i className="fa-regular fa-clock" /> {item.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMeeting(item.id)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                    title="Remove Meeting"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between shrink-0">
              <Button
                size="sm"
                onClick={() => {
                  setShowScheduleModal(false);
                  setShowAddMeetingModal(true);
                }}
                className="gap-1.5 text-xs font-semibold cursor-pointer bg-primary text-primary-foreground"
              >
                <i className="fa-solid fa-plus text-[10px]" />
                <span>Add New Event</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleModal(false)}
                className="text-xs cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
