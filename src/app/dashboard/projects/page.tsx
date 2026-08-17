"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";

import { useTabPersistence } from "@/hooks/useTabPersistence";

export default function ProjectsPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { can, isAdmin, isOPS } = usePermissions();
  const [activeTab, setActiveTab] = useTabPersistence<"kanban" | "gantt" | "wiki" | "drive" | "workload" | "history">(
    "projects_active_tab",
    "kanban",
    ["kanban", "gantt", "wiki", "drive", "workload", "history"]
  );
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
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [newProjAssignType, setNewProjAssignType] = useState<"Member" | "Department">("Member");
  const [newProjAssignDept, setNewProjAssignDept] = useState("");
  const [newProjMembers, setNewProjMembers] = useState<string[]>([]);
  const [newProjStartDate, setNewProjStartDate] = useState("");
  const [newProjDueDate, setNewProjDueDate] = useState("");
  const [newProjCost, setNewProjCost] = useState("");
  const [newProjIsInternal, setNewProjIsInternal] = useState(true);
  const [newProjRequirements, setNewProjRequirements] = useState("");
  const [newProjRequirementFile, setNewProjRequirementFile] = useState<File | null>(null);
  const [newProjStatus, setNewProjStatus] = useState("Planning");
  const [departments, setDepartments] = useState<any[]>([]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskSprint, setNewTaskSprint] = useState("");

  const [wikiArticles, setWikiArticles] = useState<any[]>([
    {
      _id: "sop-1",
      title: "Client Onboarding & Initial Setup Workflow",
      category: "Operations",
      content: "Step 1: Create client account in CRM dashboard.\nStep 2: Assign dedicated Account Manager and Technical Lead.\nStep 3: Schedule kick-off discovery call within 48 hours.\nStep 4: Share Workspace Drive folder & project portal credentials.",
      author: "NexAce Admin",
      updatedAt: new Date().toISOString()
    },
    {
      _id: "sop-2",
      title: "Sprint Planning & Code Review SOP",
      category: "Engineering",
      content: "All feature branches must have corresponding unit test coverage.\nPull Requests require approval from at least 1 Senior Lead before merging to production.\nPerform database schema migrations during scheduled maintenance windows.",
      author: "Tech Lead",
      updatedAt: new Date().toISOString()
    },
    {
      _id: "sop-3",
      title: "Customer Support Escalation SLA Matrix",
      category: "Support",
      content: "Priority 1 (Critical Outage): Initial response within 15 minutes. Resolution SLA: 2 hours.\nPriority 2 (High Severity): Initial response within 1 hour. Resolution SLA: 6 hours.\nPriority 3 (General Query): Initial response within 4 hours. Resolution SLA: 24 hours.",
      author: "Support Operations",
      updatedAt: new Date().toISOString()
    }
  ]);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [showWikiForm, setShowWikiForm] = useState(false);
  const [newWikiTitle, setNewWikiTitle] = useState("");
  const [newWikiCategory, setNewWikiCategory] = useState("Operations");
  const [newWikiContent, setNewWikiContent] = useState("");

  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [driveFolder, setDriveFolder] = useState<string>("/");
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<any | null>(null);

  // Multi-select & Batch operations & Preview Lightbox state
  const [selectedDriveFileIds, setSelectedDriveFileIds] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState<boolean>(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState<boolean>(false);

  // Project Activity History Pagination state
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState<number>(5);
  const [historyShowAll, setHistoryShowAll] = useState<boolean>(false);

  const columns = ["To Do", "In Progress", "Review", "Done"];

  // Board Sidebar & Filter state
  const [boardFilter, setBoardFilter] = useState<"all" | "starred">("all");
  const [boardSidebarCollapsed, setBoardSidebarCollapsed] = useState<boolean>(false);

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
        const list = data.projects || [];
        setProjects(list);
        await fetchTasks(selectedProjectId || "all");
        await fetchActivityLogs(selectedProjectId || "all");
        return list;
      }
    } catch (e) {
      console.error("fetchProjects error:", e);
    }
    return [];
  };

  const fetchTasks = async (overrideProjectId?: string) => {
    const pId = overrideProjectId !== undefined ? overrideProjectId : selectedProjectId;
    try {
      const url = pId && pId !== "all" ? `/api/tasks?projectId=${pId}` : "/api/tasks";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error("fetchTasks error:", e);
    }
  };

  const fetchActivityLogs = async (overrideProjectId?: string) => {
    const pId = overrideProjectId !== undefined ? overrideProjectId : selectedProjectId;
    try {
      const url = pId && pId !== "all" ? `/api/activity-logs?projectId=${pId}` : "/api/activity-logs";
      const res = await fetch(url);
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
      const deptRes = await fetch("/api/departments");
      if (deptRes.ok) {
        const dData = await deptRes.json();
        setDepartments(dData.departments || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [allowedExtensions, setAllowedExtensions] = useState<string[]>([]);

  const fetchDriveFiles = async () => {
    try {
      const res = await fetch("/api/drive");
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      }
      const settingsRes = await fetch("/api/settings/allowed-files");
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setAllowedExtensions(sData.allowedExtensions || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWikiArticles = async () => {
    try {
      const res = await fetch("/api/wiki");
      if (res.ok) {
        const data = await res.json();
        if (data.articles && data.articles.length > 0) {
          setWikiArticles(data.articles.map((art: any) => ({
            ...art,
            author: art.createdBy?.name || "Team Member"
          })));
        }
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
        showToast("File deleted successfully!", "success");
        setDeleteConfirmFile(null);
        setSelectedDriveFileIds((prev) => prev.filter((id) => id !== fileId));
        await fetchDriveFiles();
        fetchActivityLogs();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete file", "error");
      }
    } catch (e) {
      showToast("Error deleting file", "error");
    }
  };

  const toggleSelectDriveFile = (fileId: string) => {
    setSelectedDriveFileIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSelectAllDriveFiles = () => {
    if (selectedDriveFileIds.length === driveFiles.length) {
      setSelectedDriveFileIds([]);
    } else {
      setSelectedDriveFileIds(driveFiles.map((f) => f._id));
    }
  };

  const handleBatchDownloadDriveFiles = () => {
    const selectedFiles = driveFiles.filter((f) => selectedDriveFileIds.includes(f._id));
    if (selectedFiles.length === 0) return;

    selectedFiles.forEach((file, index) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = `/api/drive/download?fileId=${file._id}`;
        a.download = file.name;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 350);
    });
    showToast(`Downloading ${selectedFiles.length} file(s)...`, "success");
  };

  const handleBatchDeleteDriveFiles = async () => {
    if (selectedDriveFileIds.length === 0) return;
    setIsDeletingBatch(true);

    let successCount = 0;
    for (const fileId of selectedDriveFileIds) {
      try {
        const res = await fetch(`/api/drive?fileId=${fileId}`, { method: "DELETE" });
        if (res.ok) successCount++;
      } catch (e) {
        console.error(e);
      }
    }

    setIsDeletingBatch(false);
    setShowBatchDeleteModal(false);
    setSelectedDriveFileIds([]);
    showToast(`Successfully deleted ${successCount} file(s)`, "success");
    await fetchDriveFiles();
    fetchActivityLogs();
  };

  useEffect(() => {
    if (!mounted) return;
    const init = async () => {
      setLoading(true);
      await fetchProjects();
      await fetchTeam();
      await fetchDriveFiles();
      await fetchWikiArticles();
      setLoading(false);
    };
    init();
  }, [mounted]);

  useEffect(() => {
    if (mounted && selectedProjectId) {
      fetchTasks();
      fetchActivityLogs();
    } else if (mounted && !selectedProjectId) {
      setTasks([]);
      setActivityLogs([]);
    }
  }, [selectedProjectId, activeTab, mounted]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName) return;

    try {
      let requirementDocUrl = "";
      if (newProjRequirementFile) {
        const formData = new FormData();
        formData.append("file", newProjRequirementFile);
        formData.append("fileName", `Requirement_${newProjName}_${newProjRequirementFile.name}`);
        formData.append("folder", "/Requirements");
        const driveRes = await fetch("/api/drive", { method: "POST", body: formData });
        if (driveRes.ok) {
          const driveData = await driveRes.json();
          requirementDocUrl = driveData.file?.url || "";
        }
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjName,
          description: newProjDesc,
          status: newProjStatus,
          startDate: newProjStartDate || undefined,
          dueDate: newProjDueDate || undefined,
          cost: newProjCost ? Number(newProjCost) : 0,
          isInternal: newProjIsInternal,
          requirements: newProjRequirements ? (requirementDocUrl ? `${newProjRequirements}\n\nAttachment: ${newProjRequirementFile?.name}` : newProjRequirements) : (newProjRequirementFile ? `Attachment: ${newProjRequirementFile.name}` : ""),
          assignType: newProjAssignType,
          assignedDepartment: newProjAssignType === "Department" ? newProjAssignDept : undefined,
          members: newProjAssignType === "Member" ? newProjMembers : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchProjects();
        setSelectedProjectId(data.project._id);
        setShowProjectForm(false);
        setNewProjName("");
        setNewProjDesc("");
        setNewProjStartDate("");
        setNewProjDueDate("");
        setNewProjCost("");
        setNewProjIsInternal(true);
        setNewProjRequirements("");
        setNewProjRequirementFile(null);
        setNewProjMembers([]);
        setNewProjAssignDept("");
        setNewProjStatus("Planning");
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
    return <Preloader label="Loading Projects Workspace..." />;
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
          <i className={cn("fa-solid text-sm", toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation")} />
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
          {can("createProjects") && (
            <Button variant="outline" size="sm" onClick={() => setShowProjectForm(true)} className="gap-2 font-semibold">
              <i className="fa-solid fa-folder-plus text-xs" /> New Project
            </Button>
          )}
          <Button color="primary" size="sm" onClick={() => setShowTaskForm(true)} className="gap-2 font-semibold">
            <i className="fa-solid fa-plus text-xs" /> Create Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("kanban")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "kanban"
              ? "border-primary text-white bg-primary/10 rounded-t-md font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-square-kanban text-sm" /> Kanban Board
        </button>

        <button
          onClick={() => setActiveTab("gantt")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "gantt"
              ? "border-primary text-white bg-primary/10 rounded-t-md font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-chart-gantt text-sm" /> Gantt Timeline
        </button>

        <button
          onClick={() => setActiveTab("wiki")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "wiki"
              ? "border-primary text-white bg-primary/10 rounded-t-md font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-book text-sm" /> SOP Wiki
        </button>

        <button
          onClick={() => setActiveTab("drive")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "drive"
              ? "border-primary text-white bg-primary/10 rounded-t-md font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-hard-drive text-sm" /> Drive Space
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "history"
              ? "border-primary text-white bg-primary/10 rounded-t-md font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-clock-rotate-left text-sm" /> Project History
        </button>
      </div>

      {/* Project Selector Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground shrink-0">Active Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                fetchTasks(val);
              }}
              className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64 cursor-pointer"
            >
              <option value="all">⚡ All Projects (Combined Workspace View)</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  📁 {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs bg-muted/30">
              <i className="fa-solid fa-folder-closed text-primary text-[11px]" />
              Total Projects: <strong className="text-foreground">{projects.length}</strong>
            </Badge>

            <Badge variant="outline" className="gap-1.5 px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
              <i className="fa-solid fa-circle-play text-emerald-500 text-[11px]" />
              Active Projects: <strong className="text-emerald-500">{projects.filter((p) => p.status === "In Progress" || p.status === "Planning" || !p.status).length}</strong>
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge color="primary" variant="soft" className="gap-1.5 px-2.5 py-1 text-xs font-semibold">
            <i className="fa-solid fa-list-check text-[11px]" />
            Total Tasks: <strong className="text-primary-foreground">{tasks.length}</strong>
          </Badge>
        </div>
      </Card>

      {/* Kanban Board View */}
      {activeTab === "kanban" && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Board Sidebar */}
          <div
            className={cn(
              "relative bg-[#141b1f] border-r border-[#26343b] rounded-2xl p-4 transition-all duration-300 shrink-0 w-full lg:w-auto",
              boardSidebarCollapsed ? "lg:w-16" : "lg:w-64"
            )}
          >
            {/* Collapse Toggle Button on vertical divider */}
            <button
              onClick={() => setBoardSidebarCollapsed(!boardSidebarCollapsed)}
              className="hidden lg:flex absolute -right-3 top-10 z-20 w-6 h-6 rounded-full bg-[#1c262b] border border-[#2e3e46] text-slate-300 hover:text-white items-center justify-center shadow-md cursor-pointer text-xs transition-colors"
              title={boardSidebarCollapsed ? "Expand Board Sidebar" : "Collapse Board Sidebar"}
            >
              <i className={cn("fa-solid", boardSidebarCollapsed ? "fa-chevron-right" : "fa-chevron-left")} />
            </button>

            {!boardSidebarCollapsed ? (
              <div className="space-y-4">
                {/* Oval Pill Add New Board Button */}
                <button
                  onClick={() => setShowProjectForm(true)}
                  className="w-full bg-[#006970] hover:bg-[#00575d] active:scale-[0.98] text-white font-medium text-sm py-2.5 px-6 rounded-full transition-all duration-200 shadow-md shadow-[#006970]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Add New Board</span>
                </button>

                {/* Sidebar Menu Items */}
                <div className="space-y-1.5 pt-1">
                  {/* All Boards (Active Container) */}
                  <button
                    onClick={() => setBoardFilter("all")}
                    className={cn(
                      "w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer",
                      boardFilter === "all"
                        ? "bg-[#0d3135] text-[#30b8bd] shadow-xs"
                        : "text-white hover:bg-[#0e272a] hover:text-[#30b8bd]"
                    )}
                  >
                    <i className="fa-solid fa-table-cells-large text-lg" />
                    <span>All Boards</span>
                  </button>

                  {/* Stared Boards (Inactive Container) */}
                  <button
                    onClick={() => setBoardFilter("starred")}
                    className={cn(
                      "w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all cursor-pointer",
                      boardFilter === "starred"
                        ? "bg-[#0d3135] text-[#30b8bd] shadow-xs"
                        : "text-white hover:bg-[#0e272a] hover:text-[#30b8bd]"
                    )}
                  >
                    <i className="fa-regular fa-star text-lg" />
                    <span>Stared Boards</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 pt-2">
                <button
                  onClick={() => setShowProjectForm(true)}
                  className="w-10 h-10 bg-[#006970] hover:bg-[#00575d] text-white rounded-full flex items-center justify-center shadow-md cursor-pointer"
                  title="Add New Board"
                >
                  <i className="fa-solid fa-plus text-sm" />
                </button>
                <button
                  onClick={() => setBoardFilter("all")}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors",
                    boardFilter === "all" ? "bg-[#0d3135] text-[#30b8bd]" : "text-white hover:bg-[#0e272a]"
                  )}
                  title="All Boards"
                >
                  <i className="fa-solid fa-table-cells-large text-base" />
                </button>
                <button
                  onClick={() => setBoardFilter("starred")}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors",
                    boardFilter === "starred" ? "bg-[#0d3135] text-[#30b8bd]" : "text-white hover:bg-[#0e272a]"
                  )}
                  title="Stared Boards"
                >
                  <i className="fa-regular fa-star text-base" />
                </button>
              </div>
            )}
          </div>

          {/* Kanban Columns Grid */}
          <div className="flex-1 min-w-0 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => (t.status || "To Do") === col);
            const isOver = dragOverCol === col;

            const colAccentMap: Record<string, string> = {
              "To Do": "border-sky-400",
              "In Progress": "border-indigo-500",
              "Review": "border-amber-500",
              "Done": "border-emerald-500",
            };
            const colBorderMap: Record<string, string> = {
              "To Do": "border-sky-500/40 dark:border-sky-500/50 hover:border-sky-500/80 shadow-sky-500/5",
              "In Progress": "border-indigo-500/40 dark:border-indigo-500/50 hover:border-indigo-500/80 shadow-indigo-500/5",
              "Review": "border-amber-500/40 dark:border-amber-500/50 hover:border-amber-500/80 shadow-amber-500/5",
              "Done": "border-emerald-500/40 dark:border-emerald-500/50 hover:border-emerald-500/80 shadow-emerald-500/5",
            };
            const colDotMap: Record<string, string> = {
              "To Do": "bg-sky-400",
              "In Progress": "bg-indigo-500",
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
                  "flex flex-col rounded-xl border-2 bg-card/90 dark:bg-slate-900/90 p-4 space-y-3 transition-all duration-200 shadow-md",
                  colBorderMap[col],
                  isOver && `${colAccentMap[col]} bg-primary/10 scale-[1.02] shadow-xl border-4`
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
                        "h-32 flex flex-col items-center justify-center gap-2 p-3 text-xs text-muted-foreground border-2 border-dashed rounded-xl transition-all",
                        isOver ? `${colAccentMap[col]} text-foreground bg-primary/5` : "border-border/60 hover:border-border hover:bg-muted/10"
                      )}
                    >
                      <span>{isOver ? `Drop here → ${col}` : `No tasks in ${col}`}</span>
                      {col === "To Do" && (
                        <button
                          onClick={() => setShowTaskForm(true)}
                          className="px-3 py-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <i className="fa-solid fa-plus text-[10px]" /> Add First Task
                        </button>
                      )}
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
                          "cursor-grab active:cursor-grabbing hover:shadow-md transition-all p-3.5 space-y-2.5 border-l-4 bg-card dark:bg-slate-800 border border-border/80 shadow-sm opacity-100",
                          colAccentMap[col]
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-xs text-foreground leading-snug line-clamp-2">{t.title}</p>
                          <Badge
                            color={t.priority === "High" ? "destructive" : t.priority === "Medium" ? "warning" : "info"}
                            className="text-[10px] px-1.5 py-0 shrink-0 font-semibold"
                          >
                            {t.priority}
                          </Badge>
                        </div>
                        {selectedProjectId === "all" && t.projectId?.name && (
                          <div className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                            <i className="fa-solid fa-folder text-[9px]" /> {t.projectId.name}
                          </div>
                        )}
                        {t.description && <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-2">{t.description}</p>}
                        <div className="flex items-center justify-between text-[10px] text-foreground/70 font-medium pt-1.5 border-t border-border/40">
                          <span className="flex items-center gap-1">
                            <i className="fa-solid fa-user text-[9px] text-primary" /> {t.assignee?.name || "Unassigned"}
                          </span>
                          {t.dueDate && (
                            <span className="flex items-center gap-1 font-mono">
                              <i className="fa-solid fa-calendar-day text-[9px] text-muted-foreground" /> Due: {new Date(t.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Gantt Timeline View */}
      {activeTab === "gantt" && (
        <Card className="p-6 border border-border/80 bg-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-chart-gantt text-primary text-sm" /> Interactive Gantt Schedule & Workload Timeline
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visual timeline mapping task schedules, assignees, priorities, and project deadlines.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/30">
                {tasks.length} Scheduled Tasks
              </Badge>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <i className="fa-solid fa-chart-gantt text-4xl opacity-40 text-primary block mb-2" />
              <p className="font-semibold text-foreground">No tasks scheduled for Gantt view</p>
              <p className="text-xs">Create tasks for this project to visualize timeline dependencies and due dates.</p>
              <Button color="primary" size="sm" onClick={() => setShowTaskForm(true)} className="gap-2 mt-3">
                <i className="fa-solid fa-plus text-xs" /> Create First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Gantt Schedule Header Legend */}
              <div className="grid grid-cols-12 gap-3 text-xs font-bold text-muted-foreground uppercase border-b border-border pb-2 px-2">
                <div className="col-span-4 sm:col-span-3">Task Name</div>
                <div className="col-span-3 sm:col-span-2">Assignee</div>
                <div className="col-span-2 sm:col-span-2 text-center">Status</div>
                <div className="col-span-3 sm:col-span-5">Timeline Schedule Bar</div>
              </div>

              {/* Gantt Task Rows */}
              <div className="space-y-3">
                {tasks.map((task) => {
                  const created = new Date(task.createdAt || Date.now());
                  const due = task.dueDate ? new Date(task.dueDate) : new Date(Date.now() + 86400000 * 7);

                  const today = new Date();
                  const totalDays = Math.max(1, Math.ceil((due.getTime() - created.getTime()) / (1000 * 3600 * 24)));
                  const elapsedDays = Math.max(0, Math.ceil((today.getTime() - created.getTime()) / (1000 * 3600 * 24)));
                  const progressPct = task.status === "Done" ? 100 : Math.min(100, Math.max(10, Math.round((elapsedDays / totalDays) * 100)));

                  const statusColorMap: Record<string, string> = {
                    "To Do": "bg-sky-500",
                    "In Progress": "bg-indigo-500",
                    "Review": "bg-amber-500",
                    "Done": "bg-emerald-500",
                  };

                  return (
                    <div
                      key={task._id}
                      onClick={() => setSelectedTask(task)}
                      className="grid grid-cols-12 gap-3 items-center p-3 rounded-lg border border-border/70 bg-muted/20 hover:bg-accent/30 transition-all cursor-pointer text-xs group"
                    >
                      <div className="col-span-4 sm:col-span-3 font-semibold text-foreground truncate flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", statusColorMap[task.status] || "bg-primary")} />
                        <span className="truncate group-hover:text-primary transition-colors">{task.title}</span>
                      </div>

                      <div className="col-span-3 sm:col-span-2 text-muted-foreground truncate flex items-center gap-1.5">
                        <i className="fa-solid fa-user-circle text-primary/70 text-xs" />
                        <span className="truncate">{task.assignee?.name || "Unassigned"}</span>
                      </div>

                      <div className="col-span-2 sm:col-span-2 text-center">
                        <Badge
                          color={task.status === "Done" ? "success" : task.status === "Review" ? "warning" : task.status === "In Progress" ? "primary" : "info"}
                          variant="soft"
                          className="text-[10px] px-2 py-0.5"
                        >
                          {task.status}
                        </Badge>
                      </div>

                      <div className="col-span-3 sm:col-span-5 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span className="font-mono">Start: {created.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          <span className="font-bold text-foreground font-mono">{progressPct}%</span>
                          <span className="font-mono">Due: {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="h-3 w-full bg-muted/70 rounded-full overflow-hidden p-0.5 border border-border/50">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500 shadow-xs", statusColorMap[task.status] || "bg-primary")}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* SOP Wiki Knowledgebase Tab View */}
      {activeTab === "wiki" && (
        <div className="space-y-6">
          <Card className="p-6 border border-border/80 bg-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-book text-primary text-sm" /> SOP Knowledgebase & Internal Wiki
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Standard operating procedures, team documentation, and organizational playbooks.
                </p>
              </div>
              <Button color="primary" size="sm" onClick={() => setShowWikiForm(true)} className="gap-2 font-semibold">
                <i className="fa-solid fa-plus text-xs" /> Publish New SOP Article
              </Button>
            </div>

            {/* SOP Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {wikiArticles.map((article) => (
                <div
                  key={article._id}
                  onClick={() => setSelectedArticle(article)}
                  className="p-5 rounded-xl border border-border/80 bg-muted/20 hover:bg-accent/30 hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between space-y-4 group shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge color="primary" variant="soft" className="text-[10px] font-semibold">
                        {article.category}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(article.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-line">
                      {article.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50 text-[11px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5">
                      <i className="fa-solid fa-feather-pointed text-primary text-xs" /> {article.author}
                    </span>
                    <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Read SOP <i className="fa-solid fa-arrow-right text-[10px]" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      {activeTab === "drive" && (
        <div className="space-y-6">
          <Card className="p-5">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-cloud-arrow-up text-primary text-sm" /> Upload File to Drive
              </CardTitle>
              <CardDescription className="font-normal text-xs">Store assets, project specs, and documents securely in workspace drive storage.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pt-2">
              <form onSubmit={handleFileUpload} className="space-y-4">
                {allowedExtensions.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
                    <i className="fa-solid fa-shield-halved text-primary text-xs" />
                    <span>Allowed File Types (Admin Managed):</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {allowedExtensions.map((ext) => (
                        <span key={ext} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px] uppercase font-bold border border-primary/20">
                          .{ext}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row items-end gap-3">
                  <div className="space-y-1 flex-1 w-full">
                    <label className="text-xs font-semibold text-foreground">Select File</label>
                    <Input
                      type="file"
                      accept={allowedExtensions.map((e) => `.${e}`).join(",")}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const selected = e.target.files[0];
                          const ext = selected.name.includes(".") ? selected.name.split(".").pop()?.toLowerCase() || "" : "";
                          if (allowedExtensions.length > 0 && ext && !allowedExtensions.includes(ext)) {
                            showToast(`File type .${ext} is not allowed. Allowed: ${allowedExtensions.map(e => `.${e}`).join(", ")}`, "error");
                            e.target.value = "";
                            setUploadFile(null);
                            return;
                          }
                          setUploadFile(selected);
                          if (!uploadName) setUploadName(selected.name);
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
                  <Button color="primary" size="sm" type="submit" disabled={!uploadFile} className="gap-2 shrink-0 h-9 font-semibold">
                    <i className="fa-solid fa-upload text-xs" /> Upload
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="p-5">
            <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-hard-drive text-primary text-sm" /> Drive Files & Assets ({driveFiles.length})
                </CardTitle>
                <CardDescription>File repository accessible across your workspace</CardDescription>
              </div>

              {driveFiles.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllDriveFiles}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <i className={cn("fa-solid text-xs", selectedDriveFileIds.length === driveFiles.length ? "fa-square-check text-primary" : "fa-square")} />
                    {selectedDriveFileIds.length === driveFiles.length ? "Deselect All" : "Select All"}
                  </Button>

                  {selectedDriveFileIds.length > 0 && (
                    <>
                      <Badge variant="soft" color="primary" className="h-8 px-2.5 text-xs font-semibold">
                        {selectedDriveFileIds.length} Selected
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchDownloadDriveFiles}
                        className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
                        title="Download selected files"
                      >
                        <i className="fa-solid fa-download text-xs" /> Download Selected ({selectedDriveFileIds.length})
                      </Button>

                      <Button
                        variant="soft"
                        color="destructive"
                        size="sm"
                        onClick={() => setShowBatchDeleteModal(true)}
                        className="h-8 gap-1.5 text-xs font-semibold"
                        title="Delete selected files"
                      >
                        <i className="fa-solid fa-trash-can text-xs" /> Delete Selected ({selectedDriveFileIds.length})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="px-0 pt-2">
              {driveFiles.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm space-y-1">
                  <i className="fa-solid fa-folder-open text-3xl opacity-50 text-primary mb-2 block" />
                  <p className="font-medium">No files uploaded yet.</p>
                  <p className="text-xs">Use the upload box above to add your first file to Drive Space.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {driveFiles.map((file) => {
                    const isSelected = selectedDriveFileIds.includes(file._id);
                    const isImg = (file.mimeType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
                    const fileDownloadUrl = `/api/drive/download?fileId=${file._id}`;

                    return (
                      <div
                        key={file._id}
                        className={cn(
                          "p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 relative group",
                          isSelected ? "border-primary bg-primary/5 shadow-xs" : "border-border bg-card hover:shadow-md"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Multi-select checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleSelectDriveFile(file._id)}
                              className="mt-1 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                              title={isSelected ? "Deselect file" : "Select file"}
                            >
                              <i className={cn("fa-lg", isSelected ? "fa-solid fa-square-check text-primary" : "fa-regular fa-square")} />
                            </button>

                            {/* Thumbnail or File Icon */}
                            {isImg ? (
                              <div
                                onClick={() => setPreviewFile(file)}
                                className="relative w-12 h-12 rounded-lg border border-border/80 bg-muted/30 overflow-hidden cursor-pointer shrink-0 group/img flex items-center justify-center"
                                title="Click to view image preview"
                              >
                                <img
                                  src={fileDownloadUrl}
                                  alt={file.name}
                                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <i className="fa-solid fa-eye text-xs" />
                                </div>
                              </div>
                            ) : (
                              <div
                                onClick={() => setPreviewFile(file)}
                                className="p-2.5 bg-primary/10 text-primary rounded-lg shrink-0 flex items-center justify-center w-10 h-10 cursor-pointer hover:bg-primary/20 transition-colors"
                                title="Click to view file details"
                              >
                                <i className={cn("fa-solid text-lg", isImg ? "fa-image" : file.name.endsWith(".pdf") ? "fa-file-pdf text-rose-500" : "fa-file-lines")} />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p
                                onClick={() => setPreviewFile(file)}
                                className="font-semibold text-xs text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                                title={file.name}
                              >
                                {file.name}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {Math.round((file.size || 0) / 1024)} KB • {new Date(file.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Preview button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPreviewFile(file)}
                              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="View file details / Preview"
                            >
                              <i className="fa-solid fa-eye text-xs" />
                            </Button>

                            {/* Download button */}
                            <a
                              href={fileDownloadUrl}
                              download={file.name}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Download File"
                            >
                              <i className="fa-solid fa-download text-xs" />
                            </a>

                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteConfirmFile(file)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              title="Delete File"
                            >
                              <i className="fa-solid fa-trash-can text-xs" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/60 pt-2">
                          <span>By {file.uploadedBy?.name || "Member"}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                            {file.mimeType?.split("/")[1] || "file"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project History Tab View */}
      {activeTab === "history" && (
        <Card className="p-5 space-y-4">
          <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-primary text-sm" /> Project Activity History
              </CardTitle>
              <CardDescription>Audit timeline of actions and changes within this project</CardDescription>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">Rows:</span>
                <select
                  value={historyRowsPerPage}
                  onChange={(e) => {
                    setHistoryRowsPerPage(Number(e.target.value));
                    setHistoryPage(1);
                  }}
                  disabled={historyShowAll}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>

              <Button
                variant={historyShowAll ? "soft" : "outline"}
                color={historyShowAll ? "primary" : "default"}
                size="sm"
                onClick={() => {
                  setHistoryShowAll(!historyShowAll);
                  setHistoryPage(1);
                }}
                className="gap-2 font-semibold text-xs h-8"
              >
                <i className={cn("fa-solid text-xs", historyShowAll ? "fa-list" : "fa-expand")} />
                {historyShowAll ? "Paginated View" : "Show All Records"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="px-0 pt-2 space-y-4">
            {(() => {
              const totalItems = activityLogs.length;
              const effectiveRowsPerPage = historyShowAll ? (totalItems || 1) : historyRowsPerPage;
              const totalPages = Math.ceil(totalItems / effectiveRowsPerPage) || 1;
              const startIndex = (historyPage - 1) * effectiveRowsPerPage;
              const paginatedLogs = activityLogs.slice(startIndex, startIndex + effectiveRowsPerPage);

              return (
                <>
                  {activityLogs.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm space-y-1">
                      <i className="fa-solid fa-clock-rotate-left text-3xl opacity-50 block mb-2" />
                      <p>No activity logged for this project yet.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border">
                        {paginatedLogs.map((log) => (
                          <div key={log._id} className="relative flex items-start gap-4 pl-8 group">
                            <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-primary/20 border-2 border-primary group-hover:scale-110 transition-transform" />
                            <div className="p-3.5 rounded-lg border border-border bg-card hover:bg-accent/20 transition-colors shadow-xs flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                                  <i className="fa-solid fa-user-circle text-primary text-xs" /> {log.userName} ({log.userRole || "Member"})
                                </span>
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
                              <p className="text-xs font-semibold text-primary">{log.action}: {log.targetName}</p>
                              {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination Footer */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                        <div>
                          Showing <strong className="text-foreground">{totalItems === 0 ? 0 : startIndex + 1}</strong> to <strong className="text-foreground">{Math.min(startIndex + effectiveRowsPerPage, totalItems)}</strong> of <strong className="text-foreground">{totalItems}</strong> history logs
                        </div>

                        {!historyShowAll && totalPages > 1 && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={historyPage <= 1}
                              onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                              className="h-8 gap-1"
                            >
                              <i className="fa-solid fa-chevron-left text-[10px]" /> Previous
                            </Button>

                            <span className="font-semibold text-foreground px-2 font-mono">
                              Page {historyPage} of {totalPages}
                            </span>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={historyPage >= totalPages}
                              onClick={() => setHistoryPage((prev) => Math.min(totalPages, prev + 1))}
                              className="h-8 gap-1"
                            >
                              Next <i className="fa-solid fa-chevron-right text-[10px]" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Selected SOP Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setSelectedArticle(null)}>
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-border/60 pb-3">
              <div className="space-y-1">
                <Badge color="primary" className="mb-1">{selectedArticle.category}</Badge>
                <h3 className="text-lg font-bold text-foreground">{selectedArticle.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Published by <strong className="text-foreground">{selectedArticle.author}</strong> on {new Date(selectedArticle.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedArticle(null)}>
                <i className="fa-solid fa-xmark text-sm" />
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-muted/20 border border-border/60 text-xs text-foreground leading-relaxed whitespace-pre-line font-normal space-y-2">
              {selectedArticle.content}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedArticle(null)}>
                Close SOP
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish New SOP Modal */}
      {showWikiForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowWikiForm(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-book-bookmark text-primary" /> Publish Standard Operating Procedure (SOP)
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowWikiForm(false)}>
                <i className="fa-solid fa-xmark text-sm" />
              </Button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch("/api/wiki", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: newWikiTitle,
                      category: newWikiCategory,
                      content: newWikiContent,
                    }),
                  });
                  if (res.ok) {
                    showToast("SOP article published successfully!", "success");
                    setShowWikiForm(false);
                    setNewWikiTitle("");
                    setNewWikiContent("");
                    await fetchWikiArticles();
                  } else {
                    const err = await res.json();
                    showToast(err.error || "Failed to publish article", "error");
                  }
                } catch (err) {
                  showToast("Error publishing SOP article", "error");
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">SOP Document Title</label>
                <Input
                  value={newWikiTitle}
                  onChange={(e) => setNewWikiTitle(e.target.value)}
                  placeholder="e.g. Incident Escalation & Response Protocol"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Category / Department</label>
                <select
                  value={newWikiCategory}
                  onChange={(e) => setNewWikiCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Operations">Operations</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Support">Support</option>
                  <option value="Sales & CRM">Sales & CRM</option>
                  <option value="HR & Payroll">HR & Payroll</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">SOP Content & Guidelines</label>
                <textarea
                  value={newWikiContent}
                  onChange={(e) => setNewWikiContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Detail step-by-step procedures, execution guidelines, and team expectations..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowWikiForm(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold">
                  Publish Article
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Project Modal */}
      {showProjectForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowProjectForm(false)}>
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-folder-plus text-primary" /> Create New Workspace Project
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowProjectForm(false)}>
                <i className="fa-solid fa-xmark text-sm" />
              </Button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              {/* Project Name & Internal Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center gap-1">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="e.g. Q3 Enterprise CRM Redesign"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Project Status</label>
                  <select
                    value={newProjStatus}
                    onChange={(e) => setNewProjStatus(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                  >
                    <option value="Planning">Planning</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Description & Scope</label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Describe key deliverables, scope, and objectives..."
                />
              </div>

              {/* Assign Project ---> Team Member or Department */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-users-gear text-primary" /> Assign Project
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground">
                      <input
                        type="radio"
                        name="assignType"
                        checked={newProjAssignType === "Member"}
                        onChange={() => setNewProjAssignType("Member")}
                        className="text-primary focus:ring-primary"
                      />
                      Team Members
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground">
                      <input
                        type="radio"
                        name="assignType"
                        checked={newProjAssignType === "Department"}
                        onChange={() => setNewProjAssignType("Department")}
                        className="text-primary focus:ring-primary"
                      />
                      Department
                    </label>
                  </div>
                </div>

                {newProjAssignType === "Member" ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">Select Team Members</label>
                    <div className="max-h-28 overflow-y-auto p-2 rounded-md border border-input bg-background space-y-1">
                      {teamMembers.map((m) => (
                        <label key={m._id} className="flex items-center gap-2 p-1 hover:bg-accent/40 rounded cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={newProjMembers.includes(m._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewProjMembers([...newProjMembers, m._id]);
                              } else {
                                setNewProjMembers(newProjMembers.filter((id) => id !== m._id));
                              }
                            }}
                            className="rounded text-primary focus:ring-primary"
                          />
                          <span className="font-medium text-foreground">{m.name || m.email}</span>
                          <span className="text-[10px] text-muted-foreground">({m.role || "Member"})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">Select Department</label>
                    <select
                      value={newProjAssignDept}
                      onChange={(e) => setNewProjAssignDept(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    >
                      <option value="">Select Target Department...</option>
                      {departments.length === 0 ? (
                        <>
                          <option value="Engineering">Engineering</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Sales">Sales</option>
                          <option value="Product">Product</option>
                          <option value="Design">Design</option>
                          <option value="Support">Support</option>
                        </>
                      ) : (
                        departments.map((d) => (
                          <option key={d._id} value={d.name}>{d.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* Start Date, End Date & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Start Date</label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={newProjStartDate}
                    onChange={(e) => setNewProjStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">End Date</label>
                  <Input
                    type="date"
                    min={newProjStartDate || new Date().toISOString().split("T")[0]}
                    value={newProjDueDate}
                    onChange={(e) => setNewProjDueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Budget / Cost ($)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 15000"
                    value={newProjCost}
                    onChange={(e) => setNewProjCost(e.target.value)}
                  />
                </div>
              </div>

              {/* Tag Internal Checkbox */}
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-muted/10">
                <input
                  type="checkbox"
                  id="internalTag"
                  checked={newProjIsInternal}
                  onChange={(e) => setNewProjIsInternal(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="internalTag" className="font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                  <i className="fa-solid fa-tag text-indigo-500 text-xs" /> Tag as Internal Project
                </label>
                <span className="text-[11px] text-muted-foreground ml-auto">(Non-billable / Internal tool)</span>
              </div>

              {/* Requirements & Attachments */}
              <div className="space-y-2 p-3.5 rounded-lg border border-border/80 bg-muted/20">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-paperclip text-primary" /> Project Requirements & Attachments
                </label>
                <textarea
                  value={newProjRequirements}
                  onChange={(e) => setNewProjRequirements(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Key functional requirements, specs, or guidelines..."
                />
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    onChange={(e) => setNewProjRequirementFile(e.target.files?.[0] || null)}
                    className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                  {newProjRequirementFile && (
                    <span className="text-[11px] text-emerald-500 font-medium truncate">
                      <i className="fa-solid fa-check text-[10px]" /> {newProjRequirementFile.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowProjectForm(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold gap-1.5">
                  <i className="fa-solid fa-rocket text-xs" /> Launch Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Task Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowTaskForm(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-square-plus text-primary" /> Create New Sprint Task
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowTaskForm(false)}>
                <i className="fa-solid fa-xmark text-sm" />
              </Button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Task Title</label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement OAuth Authentication API"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Assignee</label>
                  <select
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m._id} value={m._id}>{m.name || m.email}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Priority Level</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Due Date</label>
                <Input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Task Details & Description</label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Provide technical guidelines or acceptance criteria..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowTaskForm(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold">
                  Add Task to Sprint
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Dialog */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setDeleteConfirmFile(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg shrink-0 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Confirm File Deletion</h3>
                <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                  {deleteConfirmFile.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this file from Drive Space? This action will permanently remove the document from workspace storage.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" type="button" onClick={() => setDeleteConfirmFile(null)}>
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={() => handleDeleteFile(deleteConfirmFile._id)}
                className="gap-2 font-semibold"
              >
                <i className="fa-solid fa-trash-can text-xs" /> Delete File
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Selected Confirmation Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowBatchDeleteModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-border/60 pb-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-lg shrink-0 flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Confirm Batch Deletion</h3>
                <p className="text-xs text-muted-foreground font-semibold text-rose-500">
                  {selectedDriveFileIds.length} file(s) selected
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete these <strong className="text-foreground">{selectedDriveFileIds.length}</strong> selected files from Drive Space? This operation cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" type="button" disabled={isDeletingBatch} onClick={() => setShowBatchDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                disabled={isDeletingBatch}
                onClick={handleBatchDeleteDriveFiles}
                className="gap-2 font-semibold"
              >
                <i className="fa-solid fa-trash-can text-xs" />
                {isDeletingBatch ? "Deleting..." : `Delete ${selectedDriveFileIds.length} Files`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview & Lightbox Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setPreviewFile(null)}>
          <div className="w-full max-w-3xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-primary/10 text-primary rounded-lg shrink-0">
                  <i className={cn("fa-solid text-base", (previewFile.mimeType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(previewFile.name) ? "fa-image" : "fa-file-lines")} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate" title={previewFile.name}>{previewFile.name}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round((previewFile.size || 0) / 1024)} KB • Uploaded by {previewFile.uploadedBy?.name || "Member"} on {new Date(previewFile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/drive/download?fileId=${previewFile._id}`}
                  download={previewFile.name}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <i className="fa-solid fa-download text-xs" /> Download
                </a>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreviewFile(null)}>
                  <i className="fa-solid fa-xmark text-base" />
                </Button>
              </div>
            </div>

            {/* Preview content body */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/20 rounded-lg border border-border/60 min-h-[250px]">
              {(previewFile.mimeType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(previewFile.name) ? (
                <img
                  src={`/api/drive/download?fileId=${previewFile._id}`}
                  alt={previewFile.name}
                  className="max-h-[60vh] max-w-full object-contain rounded-md shadow-md"
                />
              ) : previewFile.mimeType === "application/pdf" || previewFile.name.endsWith(".pdf") ? (
                <iframe
                  src={`/api/drive/download?fileId=${previewFile._id}`}
                  title={previewFile.name}
                  className="w-full h-[60vh] rounded-md border border-border"
                />
              ) : (
                <div className="text-center py-8 space-y-3">
                  <div className="p-4 bg-primary/10 text-primary rounded-full inline-block">
                    <i className="fa-solid fa-file-arrow-down text-3xl" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">Preview not available for this format</p>
                    <p className="text-xs text-muted-foreground">Click below to download and view on your device.</p>
                  </div>
                  <a
                    href={`/api/drive/download?fileId=${previewFile._id}`}
                    download={previewFile.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <i className="fa-solid fa-download text-xs" /> Download File
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center border-t border-border pt-3 text-xs text-muted-foreground">
              <span>File Format: <strong className="text-foreground">{previewFile.mimeType || "Binary/Document"}</strong></span>
              <Button variant="outline" size="sm" onClick={() => setPreviewFile(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
