"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Clock, 
  ArrowUpRight,
  Calendar,
  CheckSquare,
  Sparkles,
  UserCheck,
  Bell,
  Sun,
  Play,
  Square
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function EmployeeDashboard({ user }: { user: any }) {
  const [clockedIn, setClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEmployeeData() {
      try {
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const data = await res.json();
          setTasks(data.tasks || []);
        }
      } catch (err) {
        console.error("Failed to fetch employee tasks:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmployeeData();
  }, []);

  const handleToggleClock = () => {
    if (!clockedIn) {
      setClockedIn(true);
      setClockTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } else {
      setClockedIn(false);
      setClockTime(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6 rounded-2xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 tracking-wider uppercase mb-1">
            <UserCheck className="w-4 h-4 text-emerald-500" /> Employee Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Hello, <span className="text-emerald-500">{user?.name?.split(" ")[0] || "Employee"}</span> 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome to your personal workspace portal. Here are your shift details, active tasks, and attendance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild color="primary" size="sm">
            <Link href="/dashboard/calendar">
              <Calendar className="w-4 h-4 mr-2" /> My Shift Calendar
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/tasks">My Tasks</Link>
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
                <Sun className="w-3.5 h-3.5 text-amber-500" /> {user?.shiftTime || "09:00 AM - 05:00 PM"}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Timesheet Hours</p>
              <p className="text-2xl font-bold text-foreground">37.5 Hrs</p>
              <p className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
                Target: 40.0 Hrs this week
              </p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Calendar className="w-6 h-6" />
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
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <CheckSquare className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Leave Balance</p>
              <p className="text-2xl font-bold text-foreground">14 Days</p>
              <p className="text-xs text-sky-500 font-medium flex items-center gap-1 mt-1">
                Paid Time Off & Casual
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <Sparkles className="w-6 h-6" />
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
                  <i className="fa-solid fa-clock-rotate-left text-primary" /> Today's Shift & Attendance
                </CardTitle>
                <CardDescription>Your assigned shift schedule & real-time punch status</CardDescription>
              </div>

              <Button
                color={clockedIn ? "destructive" : "primary"}
                size="sm"
                onClick={handleToggleClock}
                className="gap-2 font-semibold shadow-md cursor-pointer"
              >
                {clockedIn ? (
                  <>
                    <Square className="w-4 h-4 fill-current" /> Clock Out
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Clock In Now
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

                {clockTime && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Clocked In At:</p>
                    <p className="font-mono font-bold text-sm text-emerald-500">{clockTime}</p>
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

          {/* Assigned Tasks & Deliverables */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-emerald-500" /> My Assigned Tasks
                </CardTitle>
                <CardDescription>Deliverables assigned to you</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/tasks" className="gap-1 text-primary">
                  View All Tasks <ArrowUpRight className="w-4 h-4" />
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

        {/* Right Column (1 span): Announcements & Team Workspace */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" /> Workspace Announcements
              </CardTitle>
              <CardDescription>Company notices and team updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">✦ Q3 All-Hands Meeting</span>
                  <span className="text-[10px] text-muted-foreground">Today, 4:00 PM</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Join the quarterly all-hands meeting in the main conference room or via video link.
                </p>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">✦ Holiday Schedule Notice</span>
                  <span className="text-[10px] text-muted-foreground">2 days ago</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Please submit your upcoming holiday leave requests before Friday for manager approval.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
