"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";

import { useTabPersistence } from "@/hooks/useTabPersistence";
import { TeamShiftOverviewCard } from "@/components/dashboard/TeamShiftOverviewCard";

export default function CalendarPage() {
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

  const [filterType, setFilterType] = useState<string>("All");
  const [filterDept, setFilterDept] = useState<string>("All");

  const [newEvtTitle, setNewEvtTitle] = useState("");
  const [newEvtDesc, setNewEvtDesc] = useState("");
  const [newEvtType, setNewEvtType] = useState<"Meeting" | "Holiday" | "Birthday" | "Deadline" | "Personal">("Meeting");
  const [newEvtDept, setNewEvtDept] = useState("All");
  const [newEvtStart, setNewEvtStart] = useState("");
  const [newEvtEnd, setNewEvtEnd] = useState("");

  // Sprints States
  const [sprints, setSprints] = useState<any[]>([]);
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
    { project: "NexAce CRM Implementation", taskName: "UI/UX Development", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, isBillable: true },
    { project: "Client Portal Integration", taskName: "API endpoints integration", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, isBillable: true },
  ]);

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

  const exportAttendanceToCSV = () => {
    const targetLogs = selectedDateFilter
      ? attendanceHistory.filter((log) => new Date(log.date).toISOString().split("T")[0] === selectedDateFilter)
      : attendanceHistory;

    if (!targetLogs || targetLogs.length === 0) {
      showToast("No shift log data available for the selected date filter!", "error");
      return;
    }

    const headers = ["Employee", "Email", "Role", "Date", "Status", "Clock In", "Clock Out", "Regular Hours", "Overtime Hours"];
    const csvRows = [headers.join(",")];

    targetLogs.forEach((log) => {
      const empObj = typeof log.userId === "object" ? log.userId : null;
      const empName = `"${empObj?.name || 'Employee'}"`;
      const empEmail = `"${empObj?.email || ''}"`;
      const empRole = `"${empObj?.role || 'Employee'}"`;
      const dateStr = `"${new Date(log.date).toLocaleDateString()}"`;
      const statusStr = `"${log.status || 'Present'}"`;
      const clockInStr = `"${log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}"`;
      const clockOutStr = `"${log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (log.clockIn ? 'Active' : '--')}"`;
      const regHrs = log.regularHours || 0;
      const otHrs = log.overtimeHours || 0;

      csvRows.push([empName, empEmail, empRole, dateStr, statusStr, clockInStr, clockOutStr, regHrs, otHrs].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Shift_Attendance_Log_${selectedDateFilter || new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Shift logs exported to Excel CSV format successfully!", "success");
  };

  const [projectsList, setProjectsList] = useState<string[]>(["General Administration"]);

  const isManagerOrAdmin = currentUser?.role === "Admin" || currentUser?.role === "Manager";

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
        const names = data.projects.map((p: any) => p.name);
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
                mon: 0, tue: 0, wed: 0, thu: 0, fri: 0,
                isBillable: entry.isBillable,
                status: entry.status
              };
            }
            
            if (dayIndex === 0) rowsMap[key].mon = entry.hours;
            else if (dayIndex === 1) rowsMap[key].tue = entry.hours;
            else if (dayIndex === 2) rowsMap[key].wed = entry.hours;
            else if (dayIndex === 3) rowsMap[key].thu = entry.hours;
            else if (dayIndex === 4) rowsMap[key].fri = entry.hours;
          });
          setTimesheetRows(Object.values(rowsMap));
        } else {
          setTimesheetRows([
            { project: projectsList[0] || "NexAce CRM Implementation", taskName: "UI/UX Development", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, isBillable: true },
            { project: projectsList[1] || "Client Portal Integration", taskName: "API endpoints integration", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, isBillable: true },
          ]);
        }
      }

      if (can("approveTimesheets") || isOPS || isAdmin) {
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
      if (activeTab === "calendar") await fetchEvents();
      else if (activeTab === "sprints") await fetchSprints();
      else if (activeTab === "timesheets") {
        await fetchProjects();
        await fetchTimesheets();
      }
      else if (activeTab === "attendance") await fetchAttendance();
      setLoading(false);
    };
    loadData();
  }, [activeTab, timesheetWeekStart, mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (attendanceToday && !attendanceToday.clockOut) {
      const startTime = new Date(attendanceToday.clockIn).getTime();

      const interval = setInterval(() => {
        const diffMs = Date.now() - startTime;
        const totalSecs = Math.floor(diffMs / 1000);
        setTotalSecondsWorked(totalSecs);

        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        
        const pad = (n: number) => String(n).padStart(2, "0");
        setElapsedTime(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      if (attendanceToday?.clockIn && attendanceToday?.clockOut) {
        const duration = new Date(attendanceToday.clockOut).getTime() - new Date(attendanceToday.clockIn).getTime();
        const totalSecs = Math.floor(duration / 1000);
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

  const handleUpdateSprintStatus = async (sprintId: string, status: "Active" | "Completed") => {
    try {
      const res = await fetch("/api/sprints", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId, status }),
      });
      if (res.ok) {
        await fetchSprints();
        showToast(`Sprint marked as ${status}!`, "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to update sprint status.", "error");
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
      { project: projectsList[0], taskName: "", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, isBillable: true },
    ]);
  };

  const handleSaveTimesheet = async (submitStatus: "Draft" | "Pending") => {
    const entryPayload: any[] = [];
    const weekdaysOffset = [0, 1, 2, 3, 4];

    timesheetRows.forEach((row) => {
      const days = ["mon", "tue", "wed", "thu", "fri"];
      days.forEach((day, index) => {
        const hoursVal = Number(row[day]);
        if (hoursVal > 0) {
          const entryDate = new Date(timesheetWeekStart);
          entryDate.setDate(entryDate.getDate() + weekdaysOffset[index]);
          
          entryPayload.push({
            project: row.project,
            taskName: row.taskName || "General Tasks",
            hours: hoursVal,
            date: entryDate,
            isBillable: row.isBillable,
            status: submitStatus,
          });
        }
      });
    });

    if (entryPayload.length === 0) {
      showToast("Please log at least one hour before saving!", "error");
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
            <Button color="primary" size="sm" onClick={() => setShowEventModal(true)} className="gap-2 font-semibold">
              <i className="fa-solid fa-plus text-xs" /> Schedule Event
            </Button>
          )}

          {activeTab === "sprints" && isManagerOrAdmin && (
            <Button color="primary" size="sm" onClick={() => setShowSprintModal(true)} className="gap-2 font-semibold">
              <i className="fa-solid fa-rocket text-xs" /> Plan Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("calendar")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "calendar"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-calendar-days text-sm" /> Shared Calendar
        </button>

        <button
          onClick={() => setActiveTab("sprints")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "sprints"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-rocket text-sm" /> Sprint Board
        </button>

        <button
          onClick={() => setActiveTab("timesheets")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "timesheets"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-file-csv text-sm" /> Timesheets
        </button>

        <button
          onClick={() => setActiveTab("attendance")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "attendance"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-fingerprint text-sm" /> Shift Clock
        </button>
      </div>

      {/* Tab 1: Calendar */}
      {activeTab === "calendar" && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                <i className="fa-solid fa-chevron-left text-xs" />
              </Button>
              <h2 className="text-lg font-bold text-foreground">
                {monthsNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8">
                <i className="fa-solid fa-chevron-right text-xs" />
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="h-8 px-2.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="All">All Event Types</option>
                <option value="Meeting">Meetings</option>
                <option value="Holiday">Holidays</option>
                <option value="Birthday">Birthdays</option>
                <option value="Deadline">Deadlines</option>
                <option value="Personal">Personal</option>
              </select>

              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="h-8 px-2.5 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="All">All Departments</option>
                <option value="Management">Management</option>
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
              </select>
            </div>
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
                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="bg-muted/80 dark:bg-slate-800/90 py-2 px-1 text-center text-xs font-bold text-foreground uppercase rounded-lg border border-border/80 dark:border-slate-700/80 shadow-xs">
                        {day}
                      </div>
                    ))}
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

                      return (
                        <div
                          key={idx}
                          className={cn(
                            "relative p-2.5 min-h-[120px] max-h-[140px] rounded-xl border flex flex-col justify-start gap-1.5 transition-all duration-200 group shadow-xs overflow-hidden",
                            isToday
                              ? "bg-primary/10 border-2 border-primary ring-2 ring-primary/30 shadow-md shadow-primary/10"
                              : hasEvents
                              ? "bg-card dark:bg-slate-900/95 border-primary/40 dark:border-primary/30 shadow-xs hover:border-primary/70 hover:shadow-md hover:bg-accent/40"
                              : "bg-card/90 dark:bg-slate-900/60 border-border dark:border-slate-800/90 hover:border-primary/50 hover:bg-accent/30"
                          )}
                        >
                          <div className="flex items-center justify-between shrink-0">
                            <span
                              className={cn(
                                "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-105",
                                isToday
                                  ? "bg-primary text-primary-foreground font-extrabold shadow-xs"
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
                <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/30">
                  {events.length} Total Schedule Events
                </Badge>
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
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <i className="fa-solid fa-rocket text-primary text-base" /> Active Sprint & Burndown
              </CardTitle>
              <CardDescription>Current sprint objective and task velocity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {sprints.filter((s) => s.status === "Active").length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No active sprint running right now.</p>
              ) : (
                sprints.filter((s) => s.status === "Active").map((active) => (
                  <div key={active._id} className="space-y-4 p-4 rounded-xl border border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-foreground">{active.name}</h3>
                      <Badge color="primary">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground"><strong>Goal:</strong> {active.goal || "None"}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>Burndown Progress</span>
                        <span className="text-primary">{active.burndownProgress || 0}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${active.burndownProgress || 0}%` }} />
                      </div>
                    </div>
                    {isManagerOrAdmin && (
                      <Button size="sm" variant="outline" onClick={() => handleUpdateSprintStatus(active._id, "Completed")}>
                        Complete Sprint
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Planned & Completed</CardTitle>
              <CardDescription>Sprint backlog roadmap</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sprints.filter((s) => s.status !== "Active").map((sprint) => (
                <div key={sprint._id} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-foreground">{sprint.name}</p>
                    <p className="text-muted-foreground mt-0.5">{new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}</p>
                  </div>
                  <Badge color={sprint.status === "Planned" ? "warning" : "success"} variant="soft">
                    {sprint.status}
                  </Badge>
                </div>
              ))}
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
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <i className="fa-solid fa-file-csv text-primary text-base" /> Log Weekly Hours
                  </CardTitle>
                  <CardDescription>Record your daily work hours on projects</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const prev = new Date(timesheetWeekStart);
                      prev.setDate(prev.getDate() - 7);
                      setTimesheetWeekStart(prev);
                    }}
                  >
                    <i className="fa-solid fa-chevron-left text-xs" />
                  </Button>
                  <span className="text-xs font-semibold">
                    Week of {timesheetWeekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = new Date(timesheetWeekStart);
                      next.setDate(next.getDate() + 7);
                      setTimesheetWeekStart(next);
                    }}
                  >
                    <i className="fa-solid fa-chevron-right text-xs" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs font-semibold uppercase">
                        <th className="py-2.5 pr-4 min-w-[180px]">Project</th>
                        <th className="py-2.5 px-2 min-w-[140px]">Task Description</th>
                        <th className="py-2.5 px-2 text-center w-16">Mon</th>
                        <th className="py-2.5 px-2 text-center w-16">Tue</th>
                        <th className="py-2.5 px-2 text-center w-16">Wed</th>
                        <th className="py-2.5 px-2 text-center w-16">Thu</th>
                        <th className="py-2.5 px-2 text-center w-16">Fri</th>
                        <th className="py-2.5 pl-4 text-center w-20">Billable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {timesheetRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-accent/10 transition-colors">
                          <td className="py-3 pr-4">
                            <select
                              value={row.project}
                              onChange={(e) => handleRowChange(idx, "project", e.target.value)}
                              className="w-full h-9 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              {projectsList.map((proj) => (
                                <option key={proj} value={proj}>{proj}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-2">
                            <Input
                              value={row.taskName}
                              onChange={(e) => handleRowChange(idx, "taskName", e.target.value)}
                              placeholder="e.g. Code Review"
                              className="h-9 text-xs"
                            />
                          </td>
                          {["mon", "tue", "wed", "thu", "fri"].map((day) => (
                            <td key={day} className="py-3 px-2">
                              <Input
                                type="number"
                                min="0"
                                max="24"
                                step="0.5"
                                value={row[day] || ""}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  handleRowChange(idx, day, isNaN(val) ? 0 : val);
                                }}
                                className="h-9 w-14 text-center text-xs p-1"
                              />
                            </td>
                          ))}
                          <td className="py-3 pl-4 text-center">
                            <input
                              type="checkbox"
                              checked={row.isBillable}
                              onChange={(e) => handleRowChange(idx, "isBillable", e.target.checked)}
                              className="rounded border-border text-primary w-4 h-4 cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-border/65">
                  <Button variant="outline" size="sm" onClick={handleAddTimesheetRow} className="gap-1.5 self-start">
                    <i className="fa-solid fa-plus text-xs" /> Add Row
                  </Button>
                  <div className="flex gap-2 self-end">
                    <Button variant="outline" size="sm" onClick={() => handleSaveTimesheet("Draft")}>
                      Save Draft
                    </Button>
                    <Button color="primary" size="sm" onClick={() => handleSaveTimesheet("Pending")}>
                      Submit Timesheet
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right sidebar details */}
            <div className="space-y-6">
              {/* Timesheet Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Week Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Total Hours Logged</span>
                    <span className="font-bold text-foreground">
                      {timesheetRows.reduce((acc, row) => acc + (Number(row.mon) || 0) + (Number(row.tue) || 0) + (Number(row.wed) || 0) + (Number(row.thu) || 0) + (Number(row.fri) || 0), 0)} hrs
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Billable Hours</span>
                    <span className="font-semibold text-emerald-500">
                      {timesheetRows.reduce((acc, row) => row.isBillable ? acc + (Number(row.mon) || 0) + (Number(row.tue) || 0) + (Number(row.wed) || 0) + (Number(row.thu) || 0) + (Number(row.fri) || 0) : acc, 0)} hrs
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Non-Billable Hours</span>
                    <span className="font-semibold text-amber-500">
                      {timesheetRows.reduce((acc, row) => !row.isBillable ? acc + (Number(row.mon) || 0) + (Number(row.tue) || 0) + (Number(row.wed) || 0) + (Number(row.thu) || 0) + (Number(row.fri) || 0) : acc, 0)} hrs
                    </span>
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

      {/* Tab 3: Shift Clock & Attendance */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {!isAdmin && !isOPS && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Shift Timer & Clock Control Card */}
              <Card className="lg:col-span-2 p-8 text-center flex flex-col justify-between items-center space-y-6 border border-border/80 bg-card/60">
                <div className="inline-flex p-4 rounded-2xl bg-primary/10 text-primary">
                  <i className="fa-solid fa-clock text-4xl animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-4xl font-extrabold tracking-tight text-foreground font-mono">{elapsedTime}</h2>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Today's Active Shift Duration
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {!attendanceToday?.clockIn ? (
                    <Button color="primary" size="lg" onClick={() => handleClockAction("in")} className="gap-2 px-8 font-bold">
                      <i className="fa-solid fa-fingerprint text-lg" /> Clock In Now
                    </Button>
                  ) : !attendanceToday?.clockOut ? (
                    <Button color="destructive" size="lg" onClick={() => handleClockAction("out")} className="gap-2 px-8 font-bold">
                      <i className="fa-solid fa-stopwatch text-lg" /> Clock Out Shift
                    </Button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <Badge color="success" className="text-sm px-4 py-1.5 font-semibold">
                        <i className="fa-solid fa-check-circle mr-1.5" /> Shift Completed Today
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => handleClockAction("resume")} className="gap-2 text-primary border-primary/40 hover:bg-primary/10">
                        <i className="fa-solid fa-play text-xs" /> Resume Shift
                      </Button>
                    </div>
                  )}
                </div>

                {/* Timestamp Badges */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm pt-4 border-t border-border/60 text-xs">
                  <div className="p-2.5 rounded-lg bg-accent/30 border border-border/50">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Clock In Time</span>
                    <span className="font-mono font-bold text-foreground">
                      {attendanceToday?.clockIn ? new Date(attendanceToday.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-accent/30 border border-border/50">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Clock Out Time</span>
                    <span className="font-mono font-bold text-foreground">
                      {attendanceToday?.clockOut ? new Date(attendanceToday.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (attendanceToday?.clockIn ? "Active" : "--:--")}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Shift Metadata Information Panel */}
              <Card className="p-6 border border-border/80 bg-card/60 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border/60">
                    <i className="fa-solid fa-user-clock text-primary text-sm" />
                    <h3 className="text-sm font-bold text-foreground">Shift Schedule Details</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Assigned Shift</span>
                      <span className="font-bold text-foreground">{shiftInfo?.shiftName || "Standard Regular Shift"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Shift Window</span>
                      <span className="font-semibold text-foreground font-mono">{shiftInfo?.startTime || "09:00 AM"} - {shiftInfo?.endTime || "05:00 PM"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/40">
                      <span className="text-muted-foreground">Daily Target</span>
                      <span className="font-semibold text-foreground font-mono">{shiftInfo?.targetHours || 8.0} Hours</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Work Location</span>
                      <span className="font-semibold text-emerald-500">{shiftInfo?.location || "Hybrid"}</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
                  <i className="fa-solid fa-circle-info text-sm" />
                  Clock-in records automatically calculate regular and overtime hours upon clock-out.
                </div>
              </Card>
            </div>
          )}

          {/* Recent Attendance History Table */}
          <Card className="p-6 border border-border/80 bg-card/60 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-list-check text-primary text-sm" />
                <h3 className="text-base font-bold text-foreground">Shift Attendance Logs & History</h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={showAllAttendance ? "default" : "outline"}
                  size="sm"
                  onClick={async () => {
                    const nextState = !showAllAttendance;
                    setShowAllAttendance(nextState);
                    setAttendancePage(1);
                    await fetchAttendance(nextState);
                  }}
                  className="gap-1.5 text-xs font-semibold"
                >
                  <i className="fa-solid fa-database text-xs" />
                  {showAllAttendance ? "Show Limited" : "Show All Records"}
                </Button>

                <Button
                  color="primary"
                  size="sm"
                  onClick={exportAttendanceToCSV}
                  className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <i className="fa-solid fa-file-excel text-xs" />
                  Export to Excel (CSV)
                </Button>
              </div>
            </div>

            {/* Whole Day Date Filter & Summary Banner */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-accent/20 border border-border/60">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-calendar-day text-primary text-sm" />
                  <span className="text-xs font-bold text-foreground">Select Day:</span>
                  <input
                    type="date"
                    value={selectedDateFilter}
                    onChange={(e) => {
                      setSelectedDateFilter(e.target.value);
                      setAttendancePage(1);
                    }}
                    className="h-8 px-2.5 text-xs bg-background border border-border rounded-lg text-foreground outline-none cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={selectedDateFilter === new Date().toISOString().split("T")[0] ? "default" : "outline"}
                    onClick={() => {
                      setSelectedDateFilter(new Date().toISOString().split("T")[0]);
                      setAttendancePage(1);
                    }}
                    className="h-8 px-2.5 text-xs cursor-pointer"
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedDateFilter === new Date(Date.now() - 86400000).toISOString().split("T")[0] ? "default" : "outline"}
                    onClick={() => {
                      setSelectedDateFilter(new Date(Date.now() - 86400000).toISOString().split("T")[0]);
                      setAttendancePage(1);
                    }}
                    className="h-8 px-2.5 text-xs cursor-pointer"
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
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <i className="fa-solid fa-rotate-left mr-1" /> All Days
                    </Button>
                  )}
                </div>
              </div>

              {/* Whole Day Summary Pills */}
              {(() => {
                const targetLogs = selectedDateFilter
                  ? attendanceHistory.filter((log) => new Date(log.date).toISOString().split("T")[0] === selectedDateFilter)
                  : attendanceHistory;

                const totalStaff = targetLogs.length;
                const totalRegHours = targetLogs.reduce((acc: number, log: any) => acc + (log.regularHours || 0), 0);
                const totalOtHours = targetLogs.reduce((acc: number, log: any) => acc + (log.overtimeHours || 0), 0);

                return (
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <div className="px-3 py-1.5 rounded-lg bg-card border border-border/60 flex items-center gap-2">
                      <i className="fa-solid fa-users text-primary text-xs" />
                      <span className="text-muted-foreground">Staff Logs:</span>
                      <strong className="text-foreground font-bold">{totalStaff}</strong>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <i className="fa-solid fa-clock text-xs" />
                      <span>Day Hours:</span>
                      <strong className="font-bold font-mono">{totalRegHours.toFixed(1)} hrs</strong>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <i className="fa-solid fa-fire text-xs" />
                      <span>Day Overtime:</span>
                      <strong className="font-bold font-mono">+{totalOtHours.toFixed(1)} hrs</strong>
                    </div>
                  </div>
                );
              })()}
            </div>

            {(() => {
              const filteredHistory = selectedDateFilter
                ? attendanceHistory.filter((log) => new Date(log.date).toISOString().split("T")[0] === selectedDateFilter)
                : attendanceHistory;

              const totalItems = filteredHistory.length;
              const totalPages = Math.ceil(totalItems / attendanceRowsPerPage) || 1;
              const startIndex = (attendancePage - 1) * attendanceRowsPerPage;
              const paginatedItems = filteredHistory.slice(startIndex, startIndex + attendanceRowsPerPage);

              return (
                <>
                  <div className="overflow-x-auto pt-1">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-semibold uppercase">
                          {(isAdmin || isOPS) && <th className="py-3 px-3">Employee</th>}
                          <th className="py-3 px-3">Date</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3">Clock In</th>
                          <th className="py-3 px-3">Clock Out</th>
                          <th className="py-3 px-3 text-right">Regular Hrs</th>
                          <th className="py-3 px-3 text-right">Overtime</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {paginatedItems.length === 0 ? (
                          <tr>
                            <td colSpan={(isAdmin || isOPS) ? 7 : 6} className="py-6 text-center text-muted-foreground">No shift logs recorded yet.</td>
                          </tr>
                        ) : (
                          paginatedItems.map((log) => {
                            const isSelected = selectedAttendanceLog?._id === log._id;
                            const empObj = typeof log.userId === "object" ? log.userId : null;
                            return (
                              <tr
                                key={log._id}
                                onClick={() => setSelectedAttendanceLog(log)}
                                className={cn(
                                  "transition-all cursor-pointer group",
                                  isSelected
                                    ? "bg-primary/15 border-l-2 border-l-primary"
                                    : "hover:bg-accent/30"
                                )}
                              >
                                {(isAdmin || isOPS) && (
                                  <td className="py-3 px-3 font-semibold text-foreground">
                                    {empObj ? (
                                      <div className="flex items-center gap-2 min-w-[130px]">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px] border border-primary/20 shrink-0">
                                          {empObj.name?.[0] || "U"}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-bold text-xs truncate leading-tight">{empObj.name}</div>
                                          <div className="text-[10px] text-muted-foreground font-normal truncate">{empObj.role || "Employee"}</div>
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground italic">Employee Record</span>
                                    )}
                                  </td>
                                )}
                                <td className="py-3 px-3 font-semibold text-foreground flex items-center gap-2">
                                  <i className={cn("fa-solid fa-clock-rotate-left text-xs transition-transform group-hover:scale-110", isSelected ? "text-primary" : "text-primary/70")} />
                                  <span>{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <Badge color={log.status === "Present" ? "success" : "warning"} variant="soft" className="text-[10px]">
                                    {log.status}
                                  </Badge>
                                </td>
                                <td className="py-3 px-3 font-mono text-muted-foreground">
                                  {log.clockIn ? new Date(log.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--"}
                                </td>
                                <td className="py-3 px-3 font-mono text-muted-foreground">
                                  {log.clockOut ? new Date(log.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (log.clockIn ? "Active" : "--")}
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                                  {log.regularHours || 0} hrs
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-semibold text-amber-500">
                                  {log.overtimeHours ? `+${log.overtimeHours} hrs` : "0 hrs"}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Toolbar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    <div>
                      Showing <strong className="text-foreground">{totalItems > 0 ? startIndex + 1 : 0}</strong> to{" "}
                      <strong className="text-foreground">{Math.min(startIndex + attendanceRowsPerPage, totalItems)}</strong> of{" "}
                      <strong className="text-foreground">{totalItems}</strong> entries
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 mr-2">
                        <span>Rows per page:</span>
                        <select
                          value={attendanceRowsPerPage}
                          onChange={(e) => {
                            setAttendanceRowsPerPage(Number(e.target.value));
                            setAttendancePage(1);
                          }}
                          className="h-7 px-2 bg-background border border-border rounded text-foreground focus:outline-none text-xs"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={attendancePage <= 1}
                        onClick={() => setAttendancePage((p) => Math.max(p - 1, 1))}
                        className="h-7 px-2 text-xs"
                      >
                        Previous
                      </Button>

                      <span className="font-semibold text-foreground px-1">
                        {attendancePage} / {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={attendancePage >= totalPages}
                        onClick={() => setAttendancePage((p) => Math.min(p + 1, totalPages))}
                        className="h-7 px-2 text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
          </Card>

          {/* Organization Team Shift Roster & Employee Shift Attendance Board */}
          <TeamShiftOverviewCard />
        </div>
      )}

      {/* Schedule Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowEventModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">Schedule New Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Event Title *</label>
                <Input value={newEvtTitle} onChange={(e) => setNewEvtTitle(e.target.value)} placeholder="e.g. Q3 Roadmap Review" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Type</label>
                  <select
                    value={newEvtType}
                    onChange={(e: any) => setNewEvtType(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Birthday">Birthday / Anniversary</option>
                    <option value="Deadline">Deadline</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Department</label>
                  <select
                    value={newEvtDept}
                    onChange={(e) => setNewEvtDept(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <label className="text-xs font-semibold text-foreground">Start Date & Time *</label>
                  <Input type="datetime-local" value={newEvtStart} onChange={(e) => setNewEvtStart(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">End Date & Time *</label>
                  <Input type="datetime-local" value={newEvtEnd} onChange={(e) => setNewEvtEnd(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  value={newEvtDesc}
                  onChange={(e) => setNewEvtDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  placeholder="Agenda details, video call links..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowEventModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit">
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
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">Plan New Sprint</h3>
            <form onSubmit={handleCreateSprint} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Sprint Name *</label>
                <Input value={newSprintName} onChange={(e) => setNewSprintName(e.target.value)} placeholder="e.g. Sprint 4 - Core API" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Start Date *</label>
                  <Input type="date" value={newSprintStart} onChange={(e) => setNewSprintStart(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">End Date *</label>
                  <Input type="date" value={newSprintEnd} onChange={(e) => setNewSprintEnd(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Sprint Goal</label>
                <textarea
                  value={newSprintGoal}
                  onChange={(e) => setNewSprintGoal(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  placeholder="Primary sprint objectives and deliverables..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowSprintModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit">
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
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const empObj = typeof selectedAttendanceLog.userId === "object" ? selectedAttendanceLog.userId : null;
              const empId = empObj?._id || selectedAttendanceLog.userId;
              
              const empLogs = attendanceHistory.filter((h) => {
                const hId = typeof h.userId === "object" ? h.userId?._id : h.userId;
                return String(hId) === String(empId);
              });

              const totalEmpHours = empLogs.reduce((acc, h) => acc + (h.regularHours || 0), 0);
              const totalEmpOvertime = empLogs.reduce((acc, h) => acc + (h.overtimeHours || 0), 0);
              const empType = empObj?.employmentType || "Permanent";

              return (
                <>
                  {/* Employee Profile & Record Header */}
                  <div className="flex justify-between items-start border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-sm border border-primary/30 shrink-0">
                        {empObj?.name?.[0] || "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-foreground">{empObj?.name || "Employee Attendance Record"}</h3>
                          <Badge variant="soft" color="primary" className="text-[10px]">
                            {empObj?.role || "Employee"}
                          </Badge>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {empType}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {empObj?.email || ""} {empObj?.department ? `• ${empObj.department}` : ""}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedAttendanceLog(null)}>
                      <i className="fa-solid fa-xmark text-sm" />
                    </Button>
                  </div>

                  {/* All-Time Work Stats Cards */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-accent/20 border border-border/60 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Shifts Logged</span>
                      <p className="text-lg font-extrabold text-foreground">{empLogs.length} Days</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">All-Time Worked</span>
                      <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{totalEmpHours.toFixed(1)} Hrs</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">All-Time Overtime</span>
                      <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400">+{totalEmpOvertime.toFixed(1)} Hrs</p>
                    </div>
                  </div>

                  {/* Selected Single Shift Record Detail */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-calendar-day text-primary" /> Shift Session ({new Date(selectedAttendanceLog.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })})
                    </h4>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                          <i className="fa-solid fa-fingerprint text-primary" /> Clock In Time
                        </span>
                        <span className="text-sm font-bold font-mono text-foreground block">
                          {selectedAttendanceLog.clockIn ? new Date(selectedAttendanceLog.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--:--"}
                        </span>
                      </div>

                      <div className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                          <i className="fa-solid fa-stopwatch text-rose-500" /> Clock Out Time
                        </span>
                        <span className="text-sm font-bold font-mono text-foreground block">
                          {selectedAttendanceLog.clockOut ? new Date(selectedAttendanceLog.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (selectedAttendanceLog.clockIn ? "Shift Active" : "--:--")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* All-Time Attendance History Table for this Employee */}
                  {empLogs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-history text-indigo-500" /> All-Time Attendance History Log ({empLogs.length})
                      </h4>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/50 text-muted-foreground font-semibold text-[10px] uppercase border-b border-border sticky top-0">
                            <tr>
                              <th className="p-2">Date</th>
                              <th className="p-2">Clock In</th>
                              <th className="p-2">Clock Out</th>
                              <th className="p-2 text-right">Regular Hrs</th>
                              <th className="p-2 text-right">Overtime</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {empLogs.map((h) => (
                              <tr key={h._id} className="hover:bg-accent/20">
                                <td className="p-2 font-medium text-foreground">
                                  {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td className="p-2 font-mono text-muted-foreground">
                                  {h.clockIn ? new Date(h.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : "--"}
                                </td>
                                <td className="p-2 font-mono text-muted-foreground">
                                  {h.clockOut ? new Date(h.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (h.clockIn ? "Active" : "--")}
                                </td>
                                <td className="p-2 font-mono font-bold text-foreground text-right">{h.regularHours || 0} hrs</td>
                                <td className="p-2 font-mono font-semibold text-amber-500 text-right">{h.overtimeHours ? `+${h.overtimeHours} hrs` : "0 hrs"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-3 border-t border-border">
                    <Button variant="outline" size="sm" onClick={() => setSelectedAttendanceLog(null)}>
                      Close Details
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
