"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import styles from "./calendar.module.css";

export default function CalendarPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"calendar" | "sprints" | "timesheets" | "attendance">("calendar");

  // Loading indicator states
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

  // ----------------- Tab 1: Calendar States -----------------
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // New Event form states
  const [newEvtTitle, setNewEvtTitle] = useState("");
  const [newEvtDesc, setNewEvtDesc] = useState("");
  const [newEvtType, setNewEvtType] = useState<"Meeting" | "Holiday" | "Birthday" | "Deadline" | "Personal">("Meeting");
  const [newEvtDept, setNewEvtDept] = useState("All");
  const [newEvtStart, setNewEvtStart] = useState("");
  const [newEvtEnd, setNewEvtEnd] = useState("");

  // ----------------- Tab 2: Sprints States -----------------
  const [sprints, setSprints] = useState<any[]>([]);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");

  // ----------------- Tab 3: Timesheet States -----------------
  const [timesheetEntries, setTimesheetEntries] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [timesheetWeekStart, setTimesheetWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const mon = new Date(d.setDate(diff));
    mon.setHours(0,0,0,0);
    return mon;
  });

  // Timesheet grid inputs state: Array of rows representing logged items
  const [timesheetRows, setTimesheetRows] = useState<any[]>([
    { project: "NexAce CRM Implementation", taskName: "UI/UX Development", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, isBillable: true },
    { project: "Client Portal Integration", taskName: "API endpoints integration", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, isBillable: true },
  ]);

  // ----------------- Tab 4: Attendance States -----------------
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [timerIntervalId, setTimerIntervalId] = useState<NodeJS.Timeout | null>(null);

  const departments = ["All", "Management", "Engineering", "Design", "Marketing"];
  const projectsList = ["NexAce CRM Implementation", "Client Portal Integration", "Website Redesign", "Marketing Campaign", "General Internal Admin"];

  // Role permissions helpers
  const isAdmin = currentUser?.role === "Admin";
  const isManagerOrAdmin = currentUser?.role === "Admin" || currentUser?.role === "Manager";

  // ==========================================
  // FETCHERS
  // ==========================================

  // Fetch Calendar Events
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

  // Fetch Sprints
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

  // Fetch Timesheets for current week + pending approvals
  const fetchTimesheets = async () => {
    try {
      const startStr = timesheetWeekStart.toISOString();
      const end = new Date(timesheetWeekStart);
      end.setDate(end.getDate() + 6);
      const endStr = end.toISOString();

      // Fetch current logged entries
      const res = await fetch(`/api/timesheets?start=${startStr}&end=${endStr}`);
      if (res.ok) {
        const data = await res.json();
        setTimesheetEntries(data.entries || []);

        // Populating the UI grid input fields if backend has data
        if (data.entries && data.entries.length > 0) {
          // Group tasks by project and taskName to represent in the grid rows
          const rowsMap: { [key: string]: any } = {};
          data.entries.forEach((entry: any) => {
            const key = `${entry.project}-${entry.taskName}`;
            const entryDate = new Date(entry.date);
            const dayIndex = (entryDate.getDay() + 6) % 7; // Mon=0, Tue=1, ..., Sun=6
            
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
          // Reset grid inputs to default if no records exist for this week
          setTimesheetRows([
            { project: "NexAce CRM Implementation", taskName: "UI/UX Development", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, isBillable: true },
            { project: "Client Portal Integration", taskName: "API endpoints integration", mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, isBillable: true },
          ]);
        }
      }

      // Fetch pending direct report timesheets for Manager view
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

  // Fetch Attendance Log
  const fetchAttendance = async () => {
    try {
      const res = await fetch("/api/attendance");
      if (res.ok) {
        const data = await res.json();
        setAttendanceToday(data.attendance);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load active tab data
  useEffect(() => {
    if (!mounted) return;
    const loadData = async () => {
      setLoading(true);
      if (activeTab === "calendar") await fetchEvents();
      else if (activeTab === "sprints") await fetchSprints();
      else if (activeTab === "timesheets") await fetchTimesheets();
      else if (activeTab === "attendance") await fetchAttendance();
      setLoading(false);
    };
    loadData();
  }, [activeTab, timesheetWeekStart, mounted]);

  // Attendance shift clock timer effect
  useEffect(() => {
    if (!mounted) return;
    if (attendanceToday && !attendanceToday.clockOut) {
      // User is clocked in and active: update timer every second
      const startTime = new Date(attendanceToday.clockIn).getTime();

      const interval = setInterval(() => {
        const diffMs = Date.now() - startTime;
        const totalSecs = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        
        const pad = (n: number) => String(n).padStart(2, "0");
        setElapsedTime(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      }, 1000);

      setTimerIntervalId(interval);
      return () => clearInterval(interval);
    } else {
      // User is either clocked out or not clocked in yet
      if (timerIntervalId) {
        clearInterval(timerIntervalId);
        setTimerIntervalId(null);
      }
      if (attendanceToday?.clockIn && attendanceToday?.clockOut) {
        const duration = new Date(attendanceToday.clockOut).getTime() - new Date(attendanceToday.clockIn).getTime();
        const totalSecs = Math.floor(duration / 1000);
        const hrs = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        const pad = (n: number) => String(n).padStart(2, "0");
        setElapsedTime(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
      } else {
        setElapsedTime("00:00:00");
      }
    }
  }, [attendanceToday]);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // Calendar Event Creation
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

  // Sprint Creation (Admin/Manager only)
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

  // Activate / Complete Sprint
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

  // Attendance Clock-In / Clock-Out actions
  const handleClockAction = async (action: "in" | "out") => {
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok) {
        setAttendanceToday(data.attendance);
        showToast(`Successfully clocked ${action === "in" ? "In" : "Out"}!`, "success");
      } else {
        showToast(data.error || "Clocking failed", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Attendance logging failed.", "error");
    }
  };

  // Timesheet grid dynamic handling
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
    // Generate individual daily entry objects out of rows input grid
    const entryPayload: any[] = [];
    const weekdaysOffset = [0, 1, 2, 3, 4]; // Mon, Tue, Wed, Thu, Fri

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

  // Timesheet approval / rejection actions (Manager/Admin only)
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

  // ==========================================
  // CALENDAR RENDER HELPERS
  // ==========================================
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Padding for empty days of previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Calendar days
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
      <div style={{ padding: "2rem", color: "var(--text-secondary)", textAlign: "center" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.5rem" }}></i> Loading Calendar...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Title section */}
      <div className={styles.titleSection}>
        <div>
          <h1 className={styles.title}>Calendar & Time</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Track shared calendars, log weekly client timesheets, manage sprints, and clock shifts.
          </p>
        </div>

        {activeTab === "calendar" && (
          <button className={styles.btnPrimary} onClick={() => setShowEventModal(true)}>
            <i className="fa-solid fa-calendar-plus" style={{ marginRight: "0.25rem" }}></i> Schedule Event
          </button>
        )}

        {activeTab === "sprints" && isManagerOrAdmin && (
          <button className={styles.btnPrimary} onClick={() => setShowSprintModal(true)}>
            <i className="fa-solid fa-plus" style={{ marginRight: "0.25rem" }}></i> Plan Sprint
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "calendar" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("calendar"))}
        >
          <i className="fa-solid fa-calendar-days" style={{ marginRight: "0.25rem" }}></i> Shared Calendar
        </button>
        <button
          className={`${styles.tab} ${activeTab === "sprints" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("sprints"))}
        >
          <i className="fa-solid fa-person-running" style={{ marginRight: "0.25rem" }}></i> Sprints
        </button>
        <button
          className={`${styles.tab} ${activeTab === "timesheets" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("timesheets"))}
        >
          <i className="fa-solid fa-business-time" style={{ marginRight: "0.25rem" }}></i> Timesheets
        </button>
        <button
          className={`${styles.tab} ${activeTab === "attendance" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("attendance"))}
        >
          <i className="fa-solid fa-fingerprint" style={{ marginRight: "0.25rem" }}></i> Shift Clock
        </button>
      </div>

      {/* ----------------- Tab 1: Calendar ----------------- */}
      {activeTab === "calendar" && (
        <div className={styles.calendarWrapper}>
          <div className={styles.calendarHeader}>
            <div className={styles.calendarControls}>
              <button className={styles.btnSecondary} onClick={handlePrevMonth}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <h2 className={styles.calendarTitle}>
                {monthsNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button className={styles.btnSecondary} onClick={handleNextMonth}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>

          <div className={styles.monthGrid}>
            {/* Weekday headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className={styles.weekdayHeader}>
                {day}
              </div>
            ))}

            {/* Days Cell Grid */}
            {daysArray.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className={styles.dayCell} style={{ opacity: 0.2 }} />;
              
              const dayStr = day.getDate();
              const isToday = new Date().toDateString() === day.toDateString();
              
              // Filter events scheduled on this day
              const dayEvents = events.filter((evt) => {
                const start = new Date(evt.startDate);
                start.setHours(0,0,0,0);
                const end = new Date(evt.endDate);
                end.setHours(23,59,59,999);
                return day >= start && day <= end;
              });

              return (
                <div key={idx} className={`${styles.dayCell} ${isToday ? styles.dayCellToday : ""}`}>
                  <span className={styles.dayNumber}>{dayStr}</span>
                  <div className={styles.eventList}>
                    {dayEvents.map((evt) => {
                      const badgeClass =
                        evt.type === "Holiday"
                          ? styles.eventHoliday
                          : evt.type === "Birthday"
                          ? styles.eventBirthday
                          : evt.type === "Deadline"
                          ? styles.eventDeadline
                          : evt.type === "Personal"
                          ? styles.eventPersonal
                          : styles.eventMeeting;

                      return (
                        <div
                          key={evt._id}
                          className={`${styles.eventBadge} ${badgeClass}`}
                          onClick={() => setSelectedEvent(evt)}
                        >
                          {evt.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- Tab 2: Sprints ----------------- */}
      {activeTab === "sprints" && (
        <div className={styles.sprintGrid}>
          {/* Active Sprint overview */}
          <div className={`${styles.sprintMetaCard} glass-panel`} style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              🚀 Active Sprint
            </h2>

            {sprints.filter((s) => s.status === "Active").length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "1rem 0" }}>
                No active sprints. Plan and activate a sprint to track burndown rates.
              </p>
            ) : (
              sprints
                .filter((s) => s.status === "Active")
                .map((active) => {
                  const daysLeft = Math.ceil(
                    (new Date(active.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div key={active._id} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
                      <div className={styles.sprintHeader}>
                        <strong style={{ fontSize: "1.1rem" }}>{active.name}</strong>
                        <span className={`${styles.sprintBadge} ${styles.sprintStatusActive}`}>
                          Active
                        </span>
                      </div>
                      
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        <strong>Goal:</strong> {active.goal || "No goal specified."}
                      </p>

                      <div style={{ fontSize: "0.85rem" }}>
                        📅 <strong>Timeline:</strong> {new Date(active.startDate).toLocaleDateString()} - {new Date(active.endDate).toLocaleDateString()} ({daysLeft > 0 ? `${daysLeft} days remaining` : "Ended"})
                      </div>

                      <div className={styles.progressContainer}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                          <span>Sprint Target Hours:</span>
                          <strong>80 / 120 hrs logged</strong>
                        </div>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: "66%" }} />
                        </div>
                      </div>

                      {isManagerOrAdmin && (
                        <button
                          className={styles.btnSecondary}
                          style={{ marginTop: "1rem", alignSelf: "flex-start" }}
                          onClick={() => handleUpdateSprintStatus(active._id, "Completed")}
                        >
                          ✔️ Complete Sprint
                        </button>
                      )}
                    </div>
                  );
                })
            )}
          </div>

          {/* Sprints listing history */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              📋 Sprint Backlog & Timeline
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
              {sprints
                .filter((s) => s.status !== "Active")
                .map((sprint) => {
                  const statusClass =
                    sprint.status === "Planned"
                      ? styles.sprintStatusPlanned
                      : styles.sprintStatusCompleted;

                  return (
                    <div
                      key={sprint._id}
                      style={{
                        padding: "1rem",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.95rem" }}>{sprint.name}</strong>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          Goal: {sprint.goal || "None"} | {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span className={`${styles.sprintBadge} ${statusClass}`}>{sprint.status}</span>
                        {sprint.status === "Planned" && isManagerOrAdmin && (
                          <button
                            className={styles.btnPrimary}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                            onClick={() => handleUpdateSprintStatus(sprint._id, "Active")}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Tab 3: Timesheet Logger ----------------- */}
      {activeTab === "timesheets" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Week Selector Bar */}
          <div className="glass-panel" style={{ padding: "1rem", display: "flex", justifyItems: "center", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                className={styles.btnSecondary}
                onClick={() => {
                  const prev = new Date(timesheetWeekStart);
                  prev.setDate(prev.getDate() - 7);
                  setTimesheetWeekStart(prev);
                }}
              >
                ◀️ Previous Week
              </button>
              <strong style={{ fontSize: "0.95rem" }}>
                Week of: {timesheetWeekStart.toLocaleDateString()} - {new Date(new Date(timesheetWeekStart).setDate(timesheetWeekStart.getDate() + 4)).toLocaleDateString()}
              </strong>
              <button
                className={styles.btnSecondary}
                onClick={() => {
                  const next = new Date(timesheetWeekStart);
                  next.setDate(next.getDate() + 7);
                  setTimesheetWeekStart(next);
                }}
              >
                Next Week ▶️
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className={styles.btnSecondary} onClick={() => handleSaveTimesheet("Draft")}>
                💾 Save Draft
              </button>
              <button className={styles.btnPrimary} onClick={() => handleSaveTimesheet("Pending")}>
                🚀 Submit Timesheet
              </button>
            </div>
          </div>

          {/* Logger Grid */}
          <div className={`${styles.timesheetCard} glass-panel`}>
            <table className={styles.timesheetTable}>
              <thead>
                <tr>
                  <th className={styles.timesheetTh} style={{ width: "250px" }}>Project Link</th>
                  <th className={styles.timesheetTh}>Task / Description</th>
                  <th className={styles.timesheetTh} style={{ width: "80px", textAlign: "center" }}>Mon</th>
                  <th className={styles.timesheetTh} style={{ width: "80px", textAlign: "center" }}>Tue</th>
                  <th className={styles.timesheetTh} style={{ width: "80px", textAlign: "center" }}>Wed</th>
                  <th className={styles.timesheetTh} style={{ width: "80px", textAlign: "center" }}>Thu</th>
                  <th className={styles.timesheetTh} style={{ width: "80px", textAlign: "center" }}>Fri</th>
                  <th className={styles.timesheetTh} style={{ width: "80px", textAlign: "center" }}>Billable</th>
                </tr>
              </thead>
              <tbody>
                {timesheetRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className={styles.timesheetTd}>
                      <select
                        className={styles.select}
                        style={{ width: "100%", padding: "0.35rem" }}
                        value={row.project}
                        onChange={(e) => handleRowChange(idx, "project", e.target.value)}
                      >
                        {projectsList.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </td>
                    <td className={styles.timesheetTd}>
                      <input
                        type="text"
                        placeholder="Describe your tasks..."
                        className={styles.timesheetInput}
                        value={row.taskName}
                        onChange={(e) => handleRowChange(idx, "taskName", e.target.value)}
                      />
                    </td>
                    {["mon", "tue", "wed", "thu", "fri"].map((day) => (
                      <td key={day} className={styles.timesheetTd} style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          className={`${styles.timesheetInput} ${styles.timesheetHours}`}
                          value={row[day] || ""}
                          onChange={(e) => handleRowChange(idx, day, e.target.value ? Number(e.target.value) : 0)}
                        />
                      </td>
                    ))}
                    <td className={styles.timesheetTd} style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={row.isBillable}
                        onChange={(e) => handleRowChange(idx, "isBillable", e.target.checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <button className={styles.btnSecondary} onClick={handleAddTimesheetRow} style={{ marginTop: "1rem" }}>
              ➕ Add Log Row
            </button>
          </div>

          {/* Pending Approvals Section (Manager/Admin view) */}
          {isManagerOrAdmin && (
            <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
                👑 Pending Timesheet Approvals
              </h2>

              {pendingSubmissions.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", padding: "1rem 0" }}>
                  No pending timesheets awaiting your approval.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
                  {pendingSubmissions.map((entry) => (
                    <div
                      key={entry._id}
                      style={{
                        padding: "1rem",
                        border: "1px solid var(--border-color)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.95rem" }}>{entry.userId?.name}</strong>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                          Project: {entry.project} | Task: {entry.taskName}
                        </p>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Date: {new Date(entry.date).toLocaleDateString()} | Hours: {entry.hours}h ({entry.isBillable ? "Billable" : "Non-billable"})
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          className={styles.btnPrimary}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", backgroundColor: "var(--color-success)" }}
                          onClick={() => handleTimesheetApproval(entry._id, "Approved")}
                        >
                          Approve
                        </button>
                        <button
                          className={styles.btnSecondary}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                          onClick={() => handleTimesheetApproval(entry._id, "Rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------- Tab 4: Attendance Shift Clock ----------------- */}
      {activeTab === "attendance" && (
        <div className={styles.attendanceGrid}>
          {/* Clock In/Out panel */}
          <div className={`${styles.timesheetCard} glass-panel`}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              ⏱️ Daily Shift Clock
            </h2>

            <div className={styles.clockContainer}>
              <div className={`${styles.clockRing} ${attendanceToday && !attendanceToday.clockOut ? styles.clockRingActive : ""}`}>
                <span className={styles.clockTime}>{elapsedTime}</span>
                <span className={styles.clockLabel}>Hours Worked</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                <span className={styles.attendanceStatus}>
                  Status:{" "}
                  <span
                    style={{
                      color:
                        attendanceToday && !attendanceToday.clockOut
                          ? "var(--color-success)"
                          : "var(--text-muted)",
                    }}
                  >
                    {attendanceToday
                      ? attendanceToday.clockOut
                        ? "Clocked Out"
                        : "Clocked In / Active"
                      : "Not Clocked In"}
                  </span>
                </span>

                {attendanceToday && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Clock In: {new Date(attendanceToday.clockIn).toLocaleTimeString()}
                    {attendanceToday.clockOut && ` | Clock Out: ${new Date(attendanceToday.clockOut).toLocaleTimeString()}`}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  className={styles.btnPrimary}
                  disabled={!!attendanceToday}
                  onClick={() => handleClockAction("in")}
                  style={{
                    backgroundColor: !!attendanceToday ? "var(--border-color)" : "var(--color-success)",
                    cursor: !!attendanceToday ? "not-allowed" : "pointer",
                  }}
                >
                  🟢 Clock In
                </button>
                <button
                  className={styles.btnSecondary}
                  disabled={!attendanceToday || !!attendanceToday.clockOut}
                  onClick={() => handleClockAction("out")}
                  style={{
                    color: !attendanceToday || !!attendanceToday.clockOut ? "var(--text-muted)" : "var(--color-danger)",
                    borderColor: !attendanceToday || !!attendanceToday.clockOut ? "var(--border-color)" : "var(--color-danger)",
                    cursor: !attendanceToday || !!attendanceToday.clockOut ? "not-allowed" : "pointer",
                  }}
                >
                  🔴 Clock Out
                </button>
              </div>
            </div>
          </div>

          {/* Attendance Check-in Logs history */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              📋 Attendance Logs
            </h2>

            <div className={styles.historyList}>
              <div className={styles.historyItem}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Today, July 22</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {attendanceToday
                    ? `${new Date(attendanceToday.clockIn).toLocaleTimeString()}` +
                      (attendanceToday.clockOut ? ` - ${new Date(attendanceToday.clockOut).toLocaleTimeString()}` : " (Active)")
                    : "No record logged"}
                </span>
              </div>
              
              <div className={styles.historyItem}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Yesterday, July 21</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>09:15 AM - 05:45 PM (8.5 hrs)</span>
              </div>

              <div className={styles.historyItem}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Monday, July 20</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>09:02 AM - 06:12 PM (9.1 hrs)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- Popups / Modal Dialogs ----------------- */}

      {/* Event Details Popup */}
      {selectedEvent && (
        <div className={styles.modalOverlay} onClick={() => setSelectedEvent(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setSelectedEvent(null)}>×</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>{selectedEvent.title}</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              📅 {new Date(selectedEvent.startDate).toLocaleString()} - {new Date(selectedEvent.endDate).toLocaleString()}
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
              {selectedEvent.description || "No description provided."}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", marginTop: "0.5rem" }}>
              <span>Type: <strong>{selectedEvent.type}</strong></span>
              <span>Scope: <strong>{selectedEvent.department} department</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEventModal(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setShowEventModal(false)}>×</span>
            
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>📅 Schedule New Event</h2>
            
            <form onSubmit={handleCreateEvent} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Project Alignment Call"
                  className={styles.input}
                  value={newEvtTitle}
                  onChange={(e) => setNewEvtTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  placeholder="Details and agenda..."
                  className={styles.input}
                  style={{ height: "60px", resize: "none" }}
                  value={newEvtDesc}
                  onChange={(e) => setNewEvtDesc(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Event Type</label>
                  <select
                    className={styles.select}
                    value={newEvtType}
                    onChange={(e: any) => setNewEvtType(e.target.value)}
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Deadline">Deadline</option>
                    <option value="Personal">Personal / Focus Mode</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Visibility Scope</label>
                  <select
                    className={styles.select}
                    value={newEvtDept}
                    onChange={(e) => setNewEvtDept(e.target.value)}
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>{d === "All" ? "All Staff" : `${d} department`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Date & Time</label>
                  <input
                    type="datetime-local"
                    className={styles.input}
                    value={newEvtStart}
                    onChange={(e) => setNewEvtStart(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>End Date & Time</label>
                  <input
                    type="datetime-local"
                    className={styles.input}
                    value={newEvtEnd}
                    onChange={(e) => setNewEvtEnd(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.btnPrimary} style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}>
                Schedule Event
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      {showSprintModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSprintModal(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setShowSprintModal(false)}>×</span>
            
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>🚀 Plan New Sprint</h2>
            
            <form onSubmit={handleCreateSprint} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Sprint Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sprint 3 - Core APIs"
                  className={styles.input}
                  value={newSprintName}
                  onChange={(e) => setNewSprintName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Sprint Goal</label>
                <textarea
                  placeholder="Key milestones and deliverables..."
                  className={styles.input}
                  style={{ height: "60px", resize: "none" }}
                  value={newSprintGoal}
                  onChange={(e) => setNewSprintGoal(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Start Date</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={newSprintStart}
                    onChange={(e) => setNewSprintStart(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>End Date</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={newSprintEnd}
                    onChange={(e) => setNewSprintEnd(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.btnPrimary} style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}>
                Plan Sprint
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          <i className={toast.type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"}></i>
          {toast.message}
        </div>
      )}
    </div>
  );
}
