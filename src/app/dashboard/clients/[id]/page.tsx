"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface ContactHistoryItem {
  _id?: string;
  date: string;
  type: "Note" | "Email" | "Call" | "Meeting";
  summary: string;
  authorName: string;
}

interface ClientData {
  _id: string;
  projectId: string;
  clientAccount: string;
  venture: string;
  projectName: string;
  deliveryOwner: string;
  phase: "Onboarding" | "In Delivery" | "Review" | "Closed" | string;
  priority: "High" | "Medium" | "Low" | string;
  startDate?: string;
  targetEndDate?: string;
  health: "Green" | "Amber" | "Red";
  billingType: string;
  estHours: number;
  actualHours: number;
  progressPercent: number;
  notes?: string;
  contactHistory: ContactHistoryItem[];
  createdAt: string;
}

const healthColors: Record<string, string> = {
  Green: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30",
  Amber: "bg-amber-500/10 text-amber-500 border border-amber-500/30",
  Red: "bg-rose-500/10 text-rose-500 border border-rose-500/30",
};

const priorityColors: Record<string, string> = {
  High: "bg-rose-500/10 text-rose-500 border border-rose-500/30",
  Medium: "bg-amber-500/10 text-amber-500 border border-amber-500/30",
  Low: "bg-slate-500/10 text-slate-400 border border-slate-500/30",
};

const phaseColors: Record<string, string> = {
  Onboarding: "bg-blue-500/10 text-blue-500 border border-blue-500/30",
  "In Delivery": "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30",
  Review: "bg-purple-500/10 text-purple-500 border border-purple-500/30",
  Closed: "bg-slate-500/10 text-slate-400 border border-slate-500/30",
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAdmin } = usePermissions();

  const [project, setProject] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Timeline Filter State
  const [timelineFilter, setTimelineFilter] = useState<"All" | "Note" | "Email" | "Call" | "Meeting">("All");

  // New Log Form State
  const [logType, setLogType] = useState<"Note" | "Email" | "Call" | "Meeting">("Note");
  const [logSummary, setLogSummary] = useState("");
  const [logSubmitting, setLogSubmitting] = useState(false);

  // Quick Log Hours State
  const [quickHours, setQuickHours] = useState("");
  const [quickHoursSubmitting, setQuickHoursSubmitting] = useState(false);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<ClientData>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${resolvedParams.id}`);
      if (!res.ok) {
        if (res.status === 404) setError("Project not found.");
        else if (res.status === 403) setError("Access denied to this project.");
        else setError("Failed to load project details.");
        return;
      }
      const data = await res.json();
      setProject(data.client);
    } catch {
      setError("An unexpected error occurred while fetching details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [resolvedParams.id]);

  const handleUpdateHealth = async (newHealth: "Green" | "Amber" | "Red") => {
    if (!project) return;
    try {
      const res = await fetch(`/api/clients/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, health: newHealth }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProject(updated.client);
      }
    } catch (err) {
      console.error("Failed to update health", err);
    }
  };

  const handleQuickLogHours = async (e: React.FormEvent) => {
    e.preventDefault();
    const addedHours = Number(quickHours);
    if (!project || isNaN(addedHours) || addedHours <= 0) return;

    try {
      setQuickHoursSubmitting(true);
      const res = await fetch(`/api/clients/${project._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logHours: addedHours }),
      });

      if (!res.ok) throw new Error("Failed to log hours");

      const updated = await res.json();
      setProject(updated.client);
      setQuickHours("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error logging hours");
    } finally {
      setQuickHoursSubmitting(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !logSummary.trim()) return;

    try {
      setLogSubmitting(true);
      const res = await fetch(`/api/clients/${project._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactLog: {
            type: logType,
            summary: logSummary.trim(),
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to add log entry");

      const updated = await res.json();
      setProject(updated.client);
      setLogSummary("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error saving log entry");
    } finally {
      setLogSubmitting(false);
    }
  };

  const handleOpenEditModal = () => {
    if (!project) return;
    setEditFormData({
      projectId: project.projectId,
      clientAccount: project.clientAccount,
      venture: project.venture,
      projectName: project.projectName,
      deliveryOwner: project.deliveryOwner,
      phase: project.phase,
      priority: project.priority,
      startDate: project.startDate ? project.startDate.split("T")[0] : "",
      targetEndDate: project.targetEndDate ? project.targetEndDate.split("T")[0] : "",
      health: project.health,
      billingType: project.billingType,
      estHours: project.estHours,
      actualHours: project.actualHours,
      progressPercent: project.progressPercent,
      notes: project.notes || "",
    });
    setShowEditModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    try {
      setEditSubmitting(true);
      const res = await fetch(`/api/clients/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) throw new Error("Failed to update project");

      const updated = await res.json();
      setProject(updated.client);
      setShowEditModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!confirm(`Are you sure you want to delete project ${project.projectId}?`)) return;

    try {
      const res = await fetch(`/api/clients/${project._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete project");
      router.push("/dashboard/clients");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting project");
    }
  };

  const handleExportCSV = () => {
    if (!project) return;
    const hoursVariance = (project.estHours || 0) - (project.actualHours || 0);
    const historyText = project.contactHistory && project.contactHistory.length > 0
      ? project.contactHistory.map(h => `[${new Date(h.date).toISOString().split("T")[0]}] (${h.type}) ${h.summary} - Logged by ${h.authorName}`).join(" | ")
      : "No history logs recorded";

    const headers = [
      "Project ID",
      "Client/Account",
      "Venture",
      "Project Name",
      "Delivery Owner",
      "Phase",
      "Priority",
      "Start Date",
      "Target End Date",
      "Health",
      "Billing Type",
      "Est Hours",
      "Actual Hours",
      "Variance",
      "Progress %",
      "Notes",
      "Interaction History",
    ];

    const row = [
      project.projectId,
      `"${(project.clientAccount || "").replace(/"/g, '""')}"`,
      `"${(project.venture || "").replace(/"/g, '""')}"`,
      `"${(project.projectName || "").replace(/"/g, '""')}"`,
      `"${(project.deliveryOwner || "").replace(/"/g, '""')}"`,
      project.phase,
      project.priority,
      project.startDate ? project.startDate.split("T")[0] : "",
      project.targetEndDate ? project.targetEndDate.split("T")[0] : "",
      project.health,
      project.billingType,
      project.estHours,
      project.actualHours,
      hoursVariance,
      `${project.progressPercent}%`,
      `"${(project.notes || "").replace(/"/g, '""')}"`,
      `"${historyText.replace(/"/g, '""')}"`,
    ];

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), row.join(",")].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `project_${project.projectId}_details.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-muted/60 animate-pulse rounded-lg" />
        <div className="h-28 bg-muted/40 animate-pulse rounded-xl border border-border" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 animate-pulse rounded-xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-12 text-center space-y-4 max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-2xl border border-rose-500/20">
          <i className="fa-solid fa-triangle-exclamation" />
        </div>
        <h2 className="text-xl font-bold text-foreground">{error || "Project Not Found"}</h2>
        <p className="text-xs text-muted-foreground">The project details could not be retrieved or you do not have permission to view this record.</p>
        <Link href="/dashboard/clients">
          <Button variant="outline" className="gap-2 font-bold cursor-pointer mt-2">
            <i className="fa-solid fa-arrow-left text-xs" /> Return to Operations Center
          </Button>
        </Link>
      </div>
    );
  }

  const hoursVariance = (project.estHours || 0) - (project.actualHours || 0);
  const daysRemaining = project.targetEndDate
    ? Math.max(0, Math.ceil((new Date(project.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const filteredHistory = (project.contactHistory || []).filter((log) => {
    if (timelineFilter === "All") return true;
    return log.type === timelineFilter;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
          <i className="fa-solid fa-arrow-left text-xs text-primary" /> Back to Operations Center
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 text-xs font-bold cursor-pointer h-9 shadow-2xs">
            <i className="fa-solid fa-file-csv text-primary text-xs" /> Export Details CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenEditModal} className="gap-2 text-xs font-bold cursor-pointer h-9 shadow-2xs">
            <i className="fa-solid fa-pen-to-square text-xs" /> Edit Project
          </Button>
          {isAdmin && (
            <Button color="destructive" size="sm" onClick={handleDeleteProject} className="gap-2 text-xs font-bold cursor-pointer h-9 shadow-2xs">
              <i className="fa-solid fa-trash text-xs" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Header Banner Card */}
      <Card className="border border-border/80 bg-card shadow-md border-t-4 border-t-primary overflow-hidden">
        <CardHeader className="p-6 pb-5 bg-gradient-to-r from-muted/40 via-muted/10 to-muted/40">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-extrabold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-md shadow-2xs">
                  {project.projectId}
                </span>
                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shadow-2xs", phaseColors[project.phase])}>
                  {project.phase}
                </span>
                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shadow-2xs", priorityColors[project.priority])}>
                  {project.priority} Priority
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">{project.projectName}</h1>
              <p className="text-xs font-semibold text-muted-foreground flex flex-wrap items-center gap-2">
                <span><i className="fa-solid fa-building text-primary text-xs" /> {project.clientAccount}</span>
                <span className="opacity-40">•</span>
                <span><i className="fa-solid fa-briefcase text-indigo-500 text-xs" /> {project.venture}</span>
                <span className="opacity-40">•</span>
                <span><i className="fa-solid fa-calendar-plus text-xs" /> Created: {new Date(project.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
              </p>
            </div>

            {/* Health Quick Switcher */}
            <div className="bg-background/80 border border-border/70 p-2.5 rounded-xl space-y-1.5 shadow-sm text-right">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Project Health Toggle</span>
              <div className="flex items-center gap-1.5">
                {(["Green", "Amber", "Red"] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleUpdateHealth(h)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer border shadow-2xs",
                      project.health === h
                        ? healthColors[h]
                        : "text-muted-foreground hover:text-foreground border-border/40 bg-muted/20"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <Card className="border border-border/70 bg-card shadow-sm p-4 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Est Hours</p>
          <p className="text-2xl font-extrabold text-foreground mt-1">{project.estHours}h</p>
        </Card>
        <Card className="border border-border/70 bg-card shadow-sm p-4 text-center relative overflow-hidden">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actual Hours</p>
          <p className="text-2xl font-extrabold text-foreground mt-1">{project.actualHours}h</p>
        </Card>
        <Card className="border border-border/70 bg-card shadow-sm p-4 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hours Variance</p>
          <p className={cn("text-2xl font-extrabold mt-1", hoursVariance < 0 ? "text-rose-500" : "text-emerald-500")}>
            {hoursVariance > 0 ? `+${hoursVariance}` : hoursVariance}h
          </p>
        </Card>
        <Card className="border border-border/70 bg-card shadow-sm p-4 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Completion Progress</p>
          <p className="text-2xl font-extrabold text-primary mt-1">{project.progressPercent}%</p>
        </Card>
      </div>

      {/* Two Column Details Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Specifications, Quick Hours, & Scope */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Hours Worked Logger Widget */}
          <Card className="border border-border/80 bg-gradient-to-r from-primary/5 via-card to-card shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-stopwatch text-primary text-sm" /> Quick Log Hours Worked
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">Current: <strong>{project.actualHours}h</strong></span>
            </div>
            <form onSubmit={handleQuickLogHours} className="flex items-center gap-3">
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={quickHours}
                onChange={(e) => setQuickHours(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-36 text-xs font-mono"
                required
              />
              <Button color="primary" size="sm" type="submit" disabled={quickHoursSubmitting} className="font-bold cursor-pointer h-9 px-4">
                {quickHoursSubmitting ? "Logging..." : "+ Add Logged Hours"}
              </Button>
            </form>
          </Card>

          {/* Progress Bar Detail */}
          <Card className="border border-border/70 bg-card shadow-xs p-5 space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-foreground font-bold flex items-center gap-2">
                <i className="fa-solid fa-list-check text-primary text-sm" /> Task Completion Progress
              </span>
              <span className="font-mono font-extrabold text-primary text-sm">{project.progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-muted dark:bg-slate-800 rounded-full overflow-hidden border border-border/50 shadow-inner">
              <div
                className={cn("h-full rounded-full transition-all duration-500", project.progressPercent === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-indigo-500")}
                style={{ width: `${project.progressPercent}%` }}
              />
            </div>
          </Card>

          {/* Delivery & Schedule Info Card */}
          <Card className="border border-border/70 bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-clock text-primary text-sm" /> Project Schedule & Delivery Specs
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-muted/30 rounded-xl border border-border/50 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Delivery Owner</span>
                <p className="font-extrabold text-primary text-sm flex items-center gap-1.5">
                  <i className="fa-solid fa-user-tie text-xs text-primary" /> {project.deliveryOwner}
                </p>
              </div>
              <div className="p-3.5 bg-muted/30 rounded-xl border border-border/50 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Billing Model</span>
                <p className="font-extrabold text-foreground text-sm flex items-center gap-1.5">
                  <i className="fa-solid fa-file-invoice-dollar text-xs text-emerald-500" /> {project.billingType}
                </p>
              </div>
              <div className="p-3.5 bg-muted/30 rounded-xl border border-border/50 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Start Date</span>
                <p className="font-extrabold text-foreground text-xs font-mono flex items-center gap-1.5">
                  <i className="fa-solid fa-calendar-play text-xs text-blue-500" />
                  {project.startDate ? new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                </p>
              </div>
              <div className="p-3.5 bg-muted/30 rounded-xl border border-border/50 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target End Date & Countdown</span>
                <p className="font-extrabold text-foreground text-xs font-mono flex items-center gap-1.5">
                  <i className="fa-solid fa-hourglass-half text-xs text-amber-500" />
                  {daysRemaining} Days Remaining ({project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"})
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Scope Notes Card */}
          {project.notes && (
            <Card className="border border-border/70 bg-card shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-note-sticky text-primary text-sm" /> Project Scope & Internal Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-xs text-foreground font-medium whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-xl border border-border/50">
                  {project.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Interaction History Timeline Drawer */}
        <div className="space-y-6">
          <Card className="border border-border/70 bg-card shadow-xs flex flex-col h-full">
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-timeline text-primary text-sm" /> Interaction Timeline
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-5 flex-1 flex flex-col">
              {/* Form to Log New Interaction */}
              <form onSubmit={handleAddLog} className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/60 shadow-2xs">
                <span className="text-xs font-bold text-foreground block">Log New Interaction</span>
                <div className="grid grid-cols-4 gap-1 bg-background border border-border p-1 rounded-lg text-center">
                  {(["Note", "Email", "Call", "Meeting"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLogType(type)}
                      className={cn(
                        "py-1 rounded text-[11px] font-bold transition-all cursor-pointer",
                        logType === type ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <textarea
                  value={logSummary}
                  onChange={(e) => setLogSummary(e.target.value)}
                  placeholder={`Describe this ${logType.toLowerCase()} interaction...`}
                  rows={3}
                  required
                  className="w-full text-xs bg-background border border-border rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button color="primary" size="sm" type="submit" disabled={logSubmitting} className="w-full font-bold cursor-pointer h-8 shadow-2xs">
                  {logSubmitting ? "Saving..." : `+ Log ${logType}`}
                </Button>
              </form>

              {/* Timeline Category Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap border-t border-border/50 pt-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Filter:</span>
                {(["All", "Note", "Email", "Call", "Meeting"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTimelineFilter(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer",
                      timelineFilter === cat
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-muted/20 text-muted-foreground border-border/40 hover:text-foreground"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Timeline Entries List */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px] pr-1">
                {filteredHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
                    <i className="fa-solid fa-box-open text-3xl opacity-30 mb-2 block" />
                    No {timelineFilter === "All" ? "" : timelineFilter.toLowerCase()} logs recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/80">
                    {filteredHistory
                      .slice()
                      .reverse()
                      .map((log, idx) => {
                        const iconMap: Record<string, string> = {
                          Note: "fa-clipboard-user text-slate-500 bg-slate-500/10",
                          Email: "fa-envelope text-sky-500 bg-sky-500/10",
                          Call: "fa-phone text-emerald-500 bg-emerald-500/10",
                          Meeting: "fa-handshake text-violet-500 bg-violet-500/10",
                        };
                        const iconConfig = iconMap[log.type] || "fa-clipboard text-slate-500 bg-slate-500/10";
                        const [faClass, textClass, bgClass] = iconConfig.split(" ");

                        return (
                          <div key={log._id || idx} className="flex gap-3 items-start relative pl-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-border/60 z-10 ${bgClass}`}>
                              <i className={`fa-solid ${faClass} ${textClass} text-[11px]`} />
                            </div>
                            <div className="flex-1 bg-background border border-border/80 p-3.5 rounded-xl shadow-2xs space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{log.type}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {new Date(log.date).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-foreground font-medium leading-relaxed">{log.summary}</p>
                              <div className="text-[10px] text-muted-foreground text-right pt-1 border-t border-border/30">
                                Logged by: <strong className="text-foreground font-bold">{log.authorName}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-primary" /> Edit Operations Project
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-foreground">Project ID *</label>
                  <Input value={editFormData.projectId || ""} onChange={(e) => setEditFormData({ ...editFormData, projectId: e.target.value })} required />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-foreground">Client / Account *</label>
                  <Input value={editFormData.clientAccount || ""} onChange={(e) => setEditFormData({ ...editFormData, clientAccount: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground">Venture *</label>
                  <Input value={editFormData.venture || ""} onChange={(e) => setEditFormData({ ...editFormData, venture: e.target.value })} required />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Project Name *</label>
                  <Input value={editFormData.projectName || ""} onChange={(e) => setEditFormData({ ...editFormData, projectName: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-foreground">Delivery Owner *</label>
                  <Input value={editFormData.deliveryOwner || ""} onChange={(e) => setEditFormData({ ...editFormData, deliveryOwner: e.target.value })} required />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Phase</label>
                  <select
                    value={editFormData.phase || "In Delivery"}
                    onChange={(e) => setEditFormData({ ...editFormData, phase: e.target.value as any })}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value="Onboarding">Onboarding</option>
                    <option value="In Delivery">In Delivery</option>
                    <option value="Review">Review</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground">Priority</label>
                  <select
                    value={editFormData.priority || "Medium"}
                    onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value as any })}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-foreground">Health</label>
                  <select
                    value={editFormData.health || "Green"}
                    onChange={(e) => setEditFormData({ ...editFormData, health: e.target.value as any })}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none"
                  >
                    <option value="Green">Green</option>
                    <option value="Amber">Amber</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-foreground">Billing Type</label>
                  <Input value={editFormData.billingType || ""} onChange={(e) => setEditFormData({ ...editFormData, billingType: e.target.value })} />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Task Progress %</label>
                  <Input type="number" min="0" max="100" value={editFormData.progressPercent || 0} onChange={(e) => setEditFormData({ ...editFormData, progressPercent: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground">Est Hours</label>
                  <Input type="number" min="0" value={editFormData.estHours || 0} onChange={(e) => setEditFormData({ ...editFormData, estHours: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Actual Hours</label>
                  <Input type="number" min="0" value={editFormData.actualHours || 0} onChange={(e) => setEditFormData({ ...editFormData, actualHours: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground">Start Date</label>
                  <Input type="date" value={editFormData.startDate || ""} onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Target End Date</label>
                  <Input type="date" value={editFormData.targetEndDate || ""} onChange={(e) => setEditFormData({ ...editFormData, targetEndDate: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="font-semibold text-foreground">Scope & Notes</label>
                <textarea
                  value={editFormData.notes || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full text-xs bg-background border border-border rounded-md p-2 text-foreground focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" disabled={editSubmitting}>{editSubmitting ? "Saving..." : "Save Changes"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
