"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { cn, formatISTDate, formatISTTime, getISTDateString } from "@/lib/utils";
import { generateAndDownloadPDF } from "@/lib/pdfReportGenerator";

type ReportTab = "tasks" | "timesheets" | "shifts" | "summary";
type DatePreset = "all" | "today" | "this_week" | "this_month" | "last_30_days" | "custom";

function ReportsPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { isAdmin, isOPS } = usePermissions();

  const [activeTab, setActiveTab] = useTabPersistence<ReportTab>(
    "reports_active_tab",
    "tasks",
    ["tasks", "timesheets", "shifts", "summary"]
  );

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Global Date Filter State
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // PDF Customizer Modal State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfIncludeKpis, setPdfIncludeKpis] = useState(true);
  const [pdfIncludeTasks, setPdfIncludeTasks] = useState(true);
  const [pdfIncludeTimesheets, setPdfIncludeTimesheets] = useState(true);
  const [pdfIncludeShifts, setPdfIncludeShifts] = useState(true);
  const [pdfIncludeSignoff, setPdfIncludeSignoff] = useState(true);
  const [pdfCustomNotes, setPdfCustomNotes] = useState("");

  // Data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  // Filter states
  const [employeeFilter, setEmployeeFilter] = useState("All");

  // Task filters
  const [taskSearch, setTaskSearch] = useState("");
  const [taskProjectFilter, setTaskProjectFilter] = useState("All");
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("All");

  // Timesheet filters
  const [timesheetSearch, setTimesheetSearch] = useState("");
  const [timesheetProjectFilter, setTimesheetProjectFilter] = useState("All");
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState("All");
  const [timesheetBillableFilter, setTimesheetBillableFilter] = useState("All");

  // Shift filters
  const [shiftSearch, setShiftSearch] = useState("");
  const [shiftStatusFilter, setShiftStatusFilter] = useState("All");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Helper to accurately compute regular, overtime, and total shift hours
  const getLogHours = (log: any) => {
    let reg = log.regularHours || 0;
    let ot = log.overtimeHours || 0;
    if ((reg === 0 && ot === 0 && log.clockIn) || !log.clockOut || log.clockOut === "Active") {
      if (log.clockIn) {
        const startMs = new Date(log.clockIn).getTime();
        const endMs = log.clockOut && log.clockOut !== "Active" ? new Date(log.clockOut).getTime() : Date.now();
        const diffHours = Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
        reg = Math.min(diffHours, 8.0);
        ot = Math.max(0, diffHours - 8.0);
      }
    }
    return { reg, ot, total: reg + ot };
  };

  const formatDuration = (hrsNum: number) => {
    const totalMins = Math.round(hrsNum * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h === 0) return `${m} mins`;
    if (m === 0) return `${h} ${h === 1 ? "hr" : "hrs"}`;
    return `${h} ${h === 1 ? "hr" : "hrs"} ${m} mins`;
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Set date preset ranges
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = getISTDateString(now);

    if (preset === "all") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      setStartDate(getISTDateString(monday));
      setEndDate(todayStr);
    } else if (preset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(getISTDateString(firstDay));
      setEndDate(todayStr);
    } else if (preset === "last_30_days") {
      const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(getISTDateString(past30));
      setEndDate(todayStr);
    }
  };

  // Helper date checker
  const isWithinDateRange = (itemDateStr?: string | Date) => {
    if (!startDate && !endDate) return true;
    if (!itemDateStr) return false;
    const itemDate = getISTDateString(itemDateStr);
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  };

  // Fetch report data
  useEffect(() => {
    if (!mounted) return;
    async function loadReportData() {
      setLoading(true);
      try {
        const isElevated = isAdmin || isOPS || currentUser?.role === "Admin" || currentUser?.role === "OPS" || currentUser?.role === "Manager";
        const attUrl = isElevated ? "/api/attendance?limit=all&allUsers=true" : "/api/attendance?limit=all";
        const [taskRes, tsRes, attRes, projRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/timesheets"),
          fetch(attUrl),
          fetch("/api/projects"),
        ]);

        if (taskRes.ok) {
          const tData = await taskRes.json();
          setTasks(tData.tasks || []);
        }
        if (tsRes.ok) {
          const tsData = await tsRes.json();
          setTimesheets(tsData.entries || []);
        }
        if (attRes.ok) {
          const aData = await attRes.json();
          setAttendanceLogs(aData.history || (aData.attendance ? [aData.attendance] : []));
        }
        if (projRes.ok) {
          const pData = await projRes.json();
          setProjects(pData.projects || []);
        }
      } catch (err) {
        console.error("Failed to load report data:", err);
        showToast("Error loading report records", "error");
      } finally {
        setLoading(false);
      }
    }
    loadReportData();
  }, [mounted, isAdmin, isOPS, currentUser]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = taskSearch.toLowerCase();
      const projName = t.projectId?.name || t.project || "General";
      const matchSearch =
        !q ||
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        projName.toLowerCase().includes(q);
      const matchProject = taskProjectFilter === "All" || projName === taskProjectFilter;
      const matchStatus = taskStatusFilter === "All" || t.status === taskStatusFilter;
      const matchPriority = taskPriorityFilter === "All" || t.priority === taskPriorityFilter;
      const matchDate = !startDate && !endDate ? true : isWithinDateRange(t.dueDate || t.createdAt);
      return matchSearch && matchProject && matchStatus && matchPriority && matchDate;
    });
  }, [tasks, taskSearch, taskProjectFilter, taskStatusFilter, taskPriorityFilter, startDate, endDate]);

  // Filtered Timesheets
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((e) => {
      const q = timesheetSearch.toLowerCase();
      const projName = e.project || "General";
      const taskName = e.taskName || "";
      const comment = e.comment || "";
      const matchSearch =
        !q ||
        projName.toLowerCase().includes(q) ||
        taskName.toLowerCase().includes(q) ||
        comment.toLowerCase().includes(q);
      const matchProject = timesheetProjectFilter === "All" || projName === timesheetProjectFilter;
      const matchStatus = timesheetStatusFilter === "All" || e.status === timesheetStatusFilter;
      const matchBillable =
        timesheetBillableFilter === "All" ||
        (timesheetBillableFilter === "Billable" && e.isBillable) ||
        (timesheetBillableFilter === "Non-Billable" && !e.isBillable);
      const matchDate = isWithinDateRange(e.date || e.createdAt);
      return matchSearch && matchProject && matchStatus && matchBillable && matchDate;
    });
  }, [timesheets, timesheetSearch, timesheetProjectFilter, timesheetStatusFilter, timesheetBillableFilter, startDate, endDate]);

  // Filtered Shift Logs
  const filteredShiftLogs = useMemo(() => {
    return attendanceLogs.filter((log) => {
      const q = shiftSearch.toLowerCase();
      const empObj = typeof log.userId === "object" ? log.userId : null;
      const empId = empObj?._id || log.userId;
      const empName = empObj?.name || currentUser?.name || "Employee";
      const shiftName = empObj?.shiftName || currentUser?.shiftName || "Standard Day Shift";
      const dateStr = log.date ? formatISTDate(log.date) : "";

      const matchEmployee = employeeFilter === "All" || String(empId) === employeeFilter;
      const matchSearch =
        !q ||
        empName.toLowerCase().includes(q) ||
        shiftName.toLowerCase().includes(q) ||
        dateStr.toLowerCase().includes(q);
      const matchStatus =
        shiftStatusFilter === "All" ||
        (log.status || "Present") === shiftStatusFilter ||
        (shiftStatusFilter === "Active" && log.clockIn && !log.clockOut);
      const matchDate = isWithinDateRange(log.date || log.clockIn);
      return matchEmployee && matchSearch && matchStatus && matchDate;
    });
  }, [attendanceLogs, shiftSearch, shiftStatusFilter, employeeFilter, startDate, endDate, currentUser]);

  // Export 1: Detailed Tasks CSV
  const exportTasksCSV = () => {
    if (filteredTasks.length === 0) {
      showToast("No tasks available to export", "error");
      return;
    }
    const headers = [
      "Task ID",
      "Title",
      "Project",
      "Priority",
      "Status",
      "Assignee",
      "Due Date (IST)",
      "Estimated Hours",
      "Subtasks Progress",
      "Description",
      "Created At (IST)"
    ];
    const rows = filteredTasks.map((t) => {
      const subtasksTotal = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
      const subtasksDone = Array.isArray(t.subtasks) ? t.subtasks.filter((s: any) => s.completed).length : 0;
      const subtaskStr = subtasksTotal > 0 ? `${subtasksDone}/${subtasksTotal} Completed` : "No subtasks";
      const descClean = (t.description || "").replace(/[\r\n]+/g, " ").trim();
      const projName = t.projectId?.name || t.project || "General";
      return [
        `"${t._id || ""}"`,
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${projName.replace(/"/g, '""')}"`,
        `"${t.priority || "Medium"}"`,
        `"${t.status || "To Do"}"`,
        `"${t.assignee?.name || currentUser?.name || "Unassigned"}"`,
        `"${t.dueDate ? formatISTDate(t.dueDate) : "No due date"}"`,
        t.estimatedHours || 0,
        `"${subtaskStr}"`,
        `"${descClean.replace(/"/g, '""')}"`,
        `"${t.createdAt ? formatISTDate(t.createdAt) : ""}"`
      ].join(",");
    });
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Tasks_Report_${getISTDateString()}_IST.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Tasks report CSV exported successfully!", "success");
  };

  // Export 2: Detailed Timesheets CSV
  const exportTimesheetsCSV = () => {
    if (filteredTimesheets.length === 0) {
      showToast("No timesheets to export", "error");
      return;
    }
    const headers = [
      "Date (IST)",
      "Project",
      "Task Deliverable",
      "Hours Logged",
      "Billable Status",
      "Approval Status",
      "Notes / Comments"
    ];
    const rows = filteredTimesheets.map((e) => [
      `"${e.date ? formatISTDate(e.date) : ""}"`,
      `"${(e.project || "General").replace(/"/g, '""')}"`,
      `"${(e.taskName || "UI/UX Development").replace(/"/g, '""')}"`,
      e.hours || 0,
      `"${e.isBillable ? "Billable" : "Non-Billable"}"`,
      `"${e.status || "Draft"}"`,
      `"${(e.comment || "").replace(/[\r\n]+/g, " ").replace(/"/g, '""').trim()}"`
    ].join(","));
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Timesheets_Report_${getISTDateString()}_IST.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Timesheet report CSV exported successfully!", "success");
  };

  // Export 3: Shift Logs CSV
  const exportShiftLogsCSV = () => {
    if (filteredShiftLogs.length === 0) {
      showToast("No shift logs to export", "error");
      return;
    }
    const headers = [
      "Date (IST)",
      "Employee Name",
      "Shift Name",
      "Shift Timing",
      "Clock In (IST)",
      "Clock Out (IST)",
      "Duration (Hours)",
      "Regular Hours",
      "Overtime Hours",
      "Attendance Status"
    ];
    const rows = filteredShiftLogs.map((log) => {
      const empObj = typeof log.userId === "object" ? log.userId : null;
      const empName = empObj?.name || currentUser?.name || "Employee";
      const shiftName = empObj?.shiftName || currentUser?.shiftName || "Standard Day Shift";
      const shiftTime = empObj?.shiftTime || currentUser?.shiftTime || "09:00 AM - 05:00 PM";
      const dateStr = log.date ? formatISTDate(log.date) : "";
      const clockInStr = log.clockIn ? formatISTTime(log.clockIn) : "--";
      const clockOutStr = log.clockOut && log.clockOut !== "Active" ? formatISTTime(log.clockOut) : (log.clockIn ? "Active Shift" : "--");

      const { reg, ot, total } = getLogHours(log);
      const status = log.status || (log.clockIn && !log.clockOut ? "Active" : "Present");

      return [
        `"${dateStr}"`,
        `"${empName}"`,
        `"${shiftName}"`,
        `"${shiftTime}"`,
        `"${clockInStr}"`,
        `"${clockOutStr}"`,
        total.toFixed(2),
        reg.toFixed(2),
        ot.toFixed(2),
        `"${status}"`
      ].join(",");
    });
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Shift_Attendance_Logs_${getISTDateString()}_IST.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Shift logs CSV exported successfully!", "success");
  };

  // KPIs
  const totalTasksCount = filteredTasks.length;
  const completedTasksCount = filteredTasks.filter((t) => t.status === "Done").length;
  const inProgressTasksCount = filteredTasks.filter((t) => t.status === "In Progress").length;
  const totalTimesheetHours = filteredTimesheets.reduce((acc, t) => acc + (t.hours || 0), 0);
  const billableHours = filteredTimesheets.filter((t) => t.isBillable).reduce((acc, t) => acc + (t.hours || 0), 0);

  // Export 4: Unified Comprehensive PDF Report Generator (Direct File Download)
  const generateUnifiedPDFReport = () => {
    try {
      generateAndDownloadPDF({
        user: {
          name: currentUser?.name,
          role: currentUser?.role,
          department: currentUser?.department,
          shiftName: currentUser?.shiftName,
          shiftTime: currentUser?.shiftTime,
          tenantName: currentUser?.tenantId?.name,
        },
        tasks: filteredTasks,
        timesheets: filteredTimesheets,
        shiftLogs: filteredShiftLogs,
        includeKpis: pdfIncludeKpis,
        includeTasks: pdfIncludeTasks,
        includeTimesheets: pdfIncludeTimesheets,
        includeShifts: pdfIncludeShifts,
        includeSignoff: pdfIncludeSignoff,
        customNotes: pdfCustomNotes,
        startDate,
        endDate,
      });
      setShowPdfModal(false);
      showToast("Downloaded Comprehensive PDF Report successfully!", "success");
    } catch (err) {
      console.error("Failed to generate PDF download:", err);
      showToast("Failed to download PDF report.", "error");
    }
  };

  if (!mounted || authLoading) {
    return <Preloader label="Loading Workspace Reports..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
            toast.type === "success"
              ? "bg-emerald-500/90 text-white border-emerald-600"
              : "bg-destructive/90 text-white border-destructive"
          )}
        >
          {toast.type === "success" ? <i className="fa-solid fa-circle-check text-base" /> : <i className="fa-solid fa-circle-exclamation text-base" />}
          {toast.message}
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent p-6 rounded-2xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 tracking-wider uppercase mb-1">
            <i className="fa-solid fa-file-lines text-emerald-500 text-sm" /> Workspace Report Center
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Reports &amp; Data Exports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and export detailed CSV reports and unified print-ready PDF records across tasks, hours, and attendance.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Combine All in One PDF Customizer Button */}
          <Button
            onClick={() => setShowPdfModal(true)}
            className="gap-2 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
          >
            <i className="fa-solid fa-file-pdf text-sm" /> Combine All in One PDF
          </Button>

          {activeTab === "tasks" && (
            <Button color="primary" variant="outline" size="sm" onClick={exportTasksCSV} className="gap-2 font-semibold shadow-xs">
              <i className="fa-solid fa-file-arrow-down text-xs" /> Export Tasks (CSV)
            </Button>
          )}
          {activeTab === "timesheets" && (
            <Button color="primary" variant="outline" size="sm" onClick={exportTimesheetsCSV} className="gap-2 font-semibold shadow-xs">
              <i className="fa-solid fa-file-arrow-down text-xs" /> Export Timesheet (CSV)
            </Button>
          )}
          {activeTab === "shifts" && (
            <Button color="primary" variant="outline" size="sm" onClick={exportShiftLogsCSV} className="gap-2 font-semibold shadow-xs">
              <i className="fa-solid fa-file-arrow-down text-xs" /> Export Shift Logs (CSV)
            </Button>
          )}
        </div>
      </div>

      {/* Global Date Filter Controls Strip */}
      <Card className="border border-border/80 bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <i className="fa-solid fa-calendar-check text-primary text-xs" /> Date Range:
            </span>
            {[
              { key: "all", label: "All Records" },
              { key: "today", label: "Today" },
              { key: "this_week", label: "This Week" },
              { key: "this_month", label: "This Month" },
              { key: "last_30_days", label: "Last 30 Days" },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => handleDatePresetChange(p.key as DatePreset)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer",
                  datePreset === p.key
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>From:</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setStartDate(e.target.value);
                }}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>To:</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setDatePreset("custom");
                  setEndDate(e.target.value);
                }}
                className="h-8 text-xs w-36"
              />
            </div>
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDatePresetChange("all")}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Clear date filter"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Project Tasks</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{totalTasksCount}</p>
              <p className="text-[10px] text-amber-500 font-medium">{completedTasksCount} Completed ({totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0}%)</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <i className="fa-solid fa-list-check text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Logged Hours</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{totalTimesheetHours} Hrs</p>
              <p className="text-[10px] text-primary font-medium">{billableHours} Billable ({totalTimesheetHours > 0 ? Math.round((billableHours / totalTimesheetHours) * 100) : 100}%)</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <i className="fa-solid fa-clock text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Shift Logs</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{filteredShiftLogs.length}</p>
              <p className="text-[10px] text-emerald-500 font-medium">Punch &amp; attendance history</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="fa-solid fa-clock-rotate-left text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{projects.length || 1}</p>
              <p className="text-[10px] text-sky-500 font-medium">Deliverables &amp; modules</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <i className="fa-solid fa-folder-tree text-lg" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "tasks"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-list-check text-sm" /> Project Tasks Report ({filteredTasks.length})
        </button>

        <button
          onClick={() => setActiveTab("timesheets")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "timesheets"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-calendar-days text-sm" /> Timesheet Report ({filteredTimesheets.length})
        </button>

        <button
          onClick={() => setActiveTab("shifts")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "shifts"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-clock-rotate-left text-sm" /> Shift &amp; Attendance Logs ({filteredShiftLogs.length})
        </button>

        <button
          onClick={() => setActiveTab("summary")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "summary"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-chart-pie text-sm" /> Work Summary
        </button>
      </div>

      {/* Tab 1: Project Tasks Report */}
      {activeTab === "tasks" && (
        <Card className="border border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-list-check text-amber-500" /> Detailed Project Tasks Report
              </CardTitle>
              <CardDescription>
                Full list of assigned tasks with priority, status, subtasks progress, due dates, and descriptions.
              </CardDescription>
            </div>
            <Button color="primary" size="sm" onClick={exportTasksCSV} className="gap-2 font-semibold">
              <i className="fa-solid fa-file-csv text-xs" /> Download CSV ({filteredTasks.length})
            </Button>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                <Input
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  placeholder="Search task title, desc..."
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <select
                value={taskProjectFilter}
                onChange={(e) => setTaskProjectFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="All">All Projects</option>
                {Array.from(new Set(tasks.map((t) => t.projectId?.name || t.project || "General"))).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="In Review">In Review</option>
                <option value="Done">Done</option>
                <option value="Blocked">Blocked</option>
              </select>

              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Task Report Table */}
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-semibold">
                  <tr>
                    <th className="py-3 px-4">Task Details</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Subtasks</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Est. Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        <i className="fa-solid fa-spinner fa-spin text-lg mb-2 block" /> Loading tasks report...
                      </td>
                    </tr>
                  ) : filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No tasks match the selected filters or date range.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => {
                      const subtasksTotal = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
                      const subtasksDone = Array.isArray(t.subtasks) ? t.subtasks.filter((s: any) => s.completed).length : 0;
                      const isOverdue = t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== "Done";
                      return (
                        <tr key={t._id} className="hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-4 min-w-[220px]">
                            <p className="font-bold text-foreground text-xs">{t.title}</p>
                            {t.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.description}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                            {t.projectId?.name || t.project || "General"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge
                              color={t.priority === "Urgent" || t.priority === "High" ? "destructive" : t.priority === "Medium" ? "warning" : "secondary"}
                              variant="soft"
                              className="text-[10px]"
                            >
                              {t.priority || "Medium"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge
                              color={t.status === "Done" ? "success" : t.status === "In Progress" ? "primary" : "secondary"}
                              className="text-[10px]"
                            >
                              {t.status || "To Do"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                            {subtasksTotal > 0 ? `${subtasksDone}/${subtasksTotal} Done` : "--"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={cn("text-xs", isOverdue ? "text-rose-500 font-semibold" : "text-muted-foreground")}>
                              {t.dueDate ? formatISTDate(t.dueDate) : "--"}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-foreground whitespace-nowrap">
                            {t.estimatedHours ? `${t.estimatedHours}h` : "--"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Timesheet Report */}
      {activeTab === "timesheets" && (
        <Card className="border border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-calendar-days text-primary" /> Timesheets &amp; Hours Report
              </CardTitle>
              <CardDescription>
                Detailed breakdown of logged project hours, task descriptions, billable classifications, and approval statuses.
              </CardDescription>
            </div>
            <Button color="primary" size="sm" onClick={exportTimesheetsCSV} className="gap-2 font-semibold">
              <i className="fa-solid fa-file-csv text-xs" /> Download CSV ({filteredTimesheets.length})
            </Button>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                <Input
                  value={timesheetSearch}
                  onChange={(e) => setTimesheetSearch(e.target.value)}
                  placeholder="Search project, notes..."
                  className="pl-8 h-9 text-xs"
                />
              </div>

              <select
                value={timesheetProjectFilter}
                onChange={(e) => setTimesheetProjectFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="All">All Projects</option>
                {Array.from(new Set(timesheets.map((e) => e.project || "General"))).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              <select
                value={timesheetStatusFilter}
                onChange={(e) => setTimesheetStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Draft">Draft</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={timesheetBillableFilter}
                onChange={(e) => setTimesheetBillableFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="All">All Classifications</option>
                <option value="Billable">Billable Only</option>
                <option value="Non-Billable">Non-Billable</option>
              </select>
            </div>

            {/* Timesheets Report Table */}
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Project</th>
                    <th className="py-3 px-4">Task Deliverable</th>
                    <th className="py-3 px-4">Hours</th>
                    <th className="py-3 px-4">Billable</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        <i className="fa-solid fa-spinner fa-spin text-lg mb-2 block" /> Loading timesheet records...
                      </td>
                    </tr>
                  ) : filteredTimesheets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No timesheet records match the selected filters or date range.
                      </td>
                    </tr>
                  ) : (
                    filteredTimesheets.map((e) => (
                      <tr key={e._id} className="hover:bg-accent/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                          {e.date ? formatISTDate(e.date) : "--"}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                          {e.project || "General"}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {e.taskName || "General Development"}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-primary whitespace-nowrap">
                          {e.hours || 0}h
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge color={e.isBillable ? "success" : "secondary"} variant="soft" className="text-[10px]">
                            {e.isBillable ? "Billable" : "Non-Billable"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            color={e.status === "Approved" ? "success" : e.status === "Pending" ? "warning" : "secondary"}
                            className="text-[10px]"
                          >
                            {e.status || "Draft"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground line-clamp-1 max-w-[200px]">
                          {e.comment || "--"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Shift Attendance Logs Report */}
      {activeTab === "shifts" && (
        <Card className="border border-border">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-emerald-500" /> Shift &amp; Attendance Logs Report
              </CardTitle>
              <CardDescription>
                Detailed punch times, regular &amp; overtime hours calculation, shift timings, and daily status history.
              </CardDescription>
            </div>
            <Button color="primary" size="sm" onClick={exportShiftLogsCSV} className="gap-2 font-semibold cursor-pointer">
              <i className="fa-solid fa-file-csv text-xs" /> Download CSV ({filteredShiftLogs.length})
            </Button>
          </CardHeader>

          <CardContent className="p-6 space-y-5">
            {/* All-Time / Period Shift Stats Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-accent/20 border border-border/60 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Shifts Logged</span>
                <p className="text-xl font-extrabold text-foreground">{filteredShiftLogs.length} Days</p>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Total Worked</span>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatDuration(filteredShiftLogs.reduce((acc, l) => acc + getLogHours(l).total, 0))}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">Total Overtime</span>
                <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                  +{formatDuration(filteredShiftLogs.reduce((acc, l) => acc + getLogHours(l).ot, 0))}
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                <Input
                  value={shiftSearch}
                  onChange={(e) => setShiftSearch(e.target.value)}
                  placeholder="Search shift or employee..."
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {(isAdmin || isOPS || currentUser?.role === "Manager") && (
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="All">All Employees ({attendanceLogs.length} records)</option>
                  {Array.from(
                    new Map(
                      attendanceLogs
                        .map((l) => {
                          const u = typeof l.userId === "object" ? l.userId : null;
                          return u ? [String(u._id), u] : null;
                        })
                        .filter(Boolean) as [string, any][]
                    ).values()
                  ).map((emp) => (
                    <option key={emp._id} value={String(emp._id)}>
                      {emp.name} ({emp.role || "Employee"})
                    </option>
                  ))}
                </select>
              )}

              <select
                value={shiftStatusFilter}
                onChange={(e) => setShiftStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Active">Active Shift</option>
                <option value="Late">Late</option>
                <option value="Half-Day">Half-Day</option>
              </select>
            </div>

            {/* Shift Logs Table */}
            <div className="rounded-xl border border-border overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Shift Schedule</th>
                    <th className="py-3 px-4">Clock In (IST)</th>
                    <th className="py-3 px-4">Clock Out (IST)</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Regular Hrs</th>
                    <th className="py-3 px-4">Overtime Hrs</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        <i className="fa-solid fa-spinner fa-spin text-lg mb-2 block" /> Loading shift logs...
                      </td>
                    </tr>
                  ) : filteredShiftLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        No shift logs match the selected filters or date range.
                      </td>
                    </tr>
                  ) : (
                    filteredShiftLogs.map((log) => {
                      const empObj = typeof log.userId === "object" ? log.userId : null;
                      const empName = empObj?.name || currentUser?.name || "Employee";
                      const shiftName = empObj?.shiftName || currentUser?.shiftName || "Standard Day Shift";
                      const shiftTime = empObj?.shiftTime || currentUser?.shiftTime || "09:00 AM - 05:00 PM";
                      const { reg, ot, total } = getLogHours(log);

                      return (
                        <tr key={log._id} className="hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-foreground whitespace-nowrap">
                            {log.date ? formatISTDate(log.date) : "--"}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                            {empName}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
                            {shiftName} <span className="block text-[10px] text-muted-foreground/70">{shiftTime}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-500 font-medium whitespace-nowrap">
                            {log.clockIn ? formatISTTime(log.clockIn) : "--"}
                          </td>
                          <td className="py-3 px-4 font-mono text-foreground font-medium whitespace-nowrap">
                            {log.clockOut && log.clockOut !== "Active" ? formatISTTime(log.clockOut) : (log.clockIn ? "🟢 Active" : "--")}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                            {total.toFixed(2)}h
                          </td>
                          <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                            {reg.toFixed(2)}h
                          </td>
                          <td className="py-3 px-4 font-mono text-amber-500 font-semibold whitespace-nowrap">
                            {ot > 0 ? `+${ot.toFixed(2)}h` : "0h"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge
                              color={log.status === "Present" || (!log.clockOut && log.clockIn) ? "success" : "warning"}
                              className="text-[10px]"
                            >
                              {log.status || (log.clockIn && !log.clockOut ? "Active" : "Present")}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Work Summary */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-chart-pie text-primary text-base" /> Task &amp; Deliverables Breakdown
              </CardTitle>
              <CardDescription>Status distribution across your assigned tasks</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {["Done", "In Progress", "To Do", "In Review", "Blocked"].map((st) => {
                const count = filteredTasks.filter((t) => (t.status || "To Do") === st).length;
                const pct = totalTasksCount > 0 ? Math.round((count / totalTasksCount) * 100) : 0;
                return (
                  <div key={st} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-foreground">{st}</span>
                      <span className="text-muted-foreground">{count} tasks ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          st === "Done" ? "bg-emerald-500" : st === "In Progress" ? "bg-primary" : st === "In Review" ? "bg-amber-500" : "bg-muted-foreground/40"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-hourglass-half text-emerald-500 text-base" /> Timesheet &amp; Utilization Summary
              </CardTitle>
              <CardDescription>Billable vs non-billable hours ratio</CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Billable Hours</p>
                  <p className="text-2xl font-bold text-emerald-500 font-mono mt-0.5">{billableHours}h</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total Logged Hours</p>
                  <p className="text-2xl font-bold text-foreground font-mono mt-0.5">{totalTimesheetHours}h</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Billable Ratio</span>
                  <span className="text-emerald-500 font-bold">
                    {totalTimesheetHours > 0 ? Math.round((billableHours / totalTimesheetHours) * 100) : 100}%
                  </span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${totalTimesheetHours > 0 ? (billableHours / totalTimesheetHours) * 100 : 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PDF Customization & Export Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <i className="fa-solid fa-file-pdf text-sm" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Customize Unified PDF Report</h3>
                  <p className="text-xs text-muted-foreground">Choose sections to include in your combined export</p>
                </div>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-bold text-foreground uppercase tracking-wider text-[10px]">Report Sections</p>
              
              <label className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent/40 cursor-pointer">
                <span className="flex items-center gap-2 text-foreground font-medium">
                  <i className="fa-solid fa-gauge-high text-primary" /> Executive KPI Overview Cards
                </span>
                <input
                  type="checkbox"
                  checked={pdfIncludeKpis}
                  onChange={(e) => setPdfIncludeKpis(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent/40 cursor-pointer">
                <span className="flex items-center gap-2 text-foreground font-medium">
                  <i className="fa-solid fa-list-check text-amber-500" /> Detailed Project Tasks &amp; Subtasks ({filteredTasks.length})
                </span>
                <input
                  type="checkbox"
                  checked={pdfIncludeTasks}
                  onChange={(e) => setPdfIncludeTasks(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent/40 cursor-pointer">
                <span className="flex items-center gap-2 text-foreground font-medium">
                  <i className="fa-solid fa-calendar-days text-primary" /> Timesheets &amp; Logged Hours ({filteredTimesheets.length})
                </span>
                <input
                  type="checkbox"
                  checked={pdfIncludeTimesheets}
                  onChange={(e) => setPdfIncludeTimesheets(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent/40 cursor-pointer">
                <span className="flex items-center gap-2 text-foreground font-medium">
                  <i className="fa-solid fa-clock-rotate-left text-emerald-500" /> Shift Attendance &amp; Punch History ({filteredShiftLogs.length})
                </span>
                <input
                  type="checkbox"
                  checked={pdfIncludeShifts}
                  onChange={(e) => setPdfIncludeShifts(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-border hover:bg-accent/40 cursor-pointer">
                <span className="flex items-center gap-2 text-foreground font-medium">
                  <i className="fa-solid fa-signature text-sky-500" /> Employee &amp; Manager Sign-off Verification Block
                </span>
                <input
                  type="checkbox"
                  checked={pdfIncludeSignoff}
                  onChange={(e) => setPdfIncludeSignoff(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4"
                />
              </label>

              <div className="pt-2 space-y-1">
                <label className="text-[11px] font-semibold text-foreground">Custom Notes / Remarks (Optional)</label>
                <textarea
                  rows={2}
                  value={pdfCustomNotes}
                  onChange={(e) => setPdfCustomNotes(e.target.value)}
                  placeholder="e.g. End-of-month client sign-off or performance review notes..."
                  className="w-full text-xs p-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border pt-4">
              <Button variant="outline" size="sm" onClick={() => setShowPdfModal(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                onClick={generateUnifiedPDFReport}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 cursor-pointer shadow-md"
              >
                <i className="fa-solid fa-file-arrow-down text-xs" /> Download PDF File
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<Preloader label="Loading Workspace Reports..." />}>
      <ReportsPageContent />
    </Suspense>
  );
}
