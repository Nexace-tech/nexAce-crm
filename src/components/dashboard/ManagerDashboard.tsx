"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamShiftOverviewCard } from "@/components/dashboard/TeamShiftOverviewCard";

export function ManagerDashboard({ user }: { user: any }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchManagerData() {
      try {
        const [projRes, taskRes, tsRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/tasks"),
          fetch("/api/timesheets"),
        ]);

        if (projRes.ok) {
          const pData = await projRes.json();
          setProjects(pData.projects || []);
        }
        if (taskRes.ok) {
          const tData = await taskRes.json();
          setTasks(tData.tasks || []);
        }
        if (tsRes.ok) {
          const tsData = await tsRes.json();
          setTimesheets(tsData.entries || []);
        }
      } catch (err) {
        console.error("Error fetching manager dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchManagerData();
  }, []);

  const pendingTasks = tasks.filter((t) => t.status !== "Done");
  const pendingApprovalsCount = timesheets.filter((t) => t.status === "Submitted" || t.status === "Pending").length;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent p-6 rounded-2xl border border-blue-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-500 tracking-wider uppercase mb-1">
            <i className="fa-solid fa-users text-blue-500 text-sm" /> Department Manager Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Hello, <span className="text-blue-500">{user?.name || "Manager"}</span> <i className="fa-solid fa-hand-sparkles text-amber-400 ml-1.5 inline-block" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of team performance, active projects, task delegations, and department shifts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild color="primary" size="sm">
            <Link href="/dashboard/projects">
              <i className="fa-solid fa-folder-open text-xs mr-2" /> Team Projects
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/team">My Team</Link>
          </Button>
        </div>
      </div>

      {/* Manager KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:shadow-md transition-all border-l-4 border-l-blue-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Department Projects</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : projects.length}</p>
              <p className="text-xs text-blue-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-arrow-trend-up text-xs" /> In progress
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-folder-open text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Tasks Pending</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : pendingTasks.length}</p>
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-list-check text-xs" /> Across team
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-square-check text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Department</p>
              <p className="text-lg font-bold text-foreground">{user?.department || "Engineering"}</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-user-check text-xs" /> Active Team
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-users text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-rose-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : `${pendingApprovalsCount} Requests`}</p>
              <p className="text-xs text-rose-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-clock text-xs" /> Timesheets
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center w-12 h-12">
              <i className="fa-solid fa-clock text-xl" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Shift Schedule */}
      <TeamShiftOverviewCard />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 span): Projects & Sprint Deliverables */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-wrench text-blue-500 text-lg" /> Team Projects & Sprints
                </CardTitle>
                <CardDescription>Track status of active deliverables</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/projects" className="gap-1 text-primary">
                  Manage Projects <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading projects...</p>
              ) : projects.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No projects assigned.</p>
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
        </div>

        {/* Right Column (1 span): Recent Tasks */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <i className="fa-solid fa-list-check text-amber-500 text-lg" /> Department Tasks
              </CardTitle>
              <CardDescription>Assigned sprint tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading tasks...</p>
              ) : pendingTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No pending tasks.</p>
              ) : (
                pendingTasks.slice(0, 5).map((t) => (
                  <div key={t._id} className="p-3 rounded-lg border border-border bg-card flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>{t.title}</span>
                      <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                    </div>
                    <span className="text-muted-foreground">Assignee: {t.assignee || "Unassigned"}</span>
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
