"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

// ─── External Contract Types ───────────────────────────────────────────────────
type ContractType = "Ad_Hoc" | "Retainer" | "Custom";
type ContractStatus = "Draft" | "Active" | "Expired" | "Terminated";

interface IAttachment {
  url: string;
  name: string;
}

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
  budget?: number;
  currency?: string;
  ndaAttachment?: IAttachment;
  agreementAttachment?: IAttachment;
  otherAttachments?: IAttachment[];
  status: ContractStatus;
  mailSent: boolean;
  notifyOnCreate: boolean;
  generateInvoice: boolean;
  linkedInvoiceId?: string;
  notes?: string;
  createdBy?: { name: string; email: string };
  createdAt: string;
}

const CONTRACT_STATUS_CFG: Record<ContractStatus, { cls: string; icon: string; dot: string }> = {
  Draft:      { cls: "bg-slate-500/10 text-slate-500 border-slate-500/25",       icon: "fa-pencil",       dot: "bg-slate-400" },
  Active:     { cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25", icon: "fa-circle-check", dot: "bg-emerald-500" },
  Expired:    { cls: "bg-amber-500/10 text-amber-600 border-amber-500/25",        icon: "fa-clock",        dot: "bg-amber-500" },
  Terminated: { cls: "bg-rose-500/10 text-rose-600 border-rose-500/25",           icon: "fa-ban",          dot: "bg-rose-500" },
};

const CONTRACT_TYPE_CFG: Record<ContractType, { cls: string; label: string; icon: string }> = {
  Ad_Hoc:   { cls: "bg-sky-500/10 text-sky-600 border-sky-500/25",          label: "Ad Hoc",   icon: "fa-bolt" },
  Retainer: { cls: "bg-violet-500/10 text-violet-600 border-violet-500/25",    label: "Retainer", icon: "fa-repeat" },
  Custom:   { cls: "bg-orange-500/10 text-orange-600 border-orange-500/25",    label: "Custom",   icon: "fa-sliders" },
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
  budget:          "",
  currency:        "USD",
  status:          "Draft" as ContractStatus,
  mailSent:        false,
  notifyOnCreate:  false,
  generateInvoice: false,
  notes:           "",
};

export function ContractsOnboardingTab() {
  const { can, isAdmin, isOPS, role } = usePermissions();
  const isHR = role === "HR";
  const isManagerOrAdmin = isAdmin || isOPS || isHR || can("manageContracts") || can("manageHR");

  // ══════════════════════════════════════════════════════════════════════════
  // EXTERNAL CLIENT CONTRACTS STATE
  // ══════════════════════════════════════════════════════════════════════════
  const [contracts, setContracts] = useState<IClientContract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractSearch, setContractSearch] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState<"All" | ContractStatus>("All");
  const [contractTypeFilter, setContractTypeFilter] = useState<"All" | ContractType>("All");
  const [filterExpiringOnly, setFilterExpiringOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [orgDetails, setOrgDetails] = useState<ICompanyDetails | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    showToast(`Copied ${label} to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Create / Edit modal state with Multi-Step flow (1: Parties, 2: Scope & Contact, 3: Documents & Delivery)
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<IClientContract | null>(null);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [contractForm, setContractForm] = useState({ ...EMPTY_FORM });
  const [contractSubmitting, setContractSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // View detail slide-over
  const [viewContract, setViewContract] = useState<IClientContract | null>(null);
  const [isUpdatingQuickStatus, setIsUpdatingQuickStatus] = useState(false);
  const [isSendingQuickMail, setIsSendingQuickMail] = useState(false);

  // Delete confirm
  const [deleteContractId, setDeleteContractId] = useState<string | null>(null);
  const [isDeletingContract, setIsDeletingContract] = useState(false);

  // File attachments state
  const ndaRef = useRef<HTMLInputElement>(null);
  const agreementRef = useRef<HTMLInputElement>(null);
  const othersRef = useRef<HTMLInputElement>(null);
  const [ndaFile, setNdaFile] = useState<File | null>(null);
  const [agreementFile, setAgreementFile] = useState<File | null>(null);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);
  const [existingNda, setExistingNda] = useState<IAttachment | null>(null);
  const [existingAgreement, setExistingAgreement] = useState<IAttachment | null>(null);
  const [existingOtherFiles, setExistingOtherFiles] = useState<IAttachment[]>([]);
  const [isDraggingOther, setIsDraggingOther] = useState(false);

  const fetchContracts = useCallback(async () => {
    try {
      setContractsLoading(true);
      const res = await fetch("/api/ops/contracts");
      if (res.ok) {
        const data = await res.json();
        setContracts(data.contracts || []);
        if (data.organization?.name) {
          setOrgDetails(data.organization);
        }
      }
    } catch {
      // silent
    } finally {
      setContractsLoading(false);
    }
  }, []);

  const fetchOrgDetails = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/company");
      if (res.ok) {
        const data = await res.json();
        if (data.company) {
          const comp = data.company;
          setOrgDetails({
            name:    comp.legalName || comp.name || "",
            address: comp.address || "",
            city:    comp.city || "",
            country: comp.country || "",
            phone:   comp.phone || comp.tollFreePhone || "",
            email:   comp.email || comp.billingEmail || "",
            website: comp.website || "",
            taxId:   comp.taxId || "",
          });
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchContracts();
    fetchOrgDetails();
  }, [fetchContracts, fetchOrgDetails]);

  // Keyboard shortcut: Escape to close drawer / modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteContractId) setDeleteContractId(null);
        else if (viewContract) setViewContract(null);
        else if (showContractModal) setShowContractModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteContractId, viewContract, showContractModal]);

  // If orgDetails is loaded while create modal is open and sender is blank, auto-fill it
  useEffect(() => {
    if (orgDetails && showContractModal && !editingContract && !contractForm.sender.name) {
      setContractForm((f) => ({
        ...f,
        sender: { ...orgDetails },
      }));
    }
  }, [orgDetails, showContractModal, editingContract, contractForm.sender.name]);

  // Clear a specific field error as user types
  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (serverError) {
      setServerError(null);
    }
  };

  // Quick Auto-pick Org handler
  const handleAutoPickOrg = useCallback(async () => {
    clearFieldError("sender.name");
    if (orgDetails && orgDetails.name) {
      setContractForm((f) => ({ ...f, sender: { ...orgDetails } }));
      showToast("Auto-picked organization details");
      return;
    }
    try {
      const res = await fetch("/api/settings/company");
      if (res.ok) {
        const data = await res.json();
        if (data.company) {
          const comp = data.company;
          const details: ICompanyDetails = {
            name:    comp.legalName?.trim() || comp.name?.trim() || "",
            address: comp.address?.trim() || "",
            city:    comp.city?.trim() || "",
            country: comp.country?.trim() || "",
            phone:   comp.phone?.trim() || comp.tollFreePhone?.trim() || "",
            email:   comp.email?.trim() || comp.billingEmail?.trim() || "",
            website: comp.website?.trim() || "",
            taxId:   comp.taxId?.trim() || "",
          };
          setOrgDetails(details);
          setContractForm((f) => ({ ...f, sender: { ...details } }));
          showToast("Auto-picked organization details");
        }
      }
    } catch {
      showToast("Could not load organization details", "error");
    }
  }, [orgDetails]);

  // Days remaining helper
  const getDaysRemaining = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = Math.ceil((end - now) / 86400000);
    return diff;
  };

  // Metrics
  const totalActiveBudget = useMemo(() => {
    return contracts
      .filter((c) => c.status === "Active")
      .reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
  }, [contracts]);

  const expiringContractsCount = useMemo(() => {
    return contracts.filter((c) => {
      if (!c.endDate || c.status !== "Active") return false;
      const diff = getDaysRemaining(c.endDate);
      return diff !== null && diff >= 0 && diff <= 30;
    }).length;
  }, [contracts]);

  // Filtered list
  const filteredContracts = useMemo(() => {
    return contracts
      .filter((c) => contractStatusFilter === "All" || c.status === contractStatusFilter)
      .filter((c) => contractTypeFilter === "All" || c.contractType === contractTypeFilter)
      .filter((c) => {
        if (!filterExpiringOnly) return true;
        if (!c.endDate || c.status !== "Active") return false;
        const diff = getDaysRemaining(c.endDate);
        return diff !== null && diff >= 0 && diff <= 30;
      })
      .filter((c) => {
        if (!contractSearch) return true;
        const q = contractSearch.toLowerCase();
        return (
          c.receiver?.name?.toLowerCase().includes(q) ||
          c.pocName?.toLowerCase().includes(q) ||
          c.pocEmail?.toLowerCase().includes(q) ||
          c.sender?.name?.toLowerCase().includes(q) ||
          c._id.toLowerCase().includes(q) ||
          (c.location || "").toLowerCase().includes(q)
        );
      });
  }, [contracts, contractStatusFilter, contractTypeFilter, filterExpiringOnly, contractSearch]);

  // Quick Status change from slide-over or card
  const handleQuickStatusChange = async (id: string, newStatus: ContractStatus) => {
    try {
      setIsUpdatingQuickStatus(true);
      const res = await fetch(`/api/ops/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Status updated to ${newStatus}`);
        setContracts((prev) => prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c)));
        if (viewContract?._id === id) {
          setViewContract((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to update status", "error");
      }
    } catch {
      showToast("Error updating status", "error");
    } finally {
      setIsUpdatingQuickStatus(false);
    }
  };

  // Quick Send Confirmation Email
  const handleQuickSendMail = async (c: IClientContract) => {
    if (!c.pocEmail) {
      showToast("No POC email found for this contract", "error");
      return;
    }
    try {
      setIsSendingQuickMail(true);
      const res = await fetch(`/api/ops/contracts/${c._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailSent: true }),
      });
      if (res.ok) {
        showToast(`Confirmation email dispatched to ${c.pocEmail}`);
        setContracts((prev) => prev.map((item) => (item._id === c._id ? { ...item, mailSent: true } : item)));
        if (viewContract?._id === c._id) {
          setViewContract((prev) => (prev ? { ...prev, mailSent: true } : null));
        }
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to dispatch email", "error");
      }
    } catch {
      showToast("Error dispatching email", "error");
    } finally {
      setIsSendingQuickMail(false);
    }
  };

  const openCreateModal = () => {
    setEditingContract(null);
    setContractForm({
      ...EMPTY_FORM,
      sender: orgDetails ? { ...orgDetails } : { ...EMPTY_COMPANY },
    });
    setActiveStep(1);
    setFieldErrors({});
    setServerError(null);
    setNdaFile(null);
    setAgreementFile(null);
    setOtherFiles([]);
    setExistingNda(null);
    setExistingAgreement(null);
    setExistingOtherFiles([]);
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
      budget:          c.budget !== undefined && c.budget !== null ? String(c.budget) : "",
      currency:        c.currency || "USD",
      status:          c.status,
      mailSent:        c.mailSent ?? false,
      notifyOnCreate:  c.notifyOnCreate,
      generateInvoice: c.generateInvoice,
      notes:           c.notes || "",
    });
    setActiveStep(1);
    setFieldErrors({});
    setServerError(null);
    setNdaFile(null);
    setAgreementFile(null);
    setOtherFiles([]);
    setExistingNda(c.ndaAttachment || null);
    setExistingAgreement(c.agreementAttachment || null);
    setExistingOtherFiles(c.otherAttachments ? [...c.otherAttachments] : []);
    setShowContractModal(true);
  };

  // ── Step-by-Step Validation ───────────────────────────────────────────────────
  const validateStep1 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!contractForm.sender.name.trim()) {
      errs["sender.name"] = "Sender company name is required";
    }
    if (!contractForm.receiver.name.trim()) {
      errs["receiver.name"] = "Client company name is required";
    }
    return errs;
  };

  const validateStep2 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!contractForm.pocName.trim()) {
      errs["pocName"] = "Point of contact (POC) full name is required";
    }
    if (!contractForm.pocEmail.trim()) {
      errs["pocEmail"] = "POC email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contractForm.pocEmail.trim())) {
      errs["pocEmail"] = "Please enter a valid email address (e.g. contact@client.com)";
    }
    if (!contractForm.contractType) {
      errs["contractType"] = "Contract type is required";
    }
    if (contractForm.contractType === "Custom" && !contractForm.customTypeLabel.trim()) {
      errs["customTypeLabel"] = "Custom contract type label is required";
    }
    if (contractForm.startDate && contractForm.endDate) {
      if (new Date(contractForm.endDate).getTime() < new Date(contractForm.startDate).getTime()) {
        errs["endDate"] = "End date cannot be earlier than start date";
      }
    }
    return errs;
  };

  // Validate entire form across all steps
  const validateAllSteps = (): { errors: Record<string, string>; failingStep: 1 | 2 | 3 | null } => {
    const s1 = validateStep1();
    if (Object.keys(s1).length > 0) {
      return { errors: s1, failingStep: 1 };
    }
    const s2 = validateStep2();
    if (Object.keys(s2).length > 0) {
      return { errors: s2, failingStep: 2 };
    }
    return { errors: {}, failingStep: null };
  };

  // Step 1 -> Step 2 transition
  const handleNextFromStep1 = () => {
    const s1Errors = validateStep1();
    if (Object.keys(s1Errors).length > 0) {
      setFieldErrors(s1Errors);
      const firstErrorMsg = Object.values(s1Errors)[0];
      setServerError(`Step 1 Error: ${firstErrorMsg}`);
      showToast(firstErrorMsg, "error");
      const firstKey = Object.keys(s1Errors)[0];
      document.getElementById(`input-${firstKey}`)?.focus();
      return;
    }
    setFieldErrors({});
    setServerError(null);
    setActiveStep(2);
  };

  // Step 2 -> Step 3 transition
  const handleNextFromStep2 = () => {
    const s2Errors = validateStep2();
    if (Object.keys(s2Errors).length > 0) {
      setFieldErrors(s2Errors);
      const firstErrorMsg = Object.values(s2Errors)[0];
      setServerError(`Step 2 Error: ${firstErrorMsg}`);
      showToast(firstErrorMsg, "error");
      const firstKey = Object.keys(s2Errors)[0];
      document.getElementById(`input-${firstKey}`)?.focus();
      return;
    }
    setFieldErrors({});
    setServerError(null);
    setActiveStep(3);
  };

  // Submit Handler: Validates all steps, auto-switches to failing step with red outline if anything is missing!
  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { errors, failingStep } = validateAllSteps();
    if (failingStep !== null) {
      setFieldErrors(errors);
      setActiveStep(failingStep); // Automatically jump straight to the step containing the error!
      const firstErrorMsg = Object.values(errors)[0];
      setServerError(`Step ${failingStep} Error: ${firstErrorMsg}`);
      showToast(`Step ${failingStep}: ${firstErrorMsg}`, "error");

      setTimeout(() => {
        const firstKey = Object.keys(errors)[0];
        const targetElement = document.getElementById(`input-${firstKey}`);
        targetElement?.scrollIntoView({ behavior: "smooth", block: "center" });
        targetElement?.focus();
      }, 100);
      return;
    }

    setFieldErrors({});
    setServerError(null);

    try {
      setContractSubmitting(true);

      const ndaAttachment = ndaFile
        ? { url: URL.createObjectURL(ndaFile), name: ndaFile.name }
        : existingNda || undefined;
      const agreementAttachment = agreementFile
        ? { url: URL.createObjectURL(agreementFile), name: agreementFile.name }
        : existingAgreement || undefined;
      const newOtherAttachments = otherFiles.map((f) => ({
        url: URL.createObjectURL(f),
        name: f.name,
      }));
      const otherAttachments = [...existingOtherFiles, ...newOtherAttachments];

      const budgetNum = contractForm.budget !== "" ? parseFloat(contractForm.budget) || 0 : 0;

      const payload = {
        ...contractForm,
        budget: budgetNum,
        currency: contractForm.currency || "USD",
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
        showToast(editingContract ? "Contract updated successfully" : "Contract created successfully");
        setShowContractModal(false);
        fetchContracts();
      } else {
        const d = await res.json();
        const errorMessage = d.error || "Failed to save contract";
        setServerError(errorMessage);
        showToast(errorMessage, "error");

        // Map server error to specific step and field highlight
        const lower = errorMessage.toLowerCase();
        const detectedErrors: Record<string, string> = {};
        let targetStep: 1 | 2 | 3 = 1;

        if (lower.includes("receiver") || lower.includes("client")) {
          detectedErrors["receiver.name"] = errorMessage;
          targetStep = 1;
        } else if (lower.includes("sender")) {
          detectedErrors["sender.name"] = errorMessage;
          targetStep = 1;
        } else if (lower.includes("email") || lower.includes("pocemail")) {
          detectedErrors["pocEmail"] = errorMessage;
          targetStep = 2;
        } else if (lower.includes("pocname") || lower.includes("contact")) {
          detectedErrors["pocName"] = errorMessage;
          targetStep = 2;
        } else if (lower.includes("contracttype") || lower.includes("type")) {
          detectedErrors["contractType"] = errorMessage;
          targetStep = 2;
        }

        if (Object.keys(detectedErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...detectedErrors }));
          setActiveStep(targetStep);
          setTimeout(() => {
            const firstDetectedKey = Object.keys(detectedErrors)[0];
            const el = document.getElementById(`input-${firstDetectedKey}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            el?.focus();
          }, 100);
        }
      }
    } catch {
      setServerError("Network or server error while saving contract");
      showToast("Error saving contract. Please check network connection.", "error");
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

  const fmtBudget = (budget?: number, curr?: string) => {
    if (budget === undefined || budget === null || isNaN(budget) || budget === 0) {
      return "Standard";
    }
    return `${curr || "USD"} ${Number(budget).toLocaleString()}`;
  };

  // Helper to check if step 1 has errors
  const hasStep1Errors = !!(fieldErrors["sender.name"] || fieldErrors["receiver.name"]);
  // Helper to check if step 2 has errors
  const hasStep2Errors = !!(fieldErrors["pocName"] || fieldErrors["pocEmail"] || fieldErrors["contractType"] || fieldErrors["customTypeLabel"] || fieldErrors["endDate"]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-3 border",
            toast.type === "success"
              ? "bg-emerald-600 text-white border-emerald-500/30"
              : "bg-rose-600 text-white border-rose-500/30"
          )}
        >
          <i className={cn("fa-solid text-base", toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation")} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* EXTERNAL CLIENT CONTRACTS MAIN PANEL */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="space-y-5">
        {/* Header & Main Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-border/80 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm shadow-inner">
                <i className="fa-solid fa-file-signature" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                  External Client Contracts
                </h2>
                <p className="text-xs text-muted-foreground">
                  NDAs, master service agreements, and budgets with external accounts.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
              <Input
                placeholder="Search client, POC, ID..."
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                className="w-full sm:w-56 h-9 text-xs pl-8 pr-8 bg-background border-border/80 focus-visible:ring-primary/20"
              />
              {contractSearch && (
                <button
                  type="button"
                  onClick={() => setContractSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                  title="Clear search"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>

            {/* Contract Type Dropdown Filter */}
            <select
              value={contractTypeFilter}
              onChange={(e) => setContractTypeFilter(e.target.value as "All" | ContractType)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer font-medium text-foreground"
              title="Filter by contract type"
            >
              <option value="All">All Types</option>
              <option value="Ad_Hoc">⚡ Ad Hoc</option>
              <option value="Retainer">🔁 Retainer</option>
              <option value="Custom">⚙️ Custom</option>
            </select>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchContracts}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title="Refresh contracts"
            >
              <i className={cn("fa-solid fa-arrows-rotate text-xs", contractsLoading && "fa-spin")} />
            </Button>

            {/* View Mode Switcher: Cards vs Table */}
            <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5",
                  viewMode === "cards"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Cards view"
              >
                <i className="fa-solid fa-table-cells-large text-xs" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-2.5 py-1.5 rounded-md text-xs transition-all cursor-pointer flex items-center gap-1.5",
                  viewMode === "table"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Table view"
              >
                <i className="fa-solid fa-table-list text-xs" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>

            {/* New Contract Button */}
            {isManagerOrAdmin && (
              <Button
                size="sm"
                onClick={openCreateModal}
                className="gap-1.5 h-9 text-xs cursor-pointer shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 font-semibold"
              >
                <i className="fa-solid fa-plus text-xs" />
                <span>New Contract</span>
              </Button>
            )}
          </div>
        </div>

        {/* ── KPI Stats Bar (Clickable to Filter) ─────────────────────────── */}
        {!showContractModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Total Contracts */}
              <div
                onClick={() => { setContractStatusFilter("All"); setFilterExpiringOnly(false); }}
                className={cn(
                  "bg-card border rounded-2xl p-4 flex items-center gap-3.5 transition-all cursor-pointer select-none",
                  contractStatusFilter === "All" && !filterExpiringOnly
                    ? "border-primary shadow-sm ring-1 ring-primary/20 bg-primary/[0.02]"
                    : "border-border hover:border-primary/40 hover:shadow-sm"
                )}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-file-contract text-base" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground leading-none tabular-nums">{contracts.length}</p>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-1 flex items-center gap-1">
                    Total Contracts
                    {contractStatusFilter === "All" && !filterExpiringOnly && (
                      <span className="text-[9px] text-primary bg-primary/10 px-1 rounded font-bold">Active Filter</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Active Contracts */}
              <div
                onClick={() => { setContractStatusFilter("Active"); setFilterExpiringOnly(false); }}
                className={cn(
                  "bg-card border rounded-2xl p-4 flex items-center gap-3.5 transition-all cursor-pointer select-none",
                  contractStatusFilter === "Active" && !filterExpiringOnly
                    ? "border-emerald-500 shadow-sm ring-1 ring-emerald-500/20 bg-emerald-500/[0.02]"
                    : "border-border hover:border-emerald-500/40 hover:shadow-sm"
                )}
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-circle-check text-base" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground leading-none tabular-nums">
                    {contracts.filter((c) => c.status === "Active").length}
                  </p>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-1 flex items-center gap-1">
                    Active Contracts
                    {contractStatusFilter === "Active" && !filterExpiringOnly && (
                      <span className="text-[9px] text-emerald-600 bg-emerald-500/10 px-1 rounded font-bold">Active Filter</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Active Budget */}
              <div
                onClick={() => { setContractStatusFilter("Active"); setFilterExpiringOnly(false); }}
                className="bg-card border border-border hover:border-sky-500/40 rounded-2xl p-4 flex items-center gap-3.5 transition-all cursor-pointer select-none hover:shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-wallet text-base" />
                </div>
                <div className="min-w-0">
                  <p className="text-xl sm:text-2xl font-bold text-foreground leading-none tabular-nums truncate" title={`$${totalActiveBudget.toLocaleString()}`}>
                    {totalActiveBudget > 0 ? `$${totalActiveBudget.toLocaleString()}` : "$0"}
                  </p>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-1">Active Pipeline Value</p>
                </div>
              </div>

              {/* Expiring ≤30d */}
              <div
                onClick={() => setFilterExpiringOnly((prev) => !prev)}
                className={cn(
                  "bg-card border rounded-2xl p-4 flex items-center gap-3.5 transition-all cursor-pointer select-none",
                  filterExpiringOnly
                    ? "border-amber-500 shadow-sm ring-1 ring-amber-500/20 bg-amber-500/[0.02]"
                    : "border-border hover:border-amber-500/40 hover:shadow-sm"
                )}
              >
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-triangle-exclamation text-base" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-foreground leading-none tabular-nums">
                    {expiringContractsCount}
                  </p>
                  <p className="text-[11px] font-semibold text-muted-foreground mt-1 flex items-center gap-1">
                    Expiring ≤30d
                    {filterExpiringOnly && (
                      <span className="text-[9px] text-amber-600 bg-amber-500/10 px-1 rounded font-bold">Filtered</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Filter Pills with Live Item Counts */}
            <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
              <div className="flex gap-1.5 bg-muted/40 p-1 rounded-xl border border-border w-fit flex-wrap">
                {(["All", "Active", "Draft", "Expired", "Terminated"] as const).map((s) => {
                  const count = s === "All" ? contracts.length : contracts.filter((c) => c.status === s).length;
                  const isSelected = contractStatusFilter === s && !filterExpiringOnly;

                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setContractStatusFilter(s);
                        setFilterExpiringOnly(false);
                      }}
                      className={cn(
                        "h-7 text-xs px-2.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5",
                        isSelected
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span>{s}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active filters reminder */}
              {(contractStatusFilter !== "All" || contractTypeFilter !== "All" || filterExpiringOnly || contractSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setContractStatusFilter("All");
                    setContractTypeFilter("All");
                    setFilterExpiringOnly(false);
                    setContractSearch("");
                  }}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <i className="fa-solid fa-filter-circle-xmark text-[11px]" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            {/* Main Content: Cards or Table */}
            {contractsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-64 bg-card/60 rounded-2xl animate-pulse border border-border/50 p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="w-20 h-5 bg-muted rounded-md" />
                      <div className="w-16 h-5 bg-muted rounded-full" />
                    </div>
                    <div className="w-3/4 h-6 bg-muted rounded-md" />
                    <div className="w-1/2 h-4 bg-muted rounded-md" />
                    <div className="w-full h-14 bg-muted/60 rounded-xl" />
                    <div className="w-full h-8 bg-muted rounded-md mt-auto" />
                  </div>
                ))}
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3.5 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary text-xl shadow-inner">
                  <i className="fa-solid fa-file-contract" />
                </div>
                <h4 className="font-bold text-base text-foreground">No contracts found</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {contractSearch || contractStatusFilter !== "All" || contractTypeFilter !== "All" || filterExpiringOnly
                    ? "No contracts match your selected filters. Try broadening your search or resetting filters."
                    : "Create your first external client contract with scope, parties, budget, and attachments to get started."}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {(contractSearch || contractStatusFilter !== "All" || contractTypeFilter !== "All" || filterExpiringOnly) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setContractSearch("");
                        setContractStatusFilter("All");
                        setContractTypeFilter("All");
                        setFilterExpiringOnly(false);
                      }}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      <i className="fa-solid fa-rotate-left text-xs" /> Clear Filters
                    </Button>
                  ) : isManagerOrAdmin ? (
                    <Button size="sm" onClick={openCreateModal} className="gap-1.5 text-xs cursor-pointer font-semibold">
                      <i className="fa-solid fa-plus text-xs" /> New Contract
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : viewMode === "cards" ? (
              /* ── CARDS GRID VIEW ────────────────────────────────────────── */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                {filteredContracts.map((c) => {
                  const typeCfg   = CONTRACT_TYPE_CFG[c.contractType] || { cls: "bg-muted text-foreground border-border", label: c.contractType, icon: "fa-file" };
                  const statusCfg = CONTRACT_STATUS_CFG[c.status] || { cls: "bg-muted text-foreground border-border", icon: "fa-circle", dot: "bg-slate-400" };
                  const typeLabel = c.contractType === "Custom" && c.customTypeLabel ? c.customTypeLabel : typeCfg.label;
                  const daysRemaining = getDaysRemaining(c.endDate);
                  const isExpiringSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30 && c.status === "Active";
                  const attachmentCount = (c.ndaAttachment ? 1 : 0) + (c.agreementAttachment ? 1 : 0) + (c.otherAttachments?.length || 0);

                  return (
                    <div
                      key={c._id}
                      className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Top Accent line on hover */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/40 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="space-y-3.5">
                        {/* Top: Short ID + Status + Quick Actions */}
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(c._id, "Contract ID")}
                            className="font-mono text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 px-2.5 py-0.5 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                            title="Click to copy ID"
                          >
                            <span>#{c._id.slice(-6).toUpperCase()}</span>
                            <i className={cn("text-[9px]", copiedId === c._id ? "fa-solid fa-check text-emerald-500" : "fa-regular fa-copy opacity-60")} />
                          </button>

                          <div className="flex items-center gap-1.5">
                            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusCfg.cls)}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                              {c.status}
                            </span>

                            {isManagerOrAdmin && (
                              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openEditModal(c); }}
                                  className="w-7 h-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Edit contract"
                                >
                                  <i className="fa-solid fa-pen text-[10px]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setDeleteContractId(c._id); }}
                                  className="w-7 h-7 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Delete contract"
                                >
                                  <i className="fa-solid fa-trash text-[10px]" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Title & Organization Info */}
                        <div onClick={() => setViewContract(c)} className="cursor-pointer">
                          <div className="flex items-start justify-between gap-2">
                            <h4
                              className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1"
                              title={`${c.receiver?.name} — ${typeLabel}`}
                            >
                              {c.receiver?.name || "Client Contract"}
                            </h4>
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border shrink-0", typeCfg.cls)}>
                              <i className={`fa-solid ${typeCfg.icon} text-[8px]`} />
                              {typeLabel}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate">
                            <i className="fa-solid fa-building text-[10px] text-muted-foreground/60" />
                            <span>Issued by <strong className="text-foreground/80 font-medium">{c.sender?.name || "Our Company"}</strong></span>
                          </p>
                        </div>

                        {/* Dates & Timeline Block */}
                        <div className="bg-muted/30 border border-border/60 rounded-xl p-2.5 text-xs text-muted-foreground space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="flex items-center gap-1.5">
                              <i className="fa-regular fa-calendar text-muted-foreground/70" />
                              <span>{fmtDate(c.startDate)}</span>
                            </span>
                            <i className="fa-solid fa-arrow-right text-[10px] text-muted-foreground/40" />
                            <span className="flex items-center gap-1.5 font-medium text-foreground">
                              <i className="fa-regular fa-calendar-check text-muted-foreground/70" />
                              <span>{c.endDate ? fmtDate(c.endDate) : "Ongoing"}</span>
                            </span>
                          </div>

                          {/* Remaining / Expired badge */}
                          {c.endDate && (
                            <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">Timeline Status:</span>
                              {daysRemaining !== null && daysRemaining < 0 ? (
                                <span className="text-[10px] font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                                  Expired {Math.abs(daysRemaining)}d ago
                                </span>
                              ) : isExpiringSoon ? (
                                <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                                  {daysRemaining} days remaining
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  {daysRemaining} days left
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* POC Profile Sub-box */}
                        <div className="bg-muted/40 border border-border/70 rounded-xl p-2.5 flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 flex items-center justify-center shrink-0 font-bold text-xs uppercase shadow-2xs">
                            {(c.pocName?.[0] || c.receiver?.name?.[0] || "?").toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-xs font-semibold text-foreground truncate">{c.pocName}</p>
                              {c.mailSent ? (
                                <span title="Confirmation email sent" className="text-emerald-500 text-xs shrink-0">
                                  <i className="fa-solid fa-envelope-circle-check" />
                                </span>
                              ) : (
                                <span title="Confirmation email not sent" className="text-muted-foreground/40 text-xs shrink-0">
                                  <i className="fa-regular fa-envelope" />
                                </span>
                              )}
                            </div>
                            <p
                              onClick={(e) => { e.stopPropagation(); handleCopy(c.pocEmail, "POC Email"); }}
                              className="text-[11px] text-muted-foreground hover:text-primary transition-colors truncate cursor-pointer flex items-center gap-1"
                              title="Click to copy email"
                            >
                              <span>{c.pocEmail}</span>
                              <i className="fa-regular fa-copy text-[9px] opacity-60" />
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Footer: Budget Badge + Attachments + Action Button */}
                      <div className="flex items-center justify-between pt-3.5 border-t border-border/70 mt-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            <i className="fa-solid fa-wallet text-[10px]" />
                            <span>{fmtBudget(c.budget, c.currency)}</span>
                          </div>

                          {attachmentCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-medium bg-muted/60 px-2 py-0.5 rounded-md border border-border" title={`${attachmentCount} document attachments`}>
                              <i className="fa-solid fa-paperclip text-[10px]" />
                              <span>{attachmentCount}</span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewContract(c)}
                          className="w-8 h-8 rounded-lg border border-border bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 flex items-center justify-center text-muted-foreground transition-all cursor-pointer shadow-2xs"
                          title="View Contract Details"
                        >
                          <i className="fa-solid fa-arrow-right text-xs" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── TABLE VIEW ─────────────────────────────────────────────── */
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        {[
                          { h: "ID",        w: "min-w-[90px]" },
                          { h: "Client",    w: "min-w-[170px]" },
                          { h: "Sender",    w: "min-w-[130px]" },
                          { h: "Type",      w: "min-w-[110px]" },
                          { h: "POC Details", w: "min-w-[160px]" },
                          { h: "Timeline",  w: "min-w-[140px]" },
                          { h: "Budget",    w: "min-w-[120px]" },
                          { h: "Docs",      w: "min-w-[80px]" },
                          { h: "Status",    w: "min-w-[110px]" },
                          { h: "Actions",   w: "w-[90px] text-right" },
                        ].map(({ h, w }) => (
                          <th key={h} className={cn("text-left text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-4 py-3", w)}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredContracts.map((c) => {
                        const typeCfg   = CONTRACT_TYPE_CFG[c.contractType] || { cls: "bg-muted text-foreground border-border", label: c.contractType, icon: "fa-file" };
                        const statusCfg = CONTRACT_STATUS_CFG[c.status] || { cls: "bg-muted text-foreground border-border", icon: "fa-circle", dot: "bg-slate-400" };
                        const typeLabel = c.contractType === "Custom" && c.customTypeLabel ? c.customTypeLabel : typeCfg.label;
                        const daysRemaining = getDaysRemaining(c.endDate);
                        const isExpiringSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30 && c.status === "Active";
                        const attachmentCount = (c.ndaAttachment ? 1 : 0) + (c.agreementAttachment ? 1 : 0) + (c.otherAttachments?.length || 0);

                        return (
                          <tr
                            key={c._id}
                            className="hover:bg-muted/30 transition-colors group cursor-pointer"
                            onClick={() => setViewContract(c)}
                          >
                            {/* ID */}
                            <td className="px-4 py-3.5">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCopy(c._id, "Contract ID"); }}
                                className="font-mono text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                                title="Copy ID"
                              >
                                #{c._id.slice(-6).toUpperCase()}
                              </button>
                            </td>

                            {/* Client */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-bold text-primary">{(c.receiver?.name?.[0] ?? "?").toUpperCase()}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground text-sm leading-tight truncate">{c.receiver?.name}</p>
                                  {c.receiver?.city && (
                                    <p className="text-[11px] text-muted-foreground truncate">
                                      {c.receiver.city}{c.receiver.country ? `, ${c.receiver.country}` : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Sender */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <i className="fa-solid fa-building text-[10px] opacity-60" />
                                <span className="font-medium text-foreground/80 truncate max-w-[120px]">{c.sender?.name || "—"}</span>
                              </div>
                            </td>

                            {/* Type */}
                            <td className="px-4 py-3.5">
                              <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border", typeCfg.cls)}>
                                <i className={`fa-solid ${typeCfg.icon} text-[9px]`} />
                                {typeLabel}
                              </span>
                            </td>

                            {/* POC */}
                            <td className="px-4 py-3.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-foreground truncate">{c.pocName}</p>
                                  {c.mailSent ? (
                                    <span title="Confirmation mail dispatched" className="text-emerald-600 dark:text-emerald-400">
                                      <i className="fa-solid fa-envelope-circle-check text-xs" />
                                    </span>
                                  ) : (
                                    <span title="Mail not yet sent" className="text-muted-foreground/40">
                                      <i className="fa-regular fa-envelope text-xs" />
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">{c.pocEmail}</p>
                              </div>
                            </td>

                            {/* Period / Timeline */}
                            <td className="px-4 py-3.5">
                              {c.startDate || c.endDate ? (
                                <div className="space-y-0.5 text-[11px]">
                                  <p className="text-muted-foreground"><span className="text-foreground/70">From:</span> {fmtDate(c.startDate)}</p>
                                  <div className="flex items-center gap-1">
                                    <p className="text-muted-foreground"><span className="text-foreground/70">To:</span> {fmtDate(c.endDate)}</p>
                                    {isExpiringSoon && (
                                      <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded-full">
                                        Soon
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[11px] text-muted-foreground">—</p>
                              )}
                            </td>

                            {/* Budget */}
                            <td className="px-4 py-3.5">
                              <span className="font-bold text-xs text-foreground bg-muted/60 px-2 py-1 rounded-md border border-border/80">
                                {fmtBudget(c.budget, c.currency)}
                              </span>
                            </td>

                            {/* Attachments */}
                            <td className="px-4 py-3.5">
                              {attachmentCount > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground/80 bg-muted px-2 py-0.5 rounded-md border border-border">
                                  <i className="fa-solid fa-paperclip text-[10px] text-primary" />
                                  {attachmentCount}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5">
                              <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border", statusCfg.cls)}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                                {c.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => setViewContract(c)}
                                  title="View details"
                                  className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors cursor-pointer"
                                >
                                  <i className="fa-solid fa-eye text-xs" />
                                </button>
                                {isManagerOrAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(c)}
                                      title="Edit contract"
                                      className="w-7 h-7 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                    >
                                      <i className="fa-solid fa-pen text-xs" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteContractId(c._id)}
                                      title="Delete contract"
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

                {/* Table Footer */}
                <div className="px-4 py-3 border-t border-border/70 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                  <p>
                    Showing <strong className="text-foreground font-semibold">{filteredContracts.length}</strong> of{" "}
                    <strong className="text-foreground font-semibold">{contracts.length}</strong> contracts
                  </p>
                  <p className="hidden sm:block">Click any row to open the complete contract drawer</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW CONTRACT SLIDE-OVER DRAWER */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {viewContract && (
          <div className="fixed inset-0 z-[110] flex animate-in fade-in duration-150">
            <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setViewContract(null)} />
            <div className="w-full max-w-xl bg-background border-l border-border flex flex-col overflow-y-auto shadow-2xl animate-in slide-in-from-right-4 duration-200">

              {/* Header Banner */}
              <div className="relative overflow-hidden bg-muted/30 border-b border-border">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent pointer-events-none" />
                <div className="relative p-6 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center shrink-0 shadow-md">
                        <span className="text-xl font-black text-primary">
                          {(viewContract.receiver?.name?.[0] ?? "?").toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-foreground leading-tight">
                            {viewContract.receiver?.name || "Client Contract"}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                          <span>Ref:</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(viewContract._id, "Contract Reference ID")}
                            className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            #{viewContract._id}
                            <i className="fa-regular fa-copy text-[10px]" />
                          </button>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-8 h-8 rounded-lg bg-background/90 border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors shadow-2xs"
                        title="Print / Save summary"
                      >
                        <i className="fa-solid fa-print text-xs" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewContract(null)}
                        className="w-8 h-8 rounded-lg bg-background/90 border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors shadow-2xs"
                        title="Close drawer (Esc)"
                      >
                        <i className="fa-solid fa-xmark text-sm" />
                      </button>
                    </div>
                  </div>

                  {/* Badges Strip */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", CONTRACT_STATUS_CFG[viewContract.status]?.cls || "")}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", CONTRACT_STATUS_CFG[viewContract.status]?.dot)} />
                      {viewContract.status}
                    </span>

                    <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border", CONTRACT_TYPE_CFG[viewContract.contractType]?.cls || "")}>
                      <i className={`fa-solid ${CONTRACT_TYPE_CFG[viewContract.contractType]?.icon || "fa-file"} text-[9px]`} />
                      {viewContract.contractType === "Custom" && viewContract.customTypeLabel
                        ? viewContract.customTypeLabel
                        : (CONTRACT_TYPE_CFG[viewContract.contractType]?.label || viewContract.contractType)}
                    </span>

                    {viewContract.mailSent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        <i className="fa-solid fa-envelope-circle-check text-[10px]" /> Confirmation Sent
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleQuickSendMail(viewContract)}
                        disabled={isSendingQuickMail}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-sky-500/10 text-sky-600 border-sky-500/30 hover:bg-sky-500/20 transition-all cursor-pointer"
                        title="Click to dispatch confirmation email to client POC now"
                      >
                        <i className={cn("text-[10px]", isSendingQuickMail ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-paper-plane")} />
                        <span>Send Email Now</span>
                      </button>
                    )}

                    {viewContract.linkedInvoiceId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-blue-500/10 text-blue-600 border-blue-500/30">
                        <i className="fa-solid fa-file-invoice text-[9px]" /> Invoice Linked
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Content Body */}
              <div className="p-6 space-y-5 flex-1">
                {/* Budget & Financial Value Box */}
                <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4.5 flex items-center justify-between shadow-2xs">
                  <div>
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Contract Budget / Total Value</p>
                    <p className="text-2xl font-black text-foreground mt-0.5 tracking-tight">
                      {fmtBudget(viewContract.budget, viewContract.currency)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg shadow-inner">
                    <i className="fa-solid fa-wallet" />
                  </div>
                </div>

                {/* Quick Status Control */}
                {isManagerOrAdmin && (
                  <div className="bg-muted/30 border border-border/80 rounded-xl p-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-arrows-spin text-primary" /> Update Status:
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(["Draft", "Active", "Expired", "Terminated"] as ContractStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={isUpdatingQuickStatus || viewContract.status === st}
                          onClick={() => handleQuickStatusChange(viewContract._id, st)}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer",
                            viewContract.status === st
                              ? "bg-foreground text-background border-foreground shadow-xs font-bold"
                              : "bg-background text-muted-foreground hover:text-foreground border-border hover:border-border/80"
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contract Period / Dates */}
                <div className="bg-muted/30 rounded-xl p-4 border border-border/80">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <i className="fa-regular fa-calendar-days text-primary" /> Timeline & Duration
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-[10px] text-muted-foreground font-semibold">START DATE</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{fmtDate(viewContract.startDate)}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <i className="fa-solid fa-arrow-right text-muted-foreground/40 text-xs" />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-[10px] text-muted-foreground font-semibold">END DATE</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{fmtDate(viewContract.endDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Parties (Sender & Receiver Grid) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Sender (Our Company) */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fa-solid fa-building-user text-primary" /> Sender (Our Co.)
                      </p>
                    </div>
                    <p className="font-bold text-foreground text-sm">{viewContract.sender?.name || "—"}</p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {viewContract.sender?.address && (
                        <p className="flex items-start gap-1.5">
                          <i className="fa-solid fa-location-dot w-3.5 mt-0.5 text-muted-foreground/70" />
                          <span>{viewContract.sender.address}{viewContract.sender.city ? `, ${viewContract.sender.city}` : ""}{viewContract.sender.country ? `, ${viewContract.sender.country}` : ""}</span>
                        </p>
                      )}
                      {viewContract.sender?.email && (
                        <p className="flex items-center gap-1.5">
                          <i className="fa-solid fa-envelope w-3.5 text-muted-foreground/70" />
                          <span>{viewContract.sender.email}</span>
                        </p>
                      )}
                      {viewContract.sender?.phone && (
                        <p className="flex items-center gap-1.5">
                          <i className="fa-solid fa-phone w-3.5 text-muted-foreground/70" />
                          <span>{viewContract.sender.phone}</span>
                        </p>
                      )}
                      {viewContract.sender?.taxId && (
                        <p className="flex items-center gap-1.5">
                          <i className="fa-solid fa-receipt w-3.5 text-muted-foreground/70" />
                          <span>Tax/GST: {viewContract.sender.taxId}</span>
                        </p>
                      )}
                      {viewContract.sender?.website && (
                        <a
                          href={viewContract.sender.website.startsWith("http") ? viewContract.sender.website : `https://${viewContract.sender.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-primary hover:underline font-medium"
                        >
                          <i className="fa-solid fa-globe w-3.5" />
                          <span>{viewContract.sender.website}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Receiver (Client Company) */}
                  <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fa-solid fa-handshake text-emerald-500" /> Client (Receiver)
                      </p>
                    </div>
                    <p className="font-bold text-foreground text-sm">{viewContract.receiver?.name || "—"}</p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {viewContract.receiver?.address && (
                        <p className="flex items-start gap-1.5">
                          <i className="fa-solid fa-location-dot w-3.5 mt-0.5 text-muted-foreground/70" />
                          <span>{viewContract.receiver.address}{viewContract.receiver.city ? `, ${viewContract.receiver.city}` : ""}{viewContract.receiver.country ? `, ${viewContract.receiver.country}` : ""}</span>
                        </p>
                      )}
                      {viewContract.receiver?.email && (
                        <p className="flex items-center gap-1.5">
                          <i className="fa-solid fa-envelope w-3.5 text-muted-foreground/70" />
                          <span>{viewContract.receiver.email}</span>
                        </p>
                      )}
                      {viewContract.receiver?.phone && (
                        <p className="flex items-center gap-1.5">
                          <i className="fa-solid fa-phone w-3.5 text-muted-foreground/70" />
                          <span>{viewContract.receiver.phone}</span>
                        </p>
                      )}
                      {viewContract.receiver?.taxId && (
                        <p className="flex items-center gap-1.5">
                          <i className="fa-solid fa-receipt w-3.5 text-muted-foreground/70" />
                          <span>Tax/GST: {viewContract.receiver.taxId}</span>
                        </p>
                      )}
                      {viewContract.receiver?.website && (
                        <a
                          href={viewContract.receiver.website.startsWith("http") ? viewContract.receiver.website : `https://${viewContract.receiver.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-primary hover:underline font-medium"
                        >
                          <i className="fa-solid fa-globe w-3.5" />
                          <span>{viewContract.receiver.website}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Point of Contact Box */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-2xs">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-user-tie text-violet-500" /> Authorized Point of Contact
                  </p>
                  <p className="font-bold text-foreground text-sm">{viewContract.pocName}</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    <a
                      href={`mailto:${viewContract.pocEmail}`}
                      className="flex items-center gap-1.5 text-primary hover:underline font-medium"
                    >
                      <i className="fa-solid fa-envelope" />
                      <span>{viewContract.pocEmail}</span>
                    </a>
                    {viewContract.pocPhone && (
                      <a
                        href={`tel:${viewContract.pocPhone}`}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
                      >
                        <i className="fa-solid fa-phone" />
                        <span>{viewContract.pocPhone}</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopy(viewContract.pocEmail, "POC Email")}
                      className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
                      title="Copy email"
                    >
                      <i className="fa-regular fa-copy text-[10px]" /> Copy
                    </button>
                  </div>
                </div>

                {/* Attachments Section */}
                {(viewContract.ndaAttachment || viewContract.agreementAttachment || (viewContract.otherAttachments?.length ?? 0) > 0) && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <i className="fa-solid fa-paperclip text-primary" /> Contract Documents & Attachments
                    </p>
                    <div className="space-y-2">
                      {viewContract.ndaAttachment && (
                        <a
                          href={viewContract.ndaAttachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 text-xs text-foreground bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 hover:bg-muted/70 transition-all group"
                        >
                          <i className="fa-solid fa-file-shield text-rose-500 text-sm shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-foreground block">Non-Disclosure Agreement (NDA)</span>
                            <span className="text-[11px] text-muted-foreground truncate block">{viewContract.ndaAttachment.name}</span>
                          </div>
                          <i className="fa-solid fa-arrow-up-right-from-square text-muted-foreground/60 group-hover:text-primary transition-colors text-xs" />
                        </a>
                      )}

                      {viewContract.agreementAttachment && (
                        <a
                          href={viewContract.agreementAttachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 text-xs text-foreground bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 hover:bg-muted/70 transition-all group"
                        >
                          <i className="fa-solid fa-file-contract text-blue-500 text-sm shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-foreground block">Master Agreement Document</span>
                            <span className="text-[11px] text-muted-foreground truncate block">{viewContract.agreementAttachment.name}</span>
                          </div>
                          <i className="fa-solid fa-arrow-up-right-from-square text-muted-foreground/60 group-hover:text-primary transition-colors text-xs" />
                        </a>
                      )}

                      {viewContract.otherAttachments?.map((at, i) => (
                        <a
                          key={i}
                          href={at.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 text-xs text-foreground bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 hover:bg-muted/70 transition-all group"
                        >
                          <i className="fa-solid fa-file-lines text-amber-500 text-sm shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-foreground block truncate">{at.name}</span>
                            <span className="text-[11px] text-muted-foreground block">Additional Attachment #{i + 1}</span>
                          </div>
                          <i className="fa-solid fa-arrow-up-right-from-square text-muted-foreground/60 group-hover:text-primary transition-colors text-xs" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {viewContract.notes && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Internal Notes</p>
                    <p className="text-xs text-foreground bg-muted/30 rounded-xl p-3.5 leading-relaxed border border-border/70 whitespace-pre-wrap">
                      {viewContract.notes}
                    </p>
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="text-[11px] text-muted-foreground/70 flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-regular fa-clock" /> Created {fmtDate(viewContract.createdAt)}
                    {viewContract.createdBy && ` by ${viewContract.createdBy.name}`}
                  </span>
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              {isManagerOrAdmin && (
                <div className="p-4 border-t border-border flex items-center gap-2.5 bg-background/95 sticky bottom-0">
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 cursor-pointer font-semibold shadow-xs"
                    onClick={() => { setViewContract(null); openEditModal(viewContract); }}
                  >
                    <i className="fa-solid fa-pen text-xs" />
                    <span>Edit Contract</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 cursor-pointer text-rose-500 hover:text-rose-600 border-rose-200 hover:bg-rose-500/10"
                    onClick={() => { setViewContract(null); setDeleteContractId(viewContract._id); }}
                    title="Delete contract"
                  >
                    <i className="fa-solid fa-trash text-xs" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MULTI-STEP CREATE / EDIT FORM MODAL (WITH ERROR HIGHLIGHTING & WIZARD) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {showContractModal && (
          <div className="bg-card border border-border rounded-2xl animate-in slide-in-from-top-2 duration-200 shadow-2xl overflow-hidden">
            {/* Form Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm shadow-inner">
                  <i className="fa-solid fa-file-signature" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    {editingContract ? "Edit Client Contract" : "New External Client Contract"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Step-by-step workflow: Company Parties → Terms & Contact → Documents & Delivery
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                title="Discard and close"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Stepper Progress Wizard Bar */}
            <div className="px-6 py-3 border-b border-border/60 bg-muted/10">
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {/* Step 1: Parties */}
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl text-left transition-all cursor-pointer border text-xs",
                    activeStep === 1
                      ? "bg-background border-primary shadow-xs ring-1 ring-primary/20 text-foreground font-bold"
                      : "bg-muted/30 border-border/80 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                      hasStep1Errors
                        ? "bg-rose-500 text-white"
                        : activeStep === 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {hasStep1Errors ? (
                      <i className="fa-solid fa-exclamation" />
                    ) : (
                      "1"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate leading-tight">1. Parties</p>
                    <p className="text-[10px] text-muted-foreground font-normal hidden sm:block truncate">
                      {hasStep1Errors ? "Missing fields" : "Sender & Receiver"}
                    </p>
                  </div>
                </button>

                {/* Step 2: Terms & Contact */}
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl text-left transition-all cursor-pointer border text-xs",
                    activeStep === 2
                      ? "bg-background border-primary shadow-xs ring-1 ring-primary/20 text-foreground font-bold"
                      : "bg-muted/30 border-border/80 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                      hasStep2Errors
                        ? "bg-rose-500 text-white"
                        : activeStep === 2
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {hasStep2Errors ? (
                      <i className="fa-solid fa-exclamation" />
                    ) : (
                      "2"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate leading-tight">2. Terms & Contact</p>
                    <p className="text-[10px] text-muted-foreground font-normal hidden sm:block truncate">
                      {hasStep2Errors ? "Missing fields" : "Scope, Budget & POC"}
                    </p>
                  </div>
                </button>

                {/* Step 3: Documents & Delivery */}
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl text-left transition-all cursor-pointer border text-xs",
                    activeStep === 3
                      ? "bg-background border-primary shadow-xs ring-1 ring-primary/20 text-foreground font-bold"
                      : "bg-muted/30 border-border/80 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0",
                      activeStep === 3
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    3
                  </div>
                  <div className="min-w-0">
                    <p className="truncate leading-tight">3. Docs & Delivery</p>
                    <p className="text-[10px] text-muted-foreground font-normal hidden sm:block truncate">
                      Files & Workflows
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleContractSubmit} noValidate className="p-6 space-y-6">

              {/* Global Error Banner */}
              {serverError && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl p-4 text-xs flex items-center justify-between gap-3 animate-in fade-in shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center shrink-0 text-rose-500">
                      <i className="fa-solid fa-triangle-exclamation text-sm" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Cannot proceed with contract</p>
                      <p className="text-[12px] opacity-90 mt-0.5">{serverError}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setServerError(null)}
                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    title="Dismiss alert"
                  >
                    <i className="fa-solid fa-xmark text-sm" />
                  </button>
                </div>
              )}

              {/* ── STEP 1: COMPANY PARTIES (SENDER & RECEIVER) ── */}
              {activeStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* SENDER (Our Company / Issuing Party) */}
                    <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-5 shadow-2xs">
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs shadow-inner">
                            <i className="fa-solid fa-building-user" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Sender Details</h4>
                            <p className="text-[11px] text-muted-foreground">Your company / issuing party *</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoPickOrg}
                          className="text-[11px] font-semibold text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 border border-primary/25 px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                          title="Auto-fill with Organization Details"
                        >
                          <i className="fa-solid fa-wand-magic-sparkles text-[10px]" />
                          <span>Auto-pick Org</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Company Name */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-building text-[10px] text-primary" />
                            <span>Company Name</span>
                            <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <Input
                            id="input-sender.name"
                            placeholder="e.g. NexAce Technologies Ltd."
                            value={contractForm.sender.name}
                            onChange={(e) => {
                              clearFieldError("sender.name");
                              setContractForm((f) => ({ ...f, sender: { ...f.sender, name: e.target.value } }));
                            }}
                            className={cn(
                              "h-9 text-sm transition-colors",
                              fieldErrors["sender.name"] && "border-rose-500 focus-visible:ring-rose-500/20 bg-rose-500/[0.02]"
                            )}
                          />
                          {fieldErrors["sender.name"] && (
                            <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                              <i className="fa-solid fa-circle-exclamation text-[10px]" />
                              <span>{fieldErrors["sender.name"]}</span>
                            </p>
                          )}
                        </div>

                        {/* Address */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-location-dot text-[10px]" /> Office Address
                          </label>
                          <Input
                            placeholder="Street / Building / Suite"
                            value={contractForm.sender.address}
                            onChange={(e) => setContractForm((f) => ({ ...f, sender: { ...f.sender, address: e.target.value } }))}
                            className="h-9 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-city text-[10px]" /> City
                            </label>
                            <Input
                              placeholder="e.g. Mumbai"
                              value={contractForm.sender.city}
                              onChange={(e) => setContractForm((f) => ({ ...f, sender: { ...f.sender, city: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-earth-americas text-[10px]" /> Country
                            </label>
                            <Input
                              placeholder="e.g. India"
                              value={contractForm.sender.country}
                              onChange={(e) => setContractForm((f) => ({ ...f, sender: { ...f.sender, country: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-phone text-[10px]" /> Phone
                            </label>
                            <Input
                              placeholder="+91 98765 43210"
                              value={contractForm.sender.phone}
                              onChange={(e) => setContractForm((f) => ({ ...f, sender: { ...f.sender, phone: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-envelope text-[10px]" /> Email
                            </label>
                            <Input
                              type="email"
                              placeholder="ops@ourcompany.com"
                              value={contractForm.sender.email}
                              onChange={(e) => setContractForm((f) => ({ ...f, sender: { ...f.sender, email: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-receipt text-[10px]" /> GST / Tax ID
                            </label>
                            <Input
                              placeholder="27AAACN0000A1Z5"
                              value={contractForm.sender.taxId}
                              onChange={(e) => setContractForm((f) => ({ ...f, sender: { ...f.sender, taxId: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-globe text-[10px]" /> Website
                            </label>
                            <Input
                              placeholder="https://ourcompany.com"
                              value={contractForm.sender.website}
                              onChange={(e) => setContractForm((f) => ({ ...f, sender: { ...f.sender, website: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RECEIVER (Client Company / Receiving Party) */}
                    <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-5 shadow-2xs">
                      <div className="flex items-center gap-2.5 pb-3 border-b border-border">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs shadow-inner">
                          <i className="fa-solid fa-handshake" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Receiver Details</h4>
                          <p className="text-[11px] text-muted-foreground">Client company / receiving party *</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Client Company Name */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-building text-[10px] text-emerald-500" />
                            <span>Client Company Name</span>
                            <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <Input
                            id="input-receiver.name"
                            placeholder="e.g. Acme Corporation"
                            value={contractForm.receiver.name}
                            onChange={(e) => {
                              clearFieldError("receiver.name");
                              setContractForm((f) => ({ ...f, receiver: { ...f.receiver, name: e.target.value } }));
                            }}
                            className={cn(
                              "h-9 text-sm transition-colors",
                              fieldErrors["receiver.name"] && "border-rose-500 focus-visible:ring-rose-500/20 bg-rose-500/[0.02]"
                            )}
                          />
                          {fieldErrors["receiver.name"] && (
                            <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                              <i className="fa-solid fa-circle-exclamation text-[10px]" />
                              <span>{fieldErrors["receiver.name"]}</span>
                            </p>
                          )}
                        </div>

                        {/* Client Address */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-location-dot text-[10px]" /> Client Office Address
                          </label>
                          <Input
                            placeholder="Street / Building / Suite"
                            value={contractForm.receiver.address}
                            onChange={(e) => setContractForm((f) => ({ ...f, receiver: { ...f.receiver, address: e.target.value } }))}
                            className="h-9 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-city text-[10px]" /> City
                            </label>
                            <Input
                              placeholder="e.g. New York"
                              value={contractForm.receiver.city}
                              onChange={(e) => setContractForm((f) => ({ ...f, receiver: { ...f.receiver, city: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-earth-americas text-[10px]" /> Country
                            </label>
                            <Input
                              placeholder="e.g. USA"
                              value={contractForm.receiver.country}
                              onChange={(e) => setContractForm((f) => ({ ...f, receiver: { ...f.receiver, country: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-phone text-[10px]" /> Phone
                            </label>
                            <Input
                              placeholder="+1 555 0100"
                              value={contractForm.receiver.phone}
                              onChange={(e) => setContractForm((f) => ({ ...f, receiver: { ...f.receiver, phone: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-envelope text-[10px]" /> Email
                            </label>
                            <Input
                              type="email"
                              placeholder="billing@acmecorp.com"
                              value={contractForm.receiver.email}
                              onChange={(e) => setContractForm((f) => ({ ...f, receiver: { ...f.receiver, email: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-receipt text-[10px]" /> GST / Tax ID
                            </label>
                            <Input
                              placeholder="Tax / VAT identifier"
                              value={contractForm.receiver.taxId}
                              onChange={(e) => setContractForm((f) => ({ ...f, receiver: { ...f.receiver, taxId: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                              <i className="fa-solid fa-globe text-[10px]" /> Website
                            </label>
                            <Input
                              placeholder="https://acmecorp.com"
                              value={contractForm.receiver.website}
                              onChange={(e) => setContractForm((f) => ({ ...f, receiver: { ...f.receiver, website: e.target.value } }))}
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 1 Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowContractModal(false)}
                      className="cursor-pointer"
                    >
                      Discard
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleNextFromStep1}
                      className="gap-1.5 cursor-pointer font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    >
                      <span>Next: Terms & Contact</span>
                      <i className="fa-solid fa-arrow-right text-xs" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 2: SCOPE, BUDGET & POC CONTACT ── */}
              {activeStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Point of Contact Box */}
                    <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-5 shadow-2xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 border-b border-border pb-2.5">
                        <i className="fa-solid fa-user-tie text-violet-500" /> Authorized Point of Contact (POC)
                      </h4>

                      <div className="space-y-3">
                        {/* POC Name */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-user-tie text-[10px] text-violet-500" />
                            <span>POC Full Name</span>
                            <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <Input
                            id="input-pocName"
                            placeholder="e.g. John Doe (Client Manager)"
                            value={contractForm.pocName}
                            onChange={(e) => {
                              clearFieldError("pocName");
                              setContractForm((f) => ({ ...f, pocName: e.target.value }));
                            }}
                            className={cn(
                              "h-9 text-sm transition-colors",
                              fieldErrors["pocName"] && "border-rose-500 focus-visible:ring-rose-500/20 bg-rose-500/[0.02]"
                            )}
                          />
                          {fieldErrors["pocName"] && (
                            <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                              <i className="fa-solid fa-circle-exclamation text-[10px]" />
                              <span>{fieldErrors["pocName"]}</span>
                            </p>
                          )}
                        </div>

                        {/* POC Email */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-envelope text-[10px] text-violet-500" />
                            <span>POC Email Address</span>
                            <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <Input
                            id="input-pocEmail"
                            type="email"
                            placeholder="john@clientcorp.com"
                            value={contractForm.pocEmail}
                            onChange={(e) => {
                              clearFieldError("pocEmail");
                              setContractForm((f) => ({ ...f, pocEmail: e.target.value }));
                            }}
                            className={cn(
                              "h-9 text-sm transition-colors",
                              fieldErrors["pocEmail"] && "border-rose-500 focus-visible:ring-rose-500/20 bg-rose-500/[0.02]"
                            )}
                          />
                          {fieldErrors["pocEmail"] && (
                            <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                              <i className="fa-solid fa-circle-exclamation text-[10px]" />
                              <span>{fieldErrors["pocEmail"]}</span>
                            </p>
                          )}
                        </div>

                        {/* POC Phone */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-phone text-[10px]" /> POC Phone Number
                          </label>
                          <Input
                            placeholder="+1 555 0199 (optional)"
                            value={contractForm.pocPhone}
                            onChange={(e) => setContractForm((f) => ({ ...f, pocPhone: e.target.value }))}
                            className="h-9 text-sm"
                          />
                        </div>

                        {/* Location */}
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-location-dot text-[10px]" /> Operating Location
                          </label>
                          <Input
                            placeholder="City, Country (e.g. San Francisco, USA)"
                            value={contractForm.location}
                            onChange={(e) => setContractForm((f) => ({ ...f, location: e.target.value }))}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Scope & Terms Box */}
                    <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-5 shadow-2xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 border-b border-border pb-2.5">
                        <i className="fa-solid fa-file-invoice-dollar text-primary" /> Scope, Timeline & Budget
                      </h4>

                      <div className="space-y-3">
                        {/* Contract Type */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <span>Contract Type</span>
                            <span className="text-rose-500 font-bold">*</span>
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {(["Ad_Hoc", "Retainer", "Custom"] as ContractType[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  clearFieldError("contractType");
                                  setContractForm((f) => ({ ...f, contractType: t }));
                                }}
                                className={cn(
                                  "h-9 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center justify-center gap-1.5",
                                  contractForm.contractType === t
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                    : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                                )}
                              >
                                <i className={`fa-solid ${CONTRACT_TYPE_CFG[t].icon} text-xs`} />
                                <span>{CONTRACT_TYPE_CFG[t].label}</span>
                              </button>
                            ))}
                          </div>
                          {contractForm.contractType === "Custom" && (
                            <div className="space-y-1 pt-1">
                              <Input
                                id="input-customTypeLabel"
                                placeholder="Custom type label (e.g. Milestone-based Delivery)"
                                value={contractForm.customTypeLabel}
                                onChange={(e) => {
                                  clearFieldError("customTypeLabel");
                                  setContractForm((f) => ({ ...f, customTypeLabel: e.target.value }));
                                }}
                                className={cn(
                                  "h-8 text-xs",
                                  fieldErrors["customTypeLabel"] && "border-rose-500 focus-visible:ring-rose-500/20 bg-rose-500/[0.02]"
                                )}
                              />
                              {fieldErrors["customTypeLabel"] && (
                                <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-0.5">
                                  <i className="fa-solid fa-circle-exclamation text-[10px]" />
                                  <span>{fieldErrors["customTypeLabel"]}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Budget with quick increments */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <i className="fa-solid fa-wallet text-sky-500 text-[11px]" />
                              <span>Contract Budget / Value</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground">Quick add chips:</span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <select
                              value={contractForm.currency}
                              onChange={(e) => setContractForm((f) => ({ ...f, currency: e.target.value }))}
                              className="h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer font-medium"
                            >
                              <option value="USD">USD ($)</option>
                              <option value="INR">INR (₹)</option>
                              <option value="EUR">EUR (€)</option>
                              <option value="GBP">GBP (£)</option>
                              <option value="CAD">CAD ($)</option>
                              <option value="AUD">AUD ($)</option>
                              <option value="AED">AED (د.إ)</option>
                            </select>
                            <div className="sm:col-span-3">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="e.g. 50000"
                                value={contractForm.budget}
                                onChange={(e) => setContractForm((f) => ({ ...f, budget: e.target.value }))}
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>

                          {/* Quick budget chip increments */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {[1000, 5000, 10000, 25000, 50000].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => {
                                  const cur = parseFloat(contractForm.budget) || 0;
                                  setContractForm((f) => ({ ...f, budget: String(cur + amt) }));
                                }}
                                className="text-[10px] font-semibold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md border border-border transition-colors cursor-pointer"
                              >
                                +${amt.toLocaleString()}
                              </button>
                            ))}
                            {contractForm.budget && (
                              <button
                                type="button"
                                onClick={() => setContractForm((f) => ({ ...f, budget: "" }))}
                                className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 px-1.5 py-0.5 cursor-pointer ml-auto"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">Start Date</label>
                            <Input
                              type="date"
                              value={contractForm.startDate}
                              onChange={(e) => {
                                clearFieldError("endDate");
                                setContractForm((f) => ({ ...f, startDate: e.target.value }));
                              }}
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted-foreground">End Date</label>
                            <Input
                              id="input-endDate"
                              type="date"
                              value={contractForm.endDate}
                              onChange={(e) => {
                                clearFieldError("endDate");
                                setContractForm((f) => ({ ...f, endDate: e.target.value }));
                              }}
                              className={cn(
                                "h-9 text-sm",
                                fieldErrors["endDate"] && "border-rose-500 focus-visible:ring-rose-500/20 bg-rose-500/[0.02]"
                              )}
                            />
                            {fieldErrors["endDate"] && (
                              <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1 animate-in fade-in">
                                <i className="fa-solid fa-circle-exclamation text-[10px]" />
                                <span>{fieldErrors["endDate"]}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Selection */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-xs font-semibold text-muted-foreground">Initial Status</label>
                          <div className="flex gap-1.5 flex-wrap">
                            {(["Draft", "Active", "Expired", "Terminated"] as ContractStatus[]).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setContractForm((f) => ({ ...f, status: s }))}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5",
                                  contractForm.status === s
                                    ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                                )}
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full", CONTRACT_STATUS_CFG[s].dot)} />
                                <span>{s}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveStep(1)}
                      className="gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-left text-xs" />
                      <span>Back: Parties</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleNextFromStep2}
                      className="gap-1.5 cursor-pointer font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    >
                      <span>Next: Docs & Delivery</span>
                      <i className="fa-solid fa-arrow-right text-xs" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: DOCUMENTS, NOTES & AUTOMATION ── */}
              {activeStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* File Uploads Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* NDA */}
                    <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-file-shield text-rose-500" /> NDA Document
                        </label>
                        {(ndaFile || existingNda) && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded">Attached</span>
                        )}
                      </div>

                      {ndaFile || existingNda ? (
                        <div className="w-full min-h-[60px] border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <i className="fa-solid fa-circle-check text-emerald-500 text-sm shrink-0" />
                            <span className="truncate font-medium text-foreground">{ndaFile?.name || existingNda?.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setNdaFile(null); setExistingNda(null); }}
                            className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer shrink-0 transition-colors"
                            title="Remove NDA"
                          >
                            <i className="fa-solid fa-xmark text-xs" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => ndaRef.current?.click()}
                          className="w-full min-h-[60px] border-2 border-dashed border-border rounded-xl text-xs flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-primary/40 transition-all cursor-pointer p-3"
                        >
                          <i className="fa-solid fa-cloud-arrow-up text-sm text-primary" />
                          <span className="font-semibold">Upload NDA</span>
                          <span className="text-[10px] text-muted-foreground">PDF, DOCX up to 10MB</span>
                        </button>
                      )}
                      <input ref={ndaRef} type="file" className="hidden" onChange={(e) => setNdaFile(e.target.files?.[0] || null)} />
                    </div>

                    {/* Agreement */}
                    <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-file-contract text-blue-500" /> Master Agreement
                        </label>
                        {(agreementFile || existingAgreement) && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded">Attached</span>
                        )}
                      </div>

                      {agreementFile || existingAgreement ? (
                        <div className="w-full min-h-[60px] border border-emerald-500/30 bg-emerald-500/5 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <i className="fa-solid fa-circle-check text-emerald-500 text-sm shrink-0" />
                            <span className="truncate font-medium text-foreground">{agreementFile?.name || existingAgreement?.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setAgreementFile(null); setExistingAgreement(null); }}
                            className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer shrink-0 transition-colors"
                            title="Remove Agreement"
                          >
                            <i className="fa-solid fa-xmark text-xs" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => agreementRef.current?.click()}
                          className="w-full min-h-[60px] border-2 border-dashed border-border rounded-xl text-xs flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-primary/40 transition-all cursor-pointer p-3"
                        >
                          <i className="fa-solid fa-cloud-arrow-up text-sm text-primary" />
                          <span className="font-semibold">Upload Agreement</span>
                          <span className="text-[10px] text-muted-foreground">PDF, DOCX up to 25MB</span>
                        </button>
                      )}
                      <input ref={agreementRef} type="file" className="hidden" onChange={(e) => setAgreementFile(e.target.files?.[0] || null)} />
                    </div>

                    {/* Others — multi-doc */}
                    <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <i className="fa-solid fa-paperclip text-amber-500" /> Additional Docs
                        </label>
                        {(existingOtherFiles.length + otherFiles.length) > 0 && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            {existingOtherFiles.length + otherFiles.length} file{existingOtherFiles.length + otherFiles.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => othersRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOther(true); }}
                        onDragLeave={() => setIsDraggingOther(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingOther(false);
                          const dropped = Array.from(e.dataTransfer.files || []);
                          setOtherFiles((prev) => [...prev, ...dropped]);
                        }}
                        className={cn(
                          "w-full min-h-[60px] border-2 border-dashed rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer p-3",
                          isDraggingOther
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-primary/40"
                        )}
                      >
                        <i className="fa-solid fa-plus text-sm text-primary" />
                        <span className="font-semibold">Attach Multiple Docs</span>
                        <span className="text-[10px] text-muted-foreground">Click or drop files here</span>
                      </button>

                      <input
                        ref={othersRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files || []);
                          setOtherFiles((prev) => [...prev, ...newFiles]);
                          if (othersRef.current) othersRef.current.value = "";
                        }}
                      />

                      {(existingOtherFiles.length > 0 || otherFiles.length > 0) && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 pt-1">
                          {existingOtherFiles.map((doc, i) => (
                            <div key={`existing-${i}`} className="flex items-center gap-2 text-[11px] bg-background border border-border rounded-lg px-2.5 py-1.5 shadow-2xs">
                              <i className="fa-solid fa-paperclip text-amber-500 shrink-0" />
                              <span className="flex-1 text-foreground truncate font-medium">{doc.name}</span>
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded shrink-0">Saved</span>
                              <button
                                type="button"
                                onClick={() => setExistingOtherFiles((prev) => prev.filter((_, j) => j !== i))}
                                className="text-muted-foreground hover:text-rose-500 cursor-pointer shrink-0"
                                title="Remove file"
                              >
                                <i className="fa-solid fa-xmark text-xs" />
                              </button>
                            </div>
                          ))}
                          {otherFiles.map((f, i) => (
                            <div key={`new-${i}`} className="flex items-center gap-2 text-[11px] bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-1.5 shadow-2xs">
                              <i className="fa-solid fa-file-arrow-up text-primary shrink-0" />
                              <span className="flex-1 text-foreground truncate font-medium">{f.name}</span>
                              <span className="text-[9px] text-muted-foreground shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                              <button
                                type="button"
                                onClick={() => setOtherFiles((prev) => prev.filter((_, j) => j !== i))}
                                className="text-muted-foreground hover:text-rose-500 cursor-pointer shrink-0"
                                title="Remove file"
                              >
                                <i className="fa-solid fa-xmark text-xs" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Internal Contract Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Add key milestones, renewal terms, custom SLA conditions..."
                      value={contractForm.notes}
                      onChange={(e) => setContractForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 font-normal leading-relaxed"
                    />
                  </div>

                  {/* Automation & Delivery Strip */}
                  <div className="bg-muted/30 border border-border/80 rounded-2xl p-4.5 space-y-4 shadow-2xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2 border-b border-border/60 pb-2">
                      <i className="fa-solid fa-bolt text-primary" /> Delivery & Workflows
                    </h4>

                    {/* Notify on Create */}
                    <label className="flex items-center justify-between cursor-pointer gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">In-App Alerts</p>
                        <p className="text-xs text-muted-foreground">Send real-time in-app notification to Admin and Operations team</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={contractForm.notifyOnCreate}
                        onClick={() => setContractForm((f) => ({ ...f, notifyOnCreate: !f.notifyOnCreate }))}
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
                    <label className="flex items-center justify-between cursor-pointer gap-4 pt-3 border-t border-border/50">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Auto-Generate Finance Invoice</p>
                        <p className="text-xs text-muted-foreground">Create a matching Draft invoice in Finance module with the contract budget</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={contractForm.generateInvoice}
                        onClick={() => setContractForm((f) => ({ ...f, generateInvoice: !f.generateInvoice }))}
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

                    {/* Send Email / Sent Mail Toggle */}
                    <label className="flex items-center justify-between cursor-pointer gap-4 pt-3 border-t border-border/50">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">POC Email Confirmation Dispatch</p>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", contractForm.mailSent ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted text-muted-foreground border-border")}>
                            {contractForm.mailSent ? "Will Send" : "No Email"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {contractForm.pocEmail
                            ? `Dispatch an automated confirmation email with terms to ${contractForm.pocEmail}`
                            : "Dispatch an automated confirmation email with terms to client POC"}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={contractForm.mailSent}
                        onClick={() => setContractForm((f) => ({ ...f, mailSent: !f.mailSent }))}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none",
                          contractForm.mailSent ? "bg-emerald-500" : "bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                            contractForm.mailSent ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                    </label>
                  </div>

                  {/* Step 3 Actions (Submit) */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveStep(2)}
                      className="gap-1.5 cursor-pointer"
                    >
                      <i className="fa-solid fa-arrow-left text-xs" />
                      <span>Back: Terms</span>
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowContractModal(false)}
                        className="cursor-pointer"
                      >
                        Discard
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={contractSubmitting}
                        className="gap-1.5 cursor-pointer min-w-[150px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                      >
                        {contractSubmitting ? (
                          <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving Contract…</>
                        ) : (
                          <><i className="fa-solid fa-floppy-disk text-xs" /> {editingContract ? "Save Changes" : "Create Contract"}</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DELETE CONFIRMATION DIALOG */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {deleteContractId && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteContractId(null)} />
            <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto text-xl shadow-inner">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="font-bold text-base text-foreground">Delete Client Contract?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This action is permanent and cannot be undone. Associated record attachments will also be detached.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 cursor-pointer"
                  onClick={() => setDeleteContractId(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                  onClick={handleDeleteContract}
                  disabled={isDeletingContract}
                >
                  {isDeletingContract ? (
                    <><i className="fa-solid fa-spinner fa-spin text-xs mr-1" /> Deleting…</>
                  ) : (
                    <><i className="fa-solid fa-trash text-xs mr-1" /> Delete</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContractsOnboardingTab;
