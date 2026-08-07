"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { usePermissions } from "@/hooks/usePermissions";
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
  contactHistory?: Array<{
    _id?: string;
    date: string;
    type: "Email" | "Call" | "Meeting" | "Note";
    summary: string;
    authorName: string;
  }>;
  createdAt: string;
}

export default function OperationsPage() {
  const { isAdmin } = usePermissions();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Persist View Mode Preference in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("operations_view_mode");
    if (saved === "grid" || saved === "list") {
      setViewMode(saved);
    }
  }, []);

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("operations_view_mode", mode);
  };
  const [projects, setProjects] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("All");
  const [healthFilter, setHealthFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === "grid" ? 9 : 10;

  // Sorting States
  const [sortField, setSortField] = useState<keyof ClientData | "">("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof ClientData) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortArrow = (field: keyof ClientData) => {
    if (sortField !== field) return <i className="fa-solid fa-sort text-[9px] opacity-30 ml-1.5" />;
    return sortDirection === "asc"
      ? <i className="fa-solid fa-sort-up text-[10px] text-primary ml-1.5" />
      : <i className="fa-solid fa-sort-down text-[10px] text-primary ml-1.5" />;
  };

  // View Details Modal States
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingProject, setViewingProject] = useState<ClientData | null>(null);

  const handleOpenViewModal = (p: ClientData) => {
    setViewingProject(p);
    setShowViewModal(true);
  };

  // History Tracker States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProject, setHistoryProject] = useState<ClientData | null>(null);
  const [newLogType, setNewLogType] = useState<"Email" | "Call" | "Meeting" | "Note">("Note");
  const [newLogSummary, setNewLogSummary] = useState("");
  const [submittingHistory, setSubmittingHistory] = useState(false);

  const handleAddHistoryLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyProject || !newLogSummary.trim()) return;

    setSubmittingHistory(true);
    try {
      const res = await fetch(`/api/clients/${historyProject._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactLog: {
            type: newLogType,
            summary: newLogSummary.trim(),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update the project in local state
        setProjects((prev) =>
          prev.map((proj) =>
            proj._id === historyProject._id
              ? { ...proj, contactHistory: data.client.contactHistory }
              : proj
          )
        );
        // Update selection inside the modal to render the new timeline entry
        setHistoryProject(data.client);
        setNewLogSummary("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add log entry.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add log entry.");
    } finally {
      setSubmittingHistory(false);
    }
  };

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, phaseFilter, healthFilter, viewMode]);

  const [showAnalytics, setShowAnalytics] = useState(true);



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
    const list = projects.filter((p) => {
      const matchesSearch =
        p.projectId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientAccount?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.deliveryOwner?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPhase = phaseFilter === "All" || p.phase === phaseFilter;
      const matchesHealth = healthFilter === "All" || p.health === healthFilter;
      return matchesSearch && matchesPhase && matchesHealth;
    });

    if (sortField) {
      list.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal === undefined || bVal === undefined) return 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

    return list;
  }, [projects, searchQuery, phaseFilter, healthFilter, sortField, sortDirection]);

  const handleExportCSV = () => {
    if (filteredProjects.length === 0) return;
    
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
    ];

    const rows = filteredProjects.map((p) => [
      p.projectId,
      `"${p.clientAccount.replace(/"/g, '""')}"`,
      `"${p.venture.replace(/"/g, '""')}"`,
      `"${p.projectName.replace(/"/g, '""')}"`,
      `"${p.deliveryOwner.replace(/"/g, '""')}"`,
      p.phase,
      p.priority,
      p.startDate ? p.startDate.split("T")[0] : "",
      p.targetEndDate ? p.targetEndDate.split("T")[0] : "",
      p.health,
      p.billingType,
      p.estHours,
      p.actualHours,
      (p.estHours || 0) - (p.actualHours || 0),
      `${p.progressPercent}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `operations_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSingleProject = (p: ClientData) => {
    const hoursVariance = (p.estHours || 0) - (p.actualHours || 0);
    const historyText = p.contactHistory && p.contactHistory.length > 0
      ? p.contactHistory.map(h => `[${new Date(h.date).toISOString().split("T")[0]}] (${h.type}) ${h.summary} - Logged by ${h.authorName}`).join(" | ")
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
      p.projectId,
      `"${(p.clientAccount || "").replace(/"/g, '""')}"`,
      `"${(p.venture || "").replace(/"/g, '""')}"`,
      `"${(p.projectName || "").replace(/"/g, '""')}"`,
      `"${(p.deliveryOwner || "").replace(/"/g, '""')}"`,
      p.phase,
      p.priority,
      p.startDate ? p.startDate.split("T")[0] : "",
      p.targetEndDate ? p.targetEndDate.split("T")[0] : "",
      p.health,
      p.billingType,
      p.estHours,
      p.actualHours,
      hoursVariance,
      `${p.progressPercent}%`,
      `"${(p.notes || "").replace(/"/g, '""')}"`,
      `"${historyText.replace(/"/g, '""')}"`,
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), row.join(",")].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `project_${p.projectId}_${(p.clientAccount || "detail").replace(/\s+/g, "_")}_export.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  // SVG Donut calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const chartData = useMemo(() => {
    // 1. Health Distribution for Pie Chart
    const healthCounts = { Green: 0, Amber: 0, Red: 0 };
    filteredProjects.forEach((p) => {
      if (p.health === "Green") healthCounts.Green++;
      else if (p.health === "Amber") healthCounts.Amber++;
      else if (p.health === "Red") healthCounts.Red++;
    });

    const totalHealth = healthCounts.Green + healthCounts.Amber + healthCounts.Red || 1;
    const pieData = [
      { name: "Green", count: healthCounts.Green },
      { name: "Amber", count: healthCounts.Amber },
      { name: "Red", count: healthCounts.Red },
    ].map((d) => ({
      ...d,
      percent: Math.round((d.count / totalHealth) * 100),
    }));

    // 2. Top 5 Projects by Est Hours for Bar Chart
    const topProjects = [...filteredProjects]
      .sort((a, b) => (b.estHours || 0) - (a.estHours || 0))
      .slice(0, 5);

    return { pieData, topProjects, totalHealth };
  }, [filteredProjects]);

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

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="gap-2 font-semibold h-8 cursor-pointer"
          >
            <i className="fa-solid fa-chart-pie text-xs text-primary" /> {showAnalytics ? "Hide Analytics" : "Show Analytics"}
          </Button>

          <Button color="primary" size="sm" onClick={() => handleOpenModal()} className="gap-2 font-semibold h-8 cursor-pointer">
            <i className="fa-solid fa-plus text-xs" /> Add Project / Retainer
          </Button>
        </div>
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

      {/* Collapsible Analytics Panel */}
      {showAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Bar Chart: Hours variance top 5 */}
          <Card className="lg:col-span-2 border border-border shadow-sm p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-chart-simple text-primary" /> Budgeted vs. Actual Hours (Top 5 Projects)
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Est. Hours vs. Actual hours logged per project.</p>
            </div>
            
            <div className="h-52 w-full mt-2 flex items-center justify-center">
              {chartData.topProjects.length === 0 ? (
                <div className="text-xs text-muted-foreground">No project data available for visualization.</div>
              ) : (
                <svg viewBox="0 0 400 210" className="w-full h-full">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="380" y2="20" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="40" y1="85" x2="380" y2="85" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="40" y1="150" x2="380" y2="150" stroke="var(--border)" strokeWidth="1" />

                  {/* Draw Bars */}
                  {(() => {
                    const maxVal = Math.max(...chartData.topProjects.map((p) => Math.max(p.estHours || 0, p.actualHours || 0)), 50);
                    return chartData.topProjects.map((p, idx) => {
                      const estH = ((p.estHours || 0) / maxVal) * 120;
                      const actH = ((p.actualHours || 0) / maxVal) * 120;
                      const xBase = 55 + idx * 65;

                      return (
                        <g key={p._id} className="group cursor-pointer">
                          {/* Est Hours Bar */}
                          <rect
                            x={xBase}
                            y={150 - estH}
                            width="18"
                            height={estH}
                            className="fill-primary opacity-90 hover:opacity-100 transition-all duration-300"
                            rx="2"
                          />
                          {/* Actual Hours Bar */}
                          <rect
                            x={xBase + 21}
                            y={150 - actH}
                            width="18"
                            height={actH}
                            className="fill-emerald-500 dark:fill-emerald-400 opacity-90 hover:opacity-100 transition-all duration-300"
                            rx="2"
                          />
                          {/* Project Label */}
                          <text x={xBase + 19} y="168" className="fill-muted-foreground" fontSize="9.5" textAnchor="middle" fontWeight="bold">
                            {p.projectId}
                          </text>
                          <text x={xBase + 19} y="184" className="fill-foreground opacity-80" fontSize="8" textAnchor="middle">
                            {p.projectName.length > 9 ? `${p.projectName.slice(0, 8)}...` : p.projectName}
                          </text>

                          {/* Hover Tooltip */}
                          <title>
                            {p.projectName}&#10;
                            Est Hours: {p.estHours}h&#10;
                            Actual Hours: {p.actualHours}h
                          </title>
                        </g>
                      );
                    });
                  })()}
                </svg>
              )}
            </div>

            <div className="flex items-center gap-4 text-[10px] font-bold justify-center border-t border-border/50 pt-2 shrink-0">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 bg-primary rounded-xs" /> Est. Hours
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-2.5 h-2.5 bg-emerald-500 dark:bg-emerald-400 rounded-xs" /> Actual Hours
              </span>
            </div>
          </Card>

          {/* Donut Pie Chart: Health Distribution */}
          <Card className="border border-border shadow-sm p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-chart-pie text-primary" /> Health Distribution
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Venture health ratio inside your workspace.</p>
            </div>

            <div className="flex items-center justify-center py-4 relative">
              {filteredProjects.length === 0 ? (
                <div className="text-xs text-muted-foreground h-40 flex items-center">No projects to plot health.</div>
              ) : (
                (() => {
                  let accumulatedLength = 0;
                  return (
                    <div className="relative flex items-center justify-center">
                      <svg viewBox="0 0 140 140" className="w-36 h-36 transform -rotate-90">
                        {chartData.pieData.map((slice) => {
                          if (slice.count === 0) return null;
                          const sliceLength = (slice.count / chartData.totalHealth) * circumference;
                          const dashArray = `${sliceLength} ${circumference - sliceLength}`;
                          const dashOffset = -accumulatedLength;
                          accumulatedLength += sliceLength;

                          return (
                            <circle
                              key={slice.name}
                              cx="70"
                              cy="70"
                              r={radius}
                              fill="transparent"
                              strokeWidth="15"
                              strokeDasharray={dashArray}
                              strokeDashoffset={dashOffset}
                              className={cn(
                                "transition-all duration-300 hover:stroke-[18px] cursor-pointer",
                                slice.name === "Green" ? "stroke-emerald-500 dark:stroke-emerald-400" :
                                slice.name === "Amber" ? "stroke-amber-500 dark:stroke-amber-400" :
                                "stroke-rose-500 dark:stroke-rose-400"
                              )}
                            >
                              <title>{slice.name} Health: {slice.count} projects ({slice.percent}%)</title>
                            </circle>
                          );
                        })}
                        {/* Donut center cut */}
                        <circle cx="70" cy="70" r="36" className="fill-card" />
                      </svg>
                      {/* Inside center text */}
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-foreground font-mono">{filteredProjects.length}</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Total</span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Legends */}
            <div className="space-y-2 border-t border-border/50 pt-2 text-[11px] font-semibold text-foreground">
              {chartData.pieData.map((slice) => (
                <div key={slice.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className={cn("w-2.5 h-2.5 rounded-full", slice.name === "Green" ? "bg-emerald-500" : slice.name === "Amber" ? "bg-amber-500" : "bg-rose-500")} />
                    {slice.name} Health
                  </span>
                  <span className="font-mono text-foreground font-bold">
                    {slice.count} ({slice.percent}%)
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

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
            className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto cursor-pointer"
          >
            <option value="All">All Healths</option>
            <option value="Green">Green</option>
            <option value="Amber">Amber</option>
            <option value="Red">Red</option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredProjects.length === 0}
            className="gap-2 font-semibold h-9 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <i className="fa-solid fa-file-csv text-xs text-primary" /> Export CSV
          </Button>
        </div>
      </Card>

      {/* Spreadsheet Master Grid Table */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <i className="fa-solid fa-table-list text-primary" /> Master Project Operations Grid
            </CardTitle>
            <CardDescription>
              Master view of all client ventures, allocated hour variance, health, and status progress.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-lg">
            <button
              type="button"
              onClick={() => handleViewModeChange("list")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer h-7",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-list-ul text-[10px]" /> List
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("grid")}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer h-7",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-grip text-[10px]" /> Grid
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === "list" ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs min-w-[1500px]">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">
                  <tr>
                    <th className="py-3 px-4 cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("projectId")}>
                      <span className="flex items-center">Project ID {renderSortArrow("projectId")}</span>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("clientAccount")}>
                      <span className="flex items-center">Client/Account {renderSortArrow("clientAccount")}</span>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("venture")}>
                      <span className="flex items-center">Venture {renderSortArrow("venture")}</span>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("projectName")}>
                      <span className="flex items-center">Project Name {renderSortArrow("projectName")}</span>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("deliveryOwner")}>
                      <span className="flex items-center">Delivery Owner {renderSortArrow("deliveryOwner")}</span>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("phase")}>
                      <span className="flex items-center">Phase {renderSortArrow("phase")}</span>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("priority")}>
                      <span className="flex items-center">Priority {renderSortArrow("priority")}</span>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("startDate")}>
                      <span className="flex items-center">Start Date {renderSortArrow("startDate")}</span>
                    </th>
                    <th className="py-3 px-3 cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("targetEndDate")}>
                      <span className="flex items-center">Target End Date {renderSortArrow("targetEndDate")}</span>
                    </th>
                    <th className="py-3 px-3 text-center">Days Left</th>
                    <th className="py-3 px-3 text-center cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("health")}>
                      <span className="flex items-center justify-center">Health {renderSortArrow("health")}</span>
                    </th>
                    <th className="py-3 px-3">Billing Type</th>
                    <th className="py-3 px-3 text-center cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("estHours")}>
                      <span className="flex items-center justify-center">Est. Hours {renderSortArrow("estHours")}</span>
                    </th>
                    <th className="py-3 px-3 text-center cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("actualHours")}>
                      <span className="flex items-center justify-center">Actual Hours {renderSortArrow("actualHours")}</span>
                    </th>
                    <th className="py-3 px-3 text-center">Variance</th>
                    <th className="py-3 px-3 text-center cursor-pointer hover:bg-muted/60 hover:text-foreground transition-all select-none" onClick={() => handleSort("progressPercent")}>
                      <span className="flex items-center justify-center">% Tasks Complete {renderSortArrow("progressPercent")}</span>
                    </th>
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
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            <Link href={`/dashboard/clients/${p._id}`} className="hover:text-primary hover:underline">
                              {p.projectId}
                            </Link>
                          </td>
                          <td className="py-3 px-3 truncate max-w-[120px]" title={p.clientAccount}>{p.clientAccount}</td>
                          <td className="py-3 px-3 truncate max-w-[120px]" title={p.venture}>{p.venture}</td>
                          <td className="py-3 px-3 truncate max-w-[160px] font-semibold text-foreground" title={p.projectName}>
                            <Link href={`/dashboard/clients/${p._id}`} className="hover:text-primary hover:underline">
                              {p.projectName}
                            </Link>
                          </td>
                          <td className="py-3 px-3 font-semibold text-primary">{p.deliveryOwner}</td>
                          <td className="py-3 px-3">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap", phaseColors[p.phase])}>
                              {p.phase}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", priorityColors[p.priority])}>
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
                            <span className={cn("inline-flex items-center justify-center w-16 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap", healthColors[p.health])}>
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
                              <Link
                                href={`/dashboard/clients/${p._id}`}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                                title="View Project Details Page"
                              >
                                <i className="fa-solid fa-eye text-xs" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleExportSingleProject(p)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                                title="Export Project Details CSV"
                              >
                                <i className="fa-solid fa-download text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setHistoryProject(p);
                                  setShowHistoryModal(true);
                                }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                                title="View Interaction History"
                              >
                                <i className="fa-solid fa-clock-rotate-left text-xs" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenModal(p)}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                                title="Edit Project"
                              >
                                <i className="fa-solid fa-pen-to-square text-xs" />
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProject(p._id)}
                                  className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer flex items-center justify-center"
                                  title="Delete Project"
                                >
                                  <i className="fa-solid fa-trash text-xs" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-muted/30 dark:bg-slate-950/60">
              {loading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-64 animate-pulse bg-muted/40 border-2 border-border rounded-xl" />
                ))
              ) : paginatedProjects.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <i className="fa-solid fa-diagram-project text-4xl opacity-30" />
                    <span className="text-sm">No operations projects match your criteria.</span>
                  </div>
                </div>
              ) : (
                paginatedProjects.map((p) => {
                  const daysRemaining = p.targetEndDate
                    ? Math.max(0, Math.ceil((new Date(p.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                    : 0;
                  const hoursVariance = (p.estHours || 0) - (p.actualHours || 0);

                  return (
                    <div
                      key={p._id}
                      className="border-2 border-border dark:border-slate-800 bg-background dark:bg-slate-900 shadow-md hover:shadow-xl hover:border-primary transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden rounded-xl"
                    >
                      <div className="p-4 pb-3 border-b border-border/80 dark:border-slate-800 bg-muted/40 dark:bg-slate-800/50 relative">
                        <div className="flex justify-between items-start">
                          <Link href={`/dashboard/clients/${p._id}`} className="text-[10px] font-mono font-bold text-foreground hover:text-primary bg-card dark:bg-slate-950 border border-border dark:border-slate-700 px-2 py-0.5 rounded shadow-2xs transition-colors">
                            {p.projectId}
                          </Link>
                          <span className={cn("inline-flex items-center justify-center w-16 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-2xs", healthColors[p.health])}>
                            {p.health}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-foreground mt-2 truncate" title={p.projectName}>
                          <Link href={`/dashboard/clients/${p._id}`} className="hover:text-primary hover:underline transition-colors">
                            {p.projectName}
                          </Link>
                        </h4>
                        <p className="text-xs font-semibold text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                          <i className="fa-solid fa-building text-[10px]" /> {p.clientAccount} <span className="opacity-40">•</span> {p.venture}
                        </p>
                      </div>

                      <div className="p-4 pt-4 pb-3 space-y-4 flex-1">
                        {/* Phase & Priority */}
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap", phaseColors[p.phase])}>
                            {p.phase}
                          </span>
                          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", priorityColors[p.priority])}>
                            {p.priority} Priority
                          </span>
                        </div>

                        {/* Hour details */}
                        <div className="grid grid-cols-3 gap-2 bg-muted/60 dark:bg-slate-950 p-3 rounded-lg border border-border/80 dark:border-slate-800 text-center font-mono shadow-inner">
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Est</p>
                            <p className="text-xs font-extrabold text-foreground mt-0.5">{p.estHours}h</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Actual</p>
                            <p className="text-xs font-extrabold text-foreground mt-0.5">{p.actualHours}h</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Variance</p>
                            <p className={cn("text-xs font-extrabold mt-0.5", hoursVariance < 0 ? "text-rose-500" : "text-emerald-500")}>
                              {hoursVariance > 0 ? `+${hoursVariance}` : hoursVariance}h
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-semibold">
                            <span className="text-muted-foreground">Task Completion</span>
                            <span className="font-mono font-bold text-foreground">{p.progressPercent}%</span>
                          </div>
                          <div className="w-full h-2 bg-muted dark:bg-slate-800 rounded-full overflow-hidden border border-border/40">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", p.progressPercent === 100 ? "bg-emerald-500" : "bg-primary")}
                              style={{ width: `${p.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Date details & Delivery Owner */}
                        <div className="space-y-2 pt-2 border-t border-border/60 dark:border-slate-800 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <i className="fa-solid fa-user-tie text-[10px]" /> Owner:
                            </span>
                            <span className="font-bold text-primary truncate max-w-[150px]">{p.deliveryOwner}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <i className="fa-solid fa-clock text-[10px]" /> Time Left:
                            </span>
                            <span className="font-bold text-foreground font-mono">{daysRemaining} Days</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 pt-3 pb-3 border-t border-border/80 dark:border-slate-800 bg-muted/40 dark:bg-slate-800/60 flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setHistoryProject(p);
                            setShowHistoryModal(true);
                          }}
                          className="gap-1.5 text-[11px] font-bold cursor-pointer h-8 px-2.5"
                        >
                          <i className="fa-solid fa-clock-rotate-left text-[10px] text-primary" /> History
                        </Button>
                        <div className="flex items-center gap-1.5">
                          <Link href={`/dashboard/clients/${p._id}`}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs font-semibold cursor-pointer h-8 px-2"
                              title="View Project Details Page"
                            >
                              <i className="fa-solid fa-eye text-[10px]" /> View
                            </Button>
                          </Link>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportSingleProject(p)}
                            className="gap-1 text-xs font-semibold cursor-pointer h-8 px-2"
                            title="Export Project Details CSV"
                          >
                            <i className="fa-solid fa-download text-[10px] text-primary" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModal(p)}
                            className="gap-1.5 text-xs font-semibold cursor-pointer h-8"
                          >
                            <i className="fa-solid fa-pen-to-square text-[10px]" /> Edit
                          </Button>
                          {isAdmin && (
                            <Button
                              type="button"
                              color="destructive"
                              size="sm"
                              onClick={() => handleDeleteProject(p._id)}
                              className="gap-1.5 text-xs font-semibold cursor-pointer h-8"
                            >
                              <i className="fa-solid fa-trash text-[10px]" /> Delete
                            </Button>
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

      {/* History Tracker Modal */}
      {showHistoryModal && historyProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            setShowHistoryModal(false);
            setHistoryProject(null);
          }}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-primary text-base" />
                  Interaction History & Logs
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                  {historyProject.projectId} — {historyProject.projectName} ({historyProject.clientAccount})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportSingleProject(historyProject)}
                  className="gap-1.5 text-xs font-semibold h-8 cursor-pointer"
                  title="Export Project Details & Timeline"
                >
                  <i className="fa-solid fa-download text-xs text-primary" /> Export
                </Button>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryProject(null);
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Scrollable Logs & Add Form */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 min-h-0">
              {/* Form to Log New Interaction */}
              <form onSubmit={handleAddHistoryLog} className="bg-muted/30 p-4 rounded-xl border border-border/60 space-y-3 shrink-0">
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <i className="fa-solid fa-circle-plus text-primary text-xs" /> Log New Interaction
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Channel</label>
                    <select
                      value={newLogType}
                      onChange={(e) => setNewLogType(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                    >
                      <option value="Note">Note</option>
                      <option value="Email">Email</option>
                      <option value="Call">Call</option>
                      <option value="Meeting">Meeting</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Interaction Summary / Description</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={newLogSummary}
                        onChange={(e) => setNewLogSummary(e.target.value)}
                        placeholder="e.g. Discussed extension of Q3 scope by 20 hours"
                        className="h-8 text-xs flex-1"
                        required
                      />
                      <Button color="primary" size="sm" type="submit" disabled={submittingHistory} className="h-8 px-4 font-semibold text-xs whitespace-nowrap">
                        {submittingHistory ? "Logging..." : "Log Entry"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              {/* List of Previous Interactions */}
              <div className="space-y-3">
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <i className="fa-solid fa-list-ul text-primary text-xs" /> Interaction Timeline
                </div>

                {!historyProject.contactHistory || historyProject.contactHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No history entries logged yet. Create the first entry using the form above.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                    {historyProject.contactHistory
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
                            <div className="flex-1 bg-background border border-border p-3 rounded-lg shadow-sm space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{log.type}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(log.date).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-foreground font-medium leading-relaxed">{log.summary}</p>
                              <div className="text-[10px] text-muted-foreground text-right pt-0.5 border-t border-border/30">
                                Logged by: <strong className="text-foreground">{log.authorName}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
            {/* Footer */}
            <div className="border-t border-border pt-3 shrink-0 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryProject(null);
                }}
              >
                Close Timeline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Project Details Modal */}
      {showViewModal && viewingProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => {
            setShowViewModal(false);
            setViewingProject(null);
          }}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 flex flex-col max-h-[90vh] border-t-4 border-t-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-extrabold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-md shadow-2xs">
                  {viewingProject.projectId}
                </span>
                <div>
                  <h3 className="font-extrabold text-xl text-foreground tracking-tight truncate max-w-[340px]">
                    {viewingProject.projectName}
                  </h3>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-plus text-[10px] text-primary" />
                    Created on: {new Date(viewingProject.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingProject(null);
                }}
                className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Scrollable Details Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs min-h-0">
              {/* Account & Venture Banner */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border/70 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                    <i className="fa-solid fa-building" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client / Account</p>
                    <p className="font-extrabold text-foreground text-sm mt-0.5 truncate">{viewingProject.clientAccount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-500/20">
                    <i className="fa-solid fa-briefcase" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Venture</p>
                    <p className="font-extrabold text-foreground text-sm mt-0.5 truncate">{viewingProject.venture}</p>
                  </div>
                </div>
              </div>

              {/* Badges & Status Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-muted/20 rounded-xl border border-border/60 text-center">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Phase</p>
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shadow-2xs", phaseColors[viewingProject.phase])}>
                    {viewingProject.phase}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Priority</p>
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shadow-2xs", priorityColors[viewingProject.priority])}>
                    {viewingProject.priority} Priority
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Health</p>
                  <span className={cn("inline-flex items-center justify-center w-16 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-2xs", healthColors[viewingProject.health])}>
                    {viewingProject.health}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Billing Type</p>
                  <span className="font-extrabold text-foreground block pt-0.5 text-xs">{viewingProject.billingType}</span>
                </div>
              </div>

              {/* Hours & Completion Progress Card */}
              {(() => {
                const hoursVariance = (viewingProject.estHours || 0) - (viewingProject.actualHours || 0);
                return (
                  <div className="space-y-3.5 bg-muted/40 p-4 rounded-xl border border-border/80 shadow-inner">
                    <div className="grid grid-cols-3 gap-3 font-mono">
                      <div className="bg-background/80 p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Est Hours</p>
                        <p className="text-base font-extrabold text-foreground mt-0.5">{viewingProject.estHours}h</p>
                      </div>
                      <div className="bg-background/80 p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actual Hours</p>
                        <p className="text-base font-extrabold text-foreground mt-0.5">{viewingProject.actualHours}h</p>
                      </div>
                      <div className="bg-background/80 p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Variance</p>
                        <p className={cn("text-base font-extrabold mt-0.5", hoursVariance < 0 ? "text-rose-500" : "text-emerald-500")}>
                          {hoursVariance > 0 ? `+${hoursVariance}` : hoursVariance}h
                        </p>
                      </div>
                    </div>
                    {/* Task Progress Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <div className="flex justify-between items-center text-[11px] font-semibold">
                        <span className="text-muted-foreground font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-[#00D09c] fa-list-check text-primary text-xs" /> Task Completion Progress
                        </span>
                        <span className="font-mono font-extrabold text-foreground">{viewingProject.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted dark:bg-slate-800 rounded-full overflow-hidden border border-border/50 shadow-inner">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", viewingProject.progressPercent === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-indigo-500")}
                          style={{ width: `${viewingProject.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dates & Owner */}
              {(() => {
                const daysRemaining = viewingProject.targetEndDate
                  ? Math.max(0, Math.ceil((new Date(viewingProject.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : 0;
                return (
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-muted/20 rounded-xl border border-border/60 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                        <i className="fa-solid fa-user-tie text-[10px] text-primary" /> Delivery Owner
                      </span>
                      <p className="font-extrabold text-primary text-sm mt-0.5 truncate">{viewingProject.deliveryOwner}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                        <i className="fa-solid fa-calendar-play text-[10px] text-primary" /> Start Date
                      </span>
                      <p className="font-extrabold text-foreground text-xs font-mono mt-0.5">
                        {viewingProject.startDate ? new Date(viewingProject.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                        <i className="fa-solid fa-clock text-[10px] text-primary" /> Time Remaining
                      </span>
                      <p className="font-extrabold text-foreground text-xs font-mono mt-0.5">
                        {daysRemaining} Days <span className="opacity-60">({viewingProject.targetEndDate ? new Date(viewingProject.targetEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"})</span>
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Scope Notes */}
              {viewingProject.notes && (
                <div className="space-y-1.5 bg-muted/30 p-4 rounded-xl border border-border/60 shadow-2xs">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-note-sticky text-primary text-xs" /> Project Scope & Notes
                  </p>
                  <p className="text-foreground font-medium whitespace-pre-wrap leading-relaxed bg-background/60 p-3 rounded-lg border border-border/40 text-xs">
                    {viewingProject.notes}
                  </p>
                </div>
              )}

              {/* Embedded Interaction History Timeline */}
              <div className="space-y-3 pt-2">
                <div className="font-bold text-xs text-foreground flex items-center justify-between border-t border-border/80 pt-3">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-extrabold">
                    <i className="fa-solid fa-timeline text-primary text-xs" /> Interaction Timeline ({viewingProject.contactHistory?.length || 0} entries)
                  </span>
                </div>

                {!viewingProject.contactHistory || viewingProject.contactHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
                    <i className="fa-solid fa-box-open text-2xl opacity-30 mb-1 block" />
                    No history logs recorded yet for this project.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/80">
                    {viewingProject.contactHistory
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
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3.5 border-t border-border/80 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleExportSingleProject(viewingProject);
                }}
                className="gap-2 font-bold cursor-pointer h-9 px-3.5"
              >
                <i className="fa-solid fa-file-csv text-xs text-primary" /> Export Full Details
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  color="primary"
                  size="sm"
                  onClick={() => {
                    setShowViewModal(false);
                    handleOpenModal(viewingProject);
                  }}
                  className="gap-2 font-bold cursor-pointer h-9 px-4 shadow-md shadow-primary/20"
                >
                  <i className="fa-solid fa-pen-to-square text-xs" /> Edit Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
