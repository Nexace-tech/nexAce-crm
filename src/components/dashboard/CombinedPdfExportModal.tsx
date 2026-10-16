"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn, formatISTDate, getISTDateString } from "@/lib/utils";
import { generateAndDownloadPDF } from "@/lib/pdfReportGenerator";

interface CombinedPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  initialTasks?: any[];
  initialTimesheets?: any[];
  onSuccessToast?: (msg: string) => void;
}

// Preset types
type DatePreset = "this_month" | "this_week" | "today" | "last_30_days" | "last_month" | "all" | "custom";

/** Helper to compute current month start (YYYY-MM-01) and end (YYYY-MM-lastDay) in IST */
function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const todayStr = getISTDateString(now);
  const [yearStr, monthStr] = todayStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  const start = `${yearStr}-${monthStr.padStart(2, "0")}-01`;
  // Day 0 of next month is the last day of current month in JS Date
  const lastDayObj = new Date(year, month, 0);
  const end = getISTDateString(lastDayObj);
  return { start, end };
}

/** Helper to compute this week (Monday to Sunday) in IST */
function getThisWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  // Monday as 1st day of week
  const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return {
    start: getISTDateString(monday),
    end: getISTDateString(sunday),
  };
}

/** Helper to compute last month range in IST */
function getLastMonthRange(): { start: string; end: string } {
  const now = new Date();
  const prevMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    start: getISTDateString(prevMonthFirst),
    end: getISTDateString(prevMonthLast),
  };
}

export function CombinedPdfExportModal({
  isOpen,
  onClose,
  user,
  initialTasks = [],
  initialTimesheets = [],
  onSuccessToast,
}: CombinedPdfExportModalProps) {
  // Preset defaults to "this_month"
  const [preset, setPreset] = useState<DatePreset>("this_month");
  
  // Initialize start and end dates with current month's range by default
  const [startDate, setStartDate] = useState<string>(() => getCurrentMonthRange().start);
  const [endDate, setEndDate] = useState<string>(() => getCurrentMonthRange().end);

  // Section inclusion flags
  const [includeKpis, setIncludeKpis] = useState(true);
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeTimesheets, setIncludeTimesheets] = useState(true);
  const [includeShifts, setIncludeShifts] = useState(true);
  const [includeSignoff, setIncludeSignoff] = useState(true);
  const [customNotes, setCustomNotes] = useState("");

  // Detailed filters
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("All");
  const [timesheetBillableFilter, setTimesheetBillableFilter] = useState("All");
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState("All");
  const [shiftStatusFilter, setShiftStatusFilter] = useState("All");

  // Loaded dataset
  const [tasks, setTasks] = useState<any[]>(initialTasks);
  const [timesheets, setTimesheets] = useState<any[]>(initialTimesheets);
  const [shiftLogs, setShiftLogs] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(false);
  const [generating, setGenerating] = useState(false);

  // When modal opens, refresh and ensure default is current month
  useEffect(() => {
    if (!isOpen) return;

    // Reset preset to "this_month" with current month boundaries
    const { start, end } = getCurrentMonthRange();
    setPreset("this_month");
    setStartDate(start);
    setEndDate(end);

    // Fetch latest fresh data across all tables
    let isMounted = true;
    async function loadData() {
      setFetchingData(true);
      try {
        const [taskRes, tsRes, attRes] = await Promise.all([
          initialTasks.length > 0 ? Promise.resolve(null) : fetch("/api/tasks"),
          fetch("/api/timesheets"),
          fetch("/api/attendance?limit=all"),
        ]);

        if (isMounted) {
          if (taskRes && taskRes.ok) {
            const data = await taskRes.json();
            setTasks(data.tasks || []);
          } else if (initialTasks.length > 0) {
            setTasks(initialTasks);
          }

          if (tsRes.ok) {
            const tsData = await tsRes.json();
            setTimesheets(tsData.entries || initialTimesheets);
          }

          if (attRes.ok) {
            const attData = await attRes.json();
            setShiftLogs(attData.history || (attData.attendance ? [attData.attendance] : []));
          }
        }
      } catch (err) {
        console.error("Failed to load PDF modal data:", err);
      } finally {
        if (isMounted) setFetchingData(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle Preset Changes
  const handleApplyPreset = (p: DatePreset) => {
    setPreset(p);
    const today = getISTDateString(new Date());

    if (p === "this_month") {
      const { start, end } = getCurrentMonthRange();
      setStartDate(start);
      setEndDate(end);
    } else if (p === "this_week") {
      const { start, end } = getThisWeekRange();
      setStartDate(start);
      setEndDate(end);
    } else if (p === "today") {
      setStartDate(today);
      setEndDate(today);
    } else if (p === "last_30_days") {
      const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(getISTDateString(past30));
      setEndDate(today);
    } else if (p === "last_month") {
      const { start, end } = getLastMonthRange();
      setStartDate(start);
      setEndDate(end);
    } else if (p === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Date range verification helper
  const isDateWithinRange = (dateValue?: string | Date) => {
    if (!startDate && !endDate) return true;
    if (!dateValue) return true; // keep unscheduled items if no date filter restriction
    const itemDate = getISTDateString(dateValue);
    if (!itemDate) return true;
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  };

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const taskDate = t.dueDate || t.createdAt;
      const matchDate = isDateWithinRange(taskDate);
      const matchStatus = taskStatusFilter === "All" || t.status === taskStatusFilter;
      const matchPriority = taskPriorityFilter === "All" || t.priority === taskPriorityFilter;
      return matchDate && matchStatus && matchPriority;
    });
  }, [tasks, startDate, endDate, taskStatusFilter, taskPriorityFilter]);

  // Filtered Timesheets
  const filteredTimesheets = useMemo(() => {
    return timesheets.filter((e) => {
      const matchDate = isDateWithinRange(e.date || e.createdAt);
      const matchBillable =
        timesheetBillableFilter === "All" ||
        (timesheetBillableFilter === "Billable" && Boolean(e.isBillable)) ||
        (timesheetBillableFilter === "Non-Billable" && !e.isBillable);
      const matchStatus = timesheetStatusFilter === "All" || e.status === timesheetStatusFilter;
      return matchDate && matchBillable && matchStatus;
    });
  }, [timesheets, startDate, endDate, timesheetBillableFilter, timesheetStatusFilter]);

  // Filtered Shift Logs
  const filteredShiftLogs = useMemo(() => {
    return shiftLogs.filter((log) => {
      const logDate = log.date || log.clockIn || log.originalClockIn;
      const matchDate = isDateWithinRange(logDate);
      const status = log.status || (log.clockIn && !log.clockOut ? "Active" : "Present");
      const matchStatus = shiftStatusFilter === "All" || status === shiftStatusFilter;
      return matchDate && matchStatus;
    });
  }, [shiftLogs, startDate, endDate, shiftStatusFilter]);

  // Total Hours calculation
  const totalTimesheetHours = useMemo(() => {
    return filteredTimesheets.reduce((acc, t) => acc + (t.hours || 0), 0);
  }, [filteredTimesheets]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !generating) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, generating, onClose]);

  if (!isOpen) return null;

  // Handle PDF Generation
  const handleDownload = async () => {
    try {
      setGenerating(true);

      const startDateFormatted = startDate ? formatISTDate(startDate) : undefined;
      const endDateFormatted = endDate ? formatISTDate(endDate) : undefined;

      generateAndDownloadPDF({
        user: {
          name: user?.name,
          role: user?.role,
          department: user?.department,
          shiftName: user?.shiftName,
          shiftTime: user?.shiftTime,
          tenantName: user?.tenantId?.name,
        },
        tasks: filteredTasks,
        timesheets: filteredTimesheets,
        shiftLogs: filteredShiftLogs,
        includeKpis,
        includeTasks,
        includeTimesheets,
        includeShifts,
        includeSignoff,
        customNotes: customNotes.trim() || undefined,
        startDate: startDateFormatted,
        endDate: endDateFormatted,
      });

      const periodDescription =
        startDate && endDate
          ? `${formatISTDate(startDate)} to ${formatISTDate(endDate)}`
          : preset === "this_month"
          ? "Current Month"
          : "Selected Range";

      onSuccessToast?.(`Downloaded Combined PDF for ${periodDescription}!`);
      onClose();
    } catch (err) {
      console.error("Failed to generate combined PDF:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
              <i className="fa-solid fa-file-pdf text-base" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                Download Combined PDF Report
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Filter by time period &amp; customize report content before exporting
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto max-h-[calc(92vh-130px)]">
          {/* Section 1: Time Period & Range Selection */}
          <div className="space-y-3 p-4 rounded-xl bg-card border border-border/80 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <i className="fa-solid fa-calendar-range text-emerald-500 text-xs" /> Time Period Filter
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Default: Current Month
              </span>
            </div>

            {/* Quick Presets Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "this_month", label: "This Month (Default)", icon: "fa-calendar" },
                { id: "this_week", label: "This Week", icon: "fa-calendar-week" },
                { id: "today", label: "Today", icon: "fa-calendar-day" },
                { id: "last_30_days", label: "Last 30 Days", icon: "fa-clock-rotate-left" },
                { id: "last_month", label: "Last Month", icon: "fa-calendar-minus" },
                { id: "all", label: "All Time", icon: "fa-infinity" },
              ].map((p) => {
                const isActive = preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id as DatePreset)}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer min-h-[36px]",
                      isActive
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <i className={cn("fa-solid text-[10px]", p.icon)} />
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Start & End Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Start Date (From)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPreset("custom");
                    }}
                    className="w-full text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[38px]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  End Date (To)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPreset("custom");
                    }}
                    className="w-full text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[38px]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Content Sections to Include */}
          <div className="space-y-3 p-4 rounded-xl bg-card border border-border/80 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <i className="fa-solid fa-layer-group text-primary text-xs" /> Sections to Include
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* KPI Overview */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer transition-colors text-xs font-medium">
                <input
                  type="checkbox"
                  checked={includeKpis}
                  onChange={(e) => setIncludeKpis(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer accent-emerald-600"
                />
                <i className="fa-solid fa-chart-pie text-amber-500 text-xs w-4" />
                <span className="text-foreground font-semibold">Executive KPI Cards</span>
              </label>

              {/* Tasks */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer transition-colors text-xs font-medium">
                <input
                  type="checkbox"
                  checked={includeTasks}
                  onChange={(e) => setIncludeTasks(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer accent-emerald-600"
                />
                <i className="fa-solid fa-list-check text-indigo-500 text-xs w-4" />
                <span className="text-foreground font-semibold">Project Tasks Table</span>
              </label>

              {/* Timesheets */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer transition-colors text-xs font-medium">
                <input
                  type="checkbox"
                  checked={includeTimesheets}
                  onChange={(e) => setIncludeTimesheets(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer accent-emerald-600"
                />
                <i className="fa-solid fa-calendar-days text-sky-500 text-xs w-4" />
                <span className="text-foreground font-semibold">Timesheet Logs Table</span>
              </label>

              {/* Shift Attendance */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer transition-colors text-xs font-medium">
                <input
                  type="checkbox"
                  checked={includeShifts}
                  onChange={(e) => setIncludeShifts(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer accent-emerald-600"
                />
                <i className="fa-solid fa-clock-rotate-left text-emerald-500 text-xs w-4" />
                <span className="text-foreground font-semibold">Shift Attendance Logs</span>
              </label>

              {/* Signoff */}
              <label className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 hover:bg-muted/20 cursor-pointer transition-colors text-xs font-medium sm:col-span-2">
                <input
                  type="checkbox"
                  checked={includeSignoff}
                  onChange={(e) => setIncludeSignoff(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer accent-emerald-600"
                />
                <i className="fa-solid fa-file-signature text-purple-500 text-xs w-4" />
                <span className="text-foreground font-semibold">Verification &amp; Sign-off Block</span>
              </label>
            </div>
          </div>

          {/* Section 3: Granular Criteria Filters */}
          <div className="space-y-3 p-4 rounded-xl bg-card border border-border/80 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <i className="fa-solid fa-filter text-amber-500 text-xs" /> Specific Record Filters
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Task Status */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Task Status
                </label>
                <select
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[38px] cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Done">Done Only</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">In Review</option>
                  <option value="To Do">To Do</option>
                </select>
              </div>

              {/* Timesheet Billable */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Timesheet Billable
                </label>
                <select
                  value={timesheetBillableFilter}
                  onChange={(e) => setTimesheetBillableFilter(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[38px] cursor-pointer"
                >
                  <option value="All">All Types</option>
                  <option value="Billable">Billable Only</option>
                  <option value="Non-Billable">Non-Billable Only</option>
                </select>
              </div>

              {/* Shift Status */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                  Shift Attendance Status
                </label>
                <select
                  value={shiftStatusFilter}
                  onChange={(e) => setShiftStatusFilter(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[38px] cursor-pointer"
                >
                  <option value="All">All Punches</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Active">Active Shifts</option>
                </select>
              </div>
            </div>

            {/* Optional Custom Note */}
            <div className="pt-1">
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">
                Custom Remarks / Supervisor Note (Optional)
              </label>
              <textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Monthly sprint milestone review submitted for departmental sign-off..."
                rows={2}
                className="w-full text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>
          </div>

          {/* Live Records Preview Badge */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-primary/5 to-transparent border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-foreground">Live Export Scope:</span>
            </div>
            <div className="flex items-center gap-3 font-semibold flex-wrap">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <i className="fa-solid fa-list-check text-xs" /> {filteredTasks.length} Tasks
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                <i className="fa-solid fa-calendar-days text-xs" /> {filteredTimesheets.length} Timesheets ({totalTimesheetHours.toFixed(1)}h)
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <i className="fa-solid fa-clock-rotate-left text-xs" /> {filteredShiftLogs.length} Shifts
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-border bg-muted/10 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={generating}
            className="text-xs cursor-pointer min-h-[38px]"
          >
            <i className="fa-solid fa-xmark mr-1.5" /> Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownload}
            disabled={generating || fetchingData}
            className="text-xs font-semibold gap-2 cursor-pointer shadow-md bg-rose-600 hover:bg-rose-700 text-white min-h-[38px] px-4"
          >
            {generating ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs" /> Generating PDF...
              </>
            ) : fetchingData ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-xs" /> Loading Data...
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-pdf text-xs" /> Download Combined PDF
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
