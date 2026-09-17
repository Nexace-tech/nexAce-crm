"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

// ─── External Contract Types ───────────────────────────────────────────────────
type ContractType = "Ad_Hoc" | "Retainer" | "Custom";
type ContractStatus = "Draft" | "Active" | "Expired" | "Terminated";

interface IAttachment { url: string; name: string; }

interface ICompanyDetails {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
}

interface IClientContract {
  _id: string;
  sender: ICompanyDetails;
  receiver: ICompanyDetails;
  pocName: string;
  pocEmail: string;
  pocPhone?: string;
  contractType: ContractType;
  customTypeLabel?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  ndaAttachment?: IAttachment;
  agreementAttachment?: IAttachment;
  otherAttachments?: IAttachment[];
  status: ContractStatus;
  notifyOnCreate: boolean;
  generateInvoice: boolean;
  linkedInvoiceId?: string;
  notes?: string;
  createdBy?: { name: string; email: string };
  createdAt: string;
}

const CONTRACT_STATUS_CFG: Record<ContractStatus, { cls: string; icon: string }> = {
  Draft:      { cls: "bg-slate-500/10 text-slate-500 border-slate-500/30",    icon: "fa-pencil" },
  Active:     { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: "fa-circle-check" },
  Expired:    { cls: "bg-amber-500/10 text-amber-600 border-amber-500/30",     icon: "fa-clock" },
  Terminated: { cls: "bg-rose-500/10 text-rose-600 border-rose-500/30",        icon: "fa-ban" },
};

const CONTRACT_TYPE_CFG: Record<ContractType, { cls: string; label: string }> = {
  Ad_Hoc:   { cls: "bg-sky-500/10 text-sky-600 border-sky-500/30",       label: "Ad Hoc" },
  Retainer: { cls: "bg-violet-500/10 text-violet-600 border-violet-500/30", label: "Retainer" },
  Custom:   { cls: "bg-orange-500/10 text-orange-600 border-orange-500/30", label: "Custom" },
};

const EMPTY_COMPANY: ICompanyDetails = {
  name: "", address: "", city: "", country: "",
  phone: "", email: "", website: "", taxId: "",
};

const EMPTY_FORM = {
  sender:          { ...EMPTY_COMPANY },
  receiver:        { ...EMPTY_COMPANY },
  pocName:         "",
  pocEmail:        "",
  pocPhone:        "",
  contractType:    "Ad_Hoc" as ContractType,
  customTypeLabel: "",
  location:        "",
  startDate:       "",
  endDate:         "",
  status:          "Draft" as ContractStatus,
  notifyOnCreate:  false,
  generateInvoice: false,
  notes:           "",
};

const EMPLOYMENT_TYPE_CONFIG: Record<string, { badge: string; icon: string }> = {
  Contractor: { badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: "fa-solid fa-file-contract" },
  Freelancer: { badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30", icon: "fa-solid fa-laptop-code" },
  "Part-Time": { badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30", icon: "fa-solid fa-clock" },
  Intern: { badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30", icon: "fa-solid fa-graduation-cap" },
  Permanent: { badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: "fa-solid fa-briefcase" },
};

export function ContractsOnboardingTab() {
  const { can, isAdmin, isOPS, role } = usePermissions();
  const isHR = role === "HR";
  const isManagerOrAdmin = isAdmin || isOPS || isHR || can("manageContracts") || can("manageHR");

  // ── Section toggle ──────────────────────────────────────────────────────────
  const [section, setSection] = useState<"external" | "internal">("external");

  // ══════════════════════════════════════════════════════════════════════════
  // EXTERNAL CLIENT CONTRACTS STATE
  // ══════════════════════════════════════════════════════════════════════════
  const [contracts, setContracts] = useState<IClientContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractSearch, setContractSearch] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState<"All" | ContractStatus>("All");

  // Create / Edit modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<IClientContract | null>(null);
  const [contractForm, setContractForm] = useState({ ...EMPTY_FORM });
  const [contractSubmitting, setContractSubmitting] = useState(false);

  // View detail slide-over
  const [viewContract, setViewContract] = useState<IClientContract | null>(null);

  // Delete confirm
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null);
  const [isDeletingContract, setIsDeletingContract] = useState(false);

  // File attachments (separate from text form — just stored as file name stubs for now)
  const ndaRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);
  const othersRef = useRef<HTMLInputElement>(null);
  const [ndaFile, setNdaFile] = useState<File | null>(null);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);

  const fetchContracts = useCallback(async () => {
    try {
      setContractsLoading(true);
      const res = await fetch("/api/ops/contracts");
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts || []);
      }
    } catch {
      // silent
    } finally {
      setContractsLoading(false);
    }
  }, []);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  const filteredContracts = useMemo(() => {
    return contracts
      .filter((c) => contractStatusFilter === "All" || c.status === contractStatusFilter)
      .filter((c) => {
        if (!contractSearch) return true;
        const q = contractSearch.toLowerCase();
        return (
          c.receiver.name.toLowerCase().includes(q) ||
          c.pocName.toLowerCase().includes(q) ||
          c.pocEmail.toLowerCase().includes(q) ||
          c.sender.name.toLowerCase().includes(q) ||
          (c.location || "").toLowerCase().includes(q)
        );
      });
  }, [contracts, contractStatusFilter, contractSearch]);

  const openCreateModal = () => {
    setEditingContract(null);
    setContractForm({ ...EMPTY_FORM });
    setNdaFile(null);
    setAgreementFile(null);
    setOtherFiles([]);
    setShowContractModal(true);
  };

  const openEditModal = (c: IClientContract) => {
    setEditingContract(c);
    setContractForm({
      sender:          { ...(c.sender   ?? EMPTY_COMPANY) },
      receiver:        { ...(c.receiver ?? EMPTY_COMPANY) },
      pocName:         c.pocName,
      pocEmail:        c.pocEmail,
      pocPhone:        c.pocPhone || "",
      contractType:    c.contractType,
      customTypeLabel: c.customTypeLabel || "",
      location:        c.location || "",
      startDate:       c.startDate ? c.startDate.slice(0, 10) : "",
      endDate:         c.endDate ? c.endDate.slice(0, 10) : "",
      status:          c.status,
      notifyOnCreate:  c.notifyOnCreate,
      generateInvoice: c.generateInvoice,
      notes:           c.notes || "",
    });
    setNdaFile(null);
    setAgreementFile(null);
    setOtherFiles([]);
    setShowContractModal(true);
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.sender.name.trim() || !contractForm.pocName.trim() || !contractForm.pocEmail.trim()) {
      showToast("Client company, POC name, and email are required", "error");
      return;
    }
    try {
      setContractSubmitting(true);

      // Build attachment stubs (real upload would go to /api/drive or similar)
      const ndaAttachment = ndaFile
        ? { url: URL.createObjectURL(ndaFile), name: ndaFile.name }
        : editingContract?.ndaAttachment;
      const agreementAttachment = agreementFile
        ? { url: URL.createObjectURL(agreementFile), name: agreementFile.name }
        : editingContract?.agreementAttachment;
      const otherAttachments =
        otherFiles.length > 0
          ? otherFiles.map((f) => ({ url: URL.createObjectURL(f), name: f.name }))
          : editingContract?.otherAttachments || [];

      const payload = {
        ...contractForm,
        ndaAttachment,
        agreementAttachment,
        otherAttachments,
      };

      const method = editingContract ? "PATCH" : "POST";
      const url = editingContract
        ? `/api/ops/contracts/${editingContract._id}`
        : "/api/ops/contracts";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(editingContract ? "Contract updated" : "Contract created");
        setShowContractModal(false);
        fetchContracts();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to save contract", "error");
      }
    } catch {
      showToast("Error saving contract", "error");
    } finally {
      setContractSubmitting(false);
    }
  };

  const handleDeleteContract = async () => {
    if (!deleteContractId) return;
    try {
      setIsDeletingContract(true);
      const res = await fetch(`/api/ops/contracts/${deleteContractId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Contract deleted");
        if (viewContract?._id === deleteContractId) setViewContract(null);
        fetchContracts();
      } else {
        showToast("Failed to delete", "error");
      }
    } catch {
      showToast("Error deleting contract", "error");
    } finally {
      setIsDeletingContract(false);
      setDeleteContractId(null);
    }
  };

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  // ══════════════════════════════════════════════════════════════════════════
  // INTERNAL ONBOARDING STATE (unchanged)
  // ══════════════════════════════════════════════════════════════════════════
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Filters & Views
  const [checklistTypeFilter, setChecklistTypeFilter] = useState<"All" | "Onboarding" | "Offboarding">("All");
  const [checklistEmploymentTypeFilter, setChecklistEmploymentTypeFilter] = useState<
    "All" | "Contractor" | "Freelancer" | "Part-Time" | "Intern" | "Permanent"
  >("All");
  const [checklistSearchQuery, setChecklistSearchQuery] = useState("");
  const [checklistViewMode, setChecklistViewMode] = useState<"grid" | "list">("grid");

  // Modals
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [selectedChecklistDetails, setSelectedChecklistDetails] = useState<any | null>(null);
  const [checklistDocModal, setChecklistDocModal] = useState<{
    checklistId: string;
    item: any;
    targetUserId?: string;
    targetUserName?: string;
  } | null>(null);

  // Add Contract / Checklist Form State
  const [isCreateNewEmployeeMode, setIsCreateNewEmployeeMode] = useState(false);
  const [newChecklistUserId, setNewChecklistUserId] = useState("");
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpDepartment, setNewEmpDepartment] = useState("Engineering");
  const [newChecklistType, setNewChecklistType] = useState<"Onboarding" | "Offboarding">("Onboarding");
  const [newChecklistEmploymentType, setNewChecklistEmploymentType] = useState("Contractor");
  const [newChecklistDueDate, setNewChecklistDueDate] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [contractCurrency, setContractCurrency] = useState("USD");
  const [contractHourlyRate, setContractHourlyRate] = useState("");
  const [contractDailyRate, setContractDailyRate] = useState("");
  const [contractSowRef, setContractSowRef] = useState("");
  const [contractBillingCycle, setContractBillingCycle] = useState("Monthly");
  const [initOfferLetterFile, setInitOfferLetterFile] = useState<File | null>(null);
  const [initNdaFile, setInitNdaFile] = useState<File | null>(null);
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);

  // Upload Task Document Form State
  const [checklistUploadTitle, setChecklistUploadTitle] = useState("");
  const [checklistUploadCategory, setChecklistUploadCategory] = useState("Contract");
  const [checklistUploadFile, setChecklistUploadFile] = useState<File | null>(null);
  const [checklistUploading, setChecklistUploading] = useState(false);
  const [checklistUploadError, setChecklistUploadError] = useState("");

  const fetchChecklists = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/hr/checklists");
      if (res.ok) {
        const data = await res.json();
        setChecklists(data.checklists || []);
      }
    } catch {
      showToast("Failed to fetch contracts & checklists", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDirectoryUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/team?all=true");
      if (res.ok) {
        const data = await res.json();
        setDirectoryUsers(data.users || data.team || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
    fetchDirectoryUsers();
  }, [fetchChecklists, fetchDirectoryUsers]);

  const handleToggleChecklistItem = async (checklistId: string, itemId: string, currentCompleted: boolean) => {
    try {
      const newStatus = !currentCompleted;
      // Optimistic update
      setChecklists((prev) =>
        prev.map((c) => {
          if (c._id !== checklistId) return c;
          const updatedItems = c.items.map((it: any) =>
            it.id === itemId ? { ...it, completed: newStatus, completedAt: newStatus ? new Date() : undefined } : it
          );
          const allDone = updatedItems.every((it: any) => it.completed);
          return { ...c, items: updatedItems, status: allDone ? "Completed" : "In Progress" };
        })
      );
      if (selectedChecklistDetails && selectedChecklistDetails._id === checklistId) {
        setSelectedChecklistDetails((prev: any) => {
          if (!prev) return null;
          const updatedItems = prev.items.map((it: any) =>
            it.id === itemId ? { ...it, completed: newStatus, completedAt: newStatus ? new Date() : undefined } : it
          );
          const allDone = updatedItems.every((it: any) => it.completed);
          return { ...prev, items: updatedItems, status: allDone ? "Completed" : "In Progress" };
        });
      }

      const res = await fetch("/api/hr/checklists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId, itemId, completed: newStatus }),
      });

      if (res.ok) {
        showToast(newStatus ? "Task marked completed" : "Task reopened");
        fetchChecklists();
      } else {
        fetchChecklists();
        showToast("Failed to update task", "error");
      }
    } catch {
      fetchChecklists();
      showToast("Error updating task", "error");
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!confirm("Are you sure you want to delete this contract and checklist?")) return;
    try {
      const res = await fetch(`/api/hr/checklists?id=${checklistId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Contract / checklist deleted");
        if (selectedChecklistDetails?._id === checklistId) setSelectedChecklistDetails(null);
        fetchChecklists();
      } else {
        showToast("Failed to delete checklist", "error");
      }
    } catch {
      showToast("Error deleting checklist", "error");
    }
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let targetUserId = newChecklistUserId;
      let targetUserName = "";
      let targetUserEmail = "";

      if (isCreateNewEmployeeMode) {
        if (!newEmpName.trim() || !newEmpEmail.trim()) {
          showToast("Name and email are required", "error");
          return;
        }

        const teamRes = await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newEmpName.trim(),
            email: newEmpEmail.trim().toLowerCase(),
            department: newEmpDepartment || "Engineering",
            role: newChecklistEmploymentType === "Permanent" ? "Employee" : newChecklistEmploymentType,
            employmentType: newChecklistEmploymentType,
            status: "active",
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
      const contractDetails =
        isContractBased &&
        (contractStartDate || contractEndDate || contractHourlyRate || contractDailyRate || contractSowRef)
          ? {
              contractStartDate: contractStartDate ? new Date(contractStartDate) : undefined,
              contractEndDate: contractEndDate ? new Date(contractEndDate) : undefined,
              hourlyRate: contractHourlyRate ? parseFloat(contractHourlyRate) : undefined,
              dailyRate: contractDailyRate ? parseFloat(contractDailyRate) : undefined,
              currency: contractCurrency || "USD",
              sowReference: contractSowRef || undefined,
              billingCycle: contractBillingCycle || "Monthly",
            }
          : undefined;

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
        await Promise.all([fetchDirectoryUsers(), fetchChecklists()]);
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

  const openChecklistUploadModal = (checklist: any, item: any) => {
    setChecklistDocModal({
      checklistId: checklist._id,
      item,
      targetUserId: checklist.userId,
      targetUserName: checklist.userName,
    });
    setChecklistUploadTitle(item.title || "Checklist Document");
    setChecklistUploadCategory(item.category === "NDA" ? "NDA" : "Contract");
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

  const filteredChecklists = useMemo(() => {
    return checklists
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
  }, [checklists, checklistTypeFilter, checklistEmploymentTypeFilter, checklistSearchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-3",
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          )}
        >
          <i className={cn("fa-solid text-base", toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation")} />
          {toast.message}
        </div>
      )}

      {/* ── Section Toggle ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1 w-fit">
        <button
          type="button"
          onClick={() => setSection("external")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
            section === "external"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-file-signature" />
          External Contracts
        </button>
        <button
          type="button"
          onClick={() => setSection("internal")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
            section === "internal"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-users" />
          Onboarding / Offboarding
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EXTERNAL CLIENT CONTRACTS PANEL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {section === "external" && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-file-signature text-primary" /> External Client Contracts
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage NDA, agreements, and billing contracts with external clients. Invoices reflect in External Portal → Finance.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Search */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                <Input
                  placeholder="Search client, POC, location..."
                  value={contractSearch}
                  onChange={(e) => setContractSearch(e.target.value)}
                  className="w-52 h-9 text-xs pl-8 bg-background border-border/80"
                />
                {contractSearch && (
                  <button
                    onClick={() => setContractSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>
              {isManagerOrAdmin && (
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  className="gap-1.5 h-9 text-xs cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-plus text-xs" /> New Contract
                </Button>
              )}
            </div>
          </div>

          {/* Stats Bar + Filters + Table — hidden while form is open */}
          {!showContractModal && (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { label: "Total Contracts", val: contracts.length,                                                 icon: "fa-file-contract",       cls: "text-primary",       bg: "bg-primary/10" },
              { label: "Active",          val: contracts.filter(c => c.status === "Active").length,              icon: "fa-circle-check",        cls: "text-emerald-500",   bg: "bg-emerald-500/10" },
              { label: "Draft",           val: contracts.filter(c => c.status === "Draft").length,               icon: "fa-pencil",              cls: "text-slate-400",     bg: "bg-slate-500/10" },
              { label: "Expiring ≤30d",   val: contracts.filter(c => {
                if (!c.endDate) return false;
                const diff = (new Date(c.endDate).getTime() - Date.now()) / 86400000;
                return diff >= 0 && diff <= 30;
              }).length, icon: "fa-triangle-exclamation", cls: "text-amber-500", bg: "bg-amber-500/10" },
            ] as Array<{label:string;val:number;icon:string;cls:string;bg:string}>).map(({ label, val, icon, cls, bg }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bg, cls)}>
                  <i className={`fa-solid ${icon}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground leading-none tabular-nums">{val}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Status Filter Pills */}
          <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border w-fit flex-wrap">
            {(["All", "Draft", "Active", "Expired", "Terminated"] as const).map((s) => (
              <Button
                key={s}
                variant={contractStatusFilter === s ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setContractStatusFilter(s)}
              >
                {s}
              </Button>
            ))}
          </div>

          {/* Table */}
          {contractsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground text-lg">
                <i className="fa-solid fa-file-signature" />
              </div>
              <h4 className="font-bold text-sm text-foreground">No external contracts found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Create your first external client contract to get started.
              </p>
              {isManagerOrAdmin && (
                <Button size="sm" onClick={openCreateModal} className="gap-1 text-xs">
                  <i className="fa-solid fa-plus text-xs" /> New Contract
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {["Client", "Admin Co.", "Type", "POC", "Location", "Status", "Created", ""].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredContracts.map((c) => {
                      const typeCfg = CONTRACT_TYPE_CFG[c.contractType];
                      const statusCfg = CONTRACT_STATUS_CFG[c.status];
                      const typeLabel = c.contractType === "Custom" && c.customTypeLabel ? c.customTypeLabel : typeCfg.label;
                      return (
                        <tr key={c._id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground text-sm leading-tight">{c.receiver?.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">{c.sender?.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", typeCfg.cls)}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs font-medium text-foreground">{c.pocName}</p>
                            <p className="text-xs text-muted-foreground">{c.pocEmail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">{c.location || "—"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", statusCfg.cls)}>
                              <i className={`fa-solid ${statusCfg.icon} text-[10px]`} />
                              {c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setViewContract(c)}
                                title="View"
                                className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-eye text-xs" />
                              </button>
                              {isManagerOrAdmin && (
                                <>
                                  <button
                                    onClick={() => openEditModal(c)}
                                    title="Edit"
                                    className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                  >
                                    <i className="fa-solid fa-pen text-xs" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteContractId(c._id)}
                                    title="Delete"
                                    className="w-7 h-7 rounded-lg bg-muted hover:bg-rose-500/10 flex items-center justify-center text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                                  >
                                    <i className="fa-solid fa-trash text-xs" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── View Slide-Over ───────────────────────────────────────────── */}
          {viewContract && (
            <div className="fixed inset-0 z-[100] flex">
              <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setViewContract(null)} />
              <div className="w-full max-w-md bg-background border-l border-border flex flex-col overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div>
                    <h3 className="font-bold text-base text-foreground">{viewContract.receiver?.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {CONTRACT_TYPE_CFG[viewContract.contractType].label}
                      {viewContract.contractType === "Custom" && viewContract.customTypeLabel && ` — ${viewContract.customTypeLabel}`}
                    </p>
                  </div>
                  <button onClick={() => setViewContract(null)} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center cursor-pointer">
                    <i className="fa-solid fa-xmark text-sm" />
                  </button>
                </div>
                <div className="p-5 space-y-4 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", CONTRACT_STATUS_CFG[viewContract.status].cls)}>
                      <i className={`fa-solid ${CONTRACT_STATUS_CFG[viewContract.status].icon} text-[10px]`} />
                      {viewContract.status}
                    </span>
                    {viewContract.linkedInvoiceId && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-600 border-blue-500/30">
                        <i className="fa-solid fa-file-invoice text-[10px]" /> Invoice Generated
                      </span>
                    )}
                  </div>

                  {([
                    { label: "Sender (Admin)",   value: viewContract.sender?.name },
                    { label: "POC Name",         value: viewContract.pocName },
                    { label: "POC Email",        value: viewContract.pocEmail },
                    { label: "Location",         value: viewContract.location || "—" },
                    { label: "Start Date",       value: fmtDate(viewContract.startDate) },
                    { label: "End Date",         value: fmtDate(viewContract.endDate) },
                  ] as Array<{label:string;value:string}>).map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <p className="text-sm text-foreground">{value}</p>
                    </div>
                  ))}

                  {/* Attachments */}
                  {(viewContract.ndaAttachment || viewContract.agreementAttachment || (viewContract.otherAttachments?.length ?? 0) > 0) && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Attachments</p>
                      <div className="space-y-1.5">
                        {viewContract.ndaAttachment && (
                          <a href={viewContract.ndaAttachment.url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-primary hover:underline">
                            <i className="fa-solid fa-file-pdf" /> NDA — {viewContract.ndaAttachment.name}
                          </a>
                        )}
                        {viewContract.agreementAttachment && (
                          <a href={viewContract.agreementAttachment.url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-primary hover:underline">
                            <i className="fa-solid fa-file-lines" /> Agreement — {viewContract.agreementAttachment.name}
                          </a>
                        )}
                        {viewContract.otherAttachments?.map((at, i) => (
                          <a key={i} href={at.url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-primary hover:underline">
                            <i className="fa-solid fa-paperclip" /> {at.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewContract.notes && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3">{viewContract.notes}</p>
                    </div>
                  )}
                </div>

                {isManagerOrAdmin && (
                  <div className="p-5 border-t border-border flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 cursor-pointer" onClick={() => { setViewContract(null); openEditModal(viewContract); }}>
                      <i className="fa-solid fa-pen text-xs" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer text-rose-500 hover:text-rose-600 border-rose-200"
                      onClick={() => { setViewContract(null); setDeleteContractId(viewContract._id); }}>
                      <i className="fa-solid fa-trash text-xs" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
          </>
          )}

          {/* ── Inline Create / Edit Form ─────────────────────────────────── */}
          {showContractModal && (
            <div className="bg-card border border-border rounded-2xl animate-in slide-in-from-top-2 duration-200">
              {/* Form Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-file-signature text-primary" />
                    {editingContract ? "Edit Contract" : "New External Client Contract"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below. Required fields are marked *</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center cursor-pointer transition-colors"
                  title="Discard and go back"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>

              <form onSubmit={handleContractSubmit} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                  {/* ── Sender (Admin / Our Company) ── */}
                  <div className="lg:col-span-2 bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-building-user text-primary" /> Sender — Our Company
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Company Name <span className="text-rose-500">*</span></label>
                        <Input placeholder="e.g. Ace Consultancys" value={contractForm.sender.name}
                          onChange={(e) => setContractForm(f => ({ ...f, sender: { ...f.sender, name: e.target.value } }))}
                          required className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Email</label>
                        <Input type="email" placeholder="hello@ourcompany.com" value={contractForm.sender.email ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, sender: { ...f.sender, email: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                        <Input placeholder="+91 98765 43210" value={contractForm.sender.phone ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, sender: { ...f.sender, phone: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Tax ID / GST</label>
                        <Input placeholder="GST / VAT / TIN" value={contractForm.sender.taxId ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, sender: { ...f.sender, taxId: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Address</label>
                        <Input placeholder="Street address" value={contractForm.sender.address ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, sender: { ...f.sender, address: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">City</label>
                          <Input placeholder="City" value={contractForm.sender.city ?? ""}
                            onChange={(e) => setContractForm(f => ({ ...f, sender: { ...f.sender, city: e.target.value } }))}
                            className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Country</label>
                          <Input placeholder="Country" value={contractForm.sender.country ?? ""}
                            onChange={(e) => setContractForm(f => ({ ...f, sender: { ...f.sender, country: e.target.value } }))}
                            className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground">Website</label>
                        <Input placeholder="https://ourcompany.com" value={contractForm.sender.website ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, sender: { ...f.sender, website: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* ── Receiver (Client Company) ── */}
                  <div className="lg:col-span-2 bg-muted/30 border border-border rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-handshake text-emerald-500" /> Receiver — Client Company
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Company Name <span className="text-rose-500">*</span></label>
                        <Input placeholder="e.g. Acme Corp" value={contractForm.receiver.name}
                          onChange={(e) => setContractForm(f => ({ ...f, receiver: { ...f.receiver, name: e.target.value } }))}
                          required className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Company Email</label>
                        <Input type="email" placeholder="billing@client.com" value={contractForm.receiver.email ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, receiver: { ...f.receiver, email: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                        <Input placeholder="+1 555 000 0000" value={contractForm.receiver.phone ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, receiver: { ...f.receiver, phone: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Tax ID / GST</label>
                        <Input placeholder="GST / VAT / TIN" value={contractForm.receiver.taxId ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, receiver: { ...f.receiver, taxId: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">Address</label>
                        <Input placeholder="Street address" value={contractForm.receiver.address ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, receiver: { ...f.receiver, address: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">City</label>
                          <Input placeholder="City" value={contractForm.receiver.city ?? ""}
                            onChange={(e) => setContractForm(f => ({ ...f, receiver: { ...f.receiver, city: e.target.value } }))}
                            className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground">Country</label>
                          <Input placeholder="Country" value={contractForm.receiver.country ?? ""}
                            onChange={(e) => setContractForm(f => ({ ...f, receiver: { ...f.receiver, country: e.target.value } }))}
                            className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-muted-foreground">Website</label>
                        <Input placeholder="https://client.com" value={contractForm.receiver.website ?? ""}
                          onChange={(e) => setContractForm(f => ({ ...f, receiver: { ...f.receiver, website: e.target.value } }))}
                          className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* ── POC (Point of Contact) ── */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">POC Name <span className="text-rose-500">*</span></label>
                    <Input placeholder="Point of contact name" value={contractForm.pocName}
                      onChange={(e) => setContractForm(f => ({ ...f, pocName: e.target.value }))}
                      required className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">POC Email <span className="text-rose-500">*</span></label>
                    <Input type="email" placeholder="poc@client.com" value={contractForm.pocEmail}
                      onChange={(e) => setContractForm(f => ({ ...f, pocEmail: e.target.value }))}
                      required className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5 lg:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">POC Phone</label>
                    <Input placeholder="+91 98765 43210" value={contractForm.pocPhone}
                      onChange={(e) => setContractForm(f => ({ ...f, pocPhone: e.target.value }))}
                      className="h-9 text-sm" />
                  </div>

                  {/* Contract Type */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Contract Type <span className="text-rose-500">*</span></label>
                    <div className="flex gap-1 flex-wrap">
                      {(["Ad_Hoc", "Retainer", "Custom"] as ContractType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setContractForm(f => ({ ...f, contractType: t }))}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                            contractForm.contractType === t
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          {CONTRACT_TYPE_CFG[t].label}
                        </button>
                      ))}
                    </div>
                    {contractForm.contractType === "Custom" && (
                      <Input
                        placeholder="Custom type label"
                        value={contractForm.customTypeLabel}
                        onChange={(e) => setContractForm(f => ({ ...f, customTypeLabel: e.target.value }))}
                        className="h-8 text-xs mt-1.5"
                      />
                    )}
                  </div>
                  {/* Location */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Location</label>
                    <Input
                      placeholder="City, Country (optional)"
                      value={contractForm.location}
                      onChange={(e) => setContractForm(f => ({ ...f, location: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                    <Input
                      type="date"
                      value={contractForm.startDate}
                      onChange={(e) => setContractForm(f => ({ ...f, startDate: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                  {/* End Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                    <Input
                      type="date"
                      value={contractForm.endDate}
                      onChange={(e) => setContractForm(f => ({ ...f, endDate: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>

                  {/* Status — span full width */}
                  <div className="space-y-1.5 lg:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Status</label>
                    <div className="flex gap-1 flex-wrap">
                      {(["Draft", "Active", "Expired", "Terminated"] as ContractStatus[]).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setContractForm(f => ({ ...f, status: s }))}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer",
                            contractForm.status === s
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Attachments — span full width */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* NDA */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">NDA</label>
                      <button
                        type="button"
                        onClick={() => ndaRef.current?.click()}
                        className={cn(
                          "w-full h-10 border border-dashed border-border rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer",
                          ndaFile ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/5" : "text-muted-foreground"
                        )}
                      >
                        <i className={`fa-solid ${ndaFile ? "fa-circle-check" : "fa-upload"} text-xs`} />
                        {ndaFile ? ndaFile.name.slice(0, 16) + (ndaFile.name.length > 16 ? "…" : "") : "Upload NDA"}
                      </button>
                      <input ref={ndaRef} type="file" className="hidden" onChange={(e) => setNdaFile(e.target.files?.[0] || null)} />
                    </div>
                    {/* Agreement */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Agreement</label>
                      <button
                        type="button"
                        onClick={() => agreementRef.current?.click()}
                        className={cn(
                          "w-full h-10 border border-dashed border-border rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer",
                          agreementFile ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/5" : "text-muted-foreground"
                        )}
                      >
                        <i className={`fa-solid ${agreementFile ? "fa-circle-check" : "fa-upload"} text-xs`} />
                        {agreementFile ? agreementFile.name.slice(0, 16) + (agreementFile.name.length > 16 ? "…" : "") : "Upload Agreement"}
                      </button>
                      <input ref={agreementRef} type="file" className="hidden" onChange={(e) => setAgreementFile(e.target.files?.[0] || null)} />
                    </div>
                    {/* Others */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Others</label>
                      <button
                        type="button"
                        onClick={() => othersRef.current?.click()}
                        className={cn(
                          "w-full h-10 border border-dashed border-border rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer",
                          otherFiles.length > 0 ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/5" : "text-muted-foreground"
                        )}
                      >
                        <i className={`fa-solid ${otherFiles.length > 0 ? "fa-circle-check" : "fa-paperclip"} text-xs`} />
                        {otherFiles.length > 0 ? `${otherFiles.length} file(s)` : "Attach Others"}
                      </button>
                      <input ref={othersRef} type="file" multiple className="hidden" onChange={(e) => setOtherFiles(Array.from(e.target.files || []))} />
                    </div>
                  </div>

                  {/* Notes — span full width */}
                  <div className="space-y-1.5 lg:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Optional notes about the contract..."
                      value={contractForm.notes}
                      onChange={(e) => setContractForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  {/* Toggles — span full width */}
                  <div className="lg:col-span-2 bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                    {/* Notify on Create */}
                    <label className="flex items-center justify-between cursor-pointer gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Notify on Create</p>
                        <p className="text-xs text-muted-foreground">Send in-app notification to Admin/OPS users</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={contractForm.notifyOnCreate}
                        onClick={() => setContractForm(f => ({ ...f, notifyOnCreate: !f.notifyOnCreate }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none",
                          contractForm.notifyOnCreate ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                            contractForm.notifyOnCreate ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </label>

                    {/* Generate Invoice */}
                    <label className="flex items-center justify-between cursor-pointer gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Generate Invoice</p>
                        <p className="text-xs text-muted-foreground">Auto-create a Draft invoice in Finance (visible in External Portal)</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={contractForm.generateInvoice}
                        onClick={() => setContractForm(f => ({ ...f, generateInvoice: !f.generateInvoice }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none",
                          contractForm.generateInvoice ? "bg-primary" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                            contractForm.generateInvoice ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </label>
                  </div>

                  {/* Submit — span full width */}
                  <div className="flex justify-end gap-2 pt-2 lg:col-span-2 border-t border-border mt-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowContractModal(false)} className="cursor-pointer">
                      <i className="fa-solid fa-arrow-left text-xs mr-1.5" /> Discard
                    </Button>
                    <Button type="submit" size="sm" disabled={contractSubmitting} className="gap-1.5 cursor-pointer min-w-[130px]">
                      {contractSubmitting ? (
                        <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving…</>
                      ) : (
                        <><i className="fa-solid fa-floppy-disk text-xs" /> {editingContract ? "Save Changes" : "Create Contract"}</>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ── Delete Confirm ────────────────────────────────────────────── */}
          {deleteContractId && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteContractId(null)} />
              <div className="relative bg-background border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
                  <i className="fa-solid fa-triangle-exclamation text-rose-500 text-lg" />
                </div>
                <h4 className="font-bold text-center text-foreground">Delete Contract?</h4>
                <p className="text-sm text-center text-muted-foreground">This action cannot be undone. The contract will be permanently removed.</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 cursor-pointer" onClick={() => setDeleteContractId(null)}>Cancel</Button>
                  <Button size="sm" className="flex-1 cursor-pointer bg-rose-500 hover:bg-rose-600 text-white" onClick={handleDeleteContract} disabled={isDeletingContract}>
                    {isDeletingContract ? <i className="fa-solid fa-spinner fa-spin" /> : "Delete"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* INTERNAL ONBOARDING / OFFBOARDING PANEL (existing) */}
      {section === "internal" && <div className="space-y-6">

      {/* Header / Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <i className="fa-solid fa-file-contract text-primary" /> Contracts & Onboarding / Offboarding
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage contractor agreements, freelancers, SOWs, deliverables, and automated onboarding & offboarding workflows.
          </p>
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
              <button
                onClick={() => setChecklistSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
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
                checklistViewMode === "list"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
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
                checklistViewMode === "grid"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid View"
            >
              <i className="fa-solid fa-table-cells" />
            </button>
          </div>

          {/* Add New Contract / Checklist Button */}
          {isManagerOrAdmin && (
            <Button
              id="btn-add-new-contract-ops"
              color="primary"
              size="sm"
              onClick={() => setShowChecklistModal(true)}
              className="gap-1.5 h-9 text-xs cursor-pointer shadow-xs"
            >
              <i className="fa-solid fa-plus text-xs" /> Add New Contract
            </Button>
          )}
        </div>
      </div>

      {/* Filter Pills */}
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

      {/* Main Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-56 bg-muted/30 border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredChecklists.length === 0 ? (
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
      ) : checklistViewMode === "grid" ? (
        /* DREAMS TECHNOLOGIES CONTRACTS GRID LAYOUT */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChecklists.map((c) => {
            const completedCount = c.items?.filter((i: any) => i.completed).length || 0;
            const totalItems = c.items?.length || 1;
            const progressPct = Math.round((completedCount / totalItems) * 100);
            const empType = c.employmentType || "Permanent";
            const contractId = c.contractDetails?.sowReference || c._id.slice(-6).toUpperCase();

            const startDateStr = c.contractDetails?.contractStartDate
              ? new Date(c.contractDetails.contractStartDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : new Date(c.startDate || c.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                });

            const endDateStr = c.contractDetails?.contractEndDate
              ? new Date(c.contractDetails.contractEndDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
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
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] py-0", c.status === "Completed" ? "border-emerald-500/30 text-emerald-600" : "")}
                      >
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
                      <span>
                        Date : <strong className="text-foreground/90 font-normal">{startDateStr}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="fa-regular fa-calendar-check text-muted-foreground/70 text-xs w-3.5" />
                      <span>
                        Open till : <strong className="text-foreground/90 font-normal">{endDateStr}</strong>
                      </span>
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
                      <span className="font-semibold text-foreground">
                        {completedCount}/{totalItems} Tasks ({progressPct}%)
                      </span>
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
      ) : (
        /* DETAILED LIST VIEW */
        <div className="space-y-4">
          {filteredChecklists.map((c) => {
            const completedCount = c.items?.filter((i: any) => i.completed).length || 0;
            const totalItems = c.items?.length || 1;
            const progressPct = Math.round((completedCount / totalItems) * 100);
            const empType = c.employmentType || "Permanent";
            const empConfig = EMPLOYMENT_TYPE_CONFIG[empType] || {
              badge: "bg-muted text-muted-foreground border-border",
              icon: "fa-solid fa-user",
            };

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
                    <p className="text-xs font-semibold text-foreground">
                      {completedCount} of {c.items.length} Tasks Done ({progressPct}%)
                    </p>
                    <div className="w-36 h-2 bg-muted rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Contract Details Banner */}
                {c.contractDetails &&
                  (c.contractDetails.contractStartDate ||
                    c.contractDetails.contractEndDate ||
                    c.contractDetails.hourlyRate ||
                    c.contractDetails.dailyRate ||
                    c.contractDetails.sowReference) && (
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
                          <span className="font-medium text-foreground">Rate:</span> {c.contractDetails.currency || "USD"}{" "}
                          {c.contractDetails.hourlyRate ? `${c.contractDetails.hourlyRate}/hr` : `${c.contractDetails.dailyRate}/day`}
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
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors",
                          item.completed ? "bg-muted/20 border-border/50 text-muted-foreground" : "bg-card border-border hover:border-primary/40"
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                          <button
                            type="button"
                            onClick={() => handleToggleChecklistItem(c._id, item.id, item.completed)}
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 cursor-pointer transition-colors",
                              item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:border-primary"
                            )}
                          >
                            {item.completed && <i className="fa-solid fa-check" />}
                          </button>
                          <span className={cn("truncate font-medium", item.completed ? "line-through text-muted-foreground" : "text-foreground")}>
                            {item.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{item.category}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.documentUrl ? (
                            <a
                              href={item.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                              title={item.documentName || "View attachment"}
                            >
                              <i className="fa-solid fa-paperclip text-[10px]" /> View
                            </a>
                          ) : isDocItem ? (
                            <button
                              type="button"
                              onClick={() => openChecklistUploadModal(c, item)}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                              title="Upload Document"
                            >
                              <i className="fa-solid fa-upload text-[10px]" /> Upload
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
                  <span>{c.dueDate ? `Target Due Date: ${new Date(c.dueDate).toLocaleDateString()}` : "Ongoing Agreement"}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedChecklistDetails(c)} className="h-7 text-xs gap-1">
                      <i className="fa-solid fa-eye text-[10px]" /> Manage Tasks
                    </Button>
                    {isManagerOrAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteChecklist(c._id)}
                        className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1"
                      >
                        <i className="fa-solid fa-trash text-[10px]" /> Delete
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add New Contract / Checklist Modal */}
      {showChecklistModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowChecklistModal(false)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-clipboard-check text-emerald-500 text-base" /> Start Onboarding / Offboarding
              </h3>
              <button onClick={() => setShowChecklistModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleCreateChecklist} className="space-y-4">
              {/* Mode Switcher */}
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
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
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
                      className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
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
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
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
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary"
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

              {/* Contract Metadata Section */}
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
                        className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
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
                        className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
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

              {/* Attach Onboarding Documents */}
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
                  {/* Offer Letter */}
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
                        <button
                          type="button"
                          onClick={() => setInitOfferLetterFile(null)}
                          className="text-muted-foreground hover:text-destructive text-xs cursor-pointer"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* NDA */}
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
                        <button
                          type="button"
                          onClick={() => setInitNdaFile(null)}
                          className="text-muted-foreground hover:text-destructive text-xs cursor-pointer"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" disabled={isCreatingChecklist} onClick={() => setShowChecklistModal(false)}>
                  Cancel
                </Button>
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
                    <Badge variant="outline">{selectedChecklistDetails.employmentType || "Permanent"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedChecklistDetails.userEmail}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChecklistDetails(null)}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Contract Info Banner */}
            {selectedChecklistDetails.contractDetails && (
              <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-file-contract text-primary" /> Contract Metadata
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block">SOW Reference:</span>
                    <strong className="text-foreground">{selectedChecklistDetails.contractDetails.sowReference || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Rate / Value:</span>
                    <strong className="text-foreground">
                      {selectedChecklistDetails.contractDetails.currency || "USD"}{" "}
                      {selectedChecklistDetails.contractDetails.hourlyRate
                        ? `${selectedChecklistDetails.contractDetails.hourlyRate}/hr`
                        : selectedChecklistDetails.contractDetails.dailyRate
                        ? `${selectedChecklistDetails.contractDetails.dailyRate}/day`
                        : "Fixed"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Billing Cycle:</span>
                    <strong className="text-foreground">{selectedChecklistDetails.contractDetails.billingCycle || "Monthly"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Start & End:</span>
                    <strong className="text-foreground">
                      {selectedChecklistDetails.contractDetails.contractStartDate
                        ? new Date(selectedChecklistDetails.contractDetails.contractStartDate).toLocaleDateString()
                        : "Start"}{" "}
                      -{" "}
                      {selectedChecklistDetails.contractDetails.contractEndDate
                        ? new Date(selectedChecklistDetails.contractDetails.contractEndDate).toLocaleDateString()
                        : "Open"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Task Checklist Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>Checklist Tasks ({selectedChecklistDetails.items?.filter((i: any) => i.completed).length || 0} / {selectedChecklistDetails.items?.length || 0})</span>
                <span className="text-primary">
                  {Math.round(
                    (((selectedChecklistDetails.items?.filter((i: any) => i.completed).length || 0) /
                      (selectedChecklistDetails.items?.length || 1)) *
                      100)
                  )}
                  % Completed
                </span>
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {selectedChecklistDetails.items?.map((item: any) => {
                  const isDocItem = ["Document", "Contract", "NDA", "Compliance"].includes(item.category);
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors",
                        item.completed ? "bg-muted/20 border-border/50 text-muted-foreground" : "bg-card border-border hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => handleToggleChecklistItem(selectedChecklistDetails._id, item.id, item.completed)}
                          className={cn(
                            "w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 cursor-pointer transition-colors",
                            item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:border-primary"
                          )}
                        >
                          {item.completed && <i className="fa-solid fa-check" />}
                        </button>
                        <div className="min-w-0">
                          <p className={cn("font-medium truncate", item.completed ? "line-through text-muted-foreground" : "text-foreground")}>
                            {item.title}
                          </p>
                          {item.description && <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">{item.category}</span>
                        {item.documentUrl ? (
                          <a
                            href={item.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                            title={item.documentName || "View attachment"}
                          >
                            <i className="fa-solid fa-paperclip text-[10px]" /> View
                          </a>
                        ) : isDocItem ? (
                          <button
                            type="button"
                            onClick={() => openChecklistUploadModal(selectedChecklistDetails, item)}
                            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            title="Upload Document"
                          >
                            <i className="fa-solid fa-upload text-[10px]" /> Upload
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border">
              {isManagerOrAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteChecklist(selectedChecklistDetails._id)}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1 text-xs"
                >
                  <i className="fa-solid fa-trash text-xs" /> Delete Checklist
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedChecklistDetails(null)} className="ml-auto text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document to Task Modal */}
      {checklistDocModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setChecklistDocModal(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <i className="fa-solid fa-cloud-arrow-up text-primary text-sm" /> Attach Document to Checklist Task
              </h3>
              <button onClick={() => setChecklistDocModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {checklistUploadError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation text-xs" />
                {checklistUploadError}
              </div>
            )}

            <form onSubmit={handleChecklistUploadSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Task Item</label>
                <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-md font-medium">{checklistDocModal.item.title}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Document Title</label>
                <Input
                  value={checklistUploadTitle}
                  onChange={(e) => setChecklistUploadTitle(e.target.value)}
                  placeholder="e.g. Signed Offer Letter - Alex Morgan"
                  required
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Category</label>
                <select
                  value={checklistUploadCategory}
                  onChange={(e) => setChecklistUploadCategory(e.target.value)}
                  className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="Contract">Contract</option>
                  <option value="NDA">NDA</option>
                  <option value="KRA Agreement">KRA Sign-off</option>
                  <option value="Policy">Compliance</option>
                  <option value="Document">General Document</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Select File *</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => setChecklistUploadFile(e.target.files?.[0] || null)}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" disabled={checklistUploading} onClick={() => setChecklistDocModal(null)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" disabled={checklistUploading} className="cursor-pointer gap-1.5 text-xs">
                  {checklistUploading ? (
                    <>
                      <i className="fa-solid fa-circle-notch animate-spin text-xs" /> Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-upload text-xs" /> Upload & Mark Complete
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>}
    </div>
  );
}
export default ContractsOnboardingTab;
