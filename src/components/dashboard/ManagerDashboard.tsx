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
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchManagerData() {
      try {
        const [projRes, taskRes, tsRes, sprintRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/tasks"),
          fetch("/api/timesheets"),
          fetch("/api/sprints"),
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
        if (sprintRes.ok) {
          const sData = await sprintRes.json();
          setSprints(sData.sprints || []);
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
                  <Link
                    key={p._id}
                    href={`/dashboard/projects?projectId=${p._id}`}
                    className="flex items-start justify-between gap-4 p-3.5 rounded-lg border border-border bg-card hover:bg-accent/40 hover:border-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{p.description || "No description provided."}</p>
                    </div>
                    <Badge color={p.status === "Active" ? "primary" : p.status === "Completed" ? "success" : "info"} className="shrink-0 mt-0.5">
                      {p.status || "Planning"}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Active Sprint Widget for Manager */}
          {(() => {
            const activeSprint = sprints.find((s) => s.status === "Active");
            const plannedSprint = sprints.find((s) => s.status === "Planned");
            const currentSprint = activeSprint || plannedSprint;

            if (!currentSprint && sprints.length === 0 && !loading) return null;

            return (
              <Card className="border border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3 bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-transparent">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                      <i className="fa-solid fa-rocket text-blue-500 text-base" />
                      {activeSprint ? "Active Agile Sprint" : "Upcoming Sprint"}
                    </CardTitle>
                    <CardDescription>Department sprint cycle, progress & milestones</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeSprint ? (
                      <Badge color="primary" className="font-semibold gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
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
                            <strong>Goal:</strong> {currentSprint.goal || "Complete sprint deliverables and milestone items."}
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
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
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
                      <p className="text-xs font-semibold text-foreground">No active sprint cycle</p>
                      <p className="text-[11px]">Sprint iterations will appear here once scheduled.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
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
