"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Rocket, 
  Clock, 
  Fingerprint, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet,
  CheckCheck,
  Building,
  UserCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function CalendarPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"calendar" | "sprints" | "timesheets" | "attendance">("calendar");

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

  const [projectsList, setProjectsList] = useState<string[]>(["General Administration"]);

  const isAdmin = currentUser?.role === "Admin";
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
        }
      }

      if (isManagerOrAdmin) {
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

  const fetchAttendance = async () => {
    try {
      const res = await fetch("/api/attendance");
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

      setTimerIntervalId(interval);
      return () => clearInterval(interval);
    } else {
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
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
  }, [attendanceToday]);

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
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground text-sm">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-3" />
        Loading Calendar & Operations...
      </div>
    );
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
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
            <Button color="primary" size="sm" onClick={() => setShowEventModal(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Schedule Event
            </Button>
          )}

          {activeTab === "sprints" && isManagerOrAdmin && (
            <Button color="primary" size="sm" onClick={() => setShowSprintModal(true)} className="gap-2">
              <Rocket className="w-4 h-4" /> Plan Sprint
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => startTransition(() => setActiveTab("calendar"))}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "calendar"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarIcon className="w-4 h-4" /> Shared Calendar
        </button>

        <button
          onClick={() => startTransition(() => setActiveTab("sprints"))}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "sprints"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Rocket className="w-4 h-4" /> Sprint Board
        </button>

        <button
          onClick={() => startTransition(() => setActiveTab("timesheets"))}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "timesheets"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FileSpreadsheet className="w-4 h-4" /> Timesheets
        </button>

        <button
          onClick={() => startTransition(() => setActiveTab("attendance"))}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "attendance"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Fingerprint className="w-4 h-4" /> Shift Clock
        </button>
      </div>

      {/* Tab 1: Calendar */}
      {activeTab === "calendar" && (
        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-bold text-foreground">
                {monthsNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
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

          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="bg-muted/60 p-2.5 text-center text-xs font-semibold text-muted-foreground uppercase">
                {day}
              </div>
            ))}

            {daysArray.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="bg-card/40 min-h-[90px] p-2" />;
              
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

              return (
                <div
                  key={idx}
                  className={cn(
                    "bg-card p-2 min-h-[100px] flex flex-col justify-start gap-1 transition-colors hover:bg-accent/30",
                    isToday && "bg-primary/5 ring-1 ring-primary inset-0"
                  )}
                >
                  <span className={cn("text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full", isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                    {dayStr}
                  </span>
                  <div className="space-y-1 overflow-y-auto max-h-[70px] no-scrollbar">
                    {dayEvents.map((evt) => (
                      <div
                        key={evt._id}
                        onClick={() => setSelectedEvent(evt)}
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded truncate cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Tab 2: Sprints */}
      {activeTab === "sprints" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" /> Active Sprint & Burndown
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
                    <FileSpreadsheet className="w-5 h-5 text-primary" /> Log Weekly Hours
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
                    <ChevronLeft className="w-4 h-4" />
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
                    <ChevronRight className="w-4 h-4" />
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
                    <Plus className="w-4 h-4" /> Add Row
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
                      <UserCheck className="w-4 h-4 text-primary" /> Pending Approvals
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

      {/* Tab 3: Shift Clock */}
      {activeTab === "attendance" && (
        <Card className="p-8 max-w-xl mx-auto space-y-6 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-primary/10 text-primary">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground font-mono">{elapsedTime}</h2>
            <p className="text-xs text-muted-foreground mt-1">Shift Duration Today</p>
          </div>

          <div className="flex items-center justify-center gap-4">
            {!attendanceToday?.clockIn ? (
              <Button color="primary" size="lg" onClick={() => handleClockAction("in")} className="gap-2 px-8">
                <Fingerprint className="w-5 h-5" /> Clock In
              </Button>
            ) : !attendanceToday?.clockOut ? (
              <Button color="destructive" size="lg" onClick={() => handleClockAction("out")} className="gap-2 px-8">
                <Clock className="w-5 h-5" /> Clock Out
              </Button>
            ) : (
              <Badge color="success" className="text-sm px-4 py-1">Shift Finished</Badge>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
