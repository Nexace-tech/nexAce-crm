
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatISTTime, formatISTDate, getISTDateString, APP_TIMEZONE } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

function getNowInIST(): { hours: number; minutes: number } {
  const nowStr = new Date().toLocaleTimeString("en-US", { timeZone: APP_TIMEZONE, hour12: false, hour: "2-digit", minute: "2-digit" });
  const [h, m] = nowStr.split(":").map(Number);
  return { hours: h || 0, minutes: m || 0 };
}

function parseTime(timeStr: string): { h: number; m: number } | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return { h, m };
}

function getShiftStatus(shiftTime: string): "active" | "upcoming" | "ended" | "offshift" {
  if (!shiftTime || !shiftTime.includes("-")) return "offshift";
  const [startStr, endStr] = shiftTime.split("-").map((s) => s.trim());
  const start = parseTime(startStr);
  const end = parseTime(endStr);
  if (!start || !end) return "offshift";
  const { hours, minutes } = getNowInIST();
  const nowMins = hours * 60 + minutes;
  const startMins = start.h * 60 + start.m;
  const endMins = end.h * 60 + end.m;
  const buffer = 30;
  if (endMins < startMins) {
    if (nowMins >= startMins || nowMins < endMins) return "active";
    if (nowMins >= startMins - buffer) return "upcoming";
    return "ended";
  }
  if (nowMins >= startMins && nowMins < endMins) return "active";
  if (nowMins >= startMins - buffer && nowMins < startMins) return "upcoming";
  if (nowMins >= endMins) return "ended";
  return "upcoming";
}

function getShiftProgress(shiftTime: string): number {
  if (!shiftTime || !shiftTime.includes("-")) return 0;
  const [startStr, endStr] = shiftTime.split("-").map((s) => s.trim());
  const start = parseTime(startStr);
  const end = parseTime(endStr);
  if (!start || !end) return 0;
  const { hours, minutes } = getNowInIST();
  const nowMins = hours * 60 + minutes;
  const startMins = start.h * 60 + start.m;
  let endMins = end.h * 60 + end.m;
  if (endMins < startMins) endMins += 1440;
  let nowAdj = nowMins;
  if (endMins > 1440 && nowMins < startMins) nowAdj += 1440;
  if (nowAdj < startMins) return 0;
  if (nowAdj > endMins) return 100;
  return Math.round(((nowAdj - startMins) / (endMins - startMins)) * 100);
}

const ROLE_COLORS: Record<string, { avatar: string; badge: string }> = {
  Admin:    { avatar: "bg-rose-500/15 text-rose-500 border-rose-500/30",          badge: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  OPS:      { avatar: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  Manager:  { avatar: "bg-purple-500/15 text-purple-500 border-purple-500/30",    badge: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  HR:       { avatar: "bg-pink-500/15 text-pink-500 border-pink-500/30",          badge: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
  Employee: { avatar: "bg-sky-500/15 text-sky-500 border-sky-500/30",             badge: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
};

const DEPT_COLORS = [
  "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "bg-violet-500/10 text-violet-600 border-violet-500/20",
  "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "bg-teal-500/10 text-teal-600 border-teal-500/20",
  "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  "bg-orange-500/10 text-orange-600 border-orange-500/20",
];

function getDeptColor(dept: string) {
  if (!dept) return DEPT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < dept.length; i++) {
    hash = (hash << 5) - hash + dept.charCodeAt(i);
    hash |= 0;
  }
  return DEPT_COLORS[Math.abs(hash) % DEPT_COLORS.length];
}

const STATUS_CONFIG = {
  active:   { label: "Active Now",    icon: "fa-solid fa-circle-check", dot: "bg-emerald-500",      text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  upcoming: { label: "Starting Soon", icon: "fa-solid fa-clock",        dot: "bg-amber-400",        text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/10",   border: "border-amber-500/25" },
  ended:    { label: "Shift Ended",   icon: "fa-solid fa-moon",         dot: "bg-slate-400",        text: "text-slate-500",                         bg: "bg-muted/40",       border: "border-border/40" },
  offshift: { label: "Off Shift",     icon: "fa-solid fa-circle-minus", dot: "bg-muted-foreground", text: "text-muted-foreground",                  bg: "bg-muted/20",       border: "border-border/30" },
};

const EMPLOYMENT_TYPE_CONFIG: Record<string, { badge: string; icon: string }> = {
  "Permanent":  { badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: "fa-solid fa-star text-emerald-500" },
  "Freelancer": { badge: "bg-purple-500/10 text-purple-600 border-purple-500/20",   icon: "fa-solid fa-laptop-code text-purple-500" },
  "Part-Time":  { badge: "bg-sky-500/10 text-sky-600 border-sky-500/20",            icon: "fa-solid fa-clock text-sky-500" },
  "Contractor": { badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",         icon: "fa-solid fa-briefcase text-amber-500" },
  "Intern":     { badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",       icon: "fa-solid fa-user-graduate text-indigo-500" },
};

export function TeamShiftOverviewCard() {
  const { user: currentUser } = useAuth();
  const { isAdmin, isOPS } = usePermissions();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [now, setNow] = useState(new Date());
  const [clocking, setClocking] = useState(false);

  // Member detail drawer
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [memberHistory, setMemberHistory] = useState<any[]>([]);
  const [memberHistoryLoading, setMemberHistoryLoading] = useState(false);
  const [memberTasks, setMemberTasks] = useState<any[]>([]);
  const [memberTasksLoading, setMemberTasksLoading] = useState(false);

  const fetchMemberHistory = async (userId: string) => {
    setMemberHistoryLoading(true);
    try {
      const today = getISTDateString();
      const res = await fetch(`/api/attendance/summary?userId=${userId}&from=${today}&to=${today}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setMemberHistory(data.records || []);
      }
    } catch (err) {
      console.error("Failed to fetch member history:", err);
    } finally {
      setMemberHistoryLoading(false);
    }
  };

  const fetchMemberTasks = async (userId: string) => {
    setMemberTasksLoading(true);
    try {
      const res = await fetch(`/api/tasks?assignee=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const todayStr = getISTDateString();
        const filteredTasks = (data.tasks || []).filter((t: any) => {
          const isDueToday = t.dueDate && getISTDateString(new Date(t.dueDate)) === todayStr;
          return t.status !== "Done" || isDueToday;
        });
        setMemberTasks(filteredTasks);
      }
    } catch (err) {
      console.error("Failed to fetch member tasks:", err);
    } finally {
      setMemberTasksLoading(false);
    }
  };

  const openMemberDetail = (m: any) => {
    setSelectedMember(m);
    setMemberHistory([]);
    setMemberTasks([]);
    if (m._id) {
      fetchMemberHistory(m._id);
      fetchMemberTasks(m._id);
    }
  };

  const closeMemberDetail = () => {
    setSelectedMember(null);
    setMemberHistory([]);
    setMemberTasks([]);
  };

  const exportMemberData = async (m: any) => {
    try {
      const to = getISTDateString();
      const from = getISTDateString(new Date(Date.now() - 30 * 86400000));
      const res = await fetch(`/api/attendance/summary?userId=${m._id}&from=${from}&to=${to}&limit=200`);
      if (!res.ok) return;
      const data = await res.json();
      const recs: any[] = data.records || [];
      if (recs.length === 0) return;

      const fmtTime = (d: string | Date | null | undefined) => (d ? formatISTTime(d) : "");
      const fmtHrs2 = (h: number) => {
        const hh = Math.floor(h); const mm = Math.round((h - hh) * 60);
        return `${hh}h ${mm.toString().padStart(2, "0")}m`;
      };

      const headers = ["Date", "Day", "Clock In (IST)", "Clock Out (IST)", "Duration", "Regular Hrs", "Overtime Hrs", "Status"];
      const rows = recs.map((r: any) => {
        const dur = r.clockIn && r.clockOut
          ? fmtHrs2((new Date(r.clockOut).getTime() - new Date(r.clockIn).getTime()) / 3600000)
          : r.regularHours ? fmtHrs2(r.regularHours) : "Active";
        return [
          `"${formatISTDate(r.date)}"`,
          `"${formatISTDate(r.date, { weekday: "long" })}"`,
          `"${fmtTime(r.clockIn)}"`,
          `"${r.clockOut ? fmtTime(r.clockOut) : (r.clockIn ? "Active" : "")}"`,
          `"${dur}"`,
          r.regularHours ?? 0,
          r.overtimeHours ?? 0,
          `"${r.status ?? "Present"}"`
        ].join(",");
      });

      const csv = [
        `"Employee","${m.name ?? ""}"`,
        `"Email","${m.email ?? ""}"`,
        `"Role","${m.role ?? ""}"`,
        `"Department","${m.department ?? ""}"`,
        `"Timezone","IST (Asia/Kolkata)"`,
        `"Period","${from} to ${to}"`,
        "",
        headers.join(","),
        ...rows
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Attendance_${(m.name ?? "user").replace(/\s+/g, "_")}_${from}_to_${to}_IST.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const fetchTeamShifts = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/team?all=true");
      if (res.ok) {
        const data = await res.json();
        let users = data.users || [];
        if (!isAdmin && !isOPS && currentUser?.email) {
          users = users.filter(
            (u: any) => u.email?.toLowerCase() === currentUser.email?.toLowerCase()
          );
        }
        setTeamMembers(users);
      }
    } catch (err) {
      console.error("Failed to fetch team shift times:", err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTeamShifts();
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, [currentUser, isAdmin, isOPS]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedMember) {
        closeMemberDetail();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMember]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    teamMembers.forEach((m) => {
      if (m.department) set.add(m.department);
      if (Array.isArray(m.departments)) m.departments.forEach((d: string) => d && set.add(d));
    });
    return Array.from(set).sort();
  }, [teamMembers]);

  const teamMemberMap = useMemo(() => {
    const map = new Map<string, any>();
    teamMembers.forEach((u) => {
      if (u._id) map.set(u._id, u);
    });
    return map;
  }, [teamMembers]);

  const enriched = useMemo(
    () => teamMembers.map((m) => {
      const shiftTiming = m.shiftTime || "09:00 AM - 05:00 PM";
      const shiftName = m.shiftName || "Standard Day Shift";
      const empType = m.employmentType || "Permanent";
      const timeStatus = getShiftStatus(shiftTiming);
      const computedStatus = m.isClockedIn
        ? "active"
        : m.attendanceStatus === "Shift Ended"
          ? "ended"
          : timeStatus === "active"
            ? "upcoming"
            : timeStatus;

      // Safe manager resolution using O(1) map lookup
      let managerName = "—";
      if (m.managerId) {
        if (typeof m.managerId === "object" && m.managerId.name) {
          managerName = m.managerId.name;
        } else {
          const mId = typeof m.managerId === "object" ? m.managerId._id : m.managerId;
          const found = teamMemberMap.get(mId);
          managerName = found?.name || "CEO / Top-level";
        }
      } else {
        managerName = "CEO / Top-level";
      }

      return {
        ...m,
        shiftTiming,
        shiftName,
        empType,
        managerName,
        status: computedStatus,
        progress: getShiftProgress(shiftTiming),
        isNight: shiftName.toLowerCase().includes("night")
      };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamMembers, teamMemberMap, now]
  );

  const filtered = useMemo(
    () => enriched.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchQuery = !q || 
        m.name?.toLowerCase().includes(q) || 
        m.username?.toLowerCase().includes(q) || 
        m.email?.toLowerCase().includes(q) || 
        m.department?.toLowerCase().includes(q) || 
        m.role?.toLowerCase().includes(q) ||
        m.managerName?.toLowerCase().includes(q);

      const matchDept = departmentFilter === "All" || 
        m.department === departmentFilter || 
        (Array.isArray(m.departments) && m.departments.includes(departmentFilter));

      const matchShift = shiftFilter === "All" || m.shiftName.toLowerCase().includes(shiftFilter.toLowerCase());
      const matchType = typeFilter === "All" || m.empType === typeFilter;
      const matchStatus = statusFilter === "All" || m.status === statusFilter;

      return matchQuery && matchDept && matchShift && matchType && matchStatus;
    }),
    [enriched, searchQuery, departmentFilter, shiftFilter, typeFilter, statusFilter]
  );

  const stats = useMemo(() => ({
    total: enriched.length,
    active: enriched.filter((m) => m.status === "active").length,
    upcoming: enriched.filter((m) => m.status === "upcoming").length,
    ended: enriched.filter((m) => m.status === "ended").length,
    offshift: enriched.filter((m) => m.status === "offshift").length,
  }), [enriched]);

  const formatTime = (d: Date) => formatISTTime(d);
  const hasFilters = !!(searchQuery || departmentFilter !== "All" || shiftFilter !== "All" || typeFilter !== "All" || statusFilter !== "All");
  const resetFilters = () => { 
    setSearchQuery(""); 
    setDepartmentFilter("All");
    setShiftFilter("All"); 
    setTypeFilter("All"); 
    setStatusFilter("All"); 
  };

  const myRecord = enriched.find((m) => m.email?.toLowerCase() === currentUser?.email?.toLowerCase());
  const isCurrentlyClockedIn = Boolean(myRecord?.isClockedIn || myRecord?.status === "active");

  const handleQuickClockAction = async () => {
    setClocking(true);
    try {
      const action = isCurrentlyClockedIn ? "out" : "in";
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchTeamShifts();
      }
    } catch (err) {
      console.error("Clock action failed:", err);
    } finally {
      setClocking(false);
    }
  };

  const STAT_TABS = [
    { key: "All",      label: "Total Roster",   value: stats.total,    icon: "fa-solid fa-users",        iconColor: "text-foreground" },
    { key: "active",   label: "Active Now",     value: stats.active,   icon: "fa-solid fa-circle-check", iconColor: "text-emerald-500" },
    { key: "upcoming", label: "Starting Soon",  value: stats.upcoming, icon: "fa-solid fa-clock",        iconColor: "text-amber-500" },
    { key: "ended",    label: "Shift Ended",    value: stats.ended,    icon: "fa-solid fa-moon",         iconColor: "text-slate-400" },
    { key: "offshift", label: "Off Shift",      value: stats.offshift, icon: "fa-solid fa-circle-minus", iconColor: "text-muted-foreground" },
  ];

  return (
    <>
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="fa-solid fa-clock text-primary text-sm shrink-0" />
              Team Shift Overview
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20 flex items-center gap-1.5" title="Indian Standard Time (IST)">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {formatTime(now)} <span className="opacity-70 text-[9px]">IST</span>
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Live shift assignments, reporting structures &amp; real-time attendance status
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Live refresh action button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchTeamShifts(true)}
              disabled={refreshing || loading}
              title="Refresh Shift Data"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <i className={cn("fa-solid fa-arrows-rotate text-xs", refreshing && "fa-spin text-primary")} />
            </Button>

            <Button
              size="sm"
              onClick={handleQuickClockAction}
              disabled={clocking}
              className={cn(
                "cursor-pointer text-xs font-bold gap-1.5 h-8 px-3 transition-all shadow-xs",
                isCurrentlyClockedIn
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              <i className={cn("fa-solid text-xs", isCurrentlyClockedIn ? "fa-stopwatch" : "fa-fingerprint")} />
              {clocking ? (
                <i className="fa-solid fa-spinner fa-spin text-xs" />
              ) : isCurrentlyClockedIn ? (
                "Clock Out"
              ) : (
                "Clock In"
              )}
            </Button>

            <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/60">
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={cn(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-table-list text-xs" />
              </button>
              <button
                onClick={() => setViewMode("cards")}
                title="Card view"
                className={cn(
                  "p-1.5 rounded-md transition-all cursor-pointer",
                  viewMode === "cards" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-border-all text-xs" />
              </button>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1 text-primary h-8 px-2.5">
              <Link href="/dashboard/calendar">
                Attendance Logs <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 mb-4">
          {STAT_TABS.map((st) => {
            const sel = statusFilter === st.key;
            return (
              <button
                key={st.key}
                onClick={() => setStatusFilter(sel ? "All" : st.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer",
                  sel
                    ? "border-primary/30 bg-primary/5 shadow-xs ring-1 ring-primary/20"
                    : "border-border/50 bg-muted/20 hover:border-border hover:bg-accent/20"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <i className={cn("text-xs shrink-0", st.iconColor, st.icon)} />
                  <span className={cn("text-lg font-bold leading-none", sel ? "text-primary" : "text-foreground")}>
                    {loading ? "—" : st.value}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground leading-tight font-medium truncate w-full">{st.label}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search member, manager, role, department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            )}
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="h-8 text-xs bg-background border border-border rounded-md px-2.5 text-foreground outline-none cursor-pointer shrink-0"
          >
            <option value="All">All Departments</option>
            {uniqueDepartments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="h-8 text-xs bg-background border border-border rounded-md px-2.5 text-foreground outline-none cursor-pointer shrink-0"
          >
            <option value="All">All Shifts</option>
            <option value="Standard">Standard Day</option>
            <option value="Morning">Morning</option>
            <option value="Evening">Evening</option>
            <option value="Night">Night</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 text-xs bg-background border border-border rounded-md px-2.5 text-foreground outline-none cursor-pointer shrink-0"
          >
            <option value="All">All Employment Types</option>
            <option value="Permanent">Permanent</option>
            <option value="Freelancer">Freelancer</option>
            <option value="Part-Time">Part-Time</option>
            <option value="Contractor">Contractor</option>
            <option value="Intern">Intern</option>
          </select>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="h-8 px-2.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <i className="fa-solid fa-rotate-left text-xs" /> Reset
            </button>
          )}

          {!loading && (
            <span className="text-[11px] text-muted-foreground shrink-0 self-center">
              {filtered.length}/{enriched.length}
            </span>
          )}
        </div>

        {viewMode === "table" && (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Team Member</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Department</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Reports To</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Employment Type</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Shift</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Timing</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Progress</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-muted/70 shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-3 w-28 bg-muted/70 rounded" />
                            <div className="h-2 w-20 bg-muted/50 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3"><div className="h-4 w-20 bg-muted/60 rounded-full" /></td>
                      <td className="py-3 px-3"><div className="h-4 w-24 bg-muted/60 rounded" /></td>
                      <td className="py-3 px-3"><div className="h-3 w-24 bg-muted/60 rounded" /></td>
                      <td className="py-3 px-3"><div className="h-3 w-28 bg-muted/60 rounded" /></td>
                      <td className="py-3 px-3"><div className="h-2 w-24 bg-muted/60 rounded-full" /></td>
                      <td className="py-3 px-3"><div className="h-2 w-16 bg-muted/60 rounded-full" /></td>
                      <td className="py-3 px-3 text-right"><div className="h-5 w-20 bg-muted/60 rounded-full ml-auto" /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <i className="fa-solid fa-user-clock text-3xl opacity-30" />
                        <span className="text-xs">No team members match your filters</span>
                        {hasFilters && (
                          <button onClick={resetFilters} className="text-[11px] text-primary hover:underline cursor-pointer">
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => {
                    const rc = ROLE_COLORS[m.role] || ROLE_COLORS.Employee;
                    const dc = getDeptColor(m.department || "Management");
                    const sc = STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG];
                    const isSelected = selectedMember?._id === m._id;
                    return (
                      <tr
                        key={m._id}
                        onClick={() => openMemberDetail(m)}
                        className={cn("cursor-pointer transition-colors", isSelected ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-accent/25")}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border", rc.avatar)}>
                              {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate leading-tight">{m.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-semibold shrink-0", rc.badge)}>
                                  {m.role === "OPS" ? "OPS (SubAdmin)" : (m.role || "Employee")}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono truncate">
                                  {m.username ? "@" + m.username : m.email}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border", dc)}>
                            {m.department || "Management"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium whitespace-nowrap">
                            <i className="fa-solid fa-user-tie text-[10px] text-muted-foreground/60" />
                            {m.managerName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {(() => {
                            const etc = EMPLOYMENT_TYPE_CONFIG[m.empType] || { badge: "bg-muted/40 text-muted-foreground border-border/40", icon: "fa-solid fa-user text-muted-foreground" };
                            return (
                              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap", etc.badge)}>
                                <i className={cn("text-[8px]", etc.icon)} />
                                {m.empType}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-foreground flex items-center gap-1.5 whitespace-nowrap">
                            <i className={cn("text-xs shrink-0", m.isNight ? "fa-solid fa-moon text-indigo-400" : "fa-solid fa-sun text-amber-400")} />
                            {m.shiftName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/40 inline-flex items-center gap-1.5 whitespace-nowrap">
                            <i className="fa-regular fa-clock text-xs text-muted-foreground shrink-0" />
                            {m.shiftTiming}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 min-w-[90px]">
                          {m.status === "active" ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: m.progress + "%" }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0 w-7 text-right">{m.progress}%</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap", sc.text, sc.bg, sc.border)}>
                            <i className={cn("text-[9px] shrink-0", sc.icon)} />
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === "cards" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl border border-border/60 bg-card animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted/70 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-24 bg-muted/70 rounded" />
                      <div className="h-2 w-16 bg-muted/50 rounded" />
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted/50 rounded-full" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="col-span-full py-10 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <i className="fa-solid fa-user-clock text-3xl opacity-30" />
                  <span className="text-xs">No members match</span>
                  {hasFilters && (
                    <button onClick={resetFilters} className="text-[11px] text-primary hover:underline cursor-pointer">
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              filtered.map((m) => {
                const rc = ROLE_COLORS[m.role] || ROLE_COLORS.Employee;
                const dc = getDeptColor(m.department || "Management");
                const sc = STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG];
                const isSelected = selectedMember?._id === m._id;
                return (
                  <div
                    key={m._id}
                    onClick={() => openMemberDetail(m)}
                    className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-sm hover:-translate-y-px space-y-3 cursor-pointer",
                      isSelected
                        ? "border-primary/40 bg-primary/[0.05] ring-1 ring-primary/20"
                        : m.status === "active"
                        ? "border-emerald-500/25 bg-emerald-500/[0.03] hover:border-emerald-500/40"
                        : m.status === "upcoming"
                        ? "border-amber-500/25 bg-amber-500/[0.03] hover:border-amber-500/40"
                        : "border-border/60 bg-card/80 hover:border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border", rc.avatar)}>
                          {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-foreground truncate leading-tight">{m.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{m.username ? "@" + m.username : m.email}</p>
                        </div>
                      </div>
                      <span className={cn("inline-flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 mt-0.5", sc.text, sc.bg, sc.border)}>
                        <i className={cn("text-[8px] shrink-0", sc.icon)} />
                        {sc.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md border font-semibold", rc.badge)}>
                        {m.role === "OPS" ? "OPS (SubAdmin)" : (m.role || "Employee")}
                      </span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md border font-semibold", dc)}>{m.department || "Management"}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-border/50 bg-muted/40 text-muted-foreground font-semibold flex items-center gap-1">
                        <i className={cn("text-xs shrink-0", m.isNight ? "fa-solid fa-moon text-indigo-400" : "fa-solid fa-sun text-amber-400")} />
                        {m.shiftName}
                      </span>
                    </div>

                    {/* Reports To info in cards view */}
                    <div className="text-[10px] text-muted-foreground flex items-center justify-between border-t border-border/40 pt-2">
                      <span className="flex items-center gap-1">
                        <i className="fa-solid fa-user-tie text-[9px] opacity-70" />
                        <span className="opacity-75">Reports to:</span>
                        <strong className="text-foreground font-medium">{m.managerName}</strong>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-muted-foreground flex items-center gap-1.5">
                          <i className="fa-regular fa-clock text-xs shrink-0" /> {m.shiftTiming}
                        </span>
                        {m.status === "active" && <span className="text-emerald-500 font-bold">{m.progress}%</span>}
                      </div>
                      <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        {m.status === "active" && (
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: m.progress + "%" }} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>

    {/* ─── Member Detail Drawer ─── */}
    {selectedMember && (() => {
      const m = selectedMember;
      const rc = ROLE_COLORS[m.role] || ROLE_COLORS.Employee;
      const sc = STATUS_CONFIG[m.status as keyof typeof STATUS_CONFIG];

      const fmtTime = (d: string | Date | null | undefined) => (d ? formatISTTime(d) : "--:--");

      const fmtHrs = (h: number) => {
        const hh = Math.floor(h);
        const mm = Math.round((h - hh) * 60);
        return `${hh}h ${mm.toString().padStart(2, "0")}m`;
      };

      // Live elapsed since clock-in
      const liveMs = m.isClockedIn && m.clockInTime ? Date.now() - new Date(m.clockInTime).getTime() : 0;
      const liveMins = Math.floor(liveMs / 60000);
      const liveElapsed = liveMs > 0 ? `${Math.floor(liveMins / 60)}h ${(liveMins % 60).toString().padStart(2, "0")}m` : "";

      // Today's attendance record (first in list)
      const todayRec = memberHistory[0] ?? null;
      const todayRegH = todayRec?.regularHours ?? 0;
      const todayOtH = todayRec?.overtimeHours ?? 0;
      const todayTotalH = todayRec
        ? todayRec.clockIn && !todayRec.clockOut
          ? Math.max(0, (Date.now() - new Date(todayRec.clockIn).getTime()) / 3600000)
          : todayRegH
        : 0;

      // Shift total hours for target calc
      const [sStart, sEnd] = (m.shiftTiming || "09:00 AM - 05:00 PM").split("-").map((s: string) => s.trim());
      const pStart = sStart ? parseTime(sStart) : null;
      const pEnd = sEnd ? parseTime(sEnd) : null;
      const shiftTotalH = pStart && pEnd
        ? (() => { let e = pEnd.h * 60 + pEnd.m; const s = pStart.h * 60 + pStart.m; if (e < s) e += 1440; return (e - s) / 60; })()
        : 8;

      // Live shift countdown in IST
      const shiftRemainingText = (() => {
        if (!pStart || !pEnd) return "";
        const { hours, minutes } = getNowInIST();
        const nowMins = hours * 60 + minutes;
        const startMins = pStart.h * 60 + pStart.m;
        let endMins = pEnd.h * 60 + pEnd.m;
        if (endMins < startMins) endMins += 1440;
        let nowAdj = nowMins;
        if (endMins > 1440 && nowMins < startMins) nowAdj += 1440;

        if (m.status === "active") {
          const rem = Math.max(0, endMins - nowAdj);
          const rh = Math.floor(rem / 60);
          const rm = rem % 60;
          return rem > 0 ? `Ends in ${rh}h ${rm}m` : "Shift completing";
        }
        if (m.status === "upcoming") {
          const until = Math.max(0, startMins - nowAdj);
          const uh = Math.floor(until / 60);
          const um = until % 60;
          return uh > 0 ? `Starts in ${uh}h ${um}m` : `Starts in ${um}m`;
        }
        return "";
      })();

      const statusIconConfig: Record<string, { icon: string; color: string; glow: string }> = {
        active:   { icon: "fa-solid fa-circle-check", color: "text-emerald-500", glow: "drop-shadow-[0_0_5px_rgba(16,185,129,0.9)]" },
        upcoming: { icon: "fa-solid fa-clock",         color: "text-amber-400",   glow: "drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" },
        ended:    { icon: "fa-solid fa-moon",          color: "text-slate-400",   glow: "" },
        offshift: { icon: "fa-solid fa-circle-minus", color: "text-muted-foreground", glow: "" },
      };
      const sic = statusIconConfig[m.status] ?? statusIconConfig.offshift;

      const EMPLOYMENT_ICON: Record<string, string> = {
        "Permanent":  "fa-solid fa-star",
        "Freelancer": "fa-solid fa-laptop-code",
        "Part-Time":  "fa-solid fa-clock",
        "Contractor": "fa-solid fa-briefcase",
        "Intern":     "fa-solid fa-user-graduate",
      };

      return (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px] animate-in fade-in"
            onClick={closeMemberDetail}
          />

          {/* Slide-in panel */}
          <div className="fixed right-0 top-0 h-full z-50 w-full max-w-[400px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

            {/* ── HERO HEADER ── */}
            <div className={cn(
              "relative shrink-0 px-5 pt-5 pb-4 border-b border-border/60 overflow-hidden",
              "bg-gradient-to-br from-card via-card to-muted/40"
            )}>
              {/* Decorative blobs */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/8 blur-2xl pointer-events-none" />
              <div className={cn("absolute -bottom-6 -left-6 w-24 h-24 rounded-full blur-2xl pointer-events-none",
                m.status === "active" ? "bg-emerald-500/10" : m.status === "upcoming" ? "bg-amber-500/10" : "bg-muted/20"
              )} />

              {/* Close btn */}
              <button
                onClick={closeMemberDetail}
                className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all cursor-pointer z-10"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>

              {/* Avatar + name row */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl font-black flex items-center justify-center text-2xl border-2 select-none",
                    rc.avatar
                  )}>
                    {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div className={cn(
                    "absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-card border border-border/60 flex items-center justify-center",
                  )}>
                    <i className={cn("text-[11px]", sic.icon, sic.color, sic.glow,
                      m.status === "active" ? "animate-pulse" : ""
                    )} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-base text-foreground truncate leading-tight">{m.name}</h3>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                    {m.username ? "@" + m.username : m.email}
                  </p>
                  <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold", rc.badge)}>
                      {m.role === "OPS" ? "OPS (SubAdmin)" : (m.role || "Employee")}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border", sc.text, sc.bg, sc.border)}>
                      <i className={cn("text-[9px]", sic.icon, sic.color, m.status === "active" ? "animate-pulse" : "")} />
                      {sc.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Communication Actions Bar */}
              <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-border/40">
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold transition-colors border border-primary/20"
                  >
                    <i className="fa-solid fa-envelope text-[10px]" /> Email
                  </a>
                )}
                {m.phone && (
                  <a
                    href={`tel:${m.phone}`}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-muted/60 hover:bg-accent text-foreground text-[11px] font-semibold transition-colors border border-border/50"
                  >
                    <i className="fa-solid fa-phone text-[10px]" /> Call
                  </a>
                )}
                <Link
                  href={`/dashboard/chat?user=${m._id}`}
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-muted/60 hover:bg-accent text-foreground text-[11px] font-semibold transition-colors border border-border/50"
                >
                  <i className="fa-solid fa-comment-dots text-[10px]" /> Chat
                </Link>
                <Link
                  href={`/dashboard/team`}
                  className="inline-flex items-center justify-center p-1.5 rounded-lg bg-muted/60 hover:bg-accent text-muted-foreground hover:text-foreground text-[11px] transition-colors border border-border/50"
                  title="View in Team Directory"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                </Link>
              </div>

              {/* Identity chips row */}
              <div className="flex items-center flex-wrap gap-1.5 mt-3">
                {[
                  { icon: "fa-solid fa-building", label: m.department || "General" },
                  { icon: "fa-solid fa-user-tie", label: `Reports: ${m.managerName}` },
                  { icon: EMPLOYMENT_ICON[m.empType] || "fa-solid fa-user", label: m.empType || "Permanent" },
                  { icon: m.isNight ? "fa-solid fa-moon" : "fa-solid fa-sun", label: m.shiftName, color: m.isNight ? "text-indigo-400" : "text-amber-400" },
                ].map((chip) => (
                  <span key={chip.label} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-muted-foreground font-semibold">
                    <i className={cn("text-[9px]", chip.icon, chip.color)} />{chip.label}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-muted/60 border border-border/50 text-muted-foreground font-mono font-semibold">
                  <i className="fa-solid fa-clock text-[9px]" />{m.shiftTiming}
                </span>
              </div>
            </div>

            {/* ── SCROLLABLE BODY ── */}
            <div className="flex-1 overflow-y-auto">

              {/* ── 4-stat quick tiles ── */}
              <div className="grid grid-cols-2 gap-2.5 p-4">
                {[
                  {
                    icon: "fa-solid fa-fingerprint",
                    label: "Clock In",
                    value: m.clockInTime ? fmtTime(m.clockInTime) : "—",
                    color: "text-emerald-600 dark:text-emerald-400",
                    bg: "bg-emerald-500/8 border-emerald-500/20",
                  },
                  {
                    icon: "fa-solid fa-stopwatch",
                    label: "Clock Out",
                    value: m.clockOutTime
                      ? fmtTime(m.clockOutTime)
                      : m.isClockedIn
                      ? "Active"
                      : "—",
                    isActive: m.isClockedIn && !m.clockOutTime,
                    color: m.isClockedIn && !m.clockOutTime ? "text-emerald-500" : "text-rose-500",
                    bg: m.isClockedIn && !m.clockOutTime ? "bg-emerald-500/8 border-emerald-500/20" : "bg-rose-500/8 border-rose-500/20",
                  },
                  {
                    icon: "fa-solid fa-hourglass-half",
                    label: "Today Hours",
                    value: todayTotalH > 0 ? fmtHrs(todayTotalH) : "—",
                    color: "text-primary",
                    bg: "bg-primary/8 border-primary/20",
                  },
                  {
                    icon: "fa-solid fa-fire",
                    label: "Overtime",
                    value: todayOtH > 0 ? `+${fmtHrs(todayOtH)}` : "—",
                    color: "text-amber-500",
                    bg: "bg-amber-500/8 border-amber-500/20",
                  },
                ].map((tile) => (
                  <div key={tile.label} className={cn("p-3 rounded-xl border space-y-1.5", tile.bg)}>
                    <div className="flex items-center gap-1.5">
                      <i className={cn("text-[11px]", tile.icon, tile.color)} />
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{tile.label}</span>
                      {tile.isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    </div>
                    <p className={cn("text-lg font-extrabold font-mono leading-none", tile.color)}>{tile.value}</p>
                  </div>
                ))}
              </div>

              {/* ── Shift Progress ── */}
              {(m.status === "active" || m.status === "upcoming" || m.status === "ended") && (
                <div className="mx-4 mb-4 p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-gauge-high text-primary text-[11px]" /> Shift Progress
                    </span>
                    <div className="flex items-center gap-2">
                      {shiftRemainingText && (
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1",
                          m.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}>
                          <i className={cn("text-[9px]", m.status === "active" ? "fa-solid fa-hourglass-half" : "fa-solid fa-clock")} />
                          {shiftRemainingText}
                        </span>
                      )}
                      {liveElapsed && (
                        <span className="font-mono text-[10px] text-muted-foreground">{liveElapsed} elapsed</span>
                      )}
                      <span className={cn(
                        "font-mono font-black text-sm",
                        m.progress >= 100 ? "text-emerald-500" : m.status === "active" ? "text-primary" : "text-muted-foreground"
                      )}>{m.progress}%</span>
                    </div>
                  </div>

                  <div className="relative h-2.5 bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        m.progress >= 100
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : m.status === "active"
                          ? "bg-gradient-to-r from-primary via-primary to-emerald-400"
                          : "bg-gradient-to-r from-amber-400 to-amber-500"
                      )}
                      style={{ width: Math.min(m.progress, 100) + "%" }}
                    />
                    {m.status === "active" && m.progress < 100 && (
                      <div
                        className="absolute top-0 bottom-0 w-3 bg-white/30 blur-[2px] rounded-full transition-all duration-700"
                        style={{ left: Math.min(m.progress, 98) + "%" }}
                      />
                    )}
                  </div>

                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="font-mono">{sStart}</span>
                    <span className="text-muted-foreground/60">Target: <strong className="text-foreground">{fmtHrs(shiftTotalH)}</strong></span>
                    <span className="font-mono">{sEnd}</span>
                  </div>
                </div>
              )}

              {/* ── Today's Attendance Log ── */}
              <div className="mx-4 mb-4 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-day text-indigo-500" /> Today's Attendance Log
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground/60 normal-case">
                    {formatISTDate(new Date(), { weekday: "long", month: "short", day: "numeric" })}
                  </span>
                </h4>

                {memberHistoryLoading ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
                    ))}
                  </div>
                ) : memberHistory.length === 0 ? (
                  <div className="py-7 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 space-y-2">
                    <i className="fa-solid fa-calendar-xmark text-2xl text-muted-foreground/25" />
                    <p className="text-xs text-muted-foreground">No clock-in recorded yet today.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {memberHistory.map((h: any) => {
                      const regH = h.regularHours ?? 0;
                      const otH = h.overtimeHours ?? 0;
                      const isActiveSession = h.clockIn && !h.clockOut;
                      const sessionMs = isActiveSession
                        ? Date.now() - new Date(h.clockIn).getTime()
                        : h.clockOut
                        ? new Date(h.clockOut).getTime() - new Date(h.clockIn).getTime()
                        : 0;
                      const sessionH = sessionMs / 3600000;

                      return (
                        <div key={h._id} className={cn(
                          "p-3.5 rounded-xl border space-y-3 transition-all",
                          isActiveSession
                            ? "border-emerald-500/25 bg-emerald-500/[0.04]"
                            : "border-border/60 bg-muted/10"
                        )}>
                          <div className="flex items-center gap-2">
                            <div className="text-center shrink-0">
                              <p className="text-[9px] text-muted-foreground uppercase font-semibold">In</p>
                              <p className="font-mono font-black text-emerald-500 text-sm leading-none">{fmtTime(h.clockIn)}</p>
                            </div>

                            <div className="flex-1 relative flex items-center">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 z-10" />
                              <div className="flex-1 h-0.5 bg-gradient-to-r from-emerald-500 to-rose-400 relative">
                                {isActiveSession && (
                                  <span className="absolute right-0 -top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-card animate-ping" />
                                )}
                              </div>
                              <div className={cn("w-2 h-2 rounded-full shrink-0 z-10", isActiveSession ? "bg-emerald-500 animate-pulse" : "bg-rose-400")} />
                            </div>

                            <div className="text-center shrink-0">
                              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Out</p>
                              {h.clockOut
                                ? <p className="font-mono font-black text-rose-400 text-sm leading-none">{fmtTime(h.clockOut)}</p>
                                : <p className="text-[10px] font-bold text-emerald-500 leading-none flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active
                                  </p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/15 text-[11px]">
                              <i className="fa-solid fa-clock text-primary text-[9px]" />
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-mono font-bold text-primary">{fmtHrs(sessionH)}</span>
                            </div>
                            {regH > 0 && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-[11px]">
                                <i className="fa-solid fa-check text-emerald-500 text-[9px]" />
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmtHrs(regH)} reg</span>
                              </div>
                            )}
                            {otH > 0 && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/8 border border-amber-500/15 text-[11px]">
                                <i className="fa-solid fa-fire text-amber-500 text-[9px]" />
                                <span className="font-mono font-bold text-amber-500">+{fmtHrs(otH)} OT</span>
                              </div>
                            )}
                            <span className={cn(
                              "ml-auto inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              h.status === "Present"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            )}>
                              <i className={cn("text-[8px]", h.status === "Present" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-half-stroke")} />
                              {h.status ?? "Present"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Today's Tasks Log ── */}
              <div className="mx-4 mb-4 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-list-check text-indigo-500" /> Today's Task List
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground/60">
                    {memberTasks.length} active
                  </span>
                </h4>

                {memberTasksLoading ? (
                  <div className="space-y-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
                    ))}
                  </div>
                ) : memberTasks.length === 0 ? (
                  <div className="py-7 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 space-y-2">
                    <i className="fa-solid fa-clipboard-check text-2xl text-muted-foreground/25" />
                    <p className="text-xs text-muted-foreground">No tasks assigned for today.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                    {memberTasks.map((t: any) => {
                      const priorityColor =
                        t.priority === "High"
                          ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          : t.priority === "Medium"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : "bg-slate-500/10 text-slate-600 border-slate-500/20";

                      const statusColor =
                        t.status === "Done"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : t.status === "Review"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : t.status === "In Progress"
                          ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                          : "bg-slate-500/10 text-slate-600 border-slate-500/20";

                      return (
                        <div
                          key={t._id}
                          className="p-3 rounded-xl border border-border/60 bg-muted/10 hover:bg-accent/20 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-foreground text-xs leading-snug line-clamp-2">
                              {t.title}
                            </span>
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0", priorityColor)}>
                              {t.priority}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                            <span className={cn("font-bold px-2 py-0.5 rounded-full border text-[9px]", statusColor)}>
                              {t.status}
                            </span>
                            {t.dueDate && (
                              <span className="flex items-center gap-1">
                                <i className="fa-solid fa-calendar-minus text-[9px]" />
                                {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Admin/OPS Export Action Bar ── */}
              {(isAdmin || isOPS) && (
                <div className="mx-4 mb-3">
                  <button
                    onClick={() => exportMemberData(m)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/8 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all cursor-pointer group"
                  >
                    <i className="fa-solid fa-file-arrow-down text-sm group-hover:scale-110 transition-transform" />
                    Export 30-Day Attendance Report
                    <span className="ml-auto text-[10px] font-normal opacity-60">CSV</span>
                  </button>
                </div>
              )}

              {/* ── Footer strip ── */}
              <div className="mx-4 mb-4 flex items-center justify-between text-[10px] text-muted-foreground py-2.5 px-3 rounded-lg bg-muted/20 border border-border/40">
                <span className="flex items-center gap-1.5">
                  <i className="fa-solid fa-envelope text-[9px]" />
                  {m.email ?? "—"}
                </span>
                {m.lastActiveAt && (
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-signal text-[9px] text-emerald-500" />
                    {formatISTTime(m.lastActiveAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </>
      );
    })()}
  </>
  );
}

