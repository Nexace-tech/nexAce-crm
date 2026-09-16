"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ProjectsGridModernProps {
  projects: any[];
  tasks: any[];
  teamMembers: any[];
  loading?: boolean;
  onSelectProject: (projectId: string) => void;
  onOpenClassicKanban: (projectId?: string) => void;
  onOpenTasksView: (projectId?: string) => void;
  onOpenDriveView: (projectId?: string) => void;
  onAddNewProject: () => void;
  onEditProject: (project: any) => void;
  onRequestDeleteProject: (project: { _id: string; name: string }) => void;
  onRefresh: () => void;
  canDeleteProject?: boolean;
}

const PROJECT_GRADIENTS = [
  "from-violet-500/20 to-purple-600/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  "from-blue-500/20 to-cyan-600/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  "from-emerald-500/20 to-teal-600/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  "from-amber-500/20 to-orange-600/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  "from-rose-500/20 to-pink-600/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
  "from-sky-500/20 to-indigo-600/20 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800",
];

export function ProjectsGridModern({
  projects,
  tasks,
  teamMembers,
  loading = false,
  onSelectProject,
  onOpenClassicKanban,
  onOpenTasksView,
  onOpenDriveView,
  onAddNewProject,
  onEditProject,
  onRequestDeleteProject,
  onRefresh,
  canDeleteProject = true,
}: ProjectsGridModernProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"newest" | "name" | "dueDate" | "budget">("newest");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let list = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.clientAccount?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p._id?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "All") {
      list = list.filter((p) => {
        const s = (p.status || "Planning").toLowerCase();
        return s === statusFilter.toLowerCase();
      });
    }

    if (priorityFilter !== "All") {
      list = list.filter((p) => {
        const pr = (p.priority || "Medium").toLowerCase();
        return pr === priorityFilter.toLowerCase();
      });
    }

    list.sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "dueDate") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        return da - db;
      }
      if (sortBy === "budget") {
        return (b.cost || 0) - (a.cost || 0);
      }
      // default: newest
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return cb - ca;
    });

    return list;
  }, [projects, searchQuery, statusFilter, priorityFilter, sortBy]);

  // Export helper
  const handleExport = (type: "csv" | "json") => {
    if (type === "json") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredProjects, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `projects_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const headers = ["Project ID", "Project Name", "Client/Category", "Status", "Priority", "Due Date", "Budget", "Created At"];
      const rows = filteredProjects.map((p) => [
        `#${p._id?.slice(-5) || ""}`,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${(p.clientAccount || (p.isInternal ? "Internal" : "Client")).replace(/"/g, '""')}"`,
        p.status || "Planning",
        p.priority || "Medium",
        p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "-",
        p.cost || 0,
        p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-",
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `projects_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Helper to format due date
  const formatDueDate = (dateStr?: string | Date) => {
    if (!dateStr) return "No deadline";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Helper to format currency
  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "$0";
    return "$" + Number(amount).toLocaleString("en-US");
  };

  // Helper to get initials
  const getInitials = (name?: string) => {
    if (!name) return "P";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6" onClick={() => setActiveMenuId(null)}>
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Projects</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
              {projects.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 sm:mt-1">
            <span>Home</span>
            <i className="fa-solid fa-chevron-right text-[10px] opacity-60" />
            <span className="text-foreground font-medium">Projects</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Quick Switch to Old Design / Classic Kanban */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenClassicKanban()}
            className="gap-1.5 sm:gap-2 font-semibold text-xs border-primary/30 text-primary hover:bg-primary/10 shadow-2xs cursor-pointer h-8 sm:h-9 px-2.5 sm:px-3"
            title="Switch to Classic Kanban Board (Old Design)"
          >
            <i className="fa-solid fa-square-kanban text-sm" />
            <span>Old Design (Kanban)</span>
          </Button>

          {/* Export Dropdown */}
          <div className="relative inline-block text-left">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(activeMenuId === "export_menu" ? null : "export_menu");
              }}
              className="gap-1.5 sm:gap-2 font-medium text-xs cursor-pointer h-8 sm:h-9 px-2.5 sm:px-3"
            >
              <i className="fa-solid fa-file-export text-xs text-muted-foreground" />
              <span>Export</span>
              <i className="fa-solid fa-chevron-down text-[10px]" />
            </Button>

            {activeMenuId === "export_menu" && (
              <div
                className="absolute right-0 mt-2 w-40 rounded-xl bg-card border border-border shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    handleExport("csv");
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-muted/70 flex items-center gap-2 text-foreground cursor-pointer"
                >
                  <i className="fa-solid fa-file-csv text-emerald-500" /> Export as CSV
                </button>
                <button
                  onClick={() => {
                    handleExport("json");
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-muted/70 flex items-center gap-2 text-foreground cursor-pointer"
                >
                  <i className="fa-solid fa-file-code text-blue-500" /> Export as JSON
                </button>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="w-8 h-8 sm:w-9 sm:h-9 p-0 cursor-pointer text-muted-foreground hover:text-foreground shrink-0"
            title="Refresh projects"
          >
            <i className={cn("fa-solid fa-arrows-rotate text-xs", loading && "fa-spin text-primary")} />
          </Button>

          {/* Add New Project Button */}
          <Button
            size="sm"
            onClick={onAddNewProject}
            className="gap-1.5 sm:gap-2 font-semibold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 cursor-pointer h-8 sm:h-9 px-3 sm:px-4"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span>Add New Project</span>
          </Button>
        </div>
      </div>

      {/* Filter & View Switcher Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 bg-card/80 dark:bg-card/40 border border-border/70 rounded-2xl p-2.5 sm:p-3 backdrop-blur-sm shadow-2xs">
        <div className="flex items-center gap-2 flex-1 w-full min-w-0">
          {/* Filter Dropdown Toggle */}
          <div className="relative shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowFilterDropdown(!showFilterDropdown);
              }}
              className={cn(
                "gap-1.5 sm:gap-2 text-xs font-medium cursor-pointer h-9 rounded-xl px-2.5 sm:px-3",
                (statusFilter !== "All" || priorityFilter !== "All") && "border-primary text-primary bg-primary/5"
              )}
            >
              <i className="fa-solid fa-filter text-xs" />
              <span>Filter</span>
              {(statusFilter !== "All" || priorityFilter !== "All") && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>

            {showFilterDropdown && (
              <div
                className="absolute left-0 mt-2 w-[calc(100vw-36px)] max-w-xs sm:w-72 rounded-2xl bg-card border border-border shadow-2xl z-50 p-4 space-y-3.5 text-xs animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="font-bold text-foreground">Filter Projects</span>
                  <button
                    onClick={() => {
                      setStatusFilter("All");
                      setPriorityFilter("All");
                    }}
                    className="text-primary hover:underline text-[11px] cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-border/60 flex justify-end">
                  <Button size="sm" onClick={() => setShowFilterDropdown(false)} className="h-7 text-xs px-3">
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-0">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-8.5 pr-8 h-9 rounded-xl text-xs bg-background/80 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Right side: Sort by + Grid/List View Switchers */}
        <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[11px] sm:text-xs">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 sm:px-2.5 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary h-8"
            >
              <option value="newest">Newest</option>
              <option value="name">Name A-Z</option>
              <option value="dueDate">Due Date</option>
              <option value="budget">Budget</option>
            </select>
          </div>

          <div className="flex items-center bg-muted/70 p-0.5 rounded-xl border border-border/60 shrink-0">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer text-xs",
                viewMode === "list"
                  ? "bg-card text-foreground shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="List View"
            >
              <i className="fa-solid fa-list" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer text-xs",
                viewMode === "grid"
                  ? "bg-card text-primary shadow-2xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid View"
            >
              <i className="fa-solid fa-table-cells-large" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Grid Mode */}
      {viewMode === "grid" && (
        <>
          {filteredProjects.length === 0 ? (
            <div className="py-20 text-center rounded-3xl border border-dashed border-border bg-card/40 p-8">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3 text-xl">
                <i className="fa-solid fa-folder-open text-primary/70" />
              </div>
              <h3 className="text-base font-bold text-foreground">No projects found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                {searchQuery || statusFilter !== "All" || priorityFilter !== "All"
                  ? "Try adjusting your search criteria or resetting filters."
                  : "Start creating your first project by clicking the Add New Project button above."}
              </p>
              <Button size="sm" onClick={onAddNewProject} className="gap-2 bg-red-600 hover:bg-red-700 text-white text-xs">
                <i className="fa-solid fa-plus text-xs" /> Add New Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
              {filteredProjects.map((p, idx) => {
                const projTasks = tasks.filter((t) => (t.projectId?._id || t.projectId) === p._id);
                const completedTasks = projTasks.filter((t) => t.status === "Done");
                const totalHours = p.cost ? Math.round(p.cost / 50) : (projTasks.length * 8 || 40);
                const gradientClass = PROJECT_GRADIENTS[idx % PROJECT_GRADIENTS.length];
                const priority = p.priority || "High";
                const status = p.status || "Planning";
                const isActive = status === "In Progress" || status === "In Review";

                // Assigned members list
                const assignedList = p.members && p.members.length > 0 ? p.members : [];

                return (
                  <div
                    key={p._id}
                    className="group relative flex flex-col justify-between rounded-2xl bg-card border border-border/80 p-4 sm:p-5 shadow-xs hover:shadow-lg hover:border-primary/40 transition-all duration-200 min-w-0 w-full overflow-hidden"
                  >
                    <div>
                      {/* Card Top Badges Row */}
                      <div className="flex items-center gap-2 mb-4">
                        {/* Priority Badge */}
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border",
                            priority === "High" || priority === "Urgent"
                              ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              : priority === "Medium"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                          )}
                        >
                          {priority}
                        </span>

                        {/* Status Badge */}
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white tracking-wide shadow-2xs",
                            status === "Completed"
                              ? "bg-emerald-600"
                              : isActive
                              ? "bg-emerald-500"
                              : status === "On Hold"
                              ? "bg-amber-500"
                              : "bg-indigo-600"
                          )}
                        >
                          {status === "In Progress" ? "Active" : status}
                        </span>
                      </div>

                      {/* Project Logo + Name + 3-dots Menu Row */}
                      <div className="flex items-start justify-between gap-2.5 mb-3 w-full min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                          {/* Project Icon / Logo */}
                          <div
                            className={cn(
                              "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center font-black text-sm border shrink-0 shadow-2xs",
                              gradientClass
                            )}
                          >
                            {getInitials(p.name)}
                          </div>

                          {/* Title & Subtitle */}
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <h3
                              onClick={() => onSelectProject(p._id)}
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer truncate block leading-snug"
                              title={p.name}
                            >
                              {p.name}
                            </h3>
                            <p
                              className="text-[11px] text-muted-foreground truncate block leading-snug mt-0.5"
                              title={p.clientAccount || (p.isInternal ? "Internal Venture" : "Client Project")}
                            >
                              {p.clientAccount || (p.isInternal ? "Internal Venture" : "Client Project")}
                            </p>
                          </div>
                        </div>

                        {/* 3-dots Dropdown */}
                        <div className="relative shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === p._id ? null : p._id);
                            }}
                            className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <i className="fa-solid fa-ellipsis-vertical text-xs" />
                          </button>

                          {activeMenuId === p._id && (
                            <div
                              className="absolute right-0 mt-1 w-44 rounded-xl bg-card border border-border shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  onOpenTasksView(p._id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-muted/70 flex items-center gap-2 text-foreground cursor-pointer"
                              >
                                <i className="fa-solid fa-list-check text-sky-500" /> View Tasks
                              </button>
                              <button
                                onClick={() => {
                                  onOpenClassicKanban(p._id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-muted/70 flex items-center gap-2 text-foreground cursor-pointer"
                              >
                                <i className="fa-solid fa-square-kanban text-indigo-500" /> Open in Kanban
                              </button>
                              <button
                                onClick={() => {
                                  onOpenDriveView(p._id);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-muted/70 flex items-center gap-2 text-foreground cursor-pointer"
                              >
                                <i className="fa-solid fa-hard-drive text-amber-500" /> Drive Files
                              </button>
                              <button
                                onClick={() => {
                                  onEditProject(p);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-muted/70 flex items-center gap-2 text-foreground cursor-pointer"
                              >
                                <i className="fa-solid fa-pen-to-square text-emerald-500" /> Edit Details
                              </button>
                              {canDeleteProject && (
                                <button
                                  onClick={() => {
                                    onRequestDeleteProject({ _id: p._id, name: p.name });
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3.5 py-1.5 hover:bg-rose-500/10 flex items-center gap-2 text-rose-500 cursor-pointer border-t border-border/50 mt-1"
                                >
                                  <i className="fa-solid fa-trash-can" /> Move to Trash
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Project Short Description */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4 min-h-[36px] break-words">
                        {p.description ||
                          p.requirements ||
                          "Collaborative agile project workspace with sprints, milestone tracking, and task execution."}
                      </p>

                      {/* Key Attributes Section */}
                      <div className="space-y-1.5 text-xs text-muted-foreground mb-4 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <i className="fa-regular fa-circle-check text-xs text-primary/70 shrink-0" />
                          <span className="font-medium text-foreground shrink-0">Project ID :</span>
                          <span className="font-mono text-muted-foreground truncate">#{p._id?.slice(-5) || "12145"}</span>
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <i className="fa-solid fa-money-bill-wave text-xs text-emerald-500/80 shrink-0" />
                          <span className="font-medium text-foreground shrink-0">Value :</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                            {formatCurrency(p.cost)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 min-w-0">
                          <i className="fa-regular fa-calendar text-xs text-amber-500/80 shrink-0" />
                          <span className="font-medium text-foreground shrink-0">Due Date :</span>
                          <span className="text-foreground truncate">{formatDueDate(p.dueDate)}</span>
                        </div>
                      </div>

                      {/* Members Avatar Stack */}
                      <div className="flex items-center justify-between pt-1 pb-3 border-b border-border/60">
                        <div className="flex items-center -space-x-2 overflow-hidden">
                          {assignedList.length > 0 ? (
                            assignedList.slice(0, 3).map((m: any, i: number) => {
                              const name = typeof m === "object" ? m.name : "Team Member";
                              const initials = getInitials(name);
                              return (
                                <div
                                  key={m._id || i}
                                  title={name}
                                  className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary shrink-0 shadow-2xs"
                                >
                                  {initials}
                                </div>
                              );
                            })
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] text-muted-foreground">
                              <i className="fa-solid fa-user text-[10px]" />
                            </div>
                          )}

                          {assignedList.length > 3 && (
                            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-card flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                              +{assignedList.length - 3}
                            </div>
                          )}
                        </div>

                        {/* Project Category or Venture Badge */}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted/60 text-muted-foreground truncate max-w-[110px] shrink-0">
                          {p.assignType === "Department" ? p.assignedDepartment || "Dept" : "Agile Team"}
                        </span>
                      </div>
                    </div>

                    {/* Card Footer Bar */}
                    <div className="flex items-center justify-between pt-3 text-xs gap-2 min-w-0">
                      {/* Total Hours Pill */}
                      <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold text-[10px] sm:text-[11px] shrink-0">
                        <i className="fa-regular fa-clock text-xs" />
                        <span>Total Hours : {totalHours}</span>
                      </div>

                      {/* Tasks & Activity Counters */}
                      <div className="flex items-center gap-2.5 sm:gap-3 text-muted-foreground text-[11px]">
                        <span
                          className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                          title={`${completedTasks.length}/${projTasks.length} tasks completed`}
                          onClick={() => onOpenTasksView(p._id)}
                        >
                          <i className="fa-solid fa-list-check text-xs" />
                          <span>{projTasks.length}</span>
                        </span>
                        <span
                          className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                          title="Open Drive Space"
                          onClick={() => onOpenDriveView(p._id)}
                        >
                          <i className="fa-solid fa-paperclip text-xs" />
                          <span>04</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Projects List Mode */}
      {viewMode === "list" && (
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Client / Venture</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Tasks</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No projects found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p, idx) => {
                    const projTasks = tasks.filter((t) => (t.projectId?._id || t.projectId) === p._id);
                    const gradientClass = PROJECT_GRADIENTS[idx % PROJECT_GRADIENTS.length];
                    const priority = p.priority || "High";
                    const status = p.status || "Planning";
                    const isActive = status === "In Progress" || status === "In Review";

                    return (
                      <tr key={p._id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center font-bold text-xs border shrink-0",
                                gradientClass
                              )}
                            >
                              {getInitials(p.name)}
                            </div>
                            <div>
                              <div
                                onClick={() => onSelectProject(p._id)}
                                className="font-bold text-foreground hover:text-primary cursor-pointer"
                              >
                                {p.name}
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                #{p._id?.slice(-5)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {p.clientAccount || (p.isInternal ? "Internal" : "Client")}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                              priority === "High" || priority === "Urgent"
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                : priority === "Medium"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            )}
                          >
                            {priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-2xs",
                              status === "Completed"
                                ? "bg-emerald-600"
                                : isActive
                                ? "bg-emerald-500"
                                : status === "On Hold"
                                ? "bg-amber-500"
                                : "bg-indigo-600"
                            )}
                          >
                            {status === "In Progress" ? "Active" : status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-foreground">{formatDueDate(p.dueDate)}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.cost)}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => onOpenTasksView(p._id)}
                            className="font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <i className="fa-solid fa-list-check text-xs" /> {projTasks.length} Tasks
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center -space-x-1.5">
                            {(p.members || []).slice(0, 3).map((m: any, i: number) => (
                              <div
                                key={m._id || i}
                                className="w-6 h-6 rounded-full bg-primary/20 border border-card flex items-center justify-center text-[9px] font-bold text-primary"
                              >
                                {getInitials(typeof m === "object" ? m.name : "TM")}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenClassicKanban(p._id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-primary cursor-pointer"
                              title="Kanban Board"
                            >
                              <i className="fa-solid fa-square-kanban text-xs" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditProject(p)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Edit"
                            >
                              <i className="fa-solid fa-pen-to-square text-xs" />
                            </Button>
                            {canDeleteProject && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRequestDeleteProject({ _id: p._id, name: p.name })}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 cursor-pointer"
                                title="Delete"
                              >
                                <i className="fa-solid fa-trash-can text-xs" />
                              </Button>
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
        </div>
      )}
    </div>
  );
}
