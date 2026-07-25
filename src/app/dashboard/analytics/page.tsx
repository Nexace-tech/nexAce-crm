"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, TrendingUp, Clock, History, Download, RefreshCw, ShieldCheck, Filter 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tsRes, logRes] = await Promise.all([
        fetch("/api/timesheets"),
        fetch("/api/activity-logs")
      ]);

      if (tsRes.ok) {
        const tsData = await tsRes.json();
        setTimesheets(tsData.entries || []);
      }
      if (logRes.ok) {
        const logData = await logRes.json();
        setActivityLogs(logData.logs || []);
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

  // Compute live analytics metrics
  const totalLoggedHours = timesheets.reduce((acc, curr) => acc + (curr.hours || 0), 0);
  const billableHours = timesheets.filter(t => t.isBillable).reduce((acc, curr) => acc + (curr.hours || 0), 0);
  const billableRatio = totalLoggedHours > 0 ? ((billableHours / totalLoggedHours) * 100).toFixed(1) : "0.0";

  // Group by project
  const projectHoursMap: Record<string, number> = {};
  timesheets.forEach(t => {
    const pName = t.project || "General";
    projectHoursMap[pName] = (projectHoursMap[pName] || 0) + (t.hours || 0);
  });

  const exportCSV = () => {
    const headers = ["ID,Action,User,Role,Target,Details,Timestamp\n"];
    const rows = activityLogs.map(l => 
      `"${l._id}","${l.action}","${l.userName}","${l.userRole || ''}","${l.targetName || ''}","${l.details || ''}","${new Date(l.createdAt).toLocaleString()}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground text-sm">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-3" />
        Generating Workspace Analytics...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Analytics & Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Resource utilization, timesheet hours breakdown, and live security audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button color="primary" size="sm" onClick={exportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export CSV Report
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Hours Logged</p>
              <p className="text-2xl font-bold text-foreground">{totalLoggedHours} hrs</p>
              <p className="text-xs text-emerald-500 font-medium mt-1">Live DB sync</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Clock className="w-6 h-6" />
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
              <BarChart3 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit Log Events</p>
              <p className="text-2xl font-bold text-foreground">{activityLogs.length} Events</p>
              <p className="text-xs text-sky-500 font-medium mt-1">Security Compliant</p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <History className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Hours Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Hours Distribution by Project
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

      {/* Workspace Audit Logs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Workspace Audit Logs
            </CardTitle>
            <CardDescription>Real-time system events, permission changes, and security operations</CardDescription>
          </div>
          <Badge color="primary" variant="soft">{activityLogs.length} Events</Badge>
        </CardHeader>

        <CardContent>
          {activityLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm space-y-1">
              <History className="w-8 h-8 mx-auto stroke-1 opacity-50" />
              <p>No audit activity logged yet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {activityLogs.map((log) => (
                <div key={log._id} className="p-3 rounded-lg border border-border bg-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{log.userName || "System"}</span>
                      <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                    </div>
                    <p className="text-muted-foreground">{log.details || log.targetName}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
