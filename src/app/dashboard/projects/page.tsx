"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import styles from "./projects.module.css";

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
      second: "2-digit",
      hour12: true,
    });
  };

  // Core Lists States
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Modals / Details States
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);

  // New Project Form
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");

  // New Task Form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskSprint, setNewTaskSprint] = useState("");

  // Wiki States
  const [wikiArticles, setWikiArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [isEditingWiki, setIsEditingWiki] = useState(false);
  const [wikiEditTitle, setWikiEditTitle] = useState("");
  const [wikiEditContent, setWikiEditContent] = useState("");

  // Drive States
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [driveFolder, setDriveFolder] = useState<string>("/");
  const [driveSearch, setDriveSearch] = useState<string>("");
  const [driveCategory, setDriveCategory] = useState<string>("all");
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Task details modal inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [commentText, setCommentText] = useState("");

  // Kanban Task Filters
  const [taskSearch, setTaskSearch] = useState("");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("ALL");
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState("ALL");

  // Project History Pagination & Filters
  const [historySearch, setHistorySearch] = useState("");
  const [historyActionFilter, setHistoryActionFilter] = useState("ALL");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);

  // Drag and Drop highlights
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeOverColumn, setActiveOverColumn] = useState<string | null>(null);

  const columns = ["To Do", "In Progress", "Review", "Done"];

  // Set mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // ==========================================
  // FETCHERS
  // ==========================================

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

  const fetchSprints = async () => {
    try {
      const res = await fetch("/api/sprints");
      if (res.ok) {
        const data = await res.json();
        setSprints(data.sprints || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWiki = async () => {
    try {
      const res = await fetch("/api/wiki");
      if (res.ok) {
        const data = await res.json();
        setWikiArticles(data.articles || []);
        if (data.articles && data.articles.length > 0 && !selectedArticle) {
          setSelectedArticle(data.articles[0]);
          setWikiEditTitle(data.articles[0].title);
          setWikiEditContent(data.articles[0].content);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDrive = async () => {
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

  const fetchActivityLogs = async () => {
    try {
      const url = selectedProjectId ? `/api/activity-logs?projectId=${selectedProjectId}` : "/api/activity-logs";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setActivityLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Tab Data
  useEffect(() => {
    if (!mounted) return;
    const init = async () => {
      setLoading(true);
      await fetchProjects();
      await fetchTeam();
      await fetchSprints();
      await fetchActivityLogs();
      setLoading(false);
    };
    init();
  }, [mounted]);

  // Fetch tasks and logs when project is toggled
  useEffect(() => {
    if (mounted && selectedProjectId) {
      fetchTasks();
      fetchActivityLogs();
    }
  }, [selectedProjectId, mounted]);

  // Load specific tab lists
  useEffect(() => {
    if (!mounted) return;
    if (activeTab === "wiki") fetchWiki();
    else if (activeTab === "drive") fetchDrive();
    else if (activeTab === "history") fetchActivityLogs();
  }, [activeTab, mounted, selectedProjectId]);

  // ==========================================
  // HANDLERS
  // ==========================================

  // Project Creation
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
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to create project.", "error");
    }
  };

  // Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !selectedProjectId) return;

    const todayStr = new Date().toISOString().split("T")[0];
    if (newTaskDueDate && newTaskDueDate < todayStr) {
      showToast("Due date cannot be in the past!", "error");
      return;
    }

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
        setNewTaskAssignee("");
        setNewTaskPriority("Medium");
        setNewTaskDueDate("");
        setNewTaskSprint("");
        showToast("Task created successfully!", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to create task.", "error");
    }
  };

  // Task Status Update (Kanban Drag and Drop / Modal)
  const handleMoveTaskStatus = async (taskId: string, targetStatus: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: targetStatus }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Project Status Update
  const handleUpdateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Project status updated to ${newStatus}`, "success");
        await fetchProjects();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update project status", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error updating project status", "error");
    }
  };

  // Drag Handlers
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    setActiveOverColumn(colName);
  };

  const handleDrop = async (e: React.DragEvent, colName: string) => {
    e.preventDefault();
    setActiveOverColumn(null);
    if (draggedTaskId) {
      await handleMoveTaskStatus(draggedTaskId, colName);
      setDraggedTaskId(null);
    }
  };

  // Subtask Check list toggles & additions inside detail modal
  const handleToggleSubtask = async (subtaskIndex: number) => {
    if (!selectedTask) return;
    
    const updatedSubtasks = [...selectedTask.subtasks];
    updatedSubtasks[subtaskIndex].completed = !updatedSubtasks[subtaskIndex].completed;

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask._id, subtasks: updatedSubtasks }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data.task);
        await fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle || !selectedTask) return;

    const updatedSubtasks = [...selectedTask.subtasks, { title: newSubtaskTitle, completed: false }];
    
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask._id, subtasks: updatedSubtasks }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data.task);
        setNewSubtaskTitle("");
        await fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubtask = async (subtaskIndex: number) => {
    if (!selectedTask) return;

    const updatedSubtasks = selectedTask.subtasks.filter((_: any, idx: number) => idx !== subtaskIndex);

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask._id, subtasks: updatedSubtasks }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data.task);
        await fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Comments submit inside Modal
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText || !selectedTask) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask._id, commentText }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedTask(data.task);
        setCommentText("");
        await fetchTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Wiki edit actions
  const handleSelectArticle = (article: any) => {
    setSelectedArticle(article);
    setWikiEditTitle(article.title);
    setWikiEditContent(article.content);
    setIsEditingWiki(false);
  };

  const handleCreateWikiArticle = async () => {
    try {
      const res = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled SOP Draft", content: "Write article SOP content here..." }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchWiki();
        handleSelectArticle(data.article);
        setIsEditingWiki(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveWiki = async () => {
    if (!selectedArticle) return;
    try {
      const res = await fetch("/api/wiki", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: selectedArticle._id,
          title: wikiEditTitle,
          content: wikiEditContent,
        }),
      });
      if (res.ok) {
        await fetchWiki();
        setIsEditingWiki(false);
        showToast("Article updated!", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to save article.", "error");
    }
  };
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("fileName", uploadName || uploadFile.name);
    formData.append("folder", driveFolder);

    try {
      const res = await fetch("/api/drive", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchDrive();
        setUploadFile(null);
        setUploadName("");
        showToast("File uploaded successfully!", "success");
      } else {
        showToast("Upload failed.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error uploading file.", "error");
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setFileToDelete(fileId);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeletingFile(true);

    try {
      const res = await fetch(`/api/drive?fileId=${fileToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchDrive();
        showToast("File deleted.", "success");
        setFileToDelete(null);
      } else {
        showToast("Failed to delete file.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to delete file.", "error");
    } finally {
      setIsDeletingFile(false);
    }
  };

  // Export Data Handlers
  const handleExportDataCSV = () => {
    try {
      const activeProj = projects.find((p) => p._id === selectedProjectId);
      const targetTasks = selectedProjectId
        ? tasks.filter((t) => t.projectId?._id === selectedProjectId || t.projectId === selectedProjectId)
        : tasks;

      const headers = ["Project Name", "Task Title", "Description", "Status", "Priority", "Assignee", "Due Date", "Created At"];
      const rows = targetTasks.map((t) => [
        `"${(t.projectId?.name || activeProj?.name || "Workspace Project").replace(/"/g, '""')}"`,
        `"${(t.title || "").replace(/"/g, '""')}"`,
        `"${(t.description || "").replace(/"/g, '""')}"`,
        `"${(t.status || "").replace(/"/g, '""')}"`,
        `"${(t.priority || "").replace(/"/g, '""')}"`,
        `"${(t.assignee?.name || "Unassigned").replace(/"/g, '""')}"`,
        `"${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""}"`,
        `"${t.createdAt ? formatDateTime(t.createdAt) : ""}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `NexAce_Projects_Export_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Projects exported as CSV spreadsheet!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to export project data.", "error");
    }
  };

  const handleExportDataJSON = () => {
    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        projects,
        tasks,
        sprints,
        wikiArticles,
        driveFiles: driveFiles.map((f) => ({ name: f.name, size: f.size, mimeType: f.mimeType, createdAt: f.createdAt })),
        activityLogs,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", dataStr);
      link.setAttribute("download", `NexAce_CRM_Full_Workspace_Backup_${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Full project dataset exported as JSON backup!", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to export JSON backup.", "error");
    }
  };

  if (!mounted || authLoading) {
    return (
      <div style={{ padding: "2rem", color: "var(--text-secondary)", textAlign: "center" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.5rem" }}></i> Loading Workspace...
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sleek Top Header Row */}
      <div className={styles.titleSection}>
        <div>
          <h1 className={styles.title}>Projects & Wiki</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Manage product sprints, Kanban tasks, Gantt timelines, collaborative Wiki docs, and files.
          </p>
        </div>

        {/* Primary Header Action Buttons */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Export Dropdown Menu Button */}
          <div style={{ position: "relative" }}>
            <button
              className={styles.btnSecondary}
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export workspace data"
              style={{ padding: "0.5rem 0.85rem", fontSize: "0.85rem" }}
            >
              <i className="fa-solid fa-download" style={{ marginRight: "0.35rem" }}></i>
              Export <i className="fa-solid fa-chevron-down" style={{ marginLeft: "0.35rem", fontSize: "0.75rem" }}></i>
            </button>

            {showExportMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 100,
                  minWidth: "180px",
                  borderRadius: "var(--radius-md)",
                  padding: "0.4rem",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.2rem",
                  background: "var(--card-bg, #121318)",
                  border: "1px solid var(--border-color)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleExportDataCSV();
                    setShowExportMenu(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    background: "transparent",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <i className="fa-solid fa-file-csv" style={{ fontSize: "1rem", color: "var(--color-primary)" }}></i>
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleExportDataJSON();
                    setShowExportMenu(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    background: "transparent",
                    border: "none",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    transition: "background 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(99, 102, 241, 0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <i className="fa-solid fa-file-code" style={{ fontSize: "1rem", color: "var(--color-primary)" }}></i>
                  <span>Export JSON</span>
                </button>
              </div>
            )}
          </div>

          {activeTab === "kanban" && (
            <>
              <button className={styles.btnSecondary} onClick={() => setShowProjectForm(true)}>
                <i className="fa-solid fa-folder-plus" style={{ marginRight: "0.35rem" }}></i> New Project
              </button>
              <button className={styles.btnPrimary} onClick={() => setShowTaskForm(true)}>
                <i className="fa-solid fa-circle-plus" style={{ marginRight: "0.35rem" }}></i> Create Task
              </button>
            </>
          )}
          {activeTab === "wiki" && (
            <button className={styles.btnPrimary} onClick={handleCreateWikiArticle}>
              <i className="fa-solid fa-file-pen" style={{ marginRight: "0.35rem" }}></i> New SOP Article
            </button>
          )}
        </div>
      </div>

      {/* Clean Full-Width Navigation Tabs Row */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "kanban" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("kanban"))}
        >
          <i className="fa-solid fa-grip-vertical" style={{ marginRight: "0.35rem" }}></i> Kanban Board
        </button>
        <button
          className={`${styles.tab} ${activeTab === "gantt" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("gantt"))}
        >
          <i className="fa-solid fa-chart-gantt" style={{ marginRight: "0.35rem" }}></i> Gantt Timeline
        </button>
        <button
          className={`${styles.tab} ${activeTab === "wiki" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("wiki"))}
        >
          <i className="fa-solid fa-book-open-reader" style={{ marginRight: "0.35rem" }}></i> SOP Wiki
        </button>
        <button
          className={`${styles.tab} ${activeTab === "drive" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("drive"))}
        >
          <i className="fa-solid fa-hard-drive" style={{ marginRight: "0.35rem" }}></i> Drive Space
        </button>
        <button
          className={`${styles.tab} ${activeTab === "workload" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("workload"))}
        >
          <i className="fa-solid fa-chart-pie" style={{ marginRight: "0.35rem" }}></i> Team Workloads
        </button>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("history"))}
        >
          <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: "0.35rem" }}></i> Project History
        </button>
      </div>

      {/* Project Selector Bar (Mainly for Kanban/Gantt/History) */}
      {(activeTab === "kanban" || activeTab === "gantt" || activeTab === "history") && (
        <div className={`${styles.projectBar} glass-panel`} style={{ flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Select Active Project:</span>
            <select
              className={styles.select}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          {projects.find((p) => p._id === selectedProjectId) && (() => {
            const currentProj = projects.find((p) => p._id === selectedProjectId);
            const totalTasks = tasks.length;
            const doneTasks = tasks.filter((t) => t.status === "Done").length;
            const reviewTasks = tasks.filter((t) => t.status === "Review").length;
            const inProgressTasks = tasks.filter((t) => t.status === "In Progress").length;

            // Extract unique assigned users for this project
            const assignedUsers = Array.from(
              new Map(
                tasks
                  .filter((t) => t.assignee && t.assignee._id)
                  .map((t) => [t.assignee._id, t.assignee])
              ).values()
            );

            let computedStatus = "Planning";
            if (totalTasks > 0 && doneTasks === totalTasks) {
              computedStatus = "Completed";
            } else if (reviewTasks > 0 && inProgressTasks === 0) {
              computedStatus = "In Review";
            } else if (inProgressTasks > 0 || reviewTasks > 0 || doneTasks > 0) {
              computedStatus = "In Progress";
            }

            return (
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
                {/* Related Team Members Avatar Stack */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    <i className="fa-solid fa-users" style={{ marginRight: "0.3rem" }}></i> Project Team:
                  </span>
                  {assignedUsers.length === 0 ? (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No users assigned
                    </span>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {assignedUsers.slice(0, 5).map((user: any, idx: number) => {
                        const initials = user.name
                          ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                          : "?";
                        return (
                          <div
                            key={user._id || idx}
                            title={user.name}
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: "var(--color-primary)",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "2px solid var(--background)",
                              marginLeft: idx > 0 ? "-8px" : "0",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                              cursor: "pointer",
                            }}
                          >
                            {initials}
                          </div>
                        );
                      })}
                      {assignedUsers.length > 5 && (
                        <div
                          title={`${assignedUsers.length - 5} more team members`}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "var(--border-color)",
                            color: "var(--text-secondary)",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "2px solid var(--background)",
                            marginLeft: "-8px",
                          }}
                        >
                          +{assignedUsers.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    Project Status:
                  </span>
                  <span
                    className={`${styles.statusSelect} ${
                      computedStatus === "Planning"
                        ? styles.statusPlanning
                        : computedStatus === "In Review"
                        ? styles.statusInReview
                        : computedStatus === "In Progress"
                        ? styles.statusInProgress
                        : styles.statusCompleted
                    }`}
                  >
                    {computedStatus === "Planning" && <i className="fa-solid fa-compass" style={{ marginRight: "0.3rem" }}></i>}
                    {computedStatus === "In Review" && <i className="fa-solid fa-magnifying-glass-chart" style={{ marginRight: "0.3rem" }}></i>}
                    {computedStatus === "In Progress" && <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "0.3rem" }}></i>}
                    {computedStatus === "Completed" && <i className="fa-solid fa-circle-check" style={{ marginRight: "0.3rem" }}></i>}
                    {computedStatus} ({doneTasks}/{totalTasks} Done)
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ----------------- Tab 1: Kanban Board ----------------- */}
      {activeTab === "kanban" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Kanban Filter Toolbar */}
          <div className="glass-panel" style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
              <input
                type="text"
                placeholder="Search tasks by title or assignee..."
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                className={styles.input}
                style={{ paddingLeft: "2.2rem", fontSize: "0.85rem" }}
              />
              <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }}></i>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Priority:</span>
              <select
                className={styles.select}
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
              >
                <option value="ALL">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Assignee:</span>
              <select
                className={styles.select}
                value={taskAssigneeFilter}
                onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
              >
                <option value="ALL">All Assignees</option>
                {teamMembers.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.kanbanGrid}>
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => {
                if (t.status !== col) return false;
                if (taskPriorityFilter !== "ALL" && t.priority !== taskPriorityFilter) return false;
                if (taskAssigneeFilter !== "ALL" && t.assignee?._id !== taskAssigneeFilter) return false;
                if (taskSearch) {
                  const query = taskSearch.toLowerCase();
                  const matchTitle = t.title.toLowerCase().includes(query);
                  const matchAssignee = t.assignee?.name?.toLowerCase().includes(query);
                  return matchTitle || matchAssignee;
                }
                return true;
              });
            const isOverThisCol = activeOverColumn === col;

            return (
              <div
                key={col}
                className={`${styles.kanbanColumn} ${
                  col === "To Do"
                    ? styles.colToDo
                    : col === "In Progress"
                    ? styles.colInProgress
                    : col === "Review"
                    ? styles.colReview
                    : styles.colDone
                } ${isOverThisCol ? styles.kanbanColumnHighlight : ""}`}
                onDragOver={(e) => handleDragOver(e, col)}
                onDragLeave={() => setActiveOverColumn(null)}
                onDrop={(e) => handleDrop(e, col)}
              >
                <div className={styles.columnHeader}>
                  <span>{col}</span>
                  <span className={styles.cardCount}>{colTasks.length}</span>
                </div>

                <div className={styles.taskCardList}>
                  {colTasks.map((task) => {
                    const initials = task.assignee?.name
                      ? task.assignee.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                      : "?";

                    return (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={() => handleDragStart(task._id)}
                        className={`${styles.taskCard} glass-panel`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className={styles.taskMeta}>
                          <span
                            className={`${styles.priorityBadge} ${
                              task.priority === "High"
                                ? styles.priorityHigh
                                : task.priority === "Medium"
                                ? styles.priorityMedium
                                : styles.priorityLow
                            }`}
                          >
                            {task.priority}
                          </span>
                          
                          {task.assignee ? (
                            <div
                              title={task.assignee.name}
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: "var(--color-primary)",
                                color: "white",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid var(--border-color)",
                              }}
                            >
                              {initials}
                            </div>
                          ) : (
                            <i className="fa-solid fa-circle-user" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}></i>
                          )}
                        </div>

                        <span className={styles.taskTitle}>{task.title}</span>

                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className={styles.subtaskProgressWrapper}>
                            <div className={styles.subtaskProgressBar}>
                              <div
                                className={styles.subtaskProgressFill}
                                style={{
                                  width: `${Math.round(
                                    (task.subtasks.filter((s: any) => s.completed).length / task.subtasks.length) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className={styles.subtaskProgressText}>
                              {task.subtasks.filter((s: any) => s.completed).length}/{task.subtasks.length}
                            </span>
                          </div>
                        )}

                        <div className={styles.taskFooter}>
                          <span><i className="fa-solid fa-clock" style={{ marginRight: "0.2rem" }}></i> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
                          <span><i className="fa-solid fa-comment-dots" style={{ marginRight: "0.2rem" }}></i> {task.comments?.length || 0}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ----------------- Tab 2: Gantt Timeline ----------------- */}
      {activeTab === "gantt" && (
        <div className={`${styles.ganttWrapper} glass-panel`} style={{ borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
            <i className="fa-solid fa-calendar-days" style={{ marginRight: "0.4rem", color: "var(--color-primary)" }}></i> Chronological Task Schedule
          </h2>

          {tasks.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No tasks created yet for timeline view.</p>
          ) : (
            <div>
              {/* Timeline Header Columns */}
              <div className={styles.ganttHeaderRow}>
                <div className={styles.ganttHeaderLabel}>Task / Milestone</div>
                <div className={styles.ganttHeaderTimeline}>
                  <div className={styles.ganttHeaderCol}>Week 1</div>
                  <div className={styles.ganttHeaderCol}>Week 2</div>
                  <div className={styles.ganttHeaderCol}>Week 3</div>
                  <div className={styles.ganttHeaderCol}>Week 4</div>
                </div>
              </div>

              {/* Rows */}
              {(() => {
                // Find earliest start date and latest due date
                const now = new Date();
                const startDates = tasks.map((t) => new Date(t.createdAt).getTime());
                const endDates = tasks.map((t) => (t.dueDate ? new Date(t.dueDate).getTime() : now.getTime() + 7 * 86400000));
                
                const minTime = Math.min(...startDates, now.getTime() - 2 * 86400000);
                const maxTime = Math.max(...endDates, minTime + 28 * 86400000);
                const totalSpan = Math.max(1, maxTime - minTime);

                return tasks.map((task) => {
                  const taskStart = new Date(task.createdAt).getTime();
                  const taskEnd = task.dueDate ? new Date(task.dueDate).getTime() : taskStart + 3 * 86400000;
                  
                  const leftPercent = Math.max(0, Math.min(92, ((taskStart - minTime) / totalSpan) * 100));
                  const rawWidthPercent = Math.max(5, ((taskEnd - taskStart) / totalSpan) * 100);
                  const widthPercent = Math.min(100 - leftPercent, rawWidthPercent);

                  const durationDays = Math.max(1, Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)));
                  const priorityClass =
                    task.priority === "High"
                      ? styles.ganttBarHigh
                      : task.priority === "Medium"
                      ? styles.ganttBarMedium
                      : styles.ganttBarLow;

                  return (
                    <div key={task._id} className={styles.ganttRow}>
                      <span className={styles.ganttTaskLabel} title={task.title}>
                        {task.title}
                      </span>
                      <div className={styles.ganttTrack}>
                        <div
                          className={`${styles.ganttBar} ${priorityClass}`}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
                          }}
                          onClick={() => setSelectedTask(task)}
                          title={`${task.title} (${durationDays}d)`}
                        >
                          {durationDays}d
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}

      {/* ----------------- Tab 3: SOP Wiki Hub ----------------- */}
      {activeTab === "wiki" && (
        <div className={styles.wikiGrid}>
          {/* Sidebar */}
          <div className={styles.wikiSidebar}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Documents Log
            </span>
            <div className={styles.wikiList}>
              {wikiArticles.map((art) => (
                <div
                  key={art._id}
                  className={`${styles.wikiItem} ${selectedArticle?._id === art._id ? styles.wikiItemActive : ""}`}
                  onClick={() => handleSelectArticle(art)}
                >
                  <i className="fa-solid fa-file-lines" style={{ marginRight: "0.35rem" }}></i> {art.title}
                </div>
              ))}
            </div>
          </div>

          {/* Editor Panel */}
          {selectedArticle ? (
            <div className={`${styles.wikiEditorCard} glass-panel`}>
              <div className={styles.wikiMeta}>
                <span>Uploaded by: <strong>{selectedArticle.createdBy?.name || "CEO"}</strong></span>
                <span>Last updated: {new Date(selectedArticle.updatedAt).toLocaleDateString()}</span>
              </div>

              {isEditingWiki ? (
                <>
                  <input
                    type="text"
                    className={styles.wikiTitleInput}
                    value={wikiEditTitle}
                    onChange={(e) => setWikiEditTitle(e.target.value)}
                  />
                  <textarea
                    className={styles.wikiTextarea}
                    value={wikiEditContent}
                    onChange={(e) => setWikiEditContent(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button className={styles.btnSecondary} onClick={() => setIsEditingWiki(false)}>
                      Cancel
                    </button>
                    <button className={styles.btnPrimary} onClick={handleSaveWiki}>
                      <i className="fa-solid fa-floppy-disk" style={{ marginRight: "0.4rem" }}></i> Save Document
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: "1.6rem", fontWeight: 800 }}>{selectedArticle.title}</h2>
                  <div
                    style={{
                      fontSize: "0.95rem",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap",
                      color: "var(--text-secondary)",
                      minHeight: "300px",
                    }}
                  >
                    {selectedArticle.content}
                  </div>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => setIsEditingWiki(true)}
                    style={{ alignSelf: "flex-end" }}
                  >
                    <i className="fa-solid fa-pen-to-square" style={{ marginRight: "0.4rem" }}></i> Edit SOP Article
                  </button>
                </>
              )}
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No Wiki pages logged. Click New SOP Article to write.</p>
          )}
        </div>
      )}

      {/* ----------------- Tab 4: Drive Space ----------------- */}
      {activeTab === "drive" && (
        <div className={styles.driveWrapper}>
          {/* Header Controls Bar */}
          <div className={styles.driveHeaderBar}>
            {/* Breadcrumb Path */}
            <div className={styles.driveBreadcrumb}>
              <span className={styles.breadcrumbItem} onClick={() => setDriveFolder("/")}>
                <i className="fa-solid fa-hard-drive" style={{ marginRight: "0.3rem" }}></i> Drive Root
              </span>
              {driveFolder !== "/" && (
                <>
                  <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}></i>
                  <span style={{ color: "var(--text-primary)" }}>{driveFolder.replace("/", "")}</span>
                </>
              )}
            </div>

            {/* Filter & Search Controls */}
            <div className={styles.driveControls}>
              <input
                type="text"
                placeholder="Search drive files..."
                value={driveSearch}
                onChange={(e) => setDriveSearch(e.target.value)}
                className={styles.driveSearchInput}
              />
              <select
                className={styles.select}
                value={driveCategory}
                onChange={(e) => setDriveCategory(e.target.value)}
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
              >
                <option value="all">All File Types</option>
                <option value="doc">Documents (PDF / DOC)</option>
                <option value="image">Images</option>
                <option value="spreadsheet">Spreadsheets (XLS / CSV)</option>
              </select>

              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowFolderModal(true)}
                style={{ fontSize: "0.85rem", padding: "0.4rem 0.75rem" }}
              >
                <i className="fa-solid fa-folder-plus" style={{ marginRight: "0.3rem", color: "#f59e0b" }}></i> New Folder
              </button>
            </div>
          </div>

          {/* Upload Bar */}
          <div className="glass-panel" style={{ padding: "1rem", marginBottom: "1.25rem" }}>
            <form onSubmit={handleUploadFile} style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <div className={styles.formGroup} style={{ flex: 1, minWidth: "220px" }}>
                <label
                  htmlFor="file-upload-input"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.5rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    background: "rgba(255, 255, 255, 0.03)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                    userSelect: "none",
                  }}
                >
                  <i className="fa-solid fa-paperclip" style={{ color: "var(--color-primary)", fontSize: "0.95rem" }}></i>
                  <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {uploadFile ? uploadFile.name : "Select file to upload..."}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.75rem",
                      background: "var(--color-primary-glow)",
                      color: "var(--color-primary)",
                      padding: "0.15rem 0.5rem",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 700,
                    }}
                  >
                    Browse
                  </span>
                </label>
                <input
                  id="file-upload-input"
                  type="file"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setUploadFile(files[0]);
                      setUploadName(files[0].name);
                    }
                  }}
                  style={{ display: "none" }}
                  required={!uploadFile}
                />
              </div>
              <div className={styles.formGroup} style={{ minWidth: "180px" }}>
                <input
                  type="text"
                  placeholder="Rename file (optional)"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className={styles.input}
                />
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Uploading to: <strong>{driveFolder}</strong>
              </span>
              <button type="submit" className={styles.btnPrimary} disabled={!uploadFile}>
                <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: "0.4rem" }}></i> Upload File
              </button>
            </form>
          </div>

          {/* Drive Folders Grid (Root level) */}
          {driveFolder === "/" && (() => {
            const fileFolders = Array.from(
              new Set(
                driveFiles
                  .map((f) => f.folder)
                  .filter((f) => f && f !== "/")
              )
            );
            const allFolders = Array.from(new Set([...fileFolders, ...customFolders]));

            if (allFolders.length === 0) return null;

            return (
              <div style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.75rem", textTransform: "uppercase" }}>
                  Virtual Folders
                </h3>
                <div className={styles.folderGrid}>
                  {allFolders.map((folderPath) => {
                    const folderName = folderPath.replace("/", "");
                    const count = driveFiles.filter((f) => f.folder === folderPath).length;

                    return (
                      <div key={folderPath} className={styles.folderCard} onClick={() => setDriveFolder(folderPath)}>
                        <i className={`fa-solid fa-folder ${styles.folderIcon}`}></i>
                        <div>
                          <div className={styles.folderName}>{folderName}</div>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{count} file(s)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Drive Locker Grid */}
          <div className={`${styles.timesheetCard} glass-panel`}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
              <i className="fa-solid fa-folder-open" style={{ marginRight: "0.4rem", color: "var(--color-primary)" }}></i>{" "}
              {driveFolder === "/" ? "Root Directory Files" : `Files in ${driveFolder}`}
            </h2>

            {(() => {
              const filtered = driveFiles.filter((file) => {
                // Folder match
                const matchFolder = (file.folder || "/") === driveFolder;
                
                // Search query match
                const matchSearch = driveSearch
                  ? file.name.toLowerCase().includes(driveSearch.toLowerCase())
                  : true;

                // Category match
                let matchCategory = true;
                if (driveCategory === "image") {
                  matchCategory = file.mimeType?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)$/i.test(file.name);
                } else if (driveCategory === "doc") {
                  matchCategory =
                    file.mimeType?.includes("pdf") ||
                    file.mimeType?.includes("word") ||
                    /\.(pdf|doc|docx|txt)$/i.test(file.name);
                } else if (driveCategory === "spreadsheet") {
                  matchCategory =
                    file.mimeType?.includes("csv") ||
                    file.mimeType?.includes("excel") ||
                    /\.(csv|xls|xlsx)$/i.test(file.name);
                }

                return matchFolder && matchSearch && matchCategory;
              });

              if (filtered.length === 0) {
                return (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                    No files found in {driveFolder} matching your search or filters.
                  </p>
                );
              }

              return (
                <div className={styles.fileGrid}>
                  {filtered.map((file) => {
                    const sizeKB = Math.round(file.size / 1024);

                    const fileIconClass = file.mimeType?.startsWith("image/")
                      ? "fa-solid fa-file-image"
                      : file.mimeType?.includes("pdf")
                      ? "fa-solid fa-file-pdf"
                      : file.mimeType?.includes("word") || file.name.endsWith(".doc") || file.name.endsWith(".docx")
                      ? "fa-solid fa-file-word"
                      : file.mimeType?.includes("csv") || file.name.endsWith(".csv") || file.name.endsWith(".xlsx")
                      ? "fa-solid fa-file-excel"
                      : "fa-solid fa-file";

                    return (
                      <div key={file._id} className={`${styles.fileCard} glass-panel`}>
                        <i className={`${fileIconClass} ${styles.fileIcon}`}></i>
                        <span className={styles.fileName} title={file.name}>
                          {file.name}
                        </span>
                        <span className={styles.fileSize}>{sizeKB} KB</span>

                        <div className={styles.fileActions}>
                          <a
                            href={`/api/drive/download?fileId=${file._id}`}
                            className={styles.btnPrimary}
                            style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}
                            title="Download"
                          >
                            <i className="fa-solid fa-download"></i>
                          </a>
                          <button
                            className={styles.btnSecondary}
                            style={{
                              padding: "0.2rem 0.5rem",
                              fontSize: "0.75rem",
                              color: "var(--color-danger)",
                              borderColor: "var(--color-danger)",
                            }}
                            onClick={() => handleDeleteFile(file._id)}
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ----------------- Tab 5: Workload Allocation ----------------- */}
      {activeTab === "workload" && (
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
            <i className="fa-solid fa-chart-pie" style={{ marginRight: "0.4rem", color: "var(--color-primary)" }}></i> Employee Task Workloads
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {teamMembers.map((member) => {
              const assignedTasks = tasks.filter((t) => t.assignee?._id === member._id);
              const isOverloaded = assignedTasks.length >= 4;

              return (
                <div
                  key={member._id}
                  style={{
                    padding: "1rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{member.name}</strong> ({member.role})
                    </div>
                    {isOverloaded ? (
                      <span className={styles.priorityHigh} style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", fontWeight: 700 }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "0.25rem" }}></i> Workload Overload ({assignedTasks.length} tasks)
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {assignedTasks.length} tasks assigned
                      </span>
                    )}
                  </div>

                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.min(100, assignedTasks.length * 20)}%`,
                        backgroundColor: isOverloaded ? "var(--color-danger)" : "var(--color-primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ----------------- Tab 6: Project History & Activity Audit Logs ----------------- */}
      {activeTab === "history" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Section 1: All Projects List Switcher */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                  <i className="fa-solid fa-list-check" style={{ marginRight: "0.4rem", color: "var(--color-primary)" }}></i> All Organization Projects
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  Click any project card to toggle and view its complete activity logs and timestamped action history.
                </p>
              </div>

              <button
                className={`${styles.btnSecondary} ${!selectedProjectId ? styles.btnPrimary : ""}`}
                onClick={() => setSelectedProjectId("")}
                style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
              >
                <i className="fa-solid fa-layer-group" style={{ marginRight: "0.35rem" }}></i>
                {!selectedProjectId ? "Showing All Workspace Logs" : "Show All Workspace History"}
              </button>
            </div>

            <div className={styles.projectHistoryGrid}>
              {projects.map((proj) => {
                const isSelected = selectedProjectId === proj._id;
                const projTasks = tasks.filter((t) => t.projectId?._id === proj._id || t.projectId === proj._id);
                const totalProjTasks = projTasks.length;
                const doneProjTasks = projTasks.filter((t) => t.status === "Done").length;

                return (
                  <div
                    key={proj._id}
                    className={`${styles.historyProjectCard} ${isSelected ? styles.historyProjectCardActive : ""}`}
                    onClick={() => setSelectedProjectId(proj._id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 700 }}>{proj.name}</span>
                      <span
                        className={`${styles.statusSelect}`}
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.15rem 0.45rem",
                          cursor: "default",
                          background: proj.status === "Completed" ? "rgba(16, 185, 129, 0.15)" : "rgba(99, 102, 241, 0.15)",
                          color: proj.status === "Completed" ? "#34d399" : "#818cf8",
                          border: proj.status === "Completed" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(99, 102, 241, 0.4)",
                        }}
                      >
                        {proj.status}
                      </span>
                    </div>

                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", height: "36px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {proj.description || "No project description provided."}
                    </p>

                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.25rem" }}>
                      <span>
                        <i className="fa-solid fa-calendar-plus" style={{ marginRight: "0.35rem" }}></i>
                        Created: <strong>{formatDateTime(proj.createdAt)}</strong>
                      </span>
                      <span>
                        <i className="fa-solid fa-users" style={{ marginRight: "0.35rem" }}></i>
                        Members: <strong>{proj.members?.length || 1} team members</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Selected Project Detailed Header & Timeline Logs */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
            {selectedProjectId && projects.find((p) => p._id === selectedProjectId) ? (() => {
              const proj = projects.find((p) => p._id === selectedProjectId);
              const projTasks = tasks.filter((t) => t.projectId?._id === proj._id || t.projectId === proj._id);
              const doneTasks = projTasks.filter((t) => t.status === "Done").length;

              return (
                <div className={styles.selectedProjectDetailCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>{proj.name}</h2>
                        <span
                          className={styles.statusSelect}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.2rem 0.6rem",
                            cursor: "default",
                            background: proj.status === "Completed" ? "rgba(16, 185, 129, 0.15)" : "rgba(99, 102, 241, 0.15)",
                            color: proj.status === "Completed" ? "#34d399" : "#818cf8",
                            border: proj.status === "Completed" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(99, 102, 241, 0.4)",
                          }}
                        >
                          {proj.status}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        {proj.description || "No project description provided."}
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        className={styles.btnSecondary}
                        onClick={handleExportDataCSV}
                        style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                      >
                        <i className="fa-solid fa-file-csv" style={{ marginRight: "0.35rem" }}></i>
                        Export CSV
                      </button>
                      <button
                        className={styles.btnSecondary}
                        onClick={handleExportDataJSON}
                        style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                      >
                        <i className="fa-solid fa-file-code" style={{ marginRight: "0.35rem" }}></i>
                        Export JSON
                      </button>
                      <button
                        className={styles.btnPrimary}
                        onClick={() => startTransition(() => setActiveTab("kanban"))}
                        style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                      >
                        <i className="fa-solid fa-kanban" style={{ marginRight: "0.35rem" }}></i>
                        Open Kanban Board
                      </button>
                      <button
                        className={styles.btnSecondary}
                        onClick={() => fetchActivityLogs()}
                        style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                      >
                        <i className="fa-solid fa-rotate-right" style={{ marginRight: "0.35rem" }}></i>
                        Refresh Audit
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", fontSize: "0.8rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                    <span>
                      <i className="fa-solid fa-clock" style={{ marginRight: "0.35rem", color: "var(--color-primary)" }}></i>
                      Created Timestamp: <strong>{formatDateTime(proj.createdAt)}</strong>
                    </span>
                    <span>
                      <i className="fa-solid fa-calendar-check" style={{ marginRight: "0.35rem", color: "var(--color-info)" }}></i>
                      Last Updated: <strong>{formatDateTime(proj.updatedAt || proj.createdAt)}</strong>
                    </span>
                    <span>
                      <i className="fa-solid fa-list-check" style={{ marginRight: "0.35rem", color: "var(--color-success)" }}></i>
                      Task Completion: <strong>{doneTasks}/{projTasks.length} Tasks Completed</strong>
                    </span>
                  </div>
                </div>
              );
            })() : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                  <i className="fa-solid fa-globe" style={{ marginRight: "0.4rem", color: "var(--color-primary)" }}></i>
                  All Workspace Activity Audit Trail
                </h3>
                <button
                  className={styles.btnSecondary}
                  onClick={() => fetchActivityLogs()}
                  style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}
                >
                  <i className="fa-solid fa-rotate-right" style={{ marginRight: "0.25rem" }}></i> Refresh Audit Logs
                </button>
              </div>
            )}

            {/* Audit Logs Filter & Search Toolbar */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "1rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search history by user, target, or details..."
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  className={styles.input}
                  style={{ paddingLeft: "2.2rem", fontSize: "0.85rem" }}
                />
                <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "0.85rem" }}></i>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Action:</span>
                <select
                  className={styles.select}
                  value={historyActionFilter}
                  onChange={(e) => {
                    setHistoryActionFilter(e.target.value);
                    setHistoryPage(1);
                  }}
                  style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                >
                  <option value="ALL">All Actions</option>
                  <option value="TASK_CREATED">Task Created</option>
                  <option value="STATUS_MOVED">Status Moved</option>
                  <option value="TASK_ASSIGNED">Task Assigned</option>
                  <option value="FILE_UPLOADED">File Uploaded</option>
                  <option value="COMMENT_ADDED">Comment Added</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Show:</span>
                <select
                  className={styles.select}
                  value={historyPerPage}
                  onChange={(e) => {
                    setHistoryPerPage(Number(e.target.value));
                    setHistoryPage(1);
                  }}
                  style={{ padding: "0.35rem 0.6rem", fontSize: "0.85rem" }}
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>

            {/* Audit Logs Timeline List with Pagination */}
            {(() => {
              const filteredLogs = activityLogs.filter((log) => {
                if (historyActionFilter !== "ALL" && log.action !== historyActionFilter) return false;
                if (historySearch) {
                  const q = historySearch.toLowerCase();
                  const matchUser = log.userName?.toLowerCase().includes(q);
                  const matchTarget = log.targetName?.toLowerCase().includes(q);
                  const matchDetails = log.details?.toLowerCase().includes(q);
                  return matchUser || matchTarget || matchDetails;
                }
                return true;
              });

              if (filteredLogs.length === 0) {
                return (
                  <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem" }}>
                    No activity logs match your search or filter criteria.
                  </p>
                );
              }

              const totalPages = Math.ceil(filteredLogs.length / historyPerPage) || 1;
              const currentPage = Math.min(historyPage, totalPages);
              const startIndex = (currentPage - 1) * historyPerPage;
              const paginatedLogs = filteredLogs.slice(startIndex, startIndex + historyPerPage);

              return (
                <>
                  <div className={styles.historyTimeline}>
                    {paginatedLogs.map((log) => {
                      const actionIcon =
                        log.action === "TASK_CREATED"
                          ? "fa-solid fa-plus"
                          : log.action === "STATUS_MOVED"
                          ? "fa-solid fa-arrows-left-right"
                          : log.action === "TASK_ASSIGNED"
                          ? "fa-solid fa-user-check"
                          : log.action === "PRIORITY_CHANGED"
                          ? "fa-solid fa-arrow-up-right-dots"
                          : log.action === "PROJECT_STATUS_CHANGED"
                          ? "fa-solid fa-flag-checkered"
                          : log.action === "FILE_UPLOADED"
                          ? "fa-solid fa-cloud-arrow-up"
                          : log.action === "COMMENT_ADDED"
                          ? "fa-solid fa-comment-dots"
                          : "fa-solid fa-bolt";

                      const actionStyle =
                        log.action === "TASK_CREATED"
                          ? styles.actionTaskCreated
                          : log.action === "STATUS_MOVED"
                          ? styles.actionStatusMoved
                          : log.action === "TASK_ASSIGNED"
                          ? styles.actionTaskAssigned
                          : log.action === "PRIORITY_CHANGED"
                          ? styles.actionPriorityChanged
                          : log.action === "FILE_UPLOADED"
                          ? styles.actionFileUploaded
                          : log.action === "COMMENT_ADDED"
                          ? styles.actionCommentAdded
                          : styles.actionDefault;

                      return (
                        <div key={log._id} className={styles.historyItem}>
                          <div className={`${styles.historyIcon} ${actionStyle}`}>
                            <i className={actionIcon}></i>
                          </div>

                          <div className={styles.historyContent}>
                            <div className={styles.historyMeta}>
                              <span>
                                <strong>{log.userName}</strong> ({log.userRole || "Team Member"})
                              </span>
                              <span>
                                <i className="fa-solid fa-clock" style={{ marginRight: "0.25rem" }}></i>
                                {formatDateTime(log.createdAt)}
                              </span>
                            </div>

                            <div className={styles.historyTitle}>
                              {log.targetName}
                            </div>

                            <div className={styles.historyDetails}>
                              {log.details}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: "1rem",
                      marginTop: "1.25rem",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Showing <strong>{startIndex + 1}</strong> - <strong>{Math.min(startIndex + historyPerPage, filteredLogs.length)}</strong> of <strong>{filteredLogs.length}</strong> activity logs
                    </span>

                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <button
                        className={styles.btnSecondary}
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", opacity: currentPage <= 1 ? 0.5 : 1 }}
                      >
                        <i className="fa-solid fa-chevron-left" style={{ marginRight: "0.25rem" }}></i> Previous
                      </button>

                      <span style={{ fontSize: "0.85rem", fontWeight: 700, padding: "0 0.5rem" }}>
                        Page {currentPage} of {totalPages}
                      </span>

                      <button
                        className={styles.btnSecondary}
                        onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", opacity: currentPage >= totalPages ? 0.5 : 1 }}
                      >
                        Next <i className="fa-solid fa-chevron-right" style={{ marginLeft: "0.25rem" }}></i>
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* POPUPS & MODAL DIALOGS */}
      {/* ======================================================= */}

      {/* Create Project Modal */}
      {showProjectForm && (
        <div className={styles.modalOverlay} onClick={() => setShowProjectForm(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setShowProjectForm(false)}>×</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              <i className="fa-solid fa-folder-plus" style={{ marginRight: "0.4rem", color: "var(--color-primary)" }}></i> Start New Project
            </h2>

            <form onSubmit={handleCreateProject} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Project Name</label>
                <input
                  type="text"
                  placeholder="e.g. Website Redesign"
                  className={styles.input}
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  placeholder="Define milestones..."
                  className={styles.input}
                  style={{ height: "60px", resize: "none" }}
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.btnPrimary} style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}>
                Create Workspace Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showTaskForm && (
        <div className={styles.modalOverlay} onClick={() => setShowTaskForm(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setShowTaskForm(false)}>×</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
              <i className="fa-solid fa-circle-plus" style={{ marginRight: "0.4rem", color: "var(--color-primary)" }}></i> Add New Task
            </h2>

            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Design Login Form UI"
                  className={styles.input}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Description</label>
                <textarea
                  placeholder="Detail instructions..."
                  className={styles.input}
                  style={{ height: "60px", resize: "none" }}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Task Assignee</label>
                  <select
                    className={styles.select}
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Priority</label>
                  <select
                    className={styles.select}
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Due Date</label>
                  <div className={styles.dateInputWrapper}>
                    <input
                      type="date"
                      className={`${styles.input} ${styles.dateInput}`}
                      value={newTaskDueDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      onClick={(e) => (e.target as any).showPicker?.()}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Link to Sprint (optional)</label>
                  <select
                    className={styles.select}
                    value={newTaskSprint}
                    onChange={(e) => setNewTaskSprint(e.target.value)}
                  >
                    <option value="">Backlog / No sprint</option>
                    {sprints.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className={styles.btnPrimary} style={{ width: "100%", padding: "0.75rem", marginTop: "0.5rem" }}>
                Create Task Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Task Details / Subtasks & Comments Modal */}
      {selectedTask && (
        <div className={styles.modalOverlay} onClick={() => setSelectedTask(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()} style={{ gap: "1rem" }}>
            <span className={styles.closeBtn} onClick={() => setSelectedTask(null)}>×</span>
            
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800 }}>{selectedTask.title}</h2>
            
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {selectedTask.description || "No description provided."}
            </p>

            <div className={styles.metaHighlightGroup}>
              <div className={styles.metaBadge}>
                <i className="fa-solid fa-user-circle" style={{ color: "var(--color-primary)" }}></i>
                <span>Assignee: <strong>{selectedTask.assignee?.name || "Unassigned"}</strong></span>
              </div>

              <div className={`${styles.metaBadge} ${
                selectedTask.priority === "High" ? styles.priorityHigh :
                selectedTask.priority === "Medium" ? styles.priorityMedium : styles.priorityLow
              }`}>
                <i className="fa-solid fa-flag"></i>
                <span>Priority: <strong>{selectedTask.priority}</strong></span>
              </div>

              <div className={styles.metaBadge}>
                <i className="fa-solid fa-list-check" style={{ color: "var(--color-primary)" }}></i>
                <span>Status:</span>
                <select
                  className={`${styles.statusSelect} ${
                    selectedTask.status === "To Do"
                      ? styles.statusToDo
                      : selectedTask.status === "In Progress"
                      ? styles.statusInProgress
                      : selectedTask.status === "Review"
                      ? styles.statusReview
                      : styles.statusDone
                  }`}
                  value={selectedTask.status}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    await handleMoveTaskStatus(selectedTask._id, newStatus);
                    setSelectedTask({ ...selectedTask, status: newStatus });
                  }}
                  style={{ border: "none" }}
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              {selectedTask.dueDate && (
                <div className={styles.metaBadge}>
                  <i className="fa-solid fa-calendar-day" style={{ color: "var(--color-info)" }}></i>
                  <span>Due: <strong>{new Date(selectedTask.dueDate).toLocaleDateString()}</strong></span>
                </div>
              )}
            </div>

            {/* Subtask Section */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Subtask Checklist
              </span>
              
              <div className={styles.subtaskList}>
                {selectedTask.subtasks?.map((sub: any, index: number) => (
                  <div key={index} className={styles.subtaskItem} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={sub.completed}
                        onChange={() => handleToggleSubtask(index)}
                      />
                      <span style={{ textDecoration: sub.completed ? "line-through" : "none", color: sub.completed ? "var(--text-muted)" : "inherit" }}>
                        {sub.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(index)}
                      style={{ background: "none", border: "none", color: "var(--color-danger)", cursor: "pointer", fontSize: "0.8rem" }}
                      title="Delete Subtask"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddSubtask} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Add a checklist item..."
                  className={styles.input}
                  style={{ flex: 1, padding: "0.35rem" }}
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  required
                />
                <button type="submit" className={styles.btnSecondary} style={{ padding: "0.35rem" }}>
                  Add
                </button>
              </form>
            </div>

            {/* Comment Section */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Activity Chat Logs
              </span>
              
              <div className={styles.commentBox}>
                {selectedTask.comments?.length === 0 ? (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", padding: "0.5rem 0" }}>No comments logged yet.</p>
                ) : (
                  selectedTask.comments?.map((com: any, index: number) => (
                    <div key={index} className={styles.commentItem}>
                      <span style={{ fontWeight: 700 }}>
                        {com.userName}{" "}
                        <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                          {new Date(com.createdAt).toLocaleString(undefined, {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </span>
                      <p style={{ color: "var(--text-secondary)" }}>{com.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Post comment logs..."
                  className={styles.input}
                  style={{ flex: 1, padding: "0.35rem" }}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  required
                />
                <button type="submit" className={styles.btnPrimary} style={{ padding: "0.35rem" }}>
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create Virtual Folder Modal */}
      {showFolderModal && (
        <div className={styles.modalOverlay} onClick={() => setShowFolderModal(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setShowFolderModal(false)}>×</span>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>
              <i className="fa-solid fa-folder-plus" style={{ marginRight: "0.4rem", color: "#f59e0b" }}></i> Create Virtual Folder
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newFolderName && newFolderName.trim()) {
                  const clean = "/" + newFolderName.trim().replace(/^\/+/, "");
                  if (!customFolders.includes(clean)) {
                    setCustomFolders([...customFolders, clean]);
                  }
                  setDriveFolder(clean);
                  setNewFolderName("");
                  setShowFolderModal(false);
                  showToast(`Folder '${clean.replace("/", "")}' created!`, "success");
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.5rem" }}
            >
              <div className={styles.formGroup}>
                <label className={styles.label}>Folder Name</label>
                <input
                  type="text"
                  placeholder="e.g. Marketing, DesignAssets"
                  className={styles.input}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowFolderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete File Confirmation Modal */}
      {fileToDelete && (
        <div className={styles.modalOverlay} onClick={() => !isDeletingFile && setFileToDelete(null)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => !isDeletingFile && setFileToDelete(null)}>×</span>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--color-danger)" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "0.4rem" }}></i> Confirm File Deletion
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "0.5rem 0 1rem 0" }}>
              Are you sure you want to permanently delete this file from Drive space? This action cannot be undone.
            </p>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setFileToDelete(null)}
                disabled={isDeletingFile}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={confirmDeleteFile}
                disabled={isDeletingFile}
                style={{ background: "var(--color-danger)", borderColor: "var(--color-danger)" }}
              >
                {isDeletingFile ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}>
          <i className={toast.type === "success" ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"}></i>
          {toast.message}
        </div>
      )}
    </div>
  );
}
