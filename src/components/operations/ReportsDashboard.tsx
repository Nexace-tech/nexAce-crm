"use client";

import React, { useState, useEffect, useMemo } from "react";
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

interface ReportsDashboardProps {
  embedded?: boolean;
}

export default function ReportsDashboard({ embedded = true }: ReportsDashboardProps) {
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
      "Punch In (IST)",
      "Punch Out (IST)",
      "Regular Hours",
      "Overtime Hours",
      "Total Shift Hours",
      "Shift Status",
      "Work Location"
    ];
    const rows = filteredShiftLogs.map((log) => {
      const empName = typeof log.userId === "object" ? log.userId?.name : currentUser?.name || "Employee";
      const shiftName = typeof log.userId === "object" ? log.userId?.shiftName : currentUser?.shiftName || "Day Shift";
      const inTime = log.clockIn ? formatISTTime(log.clockIn) : "-";
      const outTime = log.clockOut && log.clockOut !== "Active" ? formatISTTime(log.clockOut) : "Active";
      const hrs = getLogHours(log);
      const isOnline = log.clockIn && (!log.clockOut || log.clockOut === "Active");
      const statusLabel = isOnline ? "Active" : log.status || "Present";
      return [
        `"${log.date ? formatISTDate(log.date) : ""}"`,
        `"${(empName || "").replace(/"/g, '""')}"`,
        `"${(shiftName || "").replace(/"/g, '""')}"`,
        `"${inTime}"`,
        `"${outTime}"`,
        hrs.reg.toFixed(1),
        hrs.ot.toFixed(1),
        hrs.total.toFixed(1),
        `"${statusLabel}"`,
        `"${log.location || "Office"}"`
      ].join(",");
    });
    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Shift_Attendance_Report_${getISTDateString()}_IST.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Shift logs CSV exported successfully!", "success");
  };

  // Generate unified PDF report using our client-side pure jsPDF generator
  const generateUnifiedPDFReport = () => {
    try {
      showToast("Generating high-resolution report PDF...", "success");
      const dateRangeLabel =
        datePreset === "all"
          ? "All Recorded History"
          : `${startDate ? formatISTDate(startDate) : "Start"} to ${endDate ? formatISTDate(endDate) : "Current"}`;

      generateAndDownloadPDF({
        user: {
          name: currentUser?.name || "System Administrator",
          role: currentUser?.role || "Operations Admin",
          department: currentUser?.department || "Operations",
          shiftName: currentUser?.shiftName || "Standard Day Shift",
          tenantName: "NexAce CRM Workspace",
        },
        includeKpis: pdfIncludeKpis,
        includeTasks: pdfIncludeTasks,
        includeTimesheets: pdfIncludeTimesheets,
        includeShifts: pdfIncludeShifts,
        includeSignoff: pdfIncludeSignoff,
        customNotes: pdfCustomNotes,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tasks: filteredTasks.slice(0, 45).map((t) => ({
          title: t.title,
          project: t.projectId?.name || t.project || "General",
          priority: t.priority || "Medium",
          status: t.status || "To Do",
          assignee: t.assignee?.name || currentUser?.name || "Unassigned",
          dueDate: t.dueDate ? formatISTDate(t.dueDate) : "None",
        })),
        timesheets: filteredTimesheets.slice(0, 45).map((e) => ({
          date: e.date ? formatISTDate(e.date) : "-",
          project: e.project || "General",
          taskName: e.taskName || "General Task",
          hours: e.hours || 0,
          isBillable: !!e.isBillable,
          status: e.status || "Approved",
        })),
        shiftLogs: filteredShiftLogs.slice(0, 45).map((log) => {
          const empName = typeof log.userId === "object" ? log.userId?.name : currentUser?.name || "Employee";
          const hrs = getLogHours(log);
          return {
            date: log.date ? formatISTDate(log.date) : "-",
            employeeName: empName,
            punchIn: log.clockIn ? formatISTTime(log.clockIn) : "-",
            punchOut: log.clockOut && log.clockOut !== "Active" ? formatISTTime(log.clockOut) : "Active",
            totalHours: hrs.total,
            status: log.status || "Present",
          };
        }),
      });

      setShowPdfModal(false);
      showToast("PDF report generated and downloaded successfully!", "success");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      showToast(err.message || "Failed to generate PDF file", "error");
    }
  };

  // Aggregated KPI Stats
  const totalTasksCount = filteredTasks.length;
  const completedTasksCount = filteredTasks.filter((t) => t.status === "Done" || t.status === "Completed").length;
  const totalTimesheetHours = Math.round(filteredTimesheets.reduce((sum, e) => sum + (e.hours || 0), 0) * 10) / 10;
  const billableHours = Math.round(filteredTimesheets.filter((e) => e.isBillable).reduce((sum, e) => sum + (e.hours || 0), 0) * 10) / 10;

  // Project List for dropdowns
  const projectNames = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      const p = t.projectId?.name || t.project;
      if (p) set.add(p);
    });
    timesheets.forEach((e) => {
      if (e.project) set.add(e.project);
    });
    return Array.from(set);
  }, [tasks, timesheets]);

  // Distinct Employees for attendance filter
  const distinctEmployees = useMemo(() => {
    const map = new Map<string, string>();
    attendanceLogs.forEach((log) => {
      if (typeof log.userId === "object" && log.userId) {
        map.set(String(log.userId._id), log.userId.name || "Employee");
      } else if (log.userId) {
        map.set(String(log.userId), "Employee");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [attendanceLogs]);

  if (authLoading || (loading && !mounted)) {
    return <Preloader label="Loading Workspace Reports & Data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Toast popup */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-2",
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 backdrop-blur-md"
              : "bg-rose-950/90 text-rose-300 border border-rose-500/40 backdrop-blur-md"
          )}
        >
          {toast.type === "success" ? <i className="fa-solid fa-circle-check text-base" /> : <i className="fa-solid fa-circle-exclamation text-base" />}
          {toast.message}
        </div>
      )}

      {/* Header Banner - shown only when not embedded or explicitly requested */}
      {!embedded && (
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
            <Button
              onClick={() => setShowPdfModal(true)}
              className="gap-2 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
            >
              <i className="fa-solid fa-file-pdf text-sm" /> Combine All in One PDF
            </Button>
          </div>
        </div>
      )}

      {/* Global Date Filter Controls Strip */}
      <Card className="border border-border/80 bg-card/60 backdrop-blur-xs shadow-sm">
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

          <div className="flex items-center gap-3 flex-wrap">
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

            {/* Quick Export Action in the date strip */}
            <div className="flex items-center gap-2 pl-2 border-l border-border/80">
              <Button
                onClick={() => setShowPdfModal(true)}
                size="sm"
                className="gap-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer h-8"
              >
                <i className="fa-solid fa-file-pdf text-xs" /> PDF Export
              </Button>
              {activeTab === "tasks" && (
                <Button variant="outline" size="sm" onClick={exportTasksCSV} className="gap-1.5 text-xs font-semibold h-8 cursor-pointer">
                  <i className="fa-solid fa-file-csv text-xs text-primary" /> Tasks CSV
                </Button>
              )}
              {activeTab === "timesheets" && (
                <Button variant="outline" size="sm" onClick={exportTimesheetsCSV} className="gap-1.5 text-xs font-semibold h-8 cursor-pointer">
                  <i className="fa-solid fa-file-csv text-xs text-primary" /> Timesheets CSV
                </Button>
              )}
              {activeTab === "shifts" && (
                <Button variant="outline" size="sm" onClick={exportShiftLogsCSV} className="gap-1.5 text-xs font-semibold h-8 cursor-pointer">
                  <i className="fa-solid fa-file-csv text-xs text-primary" /> Shifts CSV
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
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

        <Card className="border-l-4 border-l-primary shadow-sm">
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

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Shift Logs</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{filteredShiftLogs.length}</p>
              <p className="text-[10px] text-emerald-500 font-medium">Punch &amp; attendance history</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <i className="fa-solid fa-user-clock text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Workplace Scope</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">{projects.length} Projects</p>
              <p className="text-[10px] text-sky-500 font-medium">{distinctEmployees.length} active logged users</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <i className="fa-solid fa-layer-group text-lg" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-border space-x-2 overflow-x-auto no-scrollbar">
        {[
          { key: "tasks", label: `Project Tasks Report (${totalTasksCount})`, icon: "fa-solid fa-list-check" },
          { key: "timesheets", label: `Timesheet Report (${filteredTimesheets.length})`, icon: "fa-solid fa-calendar-days" },
          { key: "shifts", label: `Shift & Attendance Logs (${filteredShiftLogs.length})`, icon: "fa-solid fa-user-clock" },
          { key: "summary", label: "Executive Workload Summary", icon: "fa-solid fa-chart-pie" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as ReportTab)}
            className={cn(
              "px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap",
              activeTab === t.key
                ? "border-primary text-primary bg-primary/10 rounded-t-md font-bold -mb-px"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            <i className={cn(t.icon, "text-xs")} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Tasks Report Table */}
      {activeTab === "tasks" && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-primary" /> Tasks Performance &amp; Deadlines
                </CardTitle>
                <CardDescription className="text-xs">
                  Review deliverable milestones, completion velocity, and team assignments.
                </CardDescription>
              </div>

              {/* Task Filter Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="h-8 text-xs w-44"
                />

                <select
                  value={taskProjectFilter}
                  onChange={(e) => setTaskProjectFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Projects</option>
                  {projectNames.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                <select
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Statuses</option>
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                  <option value="Completed">Completed</option>
                </select>

                <select
                  value={taskPriorityFilter}
                  onChange={(e) => setTaskPriorityFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Priorities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTasks.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <i className="fa-solid fa-clipboard-list text-3xl mb-2 opacity-40 block" />
                <p className="text-sm font-semibold">No tasks matched your filter criteria.</p>
                <p className="text-xs mt-1">Try broadening your date range or clearing filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Task Title</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Assignee</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Est. Hours</th>
                      <th className="px-4 py-3">Due Date (IST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTasks.map((t) => (
                      <tr key={t._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground max-w-xs truncate">
                          {t.title}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t.projectId?.name || t.project || "General"}
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium">
                          {t.assignee?.name || currentUser?.name || "Unassigned"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold border",
                              t.priority === "High"
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                : t.priority === "Low"
                                ? "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}
                          >
                            {t.priority || "Medium"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold border",
                              t.status === "Done" || t.status === "Completed"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : t.status === "In Progress"
                                ? "bg-sky-500/10 text-sky-600 border-sky-500/20"
                                : t.status === "Review"
                                ? "bg-violet-500/10 text-violet-600 border-violet-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {t.status || "To Do"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-foreground">
                          {t.estimatedHours ? `${t.estimatedHours} hrs` : "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {t.dueDate ? formatISTDate(t.dueDate) : "No due date"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Timesheet Report Table */}
      {activeTab === "timesheets" && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-clock text-primary" /> Timesheet Logs &amp; Billable Allocation
                </CardTitle>
                <CardDescription className="text-xs">
                  Granular breakdown of billable vs. non-billable client project hours.
                </CardDescription>
              </div>

              {/* Timesheet Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="Search timesheets..."
                  value={timesheetSearch}
                  onChange={(e) => setTimesheetSearch(e.target.value)}
                  className="h-8 text-xs w-44"
                />

                <select
                  value={timesheetProjectFilter}
                  onChange={(e) => setTimesheetProjectFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Projects</option>
                  {projectNames.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>

                <select
                  value={timesheetBillableFilter}
                  onChange={(e) => setTimesheetBillableFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Billing Types</option>
                  <option value="Billable">Billable Only</option>
                  <option value="Non-Billable">Non-Billable Only</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTimesheets.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <i className="fa-solid fa-clock-rotate-left text-3xl mb-2 opacity-40 block" />
                <p className="text-sm font-semibold">No timesheet records found for this period.</p>
                <p className="text-xs mt-1">Select another date range preset to view logged hours.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Date (IST)</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Task Deliverable</th>
                      <th className="px-4 py-3">Hours Logged</th>
                      <th className="px-4 py-3">Billing</th>
                      <th className="px-4 py-3">Approval</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTimesheets.map((e) => (
                      <tr key={e._id || e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {e.date ? formatISTDate(e.date) : "-"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {e.project || "General"}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {e.taskName || "General Task"}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-foreground">
                          {e.hours ? `${e.hours} hrs` : "0 hrs"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold border",
                              e.isBillable
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                            )}
                          >
                            {e.isBillable ? "Billable" : "Non-Billable"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold border",
                              e.status === "Approved"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : e.status === "Rejected"
                                ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}
                          >
                            {e.status || "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                          {e.comment || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Shift & Attendance Logs Table */}
      {activeTab === "shifts" && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/80 bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-user-clock text-primary" /> Shift Clock &amp; Biometric Records
                </CardTitle>
                <CardDescription className="text-xs">
                  Exact clock-in, clock-out, regular, and overtime hours breakdown (Indian Standard Time).
                </CardDescription>
              </div>

              {/* Shift Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  placeholder="Search by employee..."
                  value={shiftSearch}
                  onChange={(e) => setShiftSearch(e.target.value)}
                  className="h-8 text-xs w-44"
                />

                {(isAdmin || isOPS) && distinctEmployees.length > 0 && (
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Employees</option>
                    {distinctEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                )}

                <select
                  value={shiftStatusFilter}
                  onChange={(e) => setShiftStatusFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs rounded-md border border-input bg-background text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="All">All Shift States</option>
                  <option value="Present">Present (Completed)</option>
                  <option value="Active">Active (Currently Clocked In)</option>
                  <option value="Late">Late Arrival</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredShiftLogs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <i className="fa-solid fa-fingerprint text-3xl mb-2 opacity-40 block" />
                <p className="text-sm font-semibold">No shift punch records matched your selection.</p>
                <p className="text-xs mt-1">Check the selected date range or employee filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Date (IST)</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Shift Assigned</th>
                      <th className="px-4 py-3">Punch In</th>
                      <th className="px-4 py-3">Punch Out</th>
                      <th className="px-4 py-3">Regular Hrs</th>
                      <th className="px-4 py-3">Overtime</th>
                      <th className="px-4 py-3">Total Shift</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredShiftLogs.map((log) => {
                      const empName = typeof log.userId === "object" ? log.userId?.name : currentUser?.name || "Employee";
                      const shiftName = typeof log.userId === "object" ? log.userId?.shiftName : currentUser?.shiftName || "Day Shift";
                      const inTime = log.clockIn ? formatISTTime(log.clockIn) : "-";
                      const isOnline = log.clockIn && (!log.clockOut || log.clockOut === "Active");
                      const outTime = isOnline ? "Active" : log.clockOut ? formatISTTime(log.clockOut) : "-";
                      const hrs = getLogHours(log);

                      return (
                        <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {log.date ? formatISTDate(log.date) : "-"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {empName[0]?.toUpperCase() || "U"}
                            </span>
                            {empName}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {shiftName}
                          </td>
                          <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                            {inTime}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {isOnline ? (
                              <span className="inline-flex items-center gap-1 text-emerald-500 font-bold animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Currently In
                              </span>
                            ) : (
                              outTime
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-foreground">
                            {hrs.reg.toFixed(1)} hrs
                          </td>
                          <td className="px-4 py-3 font-mono text-amber-500 font-medium">
                            {hrs.ot > 0 ? `+${hrs.ot.toFixed(1)} hrs` : "-"}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-foreground">
                            {hrs.total.toFixed(1)} hrs
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold border",
                                isOnline
                                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                                  : log.status === "Present"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : log.status === "Late"
                                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  : "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {isOnline ? "Active" : log.status || "Present"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Executive Workload Summary */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Projects by Timesheet Volume */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-folder-open text-primary" /> Hours by Project
                </CardTitle>
                <CardDescription className="text-xs">
                  Aggregate timesheet distribution across active ventures.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {projectNames.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No projects with logged hours.</p>
                ) : (
                  projectNames.map((pName) => {
                    const pTotal = filteredTimesheets
                      .filter((e) => (e.project || "General") === pName)
                      .reduce((sum, e) => sum + (e.hours || 0), 0);
                    const pct = totalTimesheetHours > 0 ? Math.round((pTotal / totalTimesheetHours) * 100) : 0;
                    return (
                      <div key={pName} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">{pName}</span>
                          <span className="font-mono text-muted-foreground font-medium">{pTotal.toFixed(1)} hrs ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Task Velocity and Completion Health */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border/80">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-emerald-500" /> Task Status Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Ratio of completed deliverables vs. tasks currently in flight.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[
                  { label: "Completed / Done", count: completedTasksCount, color: "bg-emerald-500", text: "text-emerald-500" },
                  { label: "In Progress", count: filteredTasks.filter((t) => t.status === "In Progress").length, color: "bg-sky-500", text: "text-sky-500" },
                  { label: "Under Review", count: filteredTasks.filter((t) => t.status === "Review").length, color: "bg-violet-500", text: "text-violet-500" },
                  { label: "To Do / Backlog", count: filteredTasks.filter((t) => t.status === "To Do" || !t.status).length, color: "bg-slate-500", text: "text-slate-500" },
                ].map((s) => {
                  const pct = totalTasksCount > 0 ? Math.round((s.count / totalTasksCount) * 100) : 0;
                  return (
                    <div key={s.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-2">
                          <span className={cn("w-2 h-2 rounded-full", s.color)} />
                          {s.label}
                        </span>
                        <span className={cn("font-mono font-medium", s.text)}>{s.count} tasks ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", s.color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* PDF Customizer & Report Compiler Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <i className="fa-solid fa-file-pdf text-sm" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Print-Ready PDF Generator</h3>
                  <p className="text-[11px] text-muted-foreground">Select report sections to compile into PDF</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="text-xs font-semibold text-foreground block">Sections to Include in Export:</label>

              <div className="space-y-2 bg-muted/30 p-3 rounded-xl border border-border/80">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-chart-line text-primary text-xs" /> Executive KPI Metrics Banner
                  </span>
                  <input
                    type="checkbox"
                    checked={pdfIncludeKpis}
                    onChange={(e) => setPdfIncludeKpis(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer select-none">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-list-check text-amber-500 text-xs" /> Project Deliverables &amp; Tasks Table
                  </span>
                  <input
                    type="checkbox"
                    checked={pdfIncludeTasks}
                    onChange={(e) => setPdfIncludeTasks(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer select-none">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-clock text-sky-500 text-xs" /> Timesheet Hours &amp; Billable Activity
                  </span>
                  <input
                    type="checkbox"
                    checked={pdfIncludeTimesheets}
                    onChange={(e) => setPdfIncludeTimesheets(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer select-none">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-user-clock text-emerald-500 text-xs" /> Verified Shift Punch Attendance Logs
                  </span>
                  <input
                    type="checkbox"
                    checked={pdfIncludeShifts}
                    onChange={(e) => setPdfIncludeShifts(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer select-none">
                  <span className="font-medium text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-signature text-violet-500 text-xs" /> Audit Verification &amp; Sign-off Section
                  </span>
                  <input
                    type="checkbox"
                    checked={pdfIncludeSignoff}
                    onChange={(e) => setPdfIncludeSignoff(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Custom Audit Note / Manager Annotation (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved monthly sprint deliverables and timesheet audit records for client review."
                  value={pdfCustomNotes}
                  onChange={(e) => setPdfCustomNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
