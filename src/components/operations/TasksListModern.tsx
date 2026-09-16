"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface TasksListModernProps {
  tasks: any[];
  projects: any[];
  teamMembers: any[];
  selectedProjectId?: string;
  onSelectProject: (projectId: string) => void;
  onOpenClassicKanban: (projectId?: string) => void;
  onAddNewTask: () => void;
  onEditTask: (task: any) => void;
  onDeleteTask: (taskId: string, taskTitle: string) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: string) => Promise<void>;
  onSelectTaskPreview: (task: any) => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function TasksListModern({
  tasks,
  projects,
  teamMembers,
  selectedProjectId = "all",
  onSelectProject,
  onOpenClassicKanban,
  onAddNewTask,
  onEditTask,
  onDeleteTask,
  onUpdateTaskStatus,
  onSelectTaskPreview,
  onRefresh,
  loading = false,
}: TasksListModernProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>(selectedProjectId || "all");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "title" | "newest">("newest");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [statusDropdownTaskId, setStatusDropdownTaskId] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Sync project filter if prop changes
  React.useEffect(() => {
    if (selectedProjectId) {
      setProjectFilter(selectedProjectId);
    }
  }, [selectedProjectId]);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "To Do").length;
    const inProgress = tasks.filter((t) => t.status === "In Progress" || t.status === "Review").length;
    const completed = tasks.filter((t) => t.status === "Done").length;
    return { total, pending, inProgress, completed };
  }, [tasks]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t._id?.toLowerCase().includes(q)
      );
    }

    if (projectFilter !== "all") {
      list = list.filter((t) => {
        const pId = t.projectId?._id || t.projectId;
        return pId === projectFilter;
      });
    }

    if (statusFilter !== "all") {
      list = list.filter((t) => {
        if (statusFilter === "pending") return t.status === "To Do";
        if (statusFilter === "inprogress") return t.status === "In Progress" || t.status === "Review";
        if (statusFilter === "completed") return t.status === "Done";
        return t.status?.toLowerCase() === statusFilter.toLowerCase();
      });
    }

    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority?.toLowerCase() === priorityFilter.toLowerCase());
    }

    list.sort((a, b) => {
      if (sortBy === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "dueDate") {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      }
      if (sortBy === "priority") {
        const weight: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        return (weight[b.priority || "Medium"] || 0) - (weight[a.priority || "Medium"] || 0);
      }
      // default: newest
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return cb - ca;
    });

    return list;
  }, [tasks, searchQuery, projectFilter, statusFilter, priorityFilter, sortBy]);

  // Group tasks by category (Recent, Upcoming, Completed)
  const groupedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const groups: { title: string; count: number; items: any[] }[] = [];

    const activeList = filteredTasks.filter((t) => t.status !== "Done");
    const completedList = filteredTasks.filter((t) => t.status === "Done");

    if (activeList.length > 0) {
      groups.push({
        title: "Active Tasks",
        count: activeList.length,
        items: activeList,
      });
    }

    if (completedList.length > 0) {
      groups.push({
        title: "Completed",
        count: completedList.length,
        items: completedList,
      });
    }

    if (groups.length === 0 && filteredTasks.length > 0) {
      groups.push({
        title: "All Tasks",
        count: filteredTasks.length,
        items: filteredTasks,
      });
    }

    return groups;
  }, [filteredTasks]);

  // Export tasks helper
  const handleExport = (type: "csv" | "json") => {
    if (type === "json") {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredTasks, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `tasks_export_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else {
      const headers = ["Task Title", "Project", "Assignee", "Priority", "Status", "Due Date", "Created At"];
      const rows = filteredTasks.map((t) => {
        const proj = projects.find((p) => p._id === (t.projectId?._id || t.projectId));
        return [
          `"${(t.title || "").replace(/"/g, '""')}"`,
          `"${(proj?.name || "General").replace(/"/g, '""')}"`,
          `"${(t.assignee?.name || "Unassigned").replace(/"/g, '""')}"`,
          t.priority || "Medium",
          t.status || "To Do",
          t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "-",
          t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "-",
        ];
      });
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `tasks_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Status toggle handler
  const handleToggleDone = async (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = task.status === "Done" ? "In Progress" : "Done";
    setUpdatingTaskId(task._id);
    try {
      await onUpdateTaskStatus(task._id, nextStatus);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Change status directly
  const handleSelectStatus = async (taskId: string, status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStatusDropdownTaskId(null);
    setUpdatingTaskId(taskId);
    try {
      await onUpdateTaskStatus(taskId, status);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const formatDueDate = (dateStr?: string | Date) => {
    if (!dateStr) return "No date";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div
      className="space-y-6"
      onClick={() => {
        setActiveMenuId(null);
        setStatusDropdownTaskId(null);
      }}
    >
      {/* 4 KPI Summary Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Tasks */}
        <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Total Tasks</p>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{metrics.total}</h3>
            <span className="text-[10px] sm:text-[11px] text-sky-600 dark:text-sky-400 font-medium truncate block">All workspace</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-sm sm:text-lg border border-sky-500/20 shrink-0 ml-2">
            <i className="fa-solid fa-list-check" />
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Pending Tasks</p>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{metrics.pending}</h3>
            <span className="text-[10px] sm:text-[11px] text-sky-500 font-medium truncate block">Awaiting action</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center text-sm sm:text-lg border border-sky-500/20 shrink-0 ml-2">
            <i className="fa-regular fa-clock" />
          </div>
        </div>

        {/* Inprogress Tasks */}
        <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Inprogress Tasks</p>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{metrics.inProgress}</h3>
            <span className="text-[10px] sm:text-[11px] text-amber-500 font-medium truncate block">In flow</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-sm sm:text-lg border border-amber-500/20 shrink-0 ml-2">
            <i className="fa-solid fa-spinner" />
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Completed Tasks</p>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 sm:mt-1">{metrics.completed}</h3>
            <span className="text-[10px] sm:text-[11px] text-emerald-500 font-medium truncate block">Resolved</span>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-sm sm:text-lg border border-emerald-500/20 shrink-0 ml-2">
            <i className="fa-regular fa-circle-check" />
          </div>
        </div>
      </div>

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Tasks</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
              {tasks.length}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 sm:mt-1">
            <span>Home</span>
            <i className="fa-solid fa-chevron-right text-[10px] opacity-60" />
            <span className="text-foreground font-medium">Tasks</span>
          </div>
        </div>

        {/* Actions Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Quick Switch to Old Design / Classic Kanban */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenClassicKanban(projectFilter !== "all" ? projectFilter : undefined)}
            className="gap-1.5 sm:gap-2 font-semibold text-xs border-primary/30 text-primary hover:bg-primary/10 shadow-2xs cursor-pointer h-8 sm:h-9 px-2.5 sm:px-3"
            title="Open in Classic Kanban Board (Old Design)"
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
            title="Refresh tasks"
          >
            <i className={cn("fa-solid fa-arrows-rotate text-xs", loading && "fa-spin text-primary")} />
          </Button>

          {/* Add New Task Button */}
          <Button
            size="sm"
            onClick={onAddNewTask}
            className="gap-1.5 sm:gap-2 font-semibold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-600/20 cursor-pointer h-8 sm:h-9 px-3 sm:px-4"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span>Add New Task</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        {/* Search Input Box */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by name or description..."
            className="pl-9 pr-8 h-9 sm:h-10 rounded-xl sm:rounded-2xl bg-card border border-border/80 shadow-2xs text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-card/80 dark:bg-card/40 border border-border/70 rounded-2xl p-2 sm:p-2.5 backdrop-blur-sm shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Status Pills Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-2.5 sm:px-3 py-1 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary h-8"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending (To Do)</option>
              <option value="inprogress">In Progress / Review</option>
              <option value="completed">Completed (Done)</option>
            </select>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => {
                setProjectFilter(e.target.value);
                onSelectProject(e.target.value);
              }}
              className="rounded-xl border border-border bg-background px-2.5 sm:px-3 py-1 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary h-8 max-w-[140px] sm:max-w-[180px] truncate"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-border bg-background px-2.5 sm:px-3 py-1 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary h-8"
            >
              <option value="all">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Right side: Sort by */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/50">
            <span className="text-xs text-muted-foreground">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="rounded-xl border border-border bg-background px-2.5 sm:px-3 py-1 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary h-8"
            >
              <option value="newest">Newest</option>
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="title">Title A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-6">
        {filteredTasks.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-dashed border-border bg-card/40 p-8">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto mb-3 text-xl">
              <i className="fa-solid fa-list-check text-primary/70" />
            </div>
            <h3 className="text-base font-bold text-foreground">No tasks found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
              {searchQuery || statusFilter !== "all" || projectFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search query or filters."
                : "Create your first task by clicking Add New Task above."}
            </p>
            <Button size="sm" onClick={onAddNewTask} className="gap-2 bg-red-600 hover:bg-red-700 text-white text-xs">
              <i className="fa-solid fa-plus text-xs" /> Add New Task
            </Button>
          </div>
        ) : (
          groupedTasks.map((group) => (
            <div key={group.title} className="space-y-2.5">
              {/* Collapsible / Group Title Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{group.title}</h3>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                    {group.count}
                  </span>
                </div>
              </div>

              {/* Group Tasks Rows */}
              <div className="space-y-2">
                {group.items.map((task) => {
                  const proj = projects.find((p) => p._id === (task.projectId?._id || task.projectId));
                  const isDone = task.status === "Done";
                  const isUpdating = updatingTaskId === task._id;
                  const priority = task.priority || "Medium";

                  // Stripe color based on status
                  const stripeColor =
                    task.status === "Done"
                      ? "bg-emerald-500"
                      : task.status === "Review"
                      ? "bg-purple-500"
                      : task.status === "In Progress"
                      ? "bg-amber-500"
                      : "bg-sky-500";

                  const assigneeName = task.assignee?.name || "Unassigned";
                  const assigneeInitials = getInitials(assigneeName);

                  return (
                    <div
                      key={task._id}
                      onClick={() => onSelectTaskPreview(task)}
                      className={cn(
                        "group relative flex items-center justify-between gap-2.5 sm:gap-3 p-3 sm:px-4 sm:py-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/30 transition-all duration-150 cursor-pointer shadow-2xs overflow-hidden",
                        isDone && "opacity-75 bg-muted/20"
                      )}
                    >
                      {/* Left Colored Stripe */}
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1", stripeColor)} />

                      {/* Left Block: Grip, Checkbox, Title, Badges */}
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pl-1 sm:pl-1.5">
                        {/* Drag Handle Icon - Hidden on mobile for extra space */}
                        <i className="fa-solid fa-grip-vertical text-muted-foreground/40 group-hover:text-muted-foreground text-xs shrink-0 hidden sm:block" />

                        {/* Interactive Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleDone(task, e)}
                          disabled={isUpdating}
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center text-xs transition-colors shrink-0 cursor-pointer",
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-2xs"
                              : "border-border hover:border-primary text-transparent"
                          )}
                          title={isDone ? "Mark as in-progress" : "Mark as completed"}
                        >
                          {isUpdating ? (
                            <i className="fa-solid fa-spinner fa-spin text-[10px] text-muted-foreground" />
                          ) : isDone ? (
                            <i className="fa-solid fa-check text-[10px]" />
                          ) : null}
                        </button>

                        {/* Task Title */}
                        <div className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "font-semibold text-xs text-foreground group-hover:text-primary transition-colors block truncate",
                              isDone && "line-through text-muted-foreground font-normal"
                            )}
                          >
                            {task.title}
                          </span>
                        </div>

                        {/* Project / Channel Pill Tag */}
                        {proj && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject(proj._id);
                            }}
                            className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0 hover:bg-emerald-500/20 transition-colors"
                            title={`Project: ${proj.name}`}
                          >
                            <i className="fa-solid fa-folder-tree text-[10px]" />
                            <span className="max-w-[120px] truncate">{proj.name}</span>
                          </span>
                        )}

                        {/* Status Pill Badge (Interactive Dropdown) */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusDropdownTaskId(statusDropdownTaskId === task._id ? null : task._id);
                            }}
                            className={cn(
                              "px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors border",
                              task.status === "Done"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : task.status === "In Progress"
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : task.status === "Review"
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/20"
                                : "bg-sky-500/10 text-sky-600 border-sky-500/20"
                            )}
                          >
                            <span>{task.status || "To Do"}</span>
                            <i className="fa-solid fa-chevron-down text-[8px] opacity-70" />
                          </button>

                          {statusDropdownTaskId === task._id && (
                            <div
                              className="absolute left-0 mt-1 w-32 rounded-xl bg-card border border-border shadow-xl z-50 py-1 text-xs animate-in fade-in zoom-in-95"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {["To Do", "In Progress", "Review", "Done"].map((st) => (
                                <button
                                  key={st}
                                  onClick={(e) => handleSelectStatus(task._id, st, e)}
                                  className={cn(
                                    "w-full text-left px-3 py-1.5 hover:bg-muted/70 text-xs flex items-center justify-between cursor-pointer",
                                    task.status === st ? "font-bold text-primary" : "text-foreground"
                                  )}
                                >
                                  <span>{st}</span>
                                  {task.status === st && <i className="fa-solid fa-check text-xs" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Block: Priority, Due Date, Assignee Avatar, 3-dots Menu */}
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Priority Badge */}
                        <span
                          className={cn(
                            "hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
                            priority === "High"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                              : priority === "Medium"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          )}
                        >
                          {priority}
                        </span>

                        {/* Due Date */}
                        <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
                          <i className="fa-regular fa-calendar text-xs text-muted-foreground/80" />
                          <span>{formatDueDate(task.dueDate)}</span>
                        </div>

                        {/* Assignee Avatar Circle */}
                        <div
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary/20 border border-card flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-primary shrink-0 shadow-2xs"
                          title={`Assigned to: ${assigneeName}`}
                        >
                          {assigneeInitials}
                        </div>

                        {/* 3-dots Menu Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === task._id ? null : task._id);
                            }}
                            className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <i className="fa-solid fa-ellipsis-vertical text-xs" />
                          </button>

                          {activeMenuId === task._id && (
                            <div
                              className="absolute right-0 mt-1 w-40 rounded-xl bg-card border border-border shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  onSelectTaskPreview(task);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-muted/70 flex items-center gap-2 text-foreground cursor-pointer"
                              >
                                <i className="fa-solid fa-eye text-primary" /> View Details
                              </button>
                              <button
                                onClick={() => {
                                  onEditTask(task);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-muted/70 flex items-center gap-2 text-foreground cursor-pointer"
                              >
                                <i className="fa-solid fa-pen-to-square text-emerald-500" /> Edit Task
                              </button>
                              <button
                                onClick={() => {
                                  onDeleteTask(task._id, task.title);
                                  setActiveMenuId(null);
                                }}
                                className="w-full text-left px-3.5 py-1.5 hover:bg-rose-500/10 flex items-center gap-2 text-rose-500 cursor-pointer border-t border-border/50 mt-1"
                              >
                                <i className="fa-solid fa-trash-can" /> Delete Task
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
