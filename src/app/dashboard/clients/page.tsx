"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface ClientData {
  _id: string;
  projectId: string;
  clientAccount: string;
  venture: string;
  projectName: string;
  deliveryOwner: string;
  phase: "In Delivery" | "Closed - follow" | "On Hold" | "Closed - Not" | "Closed";
  priority: "High" | "Medium" | "Low";
  startDate: string;
  targetEndDate: string;
  health: "Green" | "Amber" | "Red";
  billingType: string;
  estHours: number;
  actualHours: number;
  progressPercent: number;
  notes?: string;
  contactHistory?: Array<{
    _id?: string;
    date: string;
    type: "Email" | "Call" | "Meeting" | "Note";
    summary: string;
    authorName: string;
  }>;
  createdAt: string;
}

interface SalesDeal {
  _id: string;
  clientAccount: string;
  dealName: string;
  dealValue: number;
  stage: "Prospecting" | "Discovery" | "Proposal Sent" | "Negotiation" | "Closed Won" | "Closed Lost";
  probability: number;
  owner: string;
  expectedClose: string;
  venture: string;
  notes?: string;
}

interface ResourceAllocation {
  _id: string;
  employeeName: string;
  role: string;
  department: string;
  assignedProject: string;
  allocatedHoursPerWeek: number;
  utilizationRate: number;
  status: "Deployed" | "Partially Allocated" | "Bench" | "On Leave";
  startDate: string;
  notes?: string;
}

interface ExternalMember {
  _id: string;
  name: string;
  email: string;
  companyName: string;
  role: string;
  serviceCategory: string;
  assignedProject: string;
  hourlyRate: number;
  currency: string;
  status: "Active" | "On Hold" | "Contract Ended";
  phone?: string;
  notes?: string;
  createdAt: string;
}

export default function OperationsPage() {
  const searchParams = useSearchParams();
  const { can, isAdmin, isOPS } = usePermissions();
  const tabParam = searchParams?.get("tab");
  const initialTab: "operations" | "sales" | "hr" | "external" =
    tabParam === "external" || tabParam === "external-teams"
      ? "external"
      : tabParam === "hr"
      ? "hr"
      : tabParam === "operations"
      ? "operations"
      : "sales";

  const [activeTab, setActiveTab] = useState<"operations" | "sales" | "hr" | "external">(initialTab);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Sales Workdesk State
  const [salesDeals, setSalesDeals] = useState<SalesDeal[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesSearch, setSalesSearch] = useState("");
  const [salesStageFilter, setSalesStageFilter] = useState("All");
  const [salesOwnerFilter, setSalesOwnerFilter] = useState("All");
  const [salesViewMode, setSalesViewMode] = useState<"table" | "kanban">("table");
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [editingSalesDeal, setEditingSalesDeal] = useState<SalesDeal | null>(null);
  const [salesFormData, setSalesFormData] = useState({
    clientAccount: "",
    dealName: "",
    dealValue: "",
    stage: "Prospecting" as SalesDeal["stage"],
    probability: 50,
    owner: "",
    expectedClose: "",
    venture: "Ace Consultancys",
    notes: "",
  });

  // HR Workdesk State
  const [hrAllocations, setHrAllocations] = useState<ResourceAllocation[]>([]);
  const [hrLoading, setHrLoading] = useState(false);
  const [hrSearch, setHrSearch] = useState("");
  const [hrStatusFilter, setHrStatusFilter] = useState("All");
  const [hrDeptFilter, setHrDeptFilter] = useState("All");
  const [showHrModal, setShowHrModal] = useState(false);
  const [editingHrAllocation, setEditingHrAllocation] = useState<ResourceAllocation | null>(null);
  const [hrFormData, setHrFormData] = useState({
    employeeName: "",
    role: "",
    department: "Engineering",
    assignedProject: "",
    allocatedHoursPerWeek: 40,
    utilizationRate: 0,
    status: "Deployed" as ResourceAllocation["status"],
    startDate: "",
    notes: "",
  });

  // External Teams State
  const [externalMembers, setExternalMembers] = useState<ExternalMember[]>([]);
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalSearch, setExternalSearch] = useState("");
  const [externalStatusFilter, setExternalStatusFilter] = useState("All");
  const [externalCategoryFilter, setExternalCategoryFilter] = useState("All");
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [editingExternalMember, setEditingExternalMember] = useState<ExternalMember | null>(null);
  const [externalSubmitting, setExternalSubmitting] = useState(false);

  const [externalFormData, setExternalFormData] = useState({
    name: "",
    email: "",
    companyName: "Independent Contractor",
    role: "External Developer",
    serviceCategory: "Software Development",
    assignedProject: "General Operational Support",
    hourlyRate: 75,
    currency: "USD",
    status: "Active" as ExternalMember["status"],
    phone: "",
    notes: "",
  });

  const [showDeleteExternalModal, setShowDeleteExternalModal] = useState(false);
  const [externalToDelete, setExternalToDelete] = useState<ExternalMember | null>(null);
  const [isDeletingExternal, setIsDeletingExternal] = useState(false);



  // Persist View Mode Preference in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("operations_view_mode");
    if (saved === "grid" || saved === "list") {
      setViewMode(saved);
    }
  }, []);

  const handleViewModeChange = (mode: "list" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("operations_view_mode", mode);
  };
  const [projects, setProjects] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("All");
  const [healthFilter, setHealthFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === "grid" ? 9 : 10;

  // Sorting States
  const [sortField, setSortField] = useState<keyof ClientData | "">("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof ClientData) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortArrow = (field: keyof ClientData) => {
    if (sortField !== field) return <i className="fa-solid fa-sort text-[9px] opacity-30 ml-1.5" />;
    return sortDirection === "asc"
      ? <i className="fa-solid fa-sort-up text-[10px] text-primary ml-1.5" />
      : <i className="fa-solid fa-sort-down text-[10px] text-primary ml-1.5" />;
  };

  // View Details Modal States
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingProject, setViewingProject] = useState<ClientData | null>(null);

  const handleOpenViewModal = (p: ClientData) => {
    setViewingProject(p);
    setShowViewModal(true);
  };

  // History Tracker States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProject, setHistoryProject] = useState<ClientData | null>(null);
  const [newLogType, setNewLogType] = useState<"Email" | "Call" | "Meeting" | "Note">("Note");
  const [newLogSummary, setNewLogSummary] = useState("");
  const [submittingHistory, setSubmittingHistory] = useState(false);

  const handleAddHistoryLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyProject || !newLogSummary.trim()) return;

    setSubmittingHistory(true);
    try {
      const res = await fetch(`/api/clients/${historyProject._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactLog: {
            type: newLogType,
            summary: newLogSummary.trim(),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update the project in local state
        setProjects((prev) =>
          prev.map((proj) =>
            proj._id === historyProject._id
              ? { ...proj, contactHistory: data.client.contactHistory }
              : proj
          )
        );
        // Update selection inside the modal to render the new timeline entry
        setHistoryProject(data.client);
        setNewLogSummary("");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to add log entry.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add log entry.");
    } finally {
      setSubmittingHistory(false);
    }
  };

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ClientData | null>(null);

  const [formData, setFormData] = useState({
    projectId: "",
    clientAccount: "",
    venture: "Ace Consultancys",
    projectName: "",
    deliveryOwner: "",
    phase: "In Delivery" as ClientData["phase"],
    priority: "Medium" as ClientData["priority"],
    startDate: "",
    targetEndDate: "",
    health: "Green" as ClientData["health"],
    billingType: "Retainer",
    estHours: 0,
    actualHours: 0,
    progressPercent: 0,
    notes: "",
  });

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.clients || []);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesDeals = async () => {
    try {
      setSalesLoading(true);
      const res = await fetch("/api/operations/sales-deals");
      if (res.ok) {
        const data = await res.json();
        setSalesDeals(data.deals || []);
      }
    } catch (err) {
      console.error("Failed to fetch sales deals:", err);
    } finally {
      setSalesLoading(false);
    }
  };

  const fetchHrAllocations = async () => {
    try {
      setHrLoading(true);
      const res = await fetch("/api/operations/hr-workdesk");
      if (res.ok) {
        const data = await res.json();
        setHrAllocations(data.allocations || []);
      }
    } catch (err) {
      console.error("Failed to fetch HR allocations:", err);
    } finally {
      setHrLoading(false);
    }
  };

  const fetchExternalMembers = async () => {
    try {
      setExternalLoading(true);
      const res = await fetch("/api/operations/external-teams");
      if (res.ok) {
        const data = await res.json();
        setExternalMembers(data.externalMembers || []);
      }
    } catch (err) {
      console.error("Failed to fetch external team members:", err);
    } finally {
      setExternalLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchSalesDeals();
    fetchHrAllocations();
    fetchExternalMembers();
  }, []);

  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "external" || tabParam === "external-teams") {
      setActiveTab("external");
    } else if (tabParam === "sales") {
      setActiveTab("sales");
    } else if (tabParam === "hr") {
      setActiveTab("hr");
    } else if (tabParam === "operations") {
      setActiveTab("operations");
    }
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, phaseFilter, healthFilter, viewMode]);

  const [showAnalytics, setShowAnalytics] = useState(true);



  const handleOpenModal = (project?: ClientData) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        projectId: project.projectId || "",
        clientAccount: project.clientAccount || "",
        venture: project.venture || "Ace Consultancys",
        projectName: project.projectName || "",
        deliveryOwner: project.deliveryOwner || "",
        phase: project.phase || "In Delivery",
        priority: project.priority || "Medium",
        startDate: project.startDate ? project.startDate.split("T")[0] : "",
        targetEndDate: project.targetEndDate ? project.targetEndDate.split("T")[0] : "",
        health: project.health || "Green",
        billingType: project.billingType || "Retainer",
        estHours: project.estHours || 0,
        actualHours: project.actualHours || 0,
        progressPercent: project.progressPercent || 0,
        notes: project.notes || "",
      });
    } else {
      setEditingProject(null);
      // Auto generate project ID based on max existing ID
      const nextIdNum = projects.reduce((max, p) => {
        const match = p.projectId?.match(/CLP-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0) + 1;
      const autoId = `CLP-${String(nextIdNum).padStart(3, "0")}`;

      setFormData({
        projectId: autoId,
        clientAccount: "",
        venture: "Ace Consultancys",
        projectName: "",
        deliveryOwner: "",
        phase: "In Delivery",
        priority: "Medium",
        startDate: new Date().toISOString().split("T")[0],
        targetEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        health: "Green",
        billingType: "Retainer",
        estHours: 120,
        actualHours: 0,
        progressPercent: 0,
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingProject ? `/api/clients/${editingProject._id}` : "/api/clients";
      const method = editingProject ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        fetchProjects();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save project");
      }
    } catch (err) {
      console.error("Save project error:", err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchProjects();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete project");
      }
    } catch (err) {
      console.error("Delete project error:", err);
    }
  };

  const filteredProjects = useMemo(() => {
    const list = projects.filter((p) => {
      const matchesSearch =
        p.projectId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientAccount?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.deliveryOwner?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPhase = phaseFilter === "All" || p.phase === phaseFilter;
      const matchesHealth = healthFilter === "All" || p.health === healthFilter;
      return matchesSearch && matchesPhase && matchesHealth;
    });

    if (sortField) {
      list.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal === undefined || bVal === undefined) return 0;
        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

    return list;
  }, [projects, searchQuery, phaseFilter, healthFilter, sortField, sortDirection]);

  const handleExportCSV = () => {
    if (filteredProjects.length === 0) return;
    
    const headers = [
      "Project ID",
      "Client/Account",
      "Venture",
      "Project Name",
      "Delivery Owner",
      "Phase",
      "Priority",
      "Start Date",
      "Target End Date",
      "Health",
      "Billing Type",
      "Est Hours",
      "Actual Hours",
      "Variance",
      "Progress %",
    ];

    const rows = filteredProjects.map((p) => [
      p.projectId,
      `"${p.clientAccount.replace(/"/g, '""')}"`,
      `"${p.venture.replace(/"/g, '""')}"`,
      `"${p.projectName.replace(/"/g, '""')}"`,
      `"${p.deliveryOwner.replace(/"/g, '""')}"`,
      p.phase,
      p.priority,
      p.startDate ? p.startDate.split("T")[0] : "",
      p.targetEndDate ? p.targetEndDate.split("T")[0] : "",
      p.health,
      p.billingType,
      p.estHours,
      p.actualHours,
      (p.estHours || 0) - (p.actualHours || 0),
      `${p.progressPercent}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `operations_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSingleProject = (p: ClientData) => {
    const hoursVariance = (p.estHours || 0) - (p.actualHours || 0);
    const historyText = p.contactHistory && p.contactHistory.length > 0
      ? p.contactHistory.map(h => `[${new Date(h.date).toISOString().split("T")[0]}] (${h.type}) ${h.summary} - Logged by ${h.authorName}`).join(" | ")
      : "No history logs recorded";

    const headers = [
      "Project ID",
      "Client/Account",
      "Venture",
      "Project Name",
      "Delivery Owner",
      "Phase",
      "Priority",
      "Start Date",
      "Target End Date",
      "Health",
      "Billing Type",
      "Est Hours",
      "Actual Hours",
      "Variance",
      "Progress %",
      "Notes",
      "Interaction History",
    ];

    const row = [
      p.projectId,
      `"${(p.clientAccount || "").replace(/"/g, '""')}"`,
      `"${(p.venture || "").replace(/"/g, '""')}"`,
      `"${(p.projectName || "").replace(/"/g, '""')}"`,
      `"${(p.deliveryOwner || "").replace(/"/g, '""')}"`,
      p.phase,
      p.priority,
      p.startDate ? p.startDate.split("T")[0] : "",
      p.targetEndDate ? p.targetEndDate.split("T")[0] : "",
      p.health,
      p.billingType,
      p.estHours,
      p.actualHours,
      hoursVariance,
      `${p.progressPercent}%`,
      `"${(p.notes || "").replace(/"/g, '""')}"`,
      `"${historyText.replace(/"/g, '""')}"`,
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), row.join(",")].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `project_${p.projectId}_${(p.clientAccount || "detail").replace(/\s+/g, "_")}_export.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProjects.slice(start, start + itemsPerPage);
  }, [filteredProjects, currentPage, itemsPerPage]);

  // SVG Donut calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;

  const chartData = useMemo(() => {
    // 1. Health Distribution for Pie Chart
    const healthCounts = { Green: 0, Amber: 0, Red: 0 };
    filteredProjects.forEach((p) => {
      if (p.health === "Green") healthCounts.Green++;
      else if (p.health === "Amber") healthCounts.Amber++;
      else if (p.health === "Red") healthCounts.Red++;
    });

    const totalHealth = healthCounts.Green + healthCounts.Amber + healthCounts.Red || 1;
    const pieData = [
      { name: "Green", count: healthCounts.Green },
      { name: "Amber", count: healthCounts.Amber },
      { name: "Red", count: healthCounts.Red },
    ].map((d) => ({
      ...d,
      percent: Math.round((d.count / totalHealth) * 100),
    }));

    const healthGreenPct = Math.round((healthCounts.Green / totalHealth) * 100);
    const healthAmberPct = Math.round((healthCounts.Amber / totalHealth) * 100);
    const healthRedPct = Math.round((healthCounts.Red / totalHealth) * 100);

    // 2. Top 5 Projects by Est Hours for Bar Chart
    const topProjects = [...filteredProjects]
      .sort((a, b) => (b.estHours || 0) - (a.estHours || 0))
      .slice(0, 5);

    const maxVal = Math.max(...topProjects.map((p) => Math.max(p.estHours || 0, p.actualHours || 0)), 50);

    return { pieData, topProjects, totalHealth, maxVal, healthGreenPct, healthAmberPct, healthRedPct };
  }, [filteredProjects]);

  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.phase === "In Delivery").length;
    const estHoursTotal = projects.reduce((acc, p) => acc + (p.estHours || 0), 0);
    const actualHoursTotal = projects.reduce((acc, p) => acc + (p.actualHours || 0), 0);
    const onHold = projects.filter((p) => p.phase === "On Hold").length;
    const green = projects.filter((p) => p.health === "Green").length;
    const amber = projects.filter((p) => p.health === "Amber").length;
    const red = projects.filter((p) => p.health === "Red").length;

    return { total, active, estHoursTotal, actualHoursTotal, onHold, green, amber, red };
  }, [projects]);

  // Color mappings
  const phaseColors: Record<string, string> = {
    "In Delivery": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "Closed - follow": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    "On Hold": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    "Closed - Not": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    "Closed": "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  };

  const healthColors: Record<string, string> = {
    Green: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
    Amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
    Red: "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30",
  };

  const priorityColors: Record<string, string> = {
    High: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
    Medium: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    Low: "bg-slate-500/10 text-slate-500 border border-slate-500/20",
  };

  const [salesSubmitting, setSalesSubmitting] = useState(false);

  const handleAddSalesDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesFormData.clientAccount || !salesFormData.dealName) return;
    setSalesSubmitting(true);
    try {
      const url = editingSalesDeal
        ? `/api/operations/sales-deals/${editingSalesDeal._id}`
        : "/api/operations/sales-deals";
      const method = editingSalesDeal ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientAccount: salesFormData.clientAccount,
          dealName: salesFormData.dealName,
          dealValue: Number(salesFormData.dealValue) || 0,
          stage: salesFormData.stage,
          probability: Number(salesFormData.probability) || 50,
          owner: salesFormData.owner || "",
          expectedClose: salesFormData.expectedClose || "",
          venture: salesFormData.venture,
          notes: salesFormData.notes || "",
        }),
      });
      if (res.ok) {
        await fetchSalesDeals();
        setShowSalesModal(false);
        setEditingSalesDeal(null);
        setSalesFormData({ clientAccount: "", dealName: "", dealValue: "", stage: "Prospecting", probability: 50, owner: "", expectedClose: "", venture: "Ace Consultancys", notes: "" });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save deal.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save deal.");
    } finally {
      setSalesSubmitting(false);
    }
  };

  const handleDeleteSalesDeal = async (dealId: string) => {
    if (!confirm("Delete this deal?")) return;
    try {
      const res = await fetch(`/api/operations/sales-deals/${dealId}`, { method: "DELETE" });
      if (res.ok) setSalesDeals((prev) => prev.filter((d) => d._id !== dealId));
      else alert("Failed to delete deal.");
    } catch { alert("Failed to delete deal."); }
  };

  const handleEditSalesDeal = (deal: SalesDeal) => {
    setEditingSalesDeal(deal);
    setSalesFormData({
      clientAccount: deal.clientAccount,
      dealName: deal.dealName,
      dealValue: String(deal.dealValue),
      stage: deal.stage,
      probability: deal.probability,
      owner: deal.owner,
      expectedClose: deal.expectedClose,
      venture: deal.venture,
      notes: deal.notes || "",
    });
    setShowSalesModal(true);
  };

  const [hrSubmitting, setHrSubmitting] = useState(false);

  const handleAddHrAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrFormData.employeeName) return;
    setHrSubmitting(true);
    const hours = Number(hrFormData.allocatedHoursPerWeek) || 0;
    const util = hrFormData.utilizationRate || Math.min(100, Math.round((hours / 40) * 100));
    try {
      const url = editingHrAllocation
        ? `/api/operations/hr-workdesk/${editingHrAllocation._id}`
        : "/api/operations/hr-workdesk";
      const method = editingHrAllocation ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeName: hrFormData.employeeName,
          role: hrFormData.role || "",
          department: hrFormData.department,
          assignedProject: hrFormData.assignedProject || "Unassigned",
          allocatedHoursPerWeek: hours,
          utilizationRate: util,
          status: hrFormData.status,
          startDate: hrFormData.startDate || "",
          notes: hrFormData.notes || "",
        }),
      });
      if (res.ok) {
        await fetchHrAllocations();
        setShowHrModal(false);
        setEditingHrAllocation(null);
        setHrFormData({ employeeName: "", role: "", department: "Engineering", assignedProject: "", allocatedHoursPerWeek: 40, utilizationRate: 0, status: "Deployed", startDate: "", notes: "" });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save allocation.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save allocation.");
    } finally {
      setHrSubmitting(false);
    }
  };

  const handleDeleteHrAllocation = async (allocId: string) => {
    if (!confirm("Remove this resource allocation?")) return;
    try {
      const res = await fetch(`/api/operations/hr-workdesk/${allocId}`, { method: "DELETE" });
      if (res.ok) setHrAllocations((prev) => prev.filter((a) => a._id !== allocId));
      else alert("Failed to delete allocation.");
    } catch { alert("Failed to delete allocation."); }
  };

  const handleEditHrAllocation = (alloc: ResourceAllocation) => {
    setEditingHrAllocation(alloc);
    setHrFormData({
      employeeName: alloc.employeeName,
      role: alloc.role,
      department: alloc.department,
      assignedProject: alloc.assignedProject,
      allocatedHoursPerWeek: alloc.allocatedHoursPerWeek,
      utilizationRate: alloc.utilizationRate,
      status: alloc.status,
      startDate: alloc.startDate,
      notes: alloc.notes || "",
    });
    setShowHrModal(true);
  };

  const filteredSalesDeals = useMemo(() => {
    return salesDeals.filter((deal) => {
      const matchesSearch =
        deal.clientAccount.toLowerCase().includes(salesSearch.toLowerCase()) ||
        deal.dealName.toLowerCase().includes(salesSearch.toLowerCase()) ||
        deal.owner.toLowerCase().includes(salesSearch.toLowerCase());
      const matchesStage = salesStageFilter === "All" || deal.stage === salesStageFilter;
      const matchesOwner = salesOwnerFilter === "All" || deal.owner === salesOwnerFilter;
      return matchesSearch && matchesStage && matchesOwner;
    });
  }, [salesDeals, salesSearch, salesStageFilter, salesOwnerFilter]);

  const filteredHrAllocations = useMemo(() => {
    return hrAllocations.filter((res) => {
      const matchesSearch =
        res.employeeName.toLowerCase().includes(hrSearch.toLowerCase()) ||
        res.role.toLowerCase().includes(hrSearch.toLowerCase()) ||
        res.assignedProject.toLowerCase().includes(hrSearch.toLowerCase());
      const matchesStatus = hrStatusFilter === "All" || res.status === hrStatusFilter;
      const matchesDept = hrDeptFilter === "All" || res.department === hrDeptFilter;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [hrAllocations, hrSearch, hrStatusFilter, hrDeptFilter]);

  const filteredExternalMembers = useMemo(() => {
    return externalMembers.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(externalSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(externalSearch.toLowerCase()) ||
        m.companyName.toLowerCase().includes(externalSearch.toLowerCase()) ||
        m.role.toLowerCase().includes(externalSearch.toLowerCase()) ||
        m.assignedProject.toLowerCase().includes(externalSearch.toLowerCase());
      const matchesStatus = externalStatusFilter === "All" || m.status === externalStatusFilter;
      const matchesCat = externalCategoryFilter === "All" || m.serviceCategory === externalCategoryFilter;
      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [externalMembers, externalSearch, externalStatusFilter, externalCategoryFilter]);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <i className="fa-solid fa-list-check text-primary text-xl" /> Operation Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every billable client project/retainer — scope, owner, budget, phase, and health.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab === "operations" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="gap-2 font-semibold h-8 cursor-pointer"
              >
                <i className="fa-solid fa-chart-pie text-xs text-primary" /> {showAnalytics ? "Hide Analytics" : "Show Analytics"}
              </Button>

              {(isAdmin || isOPS || can("createClients")) && (
                <Button color="primary" size="sm" onClick={() => handleOpenModal()} className="gap-2 font-semibold h-8 cursor-pointer">
                  <i className="fa-solid fa-plus text-xs" /> Add Project / Retainer
                </Button>
              )}
            </>
          )}

          {activeTab === "sales" && (isAdmin || isOPS || can("manageDeals")) && (
            <Button color="primary" size="sm" onClick={() => setShowSalesModal(true)} className="gap-2 font-semibold h-8 cursor-pointer">
              <i className="fa-solid fa-plus text-xs" /> New Sales Deal
            </Button>
          )}

          {activeTab === "hr" && (
            <Button color="primary" size="sm" onClick={() => setShowHrModal(true)} className="gap-2 font-semibold h-8 cursor-pointer">
              <i className="fa-solid fa-user-plus text-xs" /> Allocate Staff Resource
            </Button>
          )}

          {activeTab === "external" && (
            <Button color="primary" size="sm" onClick={() => {
              setEditingExternalMember(null);
              setExternalFormData({
                name: "",
                email: "",
                companyName: "Independent Contractor",
                role: "External Developer",
                serviceCategory: "Software Development",
                assignedProject: "General Operational Support",
                hourlyRate: 75,
                currency: "USD",
                status: "Active",
                phone: "",
                notes: "",
              });
              setShowExternalModal(true);
            }} className="gap-2 font-semibold h-8 cursor-pointer shadow-sm">
              <i className="fa-solid fa-user-plus text-xs" /> Add External Member/Vendor
            </Button>
          )}
        </div>
      </div>

      {/* Operation Portal Sub-Navigation Tabs */}
      <div className="flex border-b border-border space-x-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("operations")}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === "operations"
              ? "border-primary text-white bg-primary/10 rounded-t-md font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-list-check text-sm" /> Operations Control
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sales")}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === "sales"
              ? "border-primary text-white bg-primary/10 rounded-t-md font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-handshake text-sm" /> Sales Workdesk
          <Badge variant="soft" color="primary" className="ml-1 text-[10px] px-1.5 py-0.2">
            {salesDeals.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hr")}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === "hr"
              ? "border-primary text-white bg-primary/10 rounded-t-md font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-users-gear text-sm" /> HR Workdesk
          <Badge variant="soft" color="primary" className="ml-1 text-[10px] px-1.5 py-0.2">
            {hrAllocations.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("external")}
          className={cn(
            "px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0",
            activeTab === "external"
              ? "border-primary text-white bg-primary/10 rounded-t-md font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <i className="fa-solid fa-building-user text-sm" /> External Teams
          <Badge variant="soft" color="primary" className="ml-1 text-[10px] px-1.5 py-0.2">
            {externalMembers.length}
          </Badge>
        </button>
      </div>

      {/* Operations Control Tab View */}
      {activeTab === "operations" && (
        <div className="space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Projects</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <i className="fa-solid fa-diagram-project text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active in Delivery</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.active}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <i className="fa-solid fa-circle-play text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects on Hold</p>
                  <p className="text-2xl font-bold text-foreground">{metrics.onHold}</p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <i className="fa-solid fa-circle-pause text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-sky-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Staff Hours Logged</p>
                  <p className="text-2xl font-bold text-foreground">
                    {metrics.actualHoursTotal} / {metrics.estHoursTotal} hrs
                  </p>
                </div>
                <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
                  <i className="fa-solid fa-clock text-xl" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Collapsible Analytics Panel */}
          {showAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Bar Chart: Hours variance top 5 */}
              <Card className="lg:col-span-2 border border-border shadow-sm p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-chart-simple text-primary" /> Budgeted vs. Actual Hours (Top 5 Projects)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Est. Hours vs. Actual hours logged per project.</p>
                </div>
                
                <div className="h-52 w-full mt-2 flex items-center justify-center">
                  {chartData.topProjects.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No project data available for visualization.</div>
                  ) : (
                    <svg viewBox="0 0 400 210" className="w-full h-full">
                      {/* Grid Lines */}
                      <line x1="40" y1="30" x2="380" y2="30" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
                      <line x1="40" y1="80" x2="380" y2="80" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
                      <line x1="40" y1="130" x2="380" y2="130" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3" />
                      <line x1="40" y1="180" x2="380" y2="180" stroke="currentColor" strokeOpacity="0.2" />

                      {/* Legend & Bars */}
                      {chartData.topProjects.map((p, idx) => {
                        const barWidth = 24;
                        const groupGap = 64;
                        const startX = 65 + idx * groupGap;
                        const maxVal = chartData.maxVal;

                        const estHeight = Math.round((p.estHours / maxVal) * 140);
                        const actHeight = Math.round((p.actualHours / maxVal) * 140);

                        return (
                          <g key={p._id}>
                            {/* Est Hours Bar (Primary Color) */}
                            <rect
                              x={startX}
                              y={180 - estHeight}
                              width={barWidth}
                              height={estHeight}
                              rx="3"
                              className="fill-primary/40 hover:fill-primary/60 transition-colors cursor-pointer"
                            >
                              <title>{`${p.projectName}: Est ${p.estHours} hrs`}</title>
                            </rect>
                            {/* Actual Hours Bar (Emerald Color) */}
                            <rect
                              x={startX + barWidth + 3}
                              y={180 - actHeight}
                              width={barWidth}
                              height={actHeight}
                              rx="3"
                              className="fill-emerald-500 hover:fill-emerald-400 transition-colors cursor-pointer"
                            >
                              <title>{`${p.projectName}: Actual ${p.actualHours} hrs`}</title>
                            </rect>
                            {/* Project Name Label */}
                            <text
                              x={startX + barWidth}
                              y="196"
                              fontSize="9"
                              textAnchor="middle"
                              className="fill-muted-foreground font-medium"
                            >
                              {p.projectName.length > 8 ? `${p.projectName.slice(0, 7)}...` : p.projectName}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>

                <div className="flex items-center justify-center gap-6 pt-3 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-primary/40" />
                    <span className="text-muted-foreground font-medium">Estimated Budget (hrs)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500" />
                    <span className="text-muted-foreground font-medium">Actual Logged (hrs)</span>
                  </div>
                </div>
              </Card>

              {/* Pie/Donut Chart: Health Distribution */}
              <Card className="border border-border shadow-sm p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <i className="fa-solid fa-chart-pie text-emerald-500" /> Project Health Status
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Green, Amber, & Red health breakdown.</p>
                </div>

                <div className="h-48 w-full flex items-center justify-center relative my-2">
                  <svg viewBox="0 0 100 100" className="w-36 h-36 transform -rotate-90">
                    <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="14" fill="transparent" className="text-muted/20" />
                    {/* Green Segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#10b981"
                      strokeWidth="14"
                      fill="transparent"
                      strokeDasharray={`${chartData.healthGreenPct * 2.38} 238`}
                      strokeDashoffset="0"
                      className="transition-all duration-500"
                    />
                    {/* Amber Segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#f59e0b"
                      strokeWidth="14"
                      fill="transparent"
                      strokeDasharray={`${chartData.healthAmberPct * 2.38} 238`}
                      strokeDashoffset={`-${chartData.healthGreenPct * 2.38}`}
                      className="transition-all duration-500"
                    />
                    {/* Red Segment */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#ef4444"
                      strokeWidth="14"
                      fill="transparent"
                      strokeDasharray={`${chartData.healthRedPct * 2.38} 238`}
                      strokeDashoffset={`-${(chartData.healthGreenPct + chartData.healthAmberPct) * 2.38}`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-bold text-foreground">{metrics.total}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">Total</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy (Green)
                    </span>
                    <strong className="text-foreground">{metrics.green} ({chartData.healthGreenPct}%)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> At Risk (Amber)
                    </span>
                    <strong className="text-foreground">{metrics.amber} ({chartData.healthAmberPct}%)</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Critical (Red)
                    </span>
                    <strong className="text-foreground">{metrics.red} ({chartData.healthRedPct}%)</strong>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Search Bar & Filters */}
          <Card className="p-4 border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search venture, project, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={phaseFilter}
                onChange={(e) => setPhaseFilter(e.target.value)}
                className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
              >
                <option value="All">All Phases</option>
                <option value="In Delivery">In Delivery</option>
                <option value="Closed - follow">Closed - follow</option>
                <option value="On Hold">On Hold</option>
                <option value="Closed - Not">Closed - Not</option>
                <option value="Closed">Closed</option>
              </select>

              <select
                value={healthFilter}
                onChange={(e) => setHealthFilter(e.target.value)}
                className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto cursor-pointer"
              >
                <option value="All">All Healths</option>
                <option value="Green">Green</option>
                <option value="Amber">Amber</option>
                <option value="Red">Red</option>
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={filteredProjects.length === 0}
                className="gap-2 font-semibold h-9 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <i className="fa-solid fa-file-csv text-xs text-primary" /> Export CSV
              </Button>
            </div>
          </Card>

          {/* Spreadsheet Master Grid Table */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-muted/20 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-table-list text-primary" /> Master Project Operations Grid
                </CardTitle>
                <CardDescription>
                  Master view of all client ventures, allocated hour variance, health, and status progress.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleViewModeChange("list")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer h-7",
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <i className="fa-solid fa-list-ul text-[10px]" /> List
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange("grid")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer h-7",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <i className="fa-solid fa-border-all text-[10px]" /> Grid
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {viewMode === "list" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase">
                      <tr>
                        <th className="py-3 px-4 cursor-pointer hover:bg-muted/60" onClick={() => handleSort("clientAccount")}>
                          Client & Venture {renderSortArrow("clientAccount")}
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-muted/60" onClick={() => handleSort("projectName")}>
                          Project Name {renderSortArrow("projectName")}
                        </th>
                        <th className="py-3 px-3 cursor-pointer hover:bg-muted/60" onClick={() => handleSort("deliveryOwner")}>
                          Owner {renderSortArrow("deliveryOwner")}
                        </th>
                        <th className="py-3 px-3 text-center cursor-pointer hover:bg-muted/60" onClick={() => handleSort("phase")}>
                          Phase {renderSortArrow("phase")}
                        </th>
                        <th className="py-3 px-3 text-center cursor-pointer hover:bg-muted/60" onClick={() => handleSort("health")}>
                          Health {renderSortArrow("health")}
                        </th>
                        <th className="py-3 px-3">Billing</th>
                        <th className="py-3 px-3 text-center cursor-pointer hover:bg-muted/60" onClick={() => handleSort("estHours")}>
                          Est (h) {renderSortArrow("estHours")}
                        </th>
                        <th className="py-3 px-3 text-center cursor-pointer hover:bg-muted/60" onClick={() => handleSort("actualHours")}>
                          Act (h) {renderSortArrow("actualHours")}
                        </th>
                        <th className="py-3 px-3 text-center">Variance</th>
                        <th className="py-3 px-3 text-center cursor-pointer hover:bg-muted/60" onClick={() => handleSort("progressPercent")}>
                          Progress {renderSortArrow("progressPercent")}
                        </th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <tr key={idx} className="animate-pulse">
                            <td colSpan={11} className="py-4 px-4 bg-muted/20" />
                          </tr>
                        ))
                      ) : paginatedProjects.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-12 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <i className="fa-solid fa-folder-open text-3xl opacity-40 text-primary" />
                              <p className="font-semibold text-foreground">No operations projects found</p>
                              <p className="text-xs">Adjust your search filters or click "Add Project / Retainer" to create one.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedProjects.map((p) => {
                          const hoursVariance = (p.estHours || 0) - (p.actualHours || 0);
                          return (
                            <tr key={p._id} className="hover:bg-muted/20 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-foreground">{p.clientAccount}</div>
                                <div className="text-muted-foreground text-[11px] font-medium">{p.venture}</div>
                              </td>
                              <td className="py-3 px-3 font-semibold text-foreground">{p.projectName}</td>
                              <td className="py-3 px-3 text-muted-foreground font-medium">{p.deliveryOwner}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap", phaseColors[p.phase])}>
                                  {p.phase}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={cn("inline-flex items-center justify-center w-16 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap", healthColors[p.health])}>
                                  {p.health}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-medium text-foreground">{p.billingType}</td>
                              <td className="py-3 px-3 text-center font-mono">{p.estHours}</td>
                              <td className="py-3 px-3 text-center font-mono text-foreground">{p.actualHours}</td>
                              <td className={cn("py-3 px-3 text-center font-mono font-bold", hoursVariance < 0 ? "text-rose-500" : "text-emerald-500")}>
                                {hoursVariance > 0 ? `+${hoursVariance}` : hoursVariance}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1.5 justify-center">
                                  <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full", p.progressPercent === 100 ? "bg-emerald-500" : "bg-primary")}
                                      style={{ width: `${p.progressPercent}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-bold font-mono">{p.progressPercent}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Link
                                    href={`/dashboard/clients/${p._id}`}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                                    title="View Project Details Page"
                                  >
                                    <i className="fa-solid fa-eye text-xs" />
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleExportSingleProject(p)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                                    title="Export Project Details CSV"
                                  >
                                    <i className="fa-solid fa-download text-xs" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setHistoryProject(p);
                                      setShowHistoryModal(true);
                                    }}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                                    title="View Interaction History"
                                  >
                                    <i className="fa-solid fa-clock-rotate-left text-xs" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenModal(p)}
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer flex items-center justify-center"
                                    title="Edit Project"
                                  >
                                    <i className="fa-solid fa-pen-to-square text-xs" />
                                  </button>
                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteProject(p._id)}
                                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer flex items-center justify-center"
                                      title="Delete Project"
                                    >
                                      <i className="fa-solid fa-trash text-xs" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-muted/30 dark:bg-slate-950/60">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="h-64 animate-pulse bg-muted/40 border-2 border-border rounded-xl" />
                    ))
                  ) : paginatedProjects.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <i className="fa-solid fa-folder-open text-3xl opacity-40 text-primary" />
                        <p className="font-semibold text-foreground">No operations projects found</p>
                        <p className="text-xs">Adjust your search filters or click "Add Project / Retainer" to create one.</p>
                      </div>
                    </div>
                  ) : (
                    paginatedProjects.map((p) => {
                      const hoursVariance = (p.estHours || 0) - (p.actualHours || 0);
                      return (
                        <div
                          key={p._id}
                          className="bg-card border-2 border-border rounded-xl p-5 shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between gap-4 group"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                                  <i className="fa-solid fa-briefcase text-xs text-primary/70" /> {p.projectName}
                                </h3>
                                <p className="text-xs font-semibold text-muted-foreground mt-0.5">{p.clientAccount} &middot; {p.venture}</p>
                              </div>
                              <span className={cn("inline-flex items-center justify-center w-16 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-2xs", healthColors[p.health])}>
                                {p.health}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg border border-border/50">
                              <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Delivery Owner</span>
                                <span className="font-medium text-foreground truncate block">{p.deliveryOwner}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Phase</span>
                                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap", phaseColors[p.phase])}>
                                  {p.phase}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground font-medium">Hours Logged:</span>
                                <span className="font-mono font-bold text-foreground">
                                  {p.actualHours} / {p.estHours} h ({hoursVariance > 0 ? `+${hoursVariance}` : hoursVariance}h)
                                </span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all duration-300", p.progressPercent === 100 ? "bg-emerald-500" : "bg-primary")}
                                  style={{ width: `${p.progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setHistoryProject(p);
                                setShowHistoryModal(true);
                              }}
                              className="gap-1.5 text-[11px] font-bold cursor-pointer h-8 px-2.5"
                            >
                              <i className="fa-solid fa-clock-rotate-left text-[10px] text-primary" /> History
                            </Button>
                            <div className="flex items-center gap-1.5">
                              <Link href={`/dashboard/clients/${p._id}`}>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs font-semibold cursor-pointer h-8 px-2"
                                  title="View Project Details Page"
                                >
                                  <i className="fa-solid fa-eye text-[10px]" /> View
                                </Button>
                              </Link>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportSingleProject(p)}
                                className="gap-1 text-xs font-semibold cursor-pointer h-8 px-2"
                                title="Export Project Details CSV"
                              >
                                <i className="fa-solid fa-download text-[10px] text-primary" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenModal(p)}
                                className="gap-1.5 text-xs font-semibold cursor-pointer h-8"
                              >
                                <i className="fa-solid fa-pen-to-square text-[10px]" /> Edit
                              </Button>
                              {isAdmin && (
                                <Button
                                  type="button"
                                  color="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteProject(p._id)}
                                  className="gap-1.5 text-xs font-semibold cursor-pointer h-8"
                                >
                                  <i className="fa-solid fa-trash text-[10px]" /> Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredProjects.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {/* Sales Workdesk Tab View */}
      {activeTab === "sales" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Sales Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Pipeline Value</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${salesDeals.reduce((sum, d) => sum + d.dealValue, 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <i className="fa-solid fa-sack-dollar text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-sky-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Deals</p>
                  <p className="text-2xl font-bold text-foreground">
                    {salesDeals.filter((d) => d.stage !== "Closed Lost" && d.stage !== "Closed Won").length}
                  </p>
                </div>
                <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
                  <i className="fa-solid fa-handshake text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weighted Expected Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${Math.round(salesDeals.reduce((sum, d) => sum + (d.dealValue * d.probability) / 100, 0)).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <i className="fa-solid fa-chart-line text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Closed Won Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${salesDeals.filter((d) => d.stage === "Closed Won").reduce((sum, d) => sum + d.dealValue, 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <i className="fa-solid fa-trophy text-xl" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Pipeline Funnel by Stage */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-filter text-primary" /> Pipeline Funnel by Stage
                </CardTitle>
                <CardDescription className="text-xs">Deal count and total value per stage</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {(() => {
                  const STAGES = ["Prospecting", "Discovery", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"] as const;
                  const STAGE_COLORS: Record<string, string> = {
                    "Prospecting": "hsl(220 70% 60%)",
                    "Discovery": "hsl(200 80% 55%)",
                    "Proposal Sent": "hsl(40 90% 55%)",
                    "Negotiation": "hsl(270 70% 60%)",
                    "Closed Won": "hsl(142 60% 50%)",
                    "Closed Lost": "hsl(0 65% 55%)",
                  };
                  const data = STAGES.map((stage) => {
                    const deals = salesDeals.filter((d) => d.stage === stage);
                    return { stage, count: deals.length, value: deals.reduce((s, d) => s + d.dealValue, 0) };
                  });
                  const maxCount = Math.max(...data.map((d) => d.count), 1);
                  return (
                    <div className="space-y-2.5">
                      {data.map(({ stage, count, value }) => (
                        <div key={stage} className="flex items-center gap-3">
                          <span className="text-[10px] font-semibold text-muted-foreground w-24 shrink-0 truncate">{stage}</span>
                          <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden relative">
                            <div
                              className="h-full rounded-md flex items-center px-2 transition-all duration-500"
                              style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: STAGE_COLORS[stage] }}
                            >
                              {count > 0 && <span className="text-[10px] font-bold text-white">{count}</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-foreground w-20 text-right shrink-0">
                            ${value.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Deal Value by Owner */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-user-tie text-primary" /> Deal Value by Owner
                </CardTitle>
                <CardDescription className="text-xs">Top deal owners by total pipeline value</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {(() => {
                  const ownerMap: Record<string, number> = {};
                  salesDeals.forEach((d) => {
                    ownerMap[d.owner] = (ownerMap[d.owner] || 0) + d.dealValue;
                  });
                  const sorted = Object.entries(ownerMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
                  const maxVal = Math.max(...sorted.map(([, v]) => v), 1);
                  const OWNER_COLORS = ["hsl(220 70% 60%)", "hsl(270 70% 60%)", "hsl(40 90% 55%)", "hsl(142 60% 50%)", "hsl(200 80% 55%)", "hsl(0 65% 55%)"];
                  return sorted.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">No data yet</div>
                  ) : (
                    <div className="space-y-2.5">
                      {sorted.map(([owner, val], i) => (
                        <div key={owner} className="flex items-center gap-3">
                          <span className="text-[10px] font-semibold text-muted-foreground w-24 shrink-0 truncate">{owner}</span>
                          <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden">
                            <div
                              className="h-full rounded-md flex items-center px-2 transition-all duration-500"
                              style={{ width: `${(val / maxVal) * 100}%`, backgroundColor: OWNER_COLORS[i % OWNER_COLORS.length] }}
                            >
                              <span className="text-[10px] font-bold text-white hidden sm:block">
                                ${(val / 1000).toFixed(0)}k
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-foreground w-20 text-right shrink-0">
                            ${val.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Recent Sales Activities & Quick Leads Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 border border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <i className="fa-solid fa-bolt text-amber-500" /> Recent Sales Activities & Pipeline Events
                  </CardTitle>
                  <CardDescription className="text-xs">Real-time log of client calls, contract proposals, and deal status changes</CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const title = prompt("Enter Activity Title (e.g., Client Meeting Completed):");
                    if (title) {
                      alert(`New sales activity logged: ${title}`);
                    }
                  }}
                  className="h-7 text-xs font-semibold gap-1 cursor-pointer shrink-0"
                >
                  <i className="fa-solid fa-plus text-[10px]" /> Log Activity
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {[
                  { title: "Contract Proposal Sent", client: "Enterprise Software Corp", owner: "Ahmed Raza", value: "$95,000", time: "10 mins ago", icon: "fa-solid fa-file-signature text-purple-500", bg: "bg-purple-500/10" },
                  { title: "Discovery Call Completed", client: "Apex Tech Labs", owner: "Bilal Hassan", value: "$67,000", time: "1 hour ago", icon: "fa-solid fa-headset text-sky-500", bg: "bg-sky-500/10" },
                  { title: "Deal Closed & Won 🎉", client: "Global Logistics Ltd", owner: "Ayesha Qureshi", value: "$31,000", time: "3 hours ago", icon: "fa-solid fa-trophy text-emerald-500", bg: "bg-emerald-500/10" },
                  { title: "Negotiation Meeting Scheduled", client: "Metro Finance Systems", owner: "Omar Malik", value: "$22,000", time: "Yesterday", icon: "fa-solid fa-handshake text-amber-500", bg: "bg-amber-500/10" },
                ].map((act, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-border/40", act.bg)}>
                        <i className={cn("text-sm", act.icon)} />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground">{act.title}</h4>
                        <p className="text-muted-foreground text-[11px]">
                          {act.client} • Assigned to <span className="font-medium text-foreground">{act.owner}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-primary">{act.value}</div>
                      <div className="text-[10px] text-muted-foreground">{act.time}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-bullseye text-primary" /> Key Sales Performance Targets
                </CardTitle>
                <CardDescription className="text-xs">Monthly sales quota & target completion</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Monthly Quota ($250k)</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">91.7%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "91.7%" }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">$229,400 of $250,000 target achieved</p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Win Rate Goal (65%)</span>
                    <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">75.0%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: "75%" }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">3 of 4 active proposals in closing stage</p>
                </div>

                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 space-y-1 mt-2">
                  <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                    <i className="fa-solid fa-lightbulb" /> Sales Pro-Tip
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    High-value proposals above $50k have a 45% faster closing velocity when follow-ups are logged within 48 hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Search & Filter Bar */}
          <Card className="p-4 border border-border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto flex-1">
                <div className="relative w-full sm:w-72">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search deals, clients or owners..."
                    value={salesSearch}
                    onChange={(e) => setSalesSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <select
                  value={salesStageFilter}
                  onChange={(e) => setSalesStageFilter(e.target.value)}
                  className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto cursor-pointer"
                >
                  <option value="All">All Stages</option>
                  <option value="Prospecting">Prospecting</option>
                  <option value="Discovery">Discovery</option>
                  <option value="Proposal Sent">Proposal Sent</option>
                  <option value="Negotiation">Negotiation</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>

                <select
                  value={salesOwnerFilter}
                  onChange={(e) => setSalesOwnerFilter(e.target.value)}
                  className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto cursor-pointer"
                >
                  <option value="All">All Owners</option>
                  {[...new Set(salesDeals.map((d) => d.owner).filter(Boolean))].sort().map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>

                {(salesSearch || salesStageFilter !== "All" || salesOwnerFilter !== "All") && (
                  <button
                    onClick={() => { setSalesSearch(""); setSalesStageFilter("All"); setSalesOwnerFilter("All"); }}
                    className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark" /> Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* View Mode Switcher */}
                <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setSalesViewMode("table")}
                    title="Table View"
                    className={cn(
                      "p-1.5 rounded-md transition-all cursor-pointer text-xs flex items-center gap-1 font-semibold",
                      salesViewMode === "table" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <i className="fa-solid fa-table-list" /> Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesViewMode("kanban")}
                    title="Kanban Board View"
                    className={cn(
                      "p-1.5 rounded-md transition-all cursor-pointer text-xs flex items-center gap-1 font-semibold",
                      salesViewMode === "kanban" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <i className="fa-solid fa-kanban-board" /> Kanban
                  </button>
                </div>

                <Button
                  color="primary"
                  size="sm"
                  onClick={() => setShowSalesModal(true)}
                  className="gap-2 font-semibold h-9 cursor-pointer"
                >
                  <i className="fa-solid fa-plus text-xs" /> New Sales Deal
                </Button>
              </div>
            </div>
          </Card>

          {/* Sales Deals View */}
          {salesViewMode === "kanban" ? (
            /* Kanban Board View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
              {(["Prospecting", "Discovery", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"] as const).map((stage) => {
                const stageDeals = filteredSalesDeals.filter((d) => d.stage === stage);
                const stageTotalVal = stageDeals.reduce((sum, d) => sum + d.dealValue, 0);
                const STAGE_HEADER_COLORS: Record<string, string> = {
                  "Prospecting": "border-t-blue-500",
                  "Discovery": "border-t-sky-500",
                  "Proposal Sent": "border-t-amber-500",
                  "Negotiation": "border-t-purple-500",
                  "Closed Won": "border-t-emerald-500",
                  "Closed Lost": "border-t-red-500",
                };
                return (
                  <div key={stage} className={cn("bg-card border border-border rounded-xl p-3 space-y-3 border-t-4 flex flex-col justify-between min-w-[220px]", STAGE_HEADER_COLORS[stage])}>
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-border/60">
                        <span className="text-xs font-bold text-foreground">{stage}</span>
                        <Badge variant="soft" color="primary" className="text-[10px] px-1.5 py-0.2">
                          {stageDeals.length}
                        </Badge>
                      </div>
                      <div className="py-1 text-[11px] font-mono font-semibold text-muted-foreground">
                        ${stageTotalVal.toLocaleString()}
                      </div>
                      
                      <div className="space-y-2.5 mt-2">
                        {stageDeals.length === 0 ? (
                          <div className="text-[11px] text-muted-foreground text-center py-6 border border-dashed border-border/60 rounded-lg">
                            No deals
                          </div>
                        ) : (
                          stageDeals.map((deal) => (
                            <div key={deal._id} className="p-3 bg-muted/30 hover:bg-muted/60 border border-border/80 rounded-lg space-y-2 transition-all shadow-2xs group">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-xs font-bold text-foreground line-clamp-1">{deal.clientAccount}</h4>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1">{deal.dealName}</p>
                                </div>
                                <span className="text-xs font-mono font-extrabold text-primary shrink-0 ml-1">
                                  ${deal.dealValue.toLocaleString()}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                                <span className="flex items-center gap-1 font-medium">
                                  <i className="fa-solid fa-user-tie text-[9px] text-primary" /> {deal.owner}
                                </span>
                                <span className="font-mono">{deal.probability}% win</span>
                              </div>

                              <div className="flex items-center justify-between pt-1 opacity-90 group-hover:opacity-100">
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  <i className="fa-solid fa-calendar text-[9px] mr-1" /> {deal.expectedClose}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditSalesDeal(deal)}
                                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    title="Edit Deal"
                                  >
                                    <i className="fa-solid fa-pen text-[10px]" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSalesDeal(deal._id)}
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                    title="Delete Deal"
                                  >
                                    <i className="fa-solid fa-trash text-[10px]" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Sales Deals Table View */
            <Card className="border border-border shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <i className="fa-solid fa-handshake text-primary" /> Active Sales Deal Pipeline
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {filteredSalesDeals.length} of {salesDeals.length} deals
                  </span>
                </CardTitle>
                <CardDescription>
                  Track client leads, negotiation stages, contract valuations, and estimated closing timelines.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-3 px-4">Client Account & Deal</th>
                      <th className="py-3 px-3">Venture</th>
                      <th className="py-3 px-3 text-center">Stage</th>
                      <th className="py-3 px-3 text-right">Deal Value</th>
                      <th className="py-3 px-3 text-center">Win Probability</th>
                      <th className="py-3 px-3">Owner</th>
                      <th className="py-3 px-3">Expected Close</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {salesLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-muted-foreground">
                          <i className="fa-solid fa-spinner fa-spin mr-2" /> Loading sales deals...
                        </td>
                      </tr>
                    ) : filteredSalesDeals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-muted-foreground">
                          No sales deals found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredSalesDeals.map((deal) => {
                        const stageColors: Record<string, string> = {
                          "Prospecting": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                          "Discovery": "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                          "Proposal Sent": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                          "Negotiation": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                          "Closed Won": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                          "Closed Lost": "bg-red-500/10 text-red-600 dark:text-red-400",
                        };
                        return (
                          <tr key={deal._id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-foreground">{deal.clientAccount}</div>
                              <div className="text-muted-foreground text-[11px] font-medium">{deal.dealName}</div>
                            </td>
                            <td className="py-3 px-3 font-semibold text-foreground">{deal.venture}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border", stageColors[deal.stage] || "bg-muted text-muted-foreground")}>
                                {deal.stage}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                              ${deal.dealValue.toLocaleString()}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 justify-center">
                                <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full", deal.probability >= 80 ? "bg-emerald-500" : "bg-primary")}
                                    style={{ width: `${deal.probability}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold font-mono">{deal.probability}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-foreground font-medium">{deal.owner}</td>
                            <td className="py-3 px-3 text-muted-foreground font-mono">{deal.expectedClose}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditSalesDeal(deal)}
                                  className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer"
                                  title="Edit Deal"
                                >
                                  <i className="fa-solid fa-pen text-[10px] text-primary" /> Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      clientAccount: deal.clientAccount,
                                      projectName: deal.dealName,
                                      venture: deal.venture,
                                      deliveryOwner: deal.owner
                                    }));
                                    setActiveTab("operations");
                                    handleOpenModal();
                                  }}
                                  className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer"
                                  title="Convert Sales Deal to Operations Project"
                                >
                                  <i className="fa-solid fa-arrows-split-up-and-left text-[10px] text-primary" /> Convert
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteSalesDeal(deal._id)}
                                  className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer text-destructive hover:text-destructive"
                                  title="Delete Deal"
                                >
                                  <i className="fa-solid fa-trash text-[10px]" />
                                </Button>
                              </div>
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
        </div>
      )}

      {/* HR Workdesk Tab View */}
      {activeTab === "hr" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* HR Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Allocated Staff</p>
                  <p className="text-2xl font-bold text-foreground">{hrAllocations.length}</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <i className="fa-solid fa-users text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deployed on Projects</p>
                  <p className="text-2xl font-bold text-foreground">
                    {hrAllocations.filter((r) => r.status === "Deployed").length}
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <i className="fa-solid fa-user-check text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bench (Available Staff)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {hrAllocations.filter((r) => r.status === "Bench").length}
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <i className="fa-solid fa-user-clock text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-sky-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg Utilization Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {hrAllocations.length === 0
                      ? 0
                      : Math.round(hrAllocations.reduce((sum, r) => sum + r.utilizationRate, 0) / hrAllocations.length)}
                    %
                  </p>
                </div>
                <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
                  <i className="fa-solid fa-gauge-high text-xl" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* HR Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Utilization by Department */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-building text-primary" /> Avg Utilization by Department
                </CardTitle>
                <CardDescription className="text-xs">Average utilization rate per department</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {(() => {
                  const deptMap: Record<string, number[]> = {};
                  hrAllocations.forEach((r) => {
                    if (!deptMap[r.department]) deptMap[r.department] = [];
                    deptMap[r.department].push(r.utilizationRate);
                  });
                  const depts = Object.entries(deptMap).map(([dept, rates]) => ({
                    dept,
                    avg: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
                    count: rates.length,
                  })).sort((a, b) => b.avg - a.avg);
                  const DEPT_COLORS = ["hsl(220 70% 60%)", "hsl(142 60% 50%)", "hsl(40 90% 55%)", "hsl(270 70% 60%)", "hsl(200 80% 55%)", "hsl(0 65% 55%)"];
                  return depts.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">No data yet</div>
                  ) : (
                    <div className="space-y-2.5">
                      {depts.map(({ dept, avg, count }, i) => (
                        <div key={dept} className="flex items-center gap-3">
                          <span className="text-[10px] font-semibold text-muted-foreground w-24 shrink-0 truncate">{dept}</span>
                          <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden relative">
                            <div
                              className="h-full rounded-md flex items-center px-2 transition-all duration-500"
                              style={{ width: `${avg}%`, backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }}
                            >
                              {avg > 5 && <span className="text-[10px] font-bold text-white">{avg}%</span>}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground w-12 text-right shrink-0">{count} staff</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="border border-border shadow-sm">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-chart-pie text-primary" /> Staff Status Distribution
                </CardTitle>
                <CardDescription className="text-xs">Headcount breakdown by deployment status</CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                {(() => {
                  const STATUS_CFG = [
                    { key: "Deployed", color: "hsl(142 60% 50%)", label: "Deployed" },
                    { key: "Partially Allocated", color: "hsl(40 90% 55%)", label: "Partial" },
                    { key: "Bench", color: "hsl(220 70% 60%)", label: "Bench" },
                    { key: "On Leave", color: "hsl(0 65% 55%)", label: "On Leave" },
                  ];
                  const total = hrAllocations.length;
                  return total === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">No data yet</div>
                  ) : (
                    <div className="space-y-3">
                      {STATUS_CFG.map(({ key, color, label }) => {
                        const count = hrAllocations.filter((r) => r.status === key).length;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[10px] font-semibold text-muted-foreground w-24 shrink-0">{label}</span>
                            <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500 flex items-center px-2"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              >
                                {pct > 10 && <span className="text-[10px] font-bold text-white">{pct}%</span>}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-foreground w-8 text-right shrink-0">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* HR Search & Status Filter Bar */}
          <Card className="p-4 border border-border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto flex-1">
                <div className="relative w-full sm:w-72">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search staff, role or project..."
                    value={hrSearch}
                    onChange={(e) => setHrSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <select
                  value={hrStatusFilter}
                  onChange={(e) => setHrStatusFilter(e.target.value)}
                  className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Deployed">Deployed</option>
                  <option value="Partially Allocated">Partially Allocated</option>
                  <option value="Bench">Bench</option>
                  <option value="On Leave">On Leave</option>
                </select>

                <select
                  value={hrDeptFilter}
                  onChange={(e) => setHrDeptFilter(e.target.value)}
                  className="h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto cursor-pointer"
                >
                  <option value="All">All Departments</option>
                  {[...new Set(hrAllocations.map((r) => r.department).filter(Boolean))].sort().map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {(hrSearch || hrStatusFilter !== "All" || hrDeptFilter !== "All") && (
                  <button
                    onClick={() => { setHrSearch(""); setHrStatusFilter("All"); setHrDeptFilter("All"); }}
                    className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <i className="fa-solid fa-xmark" /> Clear
                  </button>
                )}
              </div>

              <Button
                color="primary"
                size="sm"
                onClick={() => setShowHrModal(true)}
                className="gap-2 font-semibold h-9 shrink-0 cursor-pointer"
              >
                <i className="fa-solid fa-user-plus text-xs" /> Allocate Staff
              </Button>
            </div>
          </Card>

          {/* HR Resource Matrix Table */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-users-gear text-primary" /> Staff Deployment & Resource Allocation Matrix
              </CardTitle>
              <CardDescription>
                Manage departmental staffing allocations, billable weekly hours, and project assignments.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 px-4">Employee & Role</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">Assigned Project</th>
                    <th className="py-3 px-3 text-center">Allocated Hours</th>
                    <th className="py-3 px-3 text-center">Utilization</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3">Start Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {hrLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        <i className="fa-solid fa-spinner fa-spin mr-2" /> Loading staff allocations...
                      </td>
                    </tr>
                  ) : filteredHrAllocations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-muted-foreground">
                        No resource allocations found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredHrAllocations.map((res) => {
                      return (
                        <tr key={res._id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground">{res.employeeName}</div>
                            <div className="text-muted-foreground text-[11px] font-medium">{res.role}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-foreground">{res.department}</td>
                          <td className="py-3 px-3 font-medium text-foreground">{res.assignedProject}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold">{res.allocatedHoursPerWeek} hrs/wk</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1.5 justify-center">
                              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full", res.utilizationRate >= 100 ? "bg-emerald-500" : "bg-primary")}
                                  style={{ width: `${res.utilizationRate}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold font-mono">{res.utilizationRate}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {(() => {
                              const hrBadgeColors: Record<string, string> = {
                                "Deployed": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                                "Partially Allocated": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                                "Bench": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                                "On Leave": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
                              };
                              return (
                                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border", hrBadgeColors[res.status] || "bg-muted text-muted-foreground")}>
                                  {res.status}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground font-mono">{res.startDate}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditHrAllocation(res)}
                                className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer"
                                title="Edit Allocation"
                              >
                                <i className="fa-solid fa-pen text-[10px] text-primary" /> Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteHrAllocation(res._id)}
                                className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer text-destructive hover:text-destructive"
                                title="Remove Allocation"
                              >
                                <i className="fa-solid fa-trash text-[10px]" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* External Teams Tab View */}
      {activeTab === "external" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* External Teams Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total External Members</p>
                  <p className="text-2xl font-bold text-foreground">{externalMembers.length}</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <i className="fa-solid fa-building-user text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Contractors</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {externalMembers.filter((m) => m.status === "Active").length}
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <i className="fa-solid fa-user-check text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor Agencies</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {new Set(externalMembers.map((m) => m.companyName)).size}
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
                  <i className="fa-solid fa-briefcase text-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg. Hourly Rate</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    ${Math.round(externalMembers.reduce((acc, m) => acc + (m.hourlyRate || 0), 0) / (externalMembers.length || 1))}/hr
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                  <i className="fa-solid fa-dollar-sign text-xl" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* External Teams Search & Filter Toolbar */}
          <Card className="border border-border shadow-sm p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-muted-foreground text-xs" />
                <Input
                  placeholder="Search name, agency, role, project..."
                  value={externalSearch}
                  onChange={(e) => setExternalSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span>Category:</span>
                  <select
                    value={externalCategoryFilter}
                    onChange={(e) => setExternalCategoryFilter(e.target.value)}
                    className="h-9 px-2.5 py-1 text-xs bg-background border border-input rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Categories</option>
                    <option value="Software Development">Software Development</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="QA Testing">QA Testing</option>
                    <option value="DevOps & Infrastructure">DevOps & Infrastructure</option>
                    <option value="Marketing & Content">Marketing & Content</option>
                    <option value="Legal & Finance">Legal & Finance</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span>Status:</span>
                  <select
                    value={externalStatusFilter}
                    onChange={(e) => setExternalStatusFilter(e.target.value)}
                    className="h-9 px-2.5 py-1 text-xs bg-background border border-input rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Contract Ended">Contract Ended</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* External Teams Matrix Table */}
          <Card className="border border-border shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <i className="fa-solid fa-building-user text-primary" /> External Teams & Contractor Management Panel
              </CardTitle>
              <CardDescription>
                Vendor companies, external software contractors, design agencies, and external points-of-contact.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 px-4">Member Name & Email</th>
                    <th className="py-3 px-3">Agency / Vendor</th>
                    <th className="py-3 px-3">Role & Category</th>
                    <th className="py-3 px-3">Assigned Project</th>
                    <th className="py-3 px-3 text-center">Hourly Rate</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {externalLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        <i className="fa-solid fa-spinner fa-spin mr-2" /> Loading external teams...
                      </td>
                    </tr>
                  ) : filteredExternalMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No external team members found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExternalMembers.map((member) => (
                      <tr key={member._id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-foreground">{member.name}</div>
                          <div className="text-muted-foreground text-[11px] font-medium">{member.email}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <i className="fa-solid fa-building text-[10px] text-muted-foreground" />
                            {member.companyName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">{member.role}</div>
                          <Badge variant="soft" color="secondary" className="text-[10px] mt-0.5 px-1.5">
                            {member.serviceCategory}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-medium text-foreground">{member.assignedProject}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
                          ${member.hourlyRate}/hr
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant="soft"
                            color={
                              member.status === "Active"
                                ? "success"
                                : member.status === "On Hold"
                                ? "warning"
                                : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {member.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingExternalMember(member);
                                setExternalFormData({
                                  name: member.name || "",
                                  email: member.email || "",
                                  companyName: member.companyName || "",
                                  role: member.role || "",
                                  serviceCategory: member.serviceCategory as any,
                                  assignedProject: member.assignedProject || "",
                                  hourlyRate: member.hourlyRate || 0,
                                  currency: member.currency || "USD",
                                  status: member.status || "Active",
                                  phone: member.phone || "",
                                  notes: member.notes || "",
                                });
                                setShowExternalModal(true);
                              }}
                              className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer"
                              title="Edit Member"
                            >
                              <i className="fa-solid fa-pen text-[10px] text-primary" /> Edit
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setExternalToDelete(member);
                                setShowDeleteExternalModal(true);
                              }}
                              className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer text-destructive hover:text-destructive"
                              title="Remove Member"
                            >
                              <i className="fa-solid fa-trash text-[10px]" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}



      {/* New Sales Deal Modal */}
      {showSalesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => { setShowSalesModal(false); setEditingSalesDeal(null); }}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-handshake text-primary" /> {editingSalesDeal ? "Edit Sales Deal" : "Create New Sales Deal"}
              </h2>
              <button
                type="button"
                onClick={() => { setShowSalesModal(false); setEditingSalesDeal(null); }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>

            <form onSubmit={handleAddSalesDeal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Client Account Name *</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Acme FinTech Corp"
                    value={salesFormData.clientAccount}
                    onChange={(e) => setSalesFormData((prev) => ({ ...prev, clientAccount: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Deal Title *</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Cloud Migration Retainer"
                    value={salesFormData.dealName}
                    onChange={(e) => setSalesFormData((prev) => ({ ...prev, dealName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Deal Valuation ($)</label>
                  <Input
                    type="number"
                    placeholder="e.g. 45000"
                    value={salesFormData.dealValue}
                    onChange={(e) => setSalesFormData((prev) => ({ ...prev, dealValue: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Pipeline Stage</label>
                  <select
                    value={salesFormData.stage}
                    onChange={(e) => setSalesFormData((prev) => ({ ...prev, stage: e.target.value as SalesDeal["stage"] }))}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="Prospecting">Prospecting</option>
                    <option value="Discovery">Discovery</option>
                    <option value="Proposal Sent">Proposal Sent</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Closed Won">Closed Won</option>
                    <option value="Closed Lost">Closed Lost</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Win Probability ({salesFormData.probability}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={salesFormData.probability}
                    onChange={(e) => setSalesFormData((prev) => ({ ...prev, probability: Number(e.target.value) }))}
                    className="w-full cursor-pointer accent-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Deal Owner</label>
                  <Input
                    type="text"
                    placeholder="e.g. Alex Mercer"
                    value={salesFormData.owner}
                    onChange={(e) => setSalesFormData((prev) => ({ ...prev, owner: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Expected Target Close</label>
                  <Input
                    type="date"
                    value={salesFormData.expectedClose}
                    onChange={(e) => setSalesFormData((prev) => ({ ...prev, expectedClose: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Company Venture</label>
                  <select
                    value={salesFormData.venture}
                    onChange={(e) => setSalesFormData((prev) => ({ ...prev, venture: e.target.value }))}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="Ace Consultancys">Ace Consultancys</option>
                    <option value="NexAce Tech">NexAce Tech</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowSalesModal(false); setEditingSalesDeal(null); }} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" color="primary" size="sm" disabled={salesSubmitting} className="cursor-pointer gap-1.5">
                  {salesSubmitting ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving...</> : (editingSalesDeal ? "Save Changes" : "Create Sales Deal")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate HR Resource Modal */}
      {showHrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => { setShowHrModal(false); setEditingHrAllocation(null); }}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-primary" /> {editingHrAllocation ? "Edit Resource Allocation" : "Allocate Staff Resource"}
              </h2>
              <button
                type="button"
                onClick={() => { setShowHrModal(false); setEditingHrAllocation(null); }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>

            <form onSubmit={handleAddHrAllocation} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Employee Name *</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. David Kim"
                    value={hrFormData.employeeName}
                    onChange={(e) => setHrFormData((prev) => ({ ...prev, employeeName: e.target.value }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Role / Designation</label>
                  <Input
                    type="text"
                    placeholder="e.g. Senior Fullstack Lead"
                    value={hrFormData.role}
                    onChange={(e) => setHrFormData((prev) => ({ ...prev, role: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Department</label>
                  <select
                    value={hrFormData.department}
                    onChange={(e) => setHrFormData((prev) => ({ ...prev, department: e.target.value }))}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="QA">QA</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Product">Product</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Assigned Project</label>
                  <Input
                    type="text"
                    placeholder="e.g. Acme FinTech Retainer"
                    value={hrFormData.assignedProject}
                    onChange={(e) => setHrFormData((prev) => ({ ...prev, assignedProject: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Weekly Allocated Hours (hrs/wk)</label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={hrFormData.allocatedHoursPerWeek}
                    onChange={(e) => setHrFormData((prev) => ({ ...prev, allocatedHoursPerWeek: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Deployment Status</label>
                  <select
                    value={hrFormData.status}
                    onChange={(e) => setHrFormData((prev) => ({ ...prev, status: e.target.value as ResourceAllocation["status"] }))}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="Deployed">Deployed</option>
                    <option value="Partially Allocated">Partially Allocated</option>
                    <option value="Bench">Bench</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Allocation Effective Date</label>
                <Input
                  type="date"
                  value={hrFormData.startDate}
                  onChange={(e) => setHrFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowHrModal(false); setEditingHrAllocation(null); }} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" color="primary" size="sm" disabled={hrSubmitting} className="cursor-pointer gap-1.5">
                  {hrSubmitting ? <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving...</> : (editingHrAllocation ? "Save Changes" : "Allocate Resource")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Operations Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-list-check text-primary text-base" />
                {editingProject ? "Edit Operations Project" : "Add Operations Project"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Project ID *</label>
                  <Input
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    placeholder="e.g. CLP-001"
                    required
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-foreground">Client / Account *</label>
                  <Input
                    value={formData.clientAccount}
                    onChange={(e) => setFormData({ ...formData, clientAccount: e.target.value })}
                    placeholder="e.g. Ziqsy"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Venture *</label>
                  <Input
                    value={formData.venture}
                    onChange={(e) => setFormData({ ...formData, venture: e.target.value })}
                    placeholder="e.g. Ace Consultancys"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Project Name *</label>
                  <Input
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="e.g. Q3 Growth Retainer"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-semibold text-foreground">Account / Delivery Owner *</label>
                  <Input
                    value={formData.deliveryOwner}
                    onChange={(e) => setFormData({ ...formData, deliveryOwner: e.target.value })}
                    placeholder="e.g. Barkha"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Billing Type</label>
                  <Input
                    value={formData.billingType}
                    onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                    placeholder="e.g. Retainer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Phase</label>
                  <select
                    value={formData.phase}
                    onChange={(e) => setFormData({ ...formData, phase: e.target.value as any })}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="In Delivery">In Delivery</option>
                    <option value="Closed - follow">Closed - follow</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Closed - Not">Closed - Not</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Health</label>
                  <select
                    value={formData.health}
                    onChange={(e) => setFormData({ ...formData, health: e.target.value as any })}
                    className="w-full h-9 px-3 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Green">Green</option>
                    <option value="Amber">Amber</option>
                    <option value="Red">Red</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Target End Date</label>
                  <Input
                    type="date"
                    value={formData.targetEndDate}
                    onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Est. Hours</label>
                  <Input
                    type="number"
                    value={formData.estHours}
                    onChange={(e) => setFormData({ ...formData, estHours: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Actual Hours Logged</label>
                  <Input
                    type="number"
                    value={formData.actualHours}
                    onChange={(e) => setFormData({ ...formData, actualHours: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">% Tasks Complete</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.progressPercent}
                    onChange={(e) => setFormData({ ...formData, progressPercent: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Project Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Additional project notes, scope details..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button color="primary" size="sm" type="submit" className="font-semibold">
                  Save Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Tracker Modal */}
      {showHistoryModal && historyProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            setShowHistoryModal(false);
            setHistoryProject(null);
          }}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-primary text-base" />
                  Interaction History & Logs
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                  {historyProject.projectId} — {historyProject.projectName} ({historyProject.clientAccount})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportSingleProject(historyProject)}
                  className="gap-1.5 text-xs font-semibold h-8 cursor-pointer"
                  title="Export Project Details & Timeline"
                >
                  <i className="fa-solid fa-download text-xs text-primary" /> Export
                </Button>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryProject(null);
                  }}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Scrollable Logs & Add Form */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 min-h-0">
              {/* Form to Log New Interaction */}
              <form onSubmit={handleAddHistoryLog} className="bg-muted/30 p-4 rounded-xl border border-border/60 space-y-3 shrink-0">
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <i className="fa-solid fa-circle-plus text-primary text-xs" /> Log New Interaction
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Channel</label>
                    <select
                      value={newLogType}
                      onChange={(e) => setNewLogType(e.target.value as any)}
                      className="w-full h-8 px-2 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                    >
                      <option value="Note">Note</option>
                      <option value="Email">Email</option>
                      <option value="Call">Call</option>
                      <option value="Meeting">Meeting</option>
                    </select>
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Interaction Summary / Description</label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={newLogSummary}
                        onChange={(e) => setNewLogSummary(e.target.value)}
                        placeholder="e.g. Discussed extension of Q3 scope by 20 hours"
                        className="h-8 text-xs flex-1"
                        required
                      />
                      <Button color="primary" size="sm" type="submit" disabled={submittingHistory} className="h-8 px-4 font-semibold text-xs whitespace-nowrap">
                        {submittingHistory ? "Logging..." : "Log Entry"}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>

              {/* List of Previous Interactions */}
              <div className="space-y-3">
                <div className="font-bold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <i className="fa-solid fa-list-ul text-primary text-xs" /> Interaction Timeline
                </div>

                {!historyProject.contactHistory || historyProject.contactHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                    No history entries logged yet. Create the first entry using the form above.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/60">
                    {historyProject.contactHistory
                      .slice()
                      .reverse()
                      .map((log, idx) => {
                        const iconMap: Record<string, string> = {
                          Note: "fa-clipboard-user text-slate-500 bg-slate-500/10",
                          Email: "fa-envelope text-sky-500 bg-sky-500/10",
                          Call: "fa-phone text-emerald-500 bg-emerald-500/10",
                          Meeting: "fa-handshake text-violet-500 bg-violet-500/10",
                        };
                        const iconConfig = iconMap[log.type] || "fa-clipboard text-slate-500 bg-slate-500/10";
                        const [faClass, textClass, bgClass] = iconConfig.split(" ");

                        return (
                          <div key={log._id || idx} className="flex gap-3 items-start relative pl-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-border/60 z-10 ${bgClass}`}>
                              <i className={`fa-solid ${faClass} ${textClass} text-[11px]`} />
                            </div>
                            <div className="flex-1 bg-background border border-border p-3 rounded-lg shadow-sm space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{log.type}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(log.date).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-foreground font-medium leading-relaxed">{log.summary}</p>
                              <div className="text-[10px] text-muted-foreground text-right pt-0.5 border-t border-border/30">
                                Logged by: <strong className="text-foreground">{log.authorName}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
            {/* Footer */}
            <div className="border-t border-border pt-3 shrink-0 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowHistoryModal(false);
                  setHistoryProject(null);
                }}
              >
                Close Timeline
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Project Details Modal */}
      {showViewModal && viewingProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={() => {
            setShowViewModal(false);
            setViewingProject(null);
          }}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border/80 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 flex flex-col max-h-[90vh] border-t-4 border-t-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/80 pb-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-extrabold text-primary bg-primary/10 border border-primary/30 px-2.5 py-1 rounded-md shadow-2xs">
                  {viewingProject.projectId}
                </span>
                <div>
                  <h3 className="font-extrabold text-xl text-foreground tracking-tight truncate max-w-[340px]">
                    {viewingProject.projectName}
                  </h3>
                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <i className="fa-solid fa-calendar-plus text-[10px] text-primary" />
                    Created on: {new Date(viewingProject.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowViewModal(false);
                  setViewingProject(null);
                }}
                className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Scrollable Details Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs min-h-0">
              {/* Account & Venture Banner */}
              <div className="grid grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border/70 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                    <i className="fa-solid fa-building" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client / Account</p>
                    <p className="font-extrabold text-foreground text-sm mt-0.5 truncate">{viewingProject.clientAccount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-500/20">
                    <i className="fa-solid fa-briefcase" />
                  </div>
                  <div className="truncate">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Venture</p>
                    <p className="font-extrabold text-foreground text-sm mt-0.5 truncate">{viewingProject.venture}</p>
                  </div>
                </div>
              </div>

              {/* Badges & Status Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-muted/20 rounded-xl border border-border/60 text-center">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Phase</p>
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shadow-2xs", phaseColors[viewingProject.phase])}>
                    {viewingProject.phase}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Priority</p>
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shadow-2xs", priorityColors[viewingProject.priority])}>
                    {viewingProject.priority} Priority
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Health</p>
                  <span className={cn("inline-flex items-center justify-center w-16 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-2xs", healthColors[viewingProject.health])}>
                    {viewingProject.health}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Billing Type</p>
                  <span className="font-extrabold text-foreground block pt-0.5 text-xs">{viewingProject.billingType}</span>
                </div>
              </div>

              {/* Hours & Completion Progress Card */}
              {(() => {
                const hoursVariance = (viewingProject.estHours || 0) - (viewingProject.actualHours || 0);
                return (
                  <div className="space-y-3.5 bg-muted/40 p-4 rounded-xl border border-border/80 shadow-inner">
                    <div className="grid grid-cols-3 gap-3 font-mono">
                      <div className="bg-background/80 p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Est Hours</p>
                        <p className="text-base font-extrabold text-foreground mt-0.5">{viewingProject.estHours}h</p>
                      </div>
                      <div className="bg-background/80 p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Actual Hours</p>
                        <p className="text-base font-extrabold text-foreground mt-0.5">{viewingProject.actualHours}h</p>
                      </div>
                      <div className="bg-background/80 p-3 rounded-lg border border-border/50 text-center">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Variance</p>
                        <p className={cn("text-base font-extrabold mt-0.5", hoursVariance < 0 ? "text-rose-500" : "text-emerald-500")}>
                          {hoursVariance > 0 ? `+${hoursVariance}` : hoursVariance}h
                        </p>
                      </div>
                    </div>
                    {/* Task Progress Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <div className="flex justify-between items-center text-[11px] font-semibold">
                        <span className="text-muted-foreground font-bold flex items-center gap-1.5">
                          <i className="fa-solid fa-[#00D09c] fa-list-check text-primary text-xs" /> Task Completion Progress
                        </span>
                        <span className="font-mono font-extrabold text-foreground">{viewingProject.progressPercent}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted dark:bg-slate-800 rounded-full overflow-hidden border border-border/50 shadow-inner">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", viewingProject.progressPercent === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-indigo-500")}
                          style={{ width: `${viewingProject.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dates & Owner */}
              {(() => {
                const daysRemaining = viewingProject.targetEndDate
                  ? Math.max(0, Math.ceil((new Date(viewingProject.targetEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                  : 0;
                return (
                  <div className="grid grid-cols-3 gap-3 p-3.5 bg-muted/20 rounded-xl border border-border/60 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                        <i className="fa-solid fa-user-tie text-[10px] text-primary" /> Delivery Owner
                      </span>
                      <p className="font-extrabold text-primary text-sm mt-0.5 truncate">{viewingProject.deliveryOwner}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                        <i className="fa-solid fa-calendar-play text-[10px] text-primary" /> Start Date
                      </span>
                      <p className="font-extrabold text-foreground text-xs font-mono mt-0.5">
                        {viewingProject.startDate ? new Date(viewingProject.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1">
                        <i className="fa-solid fa-clock text-[10px] text-primary" /> Time Remaining
                      </span>
                      <p className="font-extrabold text-foreground text-xs font-mono mt-0.5">
                        {daysRemaining} Days <span className="opacity-60">({viewingProject.targetEndDate ? new Date(viewingProject.targetEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"})</span>
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Scope Notes */}
              {viewingProject.notes && (
                <div className="space-y-1.5 bg-muted/30 p-4 rounded-xl border border-border/60 shadow-2xs">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-note-sticky text-primary text-xs" /> Project Scope & Notes
                  </p>
                  <p className="text-foreground font-medium whitespace-pre-wrap leading-relaxed bg-background/60 p-3 rounded-lg border border-border/40 text-xs">
                    {viewingProject.notes}
                  </p>
                </div>
              )}

              {/* Embedded Interaction History Timeline */}
              <div className="space-y-3 pt-2">
                <div className="font-bold text-xs text-foreground flex items-center justify-between border-t border-border/80 pt-3">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-extrabold">
                    <i className="fa-solid fa-timeline text-primary text-xs" /> Interaction Timeline ({viewingProject.contactHistory?.length || 0} entries)
                  </span>
                </div>

                {!viewingProject.contactHistory || viewingProject.contactHistory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border-2 border-dashed border-border/60 rounded-xl bg-muted/10">
                    <i className="fa-solid fa-box-open text-2xl opacity-30 mb-1 block" />
                    No history logs recorded yet for this project.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border/80">
                    {viewingProject.contactHistory
                      .slice()
                      .reverse()
                      .map((log, idx) => {
                        const iconMap: Record<string, string> = {
                          Note: "fa-clipboard-user text-slate-500 bg-slate-500/10",
                          Email: "fa-envelope text-sky-500 bg-sky-500/10",
                          Call: "fa-phone text-emerald-500 bg-emerald-500/10",
                          Meeting: "fa-handshake text-violet-500 bg-violet-500/10",
                        };
                        const iconConfig = iconMap[log.type] || "fa-clipboard text-slate-500 bg-slate-500/10";
                        const [faClass, textClass, bgClass] = iconConfig.split(" ");

                        return (
                          <div key={log._id || idx} className="flex gap-3 items-start relative pl-1">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border border-border/60 z-10 ${bgClass}`}>
                              <i className={`fa-solid ${faClass} ${textClass} text-[11px]`} />
                            </div>
                            <div className="flex-1 bg-background border border-border/80 p-3.5 rounded-xl shadow-2xs space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{log.type}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  {new Date(log.date).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="text-xs text-foreground font-medium leading-relaxed">{log.summary}</p>
                              <div className="text-[10px] text-muted-foreground text-right pt-1 border-t border-border/30">
                                Logged by: <strong className="text-foreground font-bold">{log.authorName}</strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3.5 border-t border-border/80 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  handleExportSingleProject(viewingProject);
                }}
                className="gap-2 font-bold cursor-pointer h-9 px-3.5"
              >
                <i className="fa-solid fa-file-csv text-xs text-primary" /> Export Full Details
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  color="primary"
                  size="sm"
                  onClick={() => {
                    setShowViewModal(false);
                    handleOpenModal(viewingProject);
                  }}
                  className="gap-2 font-bold cursor-pointer h-9 px-4 shadow-md shadow-primary/20"
                >
                  <i className="fa-solid fa-pen-to-square text-xs" /> Edit Project
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit External Member Modal */}
      {showExternalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            setShowExternalModal(false);
            setEditingExternalMember(null);
          }}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-building-user text-primary" />
                {editingExternalMember ? "Edit External Team Member" : "Add External Member / Vendor"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowExternalModal(false);
                  setEditingExternalMember(null);
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!externalFormData.name || !externalFormData.email) return;

                setExternalSubmitting(true);
                try {
                  const isEdit = Boolean(editingExternalMember);
                  const url = isEdit
                    ? `/api/operations/external-teams/${editingExternalMember!._id}`
                    : "/api/operations/external-teams";
                  const method = isEdit ? "PATCH" : "POST";

                  const res = await fetch(url, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(externalFormData),
                  });

                  if (res.ok) {
                    fetchExternalMembers();
                    setShowExternalModal(false);
                  } else {
                    const err = await res.json();
                    alert(err.error || "Failed to save external team member.");
                  }
                } catch (err) {
                  console.error(err);
                  alert("Failed to save external team member.");
                } finally {
                  setExternalSubmitting(false);
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Full Name *</label>
                  <Input
                    required
                    placeholder="e.g. Alex Rivera"
                    value={externalFormData.name}
                    onChange={(e) => setExternalFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Email Address *</label>
                  <Input
                    required
                    type="email"
                    placeholder="alex@vendor.com"
                    value={externalFormData.email}
                    onChange={(e) => setExternalFormData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Company / Vendor Name</label>
                  <Input
                    placeholder="e.g. PixelCraft Agency"
                    value={externalFormData.companyName}
                    onChange={(e) => setExternalFormData((prev) => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Role Title</label>
                  <Input
                    placeholder="e.g. Senior Frontend Contractor"
                    value={externalFormData.role}
                    onChange={(e) => setExternalFormData((prev) => ({ ...prev, role: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Service Category</label>
                  <select
                    value={externalFormData.serviceCategory}
                    onChange={(e) => setExternalFormData((prev) => ({ ...prev, serviceCategory: e.target.value as any }))}
                    className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="Software Development">Software Development</option>
                    <option value="UI/UX Design">UI/UX Design</option>
                    <option value="QA Testing">QA Testing</option>
                    <option value="DevOps & Infrastructure">DevOps & Infrastructure</option>
                    <option value="Marketing & Content">Marketing & Content</option>
                    <option value="Legal & Finance">Legal & Finance</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Assigned Project</label>
                  <Input
                    placeholder="e.g. CRM Cloud Infrastructure"
                    value={externalFormData.assignedProject}
                    onChange={(e) => setExternalFormData((prev) => ({ ...prev, assignedProject: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Hourly Rate ($/hr)</label>
                  <Input
                    type="number"
                    min={0}
                    value={externalFormData.hourlyRate}
                    onChange={(e) => setExternalFormData((prev) => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Status</label>
                  <select
                    value={externalFormData.status}
                    onChange={(e) => setExternalFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full h-9 px-3 py-1 bg-background border border-input rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Contract Ended">Contract Ended</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Contact Phone (Optional)</label>
                <Input
                  placeholder="+1 (555) 000-0000"
                  value={externalFormData.phone}
                  onChange={(e) => setExternalFormData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Notes / SLA Details</label>
                <textarea
                  rows={3}
                  placeholder="Contract terms, deliverables, or vendor notes..."
                  value={externalFormData.notes}
                  onChange={(e) => setExternalFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 bg-background border border-input rounded-md text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowExternalModal(false);
                    setEditingExternalMember(null);
                  }}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" color="primary" size="sm" disabled={externalSubmitting} className="cursor-pointer">
                  {externalSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin mr-1.5" /> Saving...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check mr-1.5" /> {editingExternalMember ? "Update Member" : "Save External Member"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete External Member Confirmation Modal */}
      {showDeleteExternalModal && externalToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => {
            setShowDeleteExternalModal(false);
            setExternalToDelete(null);
          }}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl shadow-xl p-6 space-y-4 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-3 bg-destructive/10 rounded-full">
                <i className="fa-solid fa-triangle-exclamation text-xl" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Remove External Member</h3>
                <p className="text-muted-foreground text-xs">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-muted-foreground">
              Are you sure you want to remove <strong className="text-foreground">{externalToDelete.name}</strong> ({externalToDelete.companyName}) from external teams?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDeleteExternalModal(false);
                  setExternalToDelete(null);
                }}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                color="destructive"
                size="sm"
                disabled={isDeletingExternal}
                onClick={async () => {
                  if (!externalToDelete) return;
                  setIsDeletingExternal(true);
                  try {
                    const res = await fetch(`/api/operations/external-teams/${externalToDelete._id}`, {
                      method: "DELETE",
                    });
                    if (res.ok) {
                      setExternalMembers((prev) => prev.filter((m) => m._id !== externalToDelete._id));
                      setShowDeleteExternalModal(false);
                      setExternalToDelete(null);
                    } else {
                      const err = await res.json();
                      alert(err.error || "Failed to delete external member.");
                    }
                  } catch (err) {
                    console.error(err);
                    alert("Failed to delete external member.");
                  } finally {
                    setIsDeletingExternal(false);
                  }
                }}
                className="cursor-pointer"
              >
                {isDeletingExternal ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-1.5" /> Removing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash mr-1.5" /> Delete Member
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
