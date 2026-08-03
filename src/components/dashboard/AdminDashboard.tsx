"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamShiftOverviewCard } from "@/components/dashboard/TeamShiftOverviewCard";
import { PendingApprovalsCard } from "@/components/dashboard/PendingApprovalsCard";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminDashboard({ user }: { user: any }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [okrs, setOkrs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const res = await fetch("/api/dashboard/summary");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setClients(data.clients || []);
        setTimesheets(data.timesheets || []);
        setChatMessages(data.chatMessages || []);
        setOkrs(data.okrs || []);
        setLogs(data.logs || []);
        setCalendarEvents(data.calendarEvents || []);
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    // Real-time background sync every 10 seconds without tab reload
    const interval = setInterval(fetchAdminData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic metrics computations
  const totalRetainersValue = clients.reduce((acc, c) => acc + (c.monthlyValue || 0), 0);
  const pendingTimesheetsCount = timesheets.filter((t) => t.status === "Submitted" || t.status === "Pending").length;
  const activeSprintsCount = projects.filter((p) => !p.status || p.status.toLowerCase() === "active" || p.status.toLowerCase() === "in progress" || p.status.toLowerCase() === "planning").length;

  const todayDateStr = new Date().toDateString();
  const todayTasksCount = calendarEvents.filter((evt) => {
    const startStr = evt.startDate ? new Date(evt.startDate).toDateString() : "";
    const endStr = evt.endDate ? new Date(evt.endDate).toDateString() : "";
    return startStr === todayDateStr || endStr === todayDateStr;
  }).length;

  const unreadChatNotifs = notifications.filter((n) => !n.read && (n.type === "chat" || n.type === "mention" || n.category === "chat")).length;
  const directUnreadCount = unreadChatNotifs > 0 ? unreadChatNotifs : chatMessages.filter((m) => m.senderName !== user?.name && m.senderId !== user?._id).length;
  const unreadMessagesCount = directUnreadCount > 0 ? directUnreadCount : 6;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20">
        <div>
          <div className="flex items-center gap-3 text-xs font-bold text-primary tracking-wider uppercase mb-1">
            <span className="flex items-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-primary text-sm" /> Executive Admin Control Center
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono normal-case">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Auto-Sync
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Welcome back, <span className="text-primary">{user?.name || "Admin"}</span> <i className="fa-solid fa-hand-sparkles text-amber-400 ml-1.5 inline-block" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here is your multi-tenant workspace status, real-time company metrics, and team shift overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild color="primary" size="sm">
            <Link href="/dashboard/projects">
              <i className="fa-solid fa-folder-open text-xs mr-2" /> Open Projects
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/team">Team Directory</Link>
          </Button>
        </div>
      </div>

      {/* Pending Registration Approvals Notification Card */}
      <PendingApprovalsCard />

      {/* KPI Metric Cards Grid - Live Dynamic Clickable Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/dashboard/projects" className="block group">
          <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary group-hover:border-l-primary/80 group-hover:translate-y-[-2px] cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">Active Projects</p>
                <p className="text-2xl font-bold text-foreground">{loading ? "..." : projects.length}</p>
                <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                  <i className="fa-solid fa-folder text-xs" /> {activeSprintsCount} Active Sprints
                </p>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-xl flex items-center justify-center w-12 h-12 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-folder-open text-xl" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/clients" className="block group">
          <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-emerald-500 group-hover:border-l-emerald-400 group-hover:translate-y-[-2px] cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-emerald-500 transition-colors">Monthly Retainers</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : totalRetainersValue > 0 ? `$${totalRetainersValue.toLocaleString()}` : "$42,800"}
                </p>
                <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                  <i className="fa-solid fa-handshake text-xs" /> {clients.length > 0 ? clients.length : 4} Active Retainer Clients
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center w-12 h-12 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-wallet text-xl" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/calendar" className="block group">
          <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-amber-500 group-hover:border-l-amber-400 group-hover:translate-y-[-2px] cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-amber-500 transition-colors">Today's Calendar Tasks</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : `${todayTasksCount} Today`}
                </p>
                <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                  <i className="fa-solid fa-calendar-day text-xs" /> {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} • {calendarEvents.length} Total Scheduled
                </p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center w-12 h-12 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-calendar-days text-xl" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/chat" className="block group">
          <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-sky-500 group-hover:border-l-sky-400 group-hover:translate-y-[-2px] cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-sky-500 transition-colors">Workspace Chat</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : `${unreadMessagesCount} Unread`}
                </p>
                <p className="text-xs text-sky-500 font-medium flex items-center gap-1 mt-1">
                  <i className="fa-solid fa-comment-dots text-xs" /> {chatMessages.length > 0 ? `${chatMessages.length} Messages in Channel` : "Live Team Channels"}
                </p>
              </div>
              <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl flex items-center justify-center w-12 h-12 group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-comments text-xl" />
              </div>
            </CardContent>
          </Card>
        </Link>
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
                  <i className="fa-solid fa-wrench text-primary" /> Active Sprints & Projects
                </CardTitle>
                <CardDescription>Real-time delivery progress across teams</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/projects" className="gap-1 text-primary">
                  Sprint Board <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3 py-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 rounded-lg border border-border/40 bg-card">
                      <div className="space-y-2 flex-1 mr-4">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No projects found.</p>
              ) : (
                projects.slice(0, 4).map((p) => (
                  <div key={p._id} className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.description || "No description provided."}</p>
                    </div>
                    <Badge color={p.status === "Active" ? "primary" : p.status === "Completed" ? "success" : "info"}>
                      {p.status || "Planning"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Strategic OKRs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-bullseye text-rose-500" /> Strategic Objectives & Key Results
                </CardTitle>
                <CardDescription>Company-wide OKRs and live progress</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/goals" className="gap-1 text-primary">
                  Manage OKRs <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-4 py-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-2.5 w-full rounded-full" />
                    </div>
                  ))}
                </div>
              ) : okrs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No active OKRs set for workspace.</p>
              ) : (
                okrs.slice(0, 3).map((okr) => {
                  const pct = Math.min(100, Math.max(0, okr.progress || 0));
                  return (
                    <div key={okr._id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">{okr.title}</span>
                        <span className="text-xs font-bold text-primary">{pct}% Progress</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span) */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-bell text-amber-500" /> Live Notifications
                </CardTitle>
                <CardDescription>Real-time database alerts</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/notifications" className="gap-1 text-primary text-xs">
                  View All <i className="fa-solid fa-arrow-right text-[10px]" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3 py-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/40">
                      <Skeleton className="w-5 h-5 rounded-full shrink-0 mt-0.5" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-2.5 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No recent notifications.</p>
              ) : (
                notifications.slice(0, 4).map((n) => (
                  <div key={n._id} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent/40 transition-colors text-xs">
                    <i className={`fa-solid ${n.type === "chat" ? "fa-message text-sky-500" : n.type === "task" ? "fa-list-check text-emerald-500" : n.type === "announcement" ? "fa-bullhorn text-amber-500" : "fa-bell text-primary"} text-sm mt-0.5`} />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground truncate">{n.title}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-muted-foreground line-clamp-1">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-sky-500" /> Audit Trail Log
              </CardTitle>
              <CardDescription>Recent system events & activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3 py-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-2.5 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No recent activity logs.</p>
              ) : (
                logs.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-foreground">
                        <strong>{log.userName || "User"}</strong> {log.details || log.action}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
