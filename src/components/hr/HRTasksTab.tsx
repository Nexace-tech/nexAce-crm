"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";

interface ISubtask {
  _id?: string;
  title: string;
  completed: boolean;
}

interface IComment {
  _id?: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

interface ITask {
  _id: string;
  title: string;
  description?: string;
  projectId: any;
  sprintId?: any;
  assignee?: any;
  dueDate?: string;
  priority: "Low" | "Medium" | "High";
  status: "To Do" | "In Progress" | "Review" | "Done";
  subtasks: ISubtask[];
  comments: IComment[];
  history: any[];
  createdAt: string;
  updatedAt: string;
}

export function HRTasksTab() {
  const { user, loading: authLoading } = useAuth();
  const { can, isAdmin, isOPS } = usePermissions();

  const [tasks, setTasks] = useState<ITask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "table" | "history">("kanban");
  const [categoryTab, setCategoryTab] = useState<"hr" | "all" | "my">("all");
  const [historyPage, setHistoryPage] = useState<number>(1);
  const historyPageSize = 10;

  // Drag and Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  // Modal State for New Task
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newSubtasksInput, setNewSubtasksInput] = useState("");
  const [isHRTask, setIsHRTask] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selected Task Drawer / Detail View
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes, usersRes, logsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/projects"),
        fetch("/api/team"),
        fetch("/api/activity-logs?limit=500"),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(data.tasks || []);
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
        if (data.projects && data.projects.length > 0 && !newProjectId) {
          setNewProjectId(data.projects[0]._id);
        }
      }
      if (usersRes.ok) {
        const data = await usersRes.json();
        setTeamUsers(data.users || data.team || []);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setActivityLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load HR tasks data:", err);
      showToast("Failed to load HR tasks.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter tasks based on search, tab, project, priority, status (Showing ONLY HR Tasks in HR Portal)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const projectObj = projects.find((p) => p._id === (task.projectId?._id || task.projectId));
      const titleLower = (task.title || "").toLowerCase();
      const descLower = (task.description || "").toLowerCase();

      const isHRTaskMatch =
        projectObj?.category === "HR" ||
        titleLower.includes("[hr") ||
        titleLower.includes("hr") ||
        titleLower.includes("onboarding") ||
        titleLower.includes("offboarding") ||
        titleLower.includes("appraisal") ||
        titleLower.includes("leave") ||
        titleLower.includes("compliance") ||
        titleLower.includes("policy") ||
        descLower.includes("hr");

      if (categoryTab === "hr" && !isHRTaskMatch) {
        return false;
      }

      if (categoryTab === "my") {
        const assigneeId = task.assignee?._id || task.assignee;
        if (assigneeId !== user?._id) return false;
      }

      // Project filter
      if (selectedProjectId !== "all") {
        const pId = task.projectId?._id || task.projectId;
        if (pId !== selectedProjectId) return false;
      }

      // Status filter
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        const matchesAssignee = task.assignee?.name?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAssignee) return false;
      }

      return true;
    });
  }, [tasks, categoryTab, selectedProjectId, statusFilter, priorityFilter, searchQuery, projects, user]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const todo = filteredTasks.filter((t) => t.status === "To Do").length;
    const inProgress = filteredTasks.filter((t) => t.status === "In Progress").length;
    const review = filteredTasks.filter((t) => t.status === "Review").length;
    const done = filteredTasks.filter((t) => t.status === "Done").length;
    const highPriority = filteredTasks.filter((t) => t.priority === "High").length;
    const now = new Date();
    const overdue = filteredTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "Done"
    ).length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, todo, inProgress, review, done, highPriority, overdue, completionRate };
  }, [filteredTasks]);

  // Export Tasks to CSV
  const handleExportTasks = () => {
    if (filteredTasks.length === 0) {
      showToast("No tasks to export", "error");
      return;
    }

    const headers = "Task ID,Title,Status,Priority,Assignee,Due Date,Checklist Progress,Created At\n";
    const rows = filteredTasks
      .map((t) => {
        const assigneeName = t.assignee?.name || "Unassigned";
        const dueDateStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "N/A";
        const completedSub = t.subtasks?.filter((s) => s.completed).length || 0;
        const totalSub = t.subtasks?.length || 0;
        const checklistStr = `${completedSub}/${totalSub}`;
        const titleSafe = (t.title || "").replace(/"/g, '""');

        return `"${t._id}","${titleSafe}","${t.status}","${t.priority}","${assigneeName}","${dueDateStr}","${checklistStr}","${new Date(t.createdAt).toLocaleDateString()}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `HR_Tasks_Export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredTasks.length} task(s) to CSV!`);
  };

  // Handle task status update
  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t._id === taskId ? data.task : t)));
        if (selectedTask?._id === taskId) {
          setSelectedTask(data.task);
        }
        showToast(`Task status updated to "${newStatus}"`);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update status", "error");
      }
    } catch {
      showToast("Network error updating task status", "error");
    }
  };

  // Handle subtask completion toggle
  const handleToggleSubtask = async (task: ITask, subtaskIndex: number) => {
    const updatedSubtasks = [...task.subtasks];
    updatedSubtasks[subtaskIndex].completed = !updatedSubtasks[subtaskIndex].completed;

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task._id, subtasks: updatedSubtasks }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t._id === task._id ? data.task : t)));
        if (selectedTask?._id === task._id) {
          setSelectedTask(data.task);
        }
        showToast("Subtask status updated");
      }
    } catch {
      showToast("Failed to update subtask", "error");
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !commentInput.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask._id,
          commentText: commentInput.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data.task);
        setTasks((prev) => prev.map((t) => (t._id === data.task._id ? data.task : t)));
        setCommentInput("");
        showToast("Comment posted successfully");
      }
    } catch {
      showToast("Failed to add comment", "error");
    }
  };

  // Handle task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast("Task title is required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const subtasksArray = newSubtasksInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((title) => ({ title, completed: false }));

      let targetProjectId = newProjectId;
      if (!targetProjectId && projects.length > 0) {
        targetProjectId = projects[0]._id;
      }

      const body: any = {
        title: isHRTask ? `[HR Task] ${newTitle.trim()}` : newTitle.trim(),
        description: newDescription.trim(),
        projectId: targetProjectId,
        assignee: newAssigneeId || undefined,
        priority: newPriority,
        dueDate: newDueDate || undefined,
        subtasks: subtasksArray,
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => [data.task, ...prev]);
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewDueDate("");
        setNewSubtasksInput("");
        showToast("Task created successfully!");
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Failed to create task", "error");
      }
    } catch {
      showToast("Error creating task", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <Preloader label="Loading HR Tasks & Workflows..." />;
  }

  const columns: Array<"To Do" | "In Progress" | "Review" | "Done"> = [
    "To Do",
    "In Progress",
    "Review",
    "Done",
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
            toast.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
          )}
        >
          <i
            className={cn(
              "fa-solid",
              toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation"
            )}
          />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-4 rounded-xl border border-border">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-list-check text-primary" />
            HR Tasks & Workflows
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage onboarding checklists, offboarding tasks, appraisal follow-ups, and HR assignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-muted rounded-xl border border-border">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "kanban"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-table-columns" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-list-ul" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                viewMode === "history"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-clock-rotate-left" />
              <span>Task History</span>
            </button>
          </div>

          <Button
            onClick={handleExportTasks}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 rounded-xl text-xs cursor-pointer"
          >
            <i className="fa-solid fa-file-csv text-emerald-500" />
            <span>Export CSV</span>
          </Button>

          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="flex items-center gap-2 rounded-xl shadow-xs cursor-pointer"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span>Create Task</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats & Velocity Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card/60 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Total Tasks
              </p>
              <h4 className="text-xl font-bold text-foreground mt-0.5">{stats.total}</h4>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
              <i className="fa-solid fa-cubes text-base" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Completion Rate
              </p>
              <h4 className="text-xl font-bold text-emerald-500 mt-0.5">{stats.completionRate}%</h4>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <i className="fa-solid fa-chart-pie text-base" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                In Progress
              </p>
              <h4 className="text-xl font-bold text-amber-500 mt-0.5">{stats.inProgress}</h4>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <i className="fa-solid fa-spinner fa-spin-pulse text-base" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                High Priority
              </p>
              <h4 className="text-xl font-bold text-purple-500 mt-0.5">{stats.highPriority}</h4>
            </div>
            <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
              <i className="fa-solid fa-fire text-base" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Done Tasks
              </p>
              <h4 className="text-xl font-bold text-emerald-500 mt-0.5">{stats.done}</h4>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <i className="fa-solid fa-circle-check text-base" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("bg-card/60 border-border", stats.overdue > 0 && "border-rose-500/40 bg-rose-500/5")}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Overdue Tasks
              </p>
              <h4 className={cn("text-xl font-bold mt-0.5", stats.overdue > 0 ? "text-rose-500" : "text-foreground")}>
                {stats.overdue}
              </h4>
            </div>
            <div className={cn("p-2.5 rounded-xl", stats.overdue > 0 ? "bg-rose-500/20 text-rose-500 animate-pulse" : "bg-muted text-muted-foreground")}>
              <i className="fa-solid fa-triangle-exclamation text-base" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs & Filter Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-card/40 p-4 rounded-xl border border-border">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setCategoryTab("all")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
              categoryTab === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-layer-group" />
            <span>All Tasks</span>
          </button>

          <button
            onClick={() => setCategoryTab("hr")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
              categoryTab === "hr"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-user-check text-amber-400" />
            <span>HR Tasks & Workflows</span>
          </button>

          <button
            onClick={() => setCategoryTab("my")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
              categoryTab === "my"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <i className="fa-solid fa-user-gear text-blue-400" />
            <span>Assigned to Me (HR)</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1 md:flex-none">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search HR tasks..."
              className="pl-9 h-9 text-xs rounded-xl border-border bg-card/80"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-card/80 border border-border rounded-xl font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </select>
        </div>
      </div>

      {/* Main View: Kanban vs Table */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col);
            const isOver = dragOverCol === col;

            return (
              <div
                key={col}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCol(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const taskId = e.dataTransfer.getData("nexace/task-id");
                  if (taskId) {
                    setTasks((prev) =>
                      prev.map((t) => (t._id === taskId ? { ...t, status: col } : t))
                    );
                    await handleStatusChange(taskId, col);
                  }
                }}
                className={cn(
                  "flex flex-col bg-card/40 rounded-2xl border border-border p-4 min-h-[450px] transition-all duration-200",
                  isOver && "border-primary bg-primary/10 scale-[1.01] shadow-xl"
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-2.5 h-2.5 rounded-full",
                        col === "To Do" && "bg-slate-400",
                        col === "In Progress" && "bg-amber-500",
                        col === "Review" && "bg-purple-500",
                        col === "Done" && "bg-emerald-500"
                      )}
                    />
                    <h4 className="font-semibold text-sm text-foreground">{col}</h4>
                  </div>
                  <Badge variant="outline" className="text-xs rounded-lg px-2">
                    {colTasks.length}
                  </Badge>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {colTasks.length === 0 ? (
                    <div
                      className={cn(
                        "h-28 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl text-xs transition-colors",
                        isOver
                          ? "border-primary text-primary bg-primary/5 font-semibold"
                          : "border-border/60 text-muted-foreground"
                      )}
                    >
                      <i className="fa-solid fa-inbox text-lg mb-1 opacity-50" />
                      <span>{isOver ? `Drop task into ${col}` : `No tasks in ${col}`}</span>
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const completedSubtasks = t.subtasks?.filter((s) => s.completed).length || 0;
                      const totalSubtasks = t.subtasks?.length || 0;
                      const subtaskProgress =
                        totalSubtasks > 0
                          ? Math.round((completedSubtasks / totalSubtasks) * 100)
                          : 0;

                      const isHR =
                        t.title.toLowerCase().includes("hr") ||
                        t.title.toLowerCase().includes("onboarding");

                      const isDragging = draggedTaskId === t._id;

                      return (
                        <div
                          key={t._id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("nexace/task-id", t._id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggedTaskId(t._id);
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverCol(null);
                          }}
                          onClick={() => setSelectedTask(t)}
                          className={cn(
                            "group p-4 bg-card rounded-xl border border-border hover:border-primary/50 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative",
                            isDragging && "opacity-40 border-dashed border-primary shadow-inner"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                                t.priority === "High" &&
                                  "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                                t.priority === "Medium" &&
                                  "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                                t.priority === "Low" &&
                                  "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                              )}
                            >
                              {t.priority}
                            </span>

                            {isHR && (
                              <span className="text-[10px] font-medium bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                                <i className="fa-solid fa-user-check text-[9px]" />
                                HR Task
                              </span>
                            )}
                          </div>

                          <h5 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
                            {t.title}
                          </h5>

                          {t.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                              {t.description}
                            </p>
                          )}

                          {totalSubtasks > 0 && (
                            <div className="space-y-1.5 mb-3">
                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <i className="fa-solid fa-list-check text-[10px]" />
                                  Checklist
                                </span>
                                <span className="font-medium">
                                  {completedSubtasks}/{totalSubtasks} ({subtaskProgress}%)
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-300 rounded-full"
                                  style={{ width: `${subtaskProgress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center border border-primary/20 shrink-0">
                                {t.assignee?.name
                                  ? t.assignee.name.slice(0, 2).toUpperCase()
                                  : "UN"}
                              </div>
                              <span className="truncate text-[11px] font-medium">
                                {t.assignee?.name || "Unassigned"}
                              </span>
                            </div>

                            {t.dueDate && (
                              <span
                                className={cn(
                                  "text-[11px] flex items-center gap-1 shrink-0 font-medium px-2 py-0.5 rounded-md",
                                  new Date(t.dueDate) < new Date() && t.status !== "Done"
                                    ? "bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20"
                                    : "text-muted-foreground"
                                )}
                              >
                                <i
                                  className={cn(
                                    "text-[10px]",
                                    new Date(t.dueDate) < new Date() && t.status !== "Done"
                                      ? "fa-solid fa-triangle-exclamation text-rose-500"
                                      : "fa-regular fa-clock"
                                  )}
                                />
                                {new Date(t.dueDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="border-border">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">Task Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Subtasks</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No HR tasks found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const completedSubtasks = t.subtasks?.filter((s) => s.completed).length || 0;
                    const totalSubtasks = t.subtasks?.length || 0;

                    return (
                      <tr
                        key={t._id}
                        className="hover:bg-accent/40 transition-colors cursor-pointer"
                        onClick={() => setSelectedTask(t)}
                      >
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {t.title}
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={t.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(t._id, e.target.value)}
                            className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-medium cursor-pointer"
                          >
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Review">Review</option>
                            <option value="Done">Done</option>
                          </select>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase",
                              t.priority === "High" && "bg-rose-500/10 text-rose-500",
                              t.priority === "Medium" && "bg-amber-500/10 text-amber-500",
                              t.priority === "Low" && "bg-slate-500/10 text-slate-500"
                            )}
                          >
                            {t.priority}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[9px] flex items-center justify-center">
                              {t.assignee?.name ? t.assignee.name.slice(0, 2).toUpperCase() : "U"}
                            </div>
                            <span className="text-xs">{t.assignee?.name || "Unassigned"}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {totalSubtasks > 0 ? (
                            <span className="text-xs font-medium">
                              {completedSubtasks} / {totalSubtasks}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-muted-foreground">
                          {t.dueDate
                            ? new Date(t.dueDate).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            : "—"}
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTask(t)}
                            className="h-7 px-2 text-xs"
                          >
                            Details
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Task Activity History Log View */}
      {viewMode === "history" && (() => {
        const taskLogs = activityLogs.filter(
          (l) => l.action?.includes("TASK") || l.action?.includes("STATUS") || l.action?.includes("PRIORITY") || l.action?.includes("COMMENT")
        );
        const totalHistoryPages = Math.max(1, Math.ceil(taskLogs.length / historyPageSize));
        const paginatedLogs = taskLogs.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);

        return (
          <Card className="border border-border shadow-xs">
            <CardHeader className="border-b border-border bg-muted/20 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-primary" /> Task Activity & Audit Trail
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  Showing {taskLogs.length > 0 ? (historyPage - 1) * historyPageSize + 1 : 0}-
                  {Math.min(taskLogs.length, historyPage * historyPageSize)} of {taskLogs.length} Events (Default 10/page)
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              {taskLogs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <i className="fa-solid fa-history text-3xl text-muted-foreground/40 block mx-auto" />
                  <p className="text-sm font-semibold text-foreground">No task activity logs found</p>
                  <p className="text-xs text-muted-foreground">Task status updates, assignments, and comments will be logged here in real-time.</p>
                </div>
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-border/60">
                  {paginatedLogs.map((log, idx) => (
                    <div key={log._id || idx} className="flex items-start gap-4 relative pl-8 group">
                      {/* Icon Bullet */}
                      <div className={cn(
                        "absolute left-2 top-1.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-card flex items-center justify-center text-[8px]",
                        log.action?.includes("CREATED") ? "border-emerald-500 text-emerald-500" :
                        log.action?.includes("MOVED") || log.action?.includes("STATUS") ? "border-amber-500 text-amber-500" :
                        log.action?.includes("ASSIGNED") ? "border-purple-500 text-purple-500" :
                        log.action?.includes("COMMENT") ? "border-sky-500 text-sky-500" : "border-primary text-primary"
                      )}>
                        <i className={cn(
                          log.action?.includes("CREATED") ? "fa-solid fa-plus" :
                          log.action?.includes("MOVED") ? "fa-solid fa-arrow-right" :
                          log.action?.includes("ASSIGNED") ? "fa-solid fa-user-check" :
                          log.action?.includes("COMMENT") ? "fa-solid fa-comment" : "fa-solid fa-circle"
                        )} />
                      </div>

                      <div className="flex-1 bg-card/60 p-3 rounded-xl border border-border group-hover:border-primary/40 transition-all text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{log.userName || "System User"}</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                              {log.action?.replace("_", " ")}
                            </Badge>
                          </div>
                          {/* 12-Hour AM/PM Time Format */}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(log.createdAt).toLocaleString("en-US", {
                              month: "2-digit",
                              day: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>

                        <p className="text-foreground font-medium">{log.details}</p>
                        {log.targetName && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <i className="fa-solid fa-list-check text-[10px] text-primary" />
                            <span>Task: <strong>{log.targetName}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Pagination Footer Controls for Task History */}
            {taskLogs.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-card/60">
                <div className="text-xs text-muted-foreground font-medium">
                  Showing page <span className="font-bold text-foreground">{historyPage}</span> of{" "}
                  <span className="font-bold text-foreground">{totalHistoryPages}</span> ({taskLogs.length} total entries)
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-left text-[10px]" />
                    <span>Previous</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalHistoryPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalHistoryPages || Math.abs(p - historyPage) <= 1)
                      .map((p, idx, arr) => {
                        const prevP = arr[idx - 1];
                        const showEllipsis = prevP && p - prevP > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="px-1 text-xs text-muted-foreground">...</span>}
                            <Button
                              variant={historyPage === p ? "default" : "outline"}
                              size="sm"
                              onClick={() => setHistoryPage(p)}
                              className={cn("h-8 w-8 text-xs p-0 cursor-pointer", historyPage === p && "font-bold shadow-xs")}
                            >
                              {p}
                            </Button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    disabled={historyPage >= totalHistoryPages}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <span>Next</span>
                    <i className="fa-solid fa-chevron-right text-[10px]" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-plus text-primary" />
                Create New HR Task
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Task Title *</label>
                <Input
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Complete NDA Agreement & Background Check"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide task instructions..."
                  className="w-full p-3 bg-card border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Project Workspace</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs font-medium text-foreground cursor-pointer"
                  >
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Assignee</label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs font-medium text-foreground cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {teamUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full h-9 px-3 bg-card border border-border rounded-xl text-xs font-medium text-foreground cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Due Date</label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">
                  Subtasks Checklist (One item per line)
                </label>
                <textarea
                  rows={2}
                  value={newSubtasksInput}
                  onChange={(e) => setNewSubtasksInput(e.target.value)}
                  placeholder={"Verify Government ID\nSign Offer Letter\nIssue Laptop & ID Badge"}
                  className="w-full p-3 bg-card border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="rounded-xl">
                  {submitting ? "Creating..." : "Create Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Task Details Pop-Up Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl p-6 shadow-2xl flex flex-col space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Task Details
                </span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-muted/40 rounded-xl border border-border text-xs">
                <div>
                  <span className="text-muted-foreground font-medium block">Status</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleStatusChange(selectedTask._id, e.target.value)}
                    className="mt-1 bg-card border border-border rounded-lg px-2 py-1 font-semibold text-foreground cursor-pointer w-full text-xs"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Review">Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                <div>
                  <span className="text-muted-foreground font-medium block">Priority</span>
                  <Badge className="mt-1" variant="outline">
                    {selectedTask.priority}
                  </Badge>
                </div>

                <div>
                  <span className="text-muted-foreground font-medium block">Assignee</span>
                  <p className="mt-1 font-semibold text-foreground truncate">
                    {selectedTask.assignee?.name || "Unassigned"}
                  </p>
                </div>

                <div>
                  <span className="text-muted-foreground font-medium block">Due Date</span>
                  <p className="mt-1 font-semibold text-foreground font-mono">
                    {selectedTask.dueDate
                      ? new Date(selectedTask.dueDate).toLocaleDateString()
                      : "No deadline"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-1.5">
                  Description
                </h4>
                <p className="text-xs text-foreground bg-card p-3 rounded-xl border border-border leading-relaxed">
                  {selectedTask.description || "No description provided."}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-2 flex items-center justify-between">
                  <span>Subtasks Checklist</span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {selectedTask.subtasks?.filter((s) => s.completed).length || 0} /{" "}
                    {selectedTask.subtasks?.length || 0} completed
                  </span>
                </h4>

                <div className="space-y-2">
                  {selectedTask.subtasks?.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No subtasks created.</p>
                  ) : (
                    selectedTask.subtasks.map((st, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleToggleSubtask(selectedTask, idx)}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card/60 hover:bg-accent/50 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => {}}
                          className="rounded border-border cursor-pointer"
                        />
                        <span
                          className={cn(
                            "text-xs font-medium text-foreground",
                            st.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {st.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-2.5">
                  Discussion Comments
                </h4>

                <div className="space-y-2.5 mb-3.5 max-h-40 overflow-y-auto pr-1">
                  {selectedTask.comments?.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                  ) : (
                    selectedTask.comments?.map((c, i) => (
                      <div key={i} className="p-3 bg-muted/40 border border-border rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{c.userName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(c.createdAt).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                        <p className="text-foreground">{c.content}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Write a comment..."
                    className="text-xs rounded-xl"
                  />
                  <Button type="submit" size="sm" className="rounded-xl">
                    Post
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
