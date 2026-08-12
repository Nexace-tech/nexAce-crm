"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { Pagination } from "@/components/ui/pagination";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useTabPersistence<"overview" | "manager" | "performance" | "audit">(
    "analytics_active_tab",
    "overview",
    ["overview", "manager", "performance", "audit"]
  );

  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters for Audit log
  const [logSearch, setLogSearch] = useState("");
  const [logFilterAction, setLogFilterAction] = useState("all");
  const [logFilterVerb, setLogFilterVerb] = useState("all");
  const [logFilterTime, setLogFilterTime] = useState("all");
  const [logFilterUser, setLogFilterUser] = useState("all");
  const [logPage, setLogPage] = useState(1);
  const logItemsPerPage = 12;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tsRes, logRes, perfRes] = await Promise.all([
        fetch("/api/timesheets"),
        fetch("/api/activity-logs?limit=all"),
        fetch("/api/analytics/performance"),
      ]);

      if (tsRes.ok) {
        const tsData = await tsRes.json();
        setTimesheets(tsData.entries || []);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        setActivityLogs(logData.logs || []);
      }
      if (perfRes.ok) {
        const perfData = await perfRes.json();
        setPerformanceData(perfData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute metrics with useMemo
  const { totalLoggedHours, billableHours, billableRatio, projectHoursMap } = useMemo(() => {
    const total = timesheets.reduce((acc, curr) => acc + (curr.hours || 0), 0);
    const billable = timesheets.filter((t) => t.isBillable).reduce((acc, curr) => acc + (curr.hours || 0), 0);
    const ratio = total > 0 ? ((billable / total) * 100).toFixed(1) : "0.0";
    const pMap: Record<string, number> = {};
    timesheets.forEach((t) => {
      const pName = t.project || "General";
      pMap[pName] = (pMap[pName] || 0) + (t.hours || 0);
    });
    return { totalLoggedHours: total, billableHours: billable, billableRatio: ratio, projectHoursMap: pMap };
  }, [timesheets]);

  // Unique users list for filter dropdown memoized
  const uniqueLogUsers = useMemo(() => {
    return Array.from(new Set(activityLogs.map((l) => l.userName).filter(Boolean)));
  }, [activityLogs]);

  // Filtered audit logs memoized
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const matchesSearch =
        (log.userName || "").toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.action || "").toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.details || "").toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.targetName || "").toLowerCase().includes(logSearch.toLowerCase());

      const matchesCategory = logFilterAction === "all" || (log.action || "").includes(logFilterAction);
      const matchesVerb = logFilterVerb === "all" || (log.action || "").toUpperCase().includes(logFilterVerb);
      const matchesUser = logFilterUser === "all" || log.userName === logFilterUser;

      let matchesTime = true;
      if (logFilterTime !== "all" && log.createdAt) {
        const logDate = new Date(log.createdAt).getTime();
        const now = Date.now();
        if (logFilterTime === "today") {
          const startOfToday = new Date().setHours(0, 0, 0, 0);
          matchesTime = logDate >= startOfToday;
        } else if (logFilterTime === "7days") {
          matchesTime = logDate >= now - 7 * 24 * 60 * 60 * 1000;
        } else if (logFilterTime === "30days") {
          matchesTime = logDate >= now - 30 * 24 * 60 * 60 * 1000;
        }
      }

      return matchesSearch && matchesCategory && matchesVerb && matchesUser && matchesTime;
    });
  }, [activityLogs, logSearch, logFilterAction, logFilterVerb, logFilterUser, logFilterTime]);

  // Paginated logs memoized
  const paginatedLogs = useMemo(() => {
    if (activityLogs.length === 0) return [];
    return filteredLogs.slice((logPage - 1) * logItemsPerPage, logPage * logItemsPerPage);
  }, [activityLogs.length, filteredLogs, logPage, logItemsPerPage]);

  const totalLogPages = Math.ceil(filteredLogs.length / logItemsPerPage) || 1;

  const resetLogFilters = () => {
    setLogSearch("");
    setLogFilterAction("all");
    setLogFilterVerb("all");
    setLogFilterTime("all");
    setLogFilterUser("all");
    setLogPage(1);
  };

  const exportCSV = () => {
    const headers = ["ID,Action,User,Role,Target,Details,Timestamp\n"];
    const rows = filteredLogs
      .map(
        (l) =>
          `"${l._id}","${l.action}","${l.userName}","${l.userRole || ""}","${l.targetName || ""}","${
            l.details || ""
          }","${new Date(l.createdAt).toLocaleString()}"`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <Preloader label="Generating Workspace Analytics & Logs..." />;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <i className="fa-solid fa-chart-simple text-primary text-xl" /> Workspace Analytics & Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resource capacity utilization, manager approval summaries, performance insights, and security audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <i className="fa-solid fa-rotate text-xs" /> Refresh
          </Button>
          <Button color="primary" size="sm" onClick={exportCSV} className="gap-2">
            <i className="fa-solid fa-download text-xs" /> Export CSV Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "overview" ? "border-primary text-white bg-primary/10 rounded-t-md font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-clock text-xs" /> Overview & Utilization
        </button>

        <button
          onClick={() => setActiveTab("manager")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "manager" ? "border-primary text-white bg-primary/10 rounded-t-md font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-users text-xs text-emerald-500" /> Manager Control View
        </button>

        <button
          onClick={() => setActiveTab("performance")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "performance" ? "border-primary text-white bg-primary/10 rounded-t-md font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-award text-xs text-amber-500" /> Performance Insights
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
            activeTab === "audit" ? "border-primary text-white bg-primary/10 rounded-t-md font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-shield-halved text-xs text-sky-500" /> Audit Log Trail ({activityLogs.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TIME UTILIZATION */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Hours Logged</p>
                  <p className="text-2xl font-bold text-foreground">{totalLoggedHours} hrs</p>
                  <p className="text-xs text-emerald-500 font-medium mt-1">Live DB sync</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <i className="fa-solid fa-clock text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billable Ratio</p>
                  <p className="text-2xl font-bold text-foreground">{billableRatio}%</p>
                  <p className="text-xs text-emerald-500 font-medium mt-1">{billableHours} hrs billable</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <i className="fa-solid fa-chart-simple text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-sky-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit Events</p>
                  <p className="text-2xl font-bold text-foreground">{activityLogs.length} Events</p>
                  <p className="text-xs text-sky-500 font-medium mt-1">Security Compliant</p>
                </div>
                <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
                  <i className="fa-solid fa-clock-rotate-left text-xl" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee Capacity Utilization Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-users text-primary text-sm" /> Employee Capacity Utilization (40h Target / Week)
              </CardTitle>
              <CardDescription>Over/under-target flags based on logged timesheets</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border uppercase">
                    <tr>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Role / Dept</th>
                      <th className="p-3">Logged Hours</th>
                      <th className="p-3">Billable vs Non-Billable</th>
                      <th className="p-3">Capacity %</th>
                      <th className="p-3">Target Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {performanceData?.employeeUtilization?.map((emp: any) => (
                      <tr key={emp.userId} className="hover:bg-accent/30 transition-colors">
                        <td className="p-3 font-bold text-foreground">{emp.userName}</td>
                        <td className="p-3 text-muted-foreground">{emp.userRole} • {emp.department}</td>
                        <td className="p-3 font-mono font-semibold">{emp.totalHours} hrs</td>
                        <td className="p-3">
                          <span className="text-emerald-500 font-semibold">{emp.billableHours}h billable</span>
                          <span className="text-muted-foreground"> / {emp.nonBillableHours}h non-billable</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  emp.capacityStatus === "Overloaded"
                                    ? "bg-rose-500"
                                    : emp.capacityStatus === "Underutilized"
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                )}
                                style={{ width: `${Math.min(100, emp.capacityPct)}%` }}
                              />
                            </div>
                            <span className="font-semibold">{emp.capacityPct}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            color={
                              emp.capacityStatus === "Overloaded"
                                ? "destructive"
                                : emp.capacityStatus === "Underutilized"
                                ? "warning"
                                : "success"
                            }
                          >
                            {emp.capacityStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Project Hours Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-chart-simple text-primary text-sm" /> Hours Distribution by Project
              </CardTitle>
              <CardDescription>Total time logged per active project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(projectHoursMap).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No timesheet entries recorded yet.</p>
              ) : (
                Object.entries(projectHoursMap).map(([pName, hrs]) => {
                  const pct = totalLoggedHours > 0 ? Math.round((hrs / totalLoggedHours) * 100) : 0;
                  return (
                    <div key={pName} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-foreground">
                        <span>{pName}</span>
                        <span>{hrs} hrs ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: MANAGER CONTROL VIEW */}
      {activeTab === "manager" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Timesheets</p>
                  <p className="text-2xl font-bold text-foreground">
                    {performanceData?.managerSummary?.pendingTimesheets || 0} Queue
                  </p>
                  <p className="text-xs text-amber-500 font-medium mt-1">Requires approval</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <i className="fa-solid fa-clock text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Leave Requests</p>
                  <p className="text-2xl font-bold text-foreground">
                    {performanceData?.managerSummary?.pendingLeaves || 0} Requests
                  </p>
                  <p className="text-xs text-rose-500 font-medium mt-1">Awaiting sign-off</p>
                </div>
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                  <i className="fa-solid fa-file-lines text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Team Members</p>
                  <p className="text-2xl font-bold text-foreground">
                    {performanceData?.managerSummary?.totalTeamMembers || 0} Members
                  </p>
                  <p className="text-xs text-emerald-500 font-medium mt-1">Workspace active</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <i className="fa-solid fa-users text-xl" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Team Capacity Distribution & Overload Alert</CardTitle>
              <CardDescription>Identifies team members exceeding standard weekly working hours</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {performanceData?.employeeUtilization?.map((emp: any) => (
                <div key={emp.userId} className="p-3.5 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{emp.userName}</p>
                      <Badge variant="outline">{emp.userRole}</Badge>
                      {emp.capacityStatus === "Overloaded" && (
                        <Badge color="destructive" className="gap-1">
                          <i className="fa-solid fa-triangle-exclamation text-xs" /> Overloaded ({emp.totalHours}h)
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{emp.department} • {emp.billableHours} hours billable logged</p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">{emp.capacityPct}% Capacity</p>
                    <div className="h-1.5 w-28 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          emp.capacityStatus === "Overloaded" ? "bg-rose-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(100, emp.capacityPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: PERFORMANCE INSIGHTS */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Competency Appraisal Score</p>
                  <p className="text-2xl font-bold text-foreground">
                    {performanceData?.performanceInsights?.avgCompetencyScore || 0} / 5
                  </p>
                  <p className="text-xs text-amber-500 font-medium mt-1">Average performance rating</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <i className="fa-solid fa-award text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OKR Alignment Health</p>
                  <p className="text-2xl font-bold text-foreground">
                    {performanceData?.performanceInsights?.okrHealthPct || 100}%
                  </p>
                  <p className="text-xs text-emerald-500 font-medium mt-1">On Track / Completed OKRs</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <i className="fa-solid fa-chart-line text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-sky-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Completed Appraisals</p>
                  <p className="text-2xl font-bold text-foreground">
                    {performanceData?.performanceInsights?.completedAppraisals || 0} / {performanceData?.performanceInsights?.totalAppraisals || 0}
                  </p>
                  <p className="text-xs text-sky-500 font-medium mt-1">HR reviews completed</p>
                </div>
                <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
                  <i className="fa-solid fa-circle-check text-xl" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOG TRAIL */}
      {activeTab === "audit" && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                <i className="fa-solid fa-clock-rotate-left text-emerald-500 text-lg" /> All Workspace & System Activity Logs
                <Badge variant="outline" className="ml-2 border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                  {filteredLogs.length} Total Logs
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Complete, immutable audit trail of system events, file uploads, project modifications, and user actions
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportCSV}
                className="gap-2 text-xs font-semibold"
                disabled={filteredLogs.length === 0}
              >
                <i className="fa-solid fa-download text-xs text-primary" /> Export CSV Logs
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Search & Comprehensive Multi-Filter Controls */}
            <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative w-full md:w-96">
                  <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                  <Input
                    placeholder="Search by user, action, target, or details..."
                    value={logSearch}
                    onChange={(e) => {
                      setLogSearch(e.target.value);
                      setLogPage(1);
                    }}
                    className="pl-9 text-xs h-9 bg-background"
                  />
                  {logSearch && (
                    <button
                      onClick={() => {
                        setLogSearch("");
                        setLogPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  )}
                </div>

                {/* Reset Filters Button */}
                {(logSearch || logFilterAction !== "all" || logFilterVerb !== "all" || logFilterTime !== "all" || logFilterUser !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetLogFilters}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 h-8 font-medium self-end md:self-auto"
                  >
                    <i className="fa-solid fa-rotate-left text-xs" /> Clear All Filters
                  </Button>
                )}
              </div>

              {/* Filter Selects Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                {/* Category Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <i className="fa-solid fa-layer-group text-primary" /> Module Category
                  </label>
                  <select
                    value={logFilterAction}
                    onChange={(e) => {
                      setLogFilterAction(e.target.value);
                      setLogPage(1);
                    }}
                    className="w-full h-8 px-2.5 text-xs bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="all">All Modules</option>
                    <option value="UPLOAD">File & Drive Uploads</option>
                    <option value="TASK">Tasks & Workflows</option>
                    <option value="PROJECT">Project Operations</option>
                    <option value="LEAVE">Leave Management</option>
                    <option value="APPRAISAL">HR Appraisals</option>
                    <option value="USER">User Account Management</option>
                  </select>
                </div>

                {/* Operation Type Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <i className="fa-solid fa-bolt text-amber-500" /> Operation Type
                  </label>
                  <select
                    value={logFilterVerb}
                    onChange={(e) => {
                      setLogFilterVerb(e.target.value);
                      setLogPage(1);
                    }}
                    className="w-full h-8 px-2.5 text-xs bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="all">All Operations</option>
                    <option value="CREATE">Create / Add</option>
                    <option value="UPDATE">Update / Edit</option>
                    <option value="DELETE">Delete / Remove</option>
                    <option value="UPLOAD">Upload File</option>
                  </select>
                </div>

                {/* Time Range Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <i className="fa-solid fa-calendar-day text-emerald-500" /> Time Period
                  </label>
                  <select
                    value={logFilterTime}
                    onChange={(e) => {
                      setLogFilterTime(e.target.value);
                      setLogPage(1);
                    }}
                    className="w-full h-8 px-2.5 text-xs bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Past 7 Days</option>
                    <option value="30days">Past 30 Days</option>
                  </select>
                </div>

                {/* Performer User Filter */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <i className="fa-solid fa-user-check text-sky-500" /> Performer User
                  </label>
                  <select
                    value={logFilterUser}
                    onChange={(e) => {
                      setLogFilterUser(e.target.value);
                      setLogPage(1);
                    }}
                    className="w-full h-8 px-2.5 text-xs bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="all">All Users</option>
                    {uniqueLogUsers.map((uName) => (
                      <option key={uName} value={uName}>
                        {uName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Logs Roster Table */}
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-foreground">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">User & Role</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Target Scope</th>
                      <th className="px-4 py-3">Activity Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                          <i className="fa-solid fa-clock-rotate-left text-3xl mb-2 text-muted-foreground/50 block" />
                          No system activity logs found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            <i className="fa-regular fa-clock mr-1 text-muted-foreground/70" />
                            {new Date(log.createdAt).toLocaleString()}
                          </td>

                          <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[10px]">
                                {(log.userName || "S")[0].toUpperCase()}
                              </span>
                              <div>
                                <span className="font-semibold text-foreground">{log.userName || "System"}</span>
                                {log.userRole && (
                                  <span className="text-[10px] text-muted-foreground block font-mono">
                                    {log.userRole}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono text-[10px] px-2 py-0.5",
                                (log.action || "").includes("UPLOAD") && "border-blue-500/30 text-blue-500 bg-blue-500/10",
                                (log.action || "").includes("CREATE") && "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
                                (log.action || "").includes("DELETE") && "border-rose-500/30 text-rose-500 bg-rose-500/10",
                                (log.action || "").includes("UPDATE") && "border-amber-500/30 text-amber-500 bg-amber-500/10"
                              )}
                            >
                              {log.action}
                            </Badge>
                          </td>

                          <td className="px-4 py-3 font-semibold text-foreground">
                            {log.targetName || "Workspace"}
                          </td>

                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={log.details}>
                            {log.details || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Log Pagination Footer */}
              {totalLogPages > 1 && (
                <div className="p-3 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    Showing {(logPage - 1) * logItemsPerPage + 1} to{" "}
                    {Math.min(logPage * logItemsPerPage, filteredLogs.length)} of {filteredLogs.length} activity logs
                  </span>
                  <Pagination
                    currentPage={logPage}
                    totalPages={totalLogPages}
                    onPageChange={(page) => setLogPage(page)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
