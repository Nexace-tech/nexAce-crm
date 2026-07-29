"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  FolderOpen, 
  Clock, 
  TrendingUp, 
  Wrench, 
  Target, 
  ArrowUpRight,
  UserCheck,
  CheckSquare,
  ShieldAlert
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TeamShiftOverviewCard } from "@/components/dashboard/TeamShiftOverviewCard";

export function ManagerDashboard({ user }: { user: any }) {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchManagerData() {
      try {
        const [projRes, taskRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/tasks")
        ]);

        if (projRes.ok) {
          const pData = await projRes.json();
          setProjects(pData.projects || []);
        }
        if (taskRes.ok) {
          const tData = await taskRes.json();
          setTasks(tData.tasks || []);
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

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent p-6 rounded-2xl border border-blue-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-500 tracking-wider uppercase mb-1">
            <Users className="w-4 h-4 text-blue-500" /> Department Manager Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Hello, <span className="text-blue-500">{user?.name?.split(" ")[0] || "Manager"}</span> 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of team performance, active projects, task delegations, and department shifts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild color="primary" size="sm">
            <Link href="/dashboard/projects">
              <FolderOpen className="w-4 h-4 mr-2" /> Team Projects
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
                <TrendingUp className="w-3.5 h-3.5" /> In progress
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <FolderOpen className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Tasks Pending</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : pendingTasks.length}</p>
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                <CheckSquare className="w-3.5 h-3.5" /> Across team
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <CheckSquare className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Department</p>
              <p className="text-lg font-bold text-foreground">{user?.department || "Engineering"}</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <UserCheck className="w-3.5 h-3.5" /> Active Team
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-rose-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Approvals</p>
              <p className="text-2xl font-bold text-foreground">2 Requests</p>
              <p className="text-xs text-rose-500 font-medium flex items-center gap-1 mt-1">
                <Clock className="w-3.5 h-3.5" /> Leaves & Timesheets
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
              <Clock className="w-6 h-6" />
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
                  <Wrench className="w-5 h-5 text-blue-500" /> Team Projects & Sprints
                </CardTitle>
                <CardDescription>Track status of active deliverables</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/projects" className="gap-1 text-primary">
                  Manage Projects <ArrowUpRight className="w-4 h-4" />
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

        {/* Right Column (1 span): OKRs / Department Goals */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-rose-500" /> Department Goals
              </CardTitle>
              <CardDescription>Quarterly key results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Complete Q3 Deliverables</span>
                  <span className="text-xs font-bold text-blue-500">75%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-[75%]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">Team Skill Certifications</span>
                  <span className="text-xs font-bold text-emerald-500">80%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[80%]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
