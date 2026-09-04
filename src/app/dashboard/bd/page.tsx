"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { LeadDetailPanel, CURRENCY_OPTIONS, getCurrencySymbol } from "@/components/bd/LeadDetailPanel";
import { LeadImportModal } from "@/components/bd/LeadImportModal";
import type { Lead } from "@/components/bd/LeadDetailPanel";
import ProposalModal from "@/components/bd/ProposalModal";
import type { ProposalFormData } from "@/components/bd/ProposalModal";
import ProposalPreviewModal from "@/components/bd/ProposalPreviewModal";
import type { ProposalPreviewData } from "@/components/bd/ProposalPreviewModal";
import SendProposalModal from "@/components/bd/SendProposalModal";
import DealsDashboard from "@/components/bd/DealsDashboard";
import { SalesExecutiveDashboard } from "@/components/bd/SalesExecutiveDashboard";

// ─── Re-export Lead type for convenience ─────────────────────────────────────
export type { Lead };

// ─── Formatters ───────────────────────────────────────────────────────────────
const formatUSD = (val: number | string) => {
  const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0 : Number(val) || 0;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num);
};
const formatCurrency = (val: number | string, curr: string = "USD") => {
  const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0 : Number(val) || 0;
  return `${getCurrencySymbol(curr)}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num)}`;
};
const formatUSDDec = (val: number | string) => {
  const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0 : Number(val) || 0;
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
};

const getLeadsCurrency = (leadList: Lead[]): string => {
  if (!leadList || leadList.length === 0) return "USD";
  const counts: Record<string, number> = {};
  leadList.forEach((l) => {
    const c = l.currency || "USD";
    counts[c] = (counts[c] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";
};

const formatLeadsTotal = (leadList: Lead[]): string => {
  if (!leadList || leadList.length === 0) return "$0";
  const totalsByCurrency: Record<string, number> = {};
  leadList.forEach((l) => {
    const c = (l.currency || "USD").toUpperCase();
    const val = Number(l.value) || 0;
    totalsByCurrency[c] = (totalsByCurrency[c] || 0) + val;
  });
  const entries = Object.entries(totalsByCurrency).filter(([_, sum]) => sum > 0);
  if (entries.length === 0) return "$0";
  if (entries.length === 1) return formatCurrency(entries[0][1], entries[0][0]);
  return entries.map(([c, sum]) => formatCurrency(sum, c)).join(" • ");
};

const getProposalsCurrency = (propList: Array<{ currency?: string }>): string => {
  if (!propList || propList.length === 0) return "USD";
  const counts: Record<string, number> = {};
  propList.forEach((p) => {
    const c = p.currency || "USD";
    counts[c] = (counts[c] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";
};

const formatProposalsTotal = (propList: Array<{ totalValue?: number; currency?: string }>): string => {
  if (!propList || propList.length === 0) return "$0";
  const totalsByCurrency: Record<string, number> = {};
  propList.forEach((p) => {
    const c = (p.currency || "USD").toUpperCase();
    const val = Number(p.totalValue) || 0;
    totalsByCurrency[c] = (totalsByCurrency[c] || 0) + val;
  });
  const entries = Object.entries(totalsByCurrency).filter(([_, sum]) => sum > 0);
  if (entries.length === 0) return "$0";
  if (entries.length === 1) return formatCurrency(entries[0][1], entries[0][0]);
  return entries.map(([c, sum]) => formatCurrency(sum, c)).join(" • ");
};

const getDealsCurrency = (dealList: Array<{ currency?: string }>): string => {
  if (!dealList || dealList.length === 0) return "USD";
  const counts: Record<string, number> = {};
  dealList.forEach((d) => {
    const c = d.currency || "USD";
    counts[c] = (counts[c] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "USD";
};

const formatDealsTotal = (dealList: Array<{ dealValue?: number; currency?: string }>, amount?: number): string => {
  if (!dealList || dealList.length === 0) return "$0";
  if (amount !== undefined) {
    const curr = getDealsCurrency(dealList);
    return formatCurrency(amount, curr);
  }
  const totalsByCurrency: Record<string, number> = {};
  dealList.forEach((d) => {
    const c = (d.currency || "USD").toUpperCase();
    const val = Number(d.dealValue) || 0;
    totalsByCurrency[c] = (totalsByCurrency[c] || 0) + val;
  });
  const entries = Object.entries(totalsByCurrency).filter(([_, sum]) => sum > 0);
  if (entries.length === 0) return "$0";
  if (entries.length === 1) return formatCurrency(entries[0][1], entries[0][0]);
  return entries.map(([c, sum]) => formatCurrency(sum, c)).join(" • ");
};

// ─── Lead Status Config ───────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Lead["status"], { label: string; cls: string }> = {
  New: { label: "New", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30" },
  Contacted: { label: "Contacted", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" },
  Qualified: { label: "Qualified", cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30" },
  Proposal: { label: "Proposal", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30" },
  Negotiation: { label: "Negotiation", cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30" },
  Closed: { label: "Closed", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" },
  Lost: { label: "Lost", cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" },
};

const STAGE_CONFIG = {
  "Inpipeline": { color: "#3B82F6", pct: 30 },
  "Follow Up": { color: "#22C55E", pct: 35 },
  "Schedule Service": { color: "#F59E0B", pct: 10 },
  "Conversation": { color: "#EF4444", pct: 25 },
};

// Company logo initials color palette
const COMPANY_COLORS = ["bg-blue-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-violet-500", "bg-sky-500", "bg-orange-500", "bg-teal-500"];

export default function BDPortalPage() {
  const { can, canAccessModule, isAdmin, isOPS, loading: permLoading } = usePermissions();
  const { user: currentUser } = useAuth();

  // ── Tab State ──
  const [activeTab, setActiveTab] = useState<"dashboard" | "leads">("dashboard");
  const [leadsSubTab, setLeadsSubTab] = useState<"overview" | "all" | "deals" | "sales" | "proposals">("overview");
  const [leadsLayout, setLeadsLayout] = useState<"list" | "grid">("grid");
  // Thread stage filter from SalesExecutiveDashboard into DealsDashboard
  const [dealStageNavFilter, setDealStageNavFilter] = useState<string | undefined>(undefined);
  // Track active conversion sources to automatically update status and route across lifecycle
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);
  const [convertingDealId, setConvertingDealId] = useState<string | null>(null);


  // ── Selected Lead (Detail Panel) ──
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // ── Deals State ──
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<SalesDeal | null>(null);
  const [dealSubmitting, setDealSubmitting] = useState(false);
  const [dealFormData, setDealFormData] = useState({
    clientAccount: "", dealName: "", dealValue: "",
    stage: "Prospecting" as SalesDeal["stage"], probability: 50,
    owner: "", expectedClose: "", venture: "Ace Consultancys", notes: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "deal" | "lead"; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Leads State ──
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("All");
  const [leadStageFilter, setLeadStageFilter] = useState("All");
  const [leadTypeFilter, setLeadTypeFilter] = useState("All");
  const [leadSortBy, setLeadSortBy] = useState<"newest" | "value_desc" | "value_asc" | "name">("newest");
  const [leadFormData, setLeadFormData] = useState({
    leadName: "", companyName: "", phone: "", email: "",
    status: "New" as Lead["status"], stage: "Inpipeline" as Lead["stage"],
    leadType: "External" as "Internal" | "External",
    value: "", currency: "USD", location: "",
    source: "", owner: "", venture: "Ace Consultancys", notes: "",
  });
  const [leadsTimeFilter, setLeadsTimeFilter] = useState("Last 30 days");
  const [showLeadsTimeDropdown, setShowLeadsTimeDropdown] = useState(false);
  const [showStageTimeDropdown, setShowStageTimeDropdown] = useState(false);
  const [stageTimeFilter, setStageTimeFilter] = useState("Last 30 Days");
  const [hoveredGrowthMonth, setHoveredGrowthMonth] = useState<number | null>(null);
  const [growthPeriod, setGrowthPeriod] = useState<"Last Year" | "Last 6 Months" | "This Year">("Last Year");
  const [showGrowthDropdown, setShowGrowthDropdown] = useState(false);
  const [pipelineFilter, setPipelineFilter] = useState("Sales Pipeline");
  const [showPipelineDropdown, setShowPipelineDropdown] = useState(false);

  // ── Drag & Drop Kanban State ──
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // ── Dashboard UI States ──
  const [revenueTimeframe, setRevenueTimeframe] = useState<"weekly" | "monthly" | "yearly">("weekly");
  const [dealsTimeframe, setDealsTimeframe] = useState<"Weekly" | "Monthly" | "All">("Weekly");
  const [showDealsDropdown, setShowDealsDropdown] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState("All Time");
  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──
  const fetchDeals = async () => {
    try { setLoadingDeals(true); const res = await fetch("/api/operations/sales-deals"); if (res.ok) { const data = await res.json(); setDeals(data.deals || []); } } catch { } finally { setLoadingDeals(false); }
  };
  const fetchLeads = async () => {
    try { setLoadingLeads(true); const res = await fetch("/api/bd/leads"); if (res.ok) { const data = await res.json(); setLeads(data.leads || []); } } catch { } finally { setLoadingLeads(false); }
  };

  // ── Proposals State ──
  type ProposalAttachment = { name: string; url: string; size?: number; type?: string; uploadedAt?: string | Date };
  type ProposalItem = { description: string; quantity: number; unitPrice: number; amount: number };
  type Proposal = {
    _id: string; proposalCode: string; subject: string; projectName?: string;
    clientName: string; clientEmail?: string; clientCompany?: string; clientAvatarColor?: string;
    items?: ProposalItem[];
    attachments?: ProposalAttachment[];
    subtotal: number; taxRate: number; taxAmount: number; totalValue: number; currency: string;
    issueDate: string; openTill: string; status: "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";
    signedBy?: string; signedAt?: string; signatureType?: "drawn" | "typed"; signatureImage?: string;
    convertedInvoiceId?: string; convertedProjectId?: string;
    description?: string; terms?: string; tags?: string[];
  };
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [sendEmailProposal, setSendEmailProposal] = useState<Proposal | null>(null);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalSearch, setProposalSearch] = useState("");
  const [proposalStatusFilter, setProposalStatusFilter] = useState("All");
  const [proposalSortBy, setProposalSortBy] = useState<"newest" | "value_desc" | "value_asc" | "expiring_soon" | "name">("newest");
  const [proposalLayout, setProposalLayout] = useState<"grid" | "list">("grid");
  const [previewProposal, setPreviewProposal] = useState<Proposal | null>(null);
  const [proposalActionMenu, setProposalActionMenu] = useState<string | null>(null);
  const [copiedProposalCode, setCopiedProposalCode] = useState<string | null>(null);
  const [deleteProposalTarget, setDeleteProposalTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingProposal, setIsDeletingProposal] = useState(false);

  const fetchProposals = async () => {
    try {
      setLoadingProposals(true);
      const res = await fetch("/api/bd/proposals");
      if (res.ok) { const data = await res.json(); setProposals(data.proposals || []); }
    } catch { } finally { setLoadingProposals(false); }
  };

  const handleConvertToInvoice = async (p: Proposal) => {
    try {
      showToast(`Converting #${p.proposalCode} to invoice...`);
      const res = await fetch("/api/bd/proposals/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: p._id, convertTo: "invoice" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");
      showToast(`Created Invoice ${data.invoiceNo}! Accessible under Finance > Invoices.`);
      setPreviewProposal((prev) => (prev && prev._id === p._id ? { ...prev, convertedInvoiceId: data.invoiceId } : prev));
      await fetchProposals();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to convert to invoice", "error");
    } finally {
      setProposalActionMenu(null);
    }
  };

  const handleConvertToProject = async (p: Proposal) => {
    try {
      showToast(`Converting #${p.proposalCode} to project...`);
      const res = await fetch("/api/bd/proposals/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: p._id, convertTo: "project" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Conversion failed");
      showToast(`Created Project '${data.projectName}'! Accessible under Projects module.`);
      setPreviewProposal((prev) => (prev && prev._id === p._id ? { ...prev, convertedProjectId: data.projectId } : prev));
      await fetchProposals();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to convert to project", "error");
    } finally {
      setProposalActionMenu(null);
    }
  };

  const handleCopyPublicLink = (proposalId: string) => {
    const url = `${window.location.origin}/proposals/${proposalId}`;
    navigator.clipboard.writeText(url);
    showToast("Shareable client portal link copied!");
    setProposalActionMenu(null);
  };

  const handleGenerateInvoiceFromDeal = async (deal: SalesDeal) => {
    try {
      showToast(`Generating Invoice for ${deal.clientAccount}...`);
      const countRes = await fetch("/api/finance/invoices");
      let count = 1;
      if (countRes.ok) {
        const countData = await countRes.json();
        count = (countData.invoices?.length || 0) + 1;
      }
      const invoiceNo = `INV-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;
      const res = await fetch("/api/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo,
          client: deal.clientAccount,
          amount: Number(deal.dealValue) || 0,
          currency: "USD",
          status: "Pending",
          issuedDate: new Date().toISOString().split("T")[0],
          dueDate: deal.expectedClose ? deal.expectedClose.split("T")[0] : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
          category: "Client Billing",
          venture: deal.venture || "Ace Consultancys",
          lineItems: [
            {
              description: deal.dealName,
              quantity: 1,
              unitPrice: Number(deal.dealValue) || 0,
              amount: Number(deal.dealValue) || 0,
            },
          ],
          notes: `Generated from Won Deal: ${deal.dealName} (${deal.clientAccount}). Notes: ${deal.notes || "None"}`,
        }),
      });
      if (res.ok) {
        showToast(`Created Invoice ${invoiceNo} in Finance Portal!`);
        // If there is any matching lead with this company/name, update to Closed
        const matchedLead = leads.find(l => 
          (l.companyName && deal.clientAccount && l.companyName.toLowerCase() === deal.clientAccount.toLowerCase()) ||
          (l.leadName && deal.dealName && deal.dealName.toLowerCase().includes(l.leadName.toLowerCase()))
        );
        if (matchedLead && matchedLead.status !== "Closed") {
          await fetch(`/api/bd/leads/${matchedLead._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Closed", stage: "Closed" }),
          });
          await fetchLeads();
        }
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to generate invoice", "error");
      }
    } catch {
      showToast("Failed to generate invoice", "error");
    }
  };

  const handleCreateProposal = async (formData: ProposalFormData) => {
    try {
      setProposalSubmitting(true);
      const items = formData.items.map(i => ({ ...i, quantity: parseFloat(i.quantity) || 0, unitPrice: parseFloat(i.unitPrice) || 0 }));
      const isEdit = Boolean(editingProposal && editingProposal._id && editingProposal._id.trim() !== "");
      const endpoint = "/api/bd/proposals";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { id: editingProposal!._id, ...formData, items, attachments: formData.attachments || [], taxRate: parseFloat(formData.taxRate) || 0, tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean) }
        : {
            ...formData,
            items,
            attachments: formData.attachments || [],
            taxRate: parseFloat(formData.taxRate) || 0,
            tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
            ...(convertingDealId ? { dealId: convertingDealId } : {}),
            ...(convertingLeadId ? { leadId: convertingLeadId } : {}),
          };
      const res = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save proposal");
      }
      await fetchProposals();

      // If converted from a lead, advance the lead's status to Proposal in DB
      if (convertingLeadId) {
        await fetch(`/api/bd/leads/${convertingLeadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Proposal", stage: "Inpipeline" }),
        });
        await fetchLeads();
        setConvertingLeadId(null);
      }

      // If converted from a deal, advance deal stage to Proposal Sent in DB
      if (convertingDealId) {
        await fetch(`/api/operations/sales-deals/${convertingDealId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: "Proposal Sent" }),
        });
        await fetchDeals();
        setConvertingDealId(null);
      }

      setShowProposalModal(false);
      setEditingProposal(null);
      // Seamlessly navigate to proposals view so the user immediately sees the generated proposal
      setLeadsSubTab("proposals");
      showToast(isEdit ? "Proposal updated!" : "Proposal created! Navigated to Proposals view.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save proposal", "error");
    } finally {
      setProposalSubmitting(false);
    }
  };



  const handleProposalStatusChange = async (
    id: string,
    status: Proposal["status"],
    signatureData?: { signedBy: string; signedAt: string; signatureType?: "drawn" | "typed"; signatureImage?: string }
  ) => {
    try {
      const res = await fetch("/api/bd/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, ...(signatureData || {}) }),
      });
      if (!res.ok) throw new Error();
      setProposals(prev => prev.map(p => p._id === id ? { ...p, status, ...(signatureData || {}) } : p));
      if (previewProposal && previewProposal._id === id) {
        setPreviewProposal(prev => prev ? { ...prev, status, ...(signatureData || {}) } : null);
      }
      showToast(`Proposal marked as ${status}`);
    } catch { showToast("Status update failed", "error"); }
    finally { setProposalActionMenu(null); }
  };

  const handleCopyProposalCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedProposalCode(code);
    setTimeout(() => setCopiedProposalCode(null), 2000);
    showToast(`Copied ${code} to clipboard`);
  };

  const handleCloneProposal = async (source: Proposal) => {
    try {
      showToast(`Duplicating #${source.proposalCode}...`);
      const body = {
        subject: `${source.subject} (Copy)`,
        projectName: source.projectName,
        clientName: source.clientName,
        clientEmail: source.clientEmail,
        clientCompany: source.clientCompany,
        currency: source.currency,
        issueDate: new Date().toISOString().split("T")[0],
        openTill: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        status: "Draft",
        taxRate: source.taxRate,
        description: source.description,
        terms: source.terms,
        tags: source.tags || [],
        items: source.items || [],
        attachments: source.attachments || [],
      };
      const res = await fetch("/api/bd/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await fetchProposals();
      showToast(`Proposal duplicated as Draft!`);
    } catch {
      showToast("Failed to clone proposal", "error");
    } finally {
      setProposalActionMenu(null);
    }
  };

  const handleExportProposalsCSV = (list: Proposal[]) => {
    if (list.length === 0) {
      showToast("No proposals to export", "error");
      return;
    }
    const headers = ["Proposal Code", "Subject", "Client Name", "Client Company", "Client Email", "Project Name", "Status", "Currency", "Subtotal", "Tax Amount", "Total Value", "Issue Date", "Open Till"];
    const rows = list.map(p => [
      `"${p.proposalCode}"`,
      `"${(p.subject || "").replace(/"/g, '""')}"`,
      `"${(p.clientName || "").replace(/"/g, '""')}"`,
      `"${(p.clientCompany || "").replace(/"/g, '""')}"`,
      `"${(p.clientEmail || "").replace(/"/g, '""')}"`,
      `"${(p.projectName || "").replace(/"/g, '""')}"`,
      `"${p.status}"`,
      `"${p.currency}"`,
      p.subtotal ?? 0,
      p.taxAmount ?? 0,
      p.totalValue ?? 0,
      `"${p.issueDate ? new Date(p.issueDate).toISOString().split("T")[0] : ""}"`,
      `"${p.openTill ? new Date(p.openTill).toISOString().split("T")[0] : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nexace_proposals_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${list.length} proposals to CSV`);
  };

  const handleDeleteProposal = async () => {
    if (!deleteProposalTarget) return;
    try {
      setIsDeletingProposal(true);
      const res = await fetch(`/api/bd/proposals?id=${deleteProposalTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProposals(prev => prev.filter(p => p._id !== deleteProposalTarget.id));
      showToast("Proposal deleted");
    } catch { showToast("Delete failed", "error"); }
    finally { setIsDeletingProposal(false); setDeleteProposalTarget(null); }
  };

  useEffect(() => { fetchDeals(); fetchLeads(); fetchProposals(); }, []);

  // ── Dashboard Dynamic Filtering & Computed Values ──
  const dateRanges = useMemo(() => [
    "All Time",
    "This Month",
    "Last 30 Days",
    "Last 90 Days",
    "This Year (2026)",
  ], []);

  const isWithinDateRange = useCallback((dateValue?: string | Date) => {
    if (!dateValue || selectedDateRange === "All Time") return true;
    const d = new Date(dateValue).getTime();
    if (isNaN(d)) return true;
    const now = Date.now();
    if (selectedDateRange === "Last 30 Days") return d >= now - 30 * 86400000;
    if (selectedDateRange === "Last 90 Days") return d >= now - 90 * 86400000;
    if (selectedDateRange === "This Month") {
      const cur = new Date();
      const target = new Date(dateValue);
      return target.getMonth() === cur.getMonth() && target.getFullYear() === cur.getFullYear();
    }
    if (selectedDateRange.includes("This Year")) {
      const curYear = new Date().getFullYear();
      return new Date(dateValue).getFullYear() === curYear;
    }
    return true;
  }, [selectedDateRange]);

  const filteredDeals = useMemo(() => {
    return deals.filter(d => isWithinDateRange((d as any).createdAt || d.expectedClose));
  }, [deals, isWithinDateRange]);

  const filteredProposals = useMemo(() => {
    return proposals.filter(p => isWithinDateRange(p.issueDate || (p as any).createdAt));
  }, [proposals, isWithinDateRange]);

  const dashboardFilteredLeads = useMemo(() => {
    return leads.filter(l => isWithinDateRange((l as any).createdAt));
  }, [leads, isWithinDateRange]);

  const wonDeals = useMemo(() => filteredDeals.filter(d => d.stage === "Closed Won"), [filteredDeals]);
  const lostDeals = useMemo(() => filteredDeals.filter(d => d.stage === "Closed Lost"), [filteredDeals]);
  const wonDealsCount = wonDeals.length;
  const lostDealsCount = lostDeals.length;
  const wonDealsVal = useMemo(() => wonDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0), [wonDeals]);
  const lostDealsVal = useMemo(() => lostDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0), [lostDeals]);
  const totalClosed = wonDealsCount + lostDealsCount;

  const conversionRate = useMemo(() => {
    if (totalClosed > 0) return ((wonDealsCount / totalClosed) * 100).toFixed(1);
    if (filteredDeals.length > 0) return ((wonDealsCount / filteredDeals.length) * 100).toFixed(1);
    return "0.0";
  }, [totalClosed, wonDealsCount, filteredDeals.length]);

  const totalPipelineVal = useMemo(() => filteredDeals.reduce((sum, d) => sum + (Number(d.dealValue) || 0), 0), [filteredDeals]);
  const totalClosedWonRevenue = wonDealsVal;

  const pipelineStages = useMemo(() => {
    const probDeals = filteredDeals.filter(d => d.stage === "Prospecting" || d.stage === "Discovery");
    const propDeals = filteredDeals.filter(d => d.stage === "Proposal Sent");
    const oppDeals = filteredDeals.filter(d => d.stage === "Negotiation");
    const totalWonDeals = filteredDeals.filter(d => d.stage === "Closed Won");

    const probSum = probDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
    const propSum = propDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
    const oppSum = oppDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);
    const totalWonSum = totalWonDeals.reduce((s, d) => s + (Number(d.dealValue) || 0), 0);

    const safeTotal = totalPipelineVal > 0 ? totalPipelineVal : 1;
    return {
      prob: { sum: probSum, count: probDeals.length, pct: Math.min(100, Math.max(probSum > 0 ? 5 : 0, Math.round((probSum / safeTotal) * 100))) },
      prop: { sum: propSum, count: propDeals.length, pct: Math.min(100, Math.max(propSum > 0 ? 5 : 0, Math.round((propSum / safeTotal) * 100))) },
      opp:  { sum: oppSum,  count: oppDeals.length,  pct: Math.min(100, Math.max(oppSum  > 0 ? 5 : 0, Math.round((oppSum  / safeTotal) * 100))) },
      totalWon: { sum: totalWonSum, count: totalWonDeals.length, pct: Math.min(100, Math.max(totalWonSum > 0 ? 5 : 0, Math.round((totalWonSum / safeTotal) * 100))) }
    };
  }, [filteredDeals, totalPipelineVal]);

  const revenueMetrics = useMemo(() => {
    const closedRev = totalClosedWonRevenue;
    const pipelineRev = totalPipelineVal;

    // Real dynamic distribution across 5 sparkline buckets
    const now = Date.now();
    const bucketVals = [0, 0, 0, 0, 0];

    if (revenueTimeframe === "weekly") {
      filteredDeals.forEach(d => {
        const val = Number(d.dealValue) || 0;
        const t = new Date((d as any).createdAt || d.expectedClose || now).getTime();
        const diffWeeks = Math.floor((now - t) / (7 * 86400000));
        if (diffWeeks >= 0 && diffWeeks < 5) {
          bucketVals[4 - diffWeeks] += val;
        }
      });
      const maxB = Math.max(...bucketVals, 1);
      const sparkBars = bucketVals.map(v => Math.max(15, Math.round((v / maxB) * 100)));
      return {
        mtdLabel: "Closed Won Revenue",
        mtdVal: `$${formatUSDDec(closedRev)}`,
        mtdChange: `${wonDealsCount} Won`,
        mtdPeriod: `of ${filteredDeals.length} Deals`,
        mtdPositive: wonDealsCount > 0,
        ytdLabel: "Active Pipeline Value",
        ytdVal: `$${formatUSDDec(pipelineRev)}`,
        ytdChange: `${filteredDeals.length} Active`,
        ytdPeriod: "Total Open",
        ytdPositive: true,
        sparkBars,
      };
    } else if (revenueTimeframe === "monthly") {
      filteredDeals.forEach(d => {
        const val = Number(d.dealValue) || 0;
        const dt = new Date((d as any).createdAt || d.expectedClose || now);
        const curM = new Date().getMonth();
        const diffM = (curM - dt.getMonth() + 12) % 12;
        if (diffM < 5) {
          bucketVals[4 - diffM] += val;
        }
      });
      const maxB = Math.max(...bucketVals, 1);
      const sparkBars = bucketVals.map(v => Math.max(15, Math.round((v / maxB) * 100)));
      return {
        mtdLabel: "Closed Won Revenue",
        mtdVal: `$${formatUSDDec(closedRev)}`,
        mtdChange: `${((wonDealsCount / Math.max(1, filteredDeals.length)) * 100).toFixed(0)}%`,
        mtdPeriod: "Win Ratio",
        mtdPositive: wonDealsCount > 0,
        ytdLabel: "Weighted Pipeline (60%)",
        ytdVal: `$${formatUSDDec(pipelineRev * 0.6)}`,
        ytdChange: `${filteredDeals.length}`,
        ytdPeriod: "Opportunities",
        ytdPositive: true,
        sparkBars,
      };
    } else {
      const maxB = Math.max(closedRev, pipelineRev, 1);
      const sparkBars = [25, 45, 60, 80, Math.max(25, Math.round((closedRev / maxB) * 100))];
      return {
        mtdLabel: "Total Won Revenue",
        mtdVal: `$${formatUSDDec(closedRev)}`,
        mtdChange: `$${formatUSDDec(closedRev)}`,
        mtdPeriod: "Confirmed",
        mtdPositive: true,
        ytdLabel: "Total Pipeline Value",
        ytdVal: `$${formatUSDDec(pipelineRev)}`,
        ytdChange: `$${formatUSDDec(pipelineRev)}`,
        ytdPeriod: "Full Value",
        ytdPositive: true,
        sparkBars,
      };
    }
  }, [revenueTimeframe, totalPipelineVal, totalClosedWonRevenue, filteredDeals, wonDealsCount]);

  const uniqueOwners = useMemo(() => Array.from(new Set(filteredDeals.map(d => d.owner).filter(Boolean))), [filteredDeals]);

  const recentDealsList = useMemo(() => {
    const now = Date.now();
    const sorted = [...filteredDeals].sort((a, b) => {
      const tA = new Date((a as any).createdAt || a.expectedClose || 0).getTime();
      const tB = new Date((b as any).createdAt || b.expectedClose || 0).getTime();
      return tB - tA;
    });

    if (dealsTimeframe === "Weekly") {
      const sevenDaysAgo = now - 7 * 86400000;
      const filtered = sorted.filter(d => {
        const t = new Date((d as any).createdAt || d.expectedClose || now).getTime();
        return t >= sevenDaysAgo;
      });
      return filtered.length > 0 ? filtered.slice(0, 8) : sorted.slice(0, 5);
    }
    if (dealsTimeframe === "Monthly") {
      const thirtyDaysAgo = now - 30 * 86400000;
      const filtered = sorted.filter(d => {
        const t = new Date((d as any).createdAt || d.expectedClose || now).getTime();
        return t >= thirtyDaysAgo;
      });
      return filtered.length > 0 ? filtered.slice(0, 8) : sorted.slice(0, 8);
    }
    return sorted.slice(0, 10);
  }, [filteredDeals, dealsTimeframe]);

  const avgDealSizeNumber = useMemo(() => {
    return filteredDeals.length > 0 ? totalPipelineVal / filteredDeals.length : 0;
  }, [filteredDeals.length, totalPipelineVal]);

  const avgDealSizeFormatted = useMemo(() => {
    if (avgDealSizeNumber > 0) {
      return `$${avgDealSizeNumber.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return "$0.00";
  }, [avgDealSizeNumber]);

  const avgDealSparkline = useMemo(() => {
    if (filteredDeals.length === 0) {
      return { path: "M 30 115 L 280 115", labels: ["1", "2", "3", "4", "5", "6", "7"] };
    }
    const sample = filteredDeals.slice(0, 7);
    const maxVal = Math.max(...sample.map(d => Number(d.dealValue) || 0), 1000);
    const step = 250 / Math.max(1, sample.length - 1);
    const pts = sample.map((d, i) => {
      const x = 30 + i * step;
      const norm = (Number(d.dealValue) || 0) / maxVal;
      const y = 115 - norm * 85;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return {
      path: pts.join(" "),
      labels: sample.map((_, i) => `D${i + 1}`)
    };
  }, [filteredDeals]);

  const monthlyGrowthData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const curYear = now.getFullYear();

    const slots: { month: string; year: number; monthIndex: number }[] = [];
    if (growthPeriod === "Last 6 Months") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        slots.push({ month: monthNames[d.getMonth()], year: d.getFullYear(), monthIndex: d.getMonth() });
      }
    } else if (growthPeriod === "Last Year") {
      const prevYear = curYear - 1;
      for (let m = 0; m < 12; m++) {
        slots.push({ month: monthNames[m], year: prevYear, monthIndex: m });
      }
    } else {
      // This Year
      for (let m = 0; m < 12; m++) {
        slots.push({ month: monthNames[m], year: curYear, monthIndex: m });
      }
    }

    const totals = slots.map(slot => {
      const sum = deals.filter(d => {
        const dt = new Date((d as any).createdAt || d.expectedClose || "");
        if (isNaN(dt.getTime())) return false;
        return dt.getFullYear() === slot.year && dt.getMonth() === slot.monthIndex;
      }).reduce((acc, d) => acc + (Number(d.dealValue) || 0), 0);
      return { ...slot, total: sum };
    });

    const maxVal = Math.max(...totals.map(t => t.total), 1000);
    return totals.map((item) => {
      const norm = item.total / maxVal;
      const y = Math.round(195 - norm * 165);
      const label = item.total >= 1000 ? `$${(item.total / 1000).toFixed(1)}k` : `$${item.total}`;
      return {
        month: item.month,
        val: item.total,
        y,
        label,
      };
    });
  }, [growthPeriod, deals]);

  const splinePaths = useMemo(() => {
    if (monthlyGrowthData.length === 0) return { areaPath: "", linePath: "" };
    const n = monthlyGrowthData.length;
    const pts = monthlyGrowthData.map((m, i) => ({
      x: 35 + (i / Math.max(1, n - 1)) * 965,
      y: m.y,
    }));

    let linePath = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const midX = ((p0.x + p1.x) / 2).toFixed(1);
      linePath += ` C ${midX} ${p0.y.toFixed(1)}, ${midX} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }
    const lastPt = pts[pts.length - 1];
    const areaPath = `${linePath} L ${lastPt.x.toFixed(1)} 200 L ${pts[0].x.toFixed(1)} 200 Z`;
    return { areaPath, linePath };
  }, [monthlyGrowthData]);

  // Navigation shortcuts from BD Dashboard into sub-views
  const navigateToDealStage = (stage?: string) => {
    setDealStageNavFilter(stage);
    setActiveTab("leads");
    setLeadsSubTab("deals");
  };

  const navigateToProposals = () => {
    setActiveTab("leads");
    setLeadsSubTab("proposals");
  };

  const navigateToLeads = (statusFilter?: string) => {
    setActiveTab("leads");
    setLeadsSubTab("all");
    if (statusFilter) setLeadStatusFilter(statusFilter);
  };

  // ── Leads Computed ──
  const isDemoMode = leads.length === 0;
  const demoLeads: Lead[] = useMemo(() => [
    { _id: "l1", leadName: "Schumm", companyName: "Summit Peak", phone: "+1 12445-47878", email: "darleeo@example.com", location: "Newyork, United States", value: 350000, currency: "USD", status: "Contacted", stage: "Schedule Service", leadType: "External", owner: "Sara Khan", venture: "Ace Consultancys" },
    { _id: "l2", leadName: "Collins", companyName: "NovaWave LLC", phone: "+1 87545-5453", email: "robertson@example.com", location: "Chicago, United States", value: 210000, currency: "USD", status: "Contacted", stage: "Follow Up", leadType: "Internal", owner: "Ahmed Raza", venture: "Ace Consultancys" },
    { _id: "l3", leadName: "Adams", companyName: "Silver Hawk", phone: "+1 17392-27846", email: "vaughan12@example.com", location: "London, United Kingdom", value: 245000, currency: "GBP", status: "New", stage: "Inpipeline", leadType: "External", owner: "Bilal Hassan", venture: "Ace Consultancys" },
    { _id: "l4", leadName: "Wizosk", companyName: "RiverStone Ltd", phone: "+1 12454-27875", email: "caroltho3@example.com", location: "Toronto, Canada", value: 117000, currency: "CAD", status: "New", stage: "Inpipeline", leadType: "Internal", owner: "Fatima Noor", venture: "Ace Consultancys" },
    { _id: "l5", leadName: "Gutkowsi", companyName: "BlueSky Industries", phone: "+1 17839-93617", email: "rachel@example.com", location: "Dallas, United States", value: 184043, currency: "USD", status: "Closed", stage: "Conversation", leadType: "External", owner: "Omar Malik", venture: "Ace Consultancys" },
    { _id: "l6", leadName: "Walter", companyName: "Apex Labs", phone: "+1 18392-84729", email: "jonelle@example.com", location: "Berlin, Germany", value: 935189, currency: "EUR", status: "Closed", stage: "Conversation", leadType: "External", owner: "Sara Khan", venture: "Ace Consultancys" },
    { _id: "l7", leadName: "Steve", companyName: "AlphaStream", phone: "+1 11739-38135", email: "sidney@example.com", location: "Manchester, United Kingdom", value: 417593, currency: "GBP", status: "Lost", stage: "Inpipeline", leadType: "Internal", owner: "Bilal Hassan", venture: "Ace Consultancys" },
    { _id: "l8", leadName: "Leuschke", companyName: "Global Tech", phone: "+1 19382-74829", email: "brook@example.com", location: "Paris, France", value: 881389, currency: "EUR", status: "Lost", stage: "Conversation", leadType: "External", owner: "Ahmed Raza", venture: "Ace Consultancys" },
  ], []);
  const activeLeads = leads.length > 0 ? leads : demoLeads;

  const filteredLeads = useMemo(() => {
    let result = activeLeads.filter(l => {
      const q = leadSearch.toLowerCase();
      const matchSearch = !q || l.leadName.toLowerCase().includes(q) || l.companyName.toLowerCase().includes(q) || l.phone?.includes(q) || l.email?.toLowerCase().includes(q) || l.leadType?.toLowerCase().includes(q) || l.currency?.toLowerCase().includes(q) || l.location?.toLowerCase().includes(q);
      const matchStatus = leadStatusFilter === "All" || l.status === leadStatusFilter;
      const matchStage = leadStageFilter === "All" || l.stage === leadStageFilter;
      const matchType = leadTypeFilter === "All" || (l.leadType || "External") === leadTypeFilter;
      return matchSearch && matchStatus && matchStage && matchType;
    });

    if (leadSortBy === "value_desc") {
      result = [...result].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
    } else if (leadSortBy === "value_asc") {
      result = [...result].sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0));
    } else if (leadSortBy === "name") {
      result = [...result].sort((a, b) => a.leadName.localeCompare(b.leadName));
    }

    return result;
  }, [activeLeads, leadSearch, leadStatusFilter, leadStageFilter, leadTypeFilter, leadSortBy]);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { "Inpipeline": 0, "Follow Up": 0, "Schedule Service": 0, "Conversation": 0 };
    activeLeads.forEach(l => { if (counts[l.stage] !== undefined) counts[l.stage]++; });
    return counts;
  }, [activeLeads]);

  const totalLeads = activeLeads.length || 1;

  // Spline area for leads growth chart
  const leadsGrowthPath = useMemo(() => {
    const points = [
      { x: 50, y: 160 }, { x: 150, y: 130 }, { x: 250, y: 150 }, { x: 350, y: 90 },
      { x: 450, y: 110 }, { x: 550, y: 60 }, { x: 650, y: 80 }, { x: 750, y: 40 },
      { x: 850, y: 70 }, { x: 950, y: 50 },
    ];
    const area = `M 50 160 C 100 130, 200 150, 250 150 C 300 150, 320 90, 350 90 C 380 90, 420 110, 450 110 C 480 110, 520 60, 550 60 C 580 60, 620 80, 650 80 C 680 80, 720 40, 750 40 C 780 40, 820 70, 850 70 C 880 70, 920 50, 950 50 L 950 200 L 50 200 Z`;
    const line = `M 50 160 C 100 130, 200 150, 250 150 C 300 150, 320 90, 350 90 C 380 90, 420 110, 450 110 C 480 110, 520 60, 550 60 C 580 60, 620 80, 650 80 C 680 80, 720 40, 750 40 C 780 40, 820 70, 850 70 C 880 70, 920 50, 950 50`;
    return { area, line };
  }, []);

  // ── Deal Handlers ──
  const handleNewDeal = (prefill?: Partial<typeof dealFormData> | React.MouseEvent) => {
    const validPrefill = (prefill && !("nativeEvent" in prefill) && !("preventDefault" in prefill))
      ? (prefill as Partial<typeof dealFormData>)
      : undefined;
    setEditingDeal(null);
    setDealFormData({
      clientAccount: validPrefill?.clientAccount || "",
      dealName: validPrefill?.dealName || "",
      dealValue: validPrefill?.dealValue !== undefined ? String(validPrefill.dealValue) : "",
      stage: (validPrefill?.stage as SalesDeal["stage"]) || "Prospecting",
      probability: validPrefill?.probability ?? 50,
      owner: validPrefill?.owner || currentUser?.name || "",
      expectedClose: validPrefill?.expectedClose || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      venture: validPrefill?.venture || "Ace Consultancys",
      notes: validPrefill?.notes || "",
    });
    setShowDealModal(true);
  };
  const handleEditDeal = (deal: SalesDeal) => { setEditingDeal(deal); setDealFormData({ clientAccount: deal.clientAccount, dealName: deal.dealName, dealValue: String(deal.dealValue), stage: deal.stage, probability: deal.probability, owner: deal.owner || "", expectedClose: deal.expectedClose?.split("T")[0] || "", venture: deal.venture || "Ace Consultancys", notes: deal.notes || "" }); setShowDealModal(true); };
  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault(); if (!dealFormData.clientAccount || !dealFormData.dealName) return;
    setDealSubmitting(true);
    try {
      const url = editingDeal ? `/api/operations/sales-deals/${editingDeal._id}` : "/api/operations/sales-deals";
      const res = await fetch(url, {
        method: editingDeal ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dealFormData, dealValue: Number(dealFormData.dealValue) || 0 })
      });
      if (res.ok) {
        await fetchDeals();
        setShowDealModal(false);

        // If this deal was converted from a lead, advance the lead's status and stage in DB
        if (convertingLeadId) {
          const targetStatus: Lead["status"] = dealFormData.stage === "Closed Won" ? "Closed" : dealFormData.stage === "Negotiation" ? "Negotiation" : "Proposal";
          await fetch(`/api/bd/leads/${convertingLeadId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetStatus, stage: "Inpipeline" }),
          });
          await fetchLeads();
          setConvertingLeadId(null);
        }

        // Seamlessly route the user into the Deals pipeline view
        setLeadsSubTab("deals");
        showToast(editingDeal ? "Deal updated." : "Deal created! Transferred to Deals pipeline.");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save.", "error");
      }
    } catch {
      showToast("Failed to save deal.", "error");
    } finally {
      setDealSubmitting(false);
    }
  };

  const handleDealStageChange = async (dealId: string, newStage: SalesDeal["stage"], notes?: string) => {
    // Optimistically update local deals state
    setDeals(prev => prev.map(d => d._id === dealId ? { ...d, stage: newStage, ...(notes ? { notes } : {}) } : d));
    try {
      const res = await fetch(`/api/operations/sales-deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, ...(notes ? { notes } : {}) }),
      });
      if (res.ok) {
        showToast(`Deal moved to ${newStage}`);
        await fetchDeals();

        // If moved to Closed Won, check if there is an associated lead to advance to Closed
        if (newStage === "Closed Won") {
          const deal = deals.find(d => d._id === dealId);
          if (deal) {
            const matchedLead = leads.find(l => 
              (l.companyName && deal.clientAccount && l.companyName.toLowerCase() === deal.clientAccount.toLowerCase()) ||
              (l.leadName && deal.dealName && deal.dealName.toLowerCase().includes(l.leadName.toLowerCase()))
            );
            if (matchedLead && matchedLead.status !== "Closed") {
              await fetch(`/api/bd/leads/${matchedLead._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "Closed", stage: "Closed" }),
              });
              await fetchLeads();
            }
          }
        }
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to update deal stage", "error");
        await fetchDeals();
      }
    } catch {
      showToast("Network error updating deal stage", "error");
      await fetchDeals();
    }
  };


  // ── Lead Handlers ──
  const handleNewLead = (preselectedStatus?: Lead["status"]) => {
    setEditingLead(null);
    setLeadFormData({
      leadName: "", companyName: "", phone: "", email: "",
      status: preselectedStatus || "New", stage: "Inpipeline",
      leadType: "External",
      value: "", currency: "USD", location: "",
      source: "", owner: currentUser?.name || "", venture: "Ace Consultancys", notes: "",
    });
    setShowLeadModal(true);
  };
  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setLeadFormData({
      leadName: lead.leadName, companyName: lead.companyName,
      phone: lead.phone || "", email: lead.email || "",
      status: lead.status, stage: lead.stage,
      leadType: lead.leadType || "External",
      value: lead.value ? String(lead.value) : "",
      currency: lead.currency || "USD",
      location: lead.location || "",
      source: lead.source || "", owner: lead.owner || "",
      venture: lead.venture || "Ace Consultancys", notes: lead.notes || "",
    });
    setShowLeadModal(true);
    setSelectedLead(null);
  };
  const handleOpenLead = (lead: Lead) => { setSelectedLead(lead); };
  const handleStatusChange = async (lead: Lead, status: Lead["status"]) => {
    try {
      const res = await fetch(`/api/bd/leads/${lead._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (res.ok) { await fetchLeads(); setSelectedLead(prev => prev ? { ...prev, status } : prev); showToast("Status updated."); }
    } catch { showToast("Failed to update status.", "error"); }
  };
  const handleStageChange = async (lead: Lead, stage: Lead["stage"]) => {
    try {
      const res = await fetch(`/api/bd/leads/${lead._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
      if (res.ok) { await fetchLeads(); setSelectedLead(prev => prev ? { ...prev, stage } : prev); showToast("Stage updated."); }
    } catch { showToast("Failed to update stage.", "error"); }
  };
  const handleDragDropStatus = async (leadId: string, targetStatus: Lead["status"]) => {
    const draggedLead = activeLeads.find(l => l._id === leadId);
    if (!draggedLead) return;
    if (draggedLead.status === targetStatus) return;

    // Optimistic UI update — only mutate real leads state (not demo)
    if (!isDemoMode) {
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: targetStatus } : l));
    }
    if (selectedLead?._id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: targetStatus } : prev);
    }

    // Skip API call when in demo mode (IDs are fake)
    if (!isDemoMode) {
      try {
        const res = await fetch(`/api/bd/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus }),
        });
        if (res.ok) {
          showToast(`Lead moved to ${targetStatus}`);
        } else {
          await fetchLeads();
          showToast("Failed to update status on server.", "error");
        }
      } catch {
        await fetchLeads();
        showToast("Failed to update status.", "error");
      }
    } else {
      showToast(`Lead moved to ${targetStatus} (demo mode)`);
    }
  };
  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault(); if (!leadFormData.leadName || !leadFormData.companyName) return;
    setLeadSubmitting(true);
    try {
      const url = editingLead ? `/api/bd/leads/${editingLead._id}` : "/api/bd/leads";
      const payload = {
        ...leadFormData,
        owner: leadFormData.owner || currentUser?.name || "Unassigned",
        value: Number(leadFormData.value) || 0,
      };
      const res = await fetch(url, {
        method: editingLead ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchLeads();
        setShowLeadModal(false);
        showToast(editingLead ? "Lead updated." : "Lead created.");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save.", "error");
      }
    } catch {
      showToast("Failed to save lead.", "error");
    } finally {
      setLeadSubmitting(false);
    }
  };

  const handleConvertToDeal = (lead: Lead) => {
    setSelectedLead(null);
    setEditingDeal(null);
    setConvertingLeadId(lead._id);
    setDealFormData({
      clientAccount: lead.companyName,
      dealName: `${lead.leadName} - Solution`,
      dealValue: lead.value ? String(lead.value) : "",
      stage: lead.status === "Proposal"
        ? "Proposal Sent"
        : lead.status === "Negotiation"
          ? "Negotiation"
          : lead.status === "Closed"
            ? "Closed Won"
            : "Prospecting",
      probability: lead.status === "Closed" ? 100 : lead.status === "Negotiation" ? 75 : lead.status === "Proposal" ? 60 : 50,
      owner: lead.owner || currentUser?.name || "",
      expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      venture: lead.venture || "Ace Consultancys",
      notes: `Converted from BD Lead: ${lead.leadName} (${lead.phone || lead.email || "No direct contact"}).\n${lead.notes || ""}`,
    });
    setShowDealModal(true);
    showToast(`Converting ${lead.leadName} into Sales Deal...`);
  };

  const handleConvertToProposalFromLead = (lead: Lead) => {
    setSelectedLead(null);
    setConvertingLeadId(lead._id);
    setEditingProposal({
      _id: "",
      proposalCode: "",
      subject: `${lead.companyName} - Solution & Services Proposal`,
      projectName: `${lead.companyName} Project`,
      clientName: lead.leadName,
      clientCompany: lead.companyName,
      clientEmail: lead.email || "",
      clientAvatarColor: "bg-primary",
      subtotal: Number(lead.value) || 0,
      taxRate: 0,
      taxAmount: 0,
      totalValue: Number(lead.value) || 0,
      currency: lead.currency || "USD",
      issueDate: new Date().toISOString(),
      openTill: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: "Draft",
      items: [
        {
          description: `Professional Services & Deliverables for ${lead.companyName}`,
          quantity: 1,
          unitPrice: Number(lead.value) || 0,
          amount: Number(lead.value) || 0,
        },
      ],
      description: lead.notes || `Engagement proposal tailored for ${lead.companyName}.`,
      terms: "Standard professional services agreement. Pricing valid for 30 days.",
    });
    setShowProposalModal(true);
    showToast(`Creating Proposal for ${lead.leadName} (${lead.companyName})...`);
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map(l => l._id)));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatusChange = async (newStatus: Lead["status"]) => {
    if (selectedLeadIds.size === 0) return;
    if (isDemoMode) { showToast("Cannot bulk-update demo leads.", "error"); return; }
    const targetIds = Array.from(selectedLeadIds);
    // Optimistic update on real DB leads state only
    setLeads(prev => prev.map(l => targetIds.includes(l._id) ? { ...l, status: newStatus } : l));
    showToast(`Updated ${targetIds.length} leads to ${newStatus}`);
    setSelectedLeadIds(new Set());
    await Promise.all(
      targetIds.map(id =>
        fetch(`/api/bd/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })
      )
    );
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.size === 0) return;
    if (isDemoMode) { showToast("Cannot delete demo leads.", "error"); return; }
    const targetIds = Array.from(selectedLeadIds);
    setLeads(prev => prev.filter(l => !targetIds.includes(l._id)));
    showToast(`Deleted ${targetIds.length} leads.`);
    setSelectedLeadIds(new Set());
    await Promise.all(
      targetIds.map(id => fetch(`/api/bd/leads/${id}`, { method: "DELETE" }))
    );
  };

  const handleExportScope = (scope: "filtered" | "all" | "selected") => {
    let dataset = filteredLeads;
    if (scope === "all") dataset = activeLeads;
    else if (scope === "selected") dataset = activeLeads.filter(l => selectedLeadIds.has(l._id));

    if (dataset.length === 0) {
      showToast("No leads to export in this selection.", "error");
      return;
    }
    const headers = ["Lead Name", "Company", "Deal Value", "Currency", "Status", "Stage", "Lead Type", "Phone", "Email", "Location", "Owner"];
    const rows = dataset.map(l => [
      `"${(l.leadName || "").replace(/"/g, '""')}"`,
      `"${(l.companyName || "").replace(/"/g, '""')}"`,
      l.value || 0,
      l.currency || "USD",
      `"${l.status}"`,
      `"${l.stage}"`,
      `"${l.leadType || "External"}"`,
      `"${l.phone || ""}"`,
      `"${l.email || ""}"`,
      `"${(l.location || "").replace(/"/g, '""')}"`,
      `"${(l.owner || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nexace-bd-leads-${scope}-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
    showToast(`Exported ${dataset.length} leads to CSV.`);
  };

  const handleExportCSV = () => handleExportScope("filtered");

  // ── Delete ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return; setIsDeleting(true);
    try {
      const url = deleteTarget.type === "deal" ? `/api/operations/sales-deals/${deleteTarget.id}` : `/api/bd/leads/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) { if (deleteTarget.type === "deal") await fetchDeals(); else await fetchLeads(); showToast(`${deleteTarget.type === "deal" ? "Deal" : "Lead"} deleted.`); setDeleteTarget(null); }
      else showToast("Failed to delete.", "error");
    } catch { showToast("Failed to delete.", "error"); } finally { setIsDeleting(false); }
  };

  const inputCls = "h-9 text-sm bg-background border-input focus:ring-1 focus:ring-primary";
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

  const hasAccess = isAdmin || isOPS || canAccessModule("bd") || canAccessModule("finance") || can("viewFinancePortal");
  if (!permLoading && !hasAccess) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 text-2xl"><i className="fa-solid fa-shield-halved" /></div>
      <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
      <p className="text-sm text-muted-foreground max-w-md">You do not have permission to view the BD Portal.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Toast */}
      {toast && (
        <div className={cn("fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold max-w-sm animate-in slide-in-from-right-5", toast.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400")}>
          <i className={cn("fa-solid text-base", toast.type === "success" ? "fa-circle-check" : "fa-circle-xmark")} />{toast.message}
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <i className="fa-solid fa-handshake text-primary" /> BD Portal
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Business Development • Pipeline, deals &amp; leads management</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => { fetchDeals(); fetchLeads(); fetchProposals(); }} className="h-9 w-9 cursor-pointer shadow-2xs" title="Refresh">
            <i className={cn("fa-solid fa-arrows-rotate text-xs", (loadingDeals || loadingLeads || loadingProposals) && "fa-spin")} />
          </Button>
          {/* Show contextual CTA based on current sub-tab */}
          {(can("manageDeals") || isAdmin || isOPS) && (
            <>
              {(activeTab === "leads" && (leadsSubTab === "all" || leadsSubTab === "overview")) && (
                <Button onClick={() => handleNewLead()} size="sm" className="gap-2 font-bold cursor-pointer h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                  <i className="fa-solid fa-user-plus text-xs" /> New Lead
                </Button>
              )}
              {(activeTab === "dashboard" || (activeTab === "leads" && (leadsSubTab === "deals" || leadsSubTab === "sales" || leadsSubTab === "overview"))) && (
                <Button onClick={() => handleNewDeal()} size="sm" className="gap-2 font-bold cursor-pointer h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                  <i className="fa-solid fa-plus text-xs" /> New Deal
                </Button>
              )}
              {activeTab === "leads" && leadsSubTab === "proposals" && (
                <Button onClick={() => { setEditingProposal(null); setShowProposalModal(true); }} size="sm" className="gap-2 font-bold cursor-pointer h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                  <i className="fa-solid fa-file-plus text-xs" /> New Proposal
                </Button>
              )}

            </>
          )}
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60 w-fit">
        {([
          { key: "dashboard", label: "Dashboard", icon: "fa-chart-pie" },
          { key: "leads", label: "Leads", icon: "fa-user-tag" },
        ] as const).map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}>
            <i className={`fa-solid ${tab.icon} text-[11px]`} />{tab.label}
            {tab.key === "leads" && <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded-full", activeTab === "leads" ? "bg-white/20" : "bg-muted")}>{activeLeads.length}</span>}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DASHBOARD TAB                                              */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Top Filter & Quick Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <i className="fa-solid fa-chart-line text-base" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">BD Analytics &amp; Performance</h2>
                <p className="text-xs text-muted-foreground">
                  Active window: <span className="font-semibold text-foreground">{selectedDateRange}</span> · {filteredDeals.length} Deals · {filteredProposals.length} Proposals · {dashboardFilteredLeads.length} Leads
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { fetchDeals(); fetchLeads(); fetchProposals(); showToast("Refreshed BD metrics!"); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all cursor-pointer shadow-2xs"
                title="Refresh All BD Data"
              >
                <i className={cn("fa-solid fa-arrows-rotate text-[11px]", (loadingDeals || loadingLeads || loadingProposals) && "fa-spin text-primary")} />
                <span>Sync Data</span>
              </button>

              {/* Dynamic Date Range Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="flex items-center gap-2 bg-background hover:bg-muted/60 border border-border px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground shadow-2xs transition-colors cursor-pointer"
                >
                  <i className="fa-solid fa-calendar text-primary text-xs" />
                  <span>{selectedDateRange}</span>
                  <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground ml-1" />
                </button>
                {showDateDropdown && (
                  <div className="absolute right-0 mt-1 w-56 bg-card border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95">
                    {dateRanges.map(range => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => { setSelectedDateRange(range); setShowDateDropdown(false); }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                          selectedDateRange === range ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground"
                        )}
                      >
                        <span>{range}</span>
                        {selectedDateRange === range && <i className="fa-solid fa-check text-primary text-xs" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <button
                type="button"
                onClick={() => handleNewDeal()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
              >
                <i className="fa-solid fa-plus text-[10px]" />
                <span>New Deal</span>
              </button>
              <button
                type="button"
                onClick={() => { setEditingProposal(null); setShowProposalModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-2xs"
              >
                <i className="fa-solid fa-file-invoice text-[10px]" />
                <span>New Proposal</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar across Business Development */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Deals Tile */}
            <div
              onClick={() => navigateToDealStage()}
              className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Deals in Pipeline</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-handshake" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground tracking-tight">${formatUSDDec(totalPipelineVal)}</span>
                <span className="text-xs font-semibold text-muted-foreground">({filteredDeals.length} deals)</span>
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Won: <strong className="text-emerald-600 dark:text-emerald-400">{wonDealsCount}</strong> · Lost: <strong className="text-rose-500">{lostDealsCount}</strong></span>
                <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform">View Deals &rarr;</span>
              </div>
            </div>

            {/* Proposals Tile */}
            <div
              onClick={navigateToProposals}
              className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Proposals Pipeline</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-file-contract" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground tracking-tight">
                  ${formatUSD(filteredProposals.reduce((s, p) => s + (Number(p.totalValue) || 0), 0))}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">({filteredProposals.length} total)</span>
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Accepted: <strong className="text-emerald-600 dark:text-emerald-400">{filteredProposals.filter(p => p.status === "Accepted").length}</strong></span>
                <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform">View Proposals &rarr;</span>
              </div>
            </div>

            {/* Active Leads Tile */}
            <div
              onClick={() => navigateToLeads()}
              className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Leads in Pipeline</span>
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs group-hover:scale-110 transition-transform">
                  <i className="fa-solid fa-user-tag" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground tracking-tight">{dashboardFilteredLeads.length}</span>
                <span className="text-xs font-semibold text-muted-foreground">active leads</span>
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>New: <strong className="text-blue-500">{dashboardFilteredLeads.filter(l => l.status === "New").length}</strong> · Contacted: <strong className="text-foreground">{dashboardFilteredLeads.filter(l => l.status === "Contacted").length}</strong></span>
                <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform">View Leads &rarr;</span>
              </div>
            </div>

            {/* Deal Conversion Rate Tile */}
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Conversion Rate</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
                  <i className="fa-solid fa-bullseye" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground tracking-tight">{conversionRate}%</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Win Rate</span>
              </div>
              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Avg Deal: <strong className="text-foreground">{avgDealSizeFormatted}</strong></span>
                <span className="font-semibold text-muted-foreground">{totalClosed} closed</span>
              </div>
            </div>
          </div>

          {/* ROW 1: Revenue + Conversion Rate Gauge */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-foreground tracking-tight">Total Revenue Performance</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedDateRange}</p>
                </div>
                <div className="flex items-center gap-4">
                  {uniqueOwners.length > 0 && (
                    <div className="flex items-center -space-x-2">
                      {uniqueOwners.slice(0, 4).map((n, i) => {
                        const colors = ["bg-indigo-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500"];
                        const init = n.split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase();
                        return (
                          <div key={i} title={n} className={cn("w-7 h-7 rounded-full text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-card", colors[i % 4])}>
                            {init}
                          </div>
                        );
                      })}
                      {uniqueOwners.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-card">
                          +{uniqueOwners.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60">
                    {(["weekly", "monthly", "yearly"] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRevenueTimeframe(t)}
                        className={cn("px-3 py-1 text-xs font-bold capitalize transition-all rounded-md cursor-pointer", revenueTimeframe === t ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                {/* Won Revenue */}
                <div className="relative flex items-stretch bg-slate-50/80 dark:bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm transition-all">
                  <div className="relative w-14 bg-[#e09d1d] text-white flex items-center justify-center font-black text-xs tracking-wider shrink-0">
                    <span className="[writing-mode:vertical-lr] rotate-180">WON</span>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[8px] border-l-[#e09d1d] translate-x-full" />
                  </div>
                  <div className="p-4 flex-1 flex items-center justify-between pl-5">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{revenueMetrics.mtdLabel}</p>
                      <h3 className="text-xl font-extrabold text-foreground tracking-tight">{revenueMetrics.mtdVal}</h3>
                      <div className="pt-1">
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full", revenueMetrics.mtdPositive ? "text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40" : "text-[#dc3545] bg-[#ffebeb] dark:bg-rose-950/40")}>
                          {revenueMetrics.mtdChange} <span className="font-normal text-muted-foreground">{revenueMetrics.mtdPeriod}</span>
                        </span>
                      </div>
                    </div>
                    {/* Dynamic sparkline bars from real revenue distribution */}
                    <div className="flex items-end gap-1.5 h-12 shrink-0 pl-2">
                      {revenueMetrics.sparkBars.map((barHeight, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${barHeight}%` }}
                          className="w-2 bg-amber-500/80 rounded-xs transition-all hover:opacity-80"
                          title={`Bucket ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pipeline Value */}
                <div className="relative flex items-stretch bg-slate-50/80 dark:bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xs hover:shadow-sm transition-all">
                  <div className="relative w-14 bg-primary text-primary-foreground flex items-center justify-center font-black text-xs tracking-wider shrink-0">
                    <span className="[writing-mode:vertical-lr] rotate-180">PIPELINE</span>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[8px] border-l-primary translate-x-full" />
                  </div>
                  <div className="p-4 flex-1 flex items-center justify-between pl-5">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{revenueMetrics.ytdLabel}</p>
                      <h3 className="text-xl font-extrabold text-foreground tracking-tight">{revenueMetrics.ytdVal}</h3>
                      <div className="pt-1">
                        <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full", revenueMetrics.ytdPositive ? "text-[#28c76f] bg-[#e1f3e9] dark:bg-emerald-950/40" : "text-[#dc3545] bg-[#ffebeb] dark:bg-rose-950/40")}>
                          {revenueMetrics.ytdChange} <span className="font-normal text-muted-foreground">{revenueMetrics.ytdPeriod}</span>
                        </span>
                      </div>
                    </div>
                    {/* Dynamic sparkline bars */}
                    <div className="flex items-end gap-1.5 h-12 shrink-0 pl-2">
                      {revenueMetrics.sparkBars.map((barHeight, idx) => (
                        <div
                          key={idx}
                          style={{ height: `${Math.min(100, barHeight + 10)}%` }}
                          className="w-2 bg-primary/80 rounded-xs transition-all hover:opacity-80"
                          title={`Pipeline Bucket ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Gauge */}
            <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Conversion Win Rate</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{filteredDeals.length} total deals evaluated</p>
              </div>

              <div className="relative flex flex-col items-center justify-center my-2">
                {filteredDeals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                    <i className="fa-solid fa-gauge text-4xl text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground font-semibold">No deals in selected window</p>
                    <p className="text-[11px] text-muted-foreground/70">Create a deal or select &quot;All Time&quot;.</p>
                  </div>
                ) : (
                  <>
                    <svg viewBox="0 0 300 165" className="w-full max-w-[280px] overflow-visible">
                      {Array.from({ length: 28 }).map((_, i) => {
                        const a = Math.PI - (i / 27) * Math.PI, rI = 78, rO = 106, cx = 150, cy = 140;
                        const x1 = +(cx + rI * Math.cos(a)).toFixed(2);
                        const y1 = +(cy - rI * Math.sin(a)).toFixed(2);
                        const x2 = +(cx + rO * Math.cos(a)).toFixed(2);
                        const y2 = +(cy - rO * Math.sin(a)).toFixed(2);
                        const act = i / 27 <= parseFloat(conversionRate) / 100;
                        return (
                          <line
                            key={i}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={act ? "hsl(var(--primary))" : "#eceff1"}
                            strokeWidth="7.5"
                            strokeLinecap="round"
                            className={!act ? "dark:stroke-slate-800" : ""}
                          />
                        );
                      })}
                      {[{ label: "0", x: 86, y: 142 }, { label: "20", x: 104, y: 106 }, { label: "40", x: 130, y: 78 }, { label: "60", x: 170, y: 78 }, { label: "80", x: 196, y: 106 }, { label: "100", x: 214, y: 142 }].map((t, i) => (
                        <text key={i} x={t.x} y={t.y} textAnchor="middle" className="text-[11px] font-bold fill-slate-600 dark:fill-slate-400 select-none">
                          {t.label}
                        </text>
                      ))}
                      {(() => {
                        const r = Math.min(100, Math.max(0, parseFloat(conversionRate)));
                        const a = Math.PI - (r / 100) * Math.PI;
                        const cx = 150, cy = 140;
                        const nx = +(cx + 76 * Math.cos(a)).toFixed(2);
                        const ny = +(cy - 76 * Math.sin(a)).toFixed(2);
                        return (
                          <g>
                            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#374151" strokeWidth="2.5" strokeLinecap="round" className="dark:stroke-slate-200" />
                            <circle cx={cx} cy={cy} r="5" fill="#374151" className="dark:fill-slate-200" />
                            <circle cx={cx} cy={cy} r="2" fill="#fff" className="dark:fill-slate-900" />
                          </g>
                        );
                      })()}
                    </svg>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-2xl font-extrabold text-foreground">{conversionRate}%</span>
                      <span className="text-xs font-semibold text-muted-foreground">Closed Win Ratio</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ROW 2: Deals Won/Lost + Interactive Pipeline */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-foreground tracking-tight">Deals Won Vs Lost</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Click any card to inspect corresponding deals</p>
                </div>
                <button
                  type="button"
                  onClick={() => { fetchDeals(); showToast("Deals updated"); }}
                  className="w-8 h-8 rounded-lg border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer shadow-2xs"
                >
                  <i className={cn("fa-solid fa-arrows-rotate text-xs", loadingDeals && "fa-spin")} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Won Deals Card */}
                <div
                  onClick={() => navigateToDealStage("Closed Won")}
                  className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-2xs hover:border-emerald-500/40 hover:bg-emerald-500/10 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-circle-check text-emerald-600 dark:text-emerald-400 text-lg" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Deals Won</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-2xl font-extrabold text-foreground">{wonDealsCount}</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                          ${formatUSD(wonDealsVal)} total
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>View Won Deals</span>
                    <i className="fa-solid fa-chevron-right text-[10px]" />
                  </div>
                </div>

                {/* Lost Deals Card */}
                <div
                  onClick={() => navigateToDealStage("Closed Lost")}
                  className="flex items-center justify-between p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 shadow-2xs hover:border-rose-500/40 hover:bg-rose-500/10 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
                      <i className="fa-solid fa-circle-xmark text-rose-500 text-lg" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Deals Lost</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-2xl font-extrabold text-foreground">{lostDealsCount}</span>
                        <span className="text-xs font-bold text-rose-500 bg-rose-500/15 px-2 py-0.5 rounded-full">
                          ${formatUSD(lostDealsVal)} lost
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-rose-500 group-hover:translate-x-1 transition-transform">
                    <span>View Lost Deals</span>
                    <i className="fa-solid fa-chevron-right text-[10px]" />
                  </div>
                </div>
              </div>
            </div>

            {/* BD Pipeline Breakdown */}
            <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">BD Pipeline Breakdown</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-extrabold text-foreground">${formatUSDDec(totalPipelineVal)}</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {filteredDeals.length} active
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-3">
                {/* Stage 1: Prospecting */}
                <div
                  onClick={() => navigateToDealStage("Prospecting")}
                  className="relative p-3 rounded-xl bg-purple-500/10 dark:bg-purple-950/30 overflow-hidden border border-purple-200/50 dark:border-purple-900/40 hover:border-purple-500/50 cursor-pointer transition-all group"
                  title="Click to view Prospecting deals"
                >
                  <div className="absolute inset-y-0 left-0 bg-purple-500/20 dark:bg-purple-900/50 rounded-xl transition-all duration-500" style={{ width: `${pipelineStages.prob.pct}%` }} />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Discovery &amp; Prospecting</span>
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">${formatUSD(pipelineStages.prob.sum)}</span>
                  </div>
                </div>

                {/* Stage 2: Proposal Sent */}
                <div
                  onClick={() => navigateToDealStage("Proposal Sent")}
                  className="relative p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 overflow-hidden border border-emerald-200/50 dark:border-emerald-900/40 hover:border-emerald-500/50 cursor-pointer transition-all group"
                  title="Click to view Proposal Sent deals"
                >
                  <div className="absolute inset-y-0 left-0 bg-emerald-500/20 dark:bg-emerald-900/50 rounded-xl transition-all duration-500" style={{ width: `${pipelineStages.prop.pct}%` }} />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Proposal Sent</span>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">${formatUSD(pipelineStages.prop.sum)}</span>
                  </div>
                </div>

                {/* Stage 3: Negotiation */}
                <div
                  onClick={() => navigateToDealStage("Negotiation")}
                  className="relative p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 overflow-hidden border border-amber-200/50 dark:border-amber-900/40 hover:border-amber-500/50 cursor-pointer transition-all group"
                  title="Click to view Negotiation deals"
                >
                  <div className="absolute inset-y-0 left-0 bg-amber-500/20 dark:bg-amber-900/50 rounded-xl transition-all duration-500" style={{ width: `${pipelineStages.opp.pct}%` }} />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Negotiation / Review</span>
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">${formatUSD(pipelineStages.opp.sum)}</span>
                  </div>
                </div>

                {/* Stage 4: Closed Won */}
                <div
                  onClick={() => navigateToDealStage("Closed Won")}
                  className="relative p-3 rounded-xl bg-blue-500/10 dark:bg-blue-950/30 overflow-hidden border border-blue-200/50 dark:border-blue-900/40 hover:border-blue-500/50 cursor-pointer transition-all group"
                  title="Click to view Closed Won deals"
                >
                  <div className="absolute inset-y-0 left-0 bg-blue-500/20 dark:bg-blue-900/50 rounded-xl transition-all duration-500" style={{ width: `${pipelineStages.totalWon.pct}%` }} />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Closed Won Revenue</span>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">${formatUSD(pipelineStages.totalWon.sum)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 3: Recent Deals + Avg Deal Size */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-foreground tracking-tight">Active Deals</h2>
                  <span className="text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                    {recentDealsList.length} shown
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDealsDropdown(!showDealsDropdown)}
                      className="flex items-center gap-1 bg-muted/40 hover:bg-muted/70 px-2.5 py-1 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                    >
                      <span>{dealsTimeframe}</span>
                      <i className="fa-solid fa-chevron-down text-[10px] ml-1 text-muted-foreground" />
                    </button>
                    {showDealsDropdown && (
                      <div className="absolute right-0 mt-1 w-32 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                        {(["Weekly", "Monthly", "All"] as const).map(tf => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => { setDealsTimeframe(tf); setShowDealsDropdown(false); }}
                            className={cn("w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer", dealsTimeframe === tf ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground")}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateToDealStage()}
                    className="text-xs font-bold text-primary hover:underline px-1.5"
                  >
                    View All &rarr;
                  </button>
                </div>
              </div>

              {recentDealsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-semibold">
                        <th className="py-2.5 px-3">Deal &amp; Client</th>
                        <th className="py-2.5 px-3">Owner</th>
                        <th className="py-2.5 px-3">Value</th>
                        <th className="py-2.5 px-3 text-right">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {recentDealsList.map((d, idx) => {
                        const isWon = d.stage === "Closed Won";
                        const isLost = d.stage === "Closed Lost";
                        return (
                          <tr
                            key={d._id || idx}
                            onClick={() => handleEditDeal(d)}
                            className="hover:bg-muted/40 transition-colors cursor-pointer group"
                            title="Click to edit deal"
                          >
                            <td className="py-3 px-3">
                              <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">{d.dealName}</p>
                              <p className="text-xs text-muted-foreground">{d.clientAccount}</p>
                            </td>
                            <td className="py-3 px-3 text-muted-foreground font-medium">
                              {d.owner || "Unassigned"}
                            </td>
                            <td className="py-3 px-3 font-extrabold font-mono text-foreground text-sm">
                              ${formatUSD(d.dealValue)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className={cn(
                                "inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold",
                                isWon ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" :
                                isLost ? "bg-rose-500/15 text-rose-500 border border-rose-500/30" :
                                "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                              )}>
                                {d.stage}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground">
                    <i className="fa-solid fa-handshake text-xl" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">No deals found for this timeframe</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Create your first deal to track pipeline volume.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNewDeal()}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                  >
                    <i className="fa-solid fa-plus text-xs" /> Create Deal
                  </button>
                </div>
              )}
            </div>

            {/* Avg Deal Size */}
            <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Average Deal Size</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-extrabold text-foreground">{avgDealSizeFormatted}</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                    {filteredDeals.length} deals
                  </span>
                </div>
              </div>

              {/* Dynamic Sparkline plotted across real deals */}
              <div className="relative pt-4">
                <svg viewBox="0 0 280 140" className="w-full h-40 overflow-visible">
                  {[{ label: "Max", y: 25 }, { label: "Mid", y: 70 }, { label: "0", y: 115 }].map((g, i) => (
                    <g key={i}>
                      <text x="0" y={g.y + 3} className="text-[9px] font-semibold fill-muted-foreground font-mono">{g.label}</text>
                      <line x1="30" y1={g.y} x2="280" y2={g.y} stroke="currentColor" strokeDasharray="4 4" className="text-border/60" />
                    </g>
                  ))}
                  <path
                    d={avgDealSparkline.path}
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {avgDealSparkline.labels.map((d, i) => {
                    const x = 30 + (i / Math.max(1, avgDealSparkline.labels.length - 1)) * 250;
                    return (
                      <text key={i} x={x} y="135" textAnchor="middle" className="text-[10px] font-semibold fill-muted-foreground">
                        {d}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* ROW 4: Dynamic BD Growth Chart */}
          <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4">
              <div>
                <h2 className="text-base font-extrabold text-foreground tracking-tight">Business Development Revenue Curve</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Aggregated from confirmed deals across selected timeline</p>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGrowthDropdown(!showGrowthDropdown)}
                  className="flex items-center gap-1 bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  <span>{growthPeriod}</span>
                  <i className="fa-solid fa-chevron-down text-[10px] ml-1 text-muted-foreground" />
                </button>
                {showGrowthDropdown && (
                  <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                    {(["Last Year", "Last 6 Months", "This Year"] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setGrowthPeriod(p); setShowGrowthDropdown(false); }}
                        className={cn("w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer", growthPeriod === p ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground")}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="relative pt-2">
              <svg viewBox="0 0 1000 240" className="w-full h-64 overflow-visible">
                <defs>
                  <linearGradient id="bdGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {[{ label: "High", y: 30 }, { label: "Mid", y: 110 }, { label: "0", y: 195 }].map((g, i) => (
                  <g key={i}>
                    <text x="0" y={g.y + 4} className="text-[11px] font-semibold fill-muted-foreground font-mono">{g.label}</text>
                    <line x1="35" y1={g.y} x2="1000" y2={g.y} stroke="currentColor" strokeDasharray="4 4" className="text-border/60" />
                  </g>
                ))}
                {splinePaths.areaPath && <path d={splinePaths.areaPath} fill="url(#bdGrowthGrad)" />}
                {splinePaths.linePath && <path d={splinePaths.linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />}
                {monthlyGrowthData.map((m, i) => {
                  const x = 35 + (i / Math.max(1, monthlyGrowthData.length - 1)) * 965;
                  const hov = hoveredGrowthMonth === i;
                  return (
                    <g
                      key={i}
                      onMouseEnter={() => setHoveredGrowthMonth(i)}
                      onMouseLeave={() => setHoveredGrowthMonth(null)}
                      className="cursor-pointer"
                    >
                      <text x={x} y="225" textAnchor="middle" className={cn("text-[11px] transition-all", hov ? "font-bold fill-primary" : "font-semibold fill-muted-foreground")}>
                        {m.month}
                      </text>
                      {hov && (
                        <g>
                          <circle cx={x} cy={m.y} r="5" fill="hsl(var(--primary))" stroke="#fff" strokeWidth="2" />
                          <rect x={x - 36} y={m.y - 32} width="72" height="24" rx="6" fill="#1e293b" className="dark:fill-slate-100" />
                          <text x={x} y={m.y - 16} textAnchor="middle" fill="#fff" className="dark:fill-slate-900 text-[10px] font-black font-mono">
                            {m.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* LEADS TAB — reference: dreamstechnologies leads-dashboard  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "leads" && (
        <div className="space-y-6">
          {/* ── Global Interactive Lifecycle Stepper (Connected Flow Pipeline) ── */}
          <div className="relative overflow-hidden bg-gradient-to-r from-card/95 via-card/85 to-card/95 backdrop-blur-xl border border-border/80 rounded-2xl p-4 shadow-sm">
            {/* Ambient Background Accent */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <span>Business Development Lifecycle Journey</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    5-Stage Pipeline
                  </span>
                </h4>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                <span className="hidden md:inline-flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/40 font-mono text-[10px]">
                  <i className="fa-solid fa-circle-nodes text-primary text-[9px]" />
                  <span>Pipeline: <strong>{formatDealsTotal(deals, totalPipelineVal)}</strong></span>
                  <span className="text-border/80">•</span>
                  <span>Win Rate: <strong className="text-emerald-500">{conversionRate}%</strong></span>
                </span>
                <span className="hidden sm:inline-block text-[11px] text-muted-foreground/80">
                  Click any stage to filter &amp; navigate
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 relative">
              {/* Step 1: Leads */}
              <button
                type="button"
                onClick={() => {
                  setLeadStatusFilter("All");
                  setLeadStageFilter("All");
                  setLeadSearch("");
                  setLeadsSubTab("all");
                }}
                className={cn(
                  "relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between h-[88px] overflow-hidden",
                  leadsSubTab === "all"
                    ? "bg-blue-500/15 border-blue-500/60 shadow-xs ring-2 ring-blue-500/20"
                    : "bg-muted/20 hover:bg-muted/50 border-border/70 hover:border-blue-500/40 hover:-translate-y-0.5 hover:shadow-xs"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-[9px] font-mono font-bold">1</span>
                    <i className="fa-solid fa-user-tag text-[10px]" /> Leads
                  </span>
                  <span className="text-[10px] font-mono font-black bg-background/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-foreground border border-border/70 shadow-2xs">
                    {activeLeads.length}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-black font-mono text-foreground tracking-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {formatLeadsTotal(activeLeads)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-medium flex items-center justify-between">
                    <span>Prospective Pool</span>
                    <i className="fa-solid fa-chevron-right text-[8px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-500" />
                  </p>
                </div>
              </button>

              {/* Step 2: Deals */}
              <button
                type="button"
                onClick={() => {
                  setDealStageNavFilter(undefined);
                  setLeadsSubTab("deals");
                }}
                className={cn(
                  "relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between h-[88px] overflow-hidden",
                  leadsSubTab === "deals" && !dealStageNavFilter
                    ? "bg-indigo-500/15 border-indigo-500/60 shadow-xs ring-2 ring-indigo-500/20"
                    : "bg-muted/20 hover:bg-muted/50 border-border/70 hover:border-indigo-500/40 hover:-translate-y-0.5 hover:shadow-xs"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-[9px] font-mono font-bold">2</span>
                    <i className="fa-solid fa-handshake text-[10px]" /> Deals
                  </span>
                  <span className="text-[10px] font-mono font-black bg-background/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-foreground border border-border/70 shadow-2xs">
                    {deals.length}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-black font-mono text-foreground tracking-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {formatDealsTotal(deals, totalPipelineVal)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-medium flex items-center justify-between">
                    <span>Active Pipeline</span>
                    <i className="fa-solid fa-chevron-right text-[8px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-500" />
                  </p>
                </div>
              </button>

              {/* Step 3: Proposals */}
              <button
                type="button"
                onClick={() => setLeadsSubTab("proposals")}
                className={cn(
                  "relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between h-[88px] overflow-hidden",
                  leadsSubTab === "proposals"
                    ? "bg-purple-500/15 border-purple-500/60 shadow-xs ring-2 ring-purple-500/20"
                    : "bg-muted/20 hover:bg-muted/50 border-border/70 hover:border-purple-500/40 hover:-translate-y-0.5 hover:shadow-xs"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-[9px] font-mono font-bold">3</span>
                    <i className="fa-solid fa-file-contract text-[10px]" /> Quotes
                  </span>
                  <span className="text-[10px] font-mono font-black bg-background/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-foreground border border-border/70 shadow-2xs">
                    {proposals.length}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-black font-mono text-foreground tracking-tight truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {formatProposalsTotal(proposals)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-medium flex items-center justify-between">
                    <span>Proposals Sent</span>
                    <i className="fa-solid fa-chevron-right text-[8px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-purple-500" />
                  </p>
                </div>
              </button>

              {/* Step 4: Closed Won */}
              <button
                type="button"
                onClick={() => {
                  setDealStageNavFilter("Closed Won");
                  setLeadsSubTab("deals");
                }}
                className={cn(
                  "relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between h-[88px] overflow-hidden",
                  leadsSubTab === "deals" && dealStageNavFilter === "Closed Won"
                    ? "bg-emerald-500/15 border-emerald-500/60 shadow-xs ring-2 ring-emerald-500/20"
                    : "bg-muted/20 hover:bg-muted/50 border-border/70 hover:border-emerald-500/40 hover:-translate-y-0.5 hover:shadow-xs"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-[9px] font-mono font-bold">4</span>
                    <i className="fa-solid fa-trophy text-[10px]" /> Won
                  </span>
                  <span className="text-[10px] font-mono font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30 shadow-2xs">
                    {wonDealsCount}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight truncate">
                    {formatDealsTotal(deals, totalClosedWonRevenue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-medium flex items-center justify-between">
                    <span>{conversionRate}% Win Rate</span>
                    <i className="fa-solid fa-chevron-right text-[8px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-500" />
                  </p>
                </div>
              </button>

              {/* Step 5: Sales Reps & Quotas */}
              <button
                type="button"
                onClick={() => setLeadsSubTab("sales")}
                className={cn(
                  "relative p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer group flex flex-col justify-between h-[88px] col-span-2 md:col-span-1 overflow-hidden",
                  leadsSubTab === "sales"
                    ? "bg-amber-500/15 border-amber-500/60 shadow-xs ring-2 ring-amber-500/20"
                    : "bg-muted/20 hover:bg-muted/50 border-border/70 hover:border-amber-500/40 hover:-translate-y-0.5 hover:shadow-xs"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-md bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-[9px] font-mono font-bold">5</span>
                    <i className="fa-solid fa-chart-line text-[10px]" /> Executive
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-background/80 backdrop-blur-xs px-2 py-0.5 rounded-md text-foreground border border-border/70 shadow-2xs">
                    Quota
                  </span>
                </div>
                <div>
                  <p className="text-sm font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight truncate">
                    {formatDealsTotal(deals, totalClosedWonRevenue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-medium flex items-center justify-between">
                    <span>Leaderboard &amp; Quotas</span>
                    <i className="fa-solid fa-chevron-right text-[8px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-amber-500" />
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* ── Sub-navigation: Sleek Executive Segmented Control ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-card/60 backdrop-blur-md rounded-2xl border border-border/80 shadow-xs">
            <div className="flex items-center flex-wrap gap-1 p-0.5 bg-muted/40 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => setLeadsSubTab("overview")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer",
                  leadsSubTab === "overview"
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <i className="fa-solid fa-chart-pie text-[11px]" />
                Overview
              </button>
              <button
                type="button"
                onClick={() => setLeadsSubTab("all")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer",
                  leadsSubTab === "all"
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <i className="fa-solid fa-table-list text-[11px]" />
                All Leads
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                  leadsSubTab === "all" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground border border-border/60"
                )}>
                  {activeLeads.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLeadsSubTab("deals")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer",
                  leadsSubTab === "deals"
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <i className="fa-solid fa-handshake text-[11px]" />
                Deals
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                  leadsSubTab === "deals" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground border border-border/60"
                )}>
                  {deals.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLeadsSubTab("sales")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer",
                  leadsSubTab === "sales"
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <i className="fa-solid fa-chart-line text-[11px]" />
                Sales
                <span className={cn(
                  "text-[10px] font-mono px-2 py-0.2 rounded-full font-bold",
                  leadsSubTab === "sales" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground border border-border/60"
                )}>
                  {totalClosedWonRevenue > 0 ? `$${formatUSD(totalClosedWonRevenue)}` : `${deals.length} deals`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLeadsSubTab("proposals")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer",
                  leadsSubTab === "proposals"
                    ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <i className="fa-solid fa-file-contract text-[11px]" />
                Proposals
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold",
                  leadsSubTab === "proposals" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground border border-border/60"
                )}>
                  {proposals.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 px-2">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-flex items-center gap-1.5">
                <i className="fa-solid fa-sparkles text-primary text-[10px]" />
                {leadsSubTab === "deals"
                  ? "Track sales deals, pipeline velocity & stage analytics"
                  : leadsSubTab === "sales"
                  ? "Executive dashboard, rep performance & revenue forecasting"
                  : leadsSubTab === "proposals"
                  ? "Manage client proposals & track real-time status"
                  : "Click any lead or KPI card to inspect full profile & activity"}
              </span>
            </div>
          </div>

          {/* ── SUB-VIEW 1: OVERVIEW DASHBOARD ── */}
          {leadsSubTab === "overview" && (
            <div className="space-y-6">
              {/* ── Interactive KPI Summary Cards (Live Data with Real Rates) ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Leads",
                    value: activeLeads.length,
                    badge: `${formatLeadsTotal(activeLeads)} Pool`,
                    subtext: "Active leads in database",
                    icon: "fa-users-viewfinder",
                    color: "text-blue-500 dark:text-blue-400",
                    bg: "bg-blue-500/10 dark:bg-blue-950/40",
                    border: "border-blue-500/25",
                    glow: "from-blue-500/10 via-transparent to-transparent",
                    onClick: () => { setLeadStatusFilter("All"); setLeadStageFilter("All"); setLeadSearch(""); setLeadsSubTab("all"); },
                    hint: "View All Leads",
                  },
                  {
                    label: "Closed / Won Leads",
                    value: activeLeads.filter(l => l.status === "Closed").length,
                    badge: `${Math.round((activeLeads.filter(l => l.status === "Closed").length / (activeLeads.length || 1)) * 100)}% Won`,
                    subtext: "Successfully converted",
                    icon: "fa-circle-check",
                    color: "text-emerald-500 dark:text-emerald-400",
                    bg: "bg-emerald-500/10 dark:bg-emerald-950/40",
                    border: "border-emerald-500/25",
                    glow: "from-emerald-500/10 via-transparent to-transparent",
                    onClick: () => { setLeadStatusFilter("Closed"); setLeadStageFilter("All"); setLeadSearch(""); setLeadsSubTab("all"); },
                    hint: "Filter Closed",
                  },
                  {
                    label: "Contacted & Reached",
                    value: activeLeads.filter(l => l.status === "Contacted").length,
                    badge: `${activeLeads.filter(l => l.status === "Contacted").length}/${activeLeads.length} Reached`,
                    subtext: "Direct outreach in motion",
                    icon: "fa-headset",
                    color: "text-amber-500 dark:text-amber-400",
                    bg: "bg-amber-500/10 dark:bg-amber-950/40",
                    border: "border-amber-500/25",
                    glow: "from-amber-500/10 via-transparent to-transparent",
                    onClick: () => { setLeadStatusFilter("Contacted"); setLeadStageFilter("All"); setLeadSearch(""); setLeadsSubTab("all"); },
                    hint: "Filter Contacted",
                  },
                  {
                    label: "In Active Pipeline",
                    value: activeLeads.filter(l => l.stage === "Inpipeline").length,
                    badge: `${Math.round((activeLeads.filter(l => l.stage === "Inpipeline").length / (activeLeads.length || 1)) * 100)}% Velocity`,
                    subtext: "Advancing to deal stage",
                    icon: "fa-filter-circle-dollar",
                    color: "text-violet-500 dark:text-violet-400",
                    bg: "bg-violet-500/10 dark:bg-violet-950/40",
                    border: "border-violet-500/25",
                    glow: "from-violet-500/10 via-transparent to-transparent",
                    onClick: () => { setLeadStageFilter("Inpipeline"); setLeadStatusFilter("All"); setLeadSearch(""); setLeadsSubTab("all"); },
                    hint: "Filter In Pipeline",
                  },
                ].map((kpi, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={kpi.onClick}
                    className={cn(
                      "relative overflow-hidden bg-card hover:bg-muted/30 border border-border/80 hover:border-primary/50 rounded-2xl p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group cursor-pointer flex flex-col justify-between"
                    )}
                    title={`Click to jump to All Leads (${kpi.hint})`}
                  >
                    {/* Top ambient highlight */}
                    <div className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r", kpi.glow)} />

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-200 group-hover:scale-110 shadow-2xs", kpi.bg, kpi.border)}>
                          <i className={`fa-solid ${kpi.icon} ${kpi.color} text-lg`} />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono font-bold text-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded-full shadow-2xs">
                            {kpi.badge}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors">{kpi.label}</p>
                      <p className="text-2xl font-black text-foreground font-mono mt-1 tracking-tight">{kpi.value}</p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground truncate">{kpi.subtext}</span>
                      <span className="font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ml-1">
                        Filter <i className="fa-solid fa-arrow-right text-[9px] group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* ── Cross-Module Quick Access Command Hub ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setLeadsSubTab("all")}
                  className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-card to-card border border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                        <i className="fa-solid fa-table-list" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Leads Directory</p>
                        <p className="text-[11px] text-muted-foreground font-medium">{activeLeads.length} leads in database</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2.5 mt-1 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">Status &amp; contact logs</span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Explore <i className="fa-solid fa-arrow-right text-[10px]" />
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setLeadsSubTab("deals")}
                  className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-card to-card border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                        <i className="fa-solid fa-handshake" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Sales Deals Pipeline</p>
                        <p className="text-[11px] text-muted-foreground font-medium">{deals.length} deals active</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2.5 mt-1 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground font-bold text-emerald-600 dark:text-emerald-400">{formatDealsTotal(deals, totalPipelineVal)} in motion</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Deals <i className="fa-solid fa-arrow-right text-[10px]" />
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setLeadsSubTab("sales")}
                  className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-card to-card border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                        <i className="fa-solid fa-chart-line" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Executive Sales Hub</p>
                        <p className="text-[11px] text-muted-foreground font-medium">Rep velocity &amp; quotas</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2.5 mt-1 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">{conversionRate}% win rate</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Sales <i className="fa-solid fa-arrow-right text-[10px]" />
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setLeadsSubTab("proposals")}
                  className="relative overflow-hidden bg-gradient-to-br from-violet-500/10 via-card to-card border border-violet-500/30 hover:border-violet-500/60 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-base shrink-0 group-hover:scale-105 transition-transform">
                        <i className="fa-solid fa-file-contract" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Client Proposals</p>
                        <p className="text-[11px] text-muted-foreground font-medium">{proposals.length} active quotes</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2.5 mt-1 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground font-bold text-violet-600 dark:text-violet-400">{formatProposalsTotal(proposals)} total</span>
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Proposals <i className="fa-solid fa-arrow-right text-[10px]" />
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Executive Conversion Funnel (Cross-Pipeline Velocity) ── */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/60">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h2 className="text-sm font-extrabold text-foreground tracking-tight">Full Lifecycle Conversion Funnel</h2>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Click any stage to filter directory or jump to pipeline modules</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">
                      Overall Win Rate: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{conversionRate}%</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4">
                  {[
                    {
                      step: "01",
                      title: "1. Leads Generated",
                      count: activeLeads.length || demoLeads.length,
                      subtext: "Total in BD pool",
                      icon: "fa-user-tag",
                      color: "text-blue-500",
                      bg: "bg-blue-500/10 dark:bg-blue-950/30",
                      border: "border-blue-500/20 hover:border-blue-500/60",
                      action: () => { setLeadStatusFilter("All"); setLeadStageFilter("All"); setLeadSearch(""); setLeadsSubTab("all"); },
                      actionLabel: "View All Leads",
                    },
                    {
                      step: "02",
                      title: "2. Qualified / In Pipeline",
                      count: activeLeads.filter(l => l.status === "Contacted" || l.stage === "Inpipeline" || l.status === "Closed").length,
                      subtext: "Nurtured prospects",
                      icon: "fa-filter-circle-dollar",
                      color: "text-violet-500",
                      bg: "bg-violet-500/10 dark:bg-violet-950/30",
                      border: "border-violet-500/20 hover:border-violet-500/60",
                      action: () => { setLeadStageFilter("Inpipeline"); setLeadStatusFilter("All"); setLeadSearch(""); setLeadsSubTab("all"); },
                      actionLabel: "Filter In-Pipeline",
                    },
                    {
                      step: "03",
                      title: "3. Deals Negotiating",
                      count: deals.length,
                      subtext: `${formatDealsTotal(deals)} pipeline`,
                      icon: "fa-handshake",
                      color: "text-amber-500",
                      bg: "bg-amber-500/10 dark:bg-amber-950/30",
                      border: "border-amber-500/20 hover:border-amber-500/60",
                      action: () => { setDealStageNavFilter("Negotiation"); setLeadsSubTab("deals"); },
                      actionLabel: "Open Negotiating Deals",
                    },
                    {
                      step: "04",
                      title: "4. Proposals Active",
                      count: proposals.length,
                      subtext: `${formatProposalsTotal(proposals)} value`,
                      icon: "fa-file-contract",
                      color: "text-sky-500",
                      bg: "bg-sky-500/10 dark:bg-sky-950/30",
                      border: "border-sky-500/20 hover:border-sky-500/60",
                      action: () => { setLeadsSubTab("proposals"); },
                      actionLabel: "Open Proposals",
                    },
                    {
                      step: "05",
                      title: "5. Closed Won Revenue",
                      count: wonDealsCount,
                      subtext: `${formatDealsTotal(deals.filter(d => d.stage === "Closed Won"))} closed`,
                      icon: "fa-circle-check",
                      color: "text-emerald-500",
                      bg: "bg-emerald-500/10 dark:bg-emerald-950/30",
                      border: "border-emerald-500/20 hover:border-emerald-500/60",
                      action: () => { setDealStageNavFilter("Closed Won"); setLeadsSubTab("deals"); },
                      actionLabel: "Review Won Deals",
                    },

                  ].map((f, idx) => (
                    <div
                      key={idx}
                      onClick={f.action}
                      className={cn(
                        "relative p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-all cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-xs",
                        f.border
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-black text-muted-foreground/60 tracking-wider uppercase">Stage {f.step}</span>
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs", f.bg, f.color)}>
                            <i className={`fa-solid ${f.icon}`} />
                          </div>
                        </div>
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{f.title}</p>
                        <p className="text-xl font-extrabold text-foreground font-mono mt-1">{f.count}</p>
                        <p className="text-[11px] text-muted-foreground font-medium truncate">{f.subtext}</p>
                      </div>
                      <div className="pt-3 mt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-bold text-primary opacity-75 group-hover:opacity-100 transition-opacity">
                        <span>{f.actionLabel}</span>
                        <i className="fa-solid fa-chevron-right text-[8px] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Row 1: Recently Created Leads Table + Leads By Stage Donut ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Recently Created Leads */}
                <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between p-5 border-b border-border/60">
                      <div>
                        <h2 className="text-base font-extrabold text-foreground tracking-tight">Recently Created Leads</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Click any row to open lead component</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button type="button" onClick={() => setShowLeadsTimeDropdown(!showLeadsTimeDropdown)} className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer">
                            <span>{leadsTimeFilter}</span><i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                          </button>
                          {showLeadsTimeDropdown && (
                            <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                              {["Last 7 days", "Last 30 days", "Last 3 months", "All time"].map(t => (
                                <button key={t} type="button" onClick={() => { setLeadsTimeFilter(t); setShowLeadsTimeDropdown(false); }} className={cn("w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer", leadsTimeFilter === t ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground")}>{t}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setLeadsSubTab("all")}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer pl-1"
                        >
                          All <i className="fa-solid fa-arrow-right text-[10px]" />
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/30">
                            <th className="text-left py-3 px-5 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Lead Name</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Company Name</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Phone</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Status</th>
                            <th className="py-3 px-3 text-right" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {(leads.length > 0 ? leads : demoLeads).slice(0, 7).map((lead, idx) => {
                            const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG["New"];
                            const colorIdx = lead.companyName.charCodeAt(0) % COMPANY_COLORS.length;
                            const initials = lead.companyName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                            return (
                              <tr
                                key={lead._id || idx}
                                onClick={() => handleOpenLead(lead)}
                                className="hover:bg-muted/40 transition-colors cursor-pointer group"
                              >
                                <td className="py-3.5 px-5 font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                  <span>{lead.leadName}</span>
                                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </td>
                                <td className="py-3.5 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0", COMPANY_COLORS[colorIdx])}>{initials}</div>
                                    <span className="font-semibold text-foreground text-xs">{lead.companyName}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 text-muted-foreground font-mono">{lead.phone || "—"}</td>
                                <td className="py-3.5 px-3">
                                  <span className={cn("inline-block px-3 py-1 rounded-full text-[11px] font-bold", sc.cls)}>{sc.label}</span>
                                </td>
                                <td className="py-3.5 px-3 text-right" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => handleConvertToDeal(lead)}
                                      className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center transition-colors cursor-pointer"
                                      title="Convert to Sales Deal"
                                    >
                                      <i className="fa-solid fa-handshake text-[10px]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleConvertToProposalFromLead(lead)}
                                      className="w-7 h-7 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center justify-center transition-colors cursor-pointer"
                                      title="Create Client Proposal"
                                    >
                                      <i className="fa-solid fa-file-contract text-[10px]" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenLead(lead)}
                                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                      title="View Lead Profile"
                                    >
                                      <i className="fa-solid fa-eye text-[10px]" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/20 border-t border-border/40 text-center">
                    <button
                      type="button"
                      onClick={() => setLeadsSubTab("all")}
                      className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      View all {activeLeads.length} leads in database &rarr;
                    </button>
                  </div>
                </div>

                {/* Leads By Stage — Donut Chart */}
                <div className="bg-card border border-border/80 rounded-2xl shadow-xs p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-base font-extrabold text-foreground tracking-tight">Leads By Stage</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Click any stage to filter in All Leads</p>
                    </div>
                    <div className="relative">
                      <button type="button" onClick={() => setShowStageTimeDropdown(!showStageTimeDropdown)} className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer">
                        <span>{stageTimeFilter}</span><i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                      </button>
                      {showStageTimeDropdown && (
                        <div className="absolute right-0 mt-1 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                          {["Last 7 Days", "Last 30 Days", "Last 3 Months", "All Time"].map(t => (
                            <button key={t} type="button" onClick={() => { setStageTimeFilter(t); setShowStageTimeDropdown(false); }} className={cn("w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer", stageTimeFilter === t ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground")}>{t}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SVG Pie Chart */}
                  <div className="flex flex-col items-center gap-6 my-auto">
                    <div className="relative">
                      <svg viewBox="0 0 240 240" className="w-52 h-52">
                        {(() => {
                          const stages = Object.entries(STAGE_CONFIG);
                          const total = stages.reduce((s, [, v]) => s + v.pct, 0);
                          let cumulative = 0;
                          return stages.map(([name, cfg], i) => {
                            const pct = cfg.pct / total;
                            const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                            cumulative += pct;
                            const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
                            const cx = 120, cy = 120, r = 100;
                            const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
                            const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
                            const largeArc = pct > 0.5 ? 1 : 0;
                            return (
                              <path
                                key={name}
                                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                fill={cfg.color}
                                stroke="white"
                                strokeWidth="3"
                                onClick={() => { setLeadStageFilter(name); setLeadStatusFilter("All"); setLeadSearch(""); setLeadsSubTab("all"); }}
                                className="hover:opacity-80 transition-opacity cursor-pointer"
                              >
                                <title>{`${name}: ${stageCounts[name] || 0} leads (Click to filter)`}</title>
                              </path>
                            );
                          });
                        })()}
                        <circle cx="120" cy="120" r="55" fill="var(--card)" />
                        <text x="120" y="115" textAnchor="middle" className="text-[11px] font-bold fill-muted-foreground">Total</text>
                        <text x="120" y="133" textAnchor="middle" className="text-xl font-extrabold fill-foreground font-mono">{totalLeads}</text>
                      </svg>
                    </div>

                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full">
                      {Object.entries(STAGE_CONFIG).map(([name, cfg]) => {
                        const count = stageCounts[name] || 0;
                        const pct = Math.round((count / totalLeads) * 100) || cfg.pct;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => { setLeadStageFilter(name); setLeadStatusFilter("All"); setLeadSearch(""); setLeadsSubTab("all"); }}
                            className="flex items-center gap-2.5 hover:bg-muted/40 p-1.5 rounded-lg transition-colors text-left cursor-pointer group"
                            title={`Filter All Leads by stage "${name}"`}
                          >
                            <span className="w-3 h-3 rounded-full shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: cfg.color }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{name}</p>
                              <p className="text-[11px] text-muted-foreground">{pct}% ({count})</p>
                            </div>
                            <i className="fa-solid fa-arrow-right text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Row 2: Leads Growth Spline Chart ── */}
              <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-foreground tracking-tight">Leads Progression by Stage</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Pipeline volume and touchpoint progression</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button type="button" onClick={() => setShowPipelineDropdown(!showPipelineDropdown)} className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer">
                        <span>{pipelineFilter}</span><i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                      </button>
                      {showPipelineDropdown && (
                        <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                          {["Sales Pipeline", "BD Pipeline", "All Leads"].map(t => (
                            <button key={t} type="button" onClick={() => { setPipelineFilter(t); setShowPipelineDropdown(false); }} className={cn("w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer", pipelineFilter === t ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted/50 text-foreground")}>{t}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button type="button" onClick={() => setShowStageTimeDropdown(v => !v)} className="flex items-center gap-1.5 bg-muted/40 hover:bg-muted/70 px-3 py-1.5 rounded-lg border border-border/60 text-xs font-semibold text-foreground transition-colors cursor-pointer">
                        <span>{stageTimeFilter}</span><i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative pt-2">
                  <svg viewBox="0 0 1000 220" className="w-full h-56 overflow-visible">
                    <defs>
                      <linearGradient id="leadsGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    {[{ label: "6K", y: 20 }, { label: "5K", y: 55 }, { label: "4K", y: 90 }, { label: "3K", y: 125 }, { label: "2K", y: 160 }, { label: "1K", y: 190 }].map((g, i) => (
                      <g key={i}>
                        <text x="0" y={g.y + 4} className="text-[11px] font-semibold fill-muted-foreground font-mono">{g.label}</text>
                        <line x1="35" y1={g.y} x2="1000" y2={g.y} stroke="currentColor" strokeDasharray="4 4" className="text-border/50" />
                      </g>
                    ))}
                    <path d={`M 50 160 C 150 130, 250 150, 300 130 C 350 110, 400 90, 480 80 C 560 70, 580 100, 640 90 C 700 80, 730 50, 790 45 C 830 40, 880 60, 950 55 L 950 200 L 50 200 Z`} fill="url(#leadsGrowthGrad)" />
                    <path d={`M 50 160 C 150 130, 250 150, 300 130 C 350 110, 400 90, 480 80 C 560 70, 580 100, 640 90 C 700 80, 730 50, 790 45 C 830 40, 880 60, 950 55`} fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" />
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => {
                      const x = 50 + (i / 11) * 900;
                      return <text key={i} x={x} y="215" textAnchor="middle" className="text-[10px] font-semibold fill-muted-foreground">{m}</text>;
                    })}
                    {[{ x: 50, y: 160 }, { x: 200, y: 140 }, { x: 300, y: 130 }, { x: 480, y: 80 }, { x: 640, y: 90 }, { x: 790, y: 45 }, { x: 950, y: 55 }].map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y} r="4" fill="#8B5CF6" stroke="white" strokeWidth="2" className="cursor-pointer hover:r-6 transition-all" />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* ── SUB-VIEW 3: PROPOSALS GRID & LIST ── */}
          {leadsSubTab === "proposals" && (() => {
            // Filtered proposals
            const filteredProposals = proposals.filter(p => {
              const matchSearch = !proposalSearch || [
                p.subject, p.clientName, p.proposalCode, p.projectName ?? "", ...(p.tags || [])
              ].some(f => f.toLowerCase().includes(proposalSearch.toLowerCase()));
              const matchStatus = proposalStatusFilter === "All" || p.status === proposalStatusFilter;
              return matchSearch && matchStatus;
            });

            // Sorted proposals
            const sortedProposals = [...filteredProposals].sort((a, b) => {
              if (proposalSortBy === "value_desc") return (b.totalValue || 0) - (a.totalValue || 0);
              if (proposalSortBy === "value_asc") return (a.totalValue || 0) - (b.totalValue || 0);
              if (proposalSortBy === "expiring_soon") return new Date(a.openTill).getTime() - new Date(b.openTill).getTime();
              if (proposalSortBy === "name") return (a.subject || "").localeCompare(b.subject || "");
              return new Date(b.issueDate || b.openTill).getTime() - new Date(a.issueDate || a.openTill).getTime();
            });

            const statusStyles: Record<string, { bg: string; text: string; dot: string; border: string }> = {
              Accepted: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
              Sent:     { bg: "bg-sky-500/10",     border: "border-sky-500/20",     text: "text-sky-600 dark:text-sky-400",         dot: "bg-sky-500" },
              Draft:    { bg: "bg-slate-500/10",   border: "border-slate-400/20",   text: "text-slate-600 dark:text-slate-400",     dot: "bg-slate-400" },
              Declined: { bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-600 dark:text-red-400",         dot: "bg-red-500" },
              Expired:  { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-600 dark:text-amber-400",     dot: "bg-amber-500" },
            };

            const pendingProposals = proposals.filter(p => p.status === "Sent" || p.status === "Draft");
            const pipelineValueStr = formatProposalsTotal(pendingProposals);
            const acceptedCount = proposals.filter(p => p.status === "Accepted").length;
            const acceptedRate = proposals.length > 0 ? ((acceptedCount / proposals.length) * 100).toFixed(0) : "0";

            function fmtDate(d: string | undefined) {
              if (!d) return "—";
              return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            }
            function getInitials(name: string) {
              return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
            }
            function getDaysRemaining(openTillStr: string) {
              const diffMs = new Date(openTillStr).getTime() - Date.now();
              return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            }

            return (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* ── KPI Banner ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Proposals",   value: proposals.length,                                                                icon: "fa-file-contract",   color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-500/10",  border: "border-violet-500/20" },
                    { label: "Pipeline Value",     value: pipelineValueStr,                                                              icon: "fa-sack-dollar",     color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/10",    border: "border-blue-500/20" },
                    { label: "Accepted Rate",      value: `${acceptedRate}%`,                                                            icon: "fa-circle-check",   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                    { label: "Pending / Sent",     value: pendingProposals.length,                                                       icon: "fa-paper-plane",    color: "text-sky-600 dark:text-sky-400",         bg: "bg-sky-500/10",     border: "border-sky-500/20" },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border", kpi.bg, kpi.border)}>
                          <i className={`fa-solid ${kpi.icon} ${kpi.color} text-lg`} />
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground">{kpi.label}</p>
                      <p className="text-2xl font-extrabold text-foreground mt-0.5">{kpi.value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Interactive Status Segmented Filter Bar ── */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { key: "All", label: "All Proposals", icon: "fa-layer-group", count: proposals.length },
                    { key: "Draft", label: "Draft", icon: "fa-file-pen", count: proposals.filter(p => p.status === "Draft").length, dot: "bg-slate-400" },
                    { key: "Sent", label: "Sent", icon: "fa-paper-plane", count: proposals.filter(p => p.status === "Sent").length, dot: "bg-sky-500" },
                    { key: "Accepted", label: "Accepted", icon: "fa-circle-check", count: proposals.filter(p => p.status === "Accepted").length, dot: "bg-emerald-500" },
                    { key: "Declined", label: "Declined", icon: "fa-circle-xmark", count: proposals.filter(p => p.status === "Declined").length, dot: "bg-red-500" },
                    { key: "Expired", label: "Expired", icon: "fa-clock", count: proposals.filter(p => p.status === "Expired").length, dot: "bg-amber-500" },
                  ].map((pill) => {
                    const isActive = proposalStatusFilter === pill.key;
                    return (
                      <button
                        key={pill.key}
                        onClick={() => setProposalStatusFilter(pill.key)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <i className={`fa-solid ${pill.icon} text-xs`} />
                        <span>{pill.label}</span>
                        <span className={cn(
                          "px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                          isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
                        )}>
                          {pill.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── Filter Toolbar ── */}
                <div className="bg-card border border-border/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Search */}
                    <div className="relative">
                      <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                      <input
                        type="text"
                        placeholder="Search proposals, clients, codes..."
                        value={proposalSearch}
                        onChange={e => setProposalSearch(e.target.value)}
                        className="pl-8 pr-7 py-1.5 text-xs bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
                      />
                      {proposalSearch && (
                        <button
                          onClick={() => setProposalSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      )}
                    </div>

                    {/* Sort By Dropdown */}
                    <div className="flex items-center gap-1 bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs">
                      <i className="fa-solid fa-arrow-down-wide-short text-muted-foreground text-xs mr-1" />
                      <span className="text-muted-foreground text-[10px] uppercase font-bold">Sort:</span>
                      <select
                        value={proposalSortBy}
                        onChange={e => setProposalSortBy(e.target.value as typeof proposalSortBy)}
                        className="bg-transparent border-none focus:outline-none text-xs text-foreground cursor-pointer font-medium"
                      >
                        <option value="newest">Newest First</option>
                        <option value="value_desc">Highest Value</option>
                        <option value="value_asc">Lowest Value</option>
                        <option value="expiring_soon">Expiring Soonest</option>
                        <option value="name">Subject (A-Z)</option>
                      </select>
                    </div>

                    {/* Count badge */}
                    <span className="text-xs font-semibold text-muted-foreground">
                      {sortedProposals.length} proposals
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Export CSV Button */}
                    <button
                      onClick={() => handleExportProposalsCSV(sortedProposals)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
                      title="Export current proposals to CSV"
                    >
                      <i className="fa-solid fa-file-csv text-emerald-600 dark:text-emerald-400 text-xs" />
                      Export CSV
                    </button>

                    {/* Grid / List toggle */}
                    <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border gap-0.5">
                      <button
                        onClick={() => setProposalLayout("grid")}
                        className={cn("w-7 h-7 rounded-md flex items-center justify-center text-xs transition-all",
                          proposalLayout === "grid" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Grid View"
                      >
                        <i className="fa-solid fa-grip" />
                      </button>
                      <button
                        onClick={() => setProposalLayout("list")}
                        className={cn("w-7 h-7 rounded-md flex items-center justify-center text-xs transition-all",
                          proposalLayout === "list" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="List View"
                      >
                        <i className="fa-solid fa-list" />
                      </button>
                    </div>

                    {/* Add New Proposal */}
                    <button
                      onClick={() => { setEditingProposal(null); setShowProposalModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm whitespace-nowrap"
                    >
                      <i className="fa-solid fa-square-plus" />
                      Add New Proposal
                    </button>
                  </div>
                </div>

                {/* ── GRID VIEW ── */}
                {proposalLayout === "grid" && (
                  <div>
                    {loadingProposals ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs animate-pulse">
                            <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                            <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                            <div className="h-3 bg-muted rounded w-1/2" />
                          </div>
                        ))}
                      </div>
                    ) : sortedProposals.length === 0 ? (
                      <div className="text-center py-20 text-muted-foreground bg-card border border-border/80 rounded-2xl p-8">
                        <i className="fa-solid fa-file-circle-xmark text-4xl mb-3 opacity-30 text-primary" />
                        <p className="text-sm font-bold text-foreground">No proposals match the criteria</p>
                        <p className="text-xs text-muted-foreground mt-1">Try changing filters or create a new proposal</p>
                        <button
                          onClick={() => { setProposalSearch(""); setProposalStatusFilter("All"); setShowProposalModal(true); }}
                          className="mt-4 px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                        >
                          <i className="fa-solid fa-square-plus mr-1.5" />
                          Create New Proposal
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sortedProposals.map(p => {
                          const ss = statusStyles[p.status] ?? statusStyles.Draft;
                          const isMenuOpen = proposalActionMenu === p._id;
                          const daysRemaining = getDaysRemaining(p.openTill);
                          const isCopied = copiedProposalCode === p.proposalCode;

                          // Compute elapsed percentage for the progress bar
                          const issueTs = new Date(p.issueDate).getTime();
                          const openTillTs = new Date(p.openTill).getTime();
                          const nowTs = Date.now();
                          const totalDuration = Math.max(1, openTillTs - issueTs);
                          const elapsed = Math.min(100, Math.max(0, Math.round(((nowTs - issueTs) / totalDuration) * 100)));

                          return (
                            <div
                              key={p._id}
                              className="group bg-card border border-border/80 rounded-2xl shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 flex flex-col justify-between overflow-hidden cursor-pointer"
                              onClick={() => setPreviewProposal(p)}
                            >
                              {/* Top Bar: Code + Expiry + Menu */}
                              <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-border/50 bg-muted/20">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleCopyProposalCode(p.proposalCode); }}
                                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1"
                                  title="Click to copy proposal code"
                                >
                                  <i className={cn("fa-solid text-[9px]", isCopied ? "fa-check text-emerald-500" : "fa-copy")} />
                                  #{p.proposalCode}
                                </button>

                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  {/* Urgency countdown pill */}
                                  {daysRemaining < 0 ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1">
                                      <i className="fa-solid fa-clock-rotate-left text-[9px]" /> Expired
                                    </span>
                                  ) : daysRemaining <= 5 ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                      <i className="fa-solid fa-triangle-exclamation text-[9px]" /> {daysRemaining === 0 ? "Ends today" : `${daysRemaining}d left`}
                                    </span>
                                  ) : null}

                                  {/* 3-dots Menu */}
                                  <div className="relative">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setProposalActionMenu(isMenuOpen ? null : p._id); }}
                                      className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                                    >
                                      <i className="fa-solid fa-ellipsis-vertical text-xs" />
                                    </button>

                                    {isMenuOpen && (
                                      <div className="absolute right-0 top-8 z-50 w-52 bg-popover border border-border rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <button onClick={(e) => { e.stopPropagation(); setPreviewProposal(p); setProposalActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                          <i className="fa-solid fa-eye text-violet-500 w-4" /> View / Print Preview
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setEditingProposal(p); setShowProposalModal(true); setProposalActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                          <i className="fa-solid fa-pen-to-square text-blue-500 w-4" /> Edit Proposal
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleCloneProposal(p); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                          <i className="fa-solid fa-clone text-amber-500 w-4" /> Duplicate Proposal
                                        </button>
                                        <div className="border-t border-border my-1" />
                                        {(["Accepted", "Sent", "Draft", "Declined"] as const).filter(s => s !== p.status).map(s => (
                                          <button key={s} onClick={(e) => { e.stopPropagation(); handleProposalStatusChange(p._id, s); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                            <i className={cn("fa-solid w-4", s === "Accepted" ? "fa-circle-check text-emerald-500" : s === "Sent" ? "fa-paper-plane text-sky-500" : s === "Draft" ? "fa-file-pen text-slate-400" : "fa-circle-xmark text-red-500")} />
                                            Mark as {s}
                                          </button>
                                        ))}
                                        <div className="border-t border-border my-1" />
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteProposalTarget({ id: p._id, name: p.subject }); setProposalActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-red-500/10 text-red-500 transition-colors text-left">
                                          <i className="fa-solid fa-trash w-4" /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Card Body */}
                              <div className="px-5 pt-3.5 pb-3 flex-1 space-y-3">
                                <div>
                                  <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                    {p.subject}
                                  </h4>
                                  {p.projectName && (
                                    <p className="text-[11px] font-medium text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
                                      <i className="fa-solid fa-diagram-project text-[10px] text-primary/70" />
                                      {p.projectName}
                                    </p>
                                  )}
                                </div>

                                {/* Client Row */}
                                <div className="flex items-center gap-2.5 bg-muted/30 p-2.5 rounded-xl border border-border/60">
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-2xs",
                                    p.clientAvatarColor ?? "bg-primary"
                                  )}>
                                    {getInitials(p.clientName)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-foreground truncate">{p.clientName}</p>
                                    {p.clientCompany && (
                                      <p className="text-[10px] text-muted-foreground truncate">{p.clientCompany}</p>
                                    )}
                                  </div>
                                </div>

                                {/* Financial Total Value */}
                                <div className="bg-primary/5 border border-primary/10 rounded-xl px-3 py-2 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Total Value</span>
                                  <span className="text-sm font-black text-primary">
                                    {p.currency} {Number(p.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>

                                {/* Dates & Validity Progress */}
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <i className="fa-solid fa-calendar-days text-[10px]" />
                                      {fmtDate(p.issueDate)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <i className="fa-solid fa-calendar-check text-[10px]" />
                                      {fmtDate(p.openTill)}
                                    </span>
                                  </div>

                                  {/* Validity Progress Bar */}
                                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        daysRemaining < 0 ? "bg-red-500" : daysRemaining <= 5 ? "bg-amber-500" : "bg-primary"
                                      )}
                                      style={{ width: `${daysRemaining < 0 ? 100 : elapsed}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Attachments indicator & Tags */}
                                <div className="flex items-center justify-between gap-1 pt-1 flex-wrap">
                                  {p.attachments && p.attachments.length > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-primary/10 text-primary border border-primary/20" title={`${p.attachments.length} attached file(s)`}>
                                      <i className="fa-solid fa-paperclip text-[9px]" />
                                      {p.attachments.length} {p.attachments.length === 1 ? "file" : "files"}
                                    </span>
                                  ) : <span />}
                                </div>
                              </div>

                              {/* Card Footer: Status Chip + Quick Actions */}
                              <div className="px-5 py-3 border-t border-border/60 bg-muted/10 flex items-center justify-between gap-2 relative" onClick={(e) => e.stopPropagation()}>
                                <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border", ss.bg, ss.text, ss.border)}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", ss.dot)} />
                                  {p.status}
                                </span>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setSendEmailProposal(p)}
                                    className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-sky-500 hover:text-sky-600 transition-all"
                                    title="Send Proposal via Email"
                                  >
                                    <i className="fa-solid fa-paper-plane text-[10px]" />
                                  </button>
                                  <button
                                    onClick={() => handleCopyPublicLink(p._id)}
                                    className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-primary hover:text-primary transition-all"
                                    title="Copy Public Client Link"
                                  >
                                    <i className="fa-solid fa-link text-[10px]" />
                                  </button>
                                  <button
                                    onClick={() => handleCloneProposal(p)}
                                    className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                                    title="Clone Proposal"
                                  >
                                    <i className="fa-solid fa-clone text-[10px]" />
                                  </button>
                                  <button
                                    onClick={() => setPreviewProposal(p)}
                                    className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                                    title="View Proposal Preview"
                                  >
                                    <i className="fa-solid fa-eye text-[10px]" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── LIST VIEW ── */}
                {proposalLayout === "list" && (
                  <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-0 bg-muted/50 px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                      <span className="col-span-2 sm:col-span-1">Code</span>
                      <span className="col-span-4 sm:col-span-3">Subject & Project</span>
                      <span className="col-span-3 sm:col-span-2">Client</span>
                      <span className="col-span-3 sm:col-span-2 text-right">Total Value</span>
                      <span className="hidden sm:block col-span-1 text-center">Status</span>
                      <span className="hidden sm:block col-span-1 text-center">Issue Date</span>
                      <span className="hidden sm:block col-span-1 text-center">Open Till</span>
                      <span className="col-span-1 text-right" />
                    </div>

                    {loadingProposals ? (
                      Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="px-4 py-3 border-b border-border/60 animate-pulse">
                          <div className="h-4 bg-muted rounded w-3/4" />
                        </div>
                      ))
                    ) : sortedProposals.length === 0 ? (
                      <div className="text-center py-14 text-muted-foreground">
                        <i className="fa-solid fa-file-circle-xmark text-3xl mb-2 opacity-30 text-primary" />
                        <p className="text-sm font-semibold">No proposals found</p>
                      </div>
                    ) : sortedProposals.map(p => {
                      const ss = statusStyles[p.status] ?? statusStyles.Draft;
                      const isMenuOpen = proposalActionMenu === p._id;
                      const daysRemaining = getDaysRemaining(p.openTill);
                      const isCopied = copiedProposalCode === p.proposalCode;

                      return (
                        <div
                          key={p._id}
                          onClick={() => setPreviewProposal(p)}
                          className="grid grid-cols-12 gap-0 items-center px-4 py-3 border-b border-border/60 hover:bg-muted/30 transition-colors group cursor-pointer"
                        >
                          <div className="col-span-2 sm:col-span-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleCopyProposalCode(p.proposalCode)}
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all flex items-center gap-1"
                              title="Click to copy code"
                            >
                              <i className={cn("fa-solid text-[8px]", isCopied ? "fa-check text-emerald-500" : "fa-copy")} />
                              #{p.proposalCode}
                            </button>
                          </div>

                          <div className="col-span-4 sm:col-span-3 pr-2">
                            <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{p.subject}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.projectName && <span className="text-[10px] text-muted-foreground truncate">{p.projectName}</span>}
                              {p.attachments && p.attachments.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 flex-shrink-0" title={`${p.attachments.length} attached file(s)`}>
                                  <i className="fa-solid fa-paperclip text-[8px]" /> {p.attachments.length}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 shadow-2xs", p.clientAvatarColor ?? "bg-primary")}>
                              {getInitials(p.clientName)}
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-medium text-foreground block truncate">{p.clientName}</span>
                              {p.clientCompany && <span className="text-[10px] text-muted-foreground block truncate">{p.clientCompany}</span>}
                            </div>
                          </div>

                          <div className="col-span-3 sm:col-span-2 text-right">
                            <span className="text-xs font-black text-foreground">{p.currency} {Number(p.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>

                          <div className="hidden sm:block col-span-1 text-center">
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border", ss.bg, ss.text, ss.border)}>
                              <span className={cn("w-1 h-1 rounded-full", ss.dot)} />
                              {p.status}
                            </span>
                          </div>

                          <div className="hidden sm:block col-span-1 text-center">
                            <span className="text-[10px] text-muted-foreground">{fmtDate(p.issueDate)}</span>
                          </div>

                          <div className="hidden sm:block col-span-1 text-center">
                            <div className="space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">{fmtDate(p.openTill)}</span>
                              {daysRemaining < 0 ? (
                                <span className="text-[9px] text-red-500 font-bold block">Expired</span>
                              ) : daysRemaining <= 5 ? (
                                <span className="text-[9px] text-amber-500 font-bold block">{daysRemaining}d left</span>
                              ) : null}
                            </div>
                          </div>

                          <div className="col-span-1 flex justify-end relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setProposalActionMenu(isMenuOpen ? null : p._id); }}
                              className="w-7 h-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                            >
                              <i className="fa-solid fa-ellipsis-vertical text-xs" />
                            </button>
                            {isMenuOpen && (
                              <div className="absolute right-0 top-8 z-50 w-56 bg-popover border border-border rounded-xl shadow-xl py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                                <button onClick={() => { setPreviewProposal(p); setProposalActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                  <i className="fa-solid fa-eye text-violet-500 w-4" /> View / Print Preview
                                </button>
                                <button onClick={() => { setSendEmailProposal(p); setProposalActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                  <i className="fa-solid fa-paper-plane text-sky-500 w-4" /> Send to Client Email
                                </button>
                                <button onClick={() => { handleCopyPublicLink(p._id); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                  <i className="fa-solid fa-link text-primary w-4" /> Share Client Portal Link
                                </button>
                                <button onClick={() => { setEditingProposal(p); setShowProposalModal(true); setProposalActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                  <i className="fa-solid fa-pen-to-square text-blue-500 w-4" /> Edit Proposal
                                </button>
                                <button onClick={() => { handleCloneProposal(p); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                  <i className="fa-solid fa-clone text-amber-500 w-4" /> Duplicate Proposal
                                </button>

                                {p.status === "Accepted" && (
                                  <>
                                    <div className="border-t border-border my-1" />
                                    <button onClick={() => handleConvertToInvoice(p)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition-colors text-left">
                                      <i className="fa-solid fa-file-invoice-dollar w-4" /> Convert to Invoice
                                    </button>
                                    <button onClick={() => handleConvertToProject(p)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 transition-colors text-left">
                                      <i className="fa-solid fa-diagram-project w-4" /> Convert to Project
                                    </button>
                                  </>
                                )}

                                <div className="border-t border-border my-1" />
                                {((["Accepted", "Sent", "Draft", "Declined"] as const).filter(s => s !== p.status)).map(s => (
                                  <button key={s} onClick={() => handleProposalStatusChange(p._id, s)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-muted text-foreground transition-colors text-left">
                                    <i className={cn("fa-solid w-4", s === "Accepted" ? "fa-circle-check text-emerald-500" : s === "Sent" ? "fa-paper-plane text-sky-500" : s === "Draft" ? "fa-file-pen text-slate-400" : "fa-circle-xmark text-red-500")} />
                                    Mark as {s}
                                  </button>
                                ))}
                                <div className="border-t border-border my-1" />
                                <button onClick={() => { setDeleteProposalTarget({ id: p._id, name: p.subject }); setProposalActionMenu(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-red-500/10 text-red-500 transition-colors text-left">
                                  <i className="fa-solid fa-trash w-4" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── Delete Confirmation Dialog ── */}
                {deleteProposalTarget && (
                  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteProposalTarget(null)} />
                    <div className="relative bg-background border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                          <i className="fa-solid fa-triangle-exclamation text-red-500" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">Delete Proposal</h3>
                          <p className="text-xs text-muted-foreground">This action cannot be undone</p>
                        </div>
                      </div>
                      <p className="text-xs text-foreground mb-5">
                        Are you sure you want to delete <span className="font-semibold">&ldquo;{deleteProposalTarget.name}&rdquo;</span>?
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setDeleteProposalTarget(null)}
                          className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteProposal}
                          disabled={isDeletingProposal}
                          className="px-4 py-2 text-xs font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all flex items-center gap-1.5 disabled:opacity-60"
                        >
                          {isDeletingProposal ? <><i className="fa-solid fa-spinner fa-spin" /> Deleting...</> : <><i className="fa-solid fa-trash" /> Delete</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── SUB-VIEW: DEALS DASHBOARD & ANALYTICS ── */}
          {leadsSubTab === "deals" && (
            <DealsDashboard
              deals={deals}
              loading={loadingDeals}
              leads={activeLeads}
              proposals={proposals}
              onNewDeal={handleNewDeal}
              onEditDeal={handleEditDeal}
              onDeleteDeal={(id, name) => setDeleteTarget({ type: "deal", id, name })}
              onRefresh={fetchDeals}
              onStageChange={handleDealStageChange}
              onGenerateInvoice={handleGenerateInvoiceFromDeal}
              initialStageFilter={dealStageNavFilter}
              onClearStageFilter={() => setDealStageNavFilter(undefined)}
              onViewLead={(clientAccount) => {
                setLeadSearch(clientAccount);
                setLeadStatusFilter("All");
                setLeadStageFilter("All");
                setLeadsSubTab("all");
              }}
              onNavigateToProposals={() => setLeadsSubTab("proposals")}
              onNavigateToLeads={() => setLeadsSubTab("all")}
              onConvertToProposal={(deal) => {
                setConvertingDealId(deal._id);
                setEditingProposal({
                  _id: "",
                  proposalCode: "",
                  subject: deal.dealName,
                  projectName: `${deal.clientAccount} Deal Project`,
                  clientName: deal.clientAccount,
                  clientCompany: deal.clientAccount,
                  clientEmail: "",
                  subtotal: deal.dealValue,
                  taxRate: 0,
                  taxAmount: 0,
                  totalValue: deal.dealValue,
                  currency: "USD",
                  issueDate: new Date().toISOString(),
                  openTill: deal.expectedClose || new Date(Date.now() + 30 * 86400000).toISOString(),
                  status: "Draft",
                  items: [{ description: deal.dealName, quantity: 1, unitPrice: deal.dealValue, amount: deal.dealValue }],
                  terms: "Standard professional services agreement. Pricing valid for 30 days.",
                });
                setShowProposalModal(true);
              }}
            />
          )}

          {/* ── SUB-VIEW: EXECUTIVE SALES DASHBOARD ── */}
          {leadsSubTab === "sales" && (
            <SalesExecutiveDashboard
              deals={deals}
              leads={activeLeads}
              proposalsCount={proposals.length}
              onRefresh={() => { fetchDeals(); fetchLeads(); }}
              onStageChange={handleDealStageChange}
              onGenerateInvoice={handleGenerateInvoiceFromDeal}
              onNavigateToLeads={(filterOwner) => {
                if (filterOwner) setLeadSearch(filterOwner);
                setLeadStatusFilter("All");
                setLeadStageFilter("All");
                setLeadsSubTab("all");
              }}
              onNavigateToDeals={(stageFilter) => {
                // Thread stage filter so DealsDashboard can pre-filter to the right stage
                setDealStageNavFilter(stageFilter);
                setLeadsSubTab("deals");
              }}
              onNavigateToProposals={() => setLeadsSubTab("proposals")}
              onOpenDealModal={(prefillOwner) => handleNewDeal(prefillOwner ? { owner: prefillOwner } : undefined)}
              onEditDeal={handleEditDeal}
              onOpenLead={handleOpenLead}
            />
          )}

          {/* ── SUB-VIEW 2: ALL LEADS (LIST & GRID) ── */}
          {leadsSubTab === "all" && (
            <div className="space-y-4">
              {/* ── All Leads Controls & View Switcher ── */}
              <div className="bg-card border border-border/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                {/* Left: Title + Count + Grid Hint */}
                <div className="flex items-center gap-2.5 shrink-0 whitespace-nowrap">
                  <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2 whitespace-nowrap">
                    <span>All Leads</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">
                      {filteredLeads.length}
                    </span>
                  </h2>
                  {leadsLayout === "grid" && (
                    <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline-flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-lg border border-border/50 whitespace-nowrap">
                      <i className="fa-solid fa-arrows-up-down-left-right text-[10px] text-primary" /> Drag cards to move
                    </span>
                  )}
                </div>

                {/* Right: Filters, Search & Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap xl:flex-nowrap justify-start xl:justify-end">
                  {/* Search */}
                  <div className="relative shrink-0">
                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
                    <input
                      value={leadSearch}
                      onChange={e => setLeadSearch(e.target.value)}
                      placeholder="Search leads..."
                      className="h-8 pl-7 pr-3 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36 sm:w-44"
                    />
                  </div>

                  {/* Status filter */}
                  <select
                    value={leadStatusFilter}
                    onChange={e => setLeadStatusFilter(e.target.value)}
                    className="h-8 px-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
                  >
                    {["All", "New", "Contacted", "Qualified", "Proposal", "Negotiation", "Closed", "Lost"].map(s => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
                  </select>

                  {/* Stage filter */}
                  <select
                    value={leadStageFilter}
                    onChange={e => setLeadStageFilter(e.target.value)}
                    className="h-8 px-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
                  >
                    {["All", "Inpipeline", "Follow Up", "Schedule Service", "Conversation"].map(s => <option key={s} value={s}>{s === "All" ? "All Stages" : s}</option>)}
                  </select>

                  {/* Lead Type filter */}
                  <select
                    value={leadTypeFilter}
                    onChange={e => setLeadTypeFilter(e.target.value)}
                    className="h-8 px-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
                  >
                    <option value="All">All Types</option>
                    <option value="External">External</option>
                    <option value="Internal">Internal</option>
                  </select>

                  {/* Sort by */}
                  <select
                    value={leadSortBy}
                    onChange={e => setLeadSortBy(e.target.value as any)}
                    className="h-8 px-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
                  >
                    <option value="newest">Sort: Default</option>
                    <option value="value_desc">Value: High → Low</option>
                    <option value="value_asc">Value: Low → High</option>
                    <option value="name">Name (A-Z)</option>
                  </select>

                  {/* Import CSV button */}
                  {(can("manageDeals") || isAdmin || isOPS) && (
                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      className="h-8 px-2.5 rounded-lg border border-border/70 bg-background hover:bg-muted/50 text-foreground flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      title="Import leads from CSV file"
                    >
                      <i className="fa-solid fa-file-import text-[11px] text-primary" />
                      <span className="hidden sm:inline">Import</span>
                    </button>
                  )}

                  {/* Export Options Dropdown */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowExportDropdown(p => !p)}
                      className="h-8 px-2.5 rounded-lg border border-border/70 bg-background hover:bg-muted/50 text-foreground flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                      title="Export leads options"
                    >
                      <i className="fa-solid fa-file-arrow-down text-[11px] text-primary" />
                      <span className="hidden sm:inline">Export</span>
                      <i className="fa-solid fa-chevron-down text-[8px] opacity-70 ml-0.5" />
                    </button>

                    {showExportDropdown && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setShowExportDropdown(false)} />
                        <div className="absolute right-0 top-full mt-1.5 w-56 bg-card border border-border rounded-xl shadow-xl z-30 py-1 text-xs animate-in fade-in zoom-in-95">
                          <button
                            type="button"
                            onClick={() => handleExportScope("filtered")}
                            className="w-full text-left px-3.5 py-2 hover:bg-muted/50 flex items-center gap-2 text-foreground font-medium cursor-pointer"
                          >
                            <i className="fa-solid fa-filter text-primary text-xs w-4" />
                            <span>Export Filtered ({filteredLeads.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportScope("all")}
                            className="w-full text-left px-3.5 py-2 hover:bg-muted/50 flex items-center gap-2 text-foreground font-medium cursor-pointer"
                          >
                            <i className="fa-solid fa-database text-blue-500 text-xs w-4" />
                            <span>Export All Leads ({activeLeads.length})</span>
                          </button>
                          {selectedLeadIds.size > 0 && (
                            <button
                              type="button"
                              onClick={() => handleExportScope("selected")}
                              className="w-full text-left px-3.5 py-2 hover:bg-muted/50 flex items-center gap-2 text-primary font-bold cursor-pointer bg-primary/5"
                            >
                              <i className="fa-solid fa-square-check text-xs w-4" />
                              <span>Export Selected ({selectedLeadIds.size})</span>
                            </button>
                          )}
                          <div className="border-t border-border/60 my-1" />
                          <button
                            type="button"
                            onClick={() => {
                              setShowExportDropdown(false);
                              const link = document.createElement("a");
                              link.href = "data:text/csv;charset=utf-8,Lead%20Name%2CCompany%2CDeal%20Value%2CCurrency%2CStatus%2CStage%2CLead%20Type%2CPhone%2CEmail%2CLocation%0A";
                              link.download = "leads_blank_template.csv";
                              link.click();
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-muted/50 flex items-center gap-2 text-muted-foreground cursor-pointer"
                          >
                            <i className="fa-solid fa-file-csv text-xs w-4" />
                            <span>Download Blank Template</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* View Switcher: List vs Grid */}
                  <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60 shrink-0">
                    <button
                      type="button"
                      onClick={() => setLeadsLayout("list")}
                      className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center text-xs transition-all cursor-pointer",
                        leadsLayout === "list"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="List View"
                    >
                      <i className="fa-solid fa-list" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeadsLayout("grid")}
                      className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center text-xs transition-all cursor-pointer",
                        leadsLayout === "grid"
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Grid View (Kanban)"
                    >
                      <i className="fa-solid fa-table-cells-large" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── 1. LIST VIEW ── */}
              {leadsLayout === "list" && (
                <div className="space-y-3">
                  {/* Sticky Bulk Selection Bar */}
                  {selectedLeadIds.size > 0 && (
                    <div className="bg-primary/10 border border-primary/30 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center font-mono">
                          {selectedLeadIds.size}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          leads selected
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedLeadIds(new Set())}
                          className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
                        >
                          Deselect all
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleBulkStatusChange("Contacted")}
                          className="h-7 px-2.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-phone text-[10px]" /> Set Contacted
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkStatusChange("Qualified")}
                          className="h-7 px-2.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-check text-[10px]" /> Set Qualified
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkStatusChange("Closed")}
                          className="h-7 px-2.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-circle-check text-[10px]" /> Set Closed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportScope("selected")}
                          className="h-7 px-2.5 rounded-md bg-background hover:bg-muted text-foreground border border-border text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-file-arrow-down text-[10px] text-primary" /> Export ({selectedLeadIds.size})
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="h-7 px-2.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <i className="fa-solid fa-trash-can text-[10px]" /> Delete
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/30">
                            <th className="w-10 py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0}
                                onChange={toggleSelectAll}
                                className="rounded border-border text-primary cursor-pointer accent-primary"
                                title="Select All"
                              />
                            </th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Lead Name</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Company</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Value</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Contact</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Location</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Stage</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Status</th>
                            <th className="text-left py-3 px-3 font-bold text-muted-foreground uppercase tracking-wide text-[11px]">Owner</th>
                            <th className="py-3 px-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {filteredLeads.length === 0 ? (
                            <tr><td colSpan={10} className="py-12 text-center text-muted-foreground text-sm">
                              <i className="fa-solid fa-user-tag text-2xl mb-2 block opacity-30" />
                              {leadSearch || leadStatusFilter !== "All" || leadStageFilter !== "All" ? "No leads match your filters." : "No leads yet. Create your first lead!"}
                            </td></tr>
                          ) : filteredLeads.map((lead, idx) => {
                            const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG["New"];
                            const colorIdx = lead.companyName.charCodeAt(0) % COMPANY_COLORS.length;
                            const initials = lead.companyName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
                            const stageColor: Record<Lead["stage"], string> = { "Inpipeline": "text-blue-600 dark:text-blue-400 bg-blue-500/10", "Follow Up": "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10", "Schedule Service": "text-amber-600 dark:text-amber-400 bg-amber-500/10", "Conversation": "text-rose-600 dark:text-rose-400 bg-rose-500/10" };
                            return (
                              <tr
                                key={lead._id || idx}
                                onClick={() => handleOpenLead(lead)}
                                className={cn(
                                  "transition-colors cursor-pointer group",
                                  selectedLeadIds.has(lead._id) ? "bg-primary/[0.05] hover:bg-primary/[0.08]" : "hover:bg-muted/30"
                                )}
                              >
                                <td className="w-10 py-3.5 px-3 text-center" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={selectedLeadIds.has(lead._id)}
                                    onChange={() => toggleSelectLead(lead._id)}
                                    className="rounded border-border text-primary cursor-pointer accent-primary"
                                  />
                                </td>
                                <td className="py-3.5 px-3 font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                                  <span>{lead.leadName}</span>
                                  <i className="fa-solid fa-arrow-up-right-from-square text-[9px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </td>
                                <td className="py-3.5 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[9px] shrink-0", COMPANY_COLORS[colorIdx])}>{initials}</div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-foreground font-medium">{lead.companyName}</span>
                                      <span className={cn(
                                        "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                                        lead.leadType === "Internal"
                                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                      )}>
                                        {lead.leadType || "External"}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 font-mono font-bold text-foreground">
                                  {formatCurrency(lead.value || 0, lead.currency)}
                                </td>
                                <td className="py-3.5 px-3">
                                  <div className="space-y-0.5">
                                    <p className="text-muted-foreground font-mono">{lead.phone || "—"}</p>
                                    {lead.email && <p className="text-[11px] text-muted-foreground/80 truncate max-w-[140px]">{lead.email}</p>}
                                  </div>
                                </td>
                                <td className="py-3.5 px-3 text-muted-foreground text-[11px]">
                                  {lead.location || "Remote"}
                                </td>
                                <td className="py-3.5 px-3"><span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold", stageColor[lead.stage])}>{lead.stage}</span></td>
                                <td className="py-3.5 px-3"><span className={cn("px-3 py-1 rounded-full text-[11px] font-bold", sc.cls)}>{sc.label}</span></td>
                                <td className="py-3.5 px-3 text-muted-foreground">{lead.owner || "—"}</td>
                                <td className="py-3.5 px-3">
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(can("manageDeals") || isAdmin || isOPS) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleConvertToDeal(lead); }}
                                        className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Convert to Sales Deal"
                                      >
                                        <i className="fa-solid fa-handshake text-[10px]" />
                                      </button>
                                    )}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleConvertToProposalFromLead(lead); }}
                                      className="w-7 h-7 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center justify-center transition-colors cursor-pointer"
                                      title="Create Client Proposal"
                                    >
                                      <i className="fa-solid fa-file-contract text-[10px]" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleEditLead(lead); }}
                                      className="w-7 h-7 rounded-lg border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
                                      title="Edit"
                                    >
                                      <i className="fa-solid fa-pen text-[10px]" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "lead", id: lead._id, name: lead.leadName }); }}
                                      className="w-7 h-7 rounded-lg border border-rose-200/50 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                      title="Delete"
                                    >
                                      <i className="fa-solid fa-trash-can text-[10px]" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 2. GRID / KANBAN BOARD VIEW (Design reference from dreamstechnologies) ── */}
              {leadsLayout === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-start">
                  {[
                    {
                      id: "contacted",
                      title: "Contacted",
                      color: "#F59E0B",
                      accentBorder: "border-t-4 border-t-[#F59E0B]",
                      avatarBg: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300",
                      status: "Contacted" as Lead["status"],
                      leads: filteredLeads.filter(l => l.status === "Contacted" || l.status === "Proposal" || l.status === "Negotiation"),
                    },
                    {
                      id: "not_contacted",
                      title: "Not Contacted",
                      color: "#06B6D4",
                      accentBorder: "border-t-4 border-t-[#06B6D4]",
                      avatarBg: "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300",
                      status: "New" as Lead["status"],
                      leads: filteredLeads.filter(l => l.status === "New" || l.status === "Qualified"),
                    },
                    {
                      id: "closed",
                      title: "Closed",
                      color: "#10B981",
                      accentBorder: "border-t-4 border-t-[#10B981]",
                      avatarBg: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300",
                      status: "Closed" as Lead["status"],
                      leads: filteredLeads.filter(l => l.status === "Closed"),
                    },
                    {
                      id: "lost",
                      title: "Lost",
                      color: "#EF4444",
                      accentBorder: "border-t-4 border-t-[#EF4444]",
                      avatarBg: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300",
                      status: "Lost" as Lead["status"],
                      leads: filteredLeads.filter(l => l.status === "Lost"),
                    },
                  ].map(col => {
                    const colSum = col.leads.reduce((s, l) => s + (Number(l.value) || 0), 0);
                    const isOver = dragOverColId === col.id;
                    return (
                      <div
                        key={col.id}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverColId !== col.id) setDragOverColId(col.id);
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            if (dragOverColId === col.id) setDragOverColId(null);
                          }
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOverColId(null);
                          setDraggedLeadId(null);
                          const leadId = e.dataTransfer.getData("nexace/lead-id") || draggedLeadId;
                          if (leadId) {
                            await handleDragDropStatus(leadId, col.status);
                          }
                        }}
                        className={cn(
                          "space-y-4 rounded-2xl transition-all duration-200 p-1 -m-1",
                          isOver && "bg-primary/[0.04] ring-2 ring-primary/40 shadow-inner"
                        )}
                      >
                        {/* Column Header Card */}
                        <div className={cn("bg-card border border-border/80 rounded-2xl p-4 shadow-2xs", col.accentBorder)}>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-extrabold text-foreground tracking-tight">{col.title}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                                {col.leads.length} Leads - <span className="font-mono font-semibold">{formatLeadsTotal(col.leads)}</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              {(can("manageDeals") || isAdmin || isOPS) && (
                                <button
                                  type="button"
                                  onClick={() => handleNewLead(col.status)}
                                  className="w-7 h-7 rounded-lg border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                  title={`Add Lead in ${col.title}`}
                                >
                                  <i className="fa-solid fa-plus text-[11px]" />
                                </button>
                              )}
                              <button
                                type="button"
                                className="w-7 h-7 rounded-lg border border-border/70 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                              >
                                <i className="fa-solid fa-ellipsis-vertical text-[11px]" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Column Cards Stack */}
                        <div className="space-y-3 min-h-[160px]">
                          {col.leads.length === 0 ? (
                            <div className={cn(
                              "border border-dashed rounded-2xl p-6 text-center text-xs transition-all duration-200 min-h-[140px] flex flex-col items-center justify-center gap-1.5",
                              isOver
                                ? "border-primary bg-primary/10 text-primary scale-[1.01]"
                                : "bg-card/40 border-border/80 text-muted-foreground"
                            )}>
                              <i className={cn("text-base mb-1", isOver ? "fa-solid fa-cloud-arrow-down fa-bounce text-primary" : "fa-solid fa-folder-open opacity-40")} />
                              <span className="font-semibold">{isOver ? `Drop lead here → ${col.title}` : `No leads in ${col.title}`}</span>
                              <span className="text-[10px] text-muted-foreground/70">{isOver ? "Release to update status" : "Drag a lead card here"}</span>
                            </div>
                          ) : (
                            col.leads.map((lead, idx) => {
                              const leadInitials = lead.leadName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "LD";
                              const companyInitials = lead.companyName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "CO";
                              const colorIdx = lead.companyName.charCodeAt(0) % COMPANY_COLORS.length;
                              const isBeingDragged = draggedLeadId === (lead._id || String(idx));
                              return (
                                <div
                                  key={lead._id || idx}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("nexace/lead-id", lead._id || String(idx));
                                    e.dataTransfer.effectAllowed = "move";
                                    setDraggedLeadId(lead._id || String(idx));
                                  }}
                                  onDragEnd={() => {
                                    setDraggedLeadId(null);
                                    setDragOverColId(null);
                                  }}
                                  onClick={() => handleOpenLead(lead)}
                                  className={cn(
                                    "bg-card border border-border/80 rounded-2xl p-4 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5 cursor-grab active:cursor-grabbing group space-y-3 relative select-none",
                                    isBeingDragged && "opacity-40 scale-[0.98] border-dashed border-primary"
                                  )}
                                >
                                  {/* Top accent colored line */}
                                  <div className="h-1 rounded-full w-full" style={{ backgroundColor: col.color }} />

                                  {/* Lead Header */}
                                  <div className="flex items-center justify-between gap-2 pt-0.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <i className="fa-solid fa-grip-vertical text-muted-foreground/30 group-hover:text-muted-foreground/80 text-[11px] cursor-grab active:cursor-grabbing shrink-0 transition-colors" title="Drag card to move column" />
                                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs", col.avatarBg)}>
                                        {leadInitials}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                          {lead.leadName}
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground truncate">{lead.companyName}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className={cn(
                                        "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                                        lead.leadType === "Internal"
                                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                      )}>
                                        {lead.leadType || "External"}
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted/30 text-muted-foreground shrink-0">
                                        {lead.stage}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Lead Body Fields */}
                                  <div className="space-y-1.5 pt-0.5 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2 font-mono font-bold text-foreground">
                                      <i className="fa-solid fa-money-bill-wave text-muted-foreground/70 w-4 text-center text-[11px]" />
                                      <span>{formatCurrency(lead.value || 0, lead.currency)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 truncate">
                                      <i className="fa-solid fa-envelope text-muted-foreground/70 w-4 text-center text-[11px]" />
                                      <span className="truncate">{lead.email || "—"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono">
                                      <i className="fa-solid fa-phone text-muted-foreground/70 w-4 text-center text-[11px]" />
                                      <span>{lead.phone || "—"}</span>
                                    </div>
                                    <div className="flex items-center gap-2 truncate">
                                      <i className="fa-solid fa-location-dot text-muted-foreground/70 w-4 text-center text-[11px]" />
                                      <span className="truncate">{lead.location || "Remote, Worldwide"}</span>
                                    </div>
                                  </div>

                                  {/* Lead Footer */}
                                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] min-w-0">
                                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0", COMPANY_COLORS[colorIdx])}>
                                        {companyInitials}
                                      </div>
                                      <span className="text-[11px] font-medium truncate max-w-[100px]">{lead.owner || "Unassigned"}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (lead.phone) {
                                            navigator.clipboard?.writeText(lead.phone);
                                            showToast(`Copied phone: ${lead.phone}`);
                                            window.open(`tel:${lead.phone}`, "_self");
                                          } else {
                                            showToast("No phone number available.", "error");
                                          }
                                        }}
                                        className="w-6 h-6 rounded-md hover:bg-muted/70 flex items-center justify-center transition-colors hover:text-foreground cursor-pointer"
                                        title={lead.phone ? `Call or Copy ${lead.phone}` : "No phone"}
                                      >
                                        <i className="fa-solid fa-phone text-[10px]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleOpenLead(lead); }}
                                        className="w-6 h-6 rounded-md hover:bg-muted/70 flex items-center justify-center transition-colors hover:text-foreground cursor-pointer"
                                        title="Activity & Notes"
                                      >
                                        <i className="fa-solid fa-comment text-[10px]" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); if (lead.email) window.open(`mailto:${lead.email}`, "_self"); }}
                                        className="w-6 h-6 rounded-md hover:bg-muted/70 flex items-center justify-center transition-colors hover:text-foreground cursor-pointer"
                                        title="Send Email"
                                      >
                                        <i className="fa-solid fa-envelope text-[10px]" />
                                      </button>
                                      {(can("manageDeals") || isAdmin || isOPS) && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleConvertToDeal(lead); }}
                                          className="w-6 h-6 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 flex items-center justify-center transition-colors cursor-pointer"
                                          title="Convert into Sales Deal"
                                        >
                                          <i className="fa-solid fa-handshake text-[10px]" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleConvertToProposalFromLead(lead); }}
                                        className="w-6 h-6 rounded-md hover:bg-violet-500/10 text-muted-foreground hover:text-violet-600 flex items-center justify-center transition-colors cursor-pointer"
                                        title="Create Client Proposal"
                                      >
                                        <i className="fa-solid fa-file-contract text-[10px]" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          {isOver && col.leads.length > 0 && (
                            <div className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-2xl py-3 text-center text-xs font-semibold text-primary animate-pulse">
                              <i className="fa-solid fa-arrow-down mr-1.5 text-[10px]" /> Drop to move to {col.title}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Lead Modal ── */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLeadModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2"><i className="fa-solid fa-user-tag text-primary" />{editingLead ? "Edit Lead" : "New Lead"}</h2>
              <button onClick={() => setShowLeadModal(false)} className="p-1.5 hover:bg-muted rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors"><i className="fa-solid fa-xmark text-sm" /></button>
            </div>
            <form onSubmit={handleSaveLead} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className={labelCls}>Lead Name <span className="text-rose-500">*</span></label><Input className={inputCls} value={leadFormData.leadName} onChange={e => setLeadFormData(p => ({ ...p, leadName: e.target.value }))} placeholder="e.g. Collins" required /></div>
                <div className="space-y-1"><label className={labelCls}>Company <span className="text-rose-500">*</span></label><Input className={inputCls} value={leadFormData.companyName} onChange={e => setLeadFormData(p => ({ ...p, companyName: e.target.value }))} placeholder="e.g. NovaWave LLC" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className={labelCls}>Phone</label><Input className={inputCls} value={leadFormData.phone} onChange={e => setLeadFormData(p => ({ ...p, phone: e.target.value }))} placeholder="+1 875455453" /></div>
                <div className="space-y-1"><label className={labelCls}>Email</label><Input type="email" className={inputCls} value={leadFormData.email} onChange={e => setLeadFormData(p => ({ ...p, email: e.target.value }))} placeholder="lead@company.com" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className={labelCls}>Status</label><select value={leadFormData.status} onChange={e => setLeadFormData(p => ({ ...p, status: e.target.value as Lead["status"] }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">{["New", "Contacted", "Qualified", "Proposal", "Negotiation", "Closed", "Lost"].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="space-y-1"><label className={labelCls}>Stage</label><select value={leadFormData.stage} onChange={e => setLeadFormData(p => ({ ...p, stage: e.target.value as Lead["stage"] }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">{["Inpipeline", "Follow Up", "Schedule Service", "Conversation"].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Lead Type <span className="text-rose-500">*</span></label>
                  <select
                    value={leadFormData.leadType}
                    onChange={e => setLeadFormData(p => ({ ...p, leadType: e.target.value as "Internal" | "External" }))}
                    className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="External">External</option>
                    <option value="Internal">Internal</option>
                  </select>
                </div>
                <div className="space-y-1"><label className={labelCls}>Source</label><Input className={inputCls} value={leadFormData.source} onChange={e => setLeadFormData(p => ({ ...p, source: e.target.value }))} placeholder="e.g. Website, Referral" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className={labelCls}>
                      Owner
                    </label>
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1 bg-muted/60 px-1.5 py-0.5 rounded">
                      <i className="fa-solid fa-lock text-[8px]" /> Non-editable
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      readOnly
                      className={cn(inputCls, "bg-muted/40 text-muted-foreground cursor-not-allowed font-medium pr-8 select-none focus-visible:ring-0")}
                      value={leadFormData.owner || currentUser?.name || "Unassigned"}
                      placeholder="Logged in user"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                      <i className="fa-solid fa-user-lock text-xs" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Deal Value &amp; Currency</label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={leadFormData.currency}
                      onChange={e => setLeadFormData(p => ({ ...p, currency: e.target.value }))}
                      className="w-24 h-9 rounded-md border border-input bg-background text-xs font-semibold px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shrink-0"
                    >
                      {CURRENCY_OPTIONS.map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="0"
                      className={cn(inputCls, "flex-1")}
                      value={leadFormData.value}
                      onChange={e => setLeadFormData(p => ({ ...p, value: e.target.value }))}
                      placeholder="e.g. 350000"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1"><label className={labelCls}>Location</label><Input className={inputCls} value={leadFormData.location} onChange={e => setLeadFormData(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Newyork, United States" /></div>
              <div className="space-y-1"><label className={labelCls}>Notes</label><textarea rows={2} className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" value={leadFormData.notes} onChange={e => setLeadFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Additional context..." /></div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowLeadModal(false)} disabled={leadSubmitting}>Cancel</Button>
                <Button type="submit" size="sm" disabled={leadSubmitting} className="gap-2 font-semibold cursor-pointer">
                  {leadSubmitting ? <><i className="fa-solid fa-spinner fa-spin text-xs" />Saving...</> : <><i className="fa-solid fa-floppy-disk text-xs" />{editingLead ? "Update Lead" : "Create Lead"}</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Deal Modal ── */}
      {showDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDealModal(false)}>
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2"><i className="fa-solid fa-handshake text-primary" />{editingDeal ? "Edit Sales Deal" : "New Sales Deal"}</h2>
              <button onClick={() => setShowDealModal(false)} className="p-1.5 hover:bg-muted rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors"><i className="fa-solid fa-xmark text-sm" /></button>
            </div>
            <form onSubmit={handleSaveDeal} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className={labelCls}>Client Account <span className="text-rose-500">*</span></label><Input className={inputCls} value={dealFormData.clientAccount} onChange={e => setDealFormData(p => ({ ...p, clientAccount: e.target.value }))} placeholder="e.g. Apex Digital Labs" required /></div>
                <div className="space-y-1"><label className={labelCls}>Deal Name <span className="text-rose-500">*</span></label><Input className={inputCls} value={dealFormData.dealName} onChange={e => setDealFormData(p => ({ ...p, dealName: e.target.value }))} placeholder="e.g. Enterprise Migration" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className={labelCls}>Deal Value ($)</label><Input type="number" min="0" className={inputCls} value={dealFormData.dealValue} onChange={e => setDealFormData(p => ({ ...p, dealValue: e.target.value }))} placeholder="0" /></div>
                <div className="space-y-1"><label className={labelCls}>Pipeline Stage</label><select value={dealFormData.stage} onChange={e => setDealFormData(p => ({ ...p, stage: e.target.value as SalesDeal["stage"] }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">{["Prospecting", "Discovery", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className={labelCls}>Win Probability ({dealFormData.probability}%)</label><input type="range" min="0" max="100" step="5" value={dealFormData.probability} onChange={e => setDealFormData(p => ({ ...p, probability: Number(e.target.value) }))} className="w-full cursor-pointer accent-primary" /></div>
                <div className="space-y-1"><label className={labelCls}>Expected Close</label><Input type="date" className={inputCls} value={dealFormData.expectedClose} onChange={e => setDealFormData(p => ({ ...p, expectedClose: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><label className={labelCls}>Deal Owner</label><Input className={inputCls} value={dealFormData.owner} onChange={e => setDealFormData(p => ({ ...p, owner: e.target.value }))} placeholder="e.g. Sara Khan" /></div>
                <div className="space-y-1"><label className={labelCls}>Venture</label><select value={dealFormData.venture} onChange={e => setDealFormData(p => ({ ...p, venture: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer">{["Ace Consultancys", "NexAce Tech"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
              </div>
              <div className="space-y-1"><label className={labelCls}>Notes</label><textarea rows={2} className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary" value={dealFormData.notes} onChange={e => setDealFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Key requirements, client context..." /></div>
              <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-border/60">
                {editingDeal && (dealFormData.stage === "Closed Won" || editingDeal.stage === "Closed Won") ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      handleGenerateInvoiceFromDeal(editingDeal);
                      setShowDealModal(false);
                    }}
                    className="gap-1.5 font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                  >
                    <i className="fa-solid fa-file-invoice-dollar text-xs" /> Generate Invoice
                  </Button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowDealModal(false)} disabled={dealSubmitting}>Cancel</Button>
                  <Button type="submit" size="sm" disabled={dealSubmitting} className="gap-2 font-semibold cursor-pointer">
                    {dealSubmitting ? <><i className="fa-solid fa-spinner fa-spin text-xs" />Saving...</> : <><i className="fa-solid fa-floppy-disk text-xs" />{editingDeal ? "Update Deal" : "Create Deal"}</>}
                  </Button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20"><i className="fa-solid fa-triangle-exclamation text-lg" /></div>
              <div className="space-y-1"><h3 className="text-base font-bold text-foreground">Delete {deleteTarget.type === "deal" ? "Deal" : "Lead"}</h3><p className="text-xs text-muted-foreground leading-relaxed">Are you sure you want to delete <strong className="text-foreground">{deleteTarget.name}</strong>? This cannot be undone.</p></div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
              <Button color="destructive" size="sm" onClick={handleDeleteConfirm} disabled={isDeleting} className="gap-2 font-semibold cursor-pointer">
                {isDeleting ? <><i className="fa-solid fa-spinner fa-spin text-xs" />Deleting...</> : <><i className="fa-solid fa-trash-can text-xs" />Confirm Delete</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lead Detail Panel Component ── */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onEdit={handleEditLead}
          onDelete={(lead) => setDeleteTarget({ type: "lead", id: lead._id, name: lead.leadName })}
          onStatusChange={handleStatusChange}
          onStageChange={handleStageChange}
          onConvertToDeal={handleConvertToDeal}
          onConvertToProposal={handleConvertToProposalFromLead}
          relatedDeals={deals.filter(d => 
            (d.clientAccount && selectedLead.companyName && d.clientAccount.toLowerCase() === selectedLead.companyName.toLowerCase()) ||
            (d.dealName && selectedLead.companyName && d.dealName.toLowerCase().includes(selectedLead.companyName.toLowerCase())) ||
            (d.clientAccount && selectedLead.leadName && d.clientAccount.toLowerCase().includes(selectedLead.leadName.toLowerCase()))
          )}
          relatedProposals={proposals.filter(p => 
            (p.clientCompany && selectedLead.companyName && p.clientCompany.toLowerCase() === selectedLead.companyName.toLowerCase()) ||
            (p.clientName && selectedLead.leadName && p.clientName.toLowerCase() === selectedLead.leadName.toLowerCase())
          )}
          onOpenDeal={(dealId) => {
            const d = deals.find(x => x._id === dealId);
            if (d) handleEditDeal(d);
            setSelectedLead(null);
          }}
          onOpenProposal={(proposalId) => {
            const p = proposals.find(x => x._id === proposalId);
            if (p) setPreviewProposal(p);
            setSelectedLead(null);
          }}
        />
      )}

      {/* ── Lead Bulk Import Modal ── */}
      <LeadImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={async () => {
          await fetchLeads();
          showToast("Leads imported successfully!");
        }}
      />

      {/* ── Proposal Add / Edit Modal ── */}
      <ProposalModal
        isOpen={showProposalModal}
        onClose={() => { setShowProposalModal(false); setEditingProposal(null); }}
        onSubmit={handleCreateProposal}
        isEditing={Boolean(editingProposal && editingProposal._id && editingProposal._id.trim() !== "")}
        isSubmitting={proposalSubmitting}

        leads={leads.map(l => ({ _id: l._id, leadName: l.leadName, companyName: l.companyName, email: l.email, value: Number(l.value) || 0, currency: l.currency }))}
        initialData={editingProposal ? {
          subject: editingProposal.subject,
          projectName: editingProposal.projectName ?? "",
          clientName: editingProposal.clientName,
          clientEmail: editingProposal.clientEmail ?? "",
          clientCompany: editingProposal.clientCompany ?? "",
          currency: editingProposal.currency,
          issueDate: editingProposal.issueDate ? new Date(editingProposal.issueDate).toISOString().split("T")[0] : "",
          openTill: editingProposal.openTill ? new Date(editingProposal.openTill).toISOString().split("T")[0] : "",
          status: editingProposal.status,
          taxRate: String(editingProposal.taxRate ?? 0),
          description: editingProposal.description ?? "",
          terms: editingProposal.terms ?? "",
          tags: (editingProposal.tags ?? []).join(", "),
          items: (editingProposal.items ?? []).map(i => ({
            description: i.description,
            quantity: String(i.quantity),
            unitPrice: String(i.unitPrice),
            amount: i.amount,
          })),
          attachments: editingProposal.attachments || [],
        } : undefined}
      />

      {/* ── Proposal Preview Modal ── */}
      <ProposalPreviewModal
        isOpen={!!previewProposal}
        proposal={previewProposal as ProposalPreviewData | null}
        onClose={() => setPreviewProposal(null)}
        onStatusChange={handleProposalStatusChange}
        onSendEmailClick={(p) => {
          const found = proposals.find((pr) => pr._id === p._id);
          if (found) setSendEmailProposal(found);
        }}
        onConvertToInvoice={(p) => {
          const found = proposals.find((pr) => pr._id === p._id);
          if (found) handleConvertToInvoice(found);
        }}
        onConvertToProject={(p) => {
          const found = proposals.find((pr) => pr._id === p._id);
          if (found) handleConvertToProject(found);
        }}
        onEdit={(p) => {
          const found = proposals.find((pr) => pr._id === p._id);
          if (found) {
            setEditingProposal(found);
            setShowProposalModal(true);
          }
        }}
      />

      {/* ── Send Proposal Email Modal ── */}
      <SendProposalModal
        isOpen={!!sendEmailProposal}
        proposal={sendEmailProposal}
        onClose={() => setSendEmailProposal(null)}
        onSuccess={async () => {
          await fetchProposals();
          showToast("Proposal email sent successfully!");
        }}
      />
    </div>
  );
}
