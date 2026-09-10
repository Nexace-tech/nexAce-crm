"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { usePermissions } from "@/hooks/usePermissions";
import { isSubAdminRole } from "@/lib/roles";
import { HRTasksTab } from "@/components/hr/HRTasksTab";
import { AccessRestricted } from "@/components/ui/AccessRestricted";

interface LeaveData {
  _id: string; userId: string; userName: string;
  type: string; startDate: string; endDate: string;
  reason: string; status: string; approverName?: string; createdAt: string;
}

interface CaseData {
  _id: string; userId: string; userName: string;
  category: string; subject: string; description: string;
  status: string; priority: string; comments: any[]; createdAt: string;
}

const EMPLOYMENT_TYPE_CONFIG: Record<string, { badge: string; icon: string }> = {
  Permanent: { badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: "fa-solid fa-user-check text-emerald-500" },
  Contractor: { badge: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: "fa-solid fa-file-contract text-amber-500" },
  Freelancer: { badge: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: "fa-solid fa-laptop-code text-purple-500" },
  "Part-Time": { badge: "bg-sky-500/10 text-sky-600 border-sky-500/20", icon: "fa-solid fa-clock text-sky-500" },
  Intern: { badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", icon: "fa-solid fa-graduation-cap text-indigo-500" },
};

export default function HRPage() {
  const { user, loading: authLoading } = useAuth();
  const { can, isAdmin, isOPS, canAccessModule, loading: permLoading } = usePermissions();
  const [activeTab, setActiveTab] = useTabPersistence<
    "directory" | "tasks" | "checklists" | "leaves" | "vault" | "cases" | "appraisals" | "probation" | "sandbox"
  >(
    "hr_active_tab_v2",
    "directory",
    ["directory", "tasks", "checklists", "leaves", "vault", "cases", "appraisals", "probation", "sandbox"]
  );

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Directory State
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [deptFilter, setDeptFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Checklists State (Onboarding / Offboarding)
  const [checklists, setChecklists] = useState<any[]>([]);
  const [checklistTypeFilter, setChecklistTypeFilter] = useState<"All" | "Onboarding" | "Offboarding">("All");
  const [checklistEmploymentTypeFilter, setChecklistEmploymentTypeFilter] = useState<string>("All");
  const [checklistViewMode, setChecklistViewMode] = useState<"grid" | "list">("grid");
  const [checklistSearchQuery, setChecklistSearchQuery] = useState("");
  const [selectedChecklistDetails, setSelectedChecklistDetails] = useState<any | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [isCreateNewEmployeeMode, setIsCreateNewEmployeeMode] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpDepartment, setNewEmpDepartment] = useState("Engineering");
  const [newChecklistUserId, setNewChecklistUserId] = useState("");
  const [newChecklistType, setNewChecklistType] = useState<"Onboarding" | "Offboarding">("Onboarding");
  const [newChecklistEmploymentType, setNewChecklistEmploymentType] = useState<string>("Contractor");
  const [newChecklistDueDate, setNewChecklistDueDate] = useState<string>("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [contractHourlyRate, setContractHourlyRate] = useState("");
  const [contractDailyRate, setContractDailyRate] = useState("");
  const [contractCurrency, setContractCurrency] = useState("USD");
  const [contractSowRef, setContractSowRef] = useState("");
  const [contractBillingCycle, setContractBillingCycle] = useState("Monthly");

  // Leave Management State
  const [leaves, setLeaves] = useState<any[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [selectedLeaveDetails, setSelectedLeaveDetails] = useState<any | null>(null);
  const [leaveType, setLeaveType] = useState("Casual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveSearchQuery, setLeaveSearchQuery] = useState("");
  const [leaveStatusFilter, setLeaveStatusFilter] = useState("All");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("All");
  const [leavePage, setLeavePage] = useState(1);
  const [leaveItemsPerPage, setLeaveItemsPerPage] = useState(5);

  const handleExportLeaveDetails = (leave: any, format: "csv" | "json" | "txt" = "csv") => {
    if (!leave) return;
    const safeUser = leave.userName.replace(/\s+/g, "_");

    if (format === "csv") {
      const csvHeader = "Record ID,Employee Name,Leave Type,Status,Start Date,End Date,Reason,Approver,Timestamp\n";
      const csvRow = `"${leave._id}","${leave.userName}","${leave.type} Leave","${leave.status}","${new Date(leave.startDate).toLocaleDateString()}","${new Date(leave.endDate).toLocaleDateString()}","${(leave.reason || "").replace(/"/g, '""')}","${leave.approverName || "Admin"}","${leave.updatedAt ? new Date(leave.updatedAt).toLocaleString() : "N/A"}"`;
      const blob = new Blob([csvHeader + csvRow], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Leave_Record_${safeUser}_${leave._id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Exported leave details as CSV!");
      return;
    }

    if (format === "json") {
      const blob = new Blob([JSON.stringify(leave, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Leave_Record_${safeUser}_${leave._id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Exported leave details as JSON!");
      return;
    }

    const content = `================================================
NEXACE CRM - LEAVE APPLICATION RECORD
================================================
Record ID     : ${leave._id}
Employee Name : ${leave.userName}
Leave Type    : ${leave.type} Leave
Status        : ${leave.status}
Start Date    : ${new Date(leave.startDate).toLocaleDateString()}
End Date      : ${new Date(leave.endDate).toLocaleDateString()}
Reason        : ${leave.reason}
Approver      : ${leave.approverName || "Admin/Manager"}
Updated At    : ${leave.updatedAt ? new Date(leave.updatedAt).toLocaleString() : "N/A"}
================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Leave_Record_${safeUser}_${leave._id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported leave details report!");
  };

  const handleExportAllLeaves = (records: any[]) => {
    if (!records || records.length === 0) {
      showToast("No leave records to export", "error");
      return;
    }

    const csvHeader = "Record ID,Employee Name,Leave Type,Status,Start Date,End Date,Reason,Approver,Timestamp\n";
    const csvRows = records
      .map((l) => {
        return `"${l._id}","${l.userName}","${l.type} Leave","${l.status}","${new Date(l.startDate).toLocaleDateString()}","${new Date(l.endDate).toLocaleDateString()}","${(l.reason || "").replace(/"/g, '""')}","${l.approverName || "N/A"}","${l.updatedAt ? new Date(l.updatedAt).toLocaleString() : "N/A"}"`;
      })
      .join("\n");

    const blob = new Blob([csvHeader + csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Leave_Records_Export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${records.length} leave record(s) to CSV!`);
  };

  // Vault State (Document Vault) — Manager/Admin upload
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState<any>("Offer Letter");
  const [docFileUrl, setDocFileUrl] = useState("");
  const [docTargetUserId, setDocTargetUserId] = useState("");
  const [docIsRestricted, setDocIsRestricted] = useState(true);
  // Vault search / filter
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultCategoryFilter, setVaultCategoryFilter] = useState("All");
  const [vaultSortOrder, setVaultSortOrder] = useState<"newest" | "oldest" | "az">("newest");
  const [vaultView, setVaultView] = useState<"grid" | "list">("grid");

  // Employee Self-Upload State
  const [showUserUploadModal, setShowUserUploadModal] = useState(false);
  const [userUploadTitle, setUserUploadTitle] = useState("");
  const [userUploadCategory, setUserUploadCategory] = useState("Contract");
  const [userUploadFile, setUserUploadFile] = useState<File | null>(null);
  const [userUploading, setUserUploading] = useState(false);
  const [userUploadError, setUserUploadError] = useState("");
  const [userUploadProgress, setUserUploadProgress] = useState(false);

  // Checklist Task Document Upload State
  const [checklistDocModal, setChecklistDocModal] = useState<{
    checklistId: string;
    item: any;
    targetUserId?: string;
    targetUserName?: string;
  } | null>(null);
  const [checklistUploadFile, setChecklistUploadFile] = useState<File | null>(null);
  const [checklistUploadTitle, setChecklistUploadTitle] = useState("");
  const [checklistUploadCategory, setChecklistUploadCategory] = useState("Contract");
  const [checklistUploading, setChecklistUploading] = useState(false);
  const [checklistUploadError, setChecklistUploadError] = useState("");

  // Initial Onboarding Documents State (Admin/HR attaching Offer Letter & NDA)
  const [initOfferLetterFile, setInitOfferLetterFile] = useState<File | null>(null);
  const [initNdaFile, setInitNdaFile] = useState<File | null>(null);
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);

  // Document Preview Modal State (Admin / HR viewer)
  const [previewModalDoc, setPreviewModalDoc] = useState<{
    title: string;
    fileName: string;
    url: string;
    submittedBy?: string;
    submittedAt?: string;
    category?: string;
  } | null>(null);

  // Cases State (Help Desk)
  const [cases, setCases] = useState<CaseData[]>([]);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseCategory, setCaseCategory] = useState("Payroll");
  const [caseSubject, setCaseSubject] = useState("");
  const [caseDesc, setCaseDesc] = useState("");
  const [casePriority, setCasePriority] = useState("Medium");
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [commentText, setCommentText] = useState("");
  const [caseSearchQuery, setCaseSearchQuery] = useState("");
  const [caseCategoryFilter, setCaseCategoryFilter] = useState("All");
  const [caseStatusFilter, setCaseStatusFilter] = useState("All");

  // Appraisals & KRAs State
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [showAppraisalModal, setShowAppraisalModal] = useState(false);
  const [appraisalUserId, setAppraisalUserId] = useState("");
  const [appraisalCycle, setAppraisalCycle] = useState("2026 Q2 Review");
  const [appraisalType, setAppraisalType] = useState<"Quarterly Appraisal" | "Probation Review" | "Annual Review">("Quarterly Appraisal");
  const [selectedAppraisal, setSelectedAppraisal] = useState<any | null>(null);

  // Sandbox State
  const [sandboxItems, setSandboxItems] = useState<any[]>([]);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxName, setSandboxName] = useState("");
  const [sandboxWorkflowType, setSandboxWorkflowType] = useState<any>("Leave Policy");
  const [sandboxConfig, setSandboxConfig] = useState("{\n  \"maxAnnualDays\": 24,\n  \"autoApproveSickDays\": 2\n}");

  const isManagerOrAdmin = user?.role === "Admin" || user?.role === "Manager" || user?.role === "HR" || user?.role === "OPS" || isSubAdminRole(user?.role);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetchers
  const isSyncingRef = useRef(false);

  const fetchDirectory = async () => {
    try {
      const res = await fetch("/api/hr/directory");
      if (res.ok) {
        const d = await res.json();
        setDirectoryUsers(d.users || []);
      }
    } catch {
      // Quietly handle transient network disconnect
    }
  };

  const fetchChecklists = async () => {
    try {
      const res = await fetch("/api/hr/checklists");
      if (res.ok) {
        const d = await res.json();
        setChecklists(d.checklists || []);
      }
    } catch {
      // Quietly handle transient network disconnect
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/hr/leaves");
      if (res.ok) {
        const d = await res.json();
        setLeaves(d.leaves || []);
      }
    } catch {
      // Quietly handle transient network disconnect / dev server restart
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/hr/documents");
      if (res.ok) {
        const d = await res.json();
        setDocuments(d.documents || []);
      }
    } catch {
      // Quietly handle transient network disconnect
    }
  };

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/hr/cases");
      if (res.ok) {
        const d = await res.json();
        setCases(d.cases || []);
      }
    } catch {
      // Quietly handle transient network disconnect
    }
  };

  const fetchAppraisals = async () => {
    try {
      const res = await fetch("/api/hr/appraisals");
      if (res.ok) {
        const d = await res.json();
        setAppraisals(d.appraisals || []);
      }
    } catch {
      // Quietly handle transient network disconnect
    }
  };

  const fetchSandbox = async () => {
    if (!isManagerOrAdmin) return;
    try {
      const res = await fetch("/api/hr/sandbox");
      if (res.ok) {
        const d = await res.json();
        setSandboxItems(d.sandboxItems || []);
      }
    } catch {
      // Quietly handle transient network disconnect
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["directory", "tasks", "checklists", "leaves", "vault", "cases", "appraisals", "probation", "sandbox"].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchDirectory(),
        fetchChecklists(),
        fetchLeaves(),
        fetchDocuments(),
        fetchCases(),
        fetchAppraisals(),
        fetchSandbox(),
      ]);
      setLoading(false);
    };
    init();

    // Real-time background sync every 10s (updates status without page reload)
    // Only poll when page is visible and device is online to prevent network flooding and fetch errors
    const interval = setInterval(async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        await Promise.all([fetchLeaves(), fetchCases()]);
      } finally {
        isSyncingRef.current = false;
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleToggleChecklistItem = async (checklistId: string, itemId: string, completed: boolean) => {
    try {
      const res = await fetch("/api/hr/checklists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId, itemId, completed }),
      });
      if (res.ok) {
        showToast("Checklist item updated!");
        const data = await res.json();
        if (selectedChecklistDetails && selectedChecklistDetails._id === checklistId && data.checklist) {
          setSelectedChecklistDetails(data.checklist);
        }
        await fetchChecklists();
      }
    } catch { showToast("Failed to update item", "error"); }
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let targetUserId = newChecklistUserId;
      let targetUserName = "";
      let targetUserEmail = "";

      if (isCreateNewEmployeeMode) {
        if (!newEmpName.trim() || !newEmpEmail.trim()) {
          showToast("Full name and email are required", "error");
          return;
        }

        // 1. Provision new contract employee via /api/team so they exist in My Team
        const teamRes = await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newEmpName.trim(),
            email: newEmpEmail.trim().toLowerCase(),
            role: "Employee",
            department: newEmpDepartment || "Engineering",
            employmentType: newChecklistEmploymentType,
            salary: contractHourlyRate ? Number(contractHourlyRate) : contractDailyRate ? Number(contractDailyRate) : 0,
          }),
        });

        const teamData = await teamRes.json();
        if (!teamRes.ok) {
          showToast(teamData.error || "Failed to create employee in My Team", "error");
          return;
        }

        targetUserId = teamData.user?._id;
        targetUserName = teamData.user?.name || newEmpName.trim();
        targetUserEmail = teamData.user?.email || newEmpEmail.trim();
      } else {
        const targetUser = directoryUsers.find((u) => u._id === newChecklistUserId);
        if (!targetUser) {
          showToast("Please select an employee", "error");
          return;
        }
        targetUserId = targetUser._id;
        targetUserName = targetUser.name;
        targetUserEmail = targetUser.email;
      }

      const isContractBased = ["Contractor", "Freelancer", "Part-Time", "Intern"].includes(newChecklistEmploymentType);
      const contractDetails = isContractBased && (contractStartDate || contractEndDate || contractHourlyRate || contractDailyRate || contractSowRef) ? {
        contractStartDate: contractStartDate ? new Date(contractStartDate) : undefined,
        contractEndDate: contractEndDate ? new Date(contractEndDate) : undefined,
        hourlyRate: contractHourlyRate ? parseFloat(contractHourlyRate) : undefined,
        dailyRate: contractDailyRate ? parseFloat(contractDailyRate) : undefined,
        currency: contractCurrency || "USD",
        sowReference: contractSowRef || undefined,
        billingCycle: contractBillingCycle || "Monthly",
      } : undefined;

      setIsCreatingChecklist(true);

      const initialAttachments: { offerLetter?: { url: string; name: string }; nda?: { url: string; name: string } } = {};

      if (initOfferLetterFile) {
        const fd = new FormData();
        fd.append("file", initOfferLetterFile);
        fd.append("title", `${targetUserName} - Offer Letter / Contract`);
        fd.append("category", "Contract");
        fd.append("targetUserId", targetUserId);
        fd.append("targetUserName", targetUserName);
        const upRes = await fetch("/api/hr/documents/upload", { method: "POST", body: fd });
        if (upRes.ok) {
          const upData = await upRes.json();
          const fileUrl = upData.document?.fileUrl || "";
          if (fileUrl) {
            initialAttachments.offerLetter = { url: fileUrl, name: initOfferLetterFile.name };
          }
        }
      }

      if (initNdaFile) {
        const fd = new FormData();
        fd.append("file", initNdaFile);
        fd.append("title", `${targetUserName} - Non-Disclosure Agreement (NDA)`);
        fd.append("category", "NDA");
        fd.append("targetUserId", targetUserId);
        fd.append("targetUserName", targetUserName);
        const upRes = await fetch("/api/hr/documents/upload", { method: "POST", body: fd });
        if (upRes.ok) {
          const upData = await upRes.json();
          const fileUrl = upData.document?.fileUrl || "";
          if (fileUrl) {
            initialAttachments.nda = { url: fileUrl, name: initNdaFile.name };
          }
        }
      }

      const res = await fetch("/api/hr/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          userName: targetUserName,
          userEmail: targetUserEmail,
          type: newChecklistType,
          employmentType: newChecklistEmploymentType,
          dueDate: newChecklistDueDate ? new Date(newChecklistDueDate) : undefined,
          contractDetails,
          initialAttachments: Object.keys(initialAttachments).length > 0 ? initialAttachments : undefined,
        }),
      });

      if (res.ok) {
        showToast(
          isCreateNewEmployeeMode
            ? `Created ${targetUserName} in My Team & initialized ${newChecklistEmploymentType} checklist!`
            : `Created ${newChecklistEmploymentType} ${newChecklistType} checklist for ${targetUserName}`
        );
        setShowChecklistModal(false);
        setIsCreateNewEmployeeMode(false);
        setNewEmpName("");
        setNewEmpEmail("");
        setNewEmpDepartment("Engineering");
        setNewChecklistUserId("");
        setNewChecklistEmploymentType("Contractor");
        setNewChecklistDueDate("");
        setContractStartDate("");
        setContractEndDate("");
        setContractHourlyRate("");
        setContractDailyRate("");
        setContractSowRef("");
        setInitOfferLetterFile(null);
        setInitNdaFile(null);
        await Promise.all([fetchDirectory(), fetchChecklists(), fetchDocuments()]);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to create checklist", "error");
      }
    } catch {
      showToast("Failed to create checklist", "error");
    } finally {
      setIsCreatingChecklist(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hr/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: leaveType, startDate: leaveStart, endDate: leaveEnd, reason: leaveReason }),
      });
      if (res.ok) {
        showToast("Leave request submitted!");
        setShowLeaveForm(false);
        setLeaveReason(""); setLeaveStart(""); setLeaveEnd("");
        await fetchLeaves();
      } else { const d = await res.json(); showToast(d.error, "error"); }
    } catch { showToast("Failed to submit leave", "error"); }
  };

  const handleApproveRejectLeave = async (leaveId: string, status: string) => {
    // Instant optimistic UI update without waiting
    setLeaves((prev) => prev.map((l) => l._id === leaveId ? { ...l, status } : l));
    try {
      const res = await fetch("/api/hr/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, status }),
      });
      if (res.ok) {
        showToast(`Leave ${status.toLowerCase()}`);
        await fetchLeaves();
      } else {
        await fetchLeaves();
      }
    } catch {
      showToast("Action failed", "error");
      await fetchLeaves();
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = directoryUsers.find((u) => u._id === docTargetUserId);
    try {
      const res = await fetch("/api/hr/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: docTitle,
          category: docCategory,
          fileUrl: docFileUrl || "#",
          targetUserId: targetUser?._id,
          targetUserName: targetUser?.name || "",
          isRestricted: docIsRestricted,
        }),
      });
      if (res.ok) {
        showToast("Document saved to Vault!");
        setShowDocModal(false);
        setDocTitle(""); setDocFileUrl("");
        await fetchDocuments();
      }
    } catch { showToast("Failed to upload document", "error"); }
  };

  const handleUserUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUploadFile) { setUserUploadError("Please select a file to upload."); return; }
    if (!userUploadTitle.trim()) { setUserUploadError("Please enter a document title."); return; }
    setUserUploadError("");
    setUserUploading(true);
    setUserUploadProgress(true);
    try {
      const fd = new FormData();
      fd.append("file", userUploadFile);
      fd.append("title", userUploadTitle.trim());
      fd.append("category", userUploadCategory);
      const res = await fetch("/api/hr/documents/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        showToast("Document uploaded to your Vault!");
        setShowUserUploadModal(false);
        setUserUploadTitle("");
        setUserUploadCategory("Contract");
        setUserUploadFile(null);
        await fetchDocuments();
      } else {
        setUserUploadError(data.error || "Upload failed. Please try again.");
      }
    } catch {
      setUserUploadError("Network error — please try again.");
    } finally {
      setUserUploading(false);
      setUserUploadProgress(false);
    }
  };

  const mapChecklistCategoryToDoc = (cat: string) => {
    if (cat === "Contract") return "Contract";
    if (cat === "NDA") return "NDA";
    if (cat === "KRA Sign-off") return "KRA Agreement";
    if (cat === "Compliance") return "Policy";
    if (cat === "Document") return "Document";
    return "Other";
  };

  const openChecklistUploadModal = (checklist: any, item: any) => {
    setChecklistDocModal({
      checklistId: checklist._id,
      item,
      targetUserId: checklist.userId,
      targetUserName: checklist.userName,
    });
    setChecklistUploadTitle(item.title || "Checklist Document");
    setChecklistUploadCategory(mapChecklistCategoryToDoc(item.category));
    setChecklistUploadFile(null);
    setChecklistUploadError("");
  };

  const handleChecklistUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistDocModal) return;
    if (!checklistUploadFile) {
      setChecklistUploadError("Please select a file to upload.");
      return;
    }
    if (!checklistUploadTitle.trim()) {
      setChecklistUploadError("Please enter a document title.");
      return;
    }

    setChecklistUploadError("");
    setChecklistUploading(true);

    try {
      // 1. Upload to Document Vault
      const fd = new FormData();
      fd.append("file", checklistUploadFile);
      fd.append("title", checklistUploadTitle.trim());
      fd.append("category", checklistUploadCategory);
      if (checklistDocModal.targetUserId) {
        fd.append("targetUserId", checklistDocModal.targetUserId);
      }
      if (checklistDocModal.targetUserName) {
        fd.append("targetUserName", checklistDocModal.targetUserName);
      }

      const uploadRes = await fetch("/api/hr/documents/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        setChecklistUploadError(uploadData.error || "Document upload failed.");
        setChecklistUploading(false);
        return;
      }

      const fileUrl = uploadData.document?.fileUrl || "";
      const fileName = checklistUploadFile.name;

      // 2. Mark checklist item completed and attach documentUrl & documentName
      const checklistRes = await fetch("/api/hr/checklists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checklistId: checklistDocModal.checklistId,
          itemId: checklistDocModal.item.id,
          completed: true,
          documentUrl: fileUrl,
          documentName: fileName,
        }),
      });

      if (checklistRes.ok) {
        showToast("Document uploaded and checklist task completed!");
        const data = await checklistRes.json();
        if (selectedChecklistDetails && selectedChecklistDetails._id === checklistDocModal.checklistId && data.checklist) {
          setSelectedChecklistDetails(data.checklist);
        }
        setChecklistDocModal(null);
        setChecklistUploadFile(null);
        await fetchChecklists();
        await fetchDocuments();
      } else {
        const d = await checklistRes.json();
        setChecklistUploadError(d.error || "Failed to mark checklist task completed.");
      }
    } catch {
      setChecklistUploadError("An error occurred during upload. Please try again.");
    } finally {
      setChecklistUploading(false);
    }
  };

  const handleChecklistCompleteWithoutDoc = async () => {
    if (!checklistDocModal) return;
    await handleToggleChecklistItem(checklistDocModal.checklistId, checklistDocModal.item.id, true);
    setChecklistDocModal(null);
    setChecklistUploadFile(null);
  };

  const handleSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hr/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: caseCategory, subject: caseSubject, description: caseDesc, priority: casePriority }),
      });
      if (res.ok) {
        showToast("HR case created!");
        setShowCaseForm(false);
        setCaseSubject(""); setCaseDesc("");
        await fetchCases();
      } else { const d = await res.json(); showToast(d.error, "error"); }
    } catch { showToast("Failed to create case", "error"); }
  };

  const handleAddComment = async (caseId: string) => {
    if (!commentText.trim()) return;
    try {
      const res = await fetch("/api/hr/cases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, comment: commentText }),
      });
      if (res.ok) {
        setCommentText("");
        await fetchCases();
        const d = await res.json();
        setSelectedCase(d.case);
        showToast("Comment added!");
      }
    } catch { showToast("Failed to add comment", "error"); }
  };

  const handleUpdateCaseStatus = async (caseId: string, status: string) => {
    try {
      await fetch("/api/hr/cases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, status }),
      });
      showToast(`Case marked as ${status}`);
      await fetchCases();
      setSelectedCase(null);
    } catch { showToast("Failed to update", "error"); }
  };

  const handleCreateAppraisal = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = directoryUsers.find((u) => u._id === appraisalUserId);
    if (!targetUser) return;
    try {
      const res = await fetch("/api/hr/appraisals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUser._id,
          userName: targetUser.name,
          cycle: appraisalCycle,
          type: appraisalType,
        }),
      });
      if (res.ok) {
        showToast("Appraisal cycle initialized!");
        setShowAppraisalModal(false);
        await fetchAppraisals();
      }
    } catch { showToast("Failed to initialize appraisal", "error"); }
  };

  const handleSaveAppraisal = async (action: "submit_self_review" | "submit_manager_review") => {
    if (!selectedAppraisal) return;
    try {
      const res = await fetch("/api/hr/appraisals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appraisalId: selectedAppraisal._id,
          action,
          kras: selectedAppraisal.kras,
          selfFeedback: selectedAppraisal.selfFeedback,
          managerFeedback: selectedAppraisal.managerFeedback,
          probationStatus: selectedAppraisal.probationStatus,
        }),
      });
      if (res.ok) {
        showToast(action === "submit_self_review" ? "Self review submitted!" : "Manager review finalized!");
        setSelectedAppraisal(null);
        await fetchAppraisals();
      }
    } catch { showToast("Failed to update appraisal", "error"); }
  };

  const handleCreateSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/hr/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sandboxName,
          workflowType: sandboxWorkflowType,
          configJson: sandboxConfig,
        }),
      });
      if (res.ok) {
        showToast("Workflow added to Sandbox!");
        setShowSandboxModal(false);
        setSandboxName("");
        await fetchSandbox();
      }
    } catch { showToast("Failed to save sandbox workflow", "error"); }
  };

  if (authLoading || loading) {
    return <Preloader label="Loading HR Management Portal & Records..." />;
  }

  // Filtered Users
  const filteredUsers = directoryUsers.filter((u) => {
    const matchesDept = deptFilter === "All" || u.department === deptFilter || (u.departments && u.departments.includes(deptFilter));
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    const matchesSearch = !searchQuery || (u.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) || (u.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    return matchesDept && matchesRole && matchesSearch;
  });

  // Calculate probation dates
  const probationUsers = directoryUsers.map((u) => {
    const joinDate = u.joinDate ? new Date(u.joinDate) : new Date(u.createdAt);
    const probationEnd = new Date(joinDate);
    probationEnd.setDate(probationEnd.getDate() + 90); // 90 days probation
    const isUpcoming = probationEnd.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 && probationEnd.getTime() > Date.now();
    return { ...u, joinDate, probationEnd, isUpcoming };
  });
  if (!permLoading && !canAccessModule("hr")) {
    return <AccessRestricted moduleName="HR Portal" icon="fa-solid fa-users-gear" />;
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
          toast.type === "success" ? "bg-emerald-500/90 text-white border-emerald-600" : "bg-destructive/90 text-white border-destructive"
        )}>
          {toast.type === "success" ? <i className="fa-solid fa-circle-check text-base" /> : <i className="fa-solid fa-circle-exclamation text-base" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <i className="fa-solid fa-users-gear text-primary" /> HR Management & People Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Directory, Onboarding/Offboarding, Leave Approvals, Vault, Help Desk, Appraisals & HR Sandbox.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(can("applyLeave") || isAdmin || isOPS) && (
            <Button variant="outline" size="sm" onClick={() => { setActiveTab("leaves"); setShowLeaveForm(true); }} className="gap-2 cursor-pointer">
              <i className="fa-solid fa-calendar-days text-xs" /> Request Leave
            </Button>
          )}
          {(can("createHRCases") || isAdmin || isOPS) && (
            <Button color="primary" size="sm" onClick={() => { setActiveTab("cases"); setShowCaseForm(true); }} className="gap-2 cursor-pointer">
              <i className="fa-solid fa-plus text-xs" /> Submit Case
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row - Interactive Clickable Tab Shortcuts (only shown for permitted tabs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {(isManagerOrAdmin || can("viewHRDirectory") || Boolean(user)) && (
          <Card 
            onClick={() => setActiveTab("directory")} 
            className={cn(
              "border-l-4 border-l-primary hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer",
              activeTab === "directory" ? "bg-primary/5 ring-1 ring-primary/30" : ""
            )}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Workforce</p>
                <p className="text-2xl font-bold text-foreground">{directoryUsers.length} Employees</p>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-xl"><i className="fa-solid fa-users text-xl" /></div>
            </CardContent>
          </Card>
        )}

        {(isManagerOrAdmin || can("viewHROnboarding") || Boolean(user)) && (
          <Card 
            onClick={() => setActiveTab("checklists")} 
            className={cn(
              "border-l-4 border-l-emerald-500 hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer",
              activeTab === "checklists" ? "bg-emerald-500/5 ring-1 ring-emerald-500/30" : ""
            )}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Checklists</p>
                <p className="text-2xl font-bold text-foreground">{checklists.filter((c) => c.status === "In Progress").length} Ongoing</p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><i className="fa-solid fa-clipboard-check text-xl" /></div>
            </CardContent>
          </Card>
        )}

        {(isManagerOrAdmin || can("applyLeave") || can("viewOwnLeaveStatus") || can("viewTeamLeave") || Boolean(user)) && (
          <Card 
            onClick={() => setActiveTab("leaves")} 
            className={cn(
              "border-l-4 border-l-amber-500 hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer",
              activeTab === "leaves" ? "bg-amber-500/5 ring-1 ring-amber-500/30" : ""
            )}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Leaves</p>
                <p className="text-2xl font-bold text-foreground">{leaves.filter((l) => l.status === "Pending").length} Requests</p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><i className="fa-solid fa-calendar-days text-xl" /></div>
            </CardContent>
          </Card>
        )}

        {(isManagerOrAdmin || can("viewHRCases") || can("createHRCases") || Boolean(user)) && (
          <Card 
            onClick={() => setActiveTab("cases")} 
            className={cn(
              "border-l-4 border-l-sky-500 hover:shadow-md hover:translate-y-[-2px] transition-all cursor-pointer",
              activeTab === "cases" ? "bg-sky-500/5 ring-1 ring-sky-500/30" : ""
            )}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open HR Cases</p>
                <p className="text-2xl font-bold text-foreground">{cases.filter((c) => c.status === "Open" || c.status === "In Progress").length} Open</p>
              </div>
              <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl"><i className="fa-solid fa-circle-question text-xl" /></div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Interactive Tab Navigation Bar with Smooth Scroll Controls */}
      <div className="relative flex items-center bg-card border border-border/80 rounded-xl p-1 shadow-2xs">
        <button
          type="button"
          onClick={() => {
            const container = document.getElementById("hr-tab-bar");
            if (container) container.scrollBy({ left: -220, behavior: "smooth" });
          }}
          className="h-9 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
          title="Scroll Left"
        >
          <i className="fa-solid fa-chevron-left text-xs" />
        </button>

        <div id="hr-tab-bar" className="flex-1 flex space-x-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5 px-1">
          {/* Employee Directory — guarded */}
          {(isManagerOrAdmin || can("viewHRDirectory") || Boolean(user)) && (
            <button onClick={() => setActiveTab("directory")} className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === "directory" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
              <i className="fa-solid fa-address-book text-xs" /> Employee Directory
            </button>
          )}
          {/* HR Tasks & Workflows — manager/admin only */}
          {isManagerOrAdmin && (
            <button onClick={() => setActiveTab("tasks")} className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === "tasks" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
              <i className="fa-solid fa-list-check text-xs text-indigo-400" /> HR Tasks & Workflows
            </button>
          )}
          {/* Onboarding / Offboarding — guarded */}
          {(isManagerOrAdmin || can("viewHROnboarding") || Boolean(user)) && (
            <button onClick={() => setActiveTab("checklists")} className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === "checklists" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
              <i className="fa-solid fa-list-check text-xs" /> Onboarding / Offboarding
            </button>
          )}
          {/* Leave Management — guarded */}
          {(isManagerOrAdmin || can("applyLeave") || can("viewOwnLeaveStatus") || can("viewTeamLeave") || Boolean(user)) && (
            <button onClick={() => setActiveTab("leaves")} className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === "leaves" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
              <i className="fa-solid fa-calendar-days text-xs" /> Leave Management
            </button>
          )}
          {/* Document Vault — guarded */}
          {(isManagerOrAdmin || can("viewHRVault") || Boolean(user)) && (
            <button onClick={() => setActiveTab("vault")} className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === "vault" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
              <i className="fa-solid fa-shield-halved text-xs text-emerald-500" /> Document Vault
            </button>
          )}
          {/* Help Desk — guarded */}
          {(isManagerOrAdmin || can("viewHRCases") || can("createHRCases") || Boolean(user)) && (
            <button onClick={() => setActiveTab("cases")} className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === "cases" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
              <i className="fa-solid fa-circle-question text-xs text-amber-500" /> Help Desk
            </button>
          )}
          {/* Appraisals & KRAs — guarded */}
          {(isManagerOrAdmin || can("viewAppraisals") || Boolean(user)) && (
            <button onClick={() => setActiveTab("appraisals")} className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === "appraisals" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
              <i className="fa-solid fa-award text-xs text-indigo-500" /> Appraisals & KRAs
            </button>
          )}
          {/* Review Cycle & Probation — guarded */}
          {(isManagerOrAdmin || can("viewProbation") || Boolean(user)) && (
            <button onClick={() => setActiveTab("probation")} className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === "probation" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
              <i className="fa-solid fa-clock text-xs text-sky-500" /> Review Cycle & Probation
            </button>
          )}
          {/* HR Sandbox — manager/admin only */}
          {isManagerOrAdmin && (
            <button onClick={() => setActiveTab("sandbox")} className={cn(
              "px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 cursor-pointer shrink-0",
              activeTab === "sandbox" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
              <i className="fa-solid fa-sliders text-xs text-purple-500" /> HR Sandbox
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            const container = document.getElementById("hr-tab-bar");
            if (container) container.scrollBy({ left: 220, behavior: "smooth" });
          }}
          className="h-9 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
          title="Scroll Right"
        >
          <i className="fa-solid fa-chevron-right text-xs" />
        </button>
      </div>

      {/* TAB: HR TASKS & WORKFLOWS — manager/admin only */}
      {activeTab === "tasks" && isManagerOrAdmin && <HRTasksTab />}

      {/* TAB 1: EMPLOYEE DIRECTORY — guarded */}
      {activeTab === "directory" && (isManagerOrAdmin || can("viewHRDirectory") || Boolean(user)) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <i className="fa-solid fa-magnifying-glass text-muted-foreground text-sm" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 h-9"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground"
              >
                <option value="All">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="HR">HR</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground"
              >
                <option value="All">All Roles</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => (
              <Card key={u._id} className="hover:shadow-md transition-all">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-base border border-primary/30">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{u.name}</h4>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <Badge color={u.role === "Admin" ? "destructive" : u.role === "Manager" ? "primary" : "default"}>
                      {u.role}
                    </Badge>
                  </div>
                  <div className="pt-2 border-t border-border/60 text-xs space-y-1">
                    <p className="text-muted-foreground flex justify-between">
                      <span>Department:</span>
                      <span className="font-semibold text-foreground">{u.department || "General"}</span>
                    </p>
                    <p className="text-muted-foreground flex justify-between">
                      <span>Joined:</span>
                      <span className="font-medium text-foreground">{u.joinDate ? new Date(u.joinDate).toLocaleDateString() : "N/A"}</span>
                    </p>
                    <p className="text-muted-foreground flex justify-between">
                      <span>Shift:</span>
                      <span className="font-medium text-foreground">{u.shiftTime || "09:00 AM - 05:00 PM"}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ONBOARDING / OFFBOARDING & CONTRACTS GRID — guarded */}
      {activeTab === "checklists" && (isManagerOrAdmin || can("viewHROnboarding") || Boolean(user)) && (
        <div className="space-y-4">
          {/* Header & Controls Bar modeled after Dreams Technologies Contracts Grid */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card border border-border/80 p-4 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">Contracts & Onboarding</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {checklists.filter((c) => {
                    const matchType = checklistTypeFilter === "All" || c.type === checklistTypeFilter;
                    const matchEmp = checklistEmploymentTypeFilter === "All" || (c.employmentType || "Permanent") === checklistEmploymentTypeFilter;
                    const matchSearch = !checklistSearchQuery || 
                      c.userName?.toLowerCase().includes(checklistSearchQuery.toLowerCase()) || 
                      c.userEmail?.toLowerCase().includes(checklistSearchQuery.toLowerCase()) ||
                      c.contractDetails?.sowReference?.toLowerCase().includes(checklistSearchQuery.toLowerCase());
                    return matchType && matchEmp && matchSearch;
                  }).length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search Bar */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                <Input
                  placeholder="Search contracts, SOW, names..."
                  value={checklistSearchQuery}
                  onChange={(e) => setChecklistSearchQuery(e.target.value)}
                  className="w-48 sm:w-56 h-9 text-xs pl-8 bg-background border-border/80"
                />
                {checklistSearchQuery && (
                  <button onClick={() => setChecklistSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer">
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>

              {/* View Switcher: List vs Grid */}
              <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
                <button
                  type="button"
                  onClick={() => setChecklistViewMode("list")}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5",
                    checklistViewMode === "list" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="List View"
                >
                  <i className="fa-solid fa-list" />
                </button>
                <button
                  type="button"
                  onClick={() => setChecklistViewMode("grid")}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5",
                    checklistViewMode === "grid" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Grid View"
                >
                  <i className="fa-solid fa-table-cells" />
                </button>
              </div>

              {/* Add New Contract / Checklist Button */}
              {isManagerOrAdmin && (
                <Button id="btn-add-new-contract" color="primary" size="sm" onClick={() => setShowChecklistModal(true)} className="gap-1.5 h-9 text-xs cursor-pointer shadow-xs">
                  <i className="fa-solid fa-plus text-xs" /> Add New Contract
                </Button>
              )}
            </div>
          </div>

          {/* Filter Pills: Type & Employment Type */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                {(["All", "Onboarding", "Offboarding"] as const).map((t) => (
                  <Button
                    key={t}
                    variant={checklistTypeFilter === t ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setChecklistTypeFilter(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              {/* Employment Type Filter */}
              <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border flex-wrap">
                {(["All", "Contractor", "Freelancer", "Part-Time", "Intern", "Permanent"] as const).map((emp) => (
                  <Button
                    key={emp}
                    variant={checklistEmploymentTypeFilter === emp ? "default" : "ghost"}
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setChecklistEmploymentTypeFilter(emp)}
                  >
                    {emp === "All" ? "All Types" : emp}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* CONTENT SECTION */}
          {(() => {
            const filteredChecklists = checklists
              .filter((c) => checklistTypeFilter === "All" || c.type === checklistTypeFilter)
              .filter((c) => checklistEmploymentTypeFilter === "All" || (c.employmentType || "Permanent") === checklistEmploymentTypeFilter)
              .filter((c) => {
                if (!checklistSearchQuery) return true;
                const q = checklistSearchQuery.toLowerCase();
                return (
                  c.userName?.toLowerCase().includes(q) ||
                  c.userEmail?.toLowerCase().includes(q) ||
                  c.contractDetails?.sowReference?.toLowerCase().includes(q) ||
                  (c.employmentType || "Permanent").toLowerCase().includes(q)
                );
              });

            if (filteredChecklists.length === 0) {
              return (
                <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground text-lg">
                    <i className="fa-solid fa-file-contract" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground">No contracts or checklists found</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Try adjusting your filters or search query, or initialize a new contract onboarding workflow.
                  </p>
                  {isManagerOrAdmin && (
                    <Button color="primary" size="sm" onClick={() => setShowChecklistModal(true)} className="gap-1 text-xs">
                      <i className="fa-solid fa-plus text-xs" /> Add New Contract
                    </Button>
                  )}
                </div>
              );
            }

            {/* DREAMS TECHNOLOGIES CONTRACTS GRID LAYOUT */}
            if (checklistViewMode === "grid") {
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredChecklists.map((c) => {
                    const completedCount = c.items?.filter((i: any) => i.completed).length || 0;
                    const totalItems = c.items?.length || 1;
                    const progressPct = Math.round((completedCount / totalItems) * 100);
                    const empType = c.employmentType || "Permanent";
                    const contractId = c.contractDetails?.sowReference || c._id.slice(-6).toUpperCase();

                    const startDateStr = c.contractDetails?.contractStartDate
                      ? new Date(c.contractDetails.contractStartDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : new Date(c.startDate || c.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

                    const endDateStr = c.contractDetails?.contractEndDate
                      ? new Date(c.contractDetails.contractEndDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : c.dueDate
                      ? new Date(c.dueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "Ongoing";

                    const valueStr = c.contractDetails?.hourlyRate
                      ? `${c.contractDetails.currency || "$"} ${c.contractDetails.hourlyRate}/hr`
                      : c.contractDetails?.dailyRate
                      ? `${c.contractDetails.currency || "$"} ${c.contractDetails.dailyRate}/day`
                      : c.contractDetails?.sowReference
                      ? `${c.contractDetails.currency || "$"} Fixed`
                      : "Standard";

                    return (
                      <div
                        key={c._id}
                        className="bg-card border border-border/80 rounded-2xl p-4 hover:shadow-md transition-all flex flex-col justify-between group hover:border-primary/40 relative"
                      >
                        <div>
                          {/* Top Row: ID Badge & Menu Button */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 uppercase tracking-wide">
                              {contractId}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={cn("text-[10px] py-0", c.status === "Completed" ? "border-emerald-500/30 text-emerald-600" : "")}>
                                {c.status}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => setSelectedChecklistDetails(c)}
                                className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 text-xs transition-colors cursor-pointer"
                                title="Contract & Tasks Menu"
                              >
                                <i className="fa-solid fa-ellipsis-vertical" />
                              </button>
                            </div>
                          </div>

                          {/* Contract Title & Category */}
                          <div className="mb-3">
                            <h4
                              onClick={() => setSelectedChecklistDetails(c)}
                              className="font-bold text-sm text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                              title={`${c.userName} - ${empType}`}
                            >
                              {c.contractDetails?.sowReference ? `${c.userName} (${c.contractDetails.sowReference})` : `${c.userName}'s Contract`}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              Category : <span className="text-foreground/90 font-medium">{empType}</span> ({c.type})
                            </p>
                          </div>

                          {/* Dates Block */}
                          <div className="space-y-1.5 my-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <i className="fa-regular fa-calendar-days text-muted-foreground/70 text-xs w-3.5" />
                              <span>Date : <strong className="text-foreground/90 font-normal">{startDateStr}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <i className="fa-regular fa-calendar-check text-muted-foreground/70 text-xs w-3.5" />
                              <span>Open till : <strong className="text-foreground/90 font-normal">{endDateStr}</strong></span>
                            </div>
                          </div>

                          {/* Contractor Profile Sub-box */}
                          <div className="bg-muted/40 border border-border/60 rounded-xl p-2.5 flex items-center gap-2.5 mb-3.5">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold text-xs uppercase shadow-2xs">
                              {c.userName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate">{c.userName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{c.userEmail || empType}</p>
                            </div>
                          </div>

                          {/* Checklist Tasks Progress Bar */}
                          <div className="space-y-1 mb-3.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">Checklist Progress</span>
                              <span className="font-semibold text-foreground">{completedCount}/{totalItems} Tasks ({progressPct}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Footer: Value Tag & Action Button */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-border/60 mt-auto">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            <i className="fa-solid fa-user text-[10px]" />
                            <span>Value : {valueStr}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedChecklistDetails(c)}
                            className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
                            title="View Checklist Tasks"
                          >
                            <i className="fa-regular fa-file-lines text-xs" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            {/* DETAILED LIST VIEW */}
            return (
              <div className="space-y-4">
                {filteredChecklists.map((c) => {
                  const completedCount = c.items?.filter((i: any) => i.completed).length || 0;
                  const totalItems = c.items?.length || 1;
                  const progressPct = Math.round((completedCount / totalItems) * 100);
                  const empType = c.employmentType || "Permanent";
                  const empConfig = EMPLOYMENT_TYPE_CONFIG[empType] || { badge: "bg-muted text-muted-foreground border-border", icon: "fa-solid fa-user" };

                  return (
                    <Card key={c._id} className="p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base text-foreground">{c.userName}</h3>
                            <Badge color={c.type === "Onboarding" ? "primary" : "destructive"}>{c.type}</Badge>
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border", empConfig.badge)}>
                              <i className={cn(empConfig.icon, "text-[10px]")} />
                              {empType}
                            </span>
                            <Badge variant="outline">{c.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.userEmail}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-foreground">{completedCount} of {c.items.length} Tasks Done ({progressPct}%)</p>
                          <div className="w-36 h-2 bg-muted rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Contract Details Banner (if applicable) */}
                      {c.contractDetails && (c.contractDetails.contractStartDate || c.contractDetails.contractEndDate || c.contractDetails.hourlyRate || c.contractDetails.dailyRate || c.contractDetails.sowReference) && (
                        <div className="flex flex-wrap items-center gap-4 bg-muted/30 border border-border/60 rounded-lg px-3 py-2 text-xs">
                          {c.contractDetails.sowReference && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <i className="fa-solid fa-hashtag text-primary text-[10px]" />
                              <span className="font-medium text-foreground">SOW:</span> {c.contractDetails.sowReference}
                            </div>
                          )}
                          {(c.contractDetails.contractStartDate || c.contractDetails.contractEndDate) && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <i className="fa-solid fa-calendar-day text-amber-500 text-[10px]" />
                              <span className="font-medium text-foreground">Period:</span>{" "}
                              {c.contractDetails.contractStartDate ? new Date(c.contractDetails.contractStartDate).toLocaleDateString() : "Immediate"} -{" "}
                              {c.contractDetails.contractEndDate ? new Date(c.contractDetails.contractEndDate).toLocaleDateString() : "Ongoing"}
                            </div>
                          )}
                          {(c.contractDetails.hourlyRate || c.contractDetails.dailyRate) && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <i className="fa-solid fa-money-bill-wave text-emerald-500 text-[10px]" />
                              <span className="font-medium text-foreground">Rate:</span>{" "}
                              {c.contractDetails.currency || "USD"} {c.contractDetails.hourlyRate ? `${c.contractDetails.hourlyRate}/hr` : `${c.contractDetails.dailyRate}/day`}
                            </div>
                          )}
                          {c.contractDetails.billingCycle && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <i className="fa-solid fa-clock-rotate-left text-sky-500 text-[10px]" />
                              <span className="font-medium text-foreground">Billing:</span> {c.contractDetails.billingCycle}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {c.items.map((item: any) => {
                          const isDocItem = ["Document", "Contract", "NDA", "Compliance"].includes(item.category);
                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (item.documentUrl) {
                                  setPreviewModalDoc({
                                    title: item.title,
                                    fileName: item.documentName || "Document",
                                    url: item.documentUrl,
                                    submittedBy: item.completedBy,
                                    submittedAt: item.completedAt,
                                    category: item.category,
                                  });
                                } else if (!item.completed && isDocItem) {
                                  openChecklistUploadModal(c, item);
                                }
                              }}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all",
                                item.completed ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-card border-border hover:bg-muted/40"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                                <input
                                  type="checkbox"
                                  checked={item.completed}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleToggleChecklistItem(c._id, item.id, !item.completed);
                                  }}
                                  className="rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <span className={cn("font-medium block truncate", item.completed && "line-through opacity-80")}>{item.title}</span>
                                  {item.documentUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewModalDoc({
                                          title: item.title,
                                          fileName: item.documentName || "Document",
                                          url: item.documentUrl,
                                          submittedBy: item.completedBy,
                                          submittedAt: item.completedAt,
                                          category: item.category,
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                      title="Click to view document"
                                    >
                                      <i className="fa-solid fa-paperclip text-[9px]" />
                                      <span className="truncate max-w-[140px]">{item.documentName || "View Document"}</span>
                                      <i className="fa-solid fa-eye text-[8px] ml-0.5 opacity-80" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.documentUrl && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewModalDoc({
                                        title: item.title,
                                        fileName: item.documentName || "Document",
                                        url: item.documentUrl,
                                        submittedBy: item.completedBy,
                                        submittedAt: item.completedAt,
                                        category: item.category,
                                      });
                                    }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 transition-all cursor-pointer shadow-xs"
                                    title="Show / view submitted document"
                                  >
                                    <i className="fa-solid fa-eye text-[9px]" />
                                    <span>Show</span>
                                  </button>
                                )}
                                {!item.completed && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openChecklistUploadModal(c, item);
                                    }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all cursor-pointer"
                                  >
                                    <i className="fa-solid fa-cloud-arrow-up text-[9px]" />
                                    <span>Upload</span>
                                  </button>
                                )}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    item.category === "Contract" && "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5",
                                    item.category === "Compliance" && "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5",
                                    item.category === "Document" && "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5",
                                    item.category === "NDA" && "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5"
                                  )}
                                >
                                  {item.category}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 3: LEAVE MANAGEMENT — guarded */}
      {activeTab === "leaves" && (isManagerOrAdmin || can("applyLeave") || can("viewOwnLeaveStatus") || can("viewTeamLeave")) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <i className="fa-solid fa-magnifying-glass text-muted-foreground text-sm" />
              <Input
                placeholder="Search by employee name..."
                value={leaveSearchQuery}
                onChange={(e) => {
                  setLeaveSearchQuery(e.target.value);
                  setLeavePage(1);
                }}
                className="w-full sm:w-64 h-9"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <select
                value={leaveStatusFilter}
                onChange={(e) => {
                  setLeaveStatusFilter(e.target.value);
                  setLeavePage(1);
                }}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={leaveTypeFilter}
                onChange={(e) => {
                  setLeaveTypeFilter(e.target.value);
                  setLeavePage(1);
                }}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="Casual">Casual Leave</option>
                <option value="Sick">Sick Leave</option>
                <option value="Earned">Earned Leave</option>
                <option value="Unpaid">Unpaid Leave</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const filtered = leaves.filter((l) => {
                    const matchesSearch = !leaveSearchQuery || (l.userName && l.userName.toLowerCase().includes(leaveSearchQuery.toLowerCase()));
                    const matchesStatus = leaveStatusFilter === "All" || l.status === leaveStatusFilter;
                    const matchesType = leaveTypeFilter === "All" || l.type === leaveTypeFilter;
                    return matchesSearch && matchesStatus && matchesType;
                  });
                  handleExportAllLeaves(filtered);
                }}
                className="gap-1.5 cursor-pointer font-semibold text-xs text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/10"
              >
                <i className="fa-solid fa-file-excel text-xs" /> Export Data
              </Button>

              <Button color="primary" size="sm" onClick={() => setShowLeaveForm(true)} className="gap-1.5 cursor-pointer">
                <i className="fa-solid fa-plus text-xs" /> Request Time-Off
              </Button>
            </div>
          </div>

          {/* Leave Summary Cards — all dynamic from real leave records */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Casual Leave Taken</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {leaves.filter((l) => l.type === "Casual" && l.status === "Approved").length} Day(s)
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Sick Leave Taken</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">
                {leaves.filter((l) => l.type === "Sick" && l.status === "Approved").length} Day(s)
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Earned Leave Taken</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">
                {leaves.filter((l) => l.type === "Earned" && l.status === "Approved").length} Day(s)
              </p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Total Approved Leaves</p>
              <p className="text-2xl font-bold text-indigo-400 mt-1">
                {leaves.filter((l) => l.status === "Approved").length} Record(s)
              </p>
            </Card>
          </div>

          {/* Leave Records List */}
          {(() => {
            const filteredLeaves = leaves.filter((l) => {
              const matchesSearch = !leaveSearchQuery || (l.userName && l.userName.toLowerCase().includes(leaveSearchQuery.toLowerCase()));
              const matchesStatus = leaveStatusFilter === "All" || l.status === leaveStatusFilter;
              const matchesType = leaveTypeFilter === "All" || l.type === leaveTypeFilter;
              return matchesSearch && matchesStatus && matchesType;
            });

            const totalLeavePages = Math.ceil(filteredLeaves.length / leaveItemsPerPage) || 1;
            const currentPage = Math.min(leavePage, totalLeavePages);
            const paginatedLeaves = filteredLeaves.slice((currentPage - 1) * leaveItemsPerPage, currentPage * leaveItemsPerPage);

            return (
              <div className="space-y-3">
                {paginatedLeaves.map((l) => (
                  <Card key={l._id} className="hover:shadow-md transition-all">
                    <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm border border-primary/30 shrink-0">
                          {l.userName?.charAt(0) || "?"}
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap w-full">
                            <p className="font-bold text-sm text-foreground">{l.userName}</p>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <Badge color="primary" variant="soft">{l.type} Leave</Badge>
                              <Badge color={l.status === "Approved" ? "success" : l.status === "Rejected" ? "destructive" : "warning"}>
                                {l.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                              <i className="fa-solid fa-calendar-days text-xs text-primary" />
                              {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                            </p>
                            {l.status === "Approved" && (
                              <p className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 ml-auto">
                                <i className="fa-solid fa-circle-check text-xs" />
                                Approved {l.approverName ? `by ${l.approverName}` : "by Admin"}
                                {l.updatedAt ? ` on ${new Date(l.updatedAt).toLocaleDateString()} at ${new Date(l.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}` : ""}
                              </p>
                            )}
                            {l.status === "Rejected" && (
                              <p className="text-[11px] font-semibold text-rose-500 flex items-center gap-1 ml-auto">
                                <i className="fa-solid fa-circle-xmark text-xs" />
                                Declined {l.approverName ? `by ${l.approverName}` : "by Admin"}
                                {l.updatedAt ? ` on ${new Date(l.updatedAt).toLocaleDateString()} at ${new Date(l.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}` : ""}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground italic">"{l.reason}"</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLeaveDetails(l)}
                          className="gap-1.5 text-xs font-semibold cursor-pointer"
                        >
                          <i className="fa-solid fa-file-lines text-xs text-primary" /> Show Details
                        </Button>

                        {isManagerOrAdmin && l.status === "Pending" && (
                          <>
                            <Button size="sm" color="primary" onClick={() => handleApproveRejectLeave(l._id, "Approved")} className="gap-1 cursor-pointer">
                              <i className="fa-solid fa-circle-check text-xs" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleApproveRejectLeave(l._id, "Rejected")} className="gap-1 text-destructive cursor-pointer">
                              <i className="fa-solid fa-xmark text-xs" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredLeaves.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">
                    <i className="fa-solid fa-calendar-xmark text-4xl mb-2 text-muted-foreground/40 block" />
                    <p className="text-sm font-semibold text-foreground">No leave records found</p>
                  </div>
                )}

                {/* Pagination Controls Bar */}
                {filteredLeaves.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-card border border-border/80 rounded-xl shadow-2xs">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Showing</span>
                      <span className="font-bold text-foreground">
                        {Math.min((currentPage - 1) * leaveItemsPerPage + 1, filteredLeaves.length)} - {Math.min(currentPage * leaveItemsPerPage, filteredLeaves.length)}
                      </span>
                      <span>of</span>
                      <span className="font-bold text-foreground">{filteredLeaves.length} Records</span>

                      <div className="flex items-center gap-1.5 ml-4">
                        <span>Rows:</span>
                        <select
                          value={leaveItemsPerPage}
                          onChange={(e) => {
                            setLeaveItemsPerPage(Number(e.target.value));
                            setLeavePage(1);
                          }}
                          className="h-7 px-2 text-xs bg-background border border-border rounded text-foreground cursor-pointer font-semibold"
                        >
                          <option value={5}>5 per page</option>
                          <option value={10}>10 per page</option>
                          <option value={20}>20 per page</option>
                          <option value={50}>50 per page</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage === 1}
                        onClick={() => setLeavePage((prev) => Math.max(prev - 1, 1))}
                        className="h-8 text-xs gap-1 font-semibold cursor-pointer"
                      >
                        <i className="fa-solid fa-chevron-left text-[10px]" /> Previous
                      </Button>

                      <span className="text-xs font-semibold px-2 text-foreground font-mono">
                        Page {currentPage} of {totalLeavePages}
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage >= totalLeavePages}
                        onClick={() => setLeavePage((prev) => Math.min(prev + 1, totalLeavePages))}
                        className="h-8 text-xs gap-1 font-semibold cursor-pointer"
                      >
                        Next <i className="fa-solid fa-chevron-right text-[10px]" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: DOCUMENT VAULT — guarded */}
      {activeTab === "vault" && (isManagerOrAdmin || can("viewHRVault") || Boolean(user)) && (() => {
        const VAULT_CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; icon: string; accent: string }> = {
          "Contract":      { bg: "bg-amber-500/10",   text: "text-amber-600 dark:text-amber-400",   border: "border-amber-500/30",   icon: "fa-file-contract",         accent: "border-l-amber-500" },
          "NDA":           { bg: "bg-rose-500/10",    text: "text-rose-600 dark:text-rose-400",    border: "border-rose-500/30",    icon: "fa-file-shield",           accent: "border-l-rose-500" },
          "Offer Letter":  { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", icon: "fa-envelope-open-text",   accent: "border-l-emerald-500" },
          "Tax Document":  { bg: "bg-sky-500/10",     text: "text-sky-600 dark:text-sky-400",     border: "border-sky-500/30",     icon: "fa-file-invoice-dollar",  accent: "border-l-sky-500" },
          "KRA Agreement": { bg: "bg-violet-500/10",  text: "text-violet-600 dark:text-violet-400",  border: "border-violet-500/30",  icon: "fa-file-signature",       accent: "border-l-violet-500" },
          "Policy":        { bg: "bg-indigo-500/10",  text: "text-indigo-600 dark:text-indigo-400",  border: "border-indigo-500/30",  icon: "fa-book-open",            accent: "border-l-indigo-500" },
          "Document":      { bg: "bg-blue-500/10",    text: "text-blue-600 dark:text-blue-400",    border: "border-blue-500/30",    icon: "fa-id-card",              accent: "border-l-blue-500" },
          "Other":         { bg: "bg-muted",           text: "text-muted-foreground",               border: "border-border",          icon: "fa-file-lines",           accent: "border-l-muted-foreground" },
        };
        const getStyle = (cat: string) => VAULT_CATEGORY_COLORS[cat] || VAULT_CATEGORY_COLORS["Other"];

        const filtered = documents
          .filter((d) => {
            const q = vaultSearch.toLowerCase();
            const matchSearch = !q || d.title?.toLowerCase().includes(q) || d.targetUserName?.toLowerCase().includes(q) || d.uploadedBy?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q);
            const matchCat = vaultCategoryFilter === "All" || d.category === vaultCategoryFilter;
            return matchSearch && matchCat;
          })
          .sort((a, b) => {
            if (vaultSortOrder === "az") return (a.title || "").localeCompare(b.title || "");
            if (vaultSortOrder === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });

        const stats = [
          { label: "Total Docs", value: documents.length, icon: "fa-folder-open", color: "text-primary" },
          { label: "Contracts", value: documents.filter(d => d.category === "Contract").length, icon: "fa-file-contract", color: "text-amber-500" },
          { label: "NDAs", value: documents.filter(d => d.category === "NDA").length, icon: "fa-file-shield", color: "text-rose-500" },
          { label: "Restricted", value: documents.filter(d => d.isRestricted).length, icon: "fa-lock", color: "text-orange-500" },
        ];

        return (
          <div className="space-y-5">
            {/* === Vault Header === */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                    <i className="fa-solid fa-shield-halved text-sm" />
                  </span>
                  Secure Document Vault
                </h2>
                <p className="text-xs text-muted-foreground mt-1 ml-10">
                  Encrypted document store for NDAs, Contracts, Offer Letters, and compliance records.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUserUploadError("");
                    setUserUploadTitle("");
                    setUserUploadCategory("Contract");
                    setUserUploadFile(null);
                    setShowUserUploadModal(true);
                  }}
                  className="gap-2 font-semibold cursor-pointer border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                >
                  <i className="fa-solid fa-file-arrow-up text-xs" /> Upload My Document
                </Button>
                {isManagerOrAdmin && (
                  <Button color="primary" size="sm" onClick={() => setShowDocModal(true)} className="gap-2 font-semibold cursor-pointer">
                    <i className="fa-solid fa-plus text-xs" /> Add Document Record
                  </Button>
                )}
              </div>
            </div>

            {/* === Stats Bar === */}
            {documents.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center ${s.color} shrink-0`}>
                      <i className={`fa-solid ${s.icon} text-sm`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* === Search / Filter Bar === */}
            {documents.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-2 bg-muted/20 border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 flex-1 min-w-0 bg-background border border-border rounded-lg px-3 h-9">
                  <i className="fa-solid fa-magnifying-glass text-muted-foreground text-xs shrink-0" />
                  <input
                    type="text"
                    placeholder="Search documents by title, employee, category…"
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                  />
                  {vaultSearch && (
                    <button type="button" onClick={() => setVaultSearch("")} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0">
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={vaultCategoryFilter}
                    onChange={(e) => setVaultCategoryFilter(e.target.value)}
                    className="h-9 px-3 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="All">All Categories</option>
                    {["Contract","NDA","Offer Letter","Tax Document","KRA Agreement","Policy","Document","Other"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={vaultSortOrder}
                    onChange={(e) => setVaultSortOrder(e.target.value as any)}
                    className="h-9 px-3 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="az">A → Z</option>
                  </select>
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setVaultView("grid")}
                      className={`h-9 w-9 flex items-center justify-center text-xs transition-colors cursor-pointer ${
                        vaultView === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <i className="fa-solid fa-grip" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setVaultView("list")}
                      className={`h-9 w-9 flex items-center justify-center text-xs transition-colors cursor-pointer ${
                        vaultView === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <i className="fa-solid fa-list" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* === Document Cards / List === */}
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-muted/20 rounded-2xl border border-dashed border-border">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <i className="fa-solid fa-folder-open text-2xl text-primary/60" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">No documents in vault</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Upload your signed contract, NDA, or identity proof using the <span className="font-semibold text-emerald-500">Upload My Document</span> button.
                  </p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                <i className="fa-solid fa-magnifying-glass text-2xl text-muted-foreground" />
                <p className="text-sm font-semibold text-foreground">No matching documents</p>
                <p className="text-xs text-muted-foreground">Try adjusting your search or filter.</p>
                <button type="button" onClick={() => { setVaultSearch(""); setVaultCategoryFilter("All"); }} className="text-xs font-semibold text-primary hover:underline cursor-pointer">
                  Clear Filters
                </button>
              </div>
            ) : vaultView === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((doc) => {
                  const style = getStyle(doc.category);
                  const previewUrl = doc.fileUrl?.includes("?") ? `${doc.fileUrl}` : `${doc.fileUrl}`;
                  const dlUrl = doc.fileUrl?.includes("?") ? `${doc.fileUrl}&download=true` : `${doc.fileUrl}?download=true`;
                  return (
                    <div
                      key={doc._id}
                      className={cn(
                        "group relative flex flex-col rounded-2xl bg-card border border-border border-l-4 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden",
                        style.accent
                      )}
                    >
                      {/* Card Top */}
                      <div className="p-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105", style.bg, style.text, "border", style.border)}>
                            <i className={`fa-solid ${style.icon} text-sm`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">{doc.title}</h4>
                            <span className={cn("inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full", style.bg, style.text)}>
                              {doc.category}
                            </span>
                          </div>
                        </div>
                        {doc.isRestricted && (
                          <div title="Restricted — only visible to you and HR managers" className="shrink-0 w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                            <i className="fa-solid fa-lock text-[9px] text-amber-500" />
                          </div>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="px-4 pb-3 flex-1">
                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          {doc.targetUserName && (
                            <div className="flex items-center gap-1.5">
                              <i className="fa-solid fa-user text-[10px] text-primary/60" />
                              <span>For: <span className="font-semibold text-foreground">{doc.targetUserName}</span></span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <i className="fa-solid fa-circle-up text-[10px] text-primary/60" />
                            <span>By: <span className="font-medium text-foreground">{doc.uploadedBy}</span></span>
                          </div>
                          {doc.createdAt && (
                            <div className="flex items-center gap-1.5">
                              <i className="fa-solid fa-calendar text-[10px] text-primary/60" />
                              <span>{new Date(doc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="px-4 pb-4 pt-3 border-t border-border flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground mr-auto">
                          <i className="fa-solid fa-weight-hanging text-[10px]" />
                          {doc.fileSize || "—"}
                        </div>
                        <button
                          type="button"
                          onClick={() => window.open(previewUrl, "_blank")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                        >
                          <i className="fa-solid fa-eye text-[10px]" /> Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(dlUrl, "_blank")}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-white",
                            doc.category === "Contract" ? "bg-amber-600 hover:bg-amber-500" :
                            doc.category === "NDA" ? "bg-rose-600 hover:bg-rose-500" :
                            doc.category === "Offer Letter" ? "bg-emerald-600 hover:bg-emerald-500" :
                            "bg-primary hover:bg-primary/90"
                          )}
                        >
                          <i className="fa-solid fa-download text-[10px]" /> Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* === List View === */
              <div className="flex flex-col gap-2">
                {filtered.map((doc) => {
                  const style = getStyle(doc.category);
                  const previewUrl = doc.fileUrl;
                  const dlUrl = doc.fileUrl?.includes("?") ? `${doc.fileUrl}&download=true` : `${doc.fileUrl}?download=true`;
                  return (
                    <div
                      key={doc._id}
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-xl bg-card border border-border border-l-4 hover:shadow-sm transition-all",
                        style.accent
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", style.bg, style.text, "border", style.border)}>
                        <i className={`fa-solid ${style.icon} text-sm`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground line-clamp-1">{doc.title}</h4>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", style.bg, style.text)}>{doc.category}</span>
                          {doc.isRestricted && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <i className="fa-solid fa-lock text-[9px] mr-0.5" /> Restricted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          {doc.targetUserName && <span><i className="fa-solid fa-user mr-1 text-[9px]" />{doc.targetUserName}</span>}
                          <span><i className="fa-solid fa-circle-up mr-1 text-[9px]" />{doc.uploadedBy}</span>
                          {doc.createdAt && <span><i className="fa-solid fa-calendar mr-1 text-[9px]" />{new Date(doc.createdAt).toLocaleDateString()}</span>}
                          <span><i className="fa-solid fa-weight-hanging mr-1 text-[9px]" />{doc.fileSize || "—"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => window.open(previewUrl, "_blank")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                        >
                          <i className="fa-solid fa-eye text-[10px]" /> Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => window.open(dlUrl, "_blank")}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-white",
                            doc.category === "Contract" ? "bg-amber-600 hover:bg-amber-500" :
                            doc.category === "NDA" ? "bg-rose-600 hover:bg-rose-500" :
                            doc.category === "Offer Letter" ? "bg-emerald-600 hover:bg-emerald-500" :
                            "bg-primary hover:bg-primary/90"
                          )}
                        >
                          <i className="fa-solid fa-download text-[10px]" /> Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Results count */}
            {documents.length > 0 && filtered.length > 0 && (vaultSearch || vaultCategoryFilter !== "All") && (
              <p className="text-xs text-center text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filtered.length}</span> of <span className="font-semibold text-foreground">{documents.length}</span> documents
              </p>
            )}
          </div>
        );
      })()}


      {/* TAB 5: HELP DESK / CASES — guarded */}
      {activeTab === "cases" && (isManagerOrAdmin || can("viewHRCases") || can("createHRCases") || Boolean(user)) && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <i className="fa-solid fa-magnifying-glass text-muted-foreground text-sm" />
              <Input
                placeholder="Search cases by subject, user or ID..."
                value={caseSearchQuery}
                onChange={(e) => setCaseSearchQuery(e.target.value)}
                className="w-full sm:w-64 h-9"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <select
                value={caseCategoryFilter}
                onChange={(e) => setCaseCategoryFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground"
              >
                <option value="All">All Categories</option>
                <option value="Payroll">Payroll</option>
                <option value="IT Access">IT Access</option>
                <option value="Policy Query">Policy Query</option>
                <option value="Benefits">Benefits</option>
                <option value="Ask your Manager">Ask your Manager</option>
                <option value="Other">Other</option>
              </select>

              <select
                value={caseStatusFilter}
                onChange={(e) => setCaseStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground"
              >
                <option value="All">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>

              <Button color="primary" size="sm" onClick={() => setShowCaseForm(true)} className="gap-1.5 cursor-pointer font-semibold">
                <i className="fa-solid fa-ticket text-xs" /> Raise HR Ticket
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {cases
              .filter((c) => {
                const matchesSearch =
                  !caseSearchQuery ||
                  (c.subject && c.subject.toLowerCase().includes(caseSearchQuery.toLowerCase())) ||
                  (c.userName && c.userName.toLowerCase().includes(caseSearchQuery.toLowerCase())) ||
                  (c.description && c.description.toLowerCase().includes(caseSearchQuery.toLowerCase()));
                const matchesCategory = caseCategoryFilter === "All" || c.category === caseCategoryFilter;
                const matchesStatus = caseStatusFilter === "All" || c.status === caseStatusFilter;
                return matchesSearch && matchesCategory && matchesStatus;
              })
              .map((c) => (
                <Card
                  key={c._id}
                  className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-sky-500"
                  onClick={() => setSelectedCase(c)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-foreground">{c.subject}</p>
                          <Badge color={c.category === "Ask your Manager" ? "primary" : "default"} variant="soft">
                            {c.category}
                          </Badge>
                          <Badge
                            color={
                              c.status === "Open"
                                ? "warning"
                                : c.status === "In Progress"
                                ? "info"
                                : c.status === "Resolved"
                                ? "success"
                                : "default"
                            }
                          >
                            {c.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {c.priority} Priority
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Submitted by <span className="font-semibold text-foreground">{c.userName}</span> • {new Date(c.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-foreground/80 line-clamp-2">{c.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg border border-border/60">
                        <i className="fa-solid fa-message text-primary text-xs" />
                        <span className="text-xs font-bold text-foreground">{c.comments?.length || 0}</span>
                        <i className="fa-solid fa-chevron-right text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

            {cases.filter((c) => {
              const matchesSearch =
                !caseSearchQuery ||
                (c.subject && c.subject.toLowerCase().includes(caseSearchQuery.toLowerCase())) ||
                (c.userName && c.userName.toLowerCase().includes(caseSearchQuery.toLowerCase())) ||
                (c.description && c.description.toLowerCase().includes(caseSearchQuery.toLowerCase()));
              const matchesCategory = caseCategoryFilter === "All" || c.category === caseCategoryFilter;
              const matchesStatus = caseStatusFilter === "All" || c.status === caseStatusFilter;
              return matchesSearch && matchesCategory && matchesStatus;
            }).length === 0 && (
              <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">
                <i className="fa-solid fa-circle-question text-4xl mb-2 text-sky-500/40 block" />
                <p className="text-sm font-semibold text-foreground">No Help Desk cases found</p>
                <p className="text-xs text-muted-foreground mt-1">Submit a new query or adjust your filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: APPRAISALS & KRAS — guarded */}
      {activeTab === "appraisals" && (isManagerOrAdmin || can("viewAppraisals") || Boolean(user)) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Competency reviews, Key Result Areas (KRAs), and self/manager performance scoring.</p>
            {isManagerOrAdmin && (
              <Button color="primary" size="sm" onClick={() => setShowAppraisalModal(true)} className="gap-1">
                <i className="fa-solid fa-plus text-xs" /> Init Appraisal Cycle
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appraisals.map((app) => (
              <Card key={app._id} className="p-5 space-y-4 hover:shadow-md transition-all cursor-pointer" onClick={() => setSelectedAppraisal(app)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground">{app.userName}</h3>
                    <p className="text-xs text-muted-foreground">{app.cycle} • {app.type}</p>
                  </div>
                  <Badge color={app.status === "Finalized" ? "success" : app.status === "Self Review Submitted" ? "info" : "warning"}>
                    {app.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-muted/20 p-3 rounded-lg text-center text-xs">
                  <div>
                    <p className="text-muted-foreground">Self Score</p>
                    <p className="font-bold text-sm text-foreground">{app.overallSelfRating || 0} / 5</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Manager Score</p>
                    <p className="font-bold text-sm text-foreground">{app.overallManagerRating || 0} / 5</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Final Rating</p>
                    <p className="font-bold text-sm text-primary">{app.finalRating || 0} / 5</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: PROBATION & REVIEW CYCLE — guarded */}
      {activeTab === "probation" && (isManagerOrAdmin || can("viewProbation") || Boolean(user)) && (
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <i className="fa-solid fa-clock text-sky-500 text-base" /> Automated Probation & Review Timeline
            </h3>
            <p className="text-xs text-muted-foreground">
              Flags employees with upcoming 90-day probation end dates or annual review cycles based on their initial join date.
            </p>

            <div className="space-y-3">
              {probationUsers.map((pu) => (
                <div key={pu._id} className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-foreground">{pu.name}</p>
                      <Badge variant="outline">{pu.role}</Badge>
                      {pu.isUpcoming && <Badge color="warning">Probation Review Due Soon</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Joined: {pu.joinDate.toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-foreground">90-Day Probation End:</p>
                    <p className="text-xs text-primary font-bold">{pu.probationEnd.toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 8: HR SANDBOX */}
      {activeTab === "sandbox" && isManagerOrAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Test & preview custom HR forms and leave policies in a sandbox prior to live release.</p>
            <Button color="primary" size="sm" onClick={() => setShowSandboxModal(true)} className="gap-1">
              <i className="fa-solid fa-plus text-xs" /> Create Test Workflow
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sandboxItems.map((sb) => (
              <Card key={sb._id} className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-foreground">{sb.name}</h4>
                  <Badge variant="outline">{sb.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{sb.workflowType}</p>
                <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-2 text-xs">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-sliders text-primary text-[11px]" /> Rule Settings:
                  </p>
                  {(() => {
                    try {
                      const parsed = JSON.parse(sb.configJson);
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(parsed).map(([key, val]) => (
                            <div key={key} className="bg-card p-2 rounded border border-border/60">
                              <p className="text-[10px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                              <p className="font-bold text-sm text-foreground">{String(val)}</p>
                            </div>
                          ))}
                        </div>
                      );
                    } catch {
                      return <p className="text-muted-foreground italic font-mono">{sb.configJson}</p>;
                    }
                  })()}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Leave Modal */}
      {showLeaveForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowLeaveForm(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-foreground">Request Leave</h3>
            <form onSubmit={handleSubmitLeave} className="space-y-3">
              <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md">
                {["Casual", "Sick", "Earned", "Unpaid", "Maternity", "Paternity"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <Input type="date" value={leaveStart} onChange={(e) => setLeaveStart(e.target.value)} required />
                <Input type="date" value={leaveEnd} onChange={(e) => setLeaveEnd(e.target.value)} required />
              </div>
              <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} rows={3} required placeholder="Reason..." className="w-full p-2 text-sm bg-background border border-border rounded-md" />
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowLeaveForm(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Submit Request</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Ticket / Case Modal */}
      {showCaseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowCaseForm(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-ticket text-sky-500 text-base" /> Raise New Ticket / HR Query
              </h3>
              <button onClick={() => setShowCaseForm(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleSubmitCase} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Category / Target</label>
                  <select
                    value={caseCategory}
                    onChange={(e) => setCaseCategory(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Payroll">Payroll & Compensation</option>
                    <option value="IT Access">IT Hardware & Access</option>
                    <option value="Policy Query">Company Policy Query</option>
                    <option value="Benefits">Health & Benefits</option>
                    <option value="Ask your Manager">Direct to My Manager</option>
                    <option value="Other">General HR Inquiry</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    value={casePriority}
                    onChange={(e) => setCasePriority(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority (Urgent)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Ticket Subject *</label>
                <Input
                  value={caseSubject}
                  onChange={(e) => setCaseSubject(e.target.value)}
                  required
                  placeholder="e.g. Need VPN credentials reset or Payroll query for June"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Detailed Description *</label>
                <textarea
                  value={caseDesc}
                  onChange={(e) => setCaseDesc(e.target.value)}
                  rows={4}
                  required
                  placeholder="Provide all relevant details, error codes, or context to help HR assist you..."
                  className="w-full p-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCaseForm(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="gap-1.5 cursor-pointer font-semibold">
                  <i className="fa-solid fa-paper-plane text-xs" /> Submit Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checklist Creation Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowChecklistModal(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-clipboard-check text-emerald-500 text-base" /> Start Onboarding / Offboarding
              </h3>
              <button onClick={() => setShowChecklistModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleCreateChecklist} className="space-y-4">
              {/* Employee Mode Switcher Tabs */}
              <div className="flex rounded-lg bg-muted/60 p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateNewEmployeeMode(false)}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    !isCreateNewEmployeeMode ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <i className="fa-solid fa-users text-xs" /> Existing Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateNewEmployeeMode(true);
                    setNewChecklistEmploymentType("Contractor");
                  }}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5",
                    isCreateNewEmployeeMode ? "bg-background text-foreground shadow-xs text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <i className="fa-solid fa-user-plus text-xs" /> New Contract Employee
                </button>
              </div>

              {!isCreateNewEmployeeMode ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Select Employee</label>
                  <select
                    value={newChecklistUserId}
                    onChange={(e) => {
                      const uId = e.target.value;
                      setNewChecklistUserId(uId);
                      const selectedUser = directoryUsers.find((u) => u._id === uId);
                      if (selectedUser?.employmentType) {
                        setNewChecklistEmploymentType(selectedUser.employmentType);
                      }
                    }}
                    required={!isCreateNewEmployeeMode}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Employee...</option>
                    {directoryUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email}) — {u.employmentType || "Permanent"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 p-3.5 bg-primary/5 border border-primary/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <i className="fa-solid fa-id-badge text-xs" /> Employee Identity (Added to My Team)
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                      Auto-provisioned
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-foreground">Full Name *</label>
                      <Input
                        placeholder="e.g. Alex Morgan"
                        value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                        required={isCreateNewEmployeeMode}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-foreground">Email Address *</label>
                      <Input
                        type="email"
                        placeholder="e.g. alex@contractor.com"
                        value={newEmpEmail}
                        onChange={(e) => setNewEmpEmail(e.target.value)}
                        required={isCreateNewEmployeeMode}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">Department</label>
                    <select
                      value={newEmpDepartment}
                      onChange={(e) => setNewEmpDepartment(e.target.value)}
                      className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {Array.from(new Set(["Engineering", "Design", "Marketing", "Sales", "Operations", ...directoryUsers.map((u) => u.department).filter(Boolean)])).map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Checklist Type</label>
                  <select
                    value={newChecklistType}
                    onChange={(e) => setNewChecklistType(e.target.value as any)}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Onboarding">Onboarding Checklist</option>
                    <option value="Offboarding">Offboarding Checklist</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Employment Type</label>
                  <select
                    value={newChecklistEmploymentType}
                    onChange={(e) => setNewChecklistEmploymentType(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Contractor">Contractor (Independent)</option>
                    <option value="Freelancer">Freelancer</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Intern">Intern</option>
                    <option value="Permanent">Permanent (Full-time)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Target Completion Due Date (Optional)</label>
                <Input
                  type="date"
                  value={newChecklistDueDate}
                  onChange={(e) => setNewChecklistDueDate(e.target.value)}
                  className="w-full h-9 text-xs"
                />
              </div>

              {/* Contract Metadata Section - displayed for Contractor, Freelancer, Part-Time, Intern */}
              {["Contractor", "Freelancer", "Part-Time", "Intern"].includes(newChecklistEmploymentType) && (
                <div className="p-3.5 bg-muted/30 border border-amber-500/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <i className="fa-solid fa-file-contract text-xs" /> Contract Terms & Details
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Optional</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Contract Start Date</label>
                      <Input
                        type="date"
                        value={contractStartDate}
                        onChange={(e) => setContractStartDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Contract End Date</label>
                      <Input
                        type="date"
                        value={contractEndDate}
                        onChange={(e) => setContractEndDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Currency</label>
                      <select
                        value={contractCurrency}
                        onChange={(e) => setContractCurrency(e.target.value)}
                        className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="AUD">AUD ($)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Hourly Rate</label>
                      <Input
                        type="number"
                        placeholder="e.g. 50"
                        value={contractHourlyRate}
                        onChange={(e) => setContractHourlyRate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Daily Rate</label>
                      <Input
                        type="number"
                        placeholder="e.g. 400"
                        value={contractDailyRate}
                        onChange={(e) => setContractDailyRate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">SOW / Contract Ref</label>
                      <Input
                        placeholder="e.g. SOW-2026-081"
                        value={contractSowRef}
                        onChange={(e) => setContractSowRef(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-muted-foreground">Billing Cycle</label>
                      <select
                        value={contractBillingCycle}
                        onChange={(e) => setContractBillingCycle(e.target.value)}
                        className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="Hourly">Hourly</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Milestone">Milestone</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Attach Onboarding Documents (Offer Letter & NDA) */}
              <div className="p-3.5 bg-sky-500/5 border border-sky-500/25 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <i className="fa-solid fa-paperclip text-xs" /> Attach Onboarding Documents
                  </span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full font-medium">
                    Smooth Onboarding
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Pre-attach the official Offer Letter / Contract and NDA so the employee can review, download, and sign them immediately upon login.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Offer Letter / Agreement */}
                  <div className="space-y-1.5 p-2.5 bg-background border border-border rounded-lg">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-file-contract text-amber-500 text-xs" />
                      Offer Letter / Contract
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setInitOfferLetterFile(e.target.files?.[0] || null)}
                      className="text-[11px] w-full file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-amber-500/10 file:text-amber-600 hover:file:bg-amber-500/20 cursor-pointer"
                    />
                    {initOfferLetterFile && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 pt-0.5">
                        <span className="truncate max-w-[170px] flex items-center gap-1 font-medium">
                          <i className="fa-solid fa-circle-check text-[10px]" /> {initOfferLetterFile.name}
                        </span>
                        <button type="button" onClick={() => setInitOfferLetterFile(null)} className="text-muted-foreground hover:text-destructive text-xs cursor-pointer">
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Non-Disclosure Agreement (NDA) */}
                  <div className="space-y-1.5 p-2.5 bg-background border border-border rounded-lg">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-shield-halved text-purple-500 text-xs" />
                      NDA Document
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setInitNdaFile(e.target.files?.[0] || null)}
                      className="text-[11px] w-full file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-purple-500/10 file:text-purple-600 hover:file:bg-purple-500/20 cursor-pointer"
                    />
                    {initNdaFile && (
                      <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 pt-0.5">
                        <span className="truncate max-w-[170px] flex items-center gap-1 font-medium">
                          <i className="fa-solid fa-circle-check text-[10px]" /> {initNdaFile.name}
                        </span>
                        <button type="button" onClick={() => setInitNdaFile(null)} className="text-muted-foreground hover:text-destructive text-xs cursor-pointer">
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview hint of default checklist items */}
              <div className="p-2.5 bg-muted/20 border border-border rounded-lg text-[11px] text-muted-foreground flex items-start gap-2">
                <i className="fa-solid fa-info-circle text-primary mt-0.5" />
                <span>
                  Default items tailored for <strong className="text-foreground">{newChecklistEmploymentType}</strong> will be generated automatically upon initialization.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" disabled={isCreatingChecklist} onClick={() => setShowChecklistModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" disabled={isCreatingChecklist} className="cursor-pointer gap-1.5">
                  {isCreatingChecklist ? (
                    <>
                      <i className="fa-solid fa-circle-notch animate-spin text-xs" /> Uploading & Initializing...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs" /> Initialize Checklist
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract & Checklist Tasks Inspector Modal */}
      {selectedChecklistDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedChecklistDetails(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm uppercase">
                  {selectedChecklistDetails.userName?.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base text-foreground">{selectedChecklistDetails.userName}</h3>
                    <Badge color={selectedChecklistDetails.type === "Onboarding" ? "primary" : "destructive"}>
                      {selectedChecklistDetails.type}
                    </Badge>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border", EMPLOYMENT_TYPE_CONFIG[selectedChecklistDetails.employmentType || "Permanent"]?.badge)}>
                      <i className={cn(EMPLOYMENT_TYPE_CONFIG[selectedChecklistDetails.employmentType || "Permanent"]?.icon, "text-[10px]")} />
                      {selectedChecklistDetails.employmentType || "Permanent"}
                    </span>
                    <Badge variant="outline">{selectedChecklistDetails.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedChecklistDetails.userEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChecklistDetails(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Contract metadata strip if present */}
            {selectedChecklistDetails.contractDetails && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-muted/40 border border-border/80 rounded-xl p-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">SOW / Ref:</span>
                  <span className="font-semibold text-foreground">{selectedChecklistDetails.contractDetails.sowReference || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Period:</span>
                  <span className="font-medium text-foreground">
                    {selectedChecklistDetails.contractDetails.contractStartDate ? new Date(selectedChecklistDetails.contractDetails.contractStartDate).toLocaleDateString() : "Immediate"} -{" "}
                    {selectedChecklistDetails.contractDetails.contractEndDate ? new Date(selectedChecklistDetails.contractDetails.contractEndDate).toLocaleDateString() : "Ongoing"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Rate / Value:</span>
                  <span className="font-semibold text-foreground">
                    {selectedChecklistDetails.contractDetails.hourlyRate
                      ? `${selectedChecklistDetails.contractDetails.currency || "$"} ${selectedChecklistDetails.contractDetails.hourlyRate}/hr`
                      : selectedChecklistDetails.contractDetails.dailyRate
                      ? `${selectedChecklistDetails.contractDetails.currency || "$"} ${selectedChecklistDetails.contractDetails.dailyRate}/day`
                      : "Standard"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Billing:</span>
                  <span className="font-medium text-foreground">{selectedChecklistDetails.contractDetails.billingCycle || "Monthly"}</span>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {(() => {
              const done = selectedChecklistDetails.items?.filter((i: any) => i.completed).length || 0;
              const total = selectedChecklistDetails.items?.length || 1;
              const pct = Math.round((done / total) * 100);
              return (
                <div className="space-y-1.5 bg-card border border-border rounded-xl p-3">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">Checklist Tasks</span>
                    <span className="text-muted-foreground">{done} of {total} completed ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Items Checkoff List */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workflow Items</label>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {selectedChecklistDetails.items?.map((item: any) => {
                  const isDocItem = ["Document", "Contract", "NDA", "Compliance"].includes(item.category);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.documentUrl) {
                          setPreviewModalDoc({
                            title: item.title,
                            fileName: item.documentName || "Document",
                            url: item.documentUrl,
                            submittedBy: item.completedBy,
                            submittedAt: item.completedAt,
                            category: item.category,
                          });
                        } else if (!item.completed && isDocItem) {
                          openChecklistUploadModal(selectedChecklistDetails, item);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all",
                        item.completed ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-card border-border hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleChecklistItem(selectedChecklistDetails._id, item.id, !item.completed);
                          }}
                          className="rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className={cn("font-medium block", item.completed && "line-through opacity-80")}>{item.title}</span>
                          {item.completedAt && (
                            <span className="text-[10px] opacity-70 block mt-0.5">
                              Completed {new Date(item.completedAt).toLocaleDateString()} by {item.completedBy || "HR"}
                            </span>
                          )}
                          {item.documentUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewModalDoc({
                                  title: item.title,
                                  fileName: item.documentName || "Document",
                                  url: item.documentUrl,
                                  submittedBy: item.completedBy,
                                  submittedAt: item.completedAt,
                                  category: item.category,
                                });
                              }}
                              className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                              title="Click to view submitted document"
                            >
                              <i className="fa-solid fa-paperclip text-[10px]" />
                              <span className="truncate max-w-[200px]">{item.documentName || "View Attached Document"}</span>
                              <i className="fa-solid fa-eye text-[9px] opacity-80 ml-0.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.documentUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewModalDoc({
                                title: item.title,
                                fileName: item.documentName || "Document",
                                url: item.documentUrl,
                                submittedBy: item.completedBy,
                                submittedAt: item.completedAt,
                                category: item.category,
                              });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-400 border border-sky-500/30 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                            title="Show / view submitted document"
                          >
                            <i className="fa-solid fa-eye text-xs" />
                            <span>Show</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openChecklistUploadModal(selectedChecklistDetails, item);
                          }}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer shadow-xs",
                            item.documentUrl
                              ? "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
                              : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          )}
                          title={item.documentUrl ? "Attach updated document or replace file" : "Attach document"}
                        >
                          <i className={cn("fa-solid", item.documentUrl ? "fa-paperclip" : "fa-cloud-arrow-up")} />
                          <span>{item.documentUrl ? "Replace" : "Attach"}</span>
                        </button>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            item.category === "Contract" && "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5",
                            item.category === "Compliance" && "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/5",
                            item.category === "Document" && "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5",
                            item.category === "NDA" && "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5"
                          )}
                        >
                          {item.category}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" size="sm" type="button" onClick={() => setSelectedChecklistDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowDocModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-emerald-500 text-base" /> Upload to Document Vault
              </h3>
              <button onClick={() => setShowDocModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleCreateDocument} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Document Title</label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required placeholder="Document Title (e.g. NDA Agreement)" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Category</label>
                <select value={docCategory} onChange={(e) => setDocCategory(e.target.value as any)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  {["Offer Letter", "NDA", "KRA Agreement", "Policy", "Tax Document", "Contract", "Document", "Other"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">File Link / URL</label>
                <Input value={docFileUrl} onChange={(e) => setDocFileUrl(e.target.value)} required placeholder="File URL / Cloud Link" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Target Employee (Optional)</label>
                <select value={docTargetUserId} onChange={(e) => setDocTargetUserId(e.target.value)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Restricted to Specific Employee (Optional)...</option>
                  {directoryUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" checked={docIsRestricted} onChange={(e) => setDocIsRestricted(e.target.checked)} id="restr" className="rounded border-border text-primary focus:ring-primary" />
                <label htmlFor="restr" className="text-xs text-foreground cursor-pointer">Restrict access to target employee & HR managers</label>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowDocModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" className="cursor-pointer">Save Document</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Self-Upload Modal */}
      {showUserUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => { if (!userUploading) setShowUserUploadModal(false); }}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl animate-in zoom-in-95 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-emerald-500/5">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <i className="fa-solid fa-file-arrow-up text-emerald-500 text-sm" />
                </span>
                Upload My Document
              </h3>
              <button
                onClick={() => { if (!userUploading) setShowUserUploadModal(false); }}
                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                disabled={userUploading}
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleUserUploadDocument} className="p-6 space-y-4">
              {/* Intro */}
              <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border">
                <i className="fa-solid fa-circle-info text-primary mr-1.5" />
                Your document will be securely stored and only visible to you and HR Managers.
              </p>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Document Title <span className="text-rose-500">*</span></label>
                <Input
                  value={userUploadTitle}
                  onChange={(e) => setUserUploadTitle(e.target.value)}
                  required
                  placeholder="e.g. Signed Employment Contract — Sep 2026"
                  disabled={userUploading}
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Document Category</label>
                <select
                  value={userUploadCategory}
                  onChange={(e) => setUserUploadCategory(e.target.value)}
                  disabled={userUploading}
                  className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Contract">Contract</option>
                  <option value="NDA">NDA</option>
                  <option value="Document">Document / ID Proof</option>
                  <option value="Tax Document">Tax Document</option>
                  <option value="Policy">Policy Acknowledgement</option>
                  <option value="Offer Letter">Offer Letter</option>
                  <option value="KRA Agreement">KRA Agreement</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* File Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">File <span className="text-rose-500">*</span></label>
                <label
                  className={`flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors py-7 ${
                    userUploadFile
                      ? "border-emerald-500/50 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                      : "border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground"
                  } ${userUploading ? "pointer-events-none opacity-60" : ""}`}
                >
                  <i className={`fa-solid text-2xl ${userUploadFile ? "fa-file-circle-check" : "fa-cloud-arrow-up"}`} />
                  {userUploadFile ? (
                    <>
                      <span className="text-sm font-semibold line-clamp-1 px-4 text-center">{userUploadFile.name}</span>
                      <span className="text-xs">{(userUploadFile.size / 1024).toFixed(1)} KB — click to change</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium">Click to select file</span>
                      <span className="text-xs">PDF, DOCX, DOC, PNG, JPG — max 25 MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.txt,.xlsx,.svg,.webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setUserUploadFile(f);
                      setUserUploadError("");
                    }}
                    disabled={userUploading}
                  />
                </label>
              </div>

              {/* Error */}
              {userUploadError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-600 dark:text-red-400">
                  <i className="fa-solid fa-circle-exclamation mt-0.5 shrink-0" />
                  <span>{userUploadError}</span>
                </div>
              )}

              {/* Upload progress */}
              {userUploadProgress && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
                  <i className="fa-solid fa-circle-notch animate-spin text-primary text-sm" />
                  <span className="text-xs text-primary font-medium">Uploading securely…</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowUserUploadModal(false)}
                  disabled={userUploading}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  type="submit"
                  disabled={userUploading || !userUploadFile}
                  className="gap-2 cursor-pointer"
                >
                  {userUploading ? (
                    <>
                      <i className="fa-solid fa-circle-notch animate-spin text-xs" /> Uploading…
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-shield-halved text-xs" /> Upload Securely
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checklist Task Document Upload Modal */}
      {checklistDocModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => { if (!checklistUploading) setChecklistDocModal(null); }}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <i className="fa-solid fa-file-arrow-up text-base" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Upload Task Document</h3>
                  <p className="text-xs text-muted-foreground">Attach file and complete checklist workflow item</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { if (!checklistUploading) setChecklistDocModal(null); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Task Info Pill */}
            <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold">Workflow Item</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary border border-primary/20">
                  {checklistDocModal.item?.category || "Document"}
                </span>
              </div>
              <p className="font-semibold text-foreground text-sm">{checklistDocModal.item?.title}</p>
              {checklistDocModal.targetUserName && (
                <p className="text-[11px] text-muted-foreground">
                  Assigned Employee: <span className="font-medium text-foreground">{checklistDocModal.targetUserName}</span>
                </p>
              )}
            </div>

            <form onSubmit={handleChecklistUploadSubmit} className="space-y-4">
              {/* File Drop Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Select Document File <span className="text-destructive">*</span>
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-5 cursor-pointer bg-muted/20 hover:bg-muted/40 transition-all">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setChecklistUploadFile(e.target.files[0]);
                        setChecklistUploadError("");
                      }
                    }}
                  />
                  {checklistUploadFile ? (
                    <div className="flex items-center gap-3 text-left w-full">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                        <i className="fa-solid fa-circle-check text-lg" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground text-xs truncate">{checklistUploadFile.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {(checklistUploadFile.size / 1024 / 1024).toFixed(2)} MB • Click to change
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setChecklistUploadFile(null);
                        }}
                        className="text-xs text-destructive hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-1">
                      <i className="fa-solid fa-cloud-arrow-up text-2xl text-muted-foreground mb-1 block" />
                      <p className="text-xs font-semibold text-foreground">Click to browse or drag file here</p>
                      <p className="text-[11px] text-muted-foreground">Supports PDF, DOCX, DOC, JPG, PNG (Max 25 MB)</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Title Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Document Title</label>
                <Input
                  value={checklistUploadTitle}
                  onChange={(e) => setChecklistUploadTitle(e.target.value)}
                  required
                  placeholder="e.g. Identity Proof - Aadhaar / Passport"
                  className="h-9 text-xs"
                />
              </div>

              {/* Category Select */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Vault Category</label>
                <select
                  value={checklistUploadCategory}
                  onChange={(e) => setChecklistUploadCategory(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {["Offer Letter", "NDA", "KRA Agreement", "Policy", "Tax Document", "Contract", "Document", "Other"].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {checklistUploadError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation shrink-0" />
                  <span>{checklistUploadError}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleChecklistCompleteWithoutDoc}
                  disabled={checklistUploading}
                  className="text-xs text-muted-foreground hover:text-foreground w-full sm:w-auto"
                >
                  Mark Complete without File
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { if (!checklistUploading) setChecklistDocModal(null); }}
                    disabled={checklistUploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    color="primary"
                    size="sm"
                    disabled={checklistUploading || !checklistUploadFile}
                    className="gap-1.5"
                  >
                    {checklistUploading ? (
                      <>
                        <i className="fa-solid fa-circle-notch animate-spin text-xs" /> Uploading…
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check text-xs" /> Upload & Complete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appraisal Initialization Modal */}
      {showAppraisalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowAppraisalModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-award text-indigo-500 text-base" /> Initialize Appraisal Cycle
              </h3>
              <button onClick={() => setShowAppraisalModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleCreateAppraisal} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Employee</label>
                <select value={appraisalUserId} onChange={(e) => setAppraisalUserId(e.target.value)} required className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select Employee...</option>
                  {directoryUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Cycle Name</label>
                <Input value={appraisalCycle} onChange={(e) => setAppraisalCycle(e.target.value)} required placeholder="Cycle (e.g. 2026 Q2 Review)" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Review Type</label>
                <select value={appraisalType} onChange={(e) => setAppraisalType(e.target.value as any)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="Quarterly Appraisal">Quarterly Appraisal</option>
                  <option value="Probation Review">Probation Review</option>
                  <option value="Annual Review">Annual Review</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowAppraisalModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" className="cursor-pointer">Start Review Cycle</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HR Sandbox Modal */}
      {showSandboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowSandboxModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-sliders text-purple-500 text-base" /> Create Sandbox Workflow
              </h3>
              <button onClick={() => setShowSandboxModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleCreateSandbox} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Workflow Name</label>
                <Input value={sandboxName} onChange={(e) => setSandboxName(e.target.value)} required placeholder="Workflow Name (e.g. Test Maternity Policy)" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Workflow Category</label>
                <select value={sandboxWorkflowType} onChange={(e) => setSandboxWorkflowType(e.target.value as any)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  {["Leave Policy", "Onboarding Flow", "Appraisal Scale", "Help Desk Auto-Routing"].map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Annual Leave Cap (Days)</label>
                  <Input
                    type="number"
                    value={(() => {
                      try { return JSON.parse(sandboxConfig).maxAnnualDays || 24; } catch { return 24; }
                    })()}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      try {
                        const parsed = JSON.parse(sandboxConfig || "{}");
                        parsed.maxAnnualDays = val;
                        setSandboxConfig(JSON.stringify(parsed, null, 2));
                      } catch {
                        setSandboxConfig(JSON.stringify({ maxAnnualDays: val, autoApproveSickDays: 2 }, null, 2));
                      }
                    }}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Auto-Approve Sick Limit</label>
                  <Input
                    type="number"
                    value={(() => {
                      try { return JSON.parse(sandboxConfig).autoApproveSickDays || 2; } catch { return 2; }
                    })()}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      try {
                        const parsed = JSON.parse(sandboxConfig || "{}");
                        parsed.autoApproveSickDays = val;
                        setSandboxConfig(JSON.stringify(parsed, null, 2));
                      } catch {
                        setSandboxConfig(JSON.stringify({ maxAnnualDays: 24, autoApproveSickDays: val }, null, 2));
                      }
                    }}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowSandboxModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" className="cursor-pointer">Save Sandbox Item</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setSelectedCase(null)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground">{selectedCase.subject}</h3>
                <p className="text-xs text-muted-foreground">{selectedCase.category} • {selectedCase.userName}</p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-sm" /></button>
            </div>
            <p className="text-sm text-foreground">{selectedCase.description}</p>
            {isManagerOrAdmin && selectedCase.status !== "Closed" && (
              <div className="flex gap-2 border-t border-border pt-3">
                {selectedCase.status === "Open" && (
                  <Button size="sm" variant="outline" onClick={() => handleUpdateCaseStatus(selectedCase._id, "In Progress")}>Mark In Progress</Button>
                )}
                {(selectedCase.status === "Open" || selectedCase.status === "In Progress") && (
                  <Button size="sm" color="primary" onClick={() => handleUpdateCaseStatus(selectedCase._id, "Resolved")}>Resolve</Button>
                )}
              </div>
            )}
            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs font-semibold text-foreground">Comments ({selectedCase.comments?.length || 0})</p>
              {selectedCase.comments?.map((c: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{c.userName}</span>
                    <span className="text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-foreground">{c.content}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="flex-1" />
                <Button size="sm" color="primary" onClick={() => handleAddComment(selectedCase._id)} disabled={!commentText.trim()}>Send</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appraisal Detail / Review Modal */}
      {selectedAppraisal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setSelectedAppraisal(null)}>
          <div className="w-full max-w-xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground">{selectedAppraisal.userName}</h3>
                <p className="text-xs text-muted-foreground">{selectedAppraisal.cycle} • {selectedAppraisal.type}</p>
              </div>
              <button onClick={() => setSelectedAppraisal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-sm" /></button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Key Result Areas (KRAs) & Scoring</p>
              {selectedAppraisal.kras?.map((kra: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg border border-border bg-muted/10 space-y-2 text-xs">
                  <p className="font-bold text-foreground">{kra.kraTitle} ({kra.weightagePercentage}%)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-muted-foreground">Self Score (0-5)</label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        value={kra.selfScore}
                        onChange={(e) => {
                          const updated = [...selectedAppraisal.kras];
                          updated[idx].selfScore = Number(e.target.value);
                          setSelectedAppraisal({ ...selectedAppraisal, kras: updated });
                        }}
                        disabled={selectedAppraisal.status === "Finalized"}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <label className="text-muted-foreground">Manager Score (0-5)</label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        value={kra.managerScore}
                        onChange={(e) => {
                          const updated = [...selectedAppraisal.kras];
                          updated[idx].managerScore = Number(e.target.value);
                          setSelectedAppraisal({ ...selectedAppraisal, kras: updated });
                        }}
                        disabled={!isManagerOrAdmin || selectedAppraisal.status === "Finalized"}
                        className="h-8"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              {selectedAppraisal.status !== "Finalized" && (
                <Button variant="outline" size="sm" onClick={() => handleSaveAppraisal("submit_self_review")}>
                  Submit Self Review
                </Button>
              )}
              {isManagerOrAdmin && selectedAppraisal.status !== "Finalized" && (
                <Button color="primary" size="sm" onClick={() => handleSaveAppraisal("submit_manager_review")}>
                  Finalize Manager Review
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Record Details Popup Modal */}
      {selectedLeaveDetails && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedLeaveDetails(null)}
        >
          <div
            className={cn(
              "w-full max-w-lg bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-5 relative overflow-hidden transition-all",
              selectedLeaveDetails.status === "Approved" ? "border-t-4 border-t-emerald-500" : selectedLeaveDetails.status === "Rejected" ? "border-t-4 border-t-rose-500" : "border-t-4 border-t-amber-500"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-sm border border-primary/30 shrink-0">
                  {selectedLeaveDetails.userName?.charAt(0) || "?"}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    {selectedLeaveDetails.userName}
                  </h3>
                  <p className="text-xs text-muted-foreground">Leave Application Record Details</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge color={selectedLeaveDetails.status === "Approved" ? "success" : selectedLeaveDetails.status === "Rejected" ? "destructive" : "warning"}>
                  {selectedLeaveDetails.status}
                </Badge>
                <button
                  type="button"
                  onClick={() => setSelectedLeaveDetails(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-base" />
                </button>
              </div>
            </div>

            {/* Details Content Grid */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 border border-border/60 rounded-xl">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Leave Type</label>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{selectedLeaveDetails.type} Leave</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{selectedLeaveDetails.status}</p>
                </div>
              </div>

              <div className="p-3 bg-muted/30 border border-border/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-days text-primary text-xs" /> Duration & Dates
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                    {Math.max(1, Math.ceil((new Date(selectedLeaveDetails.endDate).getTime() - new Date(selectedLeaveDetails.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} Days Total
                  </span>
                </div>
                <p className="font-semibold text-foreground font-mono text-sm">
                  {new Date(selectedLeaveDetails.startDate).toLocaleDateString()} — {new Date(selectedLeaveDetails.endDate).toLocaleDateString()}
                </p>
              </div>

              <div className="p-3 bg-muted/30 border border-border/60 rounded-xl space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason / Purpose</label>
                <p className="text-foreground leading-relaxed italic text-xs font-medium">"{selectedLeaveDetails.reason}"</p>
              </div>

              {(selectedLeaveDetails.status === "Approved" || selectedLeaveDetails.status === "Rejected") && (
                <div className={cn(
                  "p-3 rounded-xl border space-y-1",
                  selectedLeaveDetails.status === "Approved" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
                )}>
                  <label className={cn(
                    "text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                    selectedLeaveDetails.status === "Approved" ? "text-emerald-500" : "text-rose-500"
                  )}>
                    <i className={cn("fa-solid text-xs", selectedLeaveDetails.status === "Approved" ? "fa-circle-check" : "fa-circle-xmark")} />
                    Approval Audit Log
                  </label>
                  <p className="text-foreground font-medium text-xs">
                    {selectedLeaveDetails.status} by <span className="font-bold">{selectedLeaveDetails.approverName || "Admin"}</span>
                  </p>
                  {selectedLeaveDetails.updatedAt && (
                    <p className="text-[11px] font-mono text-muted-foreground">
                      Timestamp: {new Date(selectedLeaveDetails.updatedAt).toLocaleDateString()} at {new Date(selectedLeaveDetails.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                    </p>
                  )}
                </div>
              )}

              {/* Record ID Copy Row */}
              <div className="flex items-center justify-between p-2 bg-muted/20 border border-border/40 rounded-lg text-[11px] text-muted-foreground font-mono">
                <span className="truncate max-w-[280px]">ID: {selectedLeaveDetails._id}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedLeaveDetails._id);
                    showToast("Copied Record ID to clipboard!");
                  }}
                  className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <i className="fa-solid fa-copy text-xs" /> Copy
                </button>
              </div>
            </div>

            {/* Footer Actions: Multi-Format Export Options */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedLeaveDetails(null)}
                className="w-full sm:w-auto font-medium"
              >
                Close
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleExportLeaveDetails(selectedLeaveDetails, "csv")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 cursor-pointer shadow-sm"
                >
                  <i className="fa-solid fa-file-csv text-xs" /> Export CSV
                </Button>

                <Button
                  type="button"
                  color="primary"
                  size="sm"
                  onClick={() => handleExportLeaveDetails(selectedLeaveDetails, "txt")}
                  className="font-semibold text-xs gap-1.5 cursor-pointer shadow-sm"
                >
                  <i className="fa-solid fa-file-lines text-xs" /> Export TXT
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportLeaveDetails(selectedLeaveDetails, "json")}
                  className="font-semibold text-xs gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-code text-xs text-amber-500" /> JSON
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submitted Document Preview Modal for Admin / HR */}
      {previewModalDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setPreviewModalDoc(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95"
            style={{ height: "86vh", maxHeight: "88vh", width: "95vw", maxWidth: "1150px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <i className="fa-solid fa-file-circle-check text-base" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                      {previewModalDoc.title}
                    </h3>
                    {previewModalDoc.category && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {previewModalDoc.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {previewModalDoc.fileName}
                    {previewModalDoc.submittedBy && ` • Submitted by ${previewModalDoc.submittedBy}`}
                    {previewModalDoc.submittedAt && ` on ${new Date(previewModalDoc.submittedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewModalDoc.url, "_blank")}
                  className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer"
                  title="Open in new browser tab"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  <span className="hidden sm:inline">Open in Tab</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const dlUrl = previewModalDoc.url.includes("?")
                      ? `${previewModalDoc.url}&download=true`
                      : `${previewModalDoc.url}?download=true`;
                    window.open(dlUrl, "_blank");
                  }}
                  className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                  title="Download file"
                >
                  <i className="fa-solid fa-download text-[10px]" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewModalDoc(null)}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-1"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div
              className="flex-1 w-full bg-muted/10 relative overflow-hidden"
              style={{ flex: "1 1 auto", minHeight: "450px", height: "calc(86vh - 110px)", width: "100%" }}
            >
              {(() => {
                const urlLower = (previewModalDoc.url || "").toLowerCase();
                const nameLower = (previewModalDoc.fileName || "").toLowerCase();
                const isImage = /\.(png|jpe?g|webp|gif|svg)($|\?)/i.test(urlLower) || /\.(png|jpe?g|webp|gif|svg)$/i.test(nameLower);
                const isPdf = /\.pdf($|\?)/i.test(urlLower) || /\.pdf$/i.test(nameLower);

                if (isImage) {
                  return (
                    <div className="w-full h-full flex items-center justify-center p-4 overflow-auto" style={{ width: "100%", height: "100%" }}>
                      <img
                        src={previewModalDoc.url}
                        alt={previewModalDoc.title}
                        className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                      />
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <iframe
                      src={`${previewModalDoc.url}#view=FitH`}
                      title={previewModalDoc.title}
                      className="border-0 bg-white"
                      style={{ width: "100%", height: "100%", minHeight: "450px", display: "block" }}
                    />
                  );
                }

                return (
                  <iframe
                    src={previewModalDoc.url}
                    title={previewModalDoc.title}
                    className="border-0 bg-card"
                    style={{ width: "100%", height: "100%", minHeight: "450px", display: "block" }}
                  />
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-card text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-shield-halved text-emerald-500" />
                Verified Onboarding Submission
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewModalDoc.url, "_blank")}
                  className="h-8 px-3 text-xs gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
                  Open in New Tab
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewModalDoc(null)}
                  className="h-8 px-4 cursor-pointer"
                >
                  Close Preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
