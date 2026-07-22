"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useAuth } from "@/hooks/useAuth";
import styles from "./projects.module.css";

export default function ProjectsPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"kanban" | "gantt" | "wiki" | "drive" | "workload">("kanban");
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Core Lists States
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);

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

  // Task details modal inputs
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [commentText, setCommentText] = useState("");

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

  // Load Tab Data
  useEffect(() => {
    if (!mounted) return;
    const init = async () => {
      setLoading(true);
      await fetchProjects();
      await fetchTeam();
      await fetchSprints();
      setLoading(false);
    };
    init();
  }, [mounted]);

  // Fetch tasks when project is toggled
  useEffect(() => {
    if (mounted && selectedProjectId) {
      fetchTasks();
    }
  }, [selectedProjectId, mounted]);

  // Load specific tab lists
  useEffect(() => {
    if (!mounted) return;
    if (activeTab === "wiki") fetchWiki();
    else if (activeTab === "drive") fetchDrive();
  }, [activeTab, mounted]);

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

  // Task Status Update (Kanban Drag and Drop)
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
        method: "PUT",
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

  // Drive File Upload
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("fileName", uploadName || uploadFile.name);

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

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const res = await fetch(`/api/drive?fileId=${fileId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchDrive();
        showToast("File deleted.", "success");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to delete file.", "error");
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
      {/* Title & Actions */}
      <div className={styles.titleSection}>
        <div>
          <h1 className={styles.title}>Projects & Wiki</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Manage product sprints, Kanban tasks, Gantt timelines, collaborative Wiki docs, and files.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {activeTab === "kanban" && (
            <>
              <button className={styles.btnSecondary} onClick={() => setShowProjectForm(true)}>
                <i className="fa-solid fa-folder-plus" style={{ marginRight: "0.25rem" }}></i> New Project
              </button>
              <button className={styles.btnPrimary} onClick={() => setShowTaskForm(true)}>
                <i className="fa-solid fa-circle-plus" style={{ marginRight: "0.25rem" }}></i> Create Task
              </button>
            </>
          )}
          {activeTab === "wiki" && (
            <button className={styles.btnPrimary} onClick={handleCreateWikiArticle}>
              <i className="fa-solid fa-file-pen" style={{ marginRight: "0.25rem" }}></i> New SOP Article
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "kanban" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("kanban"))}
        >
          <i className="fa-solid fa-grip-vertical" style={{ marginRight: "0.25rem" }}></i> Kanban Board
        </button>
        <button
          className={`${styles.tab} ${activeTab === "gantt" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("gantt"))}
        >
          <i className="fa-solid fa-chart-gantt" style={{ marginRight: "0.25rem" }}></i> Gantt Timeline
        </button>
        <button
          className={`${styles.tab} ${activeTab === "wiki" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("wiki"))}
        >
          <i className="fa-solid fa-book-open-reader" style={{ marginRight: "0.25rem" }}></i> SOP Wiki
        </button>
        <button
          className={`${styles.tab} ${activeTab === "drive" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("drive"))}
        >
          <i className="fa-solid fa-hard-drive" style={{ marginRight: "0.25rem" }}></i> Drive Space
        </button>
        <button
          className={`${styles.tab} ${activeTab === "workload" ? styles.tabActive : ""}`}
          onClick={() => startTransition(() => setActiveTab("workload"))}
        >
          <i className="fa-solid fa-chart-pie" style={{ marginRight: "0.25rem" }}></i> Team Workloads
        </button>
      </div>

      {/* Project Selector Bar (Mainly for Kanban/Gantt) */}
      {(activeTab === "kanban" || activeTab === "gantt") && (
        <div className={`${styles.projectBar} glass-panel`}>
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
          {projects.find((p) => p._id === selectedProjectId) && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Status: <strong>{projects.find((p) => p._id === selectedProjectId).status}</strong>
            </span>
          )}
        </div>
      )}

      {/* ----------------- Tab 1: Kanban Board ----------------- */}
      {activeTab === "kanban" && (
        <div className={styles.kanbanGrid}>
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            const isOverThisCol = activeOverColumn === col;

            return (
              <div
                key={col}
                className={`${styles.kanbanColumn} ${isOverThisCol ? styles.kanbanColumnHighlight : ""}`}
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
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>👤</span>
                          )}
                        </div>

                        <span className={styles.taskTitle}>{task.title}</span>

                        <div className={styles.taskFooter}>
                          <span>⏱️ {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</span>
                          <span>💬 {task.comments?.length || 0}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------- Tab 2: Gantt Timeline ----------------- */}
      {activeTab === "gantt" && (
        <div className={`${styles.ganttWrapper} glass-panel`} style={{ borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
            📅 Chronological Task Schedule
          </h2>

          {tasks.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No tasks created yet for timeline view.</p>
          ) : (
            <div style={{ marginTop: "1rem" }}>
              {tasks.map((task) => {
                // Simple representation of Gantt Bar:
                // Start date is createdAt (or today), due date is task.dueDate.
                const start = new Date(task.createdAt);
                const end = task.dueDate ? new Date(task.dueDate) : new Date();
                
                // Calculate relative widths
                const today = new Date();
                const totalDiff = end.getTime() - start.getTime();
                const durationDays = Math.max(1, Math.ceil(totalDiff / (1000 * 60 * 60 * 24)));

                return (
                  <div key={task._id} className={styles.ganttRow}>
                    <span className={styles.ganttTaskLabel}>{task.title}</span>
                    <div className={styles.ganttTrack}>
                      <div
                        className={styles.ganttBar}
                        style={{
                          left: "5%",
                          width: `${Math.min(90, 10 + durationDays * 2.5)}%`,
                        }}
                      >
                        {durationDays}d
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  📄 {art.title}
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
                      💾 Save Document
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
                    📝 Edit SOP Article
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
          {/* File Upload Bar */}
          <div className="glass-panel" style={{ padding: "1rem" }}>
            <form onSubmit={handleUploadFile} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <input
                  type="file"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setUploadFile(files[0]);
                      setUploadName(files[0].name);
                    }
                  }}
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  placeholder="Rename file (optional)"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className={styles.input}
                />
              </div>
              <button type="submit" className={styles.btnPrimary} disabled={!uploadFile}>
                📤 Upload to Drive
              </button>
            </form>
          </div>

          {/* Drive Locker Grid */}
          <div className={`${styles.timesheetCard} glass-panel`}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
              📁 Shared Directory Files
            </h2>

            {driveFiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                Drive space is empty. Upload documents or PDFs to share with the team.
              </p>
            ) : (
              <div className={styles.fileGrid}>
                {driveFiles.map((file) => {
                  const sizeKB = Math.round(file.size / 1024);
                  
                  // Icon mapping based on file type
                  const fileIconClass = file.mimeType?.startsWith("image/")
                    ? "fa-solid fa-file-image"
                    : file.mimeType?.includes("pdf")
                    ? "fa-solid fa-file-pdf"
                    : file.mimeType?.includes("word") || file.name.endsWith(".doc") || file.name.endsWith(".docx")
                    ? "fa-solid fa-file-word"
                    : "fa-solid fa-file";

                  return (
                    <div key={file._id} className={`${styles.fileCard} glass-panel`}>
                      <i className={`${fileIconClass} ${styles.fileIcon}`}></i>
                      <span className={styles.fileName} title={file.name}>{file.name}</span>
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
                          style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem", color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
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
            )}
          </div>
        </div>
      )}

      {/* ----------------- Tab 5: Workload Allocation ----------------- */}
      {activeTab === "workload" && (
        <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "var(--radius-lg)" }}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
            📊 Employee Task Workloads
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
                        ⚠️ Workload Overload ({assignedTasks.length} tasks)
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

      {/* ======================================================= */}
      {/* POPUPS & MODAL DIALOGS */}
      {/* ======================================================= */}

      {/* Create Project Modal */}
      {showProjectForm && (
        <div className={styles.modalOverlay} onClick={() => setShowProjectForm(false)}>
          <div className={`${styles.modal} glass-panel`} onClick={(e) => e.stopPropagation()}>
            <span className={styles.closeBtn} onClick={() => setShowProjectForm(false)}>×</span>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>📂 Start New Project</h2>

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
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>➕ Add New Task</h2>

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
                  <input
                    type="date"
                    className={styles.input}
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                  />
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

            <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Assignee: <strong>{selectedTask.assignee?.name || "Unassigned"}</strong></span>
              <span>Priority: <strong>{selectedTask.priority}</strong></span>
              <span>Status: <strong>{selectedTask.status}</strong></span>
            </div>

            {/* Subtask Section */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Subtask Checklist
              </span>
              
              <div className={styles.subtaskList}>
                {selectedTask.subtasks?.map((sub: any, index: number) => (
                  <div key={index} className={styles.subtaskItem}>
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => handleToggleSubtask(index)}
                    />
                    <span style={{ textDecoration: sub.completed ? "line-through" : "none", color: sub.completed ? "var(--text-muted)" : "inherit" }}>
                      {sub.title}
                    </span>
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
                      <span style={{ fontWeight: 700 }}>{com.userName} <span style={{ fontSize: "0.65rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.5rem" }}>{new Date(com.createdAt).toLocaleTimeString()}</span></span>
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
