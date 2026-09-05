"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { cn, formatISTDate, formatISTTime, getISTDateString } from "@/lib/utils";
import { generateAndDownloadPDF } from "@/lib/pdfReportGenerator";

export function EmployeeDashboard({ user }: { user: any }) {
  const { can } = usePermissions();
  const [clockedIn, setClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [clockInIso, setClockInIso] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [clocking, setClocking] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [teamLeaves, setTeamLeaves] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Export & Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [exportingReport, setExportingReport] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const res = await fetch("/api/attendance");
      if (res.ok) {
        const data = await res.json();
        if (data.attendance && data.attendance.clockIn && !data.attendance.clockOut) {
          setClockedIn(true);
          setClockInIso(data.attendance.clockIn);
          const clockInDate = new Date(data.attendance.clockIn);
          setClockTime(clockInDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true }));
        } else {
          setClockedIn(false);
          setClockInIso(null);
          setClockTime(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch attendance status:", err);
    }
  };

  // Live stopwatch interval for active shift duration
  useEffect(() => {
    if (!clockedIn || !clockInIso) {
      setElapsedTime("00:00:00");
      return;
    }
    const startTime = new Date(clockInIso).getTime();
    const interval = setInterval(() => {
      const diffMs = Math.max(0, Date.now() - startTime);
      const totalSecs = Math.floor(diffMs / 1000);
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      setElapsedTime(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [clockedIn, clockInIso]);

  useEffect(() => {
    async function fetchEmployeeData() {
      try {
        await fetchAttendanceStatus();
        const [taskRes, tsRes, sprintRes, leaveRes, annRes] = await Promise.all([
          fetch("/api/tasks"),
          fetch("/api/timesheets"),
          fetch("/api/sprints"),
          fetch("/api/hr/leaves"),
          fetch("/api/chat/announcements"),
        ]);

        if (taskRes.ok) {
          const tData = await taskRes.json();
          setTasks(tData.tasks || []);
        }
        if (tsRes.ok) {
          const tsData = await tsRes.json();
          setTimesheets(tsData.entries || []);
        }
        if (sprintRes.ok) {
          const sData = await sprintRes.json();
          setSprints(sData.sprints || []);
        }
        if (leaveRes.ok) {
          const lData = await leaveRes.json();
          setTeamLeaves(lData.leaves || []);
        }
        if (annRes.ok) {
          const aData = await annRes.json();
          setAnnouncements(aData.announcements || []);
        }
      } catch (err) {
        console.error("Failed to fetch employee tasks/timesheets/sprints/announcements:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployeeData();

    // Auto-sync polling every 30 seconds
    const pollInterval = setInterval(fetchAttendanceStatus, 30_000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleToggleClock = async () => {
    const action = clockedIn ? "out" : "in";
    try {
      setClocking(true);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchAttendanceStatus();
      }
    } catch (err) {
      console.error("Failed to toggle clock state:", err);
    } finally {
      setClocking(false);
    }
  };

  // --- Export 1: Project Tasks (with details) ---
  const handleExportTasksReport = async () => {
    try {
      setExportingReport("tasks");
      let currentTasks = tasks;
      if (currentTasks.length === 0) {
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const data = await res.json();
          currentTasks = data.tasks || [];
        }
      }
      if (currentTasks.length === 0) {
        showToast("No assigned tasks found to export.", "error");
        return;
      }

      const headers = [
        "Task ID",
        "Task Title",
        "Project",
        "Priority",
        "Status",
        "Due Date (IST)",
        "Estimated Hours",
        "Subtasks Progress",
        "Description",
        "Assigned / Created Date (IST)"
      ];

      const rows = currentTasks.map((t) => {
        const subtasksTotal = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
        const subtasksDone = Array.isArray(t.subtasks) ? t.subtasks.filter((s: any) => s.completed).length : 0;
        const subtaskStr = subtasksTotal > 0 ? `${subtasksDone}/${subtasksTotal} Completed` : "No subtasks";
        const projName = t.projectId?.name || t.project || "General";
        const dueDateStr = t.dueDate ? formatISTDate(t.dueDate) : "No due date";
        const createdDateStr = t.createdAt ? formatISTDate(t.createdAt) : "";
        const descClean = (t.description || "").replace(/[\r\n]+/g, " ").trim();

        return [
          `"${t._id || ""}"`,
          `"${(t.title || "").replace(/"/g, '""')}"`,
          `"${projName.replace(/"/g, '""')}"`,
          `"${t.priority || "Medium"}"`,
          `"${t.status || "To Do"}"`,
          `"${dueDateStr}"`,
          t.estimatedHours || 0,
          `"${subtaskStr}"`,
          `"${descClean.replace(/"/g, '""')}"`,
          `"${createdDateStr}"`
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `My_Project_Tasks_Report_${getISTDateString()}_IST.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Detailed project tasks exported successfully!", "success");
    } catch (err) {
      console.error("Failed to export tasks report:", err);
      showToast("Failed to export tasks report.", "error");
    } finally {
      setExportingReport(null);
      setShowExportMenu(false);
    }
  };

  // --- Export 2: Timesheet Report ---
  const handleExportTimesheetsReport = async () => {
    try {
      setExportingReport("timesheets");
      let currentEntries = timesheets;
      if (currentEntries.length === 0) {
        const res = await fetch("/api/timesheets");
        if (res.ok) {
          const data = await res.json();
          currentEntries = data.entries || [];
        }
      }
      if (currentEntries.length === 0) {
        showToast("No logged timesheet records found to export.", "error");
        return;
      }

      const headers = [
        "Date (IST)",
        "Project Name",
        "Task / Work Description",
        "Hours Logged",
        "Billable Status",
        "Approval Status",
        "Notes / Comments"
      ];

      const rows = currentEntries.map((e) => {
        const dateStr = e.date ? formatISTDate(e.date) : "";
        const proj = (e.project || "General").replace(/"/g, '""');
        const task = (e.taskName || "General Development").replace(/"/g, '""');
        const billable = e.isBillable ? "Billable" : "Non-Billable";
        const status = e.status || "Draft";
        const comment = (e.comment || "").replace(/[\r\n]+/g, " ").replace(/"/g, '""').trim();

        return [
          `"${dateStr}"`,
          `"${proj}"`,
          `"${task}"`,
          e.hours || 0,
          `"${billable}"`,
          `"${status}"`,
          `"${comment}"`
        ].join(",");
      });

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `My_Timesheet_Report_${getISTDateString()}_IST.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Timesheet report exported successfully!", "success");
    } catch (err) {
      console.error("Failed to export timesheets report:", err);
      showToast("Failed to export timesheets report.", "error");
    } finally {
      setExportingReport(null);
      setShowExportMenu(false);
    }
  };

  // --- Export 3: Shift Log (Attendance) ---
  const handleExportShiftLogsReport = async () => {
    try {
      setExportingReport("shifts");
      const res = await fetch("/api/attendance?limit=all");
      if (!res.ok) throw new Error("Failed to fetch shift records");
      const data = await res.json();
      const logs = data.history || (data.attendance ? [data.attendance] : []);

      if (logs.length === 0) {
        showToast("No shift attendance logs found to export.", "error");
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

      const rows = logs.map((log: any) => {
        const empName = user?.name || "Employee";
        const shiftName = user?.shiftName || "Standard Day Shift";
        const shiftTime = user?.shiftTime || "09:00 AM - 05:00 PM";
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

      const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `My_Shift_Attendance_Log_${getISTDateString()}_IST.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Shift logs exported successfully!", "success");
    } catch (err) {
      console.error("Failed to export shift logs:", err);
      showToast("Failed to export shift logs.", "error");
    } finally {
      setExportingReport(null);
      setShowExportMenu(false);
    }
  };

  // Export 4: Unified Combined PDF Report (Direct File Download)
  const handleExportCombinedPDFReport = async () => {
    setExportingReport("pdf");
    try {
      // Fetch latest datasets in parallel
      const [tsRes, attRes] = await Promise.all([
        fetch("/api/timesheets"),
        fetch("/api/attendance?limit=all"),
      ]);

      const tsData = tsRes.ok ? await tsRes.json() : { entries: [] };
      const attData = attRes.ok ? await attRes.json() : { history: [] };

      const currentTasks = tasks || [];
      const currentTimesheets = tsData.entries || timesheets || [];
      const currentShiftLogs = attData.history || (attData.attendance ? [attData.attendance] : []);

      generateAndDownloadPDF({
        user: {
          name: user?.name,
          role: user?.role,
          department: user?.department,
          shiftName: user?.shiftName,
          shiftTime: user?.shiftTime,
          tenantName: user?.tenantId?.name,
        },
        tasks: currentTasks,
        timesheets: currentTimesheets,
        shiftLogs: currentShiftLogs,
        includeKpis: true,
        includeTasks: true,
        includeTimesheets: true,
        includeShifts: true,
        includeSignoff: true,
      });

      showToast("Downloaded Comprehensive PDF Report successfully!", "success");
    } catch (err) {
      console.error("Failed to generate combined PDF report:", err);
      showToast("Failed to download PDF report.", "error");
    } finally {
      setExportingReport(null);
      setShowExportMenu(false);
    }
  };

  const totalLoggedHours = timesheets.reduce((acc, t) => acc + (t.hours || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in">
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

      {/* Hero Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent p-6 rounded-2xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 tracking-wider uppercase mb-1">
            <i className="fa-solid fa-id-badge text-emerald-500 text-sm" /> Employee Workspace
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Welcome back, {user?.name?.split(" ")[0] || "Team Member"}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here is your daily pulse, assigned sprint deliverables, and shift attendance record.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export Reports Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="gap-2 font-semibold shadow-xs cursor-pointer border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
            >
              {exportingReport ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs" /> Exporting...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-arrow-down text-xs" /> Export Reports
                  <i className={cn("fa-solid text-[10px] transition-transform", showExportMenu ? "fa-chevron-up" : "fa-chevron-down")} />
                </>
              )}
            </Button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-card border border-border shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 flex items-center justify-between">
                  <span>Select Report Type</span>
                  <span className="text-[10px] text-emerald-500 font-semibold">PDF &amp; CSV</span>
                </div>

                {/* Combined PDF Button */}
                <button
                  onClick={handleExportCombinedPDFReport}
                  disabled={Boolean(exportingReport)}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-2.5 cursor-pointer disabled:opacity-50 shadow-xs mb-1"
                >
                  <div className="w-7 h-7 rounded-md bg-white/20 text-white flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-file-pdf text-xs" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Download Combined PDF</p>
                    <p className="text-[10px] text-rose-100">Direct PDF file download</p>
                  </div>
                </button>

                <button
                  onClick={handleExportTasksReport}
                  disabled={Boolean(exportingReport)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent/60 transition-colors flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-list-check text-xs" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Project Tasks (CSV)</p>
                    <p className="text-[10px] text-muted-foreground">Priority, due dates &amp; subtasks</p>
                  </div>
                </button>

                <button
                  onClick={handleExportTimesheetsReport}
                  disabled={Boolean(exportingReport)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent/60 transition-colors flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-calendar-days text-xs" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">My Timesheet (CSV)</p>
                    <p className="text-[10px] text-muted-foreground">Logged hours &amp; billable status</p>
                  </div>
                </button>

                <button
                  onClick={handleExportShiftLogsReport}
                  disabled={Boolean(exportingReport)}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-accent/60 transition-colors flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-clock-rotate-left text-xs" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Shift Attendance Logs (CSV)</p>
                    <p className="text-[10px] text-muted-foreground">Clock in/out timings &amp; duration</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <Button asChild color="primary" size="sm">
            <Link href="/dashboard/calendar">
              <i className="fa-solid fa-calendar-days text-xs mr-2" /> My Shift Calendar
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/projects">My Tasks</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/clients?tab=reports" className="gap-1 text-emerald-600 dark:text-emerald-400">
              <i className="fa-solid fa-file-lines text-xs mr-1" /> OPS Reports
            </Link>
          </Button>
        </div>
      </div>

      {/* Employee Personal KPI Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/dashboard/calendar" className="block group">
          <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500 h-full group-hover:border-emerald-400 group-hover:bg-accent/20 cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">My Shift Schedule</p>
                <p className="text-lg font-bold text-foreground">{user?.shiftName || "Standard Day Shift"}</p>
                <p className="text-xs text-emerald-500 font-mono font-semibold flex items-center gap-1 mt-1">
                  <i className="fa-solid fa-sun text-amber-500 text-xs" /> {user?.shiftTime || "09:00 AM - 05:00 PM"}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center w-12 h-12 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-clock text-xl" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/calendar?tab=timesheets" className="block group">
          <Card className="hover:shadow-md transition-all border-l-4 border-l-primary h-full group-hover:border-primary/80 group-hover:bg-accent/20 cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">My Timesheet Hours</p>
                <p className="text-2xl font-bold text-foreground">{loading ? "..." : `${totalLoggedHours} Hrs`}</p>
                <p className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
                  Target: 40.0 Hrs this week
                </p>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-xl flex items-center justify-center w-12 h-12 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-calendar-days text-xl" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/projects" className="block group">
          <Card className="hover:shadow-md transition-all border-l-4 border-l-amber-500 h-full group-hover:border-amber-400 group-hover:bg-accent/20 cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">Assigned Tasks</p>
                <p className="text-2xl font-bold text-foreground">{loading ? "..." : `${tasks.length} Active`}</p>
                <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                  Tasks assigned to you
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center w-12 h-12 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-list-check text-xl" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/hr" className="block group">
          <Card className="hover:shadow-md transition-all border-l-4 border-l-sky-500 h-full group-hover:border-sky-400 group-hover:bg-accent/20 cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">Approved Leaves</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : `${teamLeaves.filter((l) => l.status === "Approved").length} Approved`}
                </p>
                <p className="text-xs text-sky-500 font-medium flex items-center gap-1 mt-1">
                  From your leave requests
                </p>
              </div>
              <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl flex items-center justify-center w-12 h-12 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-calendar-check text-xl" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Employee Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 span): Shift Schedule & Assigned Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-primary text-lg" /> Today's Shift & Attendance
                </CardTitle>
                <CardDescription>Your assigned shift schedule & real-time punch status</CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportShiftLogsReport}
                  disabled={exportingReport === "shifts"}
                  className="h-9 text-xs gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer shadow-xs"
                  title="Download My Shift Attendance Logs CSV"
                >
                  <i className={cn("fa-solid text-xs", exportingReport === "shifts" ? "fa-spinner fa-spin" : "fa-file-csv")} />
                  <span className="hidden sm:inline">Export Shift Logs</span>
                </Button>

                <Button
                  color={clockedIn ? "destructive" : "primary"}
                  size="sm"
                  onClick={handleToggleClock}
                  disabled={clocking}
                  className="gap-2 font-semibold shadow-md cursor-pointer h-9"
                >
                  {clocking ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin text-xs" /> Syncing...
                    </>
                  ) : clockedIn ? (
                    <>
                      <i className="fa-solid fa-square text-xs" /> Clock Out
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-play text-xs" /> Clock In Now
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/40 rounded-xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-base">{user?.shiftName || "Standard Day Shift"}</span>
                    <Badge color={clockedIn ? "success" : "secondary"}>
                      {clockedIn ? "🟢 Shift Active" : "⚪ Off Shift"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Timing: <strong className="font-mono text-foreground">{user?.shiftTime || "09:00 AM - 05:00 PM"}</strong> | Target: 8.0 Hours
                  </p>
                </div>

                {clockedIn && (
                  <div className="text-right sm:text-right flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-border">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Active Duration</p>
                      <p className="font-mono font-extrabold text-lg text-emerald-500 tracking-tight flex items-center gap-1.5">
                        <i className="fa-solid fa-stopwatch text-sm animate-pulse" /> {elapsedTime}
                      </p>
                    </div>
                    {clockTime && (
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Started at <strong className="font-mono text-foreground">{clockTime}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 rounded-lg bg-card border border-border space-y-0.5">
                  <span className="text-muted-foreground">Shift Type</span>
                  <p className="font-semibold text-foreground">{user?.employmentType || "Regular Full-Time"}</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border space-y-0.5">
                  <span className="text-muted-foreground">Lunch Break</span>
                  <p className="font-semibold text-foreground">01:00 PM - 02:00 PM</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border space-y-0.5">
                  <span className="text-muted-foreground">Workplace</span>
                  <p className="font-semibold text-emerald-500">{user?.workplace || user?.location || "Hybrid / Office"}</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border space-y-0.5">
                  <span className="text-muted-foreground">Department</span>
                  <p className="font-semibold text-primary">{user?.department || "Engineering"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Sprint & Burndown Tracker Widget */}
          {(() => {
            const activeSprint = sprints.find((s) => s.status === "Active");
            const plannedSprint = sprints.find((s) => s.status === "Planned");
            const currentSprint = activeSprint || plannedSprint;

            if (!currentSprint && sprints.length === 0 && !loading) return null;

            return (
              <Card className="border border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <i className="fa-solid fa-rocket text-primary text-base" />
                      {activeSprint ? "Active Agile Sprint" : "Upcoming Sprint Cycle"}
                    </CardTitle>
                    <CardDescription>
                      {activeSprint ? "Current sprint objective, burndown velocity & milestones" : "Next scheduled sprint iteration for your team"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSprint ? (
                      <Badge color="primary" className="font-semibold gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active Sprint
                      </Badge>
                    ) : (
                      <Badge color="warning" variant="soft" className="font-semibold">
                        Planned
                      </Badge>
                    )}
                    <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                      <Link href="/dashboard/calendar?tab=sprints" className="gap-1 text-primary">
                        Sprint Board <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {currentSprint ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{currentSprint.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <strong>Goal:</strong> {currentSprint.goal || "Complete sprint deliverables and key milestones"}
                          </p>
                        </div>
                        <div className="text-right sm:text-right text-xs text-muted-foreground shrink-0 font-mono">
                          <span>{new Date(currentSprint.startDate).toLocaleDateString()} – {new Date(currentSprint.endDate).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Burndown Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-fire text-amber-500 text-xs" /> Sprint Burndown Progress
                          </span>
                          <span className="text-primary font-bold">{currentSprint.burndownProgress || 0}% Completed</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border/40">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(currentSprint.burndownProgress || 0, 4)}%` }}
                          />
                        </div>
                      </div>

                      {/* Task Breakdown Stats */}
                      <div className="grid grid-cols-3 gap-2.5 text-center text-xs pt-1">
                        <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 space-y-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">To Do</span>
                          <p className="font-bold text-sm text-foreground">{currentSprint.todoTasks || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">In Progress</span>
                          <p className="font-bold text-sm text-amber-600 dark:text-amber-400">{currentSprint.inProgressTasks || 0}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Done</span>
                          <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{currentSprint.completedTasks || 0}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground space-y-2">
                      <i className="fa-solid fa-person-running text-3xl opacity-30 block mx-auto text-primary" />
                      <p className="text-xs font-semibold text-foreground">No active sprint cycle planned</p>
                      <p className="text-[11px]">Sprint iterations and burndown tracking will appear here once scheduled.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Assigned Tasks & Deliverables */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-emerald-500 text-lg" /> My Assigned Tasks
                </CardTitle>
                <CardDescription>Deliverables assigned to you</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTasksReport}
                  disabled={exportingReport === "tasks"}
                  className="h-8 text-xs gap-1.5 font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer shadow-xs"
                  title="Download Project Tasks Detailed CSV Report"
                >
                  <i className={cn("fa-solid text-xs", exportingReport === "tasks" ? "fa-spinner fa-spin" : "fa-file-csv")} />
                  Export Tasks
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/projects" className="gap-1 text-primary">
                    View All Tasks <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading assigned tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No tasks assigned yet.</p>
              ) : (
                tasks.slice(0, 5).map((t) => (
                  <Link key={t._id} href="/dashboard/projects" className="block group">
                    <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors cursor-pointer group-hover:border-primary/50">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Priority: {t.priority} {t.dueDate ? `| Due: ${new Date(t.dueDate).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      <Badge color={t.priority === "High" || t.priority === "Urgent" ? "destructive" : t.status === "Done" ? "success" : "primary"}>
                        {t.status}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span): Announcements & Team Leave Requests */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-bullhorn text-amber-500 text-base" /> Workspace Announcements
                </CardTitle>
                <CardDescription>Company notices and team updates</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                <Link href="/dashboard/chat" className="gap-1 text-primary">
                  View Board <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Loading announcements...</p>
              ) : announcements.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <i className="fa-solid fa-bullhorn text-2xl mb-1 opacity-25 block" />
                  <p className="text-xs font-semibold text-foreground">No announcements yet</p>
                  <p className="text-[11px] mt-0.5">Company notices will appear here.</p>
                </div>
              ) : (
                announcements.slice(0, 3).map((a) => (
                  <Link key={a._id} href="/dashboard/chat" className="block group">
                    <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1 hover:bg-accent/40 transition-colors group-hover:border-primary/50 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1 group-hover:text-primary transition-colors">
                          {a.pinned && <i className="fa-solid fa-thumbtack text-amber-500 text-[10px]" />}
                          {a.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {a.content}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* My Leave Requests — visible when viewTeamLeave permission is granted */}
          {can("viewTeamLeave") && (
            <Card className="border border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <i className="fa-solid fa-calendar-week text-sky-500 text-base" /> My Leave Requests
                  </CardTitle>
                  <CardDescription>Your submitted leave history &amp; statuses</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link href="/dashboard/hr" className="gap-1 text-primary">
                    View All <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">Loading team leaves...</p>
                ) : teamLeaves.length === 0 ? (
                  <div className="text-center py-5 text-muted-foreground">
                    <i className="fa-solid fa-calendar-check text-3xl mb-2 opacity-30 block" />
                    <p className="text-xs font-semibold text-foreground">No leave requests yet</p>
                    <p className="text-[11px] mt-0.5">Team leave requests will appear here.</p>
                  </div>
                ) : (
                  teamLeaves.slice(0, 6).map((l) => (
                    <Link key={l._id} href="/dashboard/hr" className="block group">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors group-hover:border-primary/50 cursor-pointer">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-sky-500/20 text-sky-500 font-bold flex items-center justify-center text-xs border border-sky-500/30 shrink-0">
                            {l.userName?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">{l.userName}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {l.type} · {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          color={l.status === "Approved" ? "success" : l.status === "Rejected" ? "destructive" : "warning"}
                          variant="soft"
                          className="text-[10px] shrink-0 ml-2"
                        >
                          {l.status}
                        </Badge>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
