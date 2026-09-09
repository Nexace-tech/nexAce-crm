"use client";

import React, { useState, useEffect, useRef, useMemo, Suspense, startTransition } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn, formatISTDate, formatISTTime, getISTDateString } from "@/lib/utils";

import { useTabPersistence } from "@/hooks/useTabPersistence";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TeamShiftOverviewCard } from "@/components/dashboard/TeamShiftOverviewCard";

function CalendarPageContent() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { can, isAdmin, isOPS } = usePermissions();
  const [activeTab, setActiveTab] = useTabPersistence<"calendar" | "sprints" | "timesheets" | "attendance">(
    "calendar_active_tab",
    "calendar",
    ["calendar", "sprints", "timesheets", "attendance"]
  );

  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calendar States
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [filterType, setFilterType] = useState<string>("All");
  const [filterDept, setFilterDept] = useState<string>("All");

  const [newEvtTitle, setNewEvtTitle] = useState("");
  const [newEvtDesc, setNewEvtDesc] = useState("");
  const [newEvtType, setNewEvtType] = useState<"Meeting" | "Holiday" | "Birthday" | "Deadline" | "Personal">("Meeting");
  const [newEvtDept, setNewEvtDept] = useState("All");
  const [newEvtStart, setNewEvtStart] = useState("");
  const [newEvtEnd, setNewEvtEnd] = useState("");

  // Sprints state
  const [sprints, setSprints] = useState<any[]>([]);
  const [sprintLoading, setSprintLoading] = useState(false);
  const [showCreateSprintModal, setShowCreateSprintModal] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingSprint, setDeletingSprint] = useState(false);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");

  // Timesheet States
  const [timesheetEntries, setTimesheetEntries] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [timesheetWeekStart, setTimesheetWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0,0,0,0);
    return mon;
  });

  const [timesheetRows, setTimesheetRows] = useState<any[]>([
    { project: "NexAce CRM Implementation", taskName: "UI/UX Development", comment: "", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, isBillable: true },
    { project: "Client Portal Integration", taskName: "API endpoints integration", comment: "", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, isBillable: true },
  ]);
  const [timesheetRowToDelete, setTimesheetRowToDelete] = useState<{ index: number; project: string; taskName: string } | null>(null);
  const [deletingTimesheetRow, setDeletingTimesheetRow] = useState<boolean>(false);

  // Attendance States
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [shiftInfo, setShiftInfo] = useState<any>(null);
  const [selectedAttendanceLog, setSelectedAttendanceLog] = useState<any | null>(null);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [totalSecondsWorked, setTotalSecondsWorked] = useState(0);
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Pagination, Date Filter & Export States for Attendance History
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceRowsPerPage, setAttendanceRowsPerPage] = useState(5);
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [attendanceSearch, setAttendanceSearch] = useState<string>("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>("All");

  // Login & Hours Summary States (Admin/OPS only)
  const getDefaultWeekFrom = () => {
    const d = new Date();
    const day = d.getDay();
    const daysBack = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - daysBack);
    return getISTDateString(d);
  };
  const [summaryFrom, setSummaryFrom] = useState<string>(getDefaultWeekFrom);
  const [summaryTo, setSummaryTo] = useState<string>(() => getISTDateString());
  const [summarySearch, setSummarySearch] = useState("");
  const [summaryDept, setSummaryDept] = useState("All");
  const [summaryRecords, setSummaryRecords] = useState<any[]>([]);
  const [summaryUserStats, setSummaryUserStats] = useState<any[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryView, setSummaryView] = useState<"records" | "users">("records");

  const getLogHours = (log: any) => {
    let reg = log.regularHours || 0;
    let ot = log.overtimeHours || 0;
    const isToday = getISTDateString(new Date(log.date)) === getISTDateString();

    if (reg === 0 && ot === 0 && (log.originalClockIn || log.clockIn)) {
      const startMs = new Date(log.originalClockIn || log.clockIn).getTime();
      const endMs = log.clockOut && log.clockOut !== "Active"
        ? new Date(log.clockOut).getTime()
        : (isToday ? Date.now() : startMs + 8 * 3600 * 1000);
      const diffHours = Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
      reg = Math.min(diffHours, 8.0);
      ot = Math.max(0, diffHours - 8.0);
    }
    // Cap total hours to total elapsed time between clockIn and clockOut/now
    if (log.originalClockIn || log.clockIn) {
      const startMs = new Date(log.originalClockIn || log.clockIn).getTime();
      const endMs = log.clockOut && log.clockOut !== "Active"
        ? new Date(log.clockOut).getTime()
        : (isToday ? Date.now() : startMs + 8 * 3600 * 1000);
      const maxHours = Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
      if (reg + ot > maxHours) {
        reg = Math.min(maxHours, 8.0);
        ot = Math.max(0, maxHours - 8.0);
      }
    }
    return { reg, ot, total: reg + ot };
  };

  /**
   * Returns a resolved Date for clockOut, or null if the shift is genuinely active today.
   * For historical unclosed shifts, computes clockIn + logged hours (or 8h) instead of leaving it null/Active.
   */
  const getLogClockOutDate = (log: any): Date | null => {
    if (log.clockOut && log.clockOut !== "Active") {
      return new Date(log.clockOut);
    }
    const isToday = getISTDateString(new Date(log.date)) === getISTDateString();
    if (isToday) {
      return null; // genuinely active today
    }
    const inTimeStr = log.originalClockIn || log.clockIn;
    if (!inTimeStr) return null;
    const inMs = new Date(inTimeStr).getTime();
    const { total } = getLogHours(log);
    const durationHrs = total > 0 ? total : 8.0;
    return new Date(inMs + durationHrs * 3600 * 1000);
  };

  /**
   * Merge multiple attendance records that fall on the same IST calendar day into one.
   * This handles any legacy duplicate documents in the DB.
   * - clockIn  → earliest across the group
   * - clockOut → latest valid clockOut (or null only if currently Active today)
   * - regularHours / overtimeHours → sum across group
   * - All other fields taken from the most-recent record in the group
   */
  const mergeAttendanceByISTDay = (logs: any[]): any[] => {
    const IST_OFF = 5.5 * 60 * 60 * 1000;
    const todayIST = getISTDateString();
    const grouped = new Map<string, any[]>();

    logs.forEach((log) => {
      // Build a composite key: IST date string + userId (string or object id)
      const uid = typeof log.userId === "object" ? (log.userId?._id ?? log.userId) : log.userId;
      const istDay = new Date(new Date(log.date).getTime() + IST_OFF)
        .toISOString().split("T")[0];
      const key = `${istDay}__${uid}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(log);
    });

    const merged: any[] = [];
    grouped.forEach((group, key) => {
      const istDay = key.split("__")[0];
      const isToday = istDay === todayIST;

      if (group.length === 1) {
        const item = { ...group[0] };
        if (!item.clockOut && !isToday && (item.originalClockIn || item.clockIn)) {
          const inTime = new Date(item.originalClockIn || item.clockIn).getTime();
          const totalHrs = (item.regularHours + item.overtimeHours) || 8;
          item.clockOut = new Date(inTime + totalHrs * 3600000).toISOString();
        }
        merged.push(item);
        return;
      }

      // Sort by clockIn ascending so earliest is first
      group.sort((a, b) => {
        const timeA = new Date(a.originalClockIn || a.clockIn).getTime();
        const timeB = new Date(b.originalClockIn || b.clockIn).getTime();
        return timeA - timeB;
      });

      const base = { ...group[group.length - 1] }; // start from the latest record
      base._id     = group[0]._id;                  // keep the first _id for key stability
      base.clockIn = group[0].originalClockIn || group[0].clockIn; // earliest clock-in
      base.originalClockIn = group[0].originalClockIn || group[0].clockIn;

      // ClockOut determination:
      const validClockOuts = group
        .filter((g) => g.clockOut && g.clockOut !== "Active")
        .map((g) => g.clockOut);
      const anyActiveToday = isToday && group.some((g) => !g.clockOut || g.clockOut === "Active");

      if (anyActiveToday) {
        base.clockOut = undefined;
      } else if (validClockOuts.length > 0) {
        base.clockOut = validClockOuts.reduce((latest: any, cur: any) =>
          new Date(cur).getTime() > new Date(latest).getTime() ? cur : latest,
          validClockOuts[0]
        );
      } else if (!isToday && (base.originalClockIn || base.clockIn)) {
        const inTime = new Date(base.originalClockIn || base.clockIn).getTime();
        const totalHrs = (group.reduce((s: number, g: any) => s + (g.regularHours || 0), 0) +
                          group.reduce((s: number, g: any) => s + (g.overtimeHours || 0), 0)) || 8;
        base.clockOut = new Date(inTime + totalHrs * 3600000).toISOString();
      } else {
        base.clockOut = undefined;
      }

      base.regularHours  = group.reduce((s: number, g: any) => s + (g.regularHours  || 0), 0);
      base.overtimeHours = group.reduce((s: number, g: any) => s + (g.overtimeHours || 0), 0);
      merged.push(base);
    });

    // Restore original sort order (most recent first)
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() ||
      new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
    return merged;
  };

  const fetchLoginHoursSummary = async (from?: string, to?: string) => {
    if (!isAdmin && !isOPS) return;
    setSummaryLoading(true);
    try {
      const fromStr = from ?? summaryFrom;
      const toStr = to ?? summaryTo;
      const res = await fetch(`/api/attendance/summary?from=${fromStr}&to=${toStr}&limit=2000`);
      if (res.ok) {
        const data = await res.json();
        setSummaryRecords(data.records || []);
        setSummaryUserStats(data.userSummaries || []);
      }
    } catch (e) {
      console.error("Failed to fetch login/hours summary:", e);
    } finally {
      setSummaryLoading(false);
    }
  };

  const exportSummaryToCSV = () => {
    const target = summaryRecords.filter((r) => {
      const u = typeof r.userId === "object" ? r.userId : null;
      const q = summarySearch.toLowerCase();
      const matchSearch = !q || u?.name?.toLowerCase().includes(q) || u?.email?.toLowerCase().includes(q);
      const matchDept = summaryDept === "All" || u?.department === summaryDept;
      return matchSearch && matchDept;
    });
    if (target.length === 0) { showToast("No data to export.", "error"); return; }
    const headers = ["Employee", "Email", "Role", "Department", "Date", "Clock In (IST)", "Clock Out (IST)", "Duration (hrs)", "Regular Hrs", "Overtime Hrs", "Status"];
    const rows = target.map((r: any) => {
      const u = typeof r.userId === "object" ? r.userId : null;
      const inVal = r.originalClockIn || r.clockIn;
      const isTodayRec = getISTDateString(new Date(r.date)) === getISTDateString();
      const resolvedOut = r.clockOut
        ? new Date(r.clockOut)
        : (!isTodayRec && inVal ? new Date(new Date(inVal).getTime() + (getLogHours(r).total || 8) * 3600000) : null);
      const dur = inVal && resolvedOut
        ? ((resolvedOut.getTime() - new Date(inVal).getTime()) / 3600000).toFixed(2)
        : (isTodayRec && inVal ? "Active" : (r.regularHours ?? "—"));
      return [
        `"${u?.name ?? ""}"`, `"${u?.email ?? ""}"`, `"${u?.role ?? ""}"`, `"${u?.department ?? ""}"`,
        `"${formatISTDate(r.date)}"`,
        `"${inVal ? formatISTTime(inVal) : '--'}"`,
        `"${resolvedOut ? formatISTTime(resolvedOut) : (isTodayRec && inVal ? 'Active' : '--')}"`,
        dur, r.regularHours ?? 0, r.overtimeHours ?? 0, `"${r.status ?? 'Present'}"`
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Login_Hours_Summary_${summaryFrom}_to_${summaryTo}_IST.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Login & Hours Summary exported successfully in IST!", "success");
  };

  const exportAttendanceToCSV = () => {
    // Merge same-day duplicates before export so CSV rows are clean
    const mergedAll = mergeAttendanceByISTDay(attendanceHistory);
    const targetLogs = selectedDateFilter
      ? mergedAll.filter((log) => getISTDateString(new Date(log.date)) === selectedDateFilter)
      : mergedAll;

    if (!targetLogs || targetLogs.length === 0) {
      showToast("No shift log data available for the selected date filter!", "error");
      return;
    }

    const headers = ["Employee", "Email", "Role", "Date", "Status", "Clock In (IST)", "Clock Out (IST)", "Regular Hours", "Overtime Hours"];
    const csvRows = [headers.join(",")];

    targetLogs.forEach((log) => {
      const empObj = typeof log.userId === "object" ? log.userId : null;
      const empName = `"${empObj?.name || 'Employee'}"`;
      const empEmail = `"${empObj?.email || ''}"`;
      const empRole = `"${empObj?.role || 'Employee'}"`;
      const dateStr = `"${formatISTDate(log.date)}"`;
      const statusStr = `"${log.status || 'Present'}"`;
      const clockInStr = `"${(log.originalClockIn || log.clockIn) ? formatISTTime(log.originalClockIn ?? log.clockIn) : '--'}"`;
      const resolvedClockOut = getLogClockOutDate(log);
      const isTodayLog = getISTDateString(new Date(log.date)) === getISTDateString();
      const clockOutStr = `"${resolvedClockOut ? formatISTTime(resolvedClockOut) : (isTodayLog && (log.originalClockIn || log.clockIn) ? 'Active' : '--')}"`;
      const { reg: regHrs, ot: otHrs } = getLogHours(log);

      csvRows.push([empName, empEmail, empRole, dateStr, statusStr, clockInStr, clockOutStr,
        regHrs.toFixed(2), otHrs.toFixed(2)].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Shift_Attendance_Log_${selectedDateFilter || getISTDateString()}_IST.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Shift logs exported to Excel CSV format in IST successfully!", "success");
  };

  const [projectsList, setProjectsList] = useState<string[]>(["General Administration"]);

  const isManagerOrAdmin = Boolean(
    isAdmin ||
    isOPS ||
    currentUser?.role === "Admin" ||
    currentUser?.role === "OPS" ||
    currentUser?.role === "Manager" ||
    can("approveTimesheets") ||
    can("viewTeamTimesheets")
  );

  const fetchEvents = async () => {
    try {
      const deptFilter = currentUser?.department || "All";
      const res = await fetch(`/api/calendar?department=${deptFilter}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSprints = async () => {
    try {
      const res = await fetch("/api/sprints");
      if (res.ok) {
        const data = await res.json();
        setSprints(data.sprints || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        const names: string[] = Array.from(
          new Set(
            (data.projects || [])
              .map((p: any) => (p?.name ? String(p.name).trim() : ""))
              .filter(Boolean)
          )
        );
        if (names.length > 0) {
          setProjectsList(names);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTimesheets = async () => {
    try {
      const startStr = timesheetWeekStart.toISOString();
      const end = new Date(timesheetWeekStart);
      end.setDate(end.getDate() + 6);
      const endStr = end.toISOString();

      const res = await fetch(`/api/timesheets?start=${startStr}&end=${endStr}`);
      if (res.ok) {
        const data = await res.json();
        setTimesheetEntries(data.entries || []);

        if (data.entries && data.entries.length > 0) {
          const rowsMap: { [key: string]: any } = {};
          data.entries.forEach((entry: any) => {
            const key = `${entry.project}-${entry.taskName}`;
            const entryDate = new Date(entry.date);
            const dayIndex = (entryDate.getDay() + 6) % 7;
            
            if (!rowsMap[key]) {
              rowsMap[key] = {
                project: entry.project,
                taskName: entry.taskName,
                comment: entry.comment || "",
                mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0,
                isBillable: entry.isBillable,
                status: entry.status
              };
            } else if (!rowsMap[key].comment && entry.comment) {
              rowsMap[key].comment = entry.comment;
            }
            
            if (dayIndex === 0) rowsMap[key].mon = entry.hours;
            else if (dayIndex === 1) rowsMap[key].tue = entry.hours;
            else if (dayIndex === 2) rowsMap[key].wed = entry.hours;
            else if (dayIndex === 3) rowsMap[key].thu = entry.hours;
            else if (dayIndex === 4) rowsMap[key].fri = entry.hours;
            else if (dayIndex === 5) rowsMap[key].sat = entry.hours;
          });
          setTimesheetRows(Object.values(rowsMap));
        } else {
          setTimesheetRows([
            { project: projectsList[0] || "NexAce CRM Implementation", taskName: "UI/UX Development", comment: "", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, isBillable: true },
            { project: projectsList[1] || "Client Portal Integration", taskName: "API endpoints integration", comment: "", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, isBillable: true },
          ]);
        }
      }  
      if (can("approveTimesheets") || isOPS || isAdmin || currentUser?.role === "Admin" || currentUser?.role === "OPS" || currentUser?.role === "Manager" || can("viewTeamTimesheets")) {
        const pendingRes = await fetch("/api/timesheets?pending=true");
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          setPendingSubmissions(pendingData.entries || []);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttendance = async (loadAll: boolean = false) => {
    try {
      const params = new URLSearchParams();
      if (loadAll) params.append("limit", "all");
      if (isAdmin || isOPS || can("viewTeamTimesheets")) params.append("allUsers", "true");
      const url = `/api/attendance?${params.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAttendanceToday(data.attendance);
        setAttendanceHistory(data.history || []);
        setShiftInfo(data.shiftInfo);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    const loadData = async () => {
      setLoading(true);
      try {
        if (activeTab === "calendar") await fetchEvents();
        else if (activeTab === "sprints") await fetchSprints();
        else if (activeTab === "timesheets") {
          await fetchProjects();
          await fetchTimesheets();
        }
        else if (activeTab === "attendance") await fetchAttendance();
      } catch (err) {
        console.error("Error loading calendar tab data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [activeTab, timesheetWeekStart, mounted, isAdmin, isOPS, currentUser?.role]);

  useEffect(() => {
    if (!mounted) return;
    if (attendanceToday && !attendanceToday.clockOut) {
      const clockInTime = new Date(attendanceToday.originalClockIn || attendanceToday.clockIn).getTime();

      const updateTimer = () => {
        const maxElapsedSecs = Math.max(0, Math.floor((Date.now() - clockInTime) / 1000));
        let totalSecs: number;

        if (attendanceToday.lastResumedAt) {
          const priorSecs = Math.round(((attendanceToday.regularHours || 0) + (attendanceToday.overtimeHours || 0)) * 3600);
          const segmentStart = new Date(attendanceToday.lastResumedAt).getTime();
          const currentSegmentSecs = Math.max(0, Math.floor((Date.now() - segmentStart) / 1000));
          totalSecs = Math.min(priorSecs + currentSegmentSecs, maxElapsedSecs);
        } else {
          totalSecs = maxElapsedSecs;
        }

        setTotalSecondsWorked(totalSecs);

        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        
        const pad = (n: number) => String(n).padStart(2, "0");
        setElapsedTime(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);

      return () => clearInterval(interval);
    } else {
      if (attendanceToday?.clockIn && attendanceToday?.clockOut) {
        const clockInTime = new Date(attendanceToday.originalClockIn || attendanceToday.clockIn).getTime();
        const clockOutTime = new Date(attendanceToday.clockOut).getTime();
        const maxElapsedSecs = Math.max(0, Math.floor((clockOutTime - clockInTime) / 1000));

        const totalWorkedHrs = (attendanceToday.regularHours || 0) + (attendanceToday.overtimeHours || 0);
        const rawSecs = totalWorkedHrs > 0 ? Math.round(totalWorkedHrs * 3600) : maxElapsedSecs;
        const totalSecs = Math.min(rawSecs, maxElapsedSecs);
        setTotalSecondsWorked(totalSecs);

        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        const pad = (n: number) => String(n).padStart(2, "0");
        setElapsedTime(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      } else {
        setElapsedTime("00:00:00");
        setTotalSecondsWorked(0);
      }
    }
  }, [attendanceToday, mounted]);

  const handleOpenScheduleEventModal = (defaultDate?: Date) => {
    const baseDate = defaultDate ? new Date(defaultDate) : new Date();
    // Default start to next 30-min block
    const mins = baseDate.getMinutes();
    const roundedMins = mins < 30 ? 30 : 60;
    baseDate.setMinutes(roundedMins, 0, 0);

    const endDate = new Date(baseDate.getTime() + 60 * 60 * 1000); // 1 hour later

    const pad = (n: number) => String(n).padStart(2, "0");
    const formatISO = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setNewEvtStart(formatISO(baseDate));
    setNewEvtEnd(formatISO(endDate));
    setShowEventModal(true);
  };

  const handleStartDateTimeChange = (val: string) => {
    setNewEvtStart(val);
    if (val) {
      const s = new Date(val);
      if (!isNaN(s.getTime())) {
        const e = new Date(s.getTime() + 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, "0");
        setNewEvtEnd(`${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}T${pad(e.getHours())}:${pad(e.getMinutes())}`);
      }
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvtTitle || !newEvtStart || !newEvtEnd) {
      showToast("Please fill all required fields", "error");
      return;
    }

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEvtTitle,
          description: newEvtDesc,
          type: newEvtType,
          startDate: newEvtStart,
          endDate: newEvtEnd,
          department: newEvtDept,
        }),
      });

      if (res.ok) {
        await fetchEvents();
        setShowEventModal(false);
        setNewEvtTitle("");
        setNewEvtDesc("");
        setNewEvtStart("");
        setNewEvtEnd("");
        showToast("Event scheduled successfully!", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to schedule event.", "error");
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprintName || !newSprintStart || !newSprintEnd) {
      showToast("Please fill all required fields", "error");
      return;
    }

    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSprintName,
          goal: newSprintGoal,
          startDate: newSprintStart,
          endDate: newSprintEnd,
          status: "Planned",
        }),
      });

      if (res.ok) {
        await fetchSprints();
        setShowSprintModal(false);
        setNewSprintName("");
        setNewSprintGoal("");
        setNewSprintStart("");
        setNewSprintEnd("");
        showToast("Sprint planned successfully!", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to plan sprint.", "error");
    }
  };

  const handleUpdateSprintStatus = async (sprintId: string, status: "Active" | "Completed" | "Planned") => {
    try {
      const res = await fetch("/api/sprints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId, status }),
      });
      if (res.ok) {
        await fetchSprints();
        showToast(`Sprint marked as ${status}!`, "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update sprint status.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to update sprint status.", "error");
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    try {
      setDeletingSprint(true);
      const res = await fetch(`/api/sprints?sprintId=${sprintId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchSprints();
        setSprintToDelete(null);
        showToast("Sprint deleted successfully!", "success");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete sprint.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to delete sprint.", "error");
    } finally {
      setDeletingSprint(false);
    }
  };

  const handleClockAction = async (action: "in" | "out" | "resume") => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok) {
        setAttendanceToday(data.attendance);
        await fetchAttendance();
        showToast(
          action === "resume"
            ? "Shift resumed successfully!"
            : `Successfully clocked ${action === "in" ? "In" : "Out"}!`,
          "success"
        );
      } else {
        showToast(data.error || "Clocking failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Attendance logging failed.", "error");
    }
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    const updated = [...timesheetRows];
    updated[index][field] = value;
    setTimesheetRows(updated);
  };

  const handleAddTimesheetRow = () => {
    setTimesheetRows([
      ...timesheetRows,
      { project: projectsList[0] || "NexAce CRM Implementation", taskName: "", comment: "", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, isBillable: true },
    ]);
  };

  const handleDeleteTimesheetRow = (idx: number) => {
    const targetRow = timesheetRows[idx];
    if (!targetRow) return;

    // Check if this row has any logged hours or saved content
    const rowHours = (Number(targetRow.mon) || 0) + (Number(targetRow.tue) || 0) + (Number(targetRow.wed) || 0) + (Number(targetRow.thu) || 0) + (Number(targetRow.fri) || 0) + (Number(targetRow.sat) || 0);

    // If it's a completely empty unsaved draft row, delete immediately without prompting modal
    if (rowHours === 0 && (!targetRow.taskName || targetRow.taskName.trim() === "")) {
      const updated = timesheetRows.filter((_, i) => i !== idx);
      if (updated.length === 0) {
        setTimesheetRows([
          { project: projectsList[0] || "NexAce CRM Implementation", taskName: "", comment: "", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, isBillable: true },
        ]);
      } else {
        setTimesheetRows(updated);
      }
      return;
    }

    setTimesheetRowToDelete({
      index: idx,
      project: targetRow.project,
      taskName: targetRow.taskName || "General Tasks",
    });
  };

  const handleConfirmDeleteTimesheetRow = async () => {
    if (!timesheetRowToDelete) return;
    const { index, project, taskName } = timesheetRowToDelete;
    const targetRow = timesheetRows[index];

    setDeletingTimesheetRow(true);

    const start = new Date(timesheetWeekStart);
    const end = new Date(timesheetWeekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    try {
      if (project) {
        await fetch("/api/timesheets", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            taskName: targetRow?.taskName || taskName || "",
            start: start.toISOString(),
            end: end.toISOString(),
          }),
        });
      }
    } catch (err) {
      console.error("Error deleting timesheet row from DB:", err);
    } finally {
      setDeletingTimesheetRow(false);
      setTimesheetRowToDelete(null);
    }

    setTimesheetRows((prevRows) => {
      const updated = prevRows.filter((_, i) => i !== index);
      if (updated.length === 0) {
        return [
          { project: projectsList[0] || "NexAce CRM Implementation", taskName: "", comment: "", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, isBillable: true },
        ];
      }
      return updated;
    });

    setTimesheetEntries((prevEntries) =>
      prevEntries.filter((e) => !(e.project === project && (e.taskName === (targetRow?.taskName || taskName) || !targetRow?.taskName)))
    );

    showToast("Timesheet row deleted!", "success");
  };

  const handleSaveTimesheet = async (submitStatus: "Draft" | "Pending") => {
    const entryPayload: any[] = [];
    const weekdaysOffset = [0, 1, 2, 3, 4, 5];
    let hasAnyPositiveHours = false;

    timesheetRows.forEach((row) => {
      const days = ["mon", "tue", "wed", "thu", "fri", "sat"];
      days.forEach((day, index) => {
        const hoursVal = Number(row[day]) || 0;
        if (hoursVal > 0) {
          hasAnyPositiveHours = true;
        }
        const entryDate = new Date(timesheetWeekStart);
        entryDate.setDate(entryDate.getDate() + weekdaysOffset[index]);
        
        entryPayload.push({
          project: row.project,
          taskName: row.taskName || "General Tasks",
          comment: row.comment ? String(row.comment).trim() : "",
          hours: hoursVal,
          date: entryDate,
          isBillable: row.isBillable !== false,
          status: submitStatus,
        });
      });
    });

    if (submitStatus === "Pending" && !hasAnyPositiveHours) {
      showToast("Please log at least one hour before submitting!", "error");
      return;
    }

    try {
      const res = await fetch("/api/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryPayload),
      });

      if (res.ok) {
        await fetchTimesheets();
        showToast(submitStatus === "Pending" ? "Timesheet submitted for approval!" : "Timesheet draft saved!", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to save timesheet.", "error");
    }
  };

  const handleTimesheetApproval = async (entryId: string, status: "Approved" | "Rejected") => {
    try {
      const res = await fetch("/api/timesheets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryIds: [entryId], status }),
      });
      if (res.ok) {
        await fetchTimesheets();
        showToast(`Timesheet entry ${status}!`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to process timesheet entry.", "error");
    }
  };

  const handleDuplicateTimesheetRow = (idx: number) => {
    const row = timesheetRows[idx];
    if (!row) return;
    const newRow = {
      ...row,
      mon: 0,
      tue: 0,
      wed: 0,
      thu: 0,
      fri: 0,
      sat: 0,
      comment: "",
    };
    const updated = [...timesheetRows];
    updated.splice(idx + 1, 0, newRow);
    setTimesheetRows(updated);
    showToast("Timesheet row duplicated!", "success");
  };

  const handleAutoFillStandardHours = (targetRowIndex: number = 0) => {
    if (timesheetRows.length === 0) return;
    const updated = [...timesheetRows];
    const idx = Math.min(targetRowIndex, updated.length - 1);
    if (updated[idx]) {
      updated[idx] = {
        ...updated[idx],
        mon: 8,
        tue: 8,
        wed: 8,
        thu: 8,
        fri: 8,
        sat: 0,
      };
      setTimesheetRows(updated);
      showToast("Filled standard 40-hour work week (8h Mon–Fri)!", "success");
    }
  };

  const exportTimesheetToCSV = () => {
    if (timesheetRows.length === 0) {
      showToast("No timesheet entries to export.", "error");
      return;
    }
    const weekLabel = timesheetWeekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    let csv = `Week of,${weekLabel}\n`;
    csv += `Project,Task Description,Comment / Notes,Mon,Tue,Wed,Thu,Fri,Sat,Total Hours,Billable,Status\n`;

    timesheetRows.forEach((row) => {
      const total = (Number(row.mon) || 0) + (Number(row.tue) || 0) + (Number(row.wed) || 0) + (Number(row.thu) || 0) + (Number(row.fri) || 0) + (Number(row.sat) || 0);
      const escapeCsv = (val: string) => `"${(val || "").replace(/"/g, '""')}"`;
      csv += `${escapeCsv(row.project)},${escapeCsv(row.taskName)},${escapeCsv(row.comment)},${row.mon || 0},${row.tue || 0},${row.wed || 0},${row.thu || 0},${row.fri || 0},${row.sat || 0},${total},${row.isBillable ? "Yes" : "No"},${row.status || "Draft"}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `timesheet_week_${timesheetWeekStart.toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Timesheet exported to CSV successfully!", "success");
  };

  const currentWeekStatus = useMemo(() => {
    if (timesheetEntries.length === 0) return "Draft";
    const statuses = timesheetEntries.map((e: any) => e.status);
    if (statuses.some((s: string) => s === "Pending")) return "Pending";
    if (statuses.every((s: string) => s === "Approved")) return "Approved";
    if (statuses.some((s: string) => s === "Rejected")) return "Rejected";
    return "Draft";
  }, [timesheetEntries]);

  const timesheetDailyTotals = useMemo(() => {
    const totals = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, grand: 0, billable: 0, nonBillable: 0 };
    timesheetRows.forEach((row) => {
      const m = Number(row.mon) || 0;
      const tu = Number(row.tue) || 0;
      const w = Number(row.wed) || 0;
      const th = Number(row.thu) || 0;
      const f = Number(row.fri) || 0;
      const sa = Number(row.sat) || 0;
      totals.mon += m;
      totals.tue += tu;
      totals.wed += w;
      totals.thu += th;
      totals.fri += f;
      totals.sat += sa;
      const rowTotal = m + tu + w + th + f + sa;
      totals.grand += rowTotal;
      if (row.isBillable) totals.billable += rowTotal;
      else totals.nonBillable += rowTotal;
    });
    return totals;
  }, [timesheetRows]);


  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const daysArray = getDaysInMonth();
  const monthsNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const exportCalendarToCSV = (scope: "month" | "all" = "month") => {
    let targetEvents = [...events];
    if (scope === "month") {
      const targetMonth = currentDate.getMonth();
      const targetYear = currentDate.getFullYear();
      targetEvents = targetEvents.filter((evt) => {
        const start = new Date(evt.startDate);
        const end = new Date(evt.endDate || evt.startDate);
        return (
          (start.getMonth() === targetMonth && start.getFullYear() === targetYear) ||
          (end.getMonth() === targetMonth && end.getFullYear() === targetYear) ||
          (start <= new Date(targetYear, targetMonth + 1, 0) && end >= new Date(targetYear, targetMonth, 1))
        );
      });
    }

    if (filterType !== "All") {
      targetEvents = targetEvents.filter((e) => e.type === filterType);
    }

    if (targetEvents.length === 0) {
      showToast("No calendar events found to export for this selection.", "error");
      return;
    }

    const headers = [
      "Event Title",
      "Event Type",
      "Source",
      "Start Date",
      "Start Time (IST)",
      "End Date",
      "End Time (IST)",
      "Department",
      "Organizer / Assignee",
      "Priority",
      "Status",
      "Description",
    ];

    const rows = targetEvents.map((evt) => {
      const startDateObj = evt.startDate ? new Date(evt.startDate) : null;
      const endDateObj = evt.endDate ? new Date(evt.endDate) : null;
      const userName = typeof evt.userId === "object" ? evt.userId?.name || "Unassigned" : "Team Member";
      const cleanDesc = (evt.description || "").replace(/[\r\n]+/g, " ").trim();

      return [
        evt.title || "Untitled",
        evt.type || "General",
        evt.source || (evt.isSynced ? "synced_task" : "manual_event"),
        startDateObj ? formatISTDate(startDateObj) : "N/A",
        startDateObj ? formatISTTime(startDateObj) : "N/A",
        endDateObj ? formatISTDate(endDateObj) : "N/A",
        endDateObj ? formatISTTime(endDateObj) : "N/A",
        evt.department || "All",
        userName,
        evt.priority || "Normal",
        evt.taskStatus || "Active",
        cleanDesc,
      ];
    });

    const csv = "\uFEFF" + [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const scopeLabel = scope === "month" ? `${monthsNames[currentDate.getMonth()]}_${currentDate.getFullYear()}` : "All_Events";
    link.setAttribute("download", `Calendar_Schedule_${scopeLabel}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${targetEvents.length} calendar event(s) to CSV!`, "success");
  };

  const exportCalendarToICS = (scope: "month" | "all" = "month") => {
    let targetEvents = [...events];
    if (scope === "month") {
      const targetMonth = currentDate.getMonth();
      const targetYear = currentDate.getFullYear();
      targetEvents = targetEvents.filter((evt) => {
        const start = new Date(evt.startDate);
        const end = new Date(evt.endDate || evt.startDate);
        return (
          (start.getMonth() === targetMonth && start.getFullYear() === targetYear) ||
          (end.getMonth() === targetMonth && end.getFullYear() === targetYear) ||
          (start <= new Date(targetYear, targetMonth + 1, 0) && end >= new Date(targetYear, targetMonth, 1))
        );
      });
    }

    if (filterType !== "All") {
      targetEvents = targetEvents.filter((e) => e.type === filterType);
    }

    if (targetEvents.length === 0) {
      showToast("No calendar events found to export for this selection.", "error");
      return;
    }

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    };

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//NexAce CRM//Calendar Schedule//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    targetEvents.forEach((evt) => {
      const start = evt.startDate ? new Date(evt.startDate) : new Date();
      let end = evt.endDate ? new Date(evt.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
      if (end <= start) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }

      const uid = `${evt._id || Math.random().toString(36).substring(2)}@nexace.crm`;
      const title = (evt.title || "Untitled Event").replace(/[,;\\]/g, " ");
      const desc = (evt.description || "").replace(/[\r\n]+/g, "\\n").replace(/[,;\\]/g, " ");
      const userName = typeof evt.userId === "object" ? evt.userId?.name || "" : "";

      icsLines.push("BEGIN:VEVENT");
      icsLines.push(`UID:${uid}`);
      icsLines.push(`DTSTAMP:${formatICSDate(new Date())}`);
      icsLines.push(`DTSTART:${formatICSDate(start)}`);
      icsLines.push(`DTEND:${formatICSDate(end)}`);
      icsLines.push(`SUMMARY:${title}`);
      if (desc) icsLines.push(`DESCRIPTION:${desc}${userName ? ` (Organizer: ${userName})` : ""}`);
      if (evt.type) icsLines.push(`CATEGORIES:${evt.type}`);
      if (evt.department) icsLines.push(`LOCATION:${evt.department} Department`);
      icsLines.push("STATUS:CONFIRMED");
      icsLines.push("END:VEVENT");
    });

    icsLines.push("END:VCALENDAR");

    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const scopeLabel = scope === "month" ? `${monthsNames[currentDate.getMonth()]}_${currentDate.getFullYear()}` : "All_Events";
    link.setAttribute("download", `Calendar_Schedule_${scopeLabel}_${new Date().toISOString().split("T")[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${targetEvents.length} event(s) to iCalendar (.ics) format!`, "success");
  };

  const exportSprintsToCSV = () => {
    if (sprints.length === 0) {
      showToast("No sprints available to export.", "error");
      return;
    }

    const headers = [
      "Sprint ID",
      "Sprint Name",
      "Goal",
      "Status",
      "Start Date",
      "End Date",
      "Tasks Count",
      "Completed Tasks",
      "Created At"
    ];

    const rows = sprints.map((s) => {
      const taskCount = Array.isArray(s.tasks) ? s.tasks.length : (s.taskIds?.length || 0);
      const completedCount = Array.isArray(s.tasks)
        ? s.tasks.filter((t: any) => t.status === "Done").length
        : 0;

      return [
        s._id,
        s.name || "Untitled Sprint",
        (s.goal || "").replace(/[\r\n]+/g, " ").trim(),
        s.status || "Draft",
        s.startDate ? formatISTDate(new Date(s.startDate)) : "N/A",
        s.endDate ? formatISTDate(new Date(s.endDate)) : "N/A",
        taskCount,
        completedCount,
        s.createdAt ? formatISTDate(new Date(s.createdAt)) : "",
      ];
    });

    const csv = "\uFEFF" + [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Sprints_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${sprints.length} sprint(s) to CSV!`, "success");
  };

  if (!mounted || authLoading) {
    return <Preloader label="Loading Calendar & Operations..." />;
  }

  return (
    <div className="space-y-6">
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

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Calendar, Sprints & Time</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Team calendar schedules, sprint planning, client billable timesheets, and shift attendance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "calendar" && (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 font-semibold">
                    <i className="fa-solid fa-file-export text-xs text-primary" /> Export Calendar
                    <i className="fa-solid fa-chevron-down text-[10px] ml-0.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Export Calendar Schedule</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => exportCalendarToCSV("month")} className="gap-2 cursor-pointer text-xs">
                    <i className="fa-solid fa-file-csv text-emerald-500" /> Current Month (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportCalendarToCSV("all")} className="gap-2 cursor-pointer text-xs">
                    <i className="fa-solid fa-file-excel text-emerald-600" /> All Events (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => exportCalendarToICS("month")} className="gap-2 cursor-pointer text-xs">
                    <i className="fa-solid fa-calendar-arrow-down text-primary" /> Current Month (.ics / iCal)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportCalendarToICS("all")} className="gap-2 cursor-pointer text-xs">
                    <i className="fa-solid fa-calendar-plus text-primary" /> All Events (.ics / iCal)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button color="primary" size="sm" onClick={() => handleOpenScheduleEventModal()} className="gap-2 font-semibold">
                <i className="fa-solid fa-plus text-xs" /> Schedule Event
              </Button>
            </div>
          )}

          {activeTab === "sprints" && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportSprintsToCSV} className="gap-1.5 text-xs font-semibold">
                <i className="fa-solid fa-file-csv text-emerald-500 text-xs" /> Export Sprints
              </Button>
              {(isAdmin || isOPS || currentUser?.role === "Manager" || can("createSprints")) && (
                <Button color="primary" size="sm" onClick={() => setShowSprintModal(true)} className="gap-2 font-semibold cursor-pointer">
                  <i className="fa-solid fa-rocket text-xs" /> Plan Sprint
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("calendar")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "calendar"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-calendar-days text-sm" /> Shared Calendar
        </button>

        <button
          onClick={() => setActiveTab("sprints")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "sprints"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-rocket text-sm" /> Sprint Board
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
          <i className="fa-solid fa-file-csv text-sm" /> Timesheets
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "attendance"
              ? "border-primary text-primary bg-primary/10 rounded-t-md font-semibold -mb-px"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-fingerprint text-sm" /> Shift Clock
        </button>
      </div>

      {/* Tab 1: Calendar */}
      {activeTab === "calendar" && (
        <Card className="p-6 space-y-6">
          {/* Calendar Header: Month Strip + Controls */}
          <div className="space-y-3 pb-4 border-b border-border">
            {/* Top row: prev/next + month title banner + filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8 shrink-0">
                  <i className="fa-solid fa-chevron-left text-xs" />
                </Button>

                {/* Month title display */}
                <div className="px-4 py-1.5 rounded-lg bg-primary/10 dark:bg-primary/15 border border-primary/40 shadow-xs">
                  <h2 className="text-base font-bold text-foreground text-center whitespace-nowrap">
                    <span className="text-primary font-extrabold">{monthsNames[currentDate.getMonth()]}</span>{" "}
                    <span className="text-foreground">{currentDate.getFullYear()}</span>
                  </h2>
                </div>

                <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8 shrink-0">
                  <i className="fa-solid fa-chevron-right text-xs" />
                </Button>

                {/* Today button */}
                {(currentDate.getMonth() !== new Date().getMonth() || currentDate.getFullYear() !== new Date().getFullYear()) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                    className="h-8 text-xs gap-1.5 font-bold text-primary border-primary/50 bg-primary/5 hover:bg-primary/15 shadow-xs"
                  >
                    <i className="fa-regular fa-circle-dot text-xs" /> Today
                  </Button>
                )}
              </div>
            </div>

            {/* Month Strip: all 12 months, active and current month highlighted with primary styling */}
            {(() => {
              const now = new Date();
              const realMonth = now.getMonth();
              const realYear = now.getFullYear();
              const activeMonth = currentDate.getMonth();
              const activeYear = currentDate.getFullYear();

              return (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {monthsNames.map((name, idx) => {
                    const isViewedMonth = idx === activeMonth;
                    const isActualCurrentMonth = idx === realMonth && activeYear === realYear;

                    return (
                      <button
                        key={name}
                        onClick={() => setCurrentDate(new Date(activeYear, idx, 1))}
                        className={cn(
                          "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                          // Current Month is always highlighted with solid primary color
                          isActualCurrentMonth
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/30 font-extrabold ring-2 ring-primary/40 scale-105"
                            : isViewedMonth
                            ? "bg-primary/20 text-primary border-2 border-primary/60 font-extrabold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent"
                        )}
                        title={isActualCurrentMonth ? `Current Month (${name})` : name}
                      >
                        <span>{name.slice(0, 3)}</span>
                        {isActualCurrentMonth && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground inline-block align-middle" />
                        )}
                      </button>
                    );
                  })}

                  {/* Year navigation */}
                  <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border shrink-0">
                    <button
                      onClick={() => setCurrentDate(new Date(activeYear - 1, activeMonth, 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Previous year"
                    >
                      <i className="fa-solid fa-chevron-left text-[10px]" />
                    </button>
                    <span className="text-xs font-bold text-foreground px-1 min-w-[38px] text-center">{activeYear}</span>
                    <button
                      onClick={() => setCurrentDate(new Date(activeYear + 1, activeMonth, 1))}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Next year"
                    >
                      <i className="fa-solid fa-chevron-right text-[10px]" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Enhanced Calendar Month Grid */}
          {(() => {
            const getEventTypeStyle = (type: string) => {
              switch (type) {
                case "Holiday":
                  return "bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25";
                case "Deadline":
                  return "bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/25";
                case "Birthday":
                  return "bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25";
                case "Personal":
                  return "bg-sky-500/15 text-sky-500 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/25";
                case "Meeting":
                default:
                  return "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25";
              }
            };

            return (
              <div className="overflow-x-auto">
                <div className="min-w-[700px] space-y-2">
                  {/* Weekday headers — highlight today's column */}
                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, colIdx) => {
                      const todayColIdx = new Date().getDay(); // 0=Sun … 6=Sat
                      const isTodayCol = colIdx === todayColIdx &&
                        currentDate.getMonth() === new Date().getMonth() &&
                        currentDate.getFullYear() === new Date().getFullYear();
                      return (
                        <div
                          key={day}
                          className={cn(
                            "py-2 px-1 text-center text-xs font-bold uppercase rounded-lg border shadow-xs",
                            isTodayCol
                              ? "bg-primary/20 border-primary/50 text-primary dark:text-primary"
                              : "bg-muted/80 dark:bg-slate-800/90 border-border/80 dark:border-slate-700/80 text-foreground"
                          )}
                        >
                          {day}
                          {isTodayCol && <span className="block w-1 h-1 rounded-full bg-primary mx-auto mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {daysArray.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} className="bg-muted/10 dark:bg-slate-900/20 border border-border/30 dark:border-slate-800/40 rounded-xl min-h-[115px] p-2 opacity-30" />;
                      
                      const dayStr = day.getDate();
                      const isToday = new Date().toDateString() === day.toDateString();
                      
                      const dayEvents = events.filter((evt) => {
                        const start = new Date(evt.startDate);
                        start.setHours(0,0,0,0);
                        const end = new Date(evt.endDate);
                        end.setHours(23,59,59,999);

                        const matchesDate = day >= start && day <= end;
                        const matchesType = filterType === "All" || evt.type === filterType;
                        const matchesDept = filterDept === "All" || evt.department === filterDept || evt.department === "All";

                        return matchesDate && matchesType && matchesDept;
                      });

                      const hasEvents = dayEvents.length > 0;
                      const isSelected = selectedDay?.toDateString() === day.toDateString();

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedDay(isSelected ? null : day)}
                          className={cn(
                            "relative p-2.5 min-h-[120px] max-h-[140px] rounded-xl border flex flex-col justify-start gap-1.5 transition-all duration-200 group shadow-xs overflow-hidden cursor-pointer",
                            isToday
                              ? "bg-primary/15 border-2 border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/15"
                              : isSelected
                              ? "bg-primary/10 border-2 border-primary/70 ring-1 ring-primary/30 shadow-md"
                              : hasEvents
                              ? "bg-card dark:bg-slate-900/95 border-primary/40 dark:border-primary/30 shadow-xs hover:border-primary/70 hover:shadow-md hover:bg-accent/40"
                              : "bg-card/90 dark:bg-slate-900/60 border-border dark:border-slate-800/90 hover:border-primary/50 hover:bg-accent/30"
                          )}
                        >
                          <div className="flex items-center justify-between shrink-0">
                            <span
                              className={cn(
                                "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all",
                                isToday
                                  ? "bg-primary text-primary-foreground font-extrabold shadow-md text-sm scale-110"
                                  : isSelected
                                  ? "bg-primary/20 text-primary font-extrabold ring-1 ring-primary/50"
                                  : hasEvents
                                  ? "bg-primary/15 text-primary font-bold"
                                  : "text-muted-foreground group-hover:text-foreground font-semibold"
                              )}
                            >
                              {dayStr}
                            </span>
                            {hasEvents && (
                              <span className="flex h-2 w-2 relative shrink-0" title={`${dayEvents.length} Event(s)`}>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 overflow-y-auto max-h-[80px] pr-0.5 no-scrollbar flex-1">
                            {dayEvents.map((evt) => (
                              <div
                                key={evt._id}
                                onClick={() => setSelectedEvent(evt)}
                                className={cn(
                                  "text-[10px] font-semibold px-2 py-1 rounded-md truncate cursor-pointer transition-all duration-150 flex items-center gap-1.5 border shadow-2xs leading-tight",
                                  getEventTypeStyle(evt.type)
                                )}
                                title={evt.title}
                              >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current" />
                                <span className="truncate">{evt.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Calendar Analytics & Event Breakdown Graph */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-border">
            {/* Event Distribution Donut / Pie Chart Card */}
            <Card className="md:col-span-2 p-5 border border-border/80 bg-card/60">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-primary text-sm" />
                  <h3 className="text-sm font-bold text-foreground">Event Category Breakdown & Donut Analytics</h3>
                </div>
                <div className="flex items-center gap-2">
                  {filterType !== "All" && (
                    <button
                      onClick={() => setFilterType("All")}
                      className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold text-rose-500 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-xmark text-[10px]" /> Clear Filter
                    </button>
                  )}
                  <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/30">
                    {filterType === "All"
                      ? `${events.length} Total Schedule Events`
                      : `${events.filter((e) => e.type === filterType).length} ${filterType} Events`}
                  </Badge>
                </div>
              </div>

              {(() => {
                const categories = [
                  { label: "Meetings & Syncs", type: "Meeting", color: "#6366f1", bgClass: "bg-indigo-500" },
                  { label: "Project Deadlines", type: "Deadline", color: "#f43f5e", bgClass: "bg-rose-500" },
                  { label: "Holidays & Time Off", type: "Holiday", color: "#10b981", bgClass: "bg-emerald-500" },
                  { label: "Anniversaries & Celebrations", type: "Birthday", color: "#f59e0b", bgClass: "bg-amber-500" },
                  { label: "Personal Events", type: "Personal", color: "#0284c7", bgClass: "bg-sky-500" },
                ];

                const total = events.length;
                let accumulatedAngle = 0;

                const pieSlices = categories.map((cat) => {
                  const count = events.filter((e) => e.type === cat.type).length;
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  const startAngle = accumulatedAngle;
                  const sliceAngle = (percentage / 100) * 360;
                  accumulatedAngle += sliceAngle;
                  return { ...cat, count, percentage, startAngle, sliceAngle };
                });

                // Generate SVG Conical / Conic Donut Gradient String with dimming for inactive slices
                const gradientStops = pieSlices.map((slice) => {
                  const endAngle = slice.startAngle + slice.sliceAngle;
                  const isActive = filterType === "All" || filterType === slice.type;
                  const hexColor = isActive ? slice.color : `${slice.color}33`; // 20% opacity hex when dimmed
                  return `${hexColor} ${slice.startAngle}deg ${endAngle}deg`;
                }).join(", ");

                const conicStyle = total > 0 
                  ? { background: `conic-gradient(${gradientStops})` }
                  : { background: "var(--border)" };

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pt-5">
                    {/* SVG/CSS Donut Chart Ring */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center relative py-2">
                      <div
                        onClick={() => {
                          const activeIndex = categories.findIndex((c) => c.type === filterType);
                          const nextIndex = (activeIndex + 1) % categories.length;
                          setFilterType(categories[nextIndex].type);
                        }}
                        title="Click to cycle event category filters"
                        className="relative w-44 h-44 rounded-full flex items-center justify-center shadow-xl p-3 border border-border/40 transition-all duration-300 hover:scale-105 cursor-pointer group"
                        style={conicStyle}
                      >
                        {/* Inner Hole for Donut effect */}
                        <div className="w-28 h-28 rounded-full bg-card border border-border/60 flex flex-col items-center justify-center text-center shadow-inner backdrop-blur-md transition-colors group-hover:border-primary/50">
                          <span className="text-2xl font-black font-mono text-foreground tracking-tight">
                            {filterType === "All" ? total : events.filter((e) => e.type === filterType).length}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider group-hover:text-primary transition-colors">
                            {filterType === "All" ? "Events" : filterType}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-2 font-medium">Click chart ring to cycle category</span>
                    </div>

                    {/* Donut Legend Items */}
                    <div className="sm:col-span-7 space-y-2.5">
                      {pieSlices.map((slice) => {
                        const isSelected = filterType === slice.type;
                        return (
                          <div
                            key={slice.type}
                            onClick={() => {
                              if (filterType === slice.type) {
                                setFilterType("All");
                              } else {
                                setFilterType(slice.type);
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer text-xs group",
                              isSelected
                                ? "border-primary bg-primary/10 shadow-sm"
                                : "border-border/50 bg-accent/20 hover:bg-accent/50 hover:border-border"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={cn("w-3 h-3 rounded-full shrink-0 shadow-xs transition-transform group-hover:scale-110", slice.bgClass)} />
                              <span className={cn("font-semibold truncate", isSelected ? "text-primary font-bold" : "text-foreground/90")}>
                                {slice.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-bold text-foreground font-mono">{slice.count}</span>
                              <span className={cn("text-[11px] font-semibold font-mono min-w-[38px] text-right", isSelected ? "text-primary" : "text-muted-foreground")}>
                                {Math.round(slice.percentage)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* Quick Metrics Breakdown Card */}
            <Card className="p-5 border border-border/80 bg-card/60 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                  <i className="fa-solid fa-clock-rotate-left text-amber-500 text-sm" />
                  <h3 className="text-sm font-bold text-foreground">Schedule Velocity</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-border/60 bg-accent/20 flex items-center justify-between">
                    <span className="text-muted-foreground">This Month's Meetings</span>
                    <span className="font-bold text-foreground font-mono text-sm">
                      {events.filter((e) => e.type === "Meeting").length}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-accent/20 flex items-center justify-between">
                    <span className="text-muted-foreground">Upcoming Deadlines</span>
                    <span className="font-bold text-rose-500 font-mono text-sm">
                      {events.filter((e) => e.type === "Deadline").length}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg border border-border/60 bg-accent/20 flex items-center justify-between">
                    <span className="text-muted-foreground">Company Holidays</span>
                    <span className="font-bold text-emerald-500 font-mono text-sm">
                      {events.filter((e) => e.type === "Holiday").length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60 text-[11px] text-muted-foreground text-center">
                <i className="fa-solid fa-circle-check text-emerald-500 mr-1.5" />
                Real-time MongoDB Calendar Analytics
              </div>
            </Card>
          </div>
        </Card>
      )}

      {/* Tab 2: Sprints */}
      {activeTab === "sprints" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <i className="fa-solid fa-rocket text-primary text-base" /> Active Sprint & Burndown
                </CardTitle>
                <CardDescription>Current sprint objective, milestone progress, and velocity</CardDescription>
              </div>
              {(isAdmin || isOPS || currentUser?.role === "Manager" || can("createSprints")) && (
                <Button size="sm" color="primary" onClick={() => setShowSprintModal(true)} className="gap-1.5 font-semibold cursor-pointer">
                  <i className="fa-solid fa-plus text-xs" /> Plan New Sprint
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {sprints.filter((s) => s.status === "Active").length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <i className="fa-solid fa-person-running text-4xl text-muted-foreground/40 block mx-auto" />
                  <p className="text-base font-semibold text-foreground">No active sprint running right now</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Activate a planned sprint from the backlog or plan a new sprint cycle to start tracking task burndown velocity.
                  </p>
                </div>
              ) : (
                sprints.filter((s) => s.status === "Active").map((active) => (
                  <div key={active._id} className="space-y-5 p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-foreground">{active.name}</h3>
                          <Badge color="primary" className="font-semibold gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <strong className="text-foreground">Goal:</strong> {active.goal || "Complete sprint deliverables and milestone items."}
                        </p>
                      </div>
                      <div className="text-right sm:text-right text-xs text-muted-foreground shrink-0 font-mono">
                        <p className="font-semibold text-foreground">
                          {new Date(active.startDate).toLocaleDateString()} – {new Date(active.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-[11px] text-primary mt-0.5">{active.totalTasks || 0} Linked Tasks</p>
                      </div>
                    </div>

                    {/* Burndown Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-fire text-amber-500 text-xs" /> Burndown Progress
                        </span>
                        <span className="text-primary font-bold">{active.burndownProgress || 0}% Completed</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden border border-border/40">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(active.burndownProgress || 0, 3)}%` }}
                        />
                      </div>
                    </div>

                    {/* Task Breakdown Stats */}
                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-0.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">To Do</span>
                        <p className="font-bold text-base text-foreground">{active.todoTasks || 0}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">In Progress</span>
                        <p className="font-bold text-base text-amber-600 dark:text-amber-400">{active.inProgressTasks || 0}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
                        <p className="font-bold text-base text-emerald-600 dark:text-emerald-400">{active.completedTasks || 0}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/60">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/projects" className="gap-1.5 text-xs text-primary">
                          <i className="fa-solid fa-folder-tree text-xs" /> View in Projects Board
                        </Link>
                      </Button>

                      {(isAdmin || isOPS || currentUser?.role === "Manager" || can("completeSprints")) && (
                        <Button
                          size="sm"
                          color="primary"
                          onClick={() => handleUpdateSprintStatus(active._id, "Completed")}
                          className="gap-1.5 font-semibold text-xs cursor-pointer"
                        >
                          <i className="fa-solid fa-flag-checkered text-xs" /> Complete Sprint
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Sprints Backlog & Roadmap */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-primary text-sm" /> Sprint Roadmap & Backlog
              </CardTitle>
              <CardDescription>Planned and completed sprint cycles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sprints.filter((s) => s.status !== "Active").length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No other sprints in roadmap.</p>
              ) : (
                sprints.filter((s) => s.status !== "Active").map((sprint) => (
                  <div key={sprint._id} className="p-3.5 rounded-xl border border-border bg-card space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-foreground text-sm">{sprint.name}</p>
                        <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                          {new Date(sprint.startDate).toLocaleDateString()} – {new Date(sprint.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge color={sprint.status === "Planned" ? "warning" : "success"} variant="soft" className="text-[10px]">
                        {sprint.status}
                      </Badge>
                    </div>

                    {sprint.goal && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {sprint.goal}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {sprint.totalTasks || 0} tasks ({sprint.burndownProgress || 0}% done)
                      </span>

                      <div className="flex items-center gap-1.5">
                        {sprint.status === "Planned" && (isAdmin || isOPS || currentUser?.role === "Manager" || can("createSprints")) && (
                          <button
                            type="button"
                            onClick={() => handleUpdateSprintStatus(sprint._id, "Active")}
                            className="px-2 py-1 text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors cursor-pointer"
                          >
                            Activate
                          </button>
                        )}
                        {(isAdmin || isOPS || can("deleteSprints")) && (
                          <button
                            type="button"
                            onClick={() => setSprintToDelete({ id: sprint._id, name: sprint.name })}
                            className="px-2 py-1 text-[10px] font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-md transition-colors cursor-pointer"
                            title="Delete Sprint"
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Timesheets */}
      {activeTab === "timesheets" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timesheet Entry Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <i className="fa-solid fa-file-csv text-primary text-base" /> Log Weekly Hours
                    </CardTitle>
                    {/* Week Status Badge */}
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5",
                        currentWeekStatus === "Approved" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                        currentWeekStatus === "Pending" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                        currentWeekStatus === "Rejected" && "bg-rose-500/10 text-rose-500 border-rose-500/20",
                        currentWeekStatus === "Draft" && "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {currentWeekStatus === "Approved" && <i className="fa-solid fa-circle-check text-[10px]" />}
                      {currentWeekStatus === "Pending" && <i className="fa-solid fa-clock-rotate-left text-[10px]" />}
                      {currentWeekStatus === "Rejected" && <i className="fa-solid fa-circle-xmark text-[10px]" />}
                      {currentWeekStatus === "Draft" && <i className="fa-solid fa-pen-ruler text-[10px]" />}
                      {currentWeekStatus === "Pending" ? "Pending Approval" : currentWeekStatus}
                    </span>
                  </div>
                  <CardDescription>Record daily project hours with billable tracking and approvals</CardDescription>
                </div>
                
                {/* Week Selector & Quick Tools */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const d = new Date();
                      const day = d.getDay();
                      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                      const mon = new Date(d.setDate(diff));
                      mon.setHours(0, 0, 0, 0);
                      setTimesheetWeekStart(mon);
                    }}
                    className="text-xs h-8 px-2.5"
                    title="Jump to current week"
                  >
                    This Week
                  </Button>
                  <div className="flex items-center bg-muted/40 rounded-lg p-0.5 border border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        const prev = new Date(timesheetWeekStart);
                        prev.setDate(prev.getDate() - 7);
                        setTimesheetWeekStart(prev);
                      }}
                      title="Previous Week"
                    >
                      <i className="fa-solid fa-chevron-left text-xs" />
                    </Button>
                    <span className="text-xs font-semibold px-2 select-none">
                      Week of {timesheetWeekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        const next = new Date(timesheetWeekStart);
                        next.setDate(next.getDate() + 7);
                        setTimesheetWeekStart(next);
                      }}
                      title="Next Week"
                    >
                      <i className="fa-solid fa-chevron-right text-xs" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportTimesheetToCSV}
                    className="text-xs h-8 gap-1.5"
                    title="Download Week Timesheet as CSV"
                  >
                    <i className="fa-solid fa-file-csv text-primary text-xs" /> CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs font-semibold uppercase">
                        <th className="py-2.5 pr-2 min-w-[140px]">Project</th>
                        <th className="py-2.5 px-1.5 min-w-[120px]">Task Description</th>
                        <th className="py-2.5 px-1.5 min-w-[130px]">Comment / Notes</th>
                        <th className="py-2.5 px-1 text-center w-12">Mon</th>
                        <th className="py-2.5 px-1 text-center w-12">Tue</th>
                        <th className="py-2.5 px-1 text-center w-12">Wed</th>
                        <th className="py-2.5 px-1 text-center w-12">Thu</th>
                        <th className="py-2.5 px-1 text-center w-12">Fri</th>
                        <th className="py-2.5 px-1 text-center w-12">Sat</th>
                        <th className="py-2.5 px-1 text-center w-14">Total</th>
                        <th className="py-2.5 px-1 text-center w-14">Billable</th>
                        <th className="py-2.5 pl-1 pr-1 text-center w-14">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {timesheetRows.map((row, idx) => {
                        const rowTotal = (Number(row.mon) || 0) + (Number(row.tue) || 0) + (Number(row.wed) || 0) + (Number(row.thu) || 0) + (Number(row.fri) || 0) + (Number(row.sat) || 0);
                        return (
                          <tr key={idx} className="hover:bg-accent/10 transition-colors">
                            <td className="py-3 pr-2">
                              <select
                                value={row.project}
                                onChange={(e) => handleRowChange(idx, "project", e.target.value)}
                                className="w-full h-9 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              >
                                {Array.from(new Set(projectsList)).map((proj, pIdx) => (
                                  <option key={`${proj}-${pIdx}`} value={proj}>{proj}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-1.5">
                              <Input
                                value={row.taskName}
                                onChange={(e) => handleRowChange(idx, "taskName", e.target.value)}
                                placeholder="e.g. Code Review"
                                className="h-9 text-xs"
                              />
                            </td>
                            <td className="py-3 px-1.5">
                              <Input
                                value={row.comment || ""}
                                onChange={(e) => handleRowChange(idx, "comment", e.target.value)}
                                placeholder="Add work notes / comment..."
                                className="h-9 text-xs"
                              />
                            </td>
                            {["mon", "tue", "wed", "thu", "fri", "sat"].map((day) => (
                              <td key={day} className="py-3 px-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="24"
                                  step="0.5"
                                  placeholder="0"
                                  value={row[day] || ""}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    handleRowChange(idx, day, isNaN(val) ? 0 : val);
                                  }}
                                  className="h-9 w-12 text-center text-xs p-1 no-spinner font-medium"
                                />
                              </td>
                            ))}
                            <td className="py-3 px-1 text-center">
                              <span className={cn(
                                "text-xs font-semibold px-1.5 py-0.5 rounded border inline-block",
                                rowTotal > 0 ? "bg-primary/10 text-primary border-primary/20" : "text-muted-foreground border-transparent"
                              )}>
                                {rowTotal > 0 ? `${rowTotal}h` : "—"}
                              </span>
                            </td>
                            <td className="py-3 px-1 text-center">
                              <input
                                type="checkbox"
                                checked={row.isBillable}
                                onChange={(e) => handleRowChange(idx, "isBillable", e.target.checked)}
                                className="rounded border-border text-primary w-4 h-4 cursor-pointer"
                                title={row.isBillable ? "Billable task" : "Non-billable internal task"}
                              />
                            </td>
                            <td className="py-3 pl-1 pr-1 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateTimesheetRow(idx)}
                                  className="text-muted-foreground hover:text-primary transition-colors p-1"
                                  title="Duplicate Row"
                                >
                                  <i className="fa-solid fa-copy text-xs" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTimesheetRow(idx)}
                                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                  title="Delete Row"
                                >
                                  <i className="fa-solid fa-trash-can text-xs" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border/65">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={handleAddTimesheetRow} className="gap-1.5">
                      <i className="fa-solid fa-plus text-xs" /> Add New Entry
                    </Button>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleSaveTimesheet("Draft")} className="gap-1.5">
                      <i className="fa-solid fa-floppy-disk text-xs" /> Save Draft
                    </Button>
                    <Button color="primary" size="sm" onClick={() => handleSaveTimesheet("Pending")} className="gap-1.5 font-semibold">
                      <i className="fa-solid fa-paper-plane text-xs" /> Submit Timesheet
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right sidebar details */}
            <div className="space-y-6">
              {/* Timesheet Summary Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>Week Summary</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {timesheetDailyTotals.grand} / 40 hrs
                    </span>
                  </CardTitle>
                  <CardDescription>Track weekly target and billable allocations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {/* Progress Bar towards 40 hrs target */}
                  <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-foreground">Weekly Target (40 hrs)</span>
                      <span className={cn(
                        timesheetDailyTotals.grand >= 40 ? "text-emerald-500 font-bold" : "text-primary"
                      )}>
                        {Math.min(100, Math.round((timesheetDailyTotals.grand / 40) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300 rounded-full",
                          timesheetDailyTotals.grand >= 40
                            ? "bg-emerald-500"
                            : timesheetDailyTotals.grand >= 20
                            ? "bg-primary"
                            : "bg-amber-500"
                        )}
                        style={{ width: `${Math.min(100, (timesheetDailyTotals.grand / 40) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span>
                        {timesheetDailyTotals.grand >= 40
                          ? "Target reached!"
                          : `${(40 - timesheetDailyTotals.grand).toFixed(1)}h remaining`}
                      </span>
                      <span>Avg: {(timesheetDailyTotals.grand / 5).toFixed(1)}h/day</span>
                    </div>
                  </div>

                  <div className="divide-y divide-border/50">
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-clock text-xs text-primary" /> Total Hours Logged
                      </span>
                      <span className="font-bold text-foreground font-mono">
                        {timesheetDailyTotals.grand} hrs
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-sack-dollar text-xs text-emerald-500" /> Billable Hours
                      </span>
                      <span className="font-semibold text-emerald-500 font-mono">
                        {timesheetDailyTotals.billable} hrs
                        {timesheetDailyTotals.grand > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({Math.round((timesheetDailyTotals.billable / timesheetDailyTotals.grand) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-briefcase text-xs text-amber-500" /> Non-Billable Hours
                      </span>
                      <span className="font-semibold text-amber-500 font-mono">
                        {timesheetDailyTotals.nonBillable} hrs
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-list-check text-xs text-muted-foreground" /> Active Task Rows
                      </span>
                      <span className="font-semibold text-foreground font-mono">
                        {timesheetRows.filter((r) => r.taskName || r.mon > 0 || r.tue > 0).length} tasks
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Approval Panel (Admin/Manager only) */}
              {isManagerOrAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <i className="fa-solid fa-user-check text-primary text-sm" /> Pending Approvals
                    </CardTitle>
                    <CardDescription>Approve or reject weekly timesheet logs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pendingSubmissions.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-4">No pending timesheets to approve.</p>
                    ) : (
                      pendingSubmissions.map((entry) => (
                        <div key={entry._id} className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-2.5 text-xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-foreground">{entry.userId?.name || "Team Member"}</strong>
                              <p className="text-muted-foreground mt-0.5">{entry.project} - {entry.taskName}</p>
                              {entry.comment && (
                                <p className="text-[11px] text-muted-foreground italic bg-accent/40 px-2 py-1 rounded border border-border/40 mt-1 flex items-start gap-1.5">
                                  <i className="fa-solid fa-comment-dots text-primary text-[10px] mt-0.5 shrink-0" />
                                  <span>{entry.comment}</span>
                                </p>
                              )}
                            </div>
                            <Badge color="primary">{entry.hours} hrs</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-muted-foreground">
                              Date: {new Date(entry.date).toLocaleDateString()}
                            </span>
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10 border-destructive/20"
                                onClick={() => handleTimesheetApproval(entry._id, "Rejected")}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                color="primary"
                                onClick={() => handleTimesheetApproval(entry._id, "Approved")}
                              >
                                Approve
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Shift Clock & Attendance */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {!isAdmin && !isOPS && (() => {
            const targetHours = Number(shiftInfo?.targetHours) || 8.0;
            const workedHours = totalSecondsWorked / 3600;
            const progressPct = Math.min(100, Math.round((workedHours / targetHours) * 100));
            const remainingHours = Math.max(0, targetHours - workedHours);
            const isOvertime = workedHours > targetHours;
            const otHours = Math.max(0, workedHours - targetHours);
            const isShiftActive = Boolean(attendanceToday?.clockIn && !attendanceToday?.clockOut);
            const isShiftCompleted = Boolean(attendanceToday?.clockIn && attendanceToday?.clockOut);

            // Estimated shift target completion time
            let targetFinishTimeStr = "--:--";
            if (isShiftActive && remainingHours > 0) {
              const finishDate = new Date(Date.now() + remainingHours * 3600 * 1000);
              targetFinishTimeStr = finishDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            } else if (isOvertime || (workedHours >= targetHours)) {
              targetFinishTimeStr = "Target Met!";
            }

            const clockInDisplay = (attendanceToday?.originalClockIn || attendanceToday?.clockIn)
              ? new Date(attendanceToday.originalClockIn ?? attendanceToday.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
              : "--:--";

            const clockOutDisplay = attendanceToday?.clockOut
              ? new Date(attendanceToday.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
              : (attendanceToday?.clockIn ? "Active" : "--:--");

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Enhanced Shift Timer & Clock Control Card */}
                <Card className="lg:col-span-2 p-6 sm:p-8 flex flex-col justify-between items-center space-y-6 border border-border/80 bg-gradient-to-b from-card/90 to-card/50 shadow-sm relative overflow-hidden backdrop-blur-sm">
                  {/* Subtle ambient accent glow at top */}
                  <div className={cn(
                    "absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-32 rounded-full blur-3xl pointer-events-none opacity-20",
                    isShiftActive ? "bg-emerald-500" : isShiftCompleted ? "bg-amber-500" : "bg-primary"
                  )} />

                  {/* Header Status Row */}
                  <div className="w-full flex items-center justify-between pb-3 border-b border-border/60 text-xs">
                    <div className="flex items-center gap-2">
                      {isShiftActive ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Active Shift in Progress
                        </span>
                      ) : isShiftCompleted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Shift Completed / On Break
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-muted-foreground font-semibold border border-border">
                          <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                          Ready to Clock In
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                      <i className="fa-solid fa-location-dot text-primary text-[10px]" />
                      <span>IST (UTC+5:30)</span>
                    </div>
                  </div>

                  {/* Central Timer & Radial-style Display */}
                  <div className="flex flex-col items-center justify-center space-y-3 py-2">
                    <div className="relative flex items-center justify-center">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-inner border",
                        isShiftActive
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shadow-emerald-500/10"
                          : isShiftCompleted
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-amber-500/10"
                            : "bg-primary/10 text-primary border-primary/30"
                      )}>
                        <i className={cn("fa-solid fa-clock", isShiftActive && "animate-pulse")} />
                      </div>
                    </div>

                    <div className="text-center space-y-1">
                      <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground font-mono drop-shadow-sm">
                        {elapsedTime}
                      </h2>
                      <div className="flex items-center justify-center gap-4 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                        <span>Hours</span>
                        <span>:</span>
                        <span>Minutes</span>
                        <span>:</span>
                        <span>Seconds</span>
                      </div>
                    </div>

                    {/* Daily Target Progress Bar */}
                    <div className="w-full max-w-md pt-2 space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                          <i className="fa-solid fa-bullseye text-primary text-xs" />
                          Target: <strong className="text-foreground font-mono">{targetHours.toFixed(1)}h</strong>
                        </span>
                        <span className={cn(
                          "font-mono font-bold text-[11px]",
                          isOvertime ? "text-amber-500" : "text-foreground"
                        )}>
                          {isOvertime ? `+${otHours.toFixed(2)}h Overtime` : `${progressPct}% completed`}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden border border-border/60">
                        <div
                          className={cn(
                            "h-full transition-all duration-500 rounded-full",
                            isOvertime
                              ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-500"
                              : "bg-gradient-to-r from-primary to-emerald-500"
                          )}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="flex flex-col items-center justify-center w-full pt-1">
                    {!attendanceToday?.clockIn ? (
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          color="primary"
                          size="lg"
                          onClick={() => handleClockAction("in")}
                          className="gap-2.5 px-9 py-3 text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
                        >
                          <i className="fa-solid fa-fingerprint text-base" /> Clock In Now
                        </Button>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                          Standard 8.0h shift • Ready to start
                        </p>
                      </div>
                    ) : !attendanceToday?.clockOut ? (
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          color="destructive"
                          size="lg"
                          onClick={() => handleClockAction("out")}
                          className="gap-2.5 px-9 py-3 text-sm font-semibold shadow-md shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer bg-rose-600 hover:bg-rose-500 text-white rounded-xl border border-rose-400/20"
                        >
                          <i className="fa-solid fa-stopwatch text-base" /> Clock Out Shift
                        </Button>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Shift active • Click to clock out or take a break
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          color="primary"
                          size="lg"
                          onClick={() => handleClockAction("resume")}
                          className="gap-2.5 px-9 py-3 text-sm font-semibold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl border border-emerald-400/20"
                        >
                          <i className="fa-solid fa-play text-xs" /> Resume Shift
                        </Button>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Shift paused • <span className="font-mono font-semibold text-foreground">{workedHours.toFixed(1)} hrs</span> logged today
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Metrics 4-Pill Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full pt-4 border-t border-border/60 text-xs">
                    <div className="p-3 rounded-xl bg-accent/20 border border-border/50 flex flex-col justify-between">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold flex items-center gap-1">
                        <i className="fa-solid fa-arrow-right-to-bracket text-emerald-500" /> Clock In
                      </span>
                      <span className="font-mono font-bold text-foreground text-sm mt-1">
                        {clockInDisplay}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-accent/20 border border-border/50 flex flex-col justify-between">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold flex items-center gap-1">
                        <i className="fa-solid fa-arrow-right-from-bracket text-rose-500" /> Clock Out
                      </span>
                      <span className={cn(
                        "font-mono font-bold text-sm mt-1",
                        clockOutDisplay === "Active" ? "text-emerald-500" : "text-foreground"
                      )}>
                        {clockOutDisplay}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-accent/20 border border-border/50 flex flex-col justify-between">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold flex items-center gap-1">
                        <i className="fa-solid fa-business-time text-primary" /> Worked Today
                      </span>
                      <span className="font-mono font-bold text-foreground text-sm mt-1">
                        {workedHours.toFixed(1)} hrs
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-accent/20 border border-border/50 flex flex-col justify-between">
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold flex items-center gap-1">
                        <i className="fa-solid fa-flag-checkered text-amber-500" /> Target Finish
                      </span>
                      <span className="font-mono font-bold text-foreground text-sm mt-1 truncate" title={targetFinishTimeStr}>
                        {targetFinishTimeStr}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Enhanced Shift Metadata Information Panel */}
                <Card className="p-6 border border-border/80 bg-gradient-to-b from-card/90 to-card/50 flex flex-col justify-between space-y-4 shadow-sm backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">
                          <i className="fa-solid fa-calendar-check" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Shift Schedule Details</h3>
                      </div>
                      <Badge color="primary" variant="soft" className="text-[10px]">
                        Active Policy
                      </Badge>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-2 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <i className="fa-solid fa-briefcase text-primary/70 text-xs w-4 text-center" /> Assigned Shift
                        </span>
                        <span className="font-bold text-foreground text-right">{shiftInfo?.shiftName || "Standard Regular Shift"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <i className="fa-solid fa-clock text-primary/70 text-xs w-4 text-center" /> Shift Window
                        </span>
                        <span className="font-semibold text-foreground font-mono text-right">{shiftInfo?.startTime || "09:00 AM"} - {shiftInfo?.endTime || "05:00 PM"}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <i className="fa-solid fa-bullseye text-primary/70 text-xs w-4 text-center" /> Daily Target
                        </span>
                        <span className="font-semibold text-foreground font-mono text-right">{shiftInfo?.targetHours || 8.0} Hours</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border/40">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <i className="fa-solid fa-location-dot text-emerald-500 text-xs w-4 text-center" /> Work Location
                        </span>
                        <span className="font-semibold text-emerald-500 text-right">{shiftInfo?.location || "Hybrid"}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <i className="fa-solid fa-user-shield text-primary/70 text-xs w-4 text-center" /> Attendance Status
                        </span>
                        <Badge color={isShiftActive ? "success" : isShiftCompleted ? "warning" : "default"} variant="soft" className="text-[10px]">
                          {isShiftActive ? "Present (Active)" : isShiftCompleted ? "Completed" : "Pending Clock In"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-start gap-2.5">
                    <i className="fa-solid fa-circle-info text-sm shrink-0 mt-0.5" />
                    <span>Clock-in records automatically calculate regular and overtime hours upon clock-out. Shifts can be resumed anytime on the same day.</span>
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* Enhanced Shift Attendance Logs & History Table */}
          <Card className="border border-border/80 bg-gradient-to-b from-card/95 via-card/85 to-card/70 shadow-sm backdrop-blur-md rounded-2xl overflow-hidden space-y-0">
            {/* Header Toolbar */}
            <div className="p-5 sm:p-6 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary flex items-center justify-center border border-primary/30 shadow-xs shrink-0">
                  <i className="fa-solid fa-clock-rotate-left text-base" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">Shift Attendance Logs & History</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                      Live Synced
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Daily check-in & check-out records, total shift hours, and overtime breakdown
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start sm:self-center">
                <Button
                  variant={showAllAttendance ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    const nextState = !showAllAttendance;
                    setShowAllAttendance(nextState);
                    setAttendancePage(1);
                    await fetchAttendance(nextState);
                  }}
                  className="gap-1.5 text-xs font-semibold h-8 rounded-lg cursor-pointer"
                >
                  <i className="fa-solid fa-database text-xs" />
                  {showAllAttendance ? "Show Limited" : "Show All Records"}
                </Button>

                <Button
                  size="sm"
                  onClick={exportAttendanceToCSV}
                  className="gap-1.5 text-xs font-semibold h-8 rounded-lg cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <i className="fa-solid fa-file-excel text-xs" />
                  Export to Excel (CSV)
                </Button>
              </div>
            </div>

            {/* Filter & Metric Ribbon */}
            <div className="p-4 sm:p-5 pt-4 space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-xl bg-accent/20 border border-border/70 backdrop-blur-xs">
                {/* Left: Day & Search Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Date Input */}
                  <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-background/90 border border-border/80 text-xs font-medium shadow-2xs">
                    <i className="fa-solid fa-calendar-day text-primary text-xs" />
                    <input
                      type="date"
                      value={selectedDateFilter}
                      onChange={(e) => {
                        setSelectedDateFilter(e.target.value);
                        setAttendancePage(1);
                      }}
                      className="bg-transparent text-foreground outline-none cursor-pointer font-mono text-xs"
                    />
                  </div>

                  {/* Quick Filters */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant={selectedDateFilter === getISTDateString() ? "default" : "outline"}
                      onClick={() => {
                        setSelectedDateFilter(getISTDateString());
                        setAttendancePage(1);
                      }}
                      className="h-8 px-2.5 text-xs cursor-pointer rounded-lg"
                    >
                      <i className="fa-solid fa-sun text-[10px] mr-1 opacity-70" />
                      Today
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedDateFilter === getISTDateString(new Date(Date.now() - 86400000)) ? "default" : "outline"}
                      onClick={() => {
                        setSelectedDateFilter(getISTDateString(new Date(Date.now() - 86400000)));
                        setAttendancePage(1);
                      }}
                      className="h-8 px-2.5 text-xs cursor-pointer rounded-lg"
                    >
                      Yesterday
                    </Button>
                    {selectedDateFilter && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedDateFilter("");
                          setAttendancePage(1);
                        }}
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                      >
                        <i className="fa-solid fa-rotate-left mr-1" /> All Days
                      </Button>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative min-w-[170px] sm:min-w-[210px]">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-xs" />
                    <input
                      type="text"
                      value={attendanceSearch}
                      onChange={(e) => {
                        setAttendanceSearch(e.target.value);
                        setAttendancePage(1);
                      }}
                      placeholder="Search staff, dates..."
                      className="h-8 w-full pl-8 pr-7 text-xs bg-background/90 border border-border/80 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors shadow-2xs"
                    />
                    {attendanceSearch && (
                      <button
                        onClick={() => setAttendanceSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </div>

                  {/* Status Filter */}
                  <select
                    value={attendanceStatusFilter}
                    onChange={(e) => {
                      setAttendanceStatusFilter(e.target.value);
                      setAttendancePage(1);
                    }}
                    className="h-8 px-2.5 text-xs bg-background/90 border border-border/80 rounded-lg text-foreground outline-none cursor-pointer font-medium shadow-2xs"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                  </select>
                </div>

                {/* Right: Aggregated Day KPI Chips */}
                {(() => {
                  const mergedHistory = mergeAttendanceByISTDay(attendanceHistory);
                  const targetLogs = selectedDateFilter
                    ? mergedHistory.filter((log) => getISTDateString(new Date(log.date)) === selectedDateFilter)
                    : mergedHistory;

                  const totalStaff = targetLogs.length;
                  const totalRegHours = targetLogs.reduce((acc: number, log: any) => acc + getLogHours(log).reg, 0);
                  const totalOtHours = targetLogs.reduce((acc: number, log: any) => acc + getLogHours(log).ot, 0);

                  return (
                    <div className="flex items-center gap-2.5 text-xs flex-wrap self-start lg:self-center">
                      <div className="px-3 py-1.5 rounded-lg bg-card/90 border border-border/70 flex items-center gap-2 shadow-2xs">
                        <div className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                          <i className="fa-solid fa-users" />
                        </div>
                        <span className="text-muted-foreground">Staff Logs:</span>
                        <strong className="text-foreground font-bold font-mono">{totalStaff}</strong>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 shadow-2xs">
                        <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-[10px]">
                          <i className="fa-solid fa-clock" />
                        </div>
                        <span>Day Hours:</span>
                        <strong className="font-bold font-mono">{totalRegHours.toFixed(1)} hrs</strong>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center gap-2 shadow-2xs">
                        <div className="w-5 h-5 rounded-md bg-amber-500/20 flex items-center justify-center text-[10px]">
                          <i className="fa-solid fa-fire" />
                        </div>
                        <span>Overtime:</span>
                        <strong className="font-bold font-mono">+{totalOtHours.toFixed(1)} hrs</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Table Body & Pagination */}
              {(() => {
                const mergedHistory = mergeAttendanceByISTDay(attendanceHistory);
                const filteredHistory = mergedHistory.filter((log) => {
                  if (selectedDateFilter && getISTDateString(new Date(log.date)) !== selectedDateFilter) {
                    return false;
                  }
                  if (attendanceStatusFilter !== "All" && log.status !== attendanceStatusFilter) {
                    return false;
                  }
                  if (attendanceSearch.trim()) {
                    const q = attendanceSearch.toLowerCase();
                    const empObj = typeof log.userId === "object" ? log.userId : null;
                    const nameMatch = empObj?.name?.toLowerCase().includes(q);
                    const emailMatch = empObj?.email?.toLowerCase().includes(q);
                    const dateMatch = new Date(log.date).toLocaleDateString().toLowerCase().includes(q);
                    const statusMatch = log.status?.toLowerCase().includes(q);
                    if (!nameMatch && !emailMatch && !dateMatch && !statusMatch) return false;
                  }
                  return true;
                });

                const totalItems = filteredHistory.length;
                const totalPages = Math.ceil(totalItems / attendanceRowsPerPage) || 1;
                const startIndex = (attendancePage - 1) * attendanceRowsPerPage;
                const paginatedItems = filteredHistory.slice(startIndex, startIndex + attendanceRowsPerPage);

                return (
                  <>
                    <div className="rounded-xl border border-border/70 overflow-hidden shadow-inner bg-card/40">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border/70 text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
                              {(isAdmin || isOPS) && <th className="py-3 px-4">Employee</th>}
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4">Clock In</th>
                              <th className="py-3 px-4">Clock Out</th>
                              <th className="py-3 px-4 text-right">Regular Hrs</th>
                              <th className="py-3 px-4 text-right">Overtime</th>
                              <th className="py-3 px-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {paginatedItems.length === 0 ? (
                              <tr>
                                <td colSpan={(isAdmin || isOPS) ? 8 : 7} className="py-12 text-center text-muted-foreground">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground/60">
                                      <i className="fa-solid fa-inbox text-base" />
                                    </div>
                                    <span className="font-medium text-xs">No shift logs found matching the selected filters.</span>
                                    {(selectedDateFilter || attendanceSearch || attendanceStatusFilter !== "All") && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedDateFilter("");
                                          setAttendanceSearch("");
                                          setAttendanceStatusFilter("All");
                                          setAttendancePage(1);
                                        }}
                                        className="text-xs h-7 mt-1 gap-1.5 cursor-pointer"
                                      >
                                        <i className="fa-solid fa-rotate-left text-[10px]" /> Reset Filters
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              paginatedItems.map((log) => {
                                const isSelected = selectedAttendanceLog?._id === log._id;
                                const empObj = typeof log.userId === "object" ? log.userId : null;
                                const isTodayRow = getISTDateString(new Date(log.date)) === getISTDateString();
                                const isYesterdayRow = getISTDateString(new Date(log.date)) === getISTDateString(new Date(Date.now() - 86400000));
                                const resolvedClockOut = getLogClockOutDate(log);
                                const isLiveRow = !log.clockOut && attendanceToday &&
                                  String(log._id) === String(attendanceToday._id);
                                const { reg, ot } = getLogHours(log);
                                const liveHrs = isLiveRow && totalSecondsWorked > 0 ? Math.min(totalSecondsWorked / 3600, 8) : reg;
                                const liveOt = isLiveRow && totalSecondsWorked > 0 ? Math.max(0, totalSecondsWorked / 3600 - 8) : ot;

                                return (
                                  <tr
                                    key={log._id}
                                    onClick={() => setSelectedAttendanceLog(log)}
                                    className={cn(
                                      "transition-all cursor-pointer group",
                                      isSelected
                                        ? "bg-primary/15 border-l-3 border-l-primary"
                                        : isTodayRow
                                        ? "bg-primary/[0.03] hover:bg-primary/[0.08]"
                                        : "hover:bg-accent/30"
                                    )}
                                  >
                                    {(isAdmin || isOPS) && (
                                      <td className="py-3 px-4 font-semibold text-foreground">
                                        {empObj ? (
                                          <div className="flex items-center gap-2.5 min-w-[140px]">
                                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] border border-primary/20 shrink-0">
                                              {empObj.name?.[0] || "U"}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="font-bold text-xs truncate leading-tight text-foreground">{empObj.name}</div>
                                              <div className="text-[10px] text-muted-foreground font-normal truncate">{empObj.role || "Employee"}</div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-2.5 min-w-[140px]">
                                            <div className="w-7 h-7 rounded-full bg-muted/60 text-muted-foreground font-bold flex items-center justify-center text-[10px] border border-border shrink-0">
                                              <i className="fa-solid fa-user-slash text-[9px]" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="font-semibold text-xs text-foreground/80">Former Member</div>
                                              <div className="text-[9px] text-muted-foreground/60 font-mono">Archived</div>
                                            </div>
                                          </div>
                                        )}
                                      </td>
                                    )}

                                    {/* Date */}
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2.5 whitespace-nowrap">
                                        <div className={cn(
                                          "w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 border transition-colors",
                                          isTodayRow
                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                            : "bg-muted/60 text-muted-foreground border-border/70"
                                        )}>
                                          <i className="fa-solid fa-calendar-day text-[11px]" />
                                        </div>
                                        <div>
                                          <div className="font-bold text-xs text-foreground">
                                            {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                          </div>
                                          {isTodayRow ? (
                                            <span className="text-[10px] font-semibold text-emerald-500">Today</span>
                                          ) : isYesterdayRow ? (
                                            <span className="text-[10px] font-medium text-muted-foreground">Yesterday</span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Status */}
                                    <td className="py-3 px-4 text-center">
                                      <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap shadow-2xs",
                                        log.status === "Present"
                                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                          : log.status === "Late"
                                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                                          : "bg-muted/60 text-muted-foreground border-border/70"
                                      )}>
                                        <span className={cn(
                                          "w-1.5 h-1.5 rounded-full",
                                          log.status === "Present" ? "bg-emerald-500" : log.status === "Late" ? "bg-amber-500" : "bg-muted-foreground"
                                        )} />
                                        {log.status || "Present"}
                                      </span>
                                    </td>

                                    {/* Clock In */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/20">
                                          <i className="fa-solid fa-arrow-right-to-bracket" />
                                        </div>
                                        <span className="font-mono font-bold text-xs text-foreground">
                                          {(log.originalClockIn || log.clockIn)
                                            ? new Date(log.originalClockIn ?? log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                                            : "--"}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Clock Out */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                      {resolvedClockOut ? (
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-500 flex items-center justify-center text-[10px] shrink-0 border border-rose-500/20">
                                            <i className="fa-solid fa-arrow-right-from-bracket" />
                                          </div>
                                          <span className="font-mono font-medium text-xs text-muted-foreground">
                                            {resolvedClockOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                          </span>
                                        </div>
                                      ) : (isTodayRow && (log.originalClockIn || log.clockIn)) ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shadow-xs">
                                          <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                          </span>
                                          Active
                                        </span>
                                      ) : (
                                        <span className="font-mono text-muted-foreground/40 text-xs">--</span>
                                      )}
                                    </td>

                                    {/* Regular Hours */}
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                      <div className="flex flex-col items-end gap-1">
                                        {isLiveRow && totalSecondsWorked > 0 ? (
                                          <span className="font-mono font-bold text-xs text-primary flex items-center gap-1 animate-pulse">
                                            <i className="fa-solid fa-bolt text-[10px]" />
                                            {liveHrs.toFixed(1)} hrs
                                          </span>
                                        ) : (
                                          <span className="font-mono font-bold text-xs text-foreground">
                                            {reg.toFixed(1)} hrs
                                          </span>
                                        )}
                                        <div className="w-16 h-1 rounded-full bg-muted/60 overflow-hidden">
                                          <div
                                            className={cn(
                                              "h-full rounded-full transition-all",
                                              isLiveRow ? "bg-primary animate-pulse" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${Math.min(100, (isLiveRow ? liveHrs : reg) / 8 * 100)}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>

                                    {/* Overtime */}
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                      {liveOt > 0 ? (
                                        <span className={cn(
                                          "inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/25 shadow-xs",
                                          isLiveRow && "animate-pulse"
                                        )}>
                                          <i className="fa-solid fa-fire text-[10px]" />
                                          +{liveOt.toFixed(1)} hrs
                                        </span>
                                      ) : (
                                        <span className="font-mono text-xs text-muted-foreground/50">
                                          0 hrs
                                        </span>
                                      )}
                                    </td>

                                    {/* Action Button */}
                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedAttendanceLog(log);
                                        }}
                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors text-xs font-semibold inline-flex items-center gap-1 group-hover:text-primary"
                                        title="View Full Breakdown"
                                      >
                                        <span className="hidden sm:inline text-[11px]">View</span>
                                        <i className="fa-solid fa-chevron-right text-[10px] group-hover:translate-x-0.5 transition-transform" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Pagination Toolbar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-muted/50 border border-border/60 text-foreground font-semibold">
                          Showing {totalItems > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + attendanceRowsPerPage, totalItems)} of {totalItems}
                        </span>
                        {totalItems > 0 && (
                          <span className="text-muted-foreground/70 hidden md:inline">
                            (Page {attendancePage} of {totalPages})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5 mr-1">
                          <span className="text-[11px]">Rows per page:</span>
                          <select
                            value={attendanceRowsPerPage}
                            onChange={(e) => {
                              setAttendanceRowsPerPage(Number(e.target.value));
                              setAttendancePage(1);
                            }}
                            className="h-8 px-2 bg-background border border-border/80 rounded-lg text-foreground focus:outline-none text-xs font-semibold cursor-pointer shadow-2xs"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={attendancePage <= 1}
                            onClick={() => setAttendancePage((p) => Math.max(p - 1, 1))}
                            className="h-8 px-3 text-xs rounded-lg gap-1.5 cursor-pointer"
                          >
                            <i className="fa-solid fa-chevron-left text-[10px]" />
                            Previous
                          </Button>

                          <div className="px-2 font-mono font-bold text-foreground text-xs">
                            {attendancePage} / {totalPages}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={attendancePage >= totalPages}
                            onClick={() => setAttendancePage((p) => Math.min(p + 1, totalPages))}
                            className="h-8 px-3 text-xs rounded-lg gap-1.5 cursor-pointer"
                          >
                            Next
                            <i className="fa-solid fa-chevron-right text-[10px]" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </Card>

          {/* ─── Login & Hours Summary (Admin/OPS only) ─── */}
          {(isAdmin || isOPS) && (
            <Card className="border border-border bg-card/60 overflow-hidden">
              {/* Header */}
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-500/10">
                      <i className="fa-solid fa-user-clock text-indigo-500 text-sm" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">Login & Hours Summary</CardTitle>
                      <CardDescription className="text-[11px] mt-0.5">Track employee login times, clock-in/out history and working hours by date range</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* View Toggle */}
                    <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                      <button
                        onClick={() => setSummaryView("records")}
                        className={cn("px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer", summaryView === "records" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
                      >
                        <i className="fa-solid fa-table-list mr-1 text-[10px]" />Records
                      </button>
                      <button
                        onClick={() => setSummaryView("users")}
                        className={cn("px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer", summaryView === "users" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
                      >
                        <i className="fa-solid fa-users mr-1 text-[10px]" />Per User
                      </button>
                    </div>
                    <Button
                      size="sm"
                      onClick={exportSummaryToCSV}
                      className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3"
                    >
                      <i className="fa-solid fa-file-excel text-xs" /> Export CSV
                    </Button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">From</label>
                    <input
                      type="date"
                      value={summaryFrom}
                      onChange={(e) => setSummaryFrom(e.target.value)}
                      className="h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground outline-none cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">To</label>
                    <input
                      type="date"
                      value={summaryTo}
                      onChange={(e) => setSummaryTo(e.target.value)}
                      className="h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground outline-none cursor-pointer"
                    />
                  </div>
                  <div className="relative flex-1 min-w-[160px]">
                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={summarySearch}
                      onChange={(e) => setSummarySearch(e.target.value)}
                      className="h-8 pl-7 pr-3 w-full text-xs bg-background border border-border rounded-md text-foreground outline-none"
                    />
                  </div>
                  <select
                    value={summaryDept}
                    onChange={(e) => setSummaryDept(e.target.value)}
                    className="h-8 text-xs bg-background border border-border rounded-md px-2.5 text-foreground outline-none cursor-pointer shrink-0"
                  >
                    <option value="All">All Departments</option>
                    {Array.from(new Set(summaryRecords.map((r: any) => (typeof r.userId === "object" ? r.userId?.department : null)).filter(Boolean))).map((d: any) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={() => { setSummaryPage(1); fetchLoginHoursSummary(); }}
                    disabled={summaryLoading}
                    className="h-8 px-3 text-xs font-bold gap-1.5"
                  >
                    {summaryLoading
                      ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Loading...</>
                      : <><i className="fa-solid fa-magnifying-glass text-xs" /> Search</>}
                  </Button>
                  {/* Quick Range Shortcuts */}
                  {[{label:"This Week",fn:()=>{const f=getDefaultWeekFrom(),t=new Date().toISOString().split("T")[0];setSummaryFrom(f);setSummaryTo(t);setSummaryPage(1);fetchLoginHoursSummary(f,t);}},{label:"Today",fn:()=>{const t=new Date().toISOString().split("T")[0];setSummaryFrom(t);setSummaryTo(t);setSummaryPage(1);fetchLoginHoursSummary(t,t);}},{label:"This Month",fn:()=>{const now=new Date(),f=new Date(now.getFullYear(),now.getMonth(),1).toISOString().split("T")[0],t=now.toISOString().split("T")[0];setSummaryFrom(f);setSummaryTo(t);setSummaryPage(1);fetchLoginHoursSummary(f,t);}}].map(({label,fn})=>(
                    <button key={label} onClick={fn} className="h-8 px-2.5 text-[11px] font-semibold rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors cursor-pointer shrink-0">{label}</button>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {summaryRecords.length === 0 && !summaryLoading ? (
                  <div className="py-12 text-center space-y-3">
                    <i className="fa-solid fa-user-clock text-4xl text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Select a date range and click <strong>Search</strong> to load login & hours data.</p>
                  </div>
                ) : (() => {
                  // Filter records by search + dept
                  const filteredRecs = summaryRecords.filter((r: any) => {
                    const u = typeof r.userId === "object" ? r.userId : null;
                    const q = summarySearch.toLowerCase();
                    const matchSearch = !q || u?.name?.toLowerCase().includes(q) || u?.email?.toLowerCase().includes(q) || u?.role?.toLowerCase().includes(q);
                    const matchDept = summaryDept === "All" || u?.department === summaryDept;
                    return matchSearch && matchDept;
                  });

                  const filteredUsers = summaryUserStats.filter((us: any) => {
                    const q = summarySearch.toLowerCase();
                    const matchSearch = !q || us.name?.toLowerCase().includes(q) || us.email?.toLowerCase().includes(q);
                    const matchDept = summaryDept === "All" || us.department === summaryDept;
                    return matchSearch && matchDept;
                  });

                  // Aggregate totals for summary pills
                  const totalPresent = filteredRecs.length;
                  const totalRegHrs = filteredRecs.reduce((s: number, r: any) => s + getLogHours(r).reg, 0);
                  const totalOtHrs  = filteredRecs.reduce((s: number, r: any) => s + getLogHours(r).ot, 0);
                  const uniqueEmps  = new Set(filteredRecs.map((r: any) => r.userId?._id?.toString() ?? r.userId?.toString())).size;

                  // Pagination for records view
                  const ROWS_PER = 10;
                  const totalRecPages = Math.ceil(filteredRecs.length / ROWS_PER) || 1;
                  const pagedRecs = filteredRecs.slice((summaryPage - 1) * ROWS_PER, summaryPage * ROWS_PER);

                  const fmtTime = (d: string | Date | null | undefined) =>
                    d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                  const fmtDate = (d: string | Date) =>
                    new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  const fmtHrs = (h: number) => {
                    const hh = Math.floor(h); const mm = Math.round((h - hh) * 60);
                    return `${hh}h ${mm.toString().padStart(2,'0')}m`;
                  };

                  const ROLE_COLORS: Record<string, string> = {
                    Admin: "bg-rose-500/15 text-rose-600 border-rose-500/30",
                    OPS: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
                    Manager: "bg-purple-500/15 text-purple-600 border-purple-500/30",
                    HR: "bg-pink-500/15 text-pink-600 border-pink-500/30",
                    Employee: "bg-sky-500/15 text-sky-600 border-sky-500/30",
                  };

                  return (
                    <>
                      {/* Summary Stat Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Unique Employees", value: uniqueEmps, icon: "fa-solid fa-users", color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/20" },
                          { label: "Attendance Records", value: totalPresent, icon: "fa-solid fa-fingerprint", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
                          { label: "Total Regular Hrs", value: fmtHrs(totalRegHrs), icon: "fa-solid fa-clock", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
                          { label: "Total Overtime", value: `+${fmtHrs(totalOtHrs)}`, icon: "fa-solid fa-fire", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
                        ].map((s) => (
                          <div key={s.label} className={cn("p-3 rounded-xl border space-y-1", s.bg)}>
                            <div className="flex items-center gap-1.5">
                              <i className={cn("text-xs", s.icon, s.color)} />
                              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{s.label}</span>
                            </div>
                            <p className={cn("text-lg font-extrabold font-mono", s.color)}>{s.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* ─── Records Table View ─── */}
                      {summaryView === "records" && (
                        <>
                          <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-[11px] uppercase">
                                <tr>
                                  <th className="py-2.5 px-3 whitespace-nowrap">Employee</th>
                                  <th className="py-2.5 px-3 whitespace-nowrap">Department</th>
                                  <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                                  <th className="py-2.5 px-3 whitespace-nowrap"><i className="fa-solid fa-fingerprint text-emerald-500 mr-1" />Clock In</th>
                                  <th className="py-2.5 px-3 whitespace-nowrap"><i className="fa-solid fa-stopwatch text-rose-500 mr-1" />Clock Out</th>
                                  <th className="py-2.5 px-3 whitespace-nowrap text-center">Duration</th>
                                  <th className="py-2.5 px-3 whitespace-nowrap text-right">Regular Hrs</th>
                                  <th className="py-2.5 px-3 whitespace-nowrap text-right">Overtime</th>
                                  <th className="py-2.5 px-3 whitespace-nowrap text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {summaryLoading ? (
                                  Array.from({length:5}).map((_,i) => (
                                    <tr key={i} className="animate-pulse">
                                      {Array.from({length:9}).map((_,j) => (
                                        <td key={j} className="py-3 px-3"><div className="h-3 bg-muted/60 rounded w-full" /></td>
                                      ))}
                                    </tr>
                                  ))
                                ) : pagedRecs.length === 0 ? (
                                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">
                                    <i className="fa-solid fa-inbox text-2xl opacity-30 block mb-1" />No records match your filters.
                                  </td></tr>
                                ) : pagedRecs.map((r: any) => {
                                  const u = typeof r.userId === "object" ? r.userId : null;
                                  const roleColor = ROLE_COLORS[u?.role] ?? ROLE_COLORS.Employee;
                                  const isTodayRecord = getISTDateString(new Date(r.date)) === getISTDateString();
                                  const inVal = r.originalClockIn || r.clockIn;
                                  const resolvedClockOut = r.clockOut
                                    ? new Date(r.clockOut)
                                    : (!isTodayRecord && inVal ? new Date(new Date(inVal).getTime() + (getLogHours(r).total || 8) * 3600000) : null);
                                  const clockedOut = !!resolvedClockOut;
                                  const isActive = isTodayRecord && Boolean(inVal && !r.clockOut);
                                  const dur = inVal && resolvedClockOut
                                    ? fmtHrs((resolvedClockOut.getTime() - new Date(inVal).getTime()) / 3600000)
                                    : isActive ? "Active" : "—";
                                  return (
                                    <tr key={r._id} className="hover:bg-accent/20 transition-colors">
                                      <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-2 min-w-[140px]">
                                          <div className={cn("w-7 h-7 rounded-full font-bold flex items-center justify-center text-[10px] shrink-0 border", roleColor)}>
                                            {u?.name?.[0]?.toUpperCase() ?? "U"}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-semibold text-foreground truncate leading-tight">{u?.name ?? "Employee"}</p>
                                            <p className="text-[10px] text-muted-foreground font-mono truncate">{u?.email ?? ""}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border/50 bg-muted/40 text-muted-foreground font-semibold">{u?.department ?? "—"}</span>
                                      </td>
                                      <td className="py-2.5 px-3 font-medium text-foreground whitespace-nowrap">{fmtDate(r.date)}</td>
                                      <td className="py-2.5 px-3">
                                         <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmtTime(r.originalClockIn ?? r.clockIn)}</span>
                                       </td>
                                      <td className="py-2.5 px-3">
                                        {resolvedClockOut
                                          ? <span className="font-mono font-bold text-rose-500">{fmtTime(resolvedClockOut)}</span>
                                          : isActive
                                          ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active</span>
                                          : <span className="text-muted-foreground/40">—</span>}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span className={cn("font-mono font-semibold text-[11px]", isActive ? "text-emerald-500" : "text-foreground")}>{dur}</span>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">{fmtHrs(getLogHours(r).reg)}</td>
                                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-500">{getLogHours(r).ot > 0 ? `+${fmtHrs(getLogHours(r).ot)}` : "—"}</td>
                                      <td className="py-2.5 px-3 text-right">
                                        <span className={cn(
                                          "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap",
                                          r.status === "Present"
                                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                        )}>
                                          <i className={cn("text-[9px]", r.status === "Present" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-exclamation")} />
                                          {r.status ?? "Present"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {/* Pagination */}
                          {filteredRecs.length > ROWS_PER && (
                            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                              <span>Showing <strong className="text-foreground">{Math.min((summaryPage-1)*ROWS_PER+1, filteredRecs.length)}</strong>–<strong className="text-foreground">{Math.min(summaryPage*ROWS_PER, filteredRecs.length)}</strong> of <strong className="text-foreground">{filteredRecs.length}</strong></span>
                              <div className="flex items-center gap-1.5">
                                <Button variant="outline" size="sm" disabled={summaryPage <= 1} onClick={() => setSummaryPage(p=>Math.max(p-1,1))} className="h-7 px-2 text-xs">Previous</Button>
                                <span className="font-semibold text-foreground px-1">{summaryPage}/{totalRecPages}</span>
                                <Button variant="outline" size="sm" disabled={summaryPage >= totalRecPages} onClick={() => setSummaryPage(p=>Math.min(p+1,totalRecPages))} className="h-7 px-2 text-xs">Next</Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* ─── Per User Aggregate View ─── */}
                      {summaryView === "users" && (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-[11px] uppercase">
                              <tr>
                                <th className="py-2.5 px-3">Employee</th>
                                <th className="py-2.5 px-3">Department</th>
                                <th className="py-2.5 px-3 text-center">Days Present</th>
                                <th className="py-2.5 px-3 text-right">Total Regular</th>
                                <th className="py-2.5 px-3 text-right">Total Overtime</th>
                                <th className="py-2.5 px-3 whitespace-nowrap">Last Login</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {summaryLoading ? (
                                Array.from({length:4}).map((_,i) => (
                                  <tr key={i} className="animate-pulse">
                                    {Array.from({length:6}).map((_,j)=>(
                                      <td key={j} className="py-3 px-3"><div className="h-3 bg-muted/60 rounded w-full" /></td>
                                    ))}
                                  </tr>
                                ))
                              ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">
                                  <i className="fa-solid fa-inbox text-2xl opacity-30 block mb-1" />No user data matches your filters.
                                </td></tr>
                              ) : filteredUsers.sort((a:any,b:any) => b.daysPresent-a.daysPresent).map((us: any) => {
                                const roleColor = ROLE_COLORS[us.role] ?? ROLE_COLORS.Employee;
                                return (
                                  <tr key={us.userId} className="hover:bg-accent/20 transition-colors">
                                    <td className="py-3 px-3">
                                      <div className="flex items-center gap-2 min-w-[150px]">
                                        <div className={cn("w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border", roleColor)}>
                                          {us.name?.[0]?.toUpperCase() ?? "U"}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-semibold text-foreground truncate">{us.name}</p>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-semibold", roleColor)}>{us.role}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono truncate">{us.email}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border/50 bg-muted/40 text-muted-foreground font-semibold">{us.department}</span>
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      <span className="inline-flex items-center gap-1 font-bold text-sm text-primary">
                                        <i className="fa-solid fa-calendar-check text-[10px] text-primary/70" />{us.daysPresent}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmtHrs(us.totalRegular)}</td>
                                    <td className="py-3 px-3 text-right font-mono font-semibold text-amber-500">{us.totalOvertime > 0 ? `+${fmtHrs(us.totalOvertime)}` : "—"}</td>
                                    <td className="py-3 px-3 whitespace-nowrap">
                                      {us.lastLogin
                                        ? <span className="font-mono text-[11px] text-foreground">{new Date(us.lastLogin).toLocaleDateString(undefined,{month:'short',day:'numeric'})} <span className="text-muted-foreground">{fmtTime(us.lastLogin)}</span></span>
                                        : <span className="text-muted-foreground/40">—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Organization Team Shift Roster & Employee Shift Attendance Board (Admin/OPS only) */}
          {(isAdmin || isOPS) && <TeamShiftOverviewCard />}
        </div>
      )}

      {/* Schedule Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowEventModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                  <i className="fa-solid fa-calendar-plus text-base" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Schedule New Event</h3>
                  <p className="text-[11px] text-muted-foreground">Add meetings, deadlines, holidays or milestones</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowEventModal(false)}>
                <i className="fa-solid fa-xmark text-sm" />
              </Button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Event Title</span>
                  <span className="text-primary font-bold">*</span>
                </label>
                <Input
                  value={newEvtTitle}
                  onChange={(e) => setNewEvtTitle(e.target.value)}
                  placeholder="e.g. Q3 Roadmap Review"
                  className="hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <i className="fa-solid fa-tag text-primary text-[10px]" />
                    <span>Event Type</span>
                  </label>
                  <select
                    value={newEvtType}
                    onChange={(e: any) => setNewEvtType(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:border-primary/50 font-medium transition-colors"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Birthday">Birthday / Anniversary</option>
                    <option value="Deadline">Deadline</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <i className="fa-solid fa-users text-primary text-[10px]" />
                    <span>Department</span>
                  </label>
                  <select
                    value={newEvtDept}
                    onChange={(e) => setNewEvtDept(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:border-primary/50 font-medium transition-colors"
                  >
                    <option value="All">All Departments</option>
                    <option value="Management">Management</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-regular fa-calendar-days text-primary text-xs" />
                    <span>Start Date & Time</span>
                    <span className="text-primary font-bold">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={newEvtStart}
                    onChange={(e) => handleStartDateTimeChange(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    onFocus={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    className="cursor-pointer bg-primary/5 border-primary/40 text-foreground font-semibold hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all shadow-2xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-regular fa-clock text-primary text-xs" />
                    <span>End Date & Time</span>
                    <span className="text-primary font-bold">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={newEvtEnd}
                    onChange={(e) => setNewEvtEnd(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    onFocus={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    className="cursor-pointer bg-primary/5 border-primary/40 text-foreground font-semibold hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <i className="fa-solid fa-align-left text-primary text-[10px]" />
                  <span>Description</span>
                </label>
                <textarea
                  value={newEvtDesc}
                  onChange={(e) => setNewEvtDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:border-primary/50 resize-y transition-colors"
                  placeholder="Agenda details, video call links..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowEventModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold px-4 shadow-xs">
                  Save Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Sprint Modal */}
      {showSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowSprintModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-xs">
                  <i className="fa-solid fa-rocket text-base" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Plan New Sprint</h3>
                  <p className="text-[11px] text-muted-foreground">Define sprint targets, timeline and milestones</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowSprintModal(false)}>
                <i className="fa-solid fa-xmark text-sm" />
              </Button>
            </div>

            <form onSubmit={handleCreateSprint} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Sprint Name</span>
                  <span className="text-primary font-bold">*</span>
                </label>
                <Input
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  placeholder="e.g. Sprint 4 - Core API"
                  className="hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-regular fa-calendar text-primary text-xs" />
                    <span>Start Date</span>
                    <span className="text-primary font-bold">*</span>
                  </label>
                  <Input
                    type="date"
                    value={newSprintStart}
                    onChange={(e) => setNewSprintStart(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    onFocus={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    className="cursor-pointer bg-primary/5 border-primary/40 text-foreground font-semibold hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all shadow-2xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-regular fa-calendar-check text-primary text-xs" />
                    <span>End Date</span>
                    <span className="text-primary font-bold">*</span>
                  </label>
                  <Input
                    type="date"
                    value={newSprintEnd}
                    onChange={(e) => setNewSprintEnd(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    onFocus={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    className="cursor-pointer bg-primary/5 border-primary/40 text-foreground font-semibold hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <i className="fa-solid fa-bullseye text-primary text-[10px]" />
                  <span>Sprint Goal & Deliverables</span>
                </label>
                <textarea
                  value={newSprintGoal}
                  onChange={(e) => setNewSprintGoal(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:border-primary/50 resize-y transition-colors"
                  placeholder="Primary sprint objectives and deliverables..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowSprintModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold px-4 shadow-xs">
                  Launch Sprint Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <Badge color="primary" className="mb-1.5">{selectedEvent.type}</Badge>
                <h3 className="text-lg font-bold text-foreground">{selectedEvent.title}</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                <i className="fa-solid fa-xmark text-sm" />
              </Button>
            </div>
            {selectedEvent.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{selectedEvent.description}</p>
            )}
            <div className="text-xs space-y-2 pt-3 border-t border-border text-muted-foreground">
              <p className="flex items-center gap-2">
                <i className="fa-solid fa-calendar-day text-primary w-4 text-center" />
                <span><strong>Start:</strong> {new Date(selectedEvent.startDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", hour12: true })}</span>
              </p>
              <p className="flex items-center gap-2">
                <i className="fa-solid fa-flag-checkered text-rose-500 w-4 text-center" />
                <span><strong>End:</strong> {new Date(selectedEvent.endDate).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", hour12: true })}</span>
              </p>
              <p className="flex items-center gap-2">
                <i className="fa-solid fa-building text-amber-500 w-4 text-center" />
                <span><strong>Department:</strong> {selectedEvent.department || "All"}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Shift Attendance Log & Employee Details Modal */}
      {selectedAttendanceLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setSelectedAttendanceLog(null)}>
          <div className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const empObj = typeof selectedAttendanceLog.userId === "object" ? selectedAttendanceLog.userId : null;
              const empId = empObj?._id || selectedAttendanceLog.userId;
              const empLogs = mergeAttendanceByISTDay(
                attendanceHistory.filter((h) => {
                  const hId = typeof h.userId === "object" ? h.userId?._id : h.userId;
                  return String(hId) === String(empId);
                })
              );

              const formatDuration = (hrsNum: number) => {
                const totalMins = Math.round(hrsNum * 60);
                const h = Math.floor(totalMins / 60);
                const m = totalMins % 60;
                if (h === 0) return `${m} mins`;
                if (m === 0) return `${h} ${h === 1 ? "hr" : "hrs"}`;
                return `${h} ${h === 1 ? "hr" : "hrs"} ${m} mins`;
              };

              const totalEmpWorked = empLogs.reduce((acc, h) => {
                const { total } = getLogHours(h);
                return acc + total;
              }, 0);

              const totalEmpOvertime = empLogs.reduce((acc, h) => {
                const { ot } = getLogHours(h);
                return acc + ot;
              }, 0);
              const empType = empObj?.employmentType || "Permanent";

              const isSelectedToday = getISTDateString(new Date(selectedAttendanceLog.date)) === getISTDateString();
              const isSelectedActive = isSelectedToday && !selectedAttendanceLog.clockOut && Boolean(selectedAttendanceLog.clockIn);
              const resolvedSelectedClockOut = getLogClockOutDate(selectedAttendanceLog);
              const selectedDateFormatted = new Date(selectedAttendanceLog.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div className="space-y-5">
                  {/* Executive Header */}
                  <div className="flex justify-between items-start pb-4 border-b border-border/70">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent text-primary font-bold flex items-center justify-center text-base border border-primary/30 shadow-sm shrink-0">
                        {empObj?.name?.[0] || "U"}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-foreground leading-none">{empObj?.name || "Employee Attendance Record"}</h3>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                            <i className="fa-solid fa-shield-halved text-[9px]" /> {empObj?.role || "Employee"}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <i className="fa-solid fa-briefcase text-[9px]" /> {empType}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>{empObj?.email || ""}</span>
                          {empObj?.department && (
                            <>
                              <span>•</span>
                              <span className="text-foreground/80 font-medium">{empObj.department}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAttendanceLog(null)}
                      className="w-8 h-8 rounded-lg hover:bg-accent/60 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <i className="fa-solid fa-xmark text-sm" />
                    </Button>
                  </div>

                  {/* 3 Executive Stat Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-accent/20 border border-border/70 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider">Total Shifts</span>
                        <i className="fa-solid fa-calendar-check text-indigo-500 text-xs" />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black font-mono text-foreground">{empLogs.length}</span>
                        <span className="text-xs text-muted-foreground font-medium">Days</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">Recorded shift days</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider">All-Time Worked</span>
                        <i className="fa-solid fa-clock text-emerald-500 text-xs" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">{formatDuration(totalEmpWorked)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">Total active on-duty time</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider">All-Time Overtime</span>
                        <i className="fa-solid fa-fire text-amber-500 text-xs" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">+{formatDuration(totalEmpOvertime)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">Extra approved overtime</span>
                    </div>
                  </div>

                  {/* Selected Single Shift Record Detail */}
                  <div className="p-4 rounded-xl bg-accent/20 border border-border/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-calendar-day text-primary text-xs" /> Session: {selectedDateFormatted}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5",
                        isSelectedActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-muted text-muted-foreground border border-border"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", isSelectedActive ? "bg-emerald-500 animate-ping" : "bg-muted-foreground")} />
                        {isSelectedActive ? "Active Now" : "Shift Completed"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-card/80 border border-border/60">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                          <i className="fa-solid fa-arrow-right-to-bracket text-emerald-500" /> Clock In Time
                        </span>
                        <span className="text-sm font-bold font-mono text-foreground mt-1 block">
                          {(selectedAttendanceLog.originalClockIn || selectedAttendanceLog.clockIn)
                            ? new Date(selectedAttendanceLog.originalClockIn ?? selectedAttendanceLog.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                            : "--:--"}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg bg-card/80 border border-border/60">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                          <i className="fa-solid fa-arrow-right-from-bracket text-rose-500" /> Clock Out Time
                        </span>
                        <span className={cn(
                          "text-sm font-bold font-mono mt-1 block",
                          isSelectedActive ? "text-emerald-500" : "text-foreground"
                        )}>
                          {resolvedSelectedClockOut
                            ? resolvedSelectedClockOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                            : isSelectedActive
                            ? "Shift Active"
                            : "--:--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* All-Time Attendance History Table */}
                  {empLogs.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-timeline text-primary text-xs" /> Attendance History
                        </h4>
                        <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                          {empLogs.length} {empLogs.length === 1 ? "log" : "logs"}
                        </span>
                      </div>

                      <div className="max-h-48 overflow-y-auto rounded-xl border border-border/70 overflow-hidden shadow-inner">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-accent/40 text-muted-foreground font-semibold text-[10px] uppercase border-b border-border/70 sticky top-0 backdrop-blur-xs">
                            <tr>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Clock In</th>
                              <th className="py-2.5 px-3">Clock Out</th>
                              <th className="py-2.5 px-3 text-right">Regular Hrs</th>
                              <th className="py-2.5 px-3 text-right">Overtime</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {empLogs.map((h) => {
                              const { reg, ot } = getLogHours(h);
                              const isTodayRow = getISTDateString(new Date(h.date)) === getISTDateString();
                              const rowClockOut = getLogClockOutDate(h);
                              return (
                                <tr key={h._id} className={cn("hover:bg-accent/20 transition-colors", isTodayRow && "bg-primary/5 font-semibold")}>
                                  <td className="py-2 px-3 font-medium text-foreground whitespace-nowrap">
                                    {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-muted-foreground whitespace-nowrap">
                                    {(h.originalClockIn || h.clockIn) ? new Date(h.originalClockIn ?? h.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--"}
                                  </td>
                                  <td className="py-2 px-3 font-mono whitespace-nowrap">
                                    {rowClockOut ? (
                                      <span className="text-muted-foreground">{rowClockOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                    ) : (isTodayRow && (h.originalClockIn || h.clockIn)) ? (
                                      <span className="text-emerald-500 font-semibold">Active</span>
                                    ) : (
                                      <span className="text-muted-foreground">--</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 font-mono font-bold text-foreground text-right whitespace-nowrap">{formatDuration(reg)}</td>
                                  <td className="py-2 px-3 font-mono font-semibold text-right whitespace-nowrap">
                                    {ot > 0 ? <span className="text-amber-500">+{formatDuration(ot)}</span> : <span className="text-muted-foreground">0 mins</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/70 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <i className="fa-solid fa-clock text-[10px]" /> Shift records displayed in IST
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAttendanceLog(null)}
                      className="cursor-pointer gap-1.5 rounded-lg text-xs font-semibold hover:bg-accent"
                    >
                      <i className="fa-solid fa-xmark text-xs" /> Close Details
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Sleek In-App Sprint Delete Confirmation Modal */}
      {sprintToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete Sprint</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <strong className="text-foreground">{sprintToDelete.name}</strong>? Any linked tasks will be automatically unassigned from this sprint cycle.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSprintToDelete(null)}
                disabled={deletingSprint}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={() => handleDeleteSprint(sprintToDelete.id)}
                disabled={deletingSprint}
                className="gap-2 font-semibold"
              >
                {deletingSprint ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" /> Delete Sprint
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek In-App Timesheet Row Delete Confirmation Modal */}
      {timesheetRowToDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-trash-can text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete Timesheetseeing </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <strong className="text-foreground">{timesheetRowToDelete.project}</strong> ({timesheetRowToDelete.taskName || "General Tasks"})? All logged hours for this week will be permanently deleted from the database.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimesheetRowToDelete(null)}
                disabled={deletingTimesheetRow}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={handleConfirmDeleteTimesheetRow}
                disabled={deletingTimesheetRow}
                className="gap-2 font-semibold"
              >
                {deletingTimesheetRow ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" /> Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<Preloader label="Loading Calendar & Operations..." />}>
      <CalendarPageContent />
    </Suspense>
  );
}
