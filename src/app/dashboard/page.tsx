"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { 
  FolderOpen, 
  Wallet, 
  Clock, 
  Share2, 
  TrendingUp, 
  Wrench, 
  Target, 
  History, 
  ArrowUpRight,
  CheckCircle2,
  Calendar,
  CheckSquare,
  Sparkles,
  UserCheck,
  Building,
  Bell,
  Sun,
  ShieldCheck,
  Play,
  Square
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamShiftOverviewCard } from "@/components/dashboard/TeamShiftOverviewCard";
import { PendingApprovalsCard } from "@/components/dashboard/PendingApprovalsCard";

/**
 * 👑 Executive Admin Dashboard View
 */
function AdminDashboardView({ user }: { user: any }) {
  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-primary tracking-wider uppercase mb-1">
            <ShieldCheck className="w-4 h-4 text-primary" /> Admin Control Center
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, <span className="text-primary">{user?.name || "Admin"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here is your multi-tenant workspace status, company metrics, and team shift overview for today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild color="primary" size="sm">
            <Link href="/dashboard/projects">
              <FolderOpen className="w-4 h-4 mr-2" /> Open Projects
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/team">Team Directory</Link>
          </Button>
        </div>
      </div>

      {/* Pending Registration Approvals Notification Card */}
      <PendingApprovalsCard />

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:shadow-md transition-all border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> +2 this week
              </p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <FolderOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Retainers</p>
              <p className="text-2xl font-bold text-foreground">$42,800</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> +8.4% vs last month
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold text-foreground">4 Timesheets</p>
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5" /> 12h avg review time
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referrals Value</p>
              <p className="text-2xl font-bold text-foreground">$3,500</p>
              <p className="text-xs text-sky-500 font-medium flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 2 Hired candidates
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <Share2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Users Shift Time Table */}
      <TeamShiftOverviewCard />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 span) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Projects Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" /> Active Sprints & Projects
                </CardTitle>
                <CardDescription>Real-time delivery progress across teams</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/projects" className="gap-1 text-primary">
                  Sprint Board <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">NexAce CRM Implementation</p>
                  <p className="text-xs text-muted-foreground">Client: Internal Workspace | Target: Aug 15</p>
                </div>
                <Badge color="primary">Sprint 2</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">Client Portal Integration</p>
                  <p className="text-xs text-muted-foreground">Client: Ziqsy | Target: Sep 1</p>
                </div>
                <Badge color="info">Design Phase</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">Website Redesign</p>
                  <p className="text-xs text-muted-foreground">Client: Acme Retail | Target: Jul 30</p>
                </div>
                <Badge color="success">Testing</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Strategic OKRs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-rose-500" /> Strategic OKRs (Q3)
                </CardTitle>
                <CardDescription>Company-wide objectives and key results</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/goals" className="gap-1 text-primary">
                  Manage OKRs <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Scale tenant capacity to 500 teams</span>
                  <span className="text-xs font-bold text-primary">65% Progress</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-[65%]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Achieve &gt;95% client satisfaction score</span>
                  <span className="text-xs font-bold text-emerald-500">92% Progress</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span) */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <History className="w-5 h-5 text-sky-500" /> Audit Trail Log
              </CardTitle>
              <CardDescription>Recent system events & approvals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-foreground"><strong>Admin</strong> approved timesheet for <em>Design Phase</em>.</p>
                  <p className="text-[11px] text-muted-foreground">10 minutes ago</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-foreground"><strong>Sarah Jenkins</strong> requested time off for <em>Summer Break</em>.</p>
                  <p className="text-[11px] text-muted-foreground">2 hours ago</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-foreground"><strong>System</strong> updated billing configuration for tenant <em>Ziqsy</em>.</p>
                  <p className="text-[11px] text-muted-foreground">1 day ago</p>
                </div>
              </div>

              <div className="flex gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-foreground"><strong>Marcus Wu</strong> joined the <em>Development</em> department.</p>
                  <p className="text-[11px] text-muted-foreground">3 days ago</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * 👤 Employee Personal Portal Dashboard View
 */
function EmployeeDashboardView({ user }: { user: any }) {
  const [clockedIn, setClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);

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
            Hello, <span className="text-emerald-500">{user?.name || "Employee"}</span> 👋
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
              <p className="text-lg font-bold text-foreground">Standard Day Shift</p>
              <p className="text-xs text-emerald-500 font-mono font-semibold flex items-center gap-1 mt-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" /> 09:00 AM - 05:00 PM
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
              <p className="text-2xl font-bold text-foreground">4 Active</p>
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                1 High Priority Task
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
                className="gap-2 font-semibold shadow-md"
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
                    <span className="font-bold text-foreground text-base">Standard Day Shift</span>
                    <Badge color={clockedIn ? "success" : "secondary"}>
                      {clockedIn ? "🟢 Shift Active" : "⚪ Off Shift"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Timing: <strong className="font-mono text-foreground">09:00 AM - 05:00 PM</strong> | Target: 8.0 Hours
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
                <CardDescription>Deliverables assigned to you for this week</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/tasks" className="gap-1 text-primary">
                  View All Tasks <ArrowUpRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">Complete API Authentication Integration</p>
                  <p className="text-xs text-muted-foreground">Project: NexAce CRM | Due: Tomorrow</p>
                </div>
                <Badge color="destructive">Urgent</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">Review Client Feedback & Update Wireframes</p>
                  <p className="text-xs text-muted-foreground">Project: Website Redesign | Due: Aug 2</p>
                </div>
                <Badge color="primary">In Progress</Badge>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-semibold text-sm text-foreground">Prepare Weekly Team Sprint Progress Summary</p>
                  <p className="text-xs text-muted-foreground">Project: Internal CRM | Due: Friday</p>
                </div>
                <Badge color="success">Completed</Badge>
              </div>
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

export default function DashboardHome() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground text-sm">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mr-3" />
        Loading Dashboard...
      </div>
    );
  }

  // Render Admin view for Admin role; Employee view for Employee role
  const isAdmin = user?.role === "Admin";

  return isAdmin ? <AdminDashboardView user={user} /> : <EmployeeDashboardView user={user} />;
}
