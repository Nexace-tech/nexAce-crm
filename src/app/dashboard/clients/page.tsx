"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface ClientData {
  _id: string;
  projectId: string;
  clientAccount: string;
  venture: string;
  projectName: string;
  deliveryOwner: string;
  phase: "In Delivery" | "Closed - follow" | "On Hold" | "Closed - Not" | "Closed";
  priority: "High" | "Medium" | "Low";
  startDate: string;
  targetEndDate: string;
  health: "Green" | "Amber" | "Red";
  billingType: string;
  estHours: number;
  actualHours: number;
  progressPercent: number;
  notes?: string;
  createdAt: string;
}

export default function OperationsPage() {
  const [projects, setProjects] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("All");
  const [healthFilter, setHealthFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ClientData | null>(null);

  const [formData, setFormData] = useState({
    projectId: "",
    clientAccount: "",
    venture: "Ace Consultancys",
    projectName: "",
    deliveryOwner: "",
    phase: "In Delivery" as ClientData["phase"],
    priority: "Medium" as ClientData["priority"],
    startDate: "",
    targetEndDate: "",
    health: "Green" as ClientData["health"],
    billingType: "Retainer",
    estHours: 0,
    actualHours: 0,
    progressPercent: 0,
    notes: "",
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.clients || []);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenModal = (project?: ClientData) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        projectId: project.projectId || "",
        clientAccount: project.clientAccount || "",
        venture: project.venture || "Ace Consultancys",
        projectName: project.projectName || "",
        deliveryOwner: project.deliveryOwner || "",
        phase: project.phase || "In Delivery",
        priority: project.priority || "Medium",
        startDate: project.startDate ? project.startDate.split("T")[0] : "",
        targetEndDate: project.targetEndDate ? project.targetEndDate.split("T")[0] : "",
        health: project.health || "Green",
        billingType: project.billingType || "Retainer",
        estHours: project.estHours || 0,
        actualHours: project.actualHours || 0,
        progressPercent: project.progressPercent || 0,
        notes: project.notes || "",
      });
    } else {
      setEditingProject(null);
      // Auto generate project ID based on max existing ID
      const nextIdNum = projects.reduce((max, p) => {
        const match = p.projectId?.match(/CLP-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0) + 1;
      const autoId = `CLP-${String(nextIdNum).padStart(3, "0")}`;

      setFormData({
        projectId: autoId,
        clientAccount: "",
        venture: "Ace Consultancys",
        projectName: "",
        deliveryOwner: "",
        phase: "In Delivery",
        priority: "Medium",
        startDate: new Date().toISOString().split("T")[0],
        targetEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        health: "Green",
        billingType: "Retainer",
        estHours: 120,
        actualHours: 0,
        progressPercent: 0,
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProject ? `/api/clients/${editingProject._id}` : "/api/clients";
      const method = editingProject ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        fetchProjects();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save project");
      }
    } catch (err) {
      console.error("Save project error:", err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchProjects();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete project");
      }
    } catch (err) {
      console.error("Delete project error:", err);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.projectId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientAccount?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.deliveryOwner?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPhase = phaseFilter === "All" || p.phase === phaseFilter;
      const matchesHealth = healthFilter === "All" || p.health === healthFilter;
      return matchesSearch && matchesPhase && matchesHealth;
    });
  }, [projects, searchQuery, phaseFilter, healthFilter]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.phase === "In Delivery").length;
    const estHoursTotal = projects.reduce((acc, p) => acc + (p.estHours || 0), 0);
    const actualHoursTotal = projects.reduce((acc, p) => acc + (p.actualHours || 0), 0);
    const onHold = projects.filter((p) => p.phase === "On Hold").length;

    return { total, active, estHoursTotal, actualHoursTotal, onHold };
  }, [projects]);

  // Color mappings
  const phaseColors: Record<string, string> = {
    "In Delivery": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "Closed - follow": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    "On Hold": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    "Closed - Not": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    "Closed": "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  };

  const healthColors: Record<string, string> = {
    Green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    Amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    Red: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30",
  };

  const priorityColors: Record<string, string> = {
    High: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
    Medium: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    Low: "bg-slate-500/10 text-slate-500 border border-slate-500/20",
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <i className="fa-solid fa-list-check text-primary text-xl" /> Operations Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every billable client project/retainer — scope, owner, budget, phase, and health.
          </p>
        </div>

        <Button color="primary" size="sm" onClick={() => handleOpenModal()} className="gap-2 font-semibold">
          <i className="fa-solid fa-plus text-xs" /> Add Project / Retainer
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Projects</p>
              <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <i className="fa-solid fa-diagram-project text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active in Delivery</p>
              <p className="text-2xl font-bold text-foreground">{metrics.active}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <i className="fa-solid fa-circle-play text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects on Hold</p>
              <p className="text-2xl font-bold text-foreground">{metrics.onHold}</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <i className="fa-solid fa-circle-pause text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff Hours Logged</p>
              <p className="text-2xl font-bold text-foreground">
                {metrics.actualHoursTotal} / {metrics.estHoursTotal} hrs
              </p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <i className="fa-solid fa-clock text-xl" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by ID, client/account, project name, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
          >
            <option value="All">All Phases</option>
            <option value="In Delivery">In Delivery</option>
            <option value="Closed - follow">Closed - follow</option>
            <option value="On Hold">On Hold</option>
            <option value="Closed - Not">Closed - Not</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
          >
            <option value="All">All Healths</option>
            <option value="Green">Green</option>
            <option value="Amber">Amber</option>
            <option value="Red">Red</option>
          </select>
        </div>
      </Card>

      {/* Spreadsheet Master Grid Table */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-muted/20">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <i className="fa-solid fa-table-list text-primary" /> Master Project Operations Grid
          </CardTitle>
          <CardDescription>
            Master view of all client ventures, allocated hour variance, health, and status progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[1200px]">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Project ID</th>
                  <th className="py-3 px-3">Client/Account</th>
                  <th className="py-3 px-3">Venture</th>
                  <th className="py-3 px-3">Project Name</th>
                  <th className="py-3 px-3">Delivery Owner</th>
                  <th className="py-3 px-3">Phase</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Start Date</th>
                  <th className="py-3 px-3">Target End Date</th>
                  <th className="py-3 px-3 text-center">Days Left</th>
                  <th className="py-3 px-3 text-center">Health</th>
                  <th className="py-3 px-3">Billing Type</th>
                  <th className="py-3 px-3 text-center">Est. Hours</th>
                  <th className="py-3 px-3 text-center">Actual Hours</th>
                  <th className="py-3 px-3 text-center">Variance</th>
                  <th className="py-3 px-3 text-center">% Tasks Complete</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={17} className="py-4 px-4 text-center text-muted-foreground">
                        Loading operations data...
                      </td>
                    </tr>
                  ))
                ) : paginatedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <i className="fa-solid fa-diagram-project text-4xl opacity-30" />
                        <span className="text-sm">No operations projects match your criteria.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedProjects.map((p) => {
                    const daysRemaining = p.targetEndDate
                      ? Math.max(0, Math.ceil((new Date(p.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : 0;
                    const hoursVariance = (p.estHours || 0) - (p.actualHours || 0);

                    return (
                      <tr key={p._id} className="hover:bg-accent/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">{p.projectId}</td>
                        <td className="py-3 px-3 truncate max-w-[120px]" title={p.clientAccount}>{p.clientAccount}</td>
                        <td className="py-3 px-3 truncate max-w-[120px]" title={p.venture}>{p.venture}</td>
                        <td className="py-3 px-3 truncate max-w-[160px] font-semibold text-foreground" title={p.projectName}>{p.projectName}</td>
                        <td className="py-3 px-3 font-semibold text-primary">{p.deliveryOwner}</td>
                        <td className="py-3 px-3">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border", phaseColors[p.phase])}>
                            {p.phase}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold", priorityColors[p.priority])}>
                            {p.priority}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-muted-foreground">
                          {p.startDate ? new Date(p.startDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-muted-foreground">
                          {p.targetEndDate ? new Date(p.targetEndDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-foreground">{daysRemaining}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={cn("inline-flex items-center justify-center w-16 py-0.5 rounded-md text-[10px] font-bold", healthColors[p.health])}>
                            {p.health}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">{p.billingType}</td>
                        <td className="py-3 px-3 text-center font-mono">{p.estHours}</td>
                        <td className="py-3 px-3 text-center font-mono text-foreground">{p.actualHours}</td>
                        <td className={cn("py-3 px-3 text-center font-mono font-bold", hoursVariance < 0 ? "text-rose-500" : "text-emerald-500")}>
                          {hoursVariance > 0 ? `+${hoursVariance}` : hoursVariance}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", p.progressPercent === 100 ? "bg-emerald-500" : "bg-primary")}
                                style={{ width: `${p.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold font-mono">{p.progressPercent}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenModal(p)}
                              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                              title="Edit Project"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProject(p._id)}
                              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              title="Delete Project"
                            >
                              <i className="fa-solid fa-trash text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filteredProjects.length}
        itemsPerPage={itemsPerPage}
      />

      {/* Add / Edit Operations Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-list-check text-primary text-base" />
                {editingProject ? "Edit Operations Project" : "Add Operations Project"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Project ID *</label>
                  <Input
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    placeholder="e.g. CLP-001"
                    required
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-foreground">Client / Account *</label>
                  <Input
                    value={formData.clientAccount}
                    onChange={(e) => setFormData({ ...formData, clientAccount: e.target.value })}
                    placeholder="e.g. Ziqsy"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Venture *</label>
                  <Input
                    value={formData.venture}
                    onChange={(e) => setFormData({ ...formData, venture: e.target.value })}
                    placeholder="e.g. Ace Consultancys"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Project Name *</label>
                  <Input
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="e.g. Q3 Growth Retainer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-foreground">Account / Delivery Owner *</label>
                  <Input
                    value={formData.deliveryOwner}
                    onChange={(e) => setFormData({ ...formData, deliveryOwner: e.target.value })}
                    placeholder="e.g. Barkha"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Billing Type</label>
                  <Input
                    value={formData.billingType}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                    placeholder="e.g. Retainer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phase</label>
                  <select
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value as any })}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="In Delivery">In Delivery</option>
                    <option value="Closed - follow">Closed - follow</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed - Not">Closed - Not</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Health</label>
                  <select
                    value={formData.health}
                    onChange={(e) => setFormData({ ...formData, health: e.target.value as any })}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Green">Green</option>
                    <option value="Amber">Amber</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Target End Date</label>
                  <Input
                    type="date"
                    value={formData.targetEndDate}
                    onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Est. Hours</label>
                  <Input
                    type="number"
                    value={formData.estHours}
                    onChange={(e) => setFormData({ ...formData, estHours: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Actual Hours Logged</label>
                  <Input
                    type="number"
                    value={formData.actualHours}
                    onChange={(e) => setFormData({ ...formData, actualHours: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">% Tasks Complete</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.progressPercent}
                    onChange={(e) => setFormData({ ...formData, progressPercent: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Project Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Additional project notes, scope details..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold">
                  Save Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
