"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn, getISTDateString } from "@/lib/utils";

import { useTabPersistence } from "@/hooks/useTabPersistence";
import { AccessRestricted } from "@/components/ui/AccessRestricted";
import { ProjectsGridModern } from "./ProjectsGridModern";
import { TasksListModern } from "./TasksListModern";

export type WorkspaceTabKey =
  | "projects_grid"
  | "tasks"
  | "kanban"
  | "gantt"
  | "wiki"
  | "drive"
  | "workload"
  | "history"
  | "trash";

export interface ProjectsDriveWorkspaceProps {
  initialTab?: WorkspaceTabKey;
  hideHeader?: boolean;
}

export function ProjectsDriveWorkspace({ initialTab, hideHeader = false }: ProjectsDriveWorkspaceProps = {}) {
  const { user: currentUser, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const { can, canAccessModule, isAdmin, isOPS, loading: permLoading } = usePermissions();
  const canDeleteProject = isAdmin || can("deleteProjects");
  const canAccessTrash = isAdmin || isOPS || can("deleteProjects");

  const [persistedTab, setPersistedTab] = useTabPersistence<WorkspaceTabKey>(
    "projects_active_tab",
    initialTab || "projects_grid",
    ["projects_grid", "tasks", "kanban", "gantt", "wiki", "drive", "workload", "history", "trash"]
  );
  const [activeTab, setActiveTabState] = useState<WorkspaceTabKey>(
    initialTab || persistedTab || "projects_grid"
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTabState(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === "trash" && !canAccessTrash && !permLoading) {
      setActiveTabState("projects_grid");
      setPersistedTab("projects_grid");
    }
  }, [activeTab, canAccessTrash, permLoading]);

  const setActiveTab = (tab: WorkspaceTabKey) => {
    if (tab === "trash" && !canAccessTrash) return;
    setActiveTabState(tab);
    setPersistedTab(tab);
  };
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
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

  // Edit project state
  const [showEditProjectForm, setShowEditProjectForm] = useState(false);
  const [editProjName, setEditProjName] = useState("");
  const [editProjDesc, setEditProjDesc] = useState("");
  const [editProjStatus, setEditProjStatus] = useState("Planning");
  const [editProjAssignType, setEditProjAssignType] = useState<"Member" | "Department">("Member");
  const [editProjAssignDept, setEditProjAssignDept] = useState("");
  const [editProjMembers, setEditProjMembers] = useState<string[]>([]);
  const [editProjStartDate, setEditProjStartDate] = useState("");
  const [editProjDueDate, setEditProjDueDate] = useState("");
  const [editProjCost, setEditProjCost] = useState("");
  const [editProjIsInternal, setEditProjIsInternal] = useState(true);
  const [editProjRequirements, setEditProjRequirements] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Trash & 30-day Retention states
  const [trashedProjects, setTrashedProjects] = useState<any[]>([]);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [isRestoringProject, setIsRestoringProject] = useState<string | null>(null);
  const [purgeConfirmProject, setPurgeConfirmProject] = useState<{ id: string; name: string } | null>(null);
  const [isPurgingProject, setIsPurgingProject] = useState<string | null>(null);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskSprint, setNewTaskSprint] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [isCreatingTask, setIsCreatingTask] = useState(false);

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
  const [editingFile, setEditingFile] = useState<{ _id: string; name: string; folder: string } | null>(null);
  const [isUpdatingFile, setIsUpdatingFile] = useState<boolean>(false);

  // Multi-select & Batch operations & Preview Lightbox state
  const [selectedDriveFileIds, setSelectedDriveFileIds] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState<boolean>(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState<boolean>(false);

  // Enhanced Drive Space States
  const [driveViewMode, setDriveViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("drive_view_mode") as "grid" | "list") || "grid";
    }
    return "grid";
  });
  const [driveFolderFilter, setDriveFolderFilter] = useState<string>("All");
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [showUploadPanel, setShowUploadPanel] = useState<boolean>(true);
  const driveFileInputRef = useRef<HTMLInputElement>(null);

  // Drive Files Filtering & Sorting State
  const [driveSearch, setDriveSearch] = useState<string>("");
  const [driveTypeFilter, setDriveTypeFilter] = useState<string>("All");
  const [driveUploaderFilter, setDriveUploaderFilter] = useState<string>("All");
  const [driveSortBy, setDriveSortBy] = useState<string>("newest");
  const [drivePage, setDrivePage] = useState<number>(1);
  const [drivePerPage, setDrivePerPage] = useState<number>(6);
  const [driveShowAll, setDriveShowAll] = useState<boolean>(false);

  // Project Activity History Pagination state
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState<number>(5);
  const [historyShowAll, setHistoryShowAll] = useState<boolean>(false);

  // Kanban multi-filter and task preview state
  const [taskSearchQuery, setTaskSearchQuery] = useState<string>("");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<"all" | "High" | "Medium" | "Low">("all");
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>("all");
  const [taskSprintFilter, setTaskSprintFilter] = useState<string>("all");
  const [taskDueSoonOnly, setTaskDueSoonOnly] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; title: string } | null>(null);

  const columns = ["To Do", "In Progress", "Review", "Done"];

  // Board Sidebar & Filter state
  const [boardFilter, setBoardFilter] = useState<"all" | "starred">("all");
  const [boardSidebarCollapsed, setBoardSidebarCollapsed] = useState<boolean>(false);
  const [starredProjectIds, setStarredProjectIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("starred_project_ids");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const toggleStarProject = async (projectId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isCurrentlyStarred = starredProjectIds.includes(projectId);
    const nextStarred = isCurrentlyStarred
      ? starredProjectIds.filter((id) => id !== projectId)
      : [...starredProjectIds, projectId];

    setStarredProjectIds(nextStarred);
    try {
      localStorage.setItem("starred_project_ids", JSON.stringify(nextStarred));
    } catch (err) {}

    const targetProject = projects.find((p) => p._id === projectId);
    const projName = targetProject?.name || "Project";
    const actionName = isCurrentlyStarred ? "Project Unstarred" : "Project Starred";
    const detailsText = isCurrentlyStarred
      ? `Removed project "${projName}" from Starred Boards`
      : `Pinned project "${projName}" to Starred Boards`;

    showToast(detailsText, "success");

    try {
      await fetch("/api/activity-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          action: actionName,
          targetName: projName,
          details: detailsText,
        }),
      });
      fetchActivityLogs(selectedProjectId || "all");
    } catch (err) {
      console.error("Failed to log star activity:", err);
    }
  };

  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTrashedProjects = async () => {
    if (!canAccessTrash) {
      setTrashedProjects([]);
      return;
    }
    try {
      setLoadingTrash(true);
      const res = await fetch("/api/projects?trash=true");
      if (res.ok) {
        const data = await res.json();
        setTrashedProjects(data.projects || []);
      }
    } catch (e) {
      console.error("fetchTrashedProjects error:", e);
    } finally {
      setLoadingTrash(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        const list = data.projects || [];
        setProjects(list);
        if (selectedProjectId !== "all" && !list.some((p: any) => p._id === selectedProjectId)) {
          setSelectedProjectId("all");
        }
        await fetchTasks(selectedProjectId || "all");
        await fetchActivityLogs(selectedProjectId || "all");
        fetchTrashedProjects();
        return list;
      }
    } catch (e) {
      console.error("fetchProjects error:", e);
    }
    return [];
  };

  const handleSoftDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeletingProject(true);
    try {
      const res = await fetch(`/api/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Project '${projectToDelete.name}' moved to trash. Retained for 30 days.`, "success");
        setShowDeleteConfirm(false);
        setProjectToDelete(null);
        setSelectedProjectId("all");
        await fetchProjects();
        await fetchTrashedProjects();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete project.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to delete project.", "error");
    } finally {
      setIsDeletingProject(false);
    }
  };

  const handleRestoreProject = async (id: string, name: string) => {
    setIsRestoringProject(id);
    try {
      const res = await fetch(`/api/projects/${id}/restore`, {
        method: "POST",
      });
      if (res.ok) {
        showToast(`Project '${name}' restored successfully!`, "success");
        await fetchProjects();
        await fetchTrashedProjects();
        setSelectedProjectId(id);
        setActiveTab("kanban");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to restore project.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to restore project.", "error");
    } finally {
      setIsRestoringProject(null);
    }
  };

  const handlePermanentPurgeProject = async (id: string, name: string) => {
    setIsPurgingProject(id);
    try {
      const res = await fetch(`/api/projects/${id}?permanent=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Project '${name}' permanently purged.`, "info");
        setPurgeConfirmProject(null);
        await fetchTrashedProjects();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to permanently purge project.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to permanently purge project.", "error");
    } finally {
      setIsPurgingProject(null);
    }
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

  const fetchSprints = async () => {
    try {
      const res = await fetch("/api/sprints");
      if (res.ok) {
        const data = await res.json();
        setSprints(data.sprints || []);
      }
    } catch (e) {
      console.error("fetchSprints error:", e);
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

  const handleFileUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!uploadFile) return;

    try {
      setIsUploadingFile(true);
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("fileName", uploadName || uploadFile.name);
      formData.append("folder", driveFolder);

      const res = await fetch("/api/drive", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        showToast("File uploaded successfully to Drive Space!", "success");
        setUploadFile(null);
        setUploadName("");
        if (driveFileInputRef.current) {
          driveFileInputRef.current.value = "";
        }
        await fetchDriveFiles();
        fetchActivityLogs();
      } else {
        const err = await res.json();
        showToast(err.error || "Upload failed", "error");
      }
    } catch (e) {
      showToast("File upload error", "error");
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleUpdateFile = async () => {
    if (!editingFile) return;
    try {
      setIsUpdatingFile(true);
      const res = await fetch("/api/drive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: editingFile._id,
          name: editingFile.name,
          folder: editingFile.folder,
        }),
      });

      if (res.ok) {
        showToast("File updated successfully!", "success");
        setEditingFile(null);
        await fetchDriveFiles();
        fetchActivityLogs();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update file", "error");
      }
    } catch (e) {
      showToast("Error updating file", "error");
    } finally {
      setIsUpdatingFile(false);
    }
  };

  const handleCopyFileLink = (file: any) => {
    const downloadUrl = `${window.location.origin}/api/drive/download?fileId=${file._id}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(downloadUrl).then(() => {
        setCopiedFileId(file._id);
        showToast(`Download link copied to clipboard!`, "success");
        setTimeout(() => setCopiedFileId(null), 2500);
      }).catch(() => {
        showToast("Could not copy link to clipboard", "error");
      });
    }
  };

  const handleToggleDriveView = (mode: "grid" | "list") => {
    setDriveViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("drive_view_mode", mode);
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
        if (previewFile?._id === fileId) setPreviewFile(null);
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

  const driveUploaders = useMemo(() => {
    return ["All", ...Array.from(new Set(driveFiles.map((f) => f.uploadedBy?.name).filter(Boolean)))];
  }, [driveFiles]);

  const driveFolders = useMemo(() => {
    const folders = new Set<string>();
    driveFiles.forEach((f) => {
      const folderName = (f.folder || "/").trim();
      if (folderName) folders.add(folderName);
    });
    return ["All", ...Array.from(folders)];
  }, [driveFiles]);

  const driveStats = useMemo(() => {
    let totalBytes = 0;
    let imgCount = 0;
    let docCount = 0;
    let sheetCount = 0;
    let otherCount = 0;

    driveFiles.forEach((file) => {
      const bytes = file.size || 0;
      totalBytes += bytes;
      const ext = file.name?.split(".").pop()?.toLowerCase() || "";
      const mime = file.mimeType || "";
      if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
        imgCount++;
      } else if (ext === "pdf" || mime.includes("word") || ["doc", "docx", "txt", "rtf"].includes(ext)) {
        docCount++;
      } else if (["xls", "xlsx", "csv"].includes(ext) || mime.includes("sheet")) {
        sheetCount++;
      } else {
        otherCount++;
      }
    });

    const formatBytes = (bytes: number) => {
      if (bytes === 0) return "0 KB";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    return {
      totalCount: driveFiles.length,
      totalFormatted: formatBytes(totalBytes),
      totalBytes,
      imgCount,
      docCount,
      sheetCount,
      otherCount,
    };
  }, [driveFiles]);

  const filteredDriveFiles = useMemo(() => {
    return driveFiles.filter((file) => {
      const q = driveSearch.toLowerCase().trim();
      const uploaderName = file.uploadedBy?.name || "Member";
      const matchesSearch = !q || file.name.toLowerCase().includes(q) || uploaderName.toLowerCase().includes(q);

      const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() || "" : "";
      const mime = file.mimeType || "";

      let matchesType = true;
      if (driveTypeFilter === "Images") {
        matchesType = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext);
      } else if (driveTypeFilter === "PDFs") {
        matchesType = mime === "application/pdf" || ext === "pdf";
      } else if (driveTypeFilter === "Documents") {
        matchesType = ["doc", "docx", "txt", "rtf", "md"].includes(ext) || mime.includes("word") || mime.includes("text");
      } else if (driveTypeFilter === "Spreadsheets") {
        matchesType = ["xls", "xlsx", "csv"].includes(ext) || mime.includes("sheet") || mime.includes("csv");
      } else if (driveTypeFilter === "Archives") {
        matchesType = ["zip", "rar", "7z", "tar", "gz"].includes(ext) || mime.includes("zip");
      } else if (driveTypeFilter === "Resumes") {
        matchesType = file.folder === "Resumes" || file.name.toLowerCase().includes("resume");
      } else if (driveTypeFilter === "Other") {
        const isCommon = mime.startsWith("image/") || ext === "pdf" || ["doc", "docx", "txt", "xls", "xlsx", "csv", "zip"].includes(ext);
        matchesType = !isCommon;
      }

      const matchesUploader = driveUploaderFilter === "All" || uploaderName === driveUploaderFilter;
      const matchesFolder = driveFolderFilter === "All" || (file.folder || "/") === driveFolderFilter;

      return matchesSearch && matchesType && matchesUploader && matchesFolder;
    }).sort((a, b) => {
      if (driveSortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (driveSortBy === "name-asc") return a.name.localeCompare(b.name);
      if (driveSortBy === "name-desc") return b.name.localeCompare(a.name);
      if (driveSortBy === "member-asc") return (a.uploadedBy?.name || "Member").localeCompare(b.uploadedBy?.name || "Member");
      if (driveSortBy === "member-desc") return (b.uploadedBy?.name || "Member").localeCompare(a.uploadedBy?.name || "Member");
      if (driveSortBy === "size-desc") return (b.size || 0) - (a.size || 0);
      if (driveSortBy === "size-asc") return (a.size || 0) - (b.size || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [driveFiles, driveSearch, driveTypeFilter, driveUploaderFilter, driveSortBy, driveFolderFilter]);

  const handleSelectAllDriveFiles = () => {
    if (selectedDriveFileIds.length === filteredDriveFiles.length && filteredDriveFiles.length > 0) {
      setSelectedDriveFileIds([]);
    } else {
      setSelectedDriveFileIds(filteredDriveFiles.map((f) => f._id));
    }
  };

  const handleBatchDownloadDriveFiles = () => {
    const selectedFiles = driveFiles.filter((f) => selectedDriveFileIds.includes(f._id));
    if (selectedFiles.length === 0) return;

    selectedFiles.forEach((file, index) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = `/api/drive/download?fileId=${file._id}&download=true`;
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

    try {
      const res = await fetch("/api/drive", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: selectedDriveFileIds }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Successfully deleted ${data.deletedCount || selectedDriveFileIds.length} file(s)`, "success");
        setSelectedDriveFileIds([]);
        setShowBatchDeleteModal(false);
        await fetchDriveFiles();
        fetchActivityLogs();
      } else {
        const err = await res.json();
        showToast(err.error || "Batch delete failed", "error");
      }
    } catch (e) {
      showToast("Error during batch delete", "error");
    } finally {
      setIsDeletingBatch(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    const init = async () => {
      setLoading(true);
      await fetchProjects();
      await fetchTeam();
      await fetchSprints();
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

  useEffect(() => {
    if (mounted && activeTab === "drive") {
      fetchDriveFiles();
    }
  }, [activeTab, mounted]);

  const processedTaskIdRef = useRef<string | null>(null);

  const handleCloseTaskModal = () => {
    setSelectedTask(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("taskId")) {
        url.searchParams.delete("taskId");
        const newUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "");
        window.history.replaceState({}, "", newUrl);
      }
    }
  };

  // Handle URL deep linking (e.g. from Notifications: ?projectId=...&taskId=...&tab=...)
  useEffect(() => {
    if (!mounted) return;
    const urlProjectId = searchParams.get("projectId");
    const urlTaskId = searchParams.get("taskId");
    const urlTab = searchParams.get("tab");

    if (urlTab && ["projects_grid", "projects", "tasks", "kanban", "gantt", "wiki", "drive", "workload", "history"].includes(urlTab)) {
      if (urlTab === "projects") {
        setActiveTab("projects_grid");
      } else {
        setActiveTab(urlTab as any);
      }
    }
    if (urlProjectId && urlProjectId !== selectedProjectId) {
      setSelectedProjectId(urlProjectId);
    }
    if (urlTaskId && processedTaskIdRef.current !== urlTaskId) {
      processedTaskIdRef.current = urlTaskId;
      const found = tasks.find((t) => t._id === urlTaskId);
      if (found) {
        setSelectedTask(found);
      } else {
        fetch(`/api/tasks?taskId=${urlTaskId}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.task) {
              setSelectedTask(data.task);
              const pId = data.task.projectId?._id || data.task.projectId;
              if (pId && pId !== selectedProjectId) {
                setSelectedProjectId(pId);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [mounted, searchParams]);

  const handleOpenEditProject = (targetProj?: any) => {
    const proj = targetProj || (selectedProjectId !== "all" ? projects.find((p) => p._id === selectedProjectId) : null);
    if (!proj) return;
    if (proj._id && proj._id !== selectedProjectId) {
      setSelectedProjectId(proj._id);
    }
    setEditProjName(proj.name || "");
    setEditProjDesc(proj.description || "");
    setEditProjStatus(proj.status || "Planning");
    setEditProjAssignType(proj.assignType || "Member");
    setEditProjAssignDept(proj.assignedDepartment || "");
    setEditProjMembers(proj.members?.map((m: any) => m._id || m) || []);
    setEditProjStartDate(proj.startDate ? getISTDateString(proj.startDate) : "");
    setEditProjDueDate(proj.dueDate ? getISTDateString(proj.dueDate) : "");
    setEditProjCost(proj.cost !== undefined && proj.cost !== null ? String(proj.cost) : "");
    setEditProjIsInternal(proj.isInternal ?? true);
    setEditProjRequirements(proj.requirements || "");
    setShowEditProjectForm(true);
  };

  const handleRequestDeleteProject = (project: { _id: string; name: string }) => {
    setProjectToDelete({ id: project._id, name: project.name });
    setShowDeleteConfirm(true);
  };

  const handleUpdateTaskStatus = async (taskId: string, targetStatus: string) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: targetStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t._id === taskId ? { ...t, status: targetStatus } : t))
        );
        showToast(`Task moved to ${targetStatus}`, "success");
        fetchActivityLogs(selectedProjectId || "all");
      }
    } catch (e) {
      console.error("handleUpdateTaskStatus error:", e);
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || selectedProjectId === "all" || !editProjName) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editProjName,
          description: editProjDesc,
          status: editProjStatus,
          assignType: editProjAssignType,
          assignedDepartment: editProjAssignType === "Department" ? editProjAssignDept : undefined,
          members: editProjAssignType === "Member" ? editProjMembers : undefined,
          startDate: editProjStartDate || undefined,
          dueDate: editProjDueDate || undefined,
          cost: editProjCost !== "" ? Number(editProjCost) : 0,
          isInternal: editProjIsInternal,
          requirements: editProjRequirements,
        }),
      });
      if (res.ok) {
        showToast("Project updated successfully!", "success");
        setShowEditProjectForm(false);
        await fetchProjects();
        fetchActivityLogs();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update project.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to update project.", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

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
    const targetProjId =
      newTaskProject ||
      (selectedProjectId && selectedProjectId !== "all" ? selectedProjectId : projects[0]?._id);

    if (!newTaskTitle.trim()) {
      showToast("Please enter a task title.", "error");
      return;
    }
    if (!targetProjId) {
      showToast("Please select a project for this task.", "error");
      return;
    }

    try {
      setIsCreatingTask(true);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim(),
          projectId: targetProjId,
          assignee: newTaskAssignee || undefined,
          priority: newTaskPriority,
          dueDate: newTaskDueDate || undefined,
          sprintId: newTaskSprint || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchTasks(selectedProjectId || "all");
        setShowTaskForm(false);
        setNewTaskTitle("");
        setNewTaskDesc("");
        setNewTaskDueDate("");
        setNewTaskAssignee("");
        setNewTaskSprint("");
        setNewTaskProject("");
        showToast("Task created successfully!", "success");

        // Log history
        await fetch("/api/activity-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: targetProjId,
            action: "Task Created",
            targetName: newTaskTitle,
            details: `Task "${newTaskTitle}" created with priority ${newTaskPriority}`
          })
        });
        fetchActivityLogs(selectedProjectId || "all");
      } else {
        showToast(data.error || "Failed to create task.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to create task.", "error");
    } finally {
      setIsCreatingTask(false);
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

  const handleDeleteTask = async (taskId: string) => {
    setIsDeletingTask(true);
    try {
      const res = await fetch(`/api/tasks?taskId=${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Task deleted successfully", "success");
        setTaskToDelete(null);
        setSelectedTask(null);
        await fetchTasks(selectedProjectId || "all");
        await fetchActivityLogs(selectedProjectId || "all");
      } else {
        showToast(data.error || "Failed to delete task", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error deleting task", "error");
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleQuickStatusChange = async (taskId: string, targetStatus: string) => {
    await handleMoveTaskStatus(taskId, targetStatus);
    if (selectedTask && selectedTask._id === taskId) {
      setSelectedTask((prev: any) => prev ? { ...prev, status: targetStatus } : null);
    }
  };

  const handleExportTasksCSV = () => {
    if (tasks.length === 0) {
      showToast("No tasks available to export", "info");
      return;
    }
    const headers = [
      "Task ID",
      "Title",
      "Project",
      "Priority",
      "Status",
      "Assignee",
      "Due Date",
      "Estimated Hours",
      "Subtasks Progress",
      "Description",
      "Created At"
    ];
    const rows = tasks.map((t) => {
      const subtasksTotal = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
      const subtasksDone = Array.isArray(t.subtasks) ? t.subtasks.filter((s: any) => s.completed).length : 0;
      const subtaskStr = subtasksTotal > 0 ? `${subtasksDone}/${subtasksTotal} Completed` : "No subtasks";
      const descClean = (t.description || "").replace(/[\r\n]+/g, " ").trim();

      return [
        t._id,
        t.title || "",
        t.projectId?.name || t.project || "General",
        t.priority || "Medium",
        t.status || "To Do",
        t.assignee?.name || "Unassigned",
        t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No date",
        t.estimatedHours || 0,
        subtaskStr,
        descClean,
        t.createdAt ? new Date(t.createdAt).toLocaleString() : "",
      ];
    });
    const csvContent = "\uFEFF" + [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.map((c) => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `project_tasks_detailed_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported detailed tasks CSV successfully", "success");
  };

  const handleExportHistoryCSV = () => {
    if (activityLogs.length === 0) {
      showToast("No history logs available to export", "info");
      return;
    }
    const headers = ["Timestamp", "User", "Role", "Action", "Target", "Details"];
    const rows = activityLogs.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.userName || "System",
      l.userRole || "Member",
      l.action || "",
      l.targetName || "",
      l.details || "",
    ]);
    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((r) => r.map((c) => `"${(c || "").toString().replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `project_history_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported project history CSV successfully", "success");
  };

  if (!mounted || authLoading || permLoading) {
    return <Preloader label="Loading Projects Workspace..." />;
  }

  if (currentUser && !canAccessModule("projects")) {
    return <AccessRestricted moduleName="Projects & Drive" icon="fa-solid fa-folder-tree" />;
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
              : toast.type === "info"
              ? "bg-sky-600/90 text-white border-sky-700"
              : "bg-destructive/90 text-white border-destructive"
          )}
        >
          <i
            className={cn(
              "fa-solid text-sm",
              toast.type === "success"
                ? "fa-circle-check"
                : toast.type === "info"
                ? "fa-circle-info"
                : "fa-circle-exclamation"
            )}
          />
          {toast.message}
        </div>
      )}

      {/* Title Bar */}
      {!hideHeader ? (
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
      ) : null}

      {/* Modern Workspace Segmented Navigation & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-1.5 rounded-2xl bg-card/70 dark:bg-card/40 backdrop-blur-md border border-border/70 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveTab("projects_grid")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "projects_grid"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className={cn("fa-solid fa-table-cells-large text-xs", activeTab === "projects_grid" ? "text-primary-foreground" : "text-rose-500")} />
            <span>Projects</span>
            {projects.length > 0 && (
              <span className={cn("px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold", activeTab === "projects_grid" ? "bg-white/25 text-white" : "bg-rose-500/15 text-rose-600 dark:text-rose-400")}>
                {projects.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "tasks"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className={cn("fa-solid fa-list-check text-xs", activeTab === "tasks" ? "text-primary-foreground" : "text-sky-400")} />
            <span>Tasks</span>
            {tasks.length > 0 && (
              <span className={cn("px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold", activeTab === "tasks" ? "bg-white/25 text-white" : "bg-sky-500/15 text-sky-600 dark:text-sky-400")}>
                {tasks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("gantt")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "gantt"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className={cn("fa-solid fa-chart-gantt text-xs", activeTab === "gantt" ? "text-primary-foreground" : "text-indigo-400")} />
            <span>Gantt Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab("wiki")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "wiki"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className={cn("fa-solid fa-book-bookmark text-xs", activeTab === "wiki" ? "text-primary-foreground" : "text-emerald-400")} />
            <span>SOP Wiki</span>
          </button>

          <button
            onClick={() => setActiveTab("drive")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "drive"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className={cn("fa-solid fa-hard-drive text-xs", activeTab === "drive" ? "text-primary-foreground" : "text-amber-400")} />
            <span>Drive Space</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activeTab === "history"
                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <i className={cn("fa-solid fa-clock-rotate-left text-xs", activeTab === "history" ? "text-primary-foreground" : "text-purple-400")} />
            <span>Project History</span>
          </button>

          {canAccessTrash && (
            <button
              onClick={() => {
                setActiveTab("trash");
                fetchTrashedProjects();
              }}
              className={cn(
                "px-3.5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
                activeTab === "trash"
                  ? "bg-rose-500 text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <i className="fa-solid fa-trash-can text-xs text-rose-400" />
              <span>Trash (30d)</span>
              {trashedProjects.length > 0 && (
                <span className={cn("px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold", activeTab === "trash" ? "bg-white/25 text-white" : "bg-rose-500/15 text-rose-500")}>
                  {trashedProjects.length}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto shrink-0 px-1 pt-1 md:pt-0 border-t md:border-t-0 border-border/50">
          {can("createProjects") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProjectForm(true)}
              className="gap-1.5 sm:gap-2 font-semibold h-8 text-xs border-border/80 hover:bg-muted/60 hover:text-primary transition-colors cursor-pointer flex-1 sm:flex-initial"
            >
              <i className="fa-solid fa-folder-plus text-xs text-primary" />
              <span>New Project</span>
            </Button>
          )}
          <Button
            color="primary"
            size="sm"
            onClick={() => setShowTaskForm(true)}
            className="gap-1.5 sm:gap-2 font-semibold h-8 text-xs shadow-xs cursor-pointer flex-1 sm:flex-initial"
          >
            <i className="fa-solid fa-plus text-xs" />
            <span>Create Task</span>
          </Button>
        </div>
      </div>

      {/* Active Project HUD & Workspace Scope Bar */}
      {activeTab !== "trash" && activeTab !== "projects_grid" && activeTab !== "tasks" && (
        <Card className="p-3 sm:p-3.5 bg-card/70 dark:bg-card/40 backdrop-blur-md border border-border/70 rounded-2xl shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-3.5">
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1.5">
                <i className="fa-solid fa-sliders text-xs text-primary" /> Scope:
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedProjectId(val);
                  fetchTasks(val);
                }}
                className="h-9 pl-3 pr-7 text-xs bg-background border border-border/80 rounded-xl text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary flex-1 sm:w-64 cursor-pointer truncate shadow-2xs hover:border-primary/40 transition-colors"
              >
                <option value="all">⚡ All Projects (Combined Workspace)</option>
                {(boardFilter === "starred"
                  ? projects.filter((p) => starredProjectIds.includes(p._id))
                  : projects
                ).map((p) => {
                  const isStarred = starredProjectIds.includes(p._id);
                  return (
                    <option key={p._id} value={p._id}>
                      {isStarred ? "⭐" : "📁"} {p.name}
                    </option>
                  );
                })}
              </select>

              {/* Quick Star Toggle Button for selected project */}
              {selectedProjectId && selectedProjectId !== "all" && (
                <button
                  type="button"
                  onClick={(e) => toggleStarProject(selectedProjectId, e)}
                  className={cn(
                    "h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs shrink-0",
                    starredProjectIds.includes(selectedProjectId)
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-500 hover:bg-amber-500/25"
                      : "border-border hover:bg-muted text-muted-foreground hover:text-amber-500"
                  )}
                  title={starredProjectIds.includes(selectedProjectId) ? "Remove from Starred Boards" : "Add to Starred Boards"}
                >
                  <i className={cn("text-xs", starredProjectIds.includes(selectedProjectId) ? "fa-solid fa-star text-amber-500" : "fa-regular fa-star")} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-medium">
                <i className="fa-solid fa-folder-closed text-[11px]" />
                <span>Total:</span>
                <strong className="font-bold">{projects.length}</strong>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                <i className="fa-solid fa-circle-play text-[11px]" />
                <span>Active:</span>
                <strong className="font-bold">{projects.filter((p) => p.status === "In Progress" || p.status === "Planning" || !p.status).length}</strong>
              </div>

              {starredProjectIds.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-medium">
                  <i className="fa-solid fa-star text-[11px]" />
                  <span>Starred:</span>
                  <strong className="font-bold">{starredProjectIds.length}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs justify-end flex-wrap">
            {selectedProjectId && selectedProjectId !== "all" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEditProject}
                  className="gap-2 font-semibold text-xs h-8 border-primary/30 text-primary hover:bg-primary/10 rounded-xl"
                >
                  <i className="fa-solid fa-pen-to-square text-xs" /> Edit Details
                </Button>

                {canDeleteProject && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const p = projects.find((proj) => proj._id === selectedProjectId);
                      if (p) {
                        setProjectToDelete({ id: p._id, name: p.name });
                        setShowDeleteConfirm(true);
                      }
                    }}
                    className="gap-2 font-semibold text-xs h-8 border-rose-500/30 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer"
                    title="Move project to trash (preserved for 30 days)"
                  >
                    <i className="fa-solid fa-trash-can text-xs" /> Move to Trash
                  </Button>
                )}
              </>
            )}

            {/* Quick Switch to Modern Projects  */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("projects_grid")}
              className="gap-2 font-semibold text-xs h-8 border-primary/30 text-primary hover:bg-primary/10 rounded-xl cursor-pointer"
              title="Switch to Modern Projects  View"
            >
              <i className="fa-solid fa-table-cells-large text-xs" />
              <span>Projects </span>
            </Button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary border border-primary/25 font-bold text-xs shadow-2xs">
              <i className="fa-solid fa-list-check text-[11px]" />
              <span>Total Tasks:</span>
              <span className="font-mono">{tasks.length}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Modern Projects  (Default View) */}
      {activeTab === "projects_grid" && (
        <ProjectsGridModern
          projects={projects}
          tasks={tasks}
          teamMembers={teamMembers}
          loading={loading}
          onSelectProject={(pId) => {
            setSelectedProjectId(pId);
            fetchTasks(pId);
            setActiveTab("tasks");
          }}
          onOpenClassicKanban={(pId) => {
            if (pId) {
              setSelectedProjectId(pId);
              fetchTasks(pId);
            }
            setActiveTab("kanban");
          }}
          onOpenTasksView={(pId) => {
            if (pId) {
              setSelectedProjectId(pId);
              fetchTasks(pId);
            }
            setActiveTab("tasks");
          }}
          onOpenDriveView={(pId) => {
            if (pId) {
              setSelectedProjectId(pId);
            }
            setActiveTab("drive");
          }}
          onAddNewProject={() => setShowProjectForm(true)}
          onEditProject={handleOpenEditProject}
          onRequestDeleteProject={handleRequestDeleteProject}
          onRefresh={async () => {
            await fetchProjects();
            await fetchTasks(selectedProjectId || "all");
            showToast("Projects refreshed", "info");
          }}
          canDeleteProject={canDeleteProject}
        />
      )}

      {/* Modern Tasks List (DreamsTechnologies Style) */}
      {activeTab === "tasks" && (
        <TasksListModern
          tasks={tasks}
          projects={projects}
          teamMembers={teamMembers}
          selectedProjectId={selectedProjectId}
          onSelectProject={(pId) => {
            setSelectedProjectId(pId);
            fetchTasks(pId);
          }}
          onOpenClassicKanban={(pId) => {
            if (pId) {
              setSelectedProjectId(pId);
              fetchTasks(pId);
            }
            setActiveTab("kanban");
          }}
          onAddNewTask={() => setShowTaskForm(true)}
          onEditTask={(task) => {
            setSelectedTask(task);
          }}
          onDeleteTask={(taskId, taskTitle) => {
            setTaskToDelete({ id: taskId, title: taskTitle });
          }}
          onUpdateTaskStatus={handleUpdateTaskStatus}
          onSelectTaskPreview={(task) => setSelectedTask(task)}
          onRefresh={async () => {
            await fetchTasks(selectedProjectId || "all");
            showToast("Tasks refreshed", "info");
          }}
          loading={loading}
        />
      )}

      {/* Kanban Board View */}
      {activeTab === "kanban" && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Board Sidebar */}
          <div
            className={cn(
              "relative bg-card/70 dark:bg-card/40 backdrop-blur-md border border-border/70 shadow-xs rounded-2xl p-3.5 transition-all duration-300 shrink-0 w-full lg:w-auto overflow-visible",
              boardSidebarCollapsed ? "lg:w-16" : "lg:w-60"
            )}
          >
            {/* Collapse Toggle Button on vertical divider */}
            <button
              onClick={() => setBoardSidebarCollapsed(!boardSidebarCollapsed)}
              className="hidden lg:flex absolute -right-3 top-9 z-20 w-6 h-6 rounded-full bg-card border border-border/80 text-muted-foreground hover:text-foreground items-center justify-center shadow-xs cursor-pointer text-xs transition-colors"
              title={boardSidebarCollapsed ? "Expand Board Sidebar" : "Collapse Board Sidebar"}
            >
              <i className={cn("fa-solid text-[10px]", boardSidebarCollapsed ? "fa-chevron-right" : "fa-chevron-left")} />
            </button>

            {!boardSidebarCollapsed ? (
              <div className="space-y-3.5">
                {/* Add New Board Button */}
                <button
                  onClick={() => setShowProjectForm(true)}
                  className="w-full bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-semibold text-xs py-2.5 px-4 rounded-xl transition-all duration-200 shadow-sm shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-xs" />
                  <span>Add New Board</span>
                </button>

                {/* Sidebar Navigation Items */}
                <div className="space-y-1 pt-0.5">
                  {/* All Boards */}
                  <button
                    onClick={() => setBoardFilter("all")}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                      boardFilter === "all"
                        ? "bg-primary/10 text-primary border border-primary/25 shadow-2xs font-bold"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <i className="fa-solid fa-table-cells-large text-sm text-primary" />
                      <span>All Boards</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted/80 text-foreground font-mono font-semibold">
                      {projects.length}
                    </span>
                  </button>

                  {/* Starred Boards */}
                  <button
                    onClick={() => {
                      setBoardFilter("starred");
                      const firstStarred = projects.find((p) => starredProjectIds.includes(p._id));
                      if (firstStarred && selectedProjectId === "all") {
                        setSelectedProjectId(firstStarred._id);
                        fetchTasks(firstStarred._id);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                      boardFilter === "starred"
                        ? "bg-primary/10 text-primary border border-primary/25 shadow-2xs font-bold"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <i className={cn("text-sm", starredProjectIds.length > 0 ? "fa-solid fa-star text-amber-500" : "fa-regular fa-star text-muted-foreground")} />
                      <span>Starred Boards</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted/80 text-foreground font-mono font-semibold">
                      {starredProjectIds.length}
                    </span>
                  </button>

                  {/* Project Trash (30d Hold) */}
                  {canAccessTrash && (
                    <button
                      onClick={() => {
                        setActiveTab("trash");
                        fetchTrashedProjects();
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <div className="flex items-center gap-2.5">
                        <i className="fa-solid fa-trash-can text-sm text-rose-400" />
                        <span>Trash (30d)</span>
                      </div>
                      {trashedProjects.length > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-500 font-mono font-bold">
                          {trashedProjects.length}
                        </span>
                      )}
                    </button>
                  )}
                </div>

                {/* Sublist of Starred Projects */}
                {boardFilter === "starred" && (
                  <div className="pt-2 border-t border-border/70 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                      Starred Projects
                    </p>
                    {projects.filter((p) => starredProjectIds.includes(p._id)).length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/70">
                        <i className="fa-regular fa-star text-amber-500 mb-1.5 text-sm block" />
                        No starred boards yet. Click the star icon to pin boards here.
                      </div>
                    ) : (
                      projects
                        .filter((p) => starredProjectIds.includes(p._id))
                        .map((p) => {
                          const isSelected = selectedProjectId === p._id;
                          return (
                            <div
                              key={p._id}
                              onClick={() => {
                                setSelectedProjectId(p._id);
                                fetchTasks(p._id);
                              }}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all group",
                                isSelected
                                  ? "bg-primary/15 text-primary border border-primary/30 font-semibold"
                                  : "text-foreground hover:bg-muted/60"
                              )}
                            >
                              <span className="truncate flex items-center gap-2">
                                <i className="fa-solid fa-folder text-amber-500 text-[11px]" />
                                {p.name}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => toggleStarProject(p._id, e)}
                                className="opacity-60 group-hover:opacity-100 text-amber-500 hover:scale-110 transition-all p-1 cursor-pointer"
                                title="Unstar project"
                              >
                                <i className="fa-solid fa-star text-[11px]" />
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3 pt-1">
                <button
                  onClick={() => setShowProjectForm(true)}
                  className="w-9 h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                  title="Add New Board"
                >
                  <i className="fa-solid fa-plus text-xs" />
                </button>
                <button
                  onClick={() => setBoardFilter("all")}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors",
                    boardFilter === "all"
                      ? "bg-primary/10 text-primary border border-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title="All Boards"
                >
                  <i className="fa-solid fa-table-cells-large text-sm" />
                </button>
                <button
                  onClick={() => setBoardFilter("starred")}
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-colors",
                    boardFilter === "starred"
                      ? "bg-primary/10 text-primary border border-primary/25"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  title="Starred Boards"
                >
                  <i className={cn("text-sm", starredProjectIds.length > 0 ? "fa-solid fa-star text-amber-500" : "fa-regular fa-star text-muted-foreground")} />
                </button>
              </div>
            )}
          </div>

          {/* Kanban Multi-Filter Bar & Columns Container */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {/* Filter Toolbar */}
            <div className="bg-card/70 dark:bg-card/40 backdrop-blur-md border border-border/70 rounded-2xl p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap">
              {/* Search & Priority Selector */}
              <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
                <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                  <input
                    type="text"
                    value={taskSearchQuery}
                    onChange={(e) => setTaskSearchQuery(e.target.value)}
                    placeholder="Search tasks, descriptions, or assignees..."
                    className="w-full pl-8 pr-7 h-9 text-xs rounded-xl border border-border/80 bg-background/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                  {taskSearchQuery && (
                    <button
                      onClick={() => setTaskSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>

                {/* Priority Selector */}
                <select
                  value={taskPriorityFilter}
                  onChange={(e) => setTaskPriorityFilter(e.target.value as any)}
                  className="h-9 rounded-xl border border-border/80 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium cursor-pointer shadow-2xs"
                >
                  <option value="all">All Priorities</option>
                  <option value="High">🔴 High</option>
                  <option value="Medium">🟡 Medium</option>
                  <option value="Low">🔵 Low</option>
                </select>
              </div>

              {/* Filters & Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Assignee Filter */}
                <select
                  value={taskAssigneeFilter}
                  onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                  className="h-9 rounded-xl border border-border/80 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium max-w-[140px] cursor-pointer shadow-2xs"
                >
                  <option value="all">All Assignees</option>
                  {teamMembers.map((m) => (
                    <option key={m._id} value={m._id}>{m.name || m.email}</option>
                  ))}
                </select>

                {/* Sprint Cycle Filter */}
                <select
                  value={taskSprintFilter}
                  onChange={(e) => setTaskSprintFilter(e.target.value)}
                  className="h-9 rounded-xl border border-border/80 bg-background/80 px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium max-w-[140px] cursor-pointer shadow-2xs"
                >
                  <option value="all">All Sprints</option>
                  <option value="active">🏃 Active Sprint</option>
                  <option value="none">Backlog (No Sprint)</option>
                  {sprints.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>

                {/* Due Soon Toggle */}
                <button
                  type="button"
                  onClick={() => setTaskDueSoonOnly(!taskDueSoonOnly)}
                  className={cn(
                    "h-9 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs",
                    taskDueSoonOnly
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                      : "border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  title="Show tasks due in next 7 days or overdue"
                >
                  <i className="fa-solid fa-clock text-[11px]" />
                  <span>Due Soon</span>
                </button>

                {/* Clear Active Filters */}
                {(taskSearchQuery || taskPriorityFilter !== "all" || taskAssigneeFilter !== "all" || taskDueSoonOnly) && (
                  <button
                    onClick={() => {
                      setTaskSearchQuery("");
                      setTaskPriorityFilter("all");
                      setTaskAssigneeFilter("all");
                      setTaskDueSoonOnly(false);
                    }}
                    className="h-9 px-3 text-xs text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
                    title="Reset all filters"
                  >
                    <i className="fa-solid fa-filter-circle-xmark text-[11px]" />
                    <span>Clear</span>
                  </button>
                )}

                {/* Export CSV Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportTasksCSV}
                  className="h-9 gap-1.5 text-xs font-semibold border-border/80 hover:bg-muted/60 rounded-xl"
                  title="Export tasks to CSV"
                >
                  <i className="fa-solid fa-file-csv text-primary text-xs" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>

                {/* New Task Button */}
                <Button
                  color="primary"
                  size="sm"
                  onClick={() => setShowTaskForm(true)}
                  className="h-9 gap-1.5 text-xs font-semibold shadow-xs rounded-xl"
                >
                  <i className="fa-solid fa-plus text-[11px]" />
                  <span>New Task</span>
                </Button>
              </div>
            </div>

            {/* Kanban Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {columns.map((col) => {
                const filteredTasks = tasks.filter((t) => {
                  if ((t.status || "To Do") !== col) return false;
                  if (taskSearchQuery.trim()) {
                    const q = taskSearchQuery.toLowerCase().trim();
                    const matchTitle = t.title?.toLowerCase().includes(q);
                    const matchDesc = t.description?.toLowerCase().includes(q);
                    const matchAssignee = t.assignee?.name?.toLowerCase().includes(q);
                    if (!matchTitle && !matchDesc && !matchAssignee) return false;
                  }
                  if (taskPriorityFilter !== "all" && t.priority !== taskPriorityFilter) return false;
                  if (taskAssigneeFilter !== "all") {
                    const aId = t.assignee?._id || t.assignee;
                    if (aId !== taskAssigneeFilter) return false;
                  }
                  if (taskSprintFilter !== "all") {
                    const tSprintId = t.sprintId?._id || t.sprintId;
                    if (taskSprintFilter === "active") {
                      const activeSprintId = sprints.find((s) => s.status === "Active")?._id;
                      if (!activeSprintId || tSprintId !== activeSprintId) return false;
                    } else if (taskSprintFilter === "none") {
                      if (tSprintId) return false;
                    } else {
                      if (tSprintId !== taskSprintFilter) return false;
                    }
                  }
                  if (taskDueSoonOnly) {
                    if (!t.dueDate) return false;
                    const dueTime = new Date(t.dueDate).getTime();
                    const now = Date.now();
                    const sevenDays = 7 * 24 * 60 * 60 * 1000;
                    if (dueTime - now > sevenDays && t.status !== "Done") return false;
                  }
                  return true;
                });

                const colTasks = filteredTasks;
                const isOver = dragOverCol === col;

                const colAccentMap: Record<string, string> = {
                  "To Do": "border-t-2 border-t-sky-400",
                  "In Progress": "border-t-2 border-t-indigo-500",
                  "Review": "border-t-2 border-t-amber-400",
                  "Done": "border-t-2 border-t-emerald-400",
                };
                const colDotMap: Record<string, string> = {
                  "To Do": "bg-sky-400",
                  "In Progress": "bg-indigo-500",
                  "Review": "bg-amber-400",
                  "Done": "bg-emerald-400",
                };
                const colGlowMap: Record<string, string> = {
                  "To Do": "ring-sky-400/20",
                  "In Progress": "ring-indigo-500/20",
                  "Review": "ring-amber-400/20",
                  "Done": "ring-emerald-400/20",
                };

                return (
                  <div
                    key={col}
                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(col); }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverCol(null);
                      }
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setDragOverCol(null);
                      const id = e.dataTransfer.getData("nexace/task-id");
                      if (id && id !== col) {
                        setTasks((prev: any[]) =>
                          prev.map((t) => t._id === id ? { ...t, status: col } : t)
                        );
                        await handleMoveTaskStatus(id, col);
                      }
                    }}
                    className={cn(
                      "flex flex-col rounded-2xl bg-card/60 dark:bg-card/25 backdrop-blur-xs border border-border/70 p-3.5 space-y-3 transition-all duration-200 shadow-xs",
                      colAccentMap[col],
                      isOver && "bg-primary/10 border-primary scale-[1.01] shadow-md ring-2 ring-primary/20"
                    )}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full ring-4", colGlowMap[col], colDotMap[col])} />
                        <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
                          {col}
                        </h3>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted/80 text-foreground font-mono">
                          {colTasks.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTaskForm(true)}
                        className="w-6 h-6 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors text-xs cursor-pointer"
                        title={`Add Task to ${col}`}
                      >
                        <i className="fa-solid fa-plus text-[11px]" />
                      </button>
                    </div>

                    {/* Task Cards Container */}
                    <div className="space-y-2.5 min-h-[320px]">
                      {colTasks.length === 0 ? (
                        <div
                          className={cn(
                            "h-32 flex flex-col items-center justify-center gap-2 p-3 text-xs text-muted-foreground border-2 border-dashed rounded-xl transition-all",
                            isOver ? "border-primary text-foreground bg-primary/5" : "border-border/60 hover:border-border hover:bg-muted/10"
                          )}
                        >
                          <span>{isOver ? `Drop here → ${col}` : `No tasks in ${col}`}</span>
                          {col === "To Do" && (
                            <button
                              onClick={() => setShowTaskForm(true)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                              <i className="fa-solid fa-plus text-[10px]" /> Add Task
                            </button>
                          )}
                        </div>
                      ) : (
                        colTasks.map((t) => {
                          const isHigh = t.priority === "High";
                          const isMed = t.priority === "Medium";
                          const subtasksTotal = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
                          const subtasksDone = Array.isArray(t.subtasks) ? t.subtasks.filter((s: any) => s.completed).length : 0;
                          const subtaskPct = subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

                          const isDueSoon = t.dueDate && (() => {
                            const d = new Date(t.dueDate).getTime();
                            const now = Date.now();
                            return d - now <= 3 * 24 * 60 * 60 * 1000 && d - now >= 0;
                          })();
                          const isOverdue = t.dueDate && new Date(t.dueDate).getTime() < Date.now() && t.status !== "Done";

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
                                "cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200 p-3.5 space-y-2.5 bg-card dark:bg-slate-900/90 border border-border/80 hover:border-primary/50 rounded-xl shadow-xs group/card relative overflow-hidden",
                                isHigh ? "border-l-4 border-l-rose-500" : isMed ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-sky-500"
                              )}
                            >
                              {/* Top: Title & Priority */}
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-bold text-xs text-foreground leading-snug line-clamp-2 group-hover/card:text-primary transition-colors">
                                  {t.title}
                                </p>
                                <span
                                  className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 font-mono",
                                    isHigh
                                      ? "bg-rose-500/10 text-rose-500 border-rose-500/30"
                                      : isMed
                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                                      : "bg-sky-500/10 text-sky-500 border-sky-500/30"
                                  )}
                                >
                                  {t.priority || "Medium"}
                                </span>
                              </div>

                              {/* Project & Sprint Badges */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {selectedProjectId === "all" && t.projectId?.name && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                                    <i className="fa-solid fa-folder text-[9px]" /> {t.projectId.name}
                                  </span>
                                )}
                                {t.sprintId && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                                    <i className="fa-solid fa-person-running text-[9px]" /> {sprints.find(s => s._id === (t.sprintId?._id || t.sprintId))?.name || "Sprint Task"}
                                  </span>
                                )}
                              </div>

                              {/* Description preview */}
                              {t.description && (
                                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                  {t.description}
                                </p>
                              )}

                              {/* Subtasks Progress Bar */}
                              {subtasksTotal > 0 && (
                                <div className="space-y-1 pt-1">
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-1 font-medium">
                                      <i className="fa-solid fa-list-check text-[9px] text-primary" /> {subtasksDone}/{subtasksTotal} subtasks
                                    </span>
                                    <span className="font-mono font-semibold text-foreground">{subtaskPct}%</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full transition-all duration-300", subtaskPct === 100 ? "bg-emerald-500" : "bg-primary")}
                                      style={{ width: `${subtaskPct}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Footer: Assignee & Due Date */}
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/40">
                                <span className="flex items-center gap-1.5 font-medium text-foreground">
                                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                                    {(t.assignee?.name || "U")[0].toUpperCase()}
                                  </span>
                                  <span className="truncate max-w-[100px]">{t.assignee?.name || "Unassigned"}</span>
                                </span>

                                {t.dueDate && (
                                  <span
                                    className={cn(
                                      "flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded font-medium",
                                      isOverdue
                                        ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold"
                                        : isDueSoon
                                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold"
                                        : "text-muted-foreground"
                                    )}
                                    title={`Due Date: ${new Date(t.dueDate).toLocaleDateString()}`}
                                  >
                                    <i className={cn("text-[9px]", isOverdue ? "fa-solid fa-calendar-xmark text-rose-500" : isDueSoon ? "fa-solid fa-clock text-amber-500" : "fa-regular fa-calendar")} />
                                    <span>{new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
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
          {/* Storage & File Health Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-primary bg-card/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Storage Used</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{driveStats.totalFormatted}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Across {driveStats.totalCount} stored document{driveStats.totalCount === 1 ? "" : "s"}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <i className="fa-solid fa-hard-drive text-lg" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500 bg-card/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PDFs & Documents</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{driveStats.docCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Specifications, briefs & reports</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <i className="fa-solid fa-file-pdf text-lg" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 bg-card/60 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Images & Media</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{driveStats.imgCount}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Visuals, screenshots & assets</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <i className="fa-solid fa-images text-lg" />
                </div>
              </CardContent>
            </Card>

            <Card className={cn("border-l-4 bg-card/60 shadow-xs", isAdmin ? "border-l-indigo-500" : "border-l-teal-500")}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vault Privacy</p>
                  <div className="mt-1">
                    {isAdmin ? (
                      <Badge variant="soft" color="primary" className="text-[10px] font-bold">
                        <i className="fa-solid fa-shield-halved text-[9px] mr-1" /> Admin: All Data
                      </Badge>
                    ) : (
                      <Badge variant="soft" className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        <i className="fa-solid fa-user-lock text-[9px] mr-1" /> My Data Only
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isAdmin ? "Viewing workspace-wide files" : "Isolated private storage"}
                  </p>
                </div>
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isAdmin ? "bg-indigo-500/10 text-indigo-500" : "bg-teal-500/10 text-teal-500")}>
                  <i className={cn("fa-solid text-lg", isAdmin ? "fa-shield-halved" : "fa-lock")} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Drag & Drop Upload Zone */}
          <Card className="p-5 overflow-hidden">
            <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-cloud-arrow-up text-primary text-sm" /> Upload Document or Asset
                </CardTitle>
                <CardDescription className="font-normal text-xs">
                  Drop files to store securely in your workspace drive repository.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUploadPanel(!showUploadPanel)}
                className="h-8 gap-1.5 text-xs font-semibold"
              >
                <i className={cn("fa-solid text-xs", showUploadPanel ? "fa-chevron-up" : "fa-chevron-down")} />
                {showUploadPanel ? "Hide Upload" : "Add File"}
              </Button>
            </CardHeader>

            {showUploadPanel && (
              <CardContent className="px-0 pt-2 space-y-4">
                {/* Drag-and-Drop Target */}
                <div
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingFile(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const f = e.dataTransfer.files[0];
                      const ext = f.name.includes(".") ? f.name.split(".").pop()?.toLowerCase() || "" : "";
                      if (allowedExtensions.length > 0 && ext && !allowedExtensions.includes(ext)) {
                        showToast(`File type .${ext} is not allowed. Allowed: ${allowedExtensions.map((ex) => `.${ex}`).join(", ")}`, "error");
                        return;
                      }
                      setUploadFile(f);
                      if (!uploadName) setUploadName(f.name);
                    }
                  }}
                  onClick={() => driveFileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
                    isDraggingFile
                      ? "border-primary bg-primary/10 scale-[1.005]"
                      : uploadFile
                      ? "border-emerald-500/60 bg-emerald-500/5"
                      : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <input
                    ref={driveFileInputRef}
                    type="file"
                    className="hidden"
                    accept={allowedExtensions.length > 0 ? allowedExtensions.map((e) => `.${e}`).join(",") : undefined}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        const ext = f.name.includes(".") ? f.name.split(".").pop()?.toLowerCase() || "" : "";
                        if (allowedExtensions.length > 0 && ext && !allowedExtensions.includes(ext)) {
                          showToast(`File type .${ext} is not allowed. Allowed: ${allowedExtensions.map((ex) => `.${ex}`).join(", ")}`, "error");
                          e.target.value = "";
                          setUploadFile(null);
                          return;
                        }
                        setUploadFile(f);
                        if (!uploadName) setUploadName(f.name);
                      }
                    }}
                  />

                  {uploadFile ? (
                    <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl max-w-md w-full shadow-xs">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-file-circle-check text-lg" />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-xs font-bold text-foreground truncate">{uploadFile.name}</p>
                        <p className="text-[10px] text-muted-foreground">{Math.round(uploadFile.size / 1024)} KB · Ready to upload</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                          setUploadName("");
                          if (driveFileInputRef.current) driveFileInputRef.current.value = "";
                        }}
                      >
                        <i className="fa-solid fa-xmark text-xs" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <i className="fa-solid fa-cloud-arrow-up text-xl" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          Drag and drop your file here, or <span className="text-primary underline font-bold">browse from device</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Supports documents, spreadsheets, images, and archives up to 25 MB
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Upload Destination & Metadata Form */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Destination Folder</label>
                    <select
                      value={driveFolder}
                      onChange={(e) => setDriveFolder(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="/">Root Workspace (/)</option>
                      <option value="Projects">Projects</option>
                      <option value="Documents">Documents</option>
                      <option value="Contracts">Contracts</option>
                      <option value="Invoices">Invoices</option>
                      <option value="Designs">Designs</option>
                      <option value="Resumes">Resumes</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">Display Name (Optional)</label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        placeholder="e.g. Q3_Client_Brief_v2.pdf"
                        className="h-9 text-xs"
                      />
                      <Button
                        color="primary"
                        size="sm"
                        type="button"
                        disabled={!uploadFile || isUploadingFile}
                        onClick={() => handleFileUpload()}
                        className="gap-2 shrink-0 h-9 font-semibold"
                      >
                        {isUploadingFile ? (
                          <>
                            <i className="fa-solid fa-spinner fa-spin text-xs" /> Uploading...
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-arrow-up-from-bracket text-xs" /> Upload
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Allowed formats policy preview */}
                {allowedExtensions.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
                    <i className="fa-solid fa-shield-halved text-primary text-xs shrink-0" />
                    <span>Allowed File Extensions:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {allowedExtensions.map((ext) => (
                        <span key={ext} className="px-1.5 py-0.2 rounded bg-primary/10 text-primary font-mono text-[9px] uppercase font-bold border border-primary/20">
                          .{ext}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Drive Files & Assets Main Section */}
          <Card className="p-5">
            <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 flex-wrap">
                  <i className="fa-solid fa-hard-drive text-primary text-sm" /> Drive Files & Assets ({driveFiles.length})
                  {isAdmin ? (
                    <Badge variant="soft" color="primary" className="text-[10px] font-semibold">
                      <i className="fa-solid fa-shield-halved text-[9px] mr-1" /> Admin: All Files
                    </Badge>
                  ) : (
                    <Badge variant="soft" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                      <i className="fa-solid fa-user-lock text-[9px] mr-1" /> My Files Only
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {isAdmin
                    ? "Full workspace file repository (All user documents & uploads visible to Admin)"
                    : "Your personal workspace drive storage (Showing only your uploaded documents)"}
                </CardDescription>
              </div>

              {driveFiles.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllDriveFiles}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <i className={cn("fa-solid text-xs", selectedDriveFileIds.length === filteredDriveFiles.length && filteredDriveFiles.length > 0 ? "fa-square-check text-primary" : "fa-square")} />
                    {selectedDriveFileIds.length === filteredDriveFiles.length && filteredDriveFiles.length > 0 ? "Deselect All" : "Select All"}
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
                        <i className="fa-solid fa-download text-xs" /> Download ({selectedDriveFileIds.length})
                      </Button>

                      <Button
                        variant="soft"
                        color="destructive"
                        size="sm"
                        onClick={() => setShowBatchDeleteModal(true)}
                        className="h-8 gap-1.5 text-xs font-semibold"
                        title="Delete selected files"
                      >
                        <i className="fa-solid fa-trash-can text-xs" /> Delete ({selectedDriveFileIds.length})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardHeader>

            {/* Quick Folder Filter Chips */}
            {driveFolders.length > 1 && (
              <div className="pt-2 pb-3 border-b border-border/60 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
                <span className="text-[11px] font-bold text-muted-foreground mr-1 shrink-0">
                  <i className="fa-solid fa-folder mr-1 text-xs" /> Folders:
                </span>
                {driveFolders.map((folder) => {
                  const count = folder === "All" ? driveFiles.length : driveFiles.filter((f) => (f.folder || "/") === folder).length;
                  const isActive = driveFolderFilter === folder;
                  return (
                    <button
                      key={folder}
                      onClick={() => { setDriveFolderFilter(folder); setDrivePage(1); }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <i className={cn("fa-solid text-[10px]", folder === "All" ? "fa-folder-tree" : "fa-folder")} />
                      <span>{folder === "All" ? "All Folders" : folder === "/" ? "Root (/)" : folder}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-mono", isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Filter Toolbar for Drive Files */}
            {driveFiles.length > 0 && (
              <div className="py-3 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
                  {/* Search bar */}
                  <div className="relative flex-1 md:w-56">
                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search files or uploaders…"
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      className="pl-8 h-8 text-xs w-full bg-background"
                    />
                    {driveSearch && (
                      <button
                        onClick={() => setDriveSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </div>

                  {/* File Type Filter */}
                  <select
                    value={driveTypeFilter}
                    onChange={(e) => setDriveTypeFilter(e.target.value)}
                    className="h-8 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    title="Filter by file type"
                  >
                    <option value="All">All Types</option>
                    <option value="Resumes">Employee Resumes</option>
                    <option value="Images">Images (PNG, JPG, WEBP, SVG)</option>
                    <option value="PDFs">PDF Documents</option>
                    <option value="Documents">Word / Text Docs</option>
                    <option value="Spreadsheets">Spreadsheets (XLSX, CSV)</option>
                    <option value="Archives">Archives (ZIP, RAR)</option>
                    <option value="Other">Other Formats</option>
                  </select>

                  {/* Uploader Filter */}
                  {driveUploaders.length > 2 && (
                    <select
                      value={driveUploaderFilter}
                      onChange={(e) => setDriveUploaderFilter(e.target.value)}
                      className="h-8 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      title="Filter by uploader"
                    >
                      {driveUploaders.map((u) => (
                        <option key={u} value={u}>
                          {u === "All" ? "All Uploaders" : `By ${u}`}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Sort Filter */}
                  <select
                    value={driveSortBy}
                    onChange={(e) => setDriveSortBy(e.target.value)}
                    className="h-8 px-2.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    title="Sort files"
                  >
                    <option value="newest">Newest Uploads</option>
                    <option value="oldest">Oldest Uploads</option>
                    <option value="name-asc">Name (A → Z)</option>
                    <option value="name-desc">Name (Z → A)</option>
                    <option value="size-desc">Size (Largest)</option>
                    <option value="size-asc">Size (Smallest)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
                  {/* View Mode Toggle */}
                  <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
                    <button
                      type="button"
                      onClick={() => handleToggleDriveView("grid")}
                      className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer",
                        driveViewMode === "grid"
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Grid View"
                    >
                      <i className="fa-solid fa-border-all text-xs" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleDriveView("list")}
                      className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer",
                        driveViewMode === "list"
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Table / List View"
                    >
                      <i className="fa-solid fa-list-ul text-xs" />
                    </button>
                  </div>

                  {/* Rows per page selector */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>Show:</span>
                    <select
                      value={drivePerPage}
                      onChange={(e) => {
                        setDrivePerPage(Number(e.target.value));
                        setDrivePage(1);
                      }}
                      disabled={driveShowAll}
                      className="h-8 px-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
                      title="Files per page"
                    >
                      <option value={6}>6</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                    </select>
                  </div>

                  {/* Toggle Show All */}
                  <Button
                    variant={driveShowAll ? "soft" : "outline"}
                    color={driveShowAll ? "primary" : "default"}
                    size="sm"
                    onClick={() => {
                      setDriveShowAll(!driveShowAll);
                      setDrivePage(1);
                    }}
                    className="h-8 text-xs gap-1.5 font-semibold"
                    title={driveShowAll ? "Switch to Paginated View" : "Show all files without pagination"}
                  >
                    <i className={cn("fa-solid text-[10px]", driveShowAll ? "fa-list" : "fa-expand")} />
                    {driveShowAll ? "Paginated" : "All"}
                  </Button>

                  {(driveSearch || driveTypeFilter !== "All" || driveUploaderFilter !== "All" || driveFolderFilter !== "All" || driveSortBy !== "newest") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDriveSearch("");
                        setDriveTypeFilter("All");
                        setDriveUploaderFilter("All");
                        setDriveFolderFilter("All");
                        setDriveSortBy("newest");
                        setDrivePage(1);
                      }}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                    >
                      <i className="fa-solid fa-arrow-rotate-left text-[10px]" /> Reset
                    </Button>
                  )}
                </div>
              </div>
            )}

            <CardContent className="px-0 pt-4 space-y-4">
              {(() => {
                const totalDriveItems = filteredDriveFiles.length;
                const effectiveDrivePerPage = driveShowAll ? (totalDriveItems || 1) : drivePerPage;
                const totalDrivePages = Math.ceil(totalDriveItems / effectiveDrivePerPage) || 1;
                const driveStartIndex = (drivePage - 1) * effectiveDrivePerPage;
                const paginatedDriveFiles = filteredDriveFiles.slice(driveStartIndex, driveStartIndex + effectiveDrivePerPage);

                if (driveFiles.length === 0) {
                  return (
                    <div className="py-12 text-center text-muted-foreground text-sm space-y-1">
                      <i className="fa-solid fa-folder-open text-3xl opacity-50 text-primary mb-2 block" />
                      <p className="font-medium">No files stored in your Drive Space yet.</p>
                      <p className="text-xs">Use the upload box above to add your first file to Drive Space.</p>
                    </div>
                  );
                }

                if (filteredDriveFiles.length === 0) {
                  return (
                    <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
                      <i className="fa-solid fa-filter-circle-xmark text-3xl opacity-50 text-muted-foreground mb-2 block" />
                      <p className="font-medium text-foreground">No files match your filters</p>
                      <p className="text-xs">Try searching with a different keyword or resetting your filter selections.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDriveSearch("");
                          setDriveTypeFilter("All");
                          setDriveUploaderFilter("All");
                          setDriveFolderFilter("All");
                          setDriveSortBy("newest");
                          setDrivePage(1);
                        }}
                        className="h-8 text-xs gap-1.5 mt-2"
                      >
                        <i className="fa-solid fa-arrow-rotate-left text-[10px]" /> Clear All Filters
                      </Button>
                    </div>
                  );
                }

                return (
                  <>
                    {/* View Mode: List / Table View */}
                    {driveViewMode === "list" ? (
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase">
                            <tr>
                              <th className="p-3 w-8">
                                <button
                                  type="button"
                                  onClick={handleSelectAllDriveFiles}
                                  className="text-muted-foreground hover:text-primary cursor-pointer"
                                >
                                  <i className={cn("fa-lg", selectedDriveFileIds.length === filteredDriveFiles.length && filteredDriveFiles.length > 0 ? "fa-solid fa-square-check text-primary" : "fa-regular fa-square")} />
                                </button>
                              </th>
                              <th className="p-3">File Name</th>
                              <th className="p-3">Folder</th>
                              <th className="p-3">Size</th>
                              <th className="p-3">Uploaded</th>
                              <th className="p-3">Uploader</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/60">
                            {paginatedDriveFiles.map((file) => {
                              const isSelected = selectedDriveFileIds.includes(file._id);
                              const isImg = (file.mimeType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
                              const fileDownloadUrl = `/api/drive/download?fileId=${file._id}&download=true`;

                              return (
                                <tr key={file._id} className={cn("hover:bg-muted/30 transition-colors", isSelected && "bg-primary/5")}>
                                  <td className="p-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleSelectDriveFile(file._id)}
                                      className="text-muted-foreground hover:text-primary cursor-pointer"
                                    >
                                      <i className={cn("fa-lg", isSelected ? "fa-solid fa-square-check text-primary" : "fa-regular fa-square")} />
                                    </button>
                                  </td>
                                  <td className="p-3 font-semibold text-foreground">
                                    <div className="flex items-center gap-2.5 min-w-[200px]">
                                      <div
                                        onClick={() => setPreviewFile(file)}
                                        className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 cursor-pointer hover:bg-primary/20 transition-colors"
                                      >
                                        <i className={cn("fa-solid text-sm", isImg ? "fa-image" : file.name.endsWith(".pdf") ? "fa-file-pdf text-rose-500" : "fa-file-lines")} />
                                      </div>
                                      <span
                                        onClick={() => setPreviewFile(file)}
                                        className="truncate hover:text-primary cursor-pointer max-w-xs"
                                        title={file.name}
                                      >
                                        {file.name}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-muted-foreground">
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                      {file.folder || "/"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-muted-foreground font-mono">
                                    {Math.round((file.size || 0) / 1024)} KB
                                  </td>
                                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                                    {new Date(file.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="p-3 text-foreground whitespace-nowrap">
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                                        {(file.uploadedBy?.name || "U")[0].toUpperCase()}
                                      </span>
                                      <span>{file.uploadedBy?.name || "Member"}</span>
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleCopyFileLink(file)}
                                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        title={copiedFileId === file._id ? "Copied Link!" : "Copy Shareable Link"}
                                      >
                                        <i className={cn("fa-solid text-xs", copiedFileId === file._id ? "fa-check text-emerald-500" : "fa-link")} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setPreviewFile(file)}
                                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        title="Preview File"
                                      >
                                        <i className="fa-solid fa-eye text-xs" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingFile({ _id: file._id, name: file.name, folder: file.folder || "/" })}
                                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                        title="Rename or Move Folder"
                                      >
                                        <i className="fa-solid fa-pen-to-square text-xs" />
                                      </Button>
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
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* View Mode: Grid Cards View */
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedDriveFiles.map((file) => {
                          const isSelected = selectedDriveFileIds.includes(file._id);
                          const isImg = (file.mimeType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
                          const fileDownloadUrl = `/api/drive/download?fileId=${file._id}&download=true`;

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
                                        src={`/api/drive/download?fileId=${file._id}`}
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
                                  {/* Copy Link button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCopyFileLink(file)}
                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    title={copiedFileId === file._id ? "Copied Link!" : "Copy Shareable Link"}
                                  >
                                    <i className={cn("fa-solid text-xs", copiedFileId === file._id ? "fa-check text-emerald-500" : "fa-link")} />
                                  </Button>

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

                                  {/* Rename/Move button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingFile({ _id: file._id, name: file.name, folder: file.folder || "/" })}
                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                    title="Rename or Move Folder"
                                  >
                                    <i className="fa-solid fa-pen-to-square text-xs" />
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
                                <span className="truncate max-w-[140px]">By {file.uploadedBy?.name || "Member"}</span>
                                <div className="flex items-center gap-1.5">
                                  {file.folder && file.folder !== "/" && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                                      <i className="fa-solid fa-folder text-[8px] mr-1 opacity-70" />
                                      {file.folder}
                                    </Badge>
                                  )}
                                  {(file.folder === "Resumes" || file.name.toLowerCase().includes("resume")) && (
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-semibold">
                                      <i className="fa-solid fa-file-lines mr-1 text-[8px]" /> Resume
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                    {file.mimeType?.split("/")[1] || "file"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Pagination Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                      <div>
                        Showing <strong className="text-foreground">{totalDriveItems === 0 ? 0 : driveStartIndex + 1}</strong> to <strong className="text-foreground">{Math.min(driveStartIndex + effectiveDrivePerPage, totalDriveItems)}</strong> of <strong className="text-foreground">{totalDriveItems}</strong> files
                      </div>

                      {!driveShowAll && totalDrivePages > 1 && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={drivePage <= 1}
                            onClick={() => setDrivePage((prev) => Math.max(1, prev - 1))}
                            className="h-8 gap-1 text-xs"
                          >
                            <i className="fa-solid fa-chevron-left text-[10px]" /> Prev
                          </Button>

                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalDrivePages }, (_, i) => i + 1).map((pageNum) => (
                              <button
                                key={pageNum}
                                onClick={() => setDrivePage(pageNum)}
                                className={cn(
                                  "h-8 min-w-[32px] px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer",
                                  drivePage === pageNum
                                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                    : "border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {pageNum}
                              </button>
                            ))}
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={drivePage >= totalDrivePages}
                            onClick={() => setDrivePage((prev) => Math.min(totalDrivePages, prev + 1))}
                            className="h-8 gap-1 text-xs"
                          >
                            Next <i className="fa-solid fa-chevron-right text-[10px]" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportHistoryCSV}
                className="gap-2 font-semibold text-xs h-8 border-border hover:bg-muted/60"
                title="Download history audit trail in CSV format"
              >
                <i className="fa-solid fa-file-csv text-primary text-xs" />
                <span>Export History CSV</span>
              </Button>

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
                        {paginatedLogs.map((log) => {
                          const getActionStyle = (action: string) => {
                            switch (action) {
                              case "Project Starred":
                                return {
                                  dot: "bg-amber-500/20 border-amber-500",
                                  badge: "bg-amber-500/10 text-amber-500 border-amber-500/30",
                                  icon: "fa-solid fa-star text-amber-500",
                                };
                              case "Project Unstarred":
                                return {
                                  dot: "bg-slate-500/20 border-slate-500",
                                  badge: "bg-muted text-muted-foreground border-border",
                                  icon: "fa-regular fa-star text-muted-foreground",
                                };
                              case "Project Created":
                                return {
                                  dot: "bg-emerald-500/20 border-emerald-500",
                                  badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                                  icon: "fa-solid fa-folder-plus text-emerald-500",
                                };
                              case "Project Edited":
                                return {
                                  dot: "bg-sky-500/20 border-sky-500",
                                  badge: "bg-sky-500/10 text-sky-500 border-sky-500/30",
                                  icon: "fa-solid fa-pen-to-square text-sky-500",
                                };
                              case "PROJECT_STATUS_CHANGED":
                                return {
                                  dot: "bg-indigo-500/20 border-indigo-500",
                                  badge: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
                                  icon: "fa-solid fa-arrows-rotate text-indigo-500",
                                };
                              case "Task Created":
                                return {
                                  dot: "bg-teal-500/20 border-teal-500",
                                  badge: "bg-teal-500/10 text-teal-500 border-teal-500/30",
                                  icon: "fa-solid fa-square-plus text-teal-500",
                                };
                              case "Task Status Moved":
                                return {
                                  dot: "bg-cyan-500/20 border-cyan-500",
                                  badge: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
                                  icon: "fa-solid fa-arrow-right-arrow-left text-cyan-500",
                                };
                              default:
                                return {
                                  dot: "bg-primary/20 border-primary",
                                  badge: "bg-primary/10 text-primary border-primary/30",
                                  icon: "fa-solid fa-clock-rotate-left text-primary",
                                };
                            }
                          };

                          const style = getActionStyle(log.action);

                          return (
                            <div key={log._id} className="relative flex items-start gap-4 pl-8 group">
                              <div className={cn("absolute left-1.5 top-2.5 w-4 h-4 rounded-full border-2 group-hover:scale-110 transition-transform", style.dot)} />
                              <div className="p-3.5 rounded-lg border border-border bg-card hover:bg-accent/20 transition-colors shadow-xs flex-1 space-y-1.5">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={cn("gap-1 text-[11px] font-semibold py-0.5 px-2", style.badge)}>
                                      <i className={cn(style.icon, "text-[10px]")} />
                                      {log.action}
                                    </Badge>
                                    <span className="font-bold text-xs text-foreground">
                                      {log.targetName}
                                    </span>
                                  </div>
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
                                {log.details && <p className="text-xs text-muted-foreground">{log.details}</p>}
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 pt-0.5 border-t border-border/40">
                                  <i className="fa-solid fa-user-circle text-primary text-xs" />
                                  <span>By <strong className="text-foreground">{log.userName}</strong> ({log.userRole || "Member"})</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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

      {/* Project Trash & 30-Day Recovery Center Tab View */}
      {activeTab === "trash" && canAccessTrash && (
        <Card className="p-5 space-y-5">
          <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-500">
                <i className="fa-solid fa-trash-can text-rose-500 text-sm" /> Project Trash &amp; Recovery Center
              </CardTitle>
              <CardDescription>
                Safely manage soft-deleted projects. Projects and their tasks are preserved for 30 days before permanent removal.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTrashedProjects}
                disabled={loadingTrash}
                className="gap-2 font-semibold text-xs h-8 border-border hover:bg-muted/60 cursor-pointer"
              >
                <i className={cn("fa-solid text-xs", loadingTrash ? "fa-spinner fa-spin" : "fa-arrows-rotate")} />
                Refresh
              </Button>
            </div>
          </CardHeader>

          {/* 30-Day Safe Hold Policy Banner */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 text-foreground space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-500">
              <i className="fa-solid fa-shield-halved text-sm text-amber-500" />
              <span>30-Day Recovery Safe Hold Active</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When administrators delete a project, it is protected from immediate destruction. All associated sprint tasks, descriptions, and file references remain completely intact in this safe hold bin for <strong>30 days</strong>. You or any authorized user can restore the project at any time with a single click. After 30 days, expired projects are permanently pruned.
            </p>
          </div>

          <CardContent className="px-0 pb-0">
            {loadingTrash ? (
              <div className="py-16 text-center text-muted-foreground text-sm space-y-2">
                <i className="fa-solid fa-spinner fa-spin text-3xl text-primary block mb-2" />
                <p>Loading trashed projects...</p>
              </div>
            ) : trashedProjects.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm space-y-3 rounded-2xl border border-dashed border-border/70 bg-muted/10">
                <div className="w-14 h-14 rounded-full bg-muted/40 mx-auto flex items-center justify-center text-muted-foreground/40 text-2xl">
                  <i className="fa-solid fa-recycle" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">No Projects in Trash</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    There are currently no soft-deleted projects in the 30-day retention window.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trashedProjects.map((p) => {
                  const daysRemaining = p.daysRemaining !== undefined ? p.daysRemaining : 30;
                  const isExpiringSoon = daysRemaining <= 7;
                  return (
                    <div
                      key={p._id}
                      className="p-4 rounded-xl border border-border bg-card shadow-xs hover:border-border/80 transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                              <i className="fa-solid fa-folder text-amber-500 text-xs" />
                              {p.name}
                            </h4>
                            {p.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {p.description}
                              </p>
                            )}
                          </div>

                          {/* Days remaining badge */}
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 gap-1.5 font-mono text-[11px] font-semibold py-1 px-2.5",
                              isExpiringSoon
                                ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                                : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                            )}
                          >
                            <i className={cn("fa-solid text-[10px]", isExpiringSoon ? "fa-triangle-exclamation" : "fa-clock")} />
                            {daysRemaining} {daysRemaining === 1 ? "day" : "days"} left
                          </Badge>
                        </div>

                        {/* Metadata pills */}
                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-calendar-xmark text-rose-400 text-xs" />
                            Deleted: <strong className="text-foreground font-medium">{formatDateTime(p.deletedAt)}</strong>
                          </span>

                          <span className="flex items-center gap-1.5">
                            <i className="fa-solid fa-user-circle text-primary text-xs" />
                            By: <strong className="text-foreground font-medium">{p.deletedByName || p.deletedBy?.name || "Admin"}</strong>
                          </span>

                          {p.status && (
                            <span className="flex items-center gap-1.5">
                              <i className="fa-solid fa-info-circle text-muted-foreground text-xs" />
                              Original Status: <strong className="text-foreground font-medium">{p.status}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                        <Button
                          size="sm"
                          onClick={() => handleRestoreProject(p._id, p.name)}
                          disabled={isRestoringProject === p._id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold text-xs h-8 cursor-pointer shadow-xs"
                        >
                          <i className={cn("fa-solid text-xs", isRestoringProject === p._id ? "fa-spinner fa-spin" : "fa-rotate-left")} />
                          {isRestoringProject === p._id ? "Restoring..." : "Restore Project"}
                        </Button>

                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPurgeConfirmProject({ id: p._id, name: p.name })}
                            disabled={isPurgingProject === p._id}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 text-xs h-8 cursor-pointer"
                            title="Bypass 30-day hold and permanently purge this project"
                          >
                            <i className="fa-solid fa-ban text-xs" />
                            Purge Permanently
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                    value={newProjStartDate}
                    onChange={(e) => setNewProjStartDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    onFocus={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    className="cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">End Date</label>
                  <Input
                    type="date"
                    min={newProjStartDate || undefined}
                    value={newProjDueDate}
                    onChange={(e) => setNewProjDueDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    onFocus={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    className="cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Budget / Cost (₹)</label>
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

      {/* Edit Project Modal */}
      {showEditProjectForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowEditProjectForm(false)}>
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-pen-to-square text-primary" /> Edit Project Details
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowEditProjectForm(false)}>
                <i className="fa-solid fa-xmark text-sm" />
              </Button>
            </div>

            <form onSubmit={handleEditProject} className="space-y-4 text-xs">
              {/* Project Name & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="font-semibold text-foreground flex items-center gap-1">
                    Project Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    value={editProjName}
                    onChange={(e) => setEditProjName(e.target.value)}
                    placeholder="e.g. Q3 Enterprise CRM Redesign"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Project Status</label>
                  <select
                    value={editProjStatus}
                    onChange={(e) => setEditProjStatus(e.target.value)}
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
                <label className="font-semibold text-foreground">Description &amp; Scope</label>
                <textarea
                  value={editProjDesc}
                  onChange={(e) => setEditProjDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Describe key deliverables, scope, and objectives..."
                />
              </div>

              {/* Assign Project */}
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-users-gear text-primary" /> Assign Project
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground">
                      <input
                        type="radio"
                        name="editAssignType"
                        checked={editProjAssignType === "Member"}
                        onChange={() => setEditProjAssignType("Member")}
                        className="text-primary focus:ring-primary"
                      />
                      Team Members
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer font-medium text-foreground">
                      <input
                        type="radio"
                        name="editAssignType"
                        checked={editProjAssignType === "Department"}
                        onChange={() => setEditProjAssignType("Department")}
                        className="text-primary focus:ring-primary"
                      />
                      Department
                    </label>
                  </div>
                </div>

                {editProjAssignType === "Member" ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-muted-foreground">Select Team Members</label>
                    <div className="max-h-28 overflow-y-auto p-2 rounded-md border border-input bg-background space-y-1">
                      {teamMembers.map((m) => (
                        <label key={m._id} className="flex items-center gap-2 p-1 hover:bg-accent/40 rounded cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={editProjMembers.includes(m._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditProjMembers([...editProjMembers, m._id]);
                              } else {
                                setEditProjMembers(editProjMembers.filter((id) => id !== m._id));
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
                      value={editProjAssignDept}
                      onChange={(e) => setEditProjAssignDept(e.target.value)}
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
                    value={editProjStartDate}
                    onChange={(e) => setEditProjStartDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    onFocus={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    className="cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">End Date</label>
                  <Input
                    type="date"
                    min={editProjStartDate || undefined}
                    value={editProjDueDate}
                    onChange={(e) => setEditProjDueDate(e.target.value)}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    onFocus={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch {}
                    }}
                    className="cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Budget / Cost (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 15000"
                    value={editProjCost}
                    onChange={(e) => setEditProjCost(e.target.value)}
                  />
                </div>
              </div>

              {/* Internal Tag */}
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border/60 bg-muted/10">
                <input
                  type="checkbox"
                  id="editInternalTag"
                  checked={editProjIsInternal}
                  onChange={(e) => setEditProjIsInternal(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="editInternalTag" className="font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                  <i className="fa-solid fa-tag text-indigo-500 text-xs" /> Tag as Internal Project
                </label>
                <span className="text-[11px] text-muted-foreground ml-auto">(Non-billable / Internal tool)</span>
              </div>

              {/* Requirements */}
              <div className="space-y-2 p-3.5 rounded-lg border border-border/80 bg-muted/20">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-paperclip text-primary" /> Project Requirements &amp; Notes
                </label>
                <textarea
                  value={editProjRequirements}
                  onChange={(e) => setEditProjRequirements(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Key functional requirements, specs, or guidelines..."
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                {canDeleteProject && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setShowEditProjectForm(false);
                      setProjectToDelete({ id: selectedProjectId, name: editProjName });
                      setShowDeleteConfirm(true);
                    }}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5 cursor-pointer text-xs"
                  >
                    <i className="fa-solid fa-trash-can text-xs" />
                    Move to Trash
                  </Button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowEditProjectForm(false)} disabled={isSavingEdit}>
                    Cancel
                  </Button>
                  <Button color="primary" size="sm" type="submit" className="font-semibold gap-1.5" disabled={isSavingEdit}>
                    <i className="fa-solid fa-floppy-disk text-xs" />
                    {isSavingEdit ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
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
                <label className="font-semibold text-foreground">Task Title <span className="text-rose-500">*</span></label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement OAuth Authentication API"
                  required
                />
              </div>

              {/* Project Selection */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Target Project <span className="text-rose-500">*</span></label>
                <select
                  value={newTaskProject || (selectedProjectId !== "all" ? selectedProjectId : (projects[0]?._id || ""))}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                  required
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="" disabled>Select a Project</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
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
                  <label className="font-semibold text-foreground">Sprint Cycle</label>
                  <select
                    value={newTaskSprint}
                    onChange={(e) => setNewTaskSprint(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">No Sprint (Backlog)</option>
                    {sprints.map((s) => (
                      <option key={s._id} value={s._id}>{s.name} ({s.status})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Due Date</label>
                  <Input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                  />
                </div>
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
                <Button variant="outline" size="sm" type="button" onClick={() => setShowTaskForm(false)} disabled={isCreatingTask}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold" disabled={isCreatingTask}>
                  {isCreatingTask ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-1.5" /> Adding...
                    </>
                  ) : (
                    "Add Task to Sprint"
                  )}
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

      {/* Task Quick Preview & Status Switcher Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={handleCloseTaskModal}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-border/60 pb-3 gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    color={selectedTask.priority === "High" ? "destructive" : selectedTask.priority === "Medium" ? "warning" : "info"}
                    className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider"
                  >
                    {selectedTask.priority} Priority
                  </Badge>
                  {selectedTask.projectId?.name && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/30 font-semibold">
                      <i className="fa-solid fa-folder text-[9px] mr-1" />
                      {selectedTask.projectId.name}
                    </Badge>
                  )}
                  {selectedTask.sprintId && (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold">
                      <i className="fa-solid fa-person-running text-[9px] mr-1" />
                      {sprints.find(s => s._id === (selectedTask.sprintId?._id || selectedTask.sprintId))?.name || "Sprint Task"}
                    </Badge>
                  )}
                </div>
                <h3 className="text-base font-bold text-foreground leading-snug pt-1">{selectedTask.title}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" onClick={handleCloseTaskModal}>
                <i className="fa-solid fa-xmark text-base" />
              </Button>
            </div>

            {/* Status Switcher Toolbar */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Workflow Stage</label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-muted/60 rounded-xl border border-border">
                {columns.map((col) => {
                  const isActive = (selectedTask.status || "To Do") === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handleQuickStatusChange(selectedTask._id, col)}
                      className={cn(
                        "py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center truncate",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs font-bold"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                      )}
                    >
                      {col}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task Info Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-muted/30 rounded-xl border border-border/80 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Assigned Member</span>
                <p className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                  <i className="fa-solid fa-user text-primary text-xs" />
                  {selectedTask.assignee?.name || "Unassigned"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Deadline / Due Date</span>
                <p className="font-semibold text-foreground flex items-center gap-1.5 font-mono">
                  <i className="fa-solid fa-calendar-day text-amber-500 text-xs" />
                  {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "No deadline"}
                </p>
              </div>
            </div>

            {/* Task Description */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description & Acceptance Criteria</label>
              <div className="p-3 bg-muted/20 rounded-xl border border-border/60 text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {selectedTask.description || "No additional notes or description provided for this sprint task."}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeletingTask}
                onClick={() => setTaskToDelete({ id: selectedTask._id, title: selectedTask.title })}
                className="gap-1.5 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
              >
                <i className="fa-solid fa-trash-can text-xs" />
                Delete Task
              </Button>

              <Button color="primary" size="sm" onClick={handleCloseTaskModal} className="font-semibold text-xs px-4">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek In-App Delete Task Confirmation Modal */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete Task</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-foreground">{taskToDelete.title}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskToDelete(null)}
                disabled={isDeletingTask}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={() => handleDeleteTask(taskToDelete.id)}
                disabled={isDeletingTask}
                className="gap-2 font-semibold cursor-pointer"
              >
                {isDeletingTask ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" /> Delete Task
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Soft Delete Project Confirmation Modal */}
      {showDeleteConfirm && projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-trash-can" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Move Project to Trash?</h3>
                <p className="text-xs text-muted-foreground">30-day recovery retention policy</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-foreground/90">
              <p>
                Are you sure you want to delete <strong className="text-foreground">"{projectToDelete.name}"</strong>?
              </p>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <i className="fa-solid fa-shield-halved text-xs" />
                  <span>Safe Hold: Retained for 30 Days</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  The project and its sprint tasks will be removed from the active workspace and kept in the <strong>Trash</strong> bin for 30 days. You or any authorized team member can restore it at any time with full data integrity.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setProjectToDelete(null);
                }}
                disabled={isDeletingProject}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={handleSoftDeleteProject}
                disabled={isDeletingProject}
                className="gap-2 font-semibold cursor-pointer"
              >
                {isDeletingProject ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Moving to Trash...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" /> Move to Trash (30d Hold)
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Purge Confirmation Modal */}
      {purgeConfirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setPurgeConfirmProject(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-full bg-rose-500/15 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Permanently Delete Project?</h3>
                <p className="text-xs text-rose-500 font-medium">Bypasses 30-day retention • Cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              This will immediately and permanently delete <strong className="text-foreground">"{purgeConfirmProject.name}"</strong> and all of its associated tasks from the database. This action is <strong>irreversible</strong>.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPurgeConfirmProject(null)}
                disabled={isPurgingProject === purgeConfirmProject.id}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={() => handlePermanentPurgeProject(purgeConfirmProject.id, purgeConfirmProject.name)}
                disabled={isPurgingProject === purgeConfirmProject.id}
                className="gap-2 font-semibold cursor-pointer"
              >
                {isPurgingProject === purgeConfirmProject.id ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Purging...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-ban text-xs" /> Permanently Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drive File Preview Lightbox Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-border flex items-center justify-between gap-3 bg-muted/25">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <i className={cn(
                    "fa-solid text-lg",
                    (previewFile.mimeType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(previewFile.name)
                      ? "fa-image"
                      : previewFile.name.endsWith(".pdf")
                      ? "fa-file-pdf text-rose-500"
                      : "fa-file-lines"
                  )} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate" title={previewFile.name}>
                    {previewFile.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      <i className="fa-solid fa-folder text-[8px] mr-1 opacity-70" />
                      {previewFile.folder || "/"}
                    </Badge>
                    <span>•</span>
                    <span className="font-mono">{Math.round((previewFile.size || 0) / 1024)} KB</span>
                    <span>•</span>
                    <span>{new Date(previewFile.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    <span>•</span>
                    <span>By {previewFile.uploadedBy?.name || "Member"}</span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyFileLink(previewFile)}
                  className="h-8 gap-1.5 text-xs"
                  title="Copy shareable download link"
                >
                  <i className={cn("fa-solid text-xs", copiedFileId === previewFile._id ? "fa-check text-emerald-500" : "fa-link")} />
                  <span className="hidden sm:inline">{copiedFileId === previewFile._id ? "Copied!" : "Copy Link"}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingFile({ _id: previewFile._id, name: previewFile.name, folder: previewFile.folder || "/" });
                  }}
                  className="h-8 gap-1.5 text-xs"
                  title="Rename or move folder"
                >
                  <i className="fa-solid fa-pen-to-square text-xs" />
                  <span className="hidden sm:inline">Rename/Move</span>
                </Button>

                <a
                  href={`/api/drive/download?fileId=${previewFile._id}&download=true`}
                  download={previewFile.name}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="Download file"
                >
                  <i className="fa-solid fa-download text-xs" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewFile(null)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </Button>
              </div>
            </div>

            {/* Modal Preview Body */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-muted/10 min-h-[360px] max-h-[70vh]">
              {((previewFile.mimeType || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(previewFile.name)) ? (
                <div className="flex flex-col items-center justify-center gap-3">
                  <img
                    src={`/api/drive/download?fileId=${previewFile._id}`}
                    alt={previewFile.name}
                    className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-md border border-border"
                  />
                  <p className="text-[11px] text-muted-foreground">Original Resolution Preview</p>
                </div>
              ) : previewFile.name.endsWith(".pdf") || previewFile.mimeType === "application/pdf" ? (
                <div className="w-full h-[62vh] rounded-xl overflow-hidden border border-border shadow-xs bg-card">
                  <iframe
                    src={`/api/drive/download?fileId=${previewFile._id}`}
                    title={previewFile.name}
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="text-center p-8 max-w-md space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto text-2xl">
                    <i className="fa-solid fa-file-lines" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{previewFile.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Direct visual preview is optimized for Images and PDFs. You can download or view this file directly on your system.
                    </p>
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <a
                      href={`/api/drive/download?fileId=${previewFile._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground transition-colors"
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square text-xs text-primary" /> Open in New Tab
                    </a>
                    <a
                      href={`/api/drive/download?fileId=${previewFile._id}&download=true`}
                      download={previewFile.name}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <i className="fa-solid fa-download text-xs" /> Download File
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-5 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
              <span className="font-mono text-[11px]">ID: {previewFile._id}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirmFile(previewFile)}
                className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1.5"
              >
                <i className="fa-solid fa-trash-can text-xs" /> Delete File
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename & Move File Modal */}
      {editingFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setEditingFile(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-primary">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-pen-to-square" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Rename & Move File</h3>
                <p className="text-xs text-muted-foreground">Update document name or organize into folders</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">File Name</label>
                <Input
                  type="text"
                  value={editingFile.name}
                  onChange={(e) => setEditingFile({ ...editingFile, name: e.target.value })}
                  placeholder="File name"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Destination Folder</label>
                <select
                  value={editingFile.folder}
                  onChange={(e) => setEditingFile({ ...editingFile, folder: e.target.value })}
                  className="w-full h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="/">Root Workspace (/)</option>
                  <option value="Projects">Projects</option>
                  <option value="Documents">Documents</option>
                  <option value="Contracts">Contracts</option>
                  <option value="Invoices">Invoices</option>
                  <option value="Designs">Designs</option>
                  <option value="Resumes">Resumes</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingFile(null)}
                disabled={isUpdatingFile}
              >
                Cancel
              </Button>
              <Button
                color="primary"
                size="sm"
                onClick={handleUpdateFile}
                disabled={isUpdatingFile || !editingFile.name.trim()}
                className="gap-2 font-semibold"
              >
                {isUpdatingFile ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check text-xs" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single File Confirmation Modal */}
      {deleteConfirmFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDeleteConfirmFile(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-trash-can" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete File?</h3>
                <p className="text-xs text-muted-foreground">Permanent deletion from workspace storage</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-foreground/90">
              <p>
                Are you sure you want to permanently delete <strong className="text-foreground">"{deleteConfirmFile.name}"</strong>?
              </p>
              <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs space-y-1">
                <p className="text-muted-foreground">
                  <strong>Folder:</strong> {deleteConfirmFile.folder || "/"} • <strong>Size:</strong> {Math.round((deleteConfirmFile.size || 0) / 1024)} KB
                </p>
                <p className="text-rose-500 font-medium">
                  This file will be permanently removed from physical disk storage and database records.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmFile(null)}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={() => handleDeleteFile(deleteConfirmFile._id)}
                className="gap-2 font-semibold cursor-pointer"
              >
                <i className="fa-solid fa-trash-can text-xs" /> Delete File
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && selectedDriveFileIds.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowBatchDeleteModal(false)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center text-lg shrink-0">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete {selectedDriveFileIds.length} Selected File{selectedDriveFileIds.length === 1 ? "" : "s"}?</h3>
                <p className="text-xs text-rose-500 font-medium">Batch permanent purge • Cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              You are about to permanently delete <strong className="text-foreground">{selectedDriveFileIds.length}</strong> selected documents from Drive Space storage. This action cannot be reversed.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={isDeletingBatch}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={handleBatchDeleteDriveFiles}
                disabled={isDeletingBatch}
                className="gap-2 font-semibold cursor-pointer"
              >
                {isDeletingBatch ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Deleting {selectedDriveFileIds.length} files...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" /> Delete ({selectedDriveFileIds.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
