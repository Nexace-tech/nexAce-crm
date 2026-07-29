"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamShiftOverviewCard } from "@/components/dashboard/TeamShiftOverviewCard";
import { PendingApprovalsCard } from "@/components/dashboard/PendingApprovalsCard";

export function AdminDashboard({ user }: { user: any }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const [projRes, logRes] = await Promise.all([
        fetch("/api/projects"),
        fetch("/api/activity-logs")
      ]);

      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(pData.projects || []);
      }
      if (logRes.ok) {
        const lData = await logRes.json();
        setLogs(lData.logs || []);
      }
    } catch (err) {
      console.error("Error fetching admin dashboard data:", err);
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
            Welcome back, <span className="text-primary">{user?.name || "Admin"}</span> <i className="fa-solid fa-hand-wave text-amber-400 ml-1.5 inline-block" />
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

      {/* KPI Metric Cards Grid - Standardized FontAwesome Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:shadow-md transition-all border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : projects.length}</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-arrow-trend-up text-xs" /> +2 this week
              </p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-folder-open text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Retainers</p>
              <p className="text-2xl font-bold text-foreground">$42,800</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-arrow-trend-up text-xs" /> +8.4% vs last month
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-wallet text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold text-foreground">4 Timesheets</p>
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-clock text-xs" /> 12h avg review time
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-clock text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Referrals Value</p>
              <p className="text-2xl font-bold text-foreground">$3,500</p>
              <p className="text-xs text-sky-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-circle-check text-xs" /> 2 Hired candidates
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-share-nodes text-xl" />
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
                <p className="text-xs text-muted-foreground py-4 text-center">Loading projects...</p>
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
                  <i className="fa-solid fa-bullseye text-rose-500" /> Strategic OKRs (Q3)
                </CardTitle>
                <CardDescription>Company-wide objectives and key results</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/goals" className="gap-1 text-primary">
                  Manage OKRs <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
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
                <i className="fa-solid fa-clock-rotate-left text-sky-500" /> Audit Trail Log
              </CardTitle>
              <CardDescription>Recent system events & activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading activity logs...</p>
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
