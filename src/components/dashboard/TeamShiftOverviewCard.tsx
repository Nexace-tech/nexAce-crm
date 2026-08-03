
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
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
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
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
const deptColorMap: Record<string, string> = {};
let deptColorIdx = 0;
function getDeptColor(dept: string) {
  if (!deptColorMap[dept]) { deptColorMap[dept] = DEPT_COLORS[deptColorIdx % DEPT_COLORS.length]; deptColorIdx++; }
  return deptColorMap[dept];
}

const STATUS_CONFIG = {
  active:   { label: "Active",        icon: "fa-solid fa-circle-check", dot: "bg-emerald-500",      text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
  upcoming: { label: "Starting Soon", icon: "fa-solid fa-clock",        dot: "bg-amber-400",        text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/10",   border: "border-amber-500/25" },
  ended:    { label: "Shift Ended",   icon: "fa-solid fa-moon",         dot: "bg-slate-400",        text: "text-slate-500",                         bg: "bg-muted/40",       border: "border-border/40" },
  offshift: { label: "Off Shift",     icon: "fa-solid fa-circle-minus", dot: "bg-muted-foreground", text: "text-muted-foreground",                  bg: "bg-muted/20",       border: "border-border/30" },
};

export function TeamShiftOverviewCard() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    async function fetchTeamShifts() {
      try {
        const res = await fetch("/api/team");
        if (res.ok) { const data = await res.json(); setTeamMembers(data.users || []); }
      } catch (err) { console.error("Failed to fetch team shift times:", err); }
      finally { setLoading(false); }
    }
    fetchTeamShifts();
    const tick = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tick);
  }, []);

  const enriched = useMemo(
    () => teamMembers.map((m) => {
      const shiftTiming = m.shiftTime || "09:00 AM - 05:00 PM";
      const shiftName   = m.shiftName  || "Standard Day Shift";
      return { ...m, shiftTiming, shiftName, status: getShiftStatus(shiftTiming), progress: getShiftProgress(shiftTiming), isNight: shiftName.toLowerCase().includes("night") };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teamMembers, now]
  );

  const filtered = useMemo(
    () => enriched.filter((m) => {
      const q = searchQuery.toLowerCase();
      return (!q || m.name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.department?.toLowerCase().includes(q) || m.role?.toLowerCase().includes(q))
        && (shiftFilter === "All" || m.shiftName.toLowerCase().includes(shiftFilter.toLowerCase()))
        && (statusFilter === "All" || m.status === statusFilter);
    }),
    [enriched, searchQuery, shiftFilter, statusFilter]
  );

  const stats = useMemo(() => ({
    total: enriched.length,
    active: enriched.filter((m) => m.status === "active").length,
    upcoming: enriched.filter((m) => m.status === "upcoming").length,
    ended: enriched.filter((m) => m.status === "ended").length,
    offshift: enriched.filter((m) => m.status === "offshift").length,
  }), [enriched]);

  const formatTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const hasFilters = !!(searchQuery || shiftFilter !== "All" || statusFilter !== "All");
  const resetFilters = () => { setSearchQuery(""); setShiftFilter("All"); setStatusFilter("All"); };

  const STAT_TABS = [
    { key: "All",      label: "Total",         value: stats.total,    icon: "fa-solid fa-users",        iconColor: "text-foreground" },
    { key: "active",   label: "Active Now",    value: stats.active,   icon: "fa-solid fa-circle-check", iconColor: "text-emerald-500" },
    { key: "upcoming", label: "Starting Soon", value: stats.upcoming, icon: "fa-solid fa-clock",        iconColor: "text-amber-500" },
    { key: "ended",    label: "Ended",         value: stats.ended,    icon: "fa-solid fa-moon",         iconColor: "text-slate-400" },
    { key: "offshift", label: "Off Shift",     value: stats.offshift, icon: "fa-solid fa-circle-minus", iconColor: "text-muted-foreground" },
  ];

  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <i className="fa-solid fa-clock text-primary text-sm shrink-0" />
              Team Shift Overview
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                {formatTime(now)}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Live shift assignments, working hours &amp; real-time attendance status
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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

        <div className="grid grid-cols-5 gap-2 mt-4 mb-4">
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
              placeholder="Search name, role, department..."
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
                      <td className="py-3 px-3">
                        <div className="h-4 w-20 bg-muted/60 rounded-full" />
                      </td>
                      <td className="py-3 px-3">
                        <div className="h-3 w-24 bg-muted/60 rounded" />
                      </td>
                      <td className="py-3 px-3">
                        <div className="h-3 w-28 bg-muted/60 rounded" />
                      </td>
                      <td className="py-3 px-3">
                        <div className="h-2 w-24 bg-muted/60 rounded-full" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="h-5 w-20 bg-muted/60 rounded-full ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-muted-foreground">
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
                    return (
                      <tr key={m._id} className="hover:bg-accent/25 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn("w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border", rc.avatar)}>
                              {m.name ? m.name.charAt(0).toUpperCase() : "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate leading-tight">{m.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border font-semibold shrink-0", rc.badge)}>
                                  {m.role || "Employee"}
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
                return (
                  <div
                    key={m._id}
                    className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-sm hover:-translate-y-px space-y-3",
                      m.status === "active"
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
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md border font-semibold", rc.badge)}>{m.role || "Employee"}</span>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-md border font-semibold", dc)}>{m.department || "Management"}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-border/50 bg-muted/40 text-muted-foreground font-semibold flex items-center gap-1">
                        <i className={cn("text-xs shrink-0", m.isNight ? "fa-solid fa-moon text-indigo-400" : "fa-solid fa-sun text-amber-400")} />
                        {m.shiftName}
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
  );
}
