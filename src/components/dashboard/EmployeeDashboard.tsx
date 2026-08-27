"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";

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

  const totalLoggedHours = timesheets.reduce((acc, t) => acc + (t.hours || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6 rounded-2xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 tracking-wider uppercase mb-1">
            <i className="fa-solid fa-user-check text-emerald-500 text-sm" /> Employee Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Hello, <span className="text-emerald-500">{user?.name || "Employee"}</span> <i className="fa-solid fa-hand-sparkles text-amber-400 ml-1.5 inline-block" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome to your personal workspace portal. Here are your shift details, active tasks, and attendance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild color="primary" size="sm">
            <Link href="/dashboard/calendar">
              <i className="fa-solid fa-calendar-days text-xs mr-2" /> My Shift Calendar
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/projects">My Tasks</Link>
          </Button>
        </div>
      </div>

      {/* Employee Personal KPI Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Shift Schedule</p>
              <p className="text-lg font-bold text-foreground">{user?.shiftName || "Standard Day Shift"}</p>
              <p className="text-xs text-emerald-500 font-mono font-semibold flex items-center gap-1 mt-1">
                <i className="fa-solid fa-sun text-amber-500 text-xs" /> {user?.shiftTime || "09:00 AM - 05:00 PM"}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-clock text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Timesheet Hours</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : `${totalLoggedHours} Hrs`}</p>
              <p className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
                Target: 40.0 Hrs this week
              </p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-calendar-days text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned Tasks</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : `${tasks.length} Active`}</p>
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                Tasks assigned to you
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-list-check text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approved Leaves</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? "..." : `${teamLeaves.filter((l) => l.status === "Approved").length} Approved`}
              </p>
              <p className="text-xs text-sky-500 font-medium flex items-center gap-1 mt-1">
                From your leave requests
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-calendar-check text-xl" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Employee Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 span): Shift Schedule & Assigned Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shift Details & Attendance Action Widget */}
          <Card className="border border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-primary text-lg" /> Today's Shift & Attendance
                </CardTitle>
                <CardDescription>Your assigned shift schedule & real-time punch status</CardDescription>
              </div>

              <Button
                color={clockedIn ? "destructive" : "primary"}
                size="sm"
                onClick={handleToggleClock}
                disabled={clocking}
                className="gap-2 font-semibold shadow-md cursor-pointer"
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
                  <p className="font-semibold text-foreground">Regular Full-Time</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border space-y-0.5">
                  <span className="text-muted-foreground">Lunch Break</span>
                  <p className="font-semibold text-foreground">01:00 PM - 02:00 PM</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border space-y-0.5">
                  <span className="text-muted-foreground">Workplace</span>
                  <p className="font-semibold text-emerald-500">Hybrid / Office</p>
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
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/projects" className="gap-1 text-primary">
                  View All Tasks <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading assigned tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No tasks assigned yet.</p>
              ) : (
                tasks.slice(0, 5).map((t) => (
                  <div key={t._id} className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Priority: {t.priority} {t.dueDate ? `| Due: ${new Date(t.dueDate).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <Badge color={t.priority === "High" || t.priority === "Urgent" ? "destructive" : t.status === "Done" ? "success" : "primary"}>
                      {t.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span): Announcements & Team Leave Requests */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <i className="fa-solid fa-bullhorn text-amber-500 text-lg" /> Workspace Announcements
              </CardTitle>
              <CardDescription>Company notices and team updates</CardDescription>
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
                  <div key={a._id} className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground flex items-center gap-1">
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
                    <div key={l._id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-sky-500/20 text-sky-500 font-bold flex items-center justify-center text-xs border border-sky-500/30 shrink-0">
                          {l.userName?.charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate">{l.userName}</p>
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
