"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar, ClipboardCheck, FileText, UserCheck, HelpCircle, Award,
  Plus, X, CheckCircle, AlertCircle, MessageSquare, ChevronRight,
  Users, ShieldCheck, Download, ExternalLink, Send, PlayCircle, Clock,
  Filter, Search, UserCheck as UserIcon, FileCheck, Layers, Settings2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { cn } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";

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

export default function HRPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useTabPersistence<
    "directory" | "checklists" | "leaves" | "vault" | "cases" | "appraisals" | "probation" | "sandbox"
  >(
    "hr_active_tab_v2",
    "directory",
    ["directory", "checklists", "leaves", "vault", "cases", "appraisals", "probation", "sandbox"]
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
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [newChecklistUserId, setNewChecklistUserId] = useState("");
  const [newChecklistType, setNewChecklistType] = useState<"Onboarding" | "Offboarding">("Onboarding");

  // Leaves State
  const [leaves, setLeaves] = useState<LeaveData[]>([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  // Vault State (Document Vault)
  const [documents, setDocuments] = useState<any[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState<any>("Offer Letter");
  const [docFileUrl, setDocFileUrl] = useState("");
  const [docTargetUserId, setDocTargetUserId] = useState("");
  const [docIsRestricted, setDocIsRestricted] = useState(true);

  // Cases State (Help Desk)
  const [cases, setCases] = useState<CaseData[]>([]);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseCategory, setCaseCategory] = useState("Payroll");
  const [caseSubject, setCaseSubject] = useState("");
  const [caseDesc, setCaseDesc] = useState("");
  const [casePriority, setCasePriority] = useState("Medium");
  const [selectedCase, setSelectedCase] = useState<CaseData | null>(null);
  const [commentText, setCommentText] = useState("");

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

  const isManagerOrAdmin = user?.role === "Admin" || user?.role === "Manager";

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetchers
  const fetchDirectory = async () => {
    try {
      const res = await fetch("/api/hr/directory");
      if (res.ok) {
        const d = await res.json();
        setDirectoryUsers(d.users || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchChecklists = async () => {
    try {
      const res = await fetch("/api/hr/checklists");
      if (res.ok) {
        const d = await res.json();
        setChecklists(d.checklists || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/hr/leaves");
      if (res.ok) { const d = await res.json(); setLeaves(d.leaves || []); }
    } catch (e) { console.error(e); }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/hr/documents");
      if (res.ok) {
        const d = await res.json();
        setDocuments(d.documents || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchCases = async () => {
    try {
      const res = await fetch("/api/hr/cases");
      if (res.ok) { const d = await res.json(); setCases(d.cases || []); }
    } catch (e) { console.error(e); }
  };

  const fetchAppraisals = async () => {
    try {
      const res = await fetch("/api/hr/appraisals");
      if (res.ok) {
        const d = await res.json();
        setAppraisals(d.appraisals || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchSandbox = async () => {
    if (!isManagerOrAdmin) return;
    try {
      const res = await fetch("/api/hr/sandbox");
      if (res.ok) {
        const d = await res.json();
        setSandboxItems(d.sandboxItems || []);
      }
    } catch (e) { console.error(e); }
  };

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
        await fetchChecklists();
      }
    } catch { showToast("Failed to update item", "error"); }
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = directoryUsers.find((u) => u._id === newChecklistUserId);
    if (!targetUser) return;
    try {
      const res = await fetch("/api/hr/checklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUser._id,
          userName: targetUser.name,
          userEmail: targetUser.email,
          type: newChecklistType,
        }),
      });
      if (res.ok) {
        showToast(`Created ${newChecklistType} checklist for ${targetUser.name}`);
        setShowChecklistModal(false);
        await fetchChecklists();
      }
    } catch { showToast("Failed to create checklist", "error"); }
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
    try {
      const res = await fetch("/api/hr/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, status }),
      });
      if (res.ok) { showToast(`Leave ${status.toLowerCase()}`); await fetchLeaves(); }
    } catch { showToast("Action failed", "error"); }
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
    const matchesSearch = !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
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

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
          toast.type === "success" ? "bg-emerald-500/90 text-white border-emerald-600" : "bg-destructive/90 text-white border-destructive"
        )}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
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
          <Button variant="outline" size="sm" onClick={() => { setActiveTab("leaves"); setShowLeaveForm(true); }} className="gap-2 cursor-pointer">
            <Calendar className="w-4 h-4" /> Request Leave
          </Button>
          <Button color="primary" size="sm" onClick={() => { setActiveTab("cases"); setShowCaseForm(true); }} className="gap-2 cursor-pointer">
            <Plus className="w-4 h-4" /> Submit Case
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Workforce</p>
              <p className="text-2xl font-bold text-foreground">{directoryUsers.length} Employees</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl"><Users className="w-6 h-6" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Checklists</p>
              <p className="text-2xl font-bold text-foreground">{checklists.filter((c) => c.status === "In Progress").length} Ongoing</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><FileCheck className="w-6 h-6" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Leaves</p>
              <p className="text-2xl font-bold text-foreground">{leaves.filter((l) => l.status === "Pending").length} Requests</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Calendar className="w-6 h-6" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Open HR Cases</p>
              <p className="text-2xl font-bold text-foreground">{cases.filter((c) => c.status === "Open" || c.status === "In Progress").length} Open</p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl"><HelpCircle className="w-6 h-6" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border space-x-1 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab("directory")} className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
          activeTab === "directory" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <i className="fa-solid fa-address-book text-sm" /> Employee Directory
        </button>
        <button onClick={() => setActiveTab("checklists")} className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
          activeTab === "checklists" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <i className="fa-solid fa-list-check text-sm" /> Onboarding / Offboarding
        </button>
        <button onClick={() => setActiveTab("leaves")} className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
          activeTab === "leaves" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Calendar className="w-4 h-4" /> Leave Management
        </button>
        <button onClick={() => setActiveTab("vault")} className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
          activeTab === "vault" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <ShieldCheck className="w-4 h-4 text-emerald-500" /> Document Vault
        </button>
        <button onClick={() => setActiveTab("cases")} className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
          activeTab === "cases" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <HelpCircle className="w-4 h-4 text-amber-500" /> Help Desk
        </button>
        <button onClick={() => setActiveTab("appraisals")} className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
          activeTab === "appraisals" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Award className="w-4 h-4 text-indigo-500" /> Appraisals & KRAs
        </button>
        <button onClick={() => setActiveTab("probation")} className={cn(
          "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
          activeTab === "probation" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
        )}>
          <Clock className="w-4 h-4 text-sky-500" /> Review Cycle & Probation
        </button>
        {isManagerOrAdmin && (
          <button onClick={() => setActiveTab("sandbox")} className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === "sandbox" ? "border-primary text-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground"
          )}>
            <Settings2 className="w-4 h-4 text-purple-500" /> HR Sandbox
          </button>
        )}
      </div>

      {/* TAB 1: EMPLOYEE DIRECTORY */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="w-4 h-4 text-muted-foreground" />
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

      {/* TAB 2: ONBOARDING / OFFBOARDING */}
      {activeTab === "checklists" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["All", "Onboarding", "Offboarding"] as const).map((t) => (
                <Button
                  key={t}
                  variant={checklistTypeFilter === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChecklistTypeFilter(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
            {isManagerOrAdmin && (
              <Button color="primary" size="sm" onClick={() => setShowChecklistModal(true)} className="gap-1">
                <Plus className="w-4 h-4" /> Start Checklist
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {checklists
              .filter((c) => checklistTypeFilter === "All" || c.type === checklistTypeFilter)
              .map((c) => {
                const completedCount = c.items.filter((i: any) => i.completed).length;
                const progressPct = Math.round((completedCount / c.items.length) * 100);

                return (
                  <Card key={c._id} className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base text-foreground">{c.userName}</h3>
                          <Badge color={c.type === "Onboarding" ? "primary" : "destructive"}>{c.type}</Badge>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {c.items.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => handleToggleChecklistItem(c._id, item.id, !item.completed)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all",
                            item.completed ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-card border-border hover:bg-muted/40"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => {}}
                              className="rounded border-border text-primary focus:ring-primary"
                            />
                            <span className={cn("font-medium", item.completed && "line-through opacity-80")}>{item.title}</span>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: LEAVE MANAGEMENT */}
      {activeTab === "leaves" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Casual Leave Balance</p>
              <p className="text-2xl font-bold text-primary mt-1">12 Days</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Sick Leave Balance</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">8 Days</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Earned Leave Balance</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">15 Days</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground font-semibold uppercase">Unpaid Leaves Used</p>
              <p className="text-2xl font-bold text-slate-400 mt-1">0 Days</p>
            </Card>
          </div>

          <div className="space-y-3">
            {leaves.map((l) => (
              <Card key={l._id} className="hover:shadow-md transition-all">
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{l.userName}</p>
                      <Badge color="primary" variant="soft">{l.type}</Badge>
                      <Badge color={l.status === "Approved" ? "success" : l.status === "Rejected" ? "destructive" : "warning"}>
                        {l.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{l.reason}</p>
                  </div>

                  {isManagerOrAdmin && l.status === "Pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" color="primary" onClick={() => handleApproveRejectLeave(l._id, "Approved")} className="gap-1 cursor-pointer">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleApproveRejectLeave(l._id, "Rejected")} className="gap-1 text-destructive cursor-pointer">
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENT VAULT */}
      {activeTab === "vault" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Restricted vault containing NDAs, Offer Letters, KRA Sign-offs, and KPI Agreements.</p>
            {isManagerOrAdmin && (
              <Button color="primary" size="sm" onClick={() => setShowDocModal(true)} className="gap-1">
                <Plus className="w-4 h-4" /> Upload Document
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc._id} className="hover:shadow-md transition-all">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground line-clamp-1">{doc.title}</h4>
                        <p className="text-xs text-muted-foreground">{doc.category}</p>
                      </div>
                    </div>
                    {doc.isRestricted && (
                      <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/40">Restricted</Badge>
                    )}
                  </div>
                  <div className="pt-2 border-t border-border text-xs text-muted-foreground space-y-1">
                    {doc.targetUserName && <p>For: <span className="font-semibold text-foreground">{doc.targetUserName}</span></p>}
                    <p>Uploaded by: {doc.uploadedBy}</p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2 text-xs cursor-pointer" onClick={() => window.open(doc.fileUrl, "_blank")}>
                    <Download className="w-3.5 h-3.5" /> Download Document ({doc.fileSize || "1.2 MB"})
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: HELP DESK / CASES */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {cases.map((c) => (
              <Card
                key={c._id}
                className="hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedCase(c)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground">{c.subject}</p>
                        <Badge color={c.category === "Ask your Manager" ? "primary" : "default"}>{c.category}</Badge>
                        <Badge color={c.status === "Open" ? "warning" : c.status === "In Progress" ? "info" : "success"}>
                          {c.status}
                        </Badge>
                        <Badge variant="outline">{c.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">By {c.userName} • {new Date(c.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-xs font-semibold">{c.comments?.length || 0}</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: APPRAISALS & KRAS */}
      {activeTab === "appraisals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Competency reviews, Key Result Areas (KRAs), and self/manager performance scoring.</p>
            {isManagerOrAdmin && (
              <Button color="primary" size="sm" onClick={() => setShowAppraisalModal(true)} className="gap-1">
                <Plus className="w-4 h-4" /> Init Appraisal Cycle
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

      {/* TAB 7: PROBATION & REVIEW CYCLE */}
      {activeTab === "probation" && (
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-sky-500" /> Automated Probation & Review Timeline
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
              <Plus className="w-4 h-4" /> Create Test Workflow
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

      {/* Case Modal */}
      {showCaseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowCaseForm(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-foreground">Submit HR Help Desk Case</h3>
            <form onSubmit={handleSubmitCase} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select value={caseCategory} onChange={(e) => setCaseCategory(e.target.value)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md">
                  {["Payroll", "IT Access", "Policy Query", "Benefits", "Ask your Manager", "Other"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={casePriority} onChange={(e) => setCasePriority(e.target.value)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md">
                  {["Low", "Medium", "High"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <Input value={caseSubject} onChange={(e) => setCaseSubject(e.target.value)} required placeholder="Subject" />
              <textarea value={caseDesc} onChange={(e) => setCaseDesc(e.target.value)} rows={3} required placeholder="Description..." className="w-full p-2 text-sm bg-background border border-border rounded-md" />
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCaseForm(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Create Case</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checklist Creation Modal */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowChecklistModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" /> Start Onboarding / Offboarding
              </h3>
              <button onClick={() => setShowChecklistModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateChecklist} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Employee</label>
                <select value={newChecklistUserId} onChange={(e) => setNewChecklistUserId(e.target.value)} required className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select Employee...</option>
                  {directoryUsers.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Checklist Type</label>
                <select value={newChecklistType} onChange={(e) => setNewChecklistType(e.target.value as any)} className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="Onboarding">Onboarding Checklist</option>
                  <option value="Offboarding">Offboarding Checklist</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowChecklistModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit" className="cursor-pointer">Initialize Checklist</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowDocModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" /> Upload to Document Vault
              </h3>
              <button onClick={() => setShowDocModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
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
                  {["Offer Letter", "NDA", "KRA Agreement", "Policy", "Tax Document", "Other"].map((c) => <option key={c} value={c}>{c}</option>)}
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

      {/* Appraisal Initialization Modal */}
      {showAppraisalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowAppraisalModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" /> Initialize Appraisal Cycle
              </h3>
              <button onClick={() => setShowAppraisalModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
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
                <Settings2 className="w-5 h-5 text-purple-500" /> Create Sandbox Workflow
              </h3>
              <button onClick={() => setShowSandboxModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
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
              <button onClick={() => setSelectedCase(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
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
              <button onClick={() => setSelectedAppraisal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button>
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
    </div>
  );
}
