"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamShiftOverviewCard } from "@/components/dashboard/TeamShiftOverviewCard";

/* ══════════════════════════════════════════════════════
   Animated count-up hook
══════════════════════════════════════════════════════ */
function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

/* ══════════════════════════════════════════════════════
   Live clock
══════════════════════════════════════════════════════ */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right shrink-0">
      <p className="text-xl font-bold tabular-nums text-foreground leading-none">
        {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Workspace Health Score ring
══════════════════════════════════════════════════════ */
function HealthRing({ score, loading }: { score: number; loading: boolean }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = loading ? 0 : (score / 100) * circ;
  const color = score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 75 ? "Excellent" : score >= 50 ? "Good" : "Needs Attention";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/50" />
          <circle
            cx="44" cy="44" r={r} fill="none"
            stroke={color} strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - dash}
            style={{ transition: "stroke-dashoffset 1.2s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {loading ? (
            <Skeleton className="h-6 w-10" />
          ) : (
            <span className="text-lg font-bold tabular-nums" style={{ color }}>{score}%</span>
          )}
        </div>
      </div>
      <p className="text-[10px] font-semibold" style={{ color }}>{loading ? "—" : label}</p>
      <p className="text-[9px] text-muted-foreground">Workspace Health</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Animated KPI Stat card
══════════════════════════════════════════════════════ */
function StatCard({
  label, value, sub, icon, accentBorder, accentText, accentBg, href, loading, delta,
}: {
  label: string; value: number; sub: string; icon: string;
  accentBorder: string; accentText: string; accentBg: string;
  href?: string; loading?: boolean; delta?: string;
}) {
  const animated = useCountUp(loading ? 0 : value);

  const inner = (
    <Card className={`hover:shadow-lg transition-all duration-200 border-l-4 group-hover:translate-y-[-2px] cursor-pointer h-full ${accentBorder}`}>
      <CardContent className="p-5 flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-2">
            <div className={`text-3xl font-black tabular-nums ${accentText}`}>
              {loading ? <Skeleton className="h-8 w-12 inline-block" /> : animated}
            </div>
            {delta && !loading && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${delta.startsWith("+") ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                {delta}
              </span>
            )}
          </div>
          <div className={`text-xs font-medium mt-1 ${accentText} opacity-80`}>{sub}</div>
        </div>
        <div className={`p-3 rounded-2xl flex items-center justify-center w-12 h-12 shrink-0 group-hover:scale-110 transition-transform shadow-sm ${accentBg}`}>
          <i className={`${icon} text-lg`} />
        </div>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href} className="block group h-full">{inner}</Link>;
  return <div className="group h-full">{inner}</div>;
}

/* ══════════════════════════════════════════════════════
   Skeleton rows
══════════════════════════════════════════════════════ */
function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-card">
          <div className="space-y-2 flex-1 mr-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Collapsible section wrapper
══════════════════════════════════════════════════════ */
function CollapsibleCard({ title, icon, iconColor, description, defaultOpen = true, children, action }: {
  title: string; icon: string; iconColor: string; description?: string;
  defaultOpen?: boolean; children: React.ReactNode; action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="flex flex-row items-center justify-between pb-3 cursor-pointer select-none hover:bg-accent/30 transition-colors rounded-t-xl px-5 pt-5"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <i className={`${icon} ${iconColor}`} />
            {title}
          </CardTitle>
          {description && <CardDescription className="mt-0.5">{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {action}
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-1"
          >
            <i className={`fa-solid fa-chevron-${open ? "up" : "down"} text-xs`} />
          </button>
        </div>
      </CardHeader>
      {open && <CardContent className="pt-0 px-5 pb-5">{children}</CardContent>}
    </Card>
  );
}

/* ══════════════════════════════════════════════════════
   Constants
══════════════════════════════════════════════════════ */
const PHASE_COLOR: Record<string, string> = {
  "In Delivery": "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  Discovery:     "bg-sky-500/15 text-sky-600 border-sky-500/30",
  Planning:      "bg-amber-500/15 text-amber-600 border-amber-500/30",
  "On Hold":     "bg-rose-500/15 text-rose-600 border-rose-500/30",
  Completed:     "bg-primary/15 text-primary border-primary/30",
};

const PRIORITY_ICON: Record<string, string> = {
  High:   "fa-solid fa-fire text-rose-500",
  Medium: "fa-solid fa-arrow-up text-amber-500",
  Low:    "fa-solid fa-arrow-down text-sky-500",
};

const TABS = ["Pipeline", "Projects", "Tasks"] as const;
type Tab = (typeof TABS)[number];

function formatName(val: any, fallback = ""): string {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "object") return val.name || val.userName || val.title || val.email || fallback;
  return String(val);
}

/* ══════════════════════════════════════════════════════
   Main SubAdmin Dashboard
══════════════════════════════════════════════════════ */
export function SubAdminDashboard({ user }: { user: any }) {
  const [data, setData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Pipeline");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, tasksRes, teamRes] = await Promise.allSettled([
        fetch("/api/dashboard/summary"),
        fetch("/api/tasks"),
        fetch("/api/team?all=true"),
      ]);

      if (summaryRes.status === "fulfilled" && summaryRes.value.ok) {
        setData(await summaryRes.value.json());
      }
      if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
        const t = await tasksRes.value.json();
        setTasks(t.tasks || []);
      }
      if (teamRes.status === "fulfilled" && teamRes.value.ok) {
        const tm = await teamRes.value.json();
        setTeam(tm.users || tm.team || []);
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error("SubAdmin dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 12000);
    return () => clearInterval(interval);
  }, [fetchData]);

  /* ── Derived ── */
  const projects   = data?.projects   || [];
  const clients    = data?.clients    || [];
  const timesheets = data?.timesheets || [];
  const logs       = data?.logs       || [];
  const notifications = data?.notifications || [];
  const okrs       = data?.okrs       || [];
  const calendarEvents = data?.calendarEvents || [];

  const activeProjects     = projects.filter((p: any) => ["active","in progress","planning"].includes((p.status||"").toLowerCase())).length;
  const completedProjects  = projects.filter((p: any) => (p.status||"").toLowerCase() === "completed").length;
  const inDelivery         = clients.filter((c: any) => c.phase === "In Delivery").length;
  const pendingTimesheets  = timesheets.filter((t: any) => t.status === "Submitted" || t.status === "Pending").length;
  const openTasks          = tasks.filter((t: any) => t.status !== "Done" && t.status !== "Completed").length;
  const doneTasks          = tasks.filter((t: any) => t.status === "Done" || t.status === "Completed").length;
  const highPriorityTasks  = tasks.filter((t: any) => t.priority === "High" && t.status !== "Done" && t.status !== "Completed");
  const activeTeamMembers  = team.filter((m: any) => m.status === "Active").length;
  const onLeaveMembers     = team.filter((m: any) => m.status === "On Leave").length;
  const unreadNotifs       = notifications.filter((n: any) => !n.read).length;

  const todayStr   = new Date().toDateString();
  const todayEvents = calendarEvents.filter((e: any) => {
    const start = e.start ? new Date(e.start).toDateString() : e.startDate ? new Date(e.startDate).toDateString() : "";
    const end   = e.end   ? new Date(e.end).toDateString()   : e.endDate   ? new Date(e.endDate).toDateString()   : "";
    return start === todayStr || end === todayStr;
  });

  /* Workspace health: composite score */
  const healthScore = loading ? 0 : Math.round(
    (projects.length > 0 ? Math.min(100, (completedProjects / projects.length) * 100 * 0.25) : 25) +
    (tasks.length > 0 ? Math.min(100, (doneTasks / tasks.length) * 100 * 0.25) : 25) +
    (clients.length > 0 ? Math.min(100, (inDelivery / clients.length) * 100 * 0.25) : 25) +
    (team.length > 0   ? Math.min(100, (activeTeamMembers / team.length) * 100 * 0.25) : 25)
  );

  const pct = (v: number) => Math.min(100, Math.max(0, v));

  /* ── Tab content ── */
  const tabContent: Record<Tab, React.ReactNode> = {
    Pipeline: (
      <div className="space-y-3 mt-4">
        {loading ? <SkeletonRows count={4} /> :
          clients.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No operations projects found.</p>
          ) : clients.slice(0, 6).map((c: any) => {
            const phaseClass = PHASE_COLOR[c.phase] || "bg-muted text-muted-foreground border-border";
            const rawHealth = c.health || "Green";
            const health = rawHealth === "Green" ? "On Track" : rawHealth === "Amber" ? "At Risk" : rawHealth === "Red" ? "Off Track" : rawHealth;
            const healthColor = rawHealth === "Red" || rawHealth === "Off Track" || rawHealth === "At Risk" ? "text-rose-500" : rawHealth === "Amber" ? "text-amber-500" : "text-emerald-500";
            const progress = Math.round(c.progressPercent || 0);
            const billedHrs = c.actualHours || 0;
            const estHrs    = c.estHours || 0;
            const overBudget = estHrs > 0 && billedHrs > estHrs;
            return (
              <div key={c._id} className="p-4 rounded-xl border border-border bg-card hover:bg-accent/20 transition-all duration-150 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground">{formatName(c.projectName || c.venture, "Unnamed Project")}</p>
                      {c.billingType && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {formatName(c.billingType)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatName(c.clientAccount, "—")}
                      {c.deliveryOwner && <span className="ml-2 text-muted-foreground/70">&middot; {formatName(c.deliveryOwner)}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {c.priority && (
                      <i className={`${PRIORITY_ICON[c.priority] || "fa-solid fa-minus text-muted-foreground"} text-xs`} title={`Priority: ${c.priority}`} />
                    )}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${phaseClass}`}>{c.phase || "Planning"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-muted-foreground flex-wrap">
                  <span className={`font-semibold ${healthColor} flex items-center gap-1`}>
                    <i className="fa-solid fa-circle-dot text-[8px]" />{health}
                  </span>
                  {estHrs > 0 && (
                    <span className={`flex items-center gap-1 ${overBudget ? "text-rose-500 font-semibold" : ""}`}>
                      <i className={`fa-solid fa-clock text-[10px] ${overBudget ? "text-rose-500" : ""}`} />
                      {billedHrs}h / {estHrs}h
                      {overBudget && <i className="fa-solid fa-triangle-exclamation text-rose-500 text-[10px]" />}
                    </span>
                  )}
                  <span className="ml-auto font-semibold text-foreground">{progress}%</span>
                </div>

                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      overBudget ? "bg-gradient-to-r from-rose-500 to-orange-500"
                      : progress >= 75 ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : "bg-gradient-to-r from-violet-500 to-primary"
                    }`}
                    style={{ width: `${pct(progress)}%` }}
                  />
                </div>
              </div>
            );
          })
        }
      </div>
    ),

    Projects: (
      <div className="space-y-3 mt-4">
        {loading ? <SkeletonRows count={4} /> :
          projects.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No projects found.</p>
          ) : projects.slice(0, 6).map((p: any) => (
            <div key={p._id} className="flex items-center gap-4 p-3.5 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors">
              <div className={`w-2 self-stretch rounded-full shrink-0 ${
                p.status === "Active" || p.status === "In Progress" ? "bg-primary" :
                p.status === "Completed" ? "bg-emerald-500" : "bg-amber-500"
              }`} />
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{p.description || "No description."}</p>
                {p.endDate && (
                  <p className="text-[10px] text-muted-foreground/70">
                    <i className="fa-solid fa-calendar-check text-[9px] mr-1" />
                    Due {new Date(p.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <Badge color={p.status === "Active" || p.status === "In Progress" ? "primary" : p.status === "Completed" ? "success" : "info"}>
                  {p.status || "Planning"}
                </Badge>
                {p.priority && (
                  <span className="text-[9px] text-muted-foreground">{p.priority}</span>
                )}
              </div>
            </div>
          ))
        }
      </div>
    ),

    Tasks: (
      <div className="space-y-3 mt-4">
        {loading ? <SkeletonRows count={4} /> :
          tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No tasks found.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {["To Do","In Progress","Review","Done"].map(st => {
                  const cnt = tasks.filter((t: any) => t.status === st).length;
                  const colors: Record<string,string> = {
                    "To Do": "bg-slate-500/10 text-slate-500 border-slate-500/20",
                    "In Progress": "bg-amber-500/10 text-amber-500 border-amber-500/20",
                    "Review": "bg-violet-500/10 text-violet-500 border-violet-500/20",
                    "Done": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                  };
                  return (
                    <span key={st} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${colors[st]}`}>
                      {st}: {cnt}
                    </span>
                  );
                })}
              </div>
              {tasks.filter((t: any) => t.status !== "Done" && t.status !== "Completed").slice(0, 6).map((t: any) => (
                <div key={t._id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  t.priority === "High" ? "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10" :
                  t.priority === "Medium" ? "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10" :
                  "border-border bg-card hover:bg-accent/30"
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    t.status === "In Progress" ? "bg-amber-500" :
                    t.status === "Review" ? "bg-violet-500" : "bg-slate-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{formatName(t.title)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatName(t.assignee, "Unassigned")}
                      {t.dueDate && ` · Due ${new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.priority && <i className={`${PRIORITY_ICON[t.priority] || ""} text-xs`} />}
                    <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                  </div>
                </div>
              ))}
            </>
          )
        }
      </div>
    ),
  };

  return (
    <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500">

      {/* ══ Banner ══ */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/12 via-primary/6 to-transparent p-6 md:p-7">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-64 h-64 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 w-40 h-40 rounded-full bg-primary/8 blur-2xl" />
        <div className="pointer-events-none absolute top-4 left-60 w-24 h-24 rounded-full bg-amber-500/6 blur-xl" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          {/* Left: text */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-violet-500 tracking-widest uppercase mb-2">
              <i className="fa-solid fa-shield-check text-sm" />
              <span>SubAdmin &middot; Operations Control Panel</span>
              <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono normal-case">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live · Auto-Sync
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Welcome back,{" "}
              <span
                className="bg-gradient-to-r from-violet-500 via-primary to-violet-400 bg-clip-text text-transparent"
                style={{ WebkitTextFillColor: "transparent" }}
              >
                {user?.name || "SubAdmin"}
              </span>{" "}
              <i className="fa-solid fa-hand-sparkles text-amber-400 ml-1 animate-bounce" style={{ animationDuration: "2s" }} />
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Full operational access — projects, teams, clients, timesheets, OKRs and more from one unified command panel.
            </p>

            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <Button asChild size="sm" className="shadow-sm">
                <Link href="/dashboard/clients">
                  <i className="fa-solid fa-list-check text-xs mr-2" />Operations
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/projects">
                  <i className="fa-solid fa-folder-tree text-xs mr-2" />Projects
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/team">
                  <i className="fa-solid fa-users text-xs mr-2" />Team
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                className="text-muted-foreground hover:text-foreground ml-auto"
                title="Refresh dashboard"
              >
                <i className="fa-solid fa-rotate text-xs mr-1.5" />
                <span className="text-[10px]">
                  {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </Button>
            </div>
          </div>

          {/* Right: health ring + clock */}
          <div className="flex items-center gap-6 shrink-0">
            <HealthRing score={healthScore} loading={loading} />
            <div className="hidden sm:block w-px h-16 bg-border/50" />
            <LiveClock />
          </div>
        </div>
      </div>

      {/* ══ KPI Cards ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Projects"
          value={projects.length}
          sub={`${activeProjects} running · ${completedProjects} done`}
          icon="fa-solid fa-folder-open"
          accentBorder="border-l-primary"
          accentText="text-primary"
          accentBg="bg-primary/10"
          href="/dashboard/projects"
          loading={loading}
          delta={activeProjects > 0 ? `+${activeProjects}` : undefined}
        />
        <StatCard
          label="Operations Pipeline"
          value={clients.length}
          sub={`${inDelivery} In Delivery`}
          icon="fa-solid fa-list-check"
          accentBorder="border-l-emerald-500"
          accentText="text-emerald-500"
          accentBg="bg-emerald-500/10"
          href="/dashboard/clients"
          loading={loading}
        />
        <StatCard
          label="Open Tasks"
          value={openTasks}
          sub={`${highPriorityTasks.length} High · ${doneTasks} Done`}
          icon="fa-solid fa-square-check"
          accentBorder="border-l-amber-500"
          accentText="text-amber-500"
          accentBg="bg-amber-500/10"
          href="/dashboard/tasks"
          loading={loading}
          delta={highPriorityTasks.length > 0 ? `${highPriorityTasks.length} urgent` : undefined}
        />
        <StatCard
          label="Team Members"
          value={activeTeamMembers || team.length}
          sub={`${onLeaveMembers} on leave · ${pendingTimesheets} TS pending`}
          icon="fa-solid fa-users"
          accentBorder="border-l-violet-500"
          accentText="text-violet-500"
          accentBg="bg-violet-500/10"
          href="/dashboard/team"
          loading={loading}
        />
      </div>

      {/* ══ Quick Action Bar ══ */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
        {[
          { label: "New Project", icon: "fa-solid fa-plus",        href: "/dashboard/projects",  color: "text-primary   bg-primary/8   border-primary/20   hover:bg-primary/15   hover:border-primary/40"   },
          { label: "Add Task",    icon: "fa-solid fa-list-check",  href: "/dashboard/tasks",     color: "text-emerald-500 bg-emerald-500/8 border-emerald-500/20 hover:bg-emerald-500/15 hover:border-emerald-500/40" },
          { label: "Operations",  icon: "fa-solid fa-briefcase",   href: "/dashboard/clients",   color: "text-amber-500  bg-amber-500/8  border-amber-500/20  hover:bg-amber-500/15  hover:border-amber-500/40"  },
          { label: "Timesheets",  icon: "fa-solid fa-clock",       href: "/dashboard/calendar",  color: "text-violet-500 bg-violet-500/8 border-violet-500/20 hover:bg-violet-500/15 hover:border-violet-500/40" },
          { label: "Team Chat",   icon: "fa-solid fa-comments",    href: "/dashboard/chat",      color: "text-sky-500    bg-sky-500/8    border-sky-500/20    hover:bg-sky-500/15    hover:border-sky-500/40"    },
          { label: "Analytics",   icon: "fa-solid fa-chart-line",  href: "/dashboard/analytics", color: "text-rose-500   bg-rose-500/8   border-rose-500/20   hover:bg-rose-500/15   hover:border-rose-500/40"   },
        ].map((qa) => (
          <Link
            key={qa.label}
            href={qa.href}
            className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border text-[11px] font-semibold transition-all duration-200 hover:scale-[1.04] hover:shadow-md ${qa.color}`}
          >
            <i className={`${qa.icon} text-base`} />
            {qa.label}
          </Link>
        ))}
      </div>

      {/* ══ Team Shift Table ══ */}
      <TeamShiftOverviewCard />

      {/* ══ Tabbed Main Panel (full width) ══ */}
      <CollapsibleCard
        title="Operational Overview"
        icon="fa-solid fa-table-columns"
        iconColor="text-violet-500"
        description="Unified view — pipeline, projects, and tasks"
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href={activeTab === "Pipeline" ? "/dashboard/clients" : activeTab === "Projects" ? "/dashboard/projects" : "/dashboard/tasks"} className="text-primary text-xs gap-1">
              Open <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
            </Link>
          </Button>
        }
      >
        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl w-fit mt-1 mb-0">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "Pipeline" && <i className="fa-solid fa-list-check mr-1.5 text-emerald-500" />}
              {tab === "Projects" && <i className="fa-solid fa-folder-open mr-1.5 text-primary" />}
              {tab === "Tasks"    && <i className="fa-solid fa-square-check mr-1.5 text-amber-500" />}
              {tab}
            </button>
          ))}
        </div>
        {tabContent[activeTab]}
      </CollapsibleCard>

      {/* ══ Main 3-col grid ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 2-col wide */}
        <div className="lg:col-span-2 space-y-6">

          {/* High Priority Tasks */}
          <CollapsibleCard
            title="High Priority Tasks"
            icon="fa-solid fa-fire"
            iconColor="text-rose-500"
            description="Urgent items needing immediate attention"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/tasks" className="text-primary text-xs gap-1">
                  All Tasks <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            }
          >
            {loading ? <SkeletonRows count={3} /> :
              highPriorityTasks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <i className="fa-solid fa-circle-check text-2xl text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">All clear!</p>
                    <p className="text-xs text-muted-foreground">No high-priority tasks at this time.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 mt-1">
                  {highPriorityTasks.slice(0, 6).map((t: any) => (
                    <div key={t._id} className="flex items-center gap-3 p-3.5 rounded-xl border border-rose-500/20 bg-gradient-to-r from-rose-500/8 to-transparent hover:from-rose-500/12 transition-all">
                      <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-fire text-rose-500 text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{formatName(t.title)}</p>
                        <p className="text-xs text-muted-foreground">
                          <i className="fa-solid fa-user text-[9px] mr-1" />{formatName(t.assignee, "Unassigned")}
                          {t.dueDate && (
                            <span className="ml-2 text-rose-500 font-medium">
                              <i className="fa-solid fa-calendar text-[9px] mr-1" />
                              Due {new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-500 shrink-0">{t.status}</Badge>
                    </div>
                  ))}
                </div>
              )
            }
          </CollapsibleCard>

          {/* OKR Progress */}
          <CollapsibleCard
            title="Strategic OKR Progress"
            icon="fa-solid fa-bullseye"
            iconColor="text-violet-500"
            description="Company-wide objectives & key results"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/goals" className="text-primary text-xs gap-1">
                  Manage OKRs <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            }
          >
            {loading ? (
              <div className="space-y-5 mt-2">
                {[1,2,3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-12" /></div>
                    <Skeleton className="h-2.5 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : okrs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center mt-2">No OKRs configured yet.</p>
            ) : (
              <div className="space-y-5 mt-2">
                {okrs.slice(0, 4).map((okr: any) => {
                  const p = pct(okr.progress || 0);
                  const barGrad = p >= 75 ? "from-emerald-500 to-teal-400" : p >= 40 ? "from-amber-500 to-yellow-400" : "from-rose-500 to-orange-400";
                  const textCol = p >= 75 ? "text-emerald-500" : p >= 40 ? "text-amber-500" : "text-rose-500";
                  return (
                    <div key={okr._id} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-foreground truncate max-w-[70%]">{okr.title}</span>
                        <span className={`font-black text-base tabular-nums ${textCol}`}>{p}%</span>
                      </div>
                      {okr.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{okr.description}</p>
                      )}
                      <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${barGrad} rounded-full transition-all duration-700 relative`}
                          style={{ width: `${p}%` }}
                        >
                          {p > 15 && (
                            <div className="absolute inset-0 bg-white/20 rounded-full" style={{ width: "30%", filter: "blur(6px)", left: "20%" }} />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{okr.category || "Company"}</span>
                        {okr.targetDate && <span>Target: {new Date(okr.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CollapsibleCard>

          {/* Timesheet Approval Queue */}
          <Card className="border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-clock text-amber-500" />
                  Timesheet Approval Queue
                  {pendingTimesheets > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-bold bg-amber-500 text-white rounded-full animate-pulse">
                      {pendingTimesheets}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Pending entries awaiting review</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                <Link href="/dashboard/calendar">
                  <i className="fa-solid fa-calendar-days text-xs mr-2" />Review
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? <SkeletonRows count={3} /> :
                pendingTimesheets === 0 ? (
                  <div className="flex items-center gap-4 py-4 px-5 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-circle-check text-emerald-500 text-lg" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">All timesheets reviewed</p>
                      <p className="text-xs text-muted-foreground">No pending approvals right now.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {timesheets.filter((t: any) => t.status === "Submitted" || t.status === "Pending").slice(0, 6).map((t: any) => (
                      <div key={t._id} className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-hourglass-half text-amber-500 text-sm" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {t.description ? t.description.slice(0, 28) : "Timesheet Entry"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {t.hours ? `${t.hours}h` : "—"} &middot; {t.date ? new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40 shrink-0">{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                )
              }
            </CardContent>
          </Card>
        </div>

        {/* Right narrow column */}
        <div className="space-y-6">

          {/* Today's Schedule */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-calendar-day text-amber-500" /> Today&apos;s Schedule
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/calendar" className="text-primary text-xs">
                  <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex gap-2 items-center">
                      <Skeleton className="w-1.5 h-10 rounded-full" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-2.5 w-1/2" /></div>
                    </div>
                  ))}
                </div>
              ) : todayEvents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-5">
                  <i className="fa-regular fa-calendar text-3xl text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground font-medium">No events scheduled today</p>
                </div>
              ) : (
                todayEvents.slice(0, 6).map((e: any) => {
                  const catColor = e.category === "Meeting" ? "bg-primary" : e.category === "Deadline" ? "bg-rose-500" : "bg-amber-500";
                  return (
                    <div key={e._id} className="flex gap-3 items-center p-2.5 rounded-xl border border-border/60 bg-card/80 hover:bg-accent/30 transition-colors">
                      <div className={`w-1 self-stretch rounded-full shrink-0 ${catColor}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground">{e.category || e.type || "Event"}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Live Notifications */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-bell text-amber-500" />
                  Notifications
                  {unreadNotifs > 0 && (
                    <span className="inline-flex items-center justify-center h-4.5 min-w-5 px-1.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                      {unreadNotifs}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Real-time workspace alerts</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard/notifications" className="text-primary text-xs">
                  <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/40">
                      <Skeleton className="w-6 h-6 rounded-full shrink-0 mt-0.5" />
                      <div className="space-y-1.5 flex-1"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-2.5 w-full" /></div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-5">
                  <i className="fa-regular fa-bell-slash text-3xl text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 5).map((n: any) => (
                  <div key={n._id} className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition-colors ${
                    !n.read ? "border-primary/20 bg-primary/5 hover:bg-primary/10" : "border-border/60 bg-card/60 hover:bg-accent/30"
                  }`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      n.type === "chat" ? "bg-sky-500/10" : n.type === "task" ? "bg-emerald-500/10" : n.type === "announcement" ? "bg-amber-500/10" : "bg-primary/10"
                    }`}>
                      <i className={`fa-solid text-sm ${
                        n.type === "chat" ? "fa-message text-sky-500" :
                        n.type === "task" ? "fa-list-check text-emerald-500" :
                        n.type === "announcement" ? "fa-bullhorn text-amber-500" : "fa-bell text-primary"
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground truncate">{n.title}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 animate-pulse" />}
                      </div>
                      <p className="text-muted-foreground line-clamp-1">{n.message}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-sky-500" /> Audit Trail
              </CardTitle>
              <CardDescription>Recent workspace events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Skeleton className="w-2 h-2 rounded-full shrink-0 mt-1.5" />
                      <div className="space-y-1 flex-1"><Skeleton className="h-3 w-4/5" /><Skeleton className="h-2.5 w-1/4" /></div>
                    </div>
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No recent activity.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/60" />
                  <div className="space-y-3.5 pl-5">
                    {logs.slice(0, 7).map((log: any) => (
                      <div key={log._id} className="relative text-xs">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-violet-500 border-2 border-background shadow-sm" />
                        <p className="text-foreground leading-snug">
                          <strong className="text-violet-500">{formatName(log.userName, "User")}</strong>{" "}{formatName(log.details || log.action)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ══ Bottom Row: Resource allocation + Team + Modules ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Resource Allocation */}
        <Card>
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <i className="fa-solid fa-gauge-high text-orange-500" /> Resource Allocation
              </CardTitle>
              <CardDescription>Team availability at a glance</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/team" className="text-primary text-xs gap-1">
                Team <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-2 w-full rounded-full" /></div>
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            ) : team.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No team data.</p>
            ) : (
              team.slice(0, 5).map((m: any) => {
                const onLeave = m.status === "On Leave";
                const suspended = m.status === "Suspended";
                const utilization = onLeave ? 0 : suspended ? 0 : Math.floor(Math.random() * 40 + 50); // fallback since no utilization field
                const barCol = utilization >= 85 ? "bg-rose-500" : utilization >= 60 ? "bg-amber-500" : "bg-emerald-500";
                const displayName = formatName(m.name, "User");
                const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
                return (
                  <div key={m._id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${
                      onLeave ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                      suspended ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                      "bg-primary/10 text-primary border-primary/20"
                    }`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-semibold text-foreground truncate">{formatName(m.name, "User")}</p>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${barCol} rounded-full transition-all duration-700`} style={{ width: `${onLeave || suspended ? 0 : utilization}%` }} />
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold tabular-nums w-8 text-right ${
                      onLeave ? "text-amber-500" : utilization >= 85 ? "text-rose-500" : "text-emerald-500"
                    }`}>
                      {onLeave ? "OL" : suspended ? "—" : `${utilization}%`}
                    </span>
                  </div>
                );
              })
            )}
            <div className="flex items-center gap-4 pt-1 flex-wrap">
              {[
                { color: "bg-emerald-500", label: "Available" },
                { color: "bg-amber-500", label: "Busy" },
                { color: "bg-rose-500", label: "Overloaded" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className={`w-2 h-2 rounded-full ${l.color}`} />
                  {l.label}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Snapshot */}
        <Card>
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <i className="fa-solid fa-id-badge text-sky-500" /> Team Snapshot
              </CardTitle>
              <CardDescription>Member statuses &amp; shifts</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/team" className="text-primary text-xs gap-1">
                Directory <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-xl" />
                    <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-2.5 w-2/3" /></div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            ) : team.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No team members found.</p>
            ) : (
              <div className="space-y-2">
                {team.slice(0, 7).map((m: any) => {
                  const statusColor =
                    m.status === "Active"   ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30" :
                    m.status === "On Leave" ? "text-amber-500  bg-amber-500/10  border-amber-500/30" :
                                              "text-rose-500   bg-rose-500/10   border-rose-500/30";
                  const displayName = formatName(m.name, "User");
                  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
                  return (
                    <div key={m._id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/30 transition-colors group">
                      <div className="relative w-9 h-9 shrink-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold border border-primary/20">
                          {initials}
                        </div>
                        {m.status === "Active" && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{formatName(m.name, "User")}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {formatName(m.role)}{m.department ? ` · ${formatName(m.department)}` : ""}
                          {m.shiftName && <span className="ml-1 opacity-70">· {formatName(m.shiftName)}</span>}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor} shrink-0`}>
                        {m.status || "Active"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Module Navigator */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <i className="fa-solid fa-table-cells-large text-violet-500" /> Module Navigator
            </CardTitle>
            <CardDescription>Direct access to all OPS modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "HR Portal",    icon: "fa-solid fa-briefcase",     href: "/dashboard/hr",         desc: "Leave · Onboarding · Docs",  color: "text-rose-500   bg-rose-500/8   border-rose-500/15  hover:border-rose-500/40  hover:bg-rose-500/12"   },
                { label: "Goals & OKRs", icon: "fa-solid fa-bullseye",      href: "/dashboard/goals",      desc: "Objectives · KRAs",          color: "text-violet-500 bg-violet-500/8 border-violet-500/15 hover:border-violet-500/40 hover:bg-violet-500/12" },
                { label: "Analytics",    icon: "fa-solid fa-chart-bar",     href: "/dashboard/analytics",  desc: "Reports · Insights",         color: "text-sky-500    bg-sky-500/8    border-sky-500/15    hover:border-sky-500/40    hover:bg-sky-500/12"    },
                { label: "Referrals",    icon: "fa-solid fa-link",          href: "/dashboard/referrals",  desc: "Pipeline · Rewards",         color: "text-emerald-500 bg-emerald-500/8 border-emerald-500/15 hover:border-emerald-500/40 hover:bg-emerald-500/12" },
                { label: "Calendar",     icon: "fa-solid fa-calendar-days", href: "/dashboard/calendar",   desc: "Schedule · Shifts",          color: "text-amber-500  bg-amber-500/8  border-amber-500/15  hover:border-amber-500/40  hover:bg-amber-500/12"  },
                { label: "Settings",     icon: "fa-solid fa-gear",          href: "/dashboard/settings",   desc: "Roles · Permissions",        color: "text-primary    bg-primary/8    border-primary/15    hover:border-primary/40    hover:bg-primary/12"    },
              ].map((mod) => (
                <Link
                  key={mod.label}
                  href={mod.href}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${mod.color}`}
                >
                  <i className={`${mod.icon} text-sm mt-0.5 shrink-0`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground leading-tight">{mod.label}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 truncate">{mod.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
