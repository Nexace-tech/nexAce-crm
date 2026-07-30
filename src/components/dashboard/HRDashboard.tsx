"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function HRDashboard({ user }: { user: any }) {
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [checklists, setChecklists] = useState<any[]>([]);
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHRData() {
      try {
        const [dirRes, leaveRes, caseRes, checkRes, appraisalRes] = await Promise.all([
          fetch("/api/hr/directory"),
          fetch("/api/hr/leaves"),
          fetch("/api/hr/cases"),
          fetch("/api/hr/checklists"),
          fetch("/api/hr/appraisals"),
        ]);

        if (dirRes.ok) {
          const d = await dirRes.json();
          setDirectoryUsers(d.users || []);
        }
        if (leaveRes.ok) {
          const l = await leaveRes.json();
          setLeaves(l.leaves || []);
        }
        if (caseRes.ok) {
          const c = await caseRes.json();
          setCases(c.cases || []);
        }
        if (checkRes.ok) {
          const ch = await checkRes.json();
          setChecklists(ch.checklists || []);
        }
        if (appraisalRes.ok) {
          const ap = await appraisalRes.json();
          setAppraisals(ap.appraisals || []);
        }
      } catch (err) {
        console.error("Error fetching HR dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHRData();
  }, []);

  const pendingLeaves = leaves.filter((l) => l.status === "Pending");
  const openCases = cases.filter((c) => c.status === "Open" || c.status === "In Progress");
  const activeChecklists = checklists.filter((ch) => ch.status === "In Progress");
  const pendingAppraisals = appraisals.filter((a) => a.status === "Pending Self Review" || a.status === "Pending Manager Review");

  // Department breakdown
  const deptMap: Record<string, number> = {};
  directoryUsers.forEach((u) => {
    const dept = u.department || "General";
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const deptEntries = Object.entries(deptMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const roleColors: Record<string, string> = {
    Admin: "destructive",
    Manager: "primary",
    HR: "secondary",
    Employee: "default",
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent p-6 rounded-2xl border border-purple-500/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-purple-500 tracking-wider uppercase mb-1">
            <i className="fa-solid fa-users-gear" /> Human Resources Command Center
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Welcome, <span className="text-purple-500">{user?.name || "HR Officer"}</span>{" "}
            <i className="fa-solid fa-hand-wave text-purple-400 ml-1.5 inline-block" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of company workforce, leave approvals, onboarding checklists, cases, and appraisals.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button asChild color="primary" size="sm" className="cursor-pointer gap-2">
            <Link href="/dashboard/hr">
              <i className="fa-solid fa-briefcase" /> HR Management Portal
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="cursor-pointer gap-2">
            <Link href="/dashboard/team">
              <i className="fa-solid fa-users" /> Employee Roster
            </Link>
          </Button>
        </div>
      </div>

      {/* HR Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-all border-l-4 border-l-purple-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Workforce</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : directoryUsers.length}</p>
              <p className="text-xs text-purple-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-circle-check text-xs" /> Active Staff
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <i className="fa-solid fa-users text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Leaves</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : pendingLeaves.length}</p>
              <p className="text-xs text-amber-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-clock text-xs" /> Require Approval
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <i className="fa-solid fa-calendar-xmark text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open HR Cases</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : openCases.length}</p>
              <p className="text-xs text-sky-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-ticket text-xs" /> Help Desk Tickets
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <i className="fa-solid fa-circle-question text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Onboarding</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : activeChecklists.length}</p>
              <p className="text-xs text-emerald-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-list-check text-xs" /> In Progress
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <i className="fa-solid fa-user-plus text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border-l-4 border-l-indigo-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Appraisals</p>
              <p className="text-2xl font-bold text-foreground">{loading ? "..." : pendingAppraisals.length}</p>
              <p className="text-xs text-indigo-500 font-medium flex items-center gap-1 mt-1">
                <i className="fa-solid fa-star-half-stroke text-xs" /> Awaiting Review
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <i className="fa-solid fa-award text-xl" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Leaves + HR Cases */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pending Leave Approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-calendar-xmark text-amber-500" /> Pending Leave Approvals
                </CardTitle>
                <CardDescription>Review and manage employee time-off requests</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/hr" className="gap-1 text-primary text-xs">
                  View All <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading leave requests...</p>
              ) : pendingLeaves.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <i className="fa-solid fa-circle-check text-3xl text-emerald-500/40 mb-2 block" />
                  <p className="text-xs">No pending leave requests. All clear!</p>
                </div>
              ) : (
                pendingLeaves.slice(0, 5).map((l) => (
                  <div key={l._id} className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-500 font-bold flex items-center justify-center text-sm border border-amber-500/20">
                        {l.userName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{l.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {l.type} • {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge color="warning" className="shrink-0">Pending</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Open HR Help Desk Cases */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-circle-question text-sky-500" /> HR Help Desk Cases
                </CardTitle>
                <CardDescription>Employee queries, escalations and policy requests</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/hr" className="gap-1 text-primary text-xs">
                  Go to Help Desk <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading cases...</p>
              ) : openCases.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <i className="fa-solid fa-inbox text-3xl text-sky-500/40 mb-2 block" />
                  <p className="text-xs">No open cases. Inbox is clear!</p>
                </div>
              ) : (
                openCases.slice(0, 5).map((c) => (
                  <div key={c._id} className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg text-xs ${c.priority === "High" ? "bg-red-500/10 text-red-500" : c.priority === "Medium" ? "bg-amber-500/10 text-amber-500" : "bg-slate-500/10 text-slate-500"}`}>
                        <i className={`fa-solid ${c.priority === "High" ? "fa-triangle-exclamation" : c.priority === "Medium" ? "fa-circle-exclamation" : "fa-circle-info"}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground line-clamp-1">{c.subject}</p>
                        <p className="text-xs text-muted-foreground">{c.category} • By {c.userName}</p>
                      </div>
                    </div>
                    <Badge color={c.status === "Open" ? "warning" : "info"} className="shrink-0">{c.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Active Onboarding Checklists */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-emerald-500" /> Active Onboarding Checklists
                </CardTitle>
                <CardDescription>Track onboarding & offboarding progress per employee</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/hr" className="gap-1 text-primary text-xs">
                  Manage <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading checklists...</p>
              ) : activeChecklists.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <i className="fa-solid fa-check-double text-3xl text-emerald-500/40 mb-2 block" />
                  <p className="text-xs">No active onboarding checklists.</p>
                </div>
              ) : (
                activeChecklists.slice(0, 4).map((ch) => {
                  const completed = ch.items?.filter((i: any) => i.completed).length || 0;
                  const total = ch.items?.length || 1;
                  const pct = Math.round((completed / total) * 100);
                  return (
                    <div key={ch._id} className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-emerald-500/10 text-emerald-500 font-bold flex items-center justify-center text-xs border border-emerald-500/20">
                            {ch.userName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{ch.userName}</p>
                            <p className="text-xs text-muted-foreground">{ch.type}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-foreground">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Links + Department Breakdown + Recent Team */}
        <div className="space-y-6">

          {/* Quick Links */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-purple-500" /> HR Shortcuts
              </CardTitle>
              <CardDescription>Quick access to key HR modules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { href: "/dashboard/hr", icon: "fa-solid fa-address-book", label: "Employee Directory", color: "text-purple-500" },
                { href: "/dashboard/hr", icon: "fa-solid fa-list-check", label: "Onboarding / Offboarding", color: "text-emerald-500" },
                { href: "/dashboard/hr", icon: "fa-solid fa-calendar-minus", label: "Leave Management", color: "text-amber-500" },
                { href: "/dashboard/hr", icon: "fa-solid fa-vault", label: "Restricted Document Vault", color: "text-sky-500" },
                { href: "/dashboard/hr", icon: "fa-solid fa-award", label: "Appraisals & KRAs", color: "text-indigo-500" },
                { href: "/dashboard/hr", icon: "fa-solid fa-hourglass-half", label: "Probation & Review Cycle", color: "text-orange-500" },
              ].map(({ href, icon, label, color }) => (
                <Button key={label} asChild variant="outline" className="w-full justify-start gap-2 text-xs cursor-pointer">
                  <Link href={href}>
                    <i className={`${icon} ${color}`} /> {label}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Department Breakdown */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <i className="fa-solid fa-building-user text-purple-500" /> Department Breakdown
              </CardTitle>
              <CardDescription>Headcount distribution across teams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Loading...</p>
              ) : deptEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">No department data.</p>
              ) : (
                deptEntries.map(([dept, count]) => {
                  const pct = directoryUsers.length > 0 ? Math.round((count / directoryUsers.length) * 100) : 0;
                  return (
                    <div key={dept} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">{dept}</span>
                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Recent Team Members */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <i className="fa-solid fa-user-clock text-sky-500" /> Recently Joined
              </CardTitle>
              <CardDescription>Newest team members in the organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {loading ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Loading...</p>
              ) : directoryUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">No employees yet.</p>
              ) : (
                [...directoryUsers]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((u) => (
                    <div key={u._id} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0">
                        {u.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.department || "General"}</p>
                      </div>
                      <Badge color={roleColors[u.role] as any || "default"} className="text-[10px] shrink-0">
                        {u.role}
                      </Badge>
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
