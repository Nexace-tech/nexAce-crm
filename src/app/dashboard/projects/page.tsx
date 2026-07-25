"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  FolderGit2, 
  GanttChart, 
  BookOpen, 
  HardDrive, 
  PieChart, 
  History, 
  Plus, 
  Download, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Trash2,
  Upload,
  FolderPlus,
  Search,
  Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"kanban" | "gantt" | "wiki" | "drive" | "workload" | "history">("kanban");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString(undefined, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskSprint, setNewTaskSprint] = useState("");

  const [wikiArticles, setWikiArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);

  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [driveFolder, setDriveFolder] = useState<string>("/");

  const columns = ["To Do", "In Progress", "Review", "Done"];

  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        if (data.projects && data.projects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data.projects[0]._id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTasks = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/tasks?projectId=${selectedProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActivityLogs = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(`/api/activity-logs?projectId=${selectedProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDriveFiles = async () => {
    try {
      const res = await fetch("/api/drive");
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("fileName", uploadName || uploadFile.name);
      formData.append("folder", driveFolder);

      const res = await fetch("/api/drive", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        showToast("File uploaded successfully!", "success");
        setUploadFile(null);
        setUploadName("");
        await fetchDriveFiles();
        fetchActivityLogs();
      } else {
        const err = await res.json();
        showToast(err.error || "Upload failed", "error");
      }
    } catch (e) {
      showToast("File upload error", "error");
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/drive?fileId=${fileId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("File deleted", "success");
        await fetchDriveFiles();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete file", "error");
      }
    } catch (e) {
      showToast("Error deleting file", "error");
    }
  };

  useEffect(() => {
    if (!mounted) return;
    const init = async () => {
      setLoading(true);
      await fetchProjects();
      await fetchTeam();
      await fetchDriveFiles();
      setLoading(false);
    };
    init();
  }, [mounted]);

  useEffect(() => {
    if (mounted && selectedProjectId) {
      fetchTasks();
      fetchActivityLogs();
    }
  }, [selectedProjectId, mounted]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjName, description: newProjDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchProjects();
        setSelectedProjectId(data.project._id);
        setShowProjectForm(false);
        setNewProjName("");
        setNewProjDesc("");
        showToast("Project created successfully!", "success");

        // Log history
        await fetch("/api/activity-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: data.project._id,
            action: "Project Created",
            targetName: newProjName,
            details: `Created new project "${newProjName}"`
          })
        });
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to create project.", "error");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !selectedProjectId) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          projectId: selectedProjectId,
          assignee: newTaskAssignee || undefined,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || undefined,
          sprintId: newTaskSprint || undefined,
        }),
      });

      if (res.ok) {
        await fetchTasks();
        setShowTaskForm(false);
        setNewTaskTitle("");
        setNewTaskDesc("");
        showToast("Task created successfully!", "success");

        // Log history
        await fetch("/api/activity-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: selectedProjectId,
            action: "Task Created",
            targetName: newTaskTitle,
            details: `Task "${newTaskTitle}" created with priority ${newTaskPriority}`
          })
        });
        fetchActivityLogs();
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to create task.", "error");
    }
  };

  const handleMoveTaskStatus = async (taskId: string, targetStatus: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: targetStatus }),
      });
      if (res.ok) {
        const movedTask = tasks.find(t => t._id === taskId);
        await fetchTasks();

        // Log history
        await fetch("/api/activity-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: selectedProjectId,
            action: "Task Status Moved",
            targetName: movedTask?.title || "Task",
            details: `Moved task status to ${targetStatus}`
          })
        });
        fetchActivityLogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground text-sm">
        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mr-3" />
        Loading Projects Workspace...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
            toast.type === "success"
              ? "bg-emerald-500/90 text-white border-emerald-600"
              : "bg-destructive/90 text-white border-destructive"
          )}
        >
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects & Drive</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kanban sprint board, project timelines, wiki knowledge docs, and file drive.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowProjectForm(true)} className="gap-2">
            <FolderPlus className="w-4 h-4" /> New Project
          </Button>
          <Button color="primary" size="sm" onClick={() => setShowTaskForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => startTransition(() => setActiveTab("kanban"))}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "kanban"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FolderGit2 className="w-4 h-4" /> Kanban Board
        </button>

        <button
          onClick={() => startTransition(() => setActiveTab("gantt"))}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "gantt"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <GanttChart className="w-4 h-4" /> Gantt Timeline
        </button>

        <button
          onClick={() => startTransition(() => setActiveTab("wiki"))}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "wiki"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="w-4 h-4" /> SOP Wiki
        </button>

        <button
          onClick={() => startTransition(() => setActiveTab("drive"))}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "drive"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <HardDrive className="w-4 h-4" /> Drive Space
        </button>

        <button
          onClick={() => startTransition(() => setActiveTab("history"))}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "history"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <History className="w-4 h-4" /> Project History
        </button>
      </div>

      {/* Project Selector Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-sm font-semibold text-foreground shrink-0">Active Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary flex-1 sm:w-64"
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProjectId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Total Tasks: <strong className="text-foreground">{tasks.length}</strong></span>
          </div>
        )}
      </Card>

      {/* Kanban Board View */}
      {activeTab === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => (t.status || "To Do") === col);
            const isOver = dragOverCol === col;

            const colAccentMap: Record<string, string> = {
              "To Do": "border-slate-400",
              "In Progress": "border-blue-500",
              "Review": "border-amber-500",
              "Done": "border-emerald-500",
            };
            const colDotMap: Record<string, string> = {
              "To Do": "bg-slate-400",
              "In Progress": "bg-blue-500",
              "Review": "bg-amber-500",
              "Done": "bg-emerald-500",
            };

            return (
              <div
                key={col}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                onDragLeave={(e) => {
                  // Only clear if leaving the column container itself (not a child)
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverCol(null);
                  }
                }}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const id = e.dataTransfer.getData("nexace/task-id");
                  if (id && id !== col) {
                    // Optimistic UI update
                    setTasks((prev: any[]) =>
                      prev.map((t) => t._id === id ? { ...t, status: col } : t)
                    );
                    await handleMoveTaskStatus(id, col);
                  }
                }}
                className={cn(
                  "flex flex-col rounded-xl border-2 bg-card p-4 space-y-3 transition-all duration-150",
                  isOver
                    ? `${colAccentMap[col]} bg-primary/5 scale-[1.01] shadow-lg`
                    : "border-border"
                )}
              >
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", colDotMap[col])} /> {col}
                  </h3>
                  <Badge color="primary" variant="soft" rounded="full">
                    {colTasks.length}
                  </Badge>
                </div>

                <div className="space-y-3 min-h-[300px]">
                  {colTasks.length === 0 ? (
                    <div
                      className={cn(
                        "h-28 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed rounded-lg transition-colors",
                        isOver ? `${colAccentMap[col]} text-foreground` : "border-border"
                      )}
                    >
                      {isOver ? `Drop here → ${col}` : `No tasks in ${col}`}
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <Card
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
                          "cursor-grab active:cursor-grabbing hover:shadow-md transition-all p-3 space-y-2 border-l-2",
                          colAccentMap[col],
                          draggedTaskId === t._id && "opacity-40 scale-95"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-xs text-foreground line-clamp-2">{t.title}</p>
                          <Badge
                            color={t.priority === "High" ? "destructive" : t.priority === "Medium" ? "warning" : "info"}
                            className="text-[10px] px-1.5 py-0 shrink-0"
                          >
                            {t.priority}
                          </Badge>
                        </div>
                        {t.description && <p className="text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                          <span>{t.assignee?.name || "Unassigned"}</span>
                          {t.dueDate && <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drive Space Tab View */}
      {activeTab === "drive" && (
        <div className="space-y-6">
          <Card className="p-5">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" /> Upload File to Drive
              </CardTitle>
              <CardDescription font-normal text-xs>Store assets, project specs, and documents securely in workspace drive storage.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-2">
              <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row items-end gap-3">
                <div className="space-y-1 flex-1 w-full">
                  <label className="text-xs font-semibold text-foreground">Select File</label>
                  <Input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        if (!uploadName) setUploadName(e.target.files[0].name);
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-1 flex-1 w-full">
                  <label className="text-xs font-semibold text-foreground">Display Name (Optional)</label>
                  <Input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g. Project_Brief_v2.pdf"
                  />
                </div>
                <Button color="primary" size="sm" type="submit" disabled={!uploadFile} className="gap-2 shrink-0 h-9">
                  <Upload className="w-4 h-4" /> Upload
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="p-5">
            <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-primary" /> Drive Files & Assets ({driveFiles.length})
                </CardTitle>
                <CardDescription>File repository accessible across your workspace</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0 pt-2">
              {driveFiles.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm space-y-1">
                  <HardDrive className="w-8 h-8 mx-auto stroke-1 opacity-50 text-primary" />
                  <p className="font-medium">No files uploaded yet.</p>
                  <p className="text-xs">Use the upload box above to add your first file to Drive Space.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {driveFiles.map((file) => (
                    <div key={file._id} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all flex flex-col justify-between space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-foreground truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {Math.round((file.size || 0) / 1024)} KB • {new Date(file.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteFile(file._id)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                          title="Delete File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border pt-2">
                        <span>By {file.uploadedBy?.name || "Member"}</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {file.mimeType?.split("/")[1] || "file"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project History Tab View */}
      {activeTab === "history" && (
        <Card className="p-5">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Project Activity History
            </CardTitle>
            <CardDescription>Audit timeline of actions and changes within this project</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {activityLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm space-y-1">
                <History className="w-8 h-8 mx-auto stroke-1 opacity-50" />
                <p>No activity logged for this project yet.</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border">
                {activityLogs.map((log) => (
                  <div key={log._id} className="relative flex items-start gap-4 pl-8">
                    <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary" />
                    <div className="p-3 rounded-lg border border-border bg-card shadow-xs flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">{log.userName} ({log.userRole || "Member"})</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-semibold text-primary">{log.action}: {log.targetName}</p>
                      {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
