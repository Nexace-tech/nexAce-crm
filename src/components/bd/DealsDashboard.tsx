"use client";

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";
import type { Lead } from "@/components/bd/LeadDetailPanel";

export interface DealsDashboardProps {
  deals: SalesDeal[];
  loading?: boolean;
  onNewDeal: () => void;
  onEditDeal: (deal: SalesDeal) => void;
  onDeleteDeal: (dealId: string, dealName: string) => void;
  onRefresh?: () => void;
  onStageChange?: (dealId: string, newStage: SalesDeal["stage"], notes?: string) => void;
  onConvertToProposal?: (deal: SalesDeal) => void;
  onGenerateInvoice?: (deal: SalesDeal) => void;
  onViewLead?: (clientAccount: string) => void;
  onNavigateToProposals?: () => void;
  onNavigateToLeads?: () => void;
  initialStageFilter?: string;
  onClearStageFilter?: () => void;
  leads?: Lead[];
  proposals?: Array<{
    _id: string;
    proposalCode: string;
    subject: string;
    clientCompany?: string;
    clientName?: string;
    totalValue: number;
    status: string;
  }>;
}

export const STAGE_ORDER: SalesDeal["stage"][] = [
  "Prospecting",
  "Discovery",
  "Proposal Sent",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
];

// Color and stage config
export const STAGE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; text: string; dot: string; icon: string }
> = {
  "Qualify To Buy": {
    label: "Qualify To Buy",
    color: "#06b6d4",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
    icon: "fa-filter-circle-dollar",
  },
  "Contact Made": {
    label: "Contact Made",
    color: "#3b82f6",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    icon: "fa-address-book",
  },
  Presentation: {
    label: "Presentation",
    color: "#f59e0b",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: "fa-chalkboard-user",
  },
  "Proposal Made": {
    label: "Proposal Made",
    color: "#8b5cf6",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-500",
    icon: "fa-file-signature",
  },
  Appointment: {
    label: "Appointment",
    color: "#10b981",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    icon: "fa-calendar-check",
  },
  // Backend fallback mappings
  Prospecting: {
    label: "Qualify To Buy",
    color: "#06b6d4",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    text: "text-cyan-600 dark:text-cyan-400",
    dot: "bg-cyan-500",
    icon: "fa-filter-circle-dollar",
  },
  Discovery: {
    label: "Contact Made",
    color: "#3b82f6",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
    icon: "fa-address-book",
  },
  "Proposal Sent": {
    label: "Presentation",
    color: "#f59e0b",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    icon: "fa-chalkboard-user",
  },
  Negotiation: {
    label: "Proposal Made",
    color: "#8b5cf6",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    dot: "bg-purple-500",
    icon: "fa-file-signature",
  },
  "Closed Won": {
    label: "Appointment",
    color: "#10b981",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    icon: "fa-calendar-check",
  },
  "Closed Lost": {
    label: "Lost",
    color: "#ef4444",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    dot: "bg-rose-500",
    icon: "fa-circle-xmark",
  },
};

// 5 default Kanban columns matching Dreams Technologies
const DREAMS_PIPELINE_STAGES = [
  { id: "qualify", title: "Qualify To Buy", backendStage: "Prospecting" as SalesDeal["stage"], dotColor: "bg-cyan-500" },
  { id: "contact", title: "Contact Made", backendStage: "Discovery" as SalesDeal["stage"], dotColor: "bg-blue-500" },
  { id: "presentation", title: "Presentation", backendStage: "Proposal Sent" as SalesDeal["stage"], dotColor: "bg-amber-500" },
  { id: "proposal", title: "Proposal Made", backendStage: "Negotiation" as SalesDeal["stage"], dotColor: "bg-purple-500" },
  { id: "appointment", title: "Appointment", backendStage: "Closed Won" as SalesDeal["stage"], dotColor: "bg-emerald-500" },
];

export interface UnifiedDeal {
  _id: string;
  dealName: string;
  clientAccount: string;
  dealValue: number;
  stage: SalesDeal["stage"];
  pipelineStage: string;
  probability: number;
  owner: string;
  email: string;
  phone: string;
  location: string;
  expectedClose: string;
  rating: number;
  tag: string;
  status: string;
  initials: string;
  badgeColor: string;
  avatarBg: string;
  rawDeal?: SalesDeal;
}

// Sample template deals directly from Dreams Technologies CRM
const DREAMS_DEMO_DEALS: UnifiedDeal[] = [
  // Qualify To Buy
  {
    _id: "demo-1",
    dealName: "Howell, Tremblay and Rath",
    clientAccount: "Howell Corp",
    dealValue: 350000,
    stage: "Prospecting" as SalesDeal["stage"],
    pipelineStage: "Qualify To Buy",
    probability: 85,
    owner: "Darlee Robertson",
    email: "darleeo@example.com",
    phone: "+1 12445-47878",
    location: "Newyork, United States",
    expectedClose: "10 Jan 2024",
    rating: 5,
    tag: "Promotion",
    status: "Open",
    initials: "HT",
    badgeColor: "bg-emerald-500 text-white",
    avatarBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    _id: "demo-2",
    dealName: "Robert, John and Carlos",
    clientAccount: "RJC Group",
    dealValue: 210000,
    stage: "Prospecting" as SalesDeal["stage"],
    pipelineStage: "Qualify To Buy",
    probability: 15,
    owner: "Sharon Roy",
    email: "sheron@example.com",
    phone: "+1 12445-47878",
    location: "Exeter, United States",
    expectedClose: "12 Jan 2024",
    rating: 4,
    tag: "Rated",
    status: "Open",
    initials: "RJ",
    badgeColor: "bg-amber-500 text-white",
    avatarBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  {
    _id: "demo-3",
    dealName: "Wendy, Star and David",
    clientAccount: "WSD Global",
    dealValue: 422000,
    stage: "Prospecting" as SalesDeal["stage"],
    pipelineStage: "Qualify To Buy",
    probability: 95,
    owner: "Vaughan Lewis",
    email: "vau@example.com",
    phone: "+1 12445-47878",
    location: "Phoenix, United States",
    expectedClose: "14 Jan 2024",
    rating: 5,
    tag: "Collab",
    status: "Open",
    initials: "WS",
    badgeColor: "bg-sky-500 text-white",
    avatarBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },

  // Contact Made
  {
    _id: "demo-4",
    dealName: "Byron, Roman and Bailey",
    clientAccount: "BRB Partners",
    dealValue: 245000,
    stage: "Discovery" as SalesDeal["stage"],
    pipelineStage: "Contact Made",
    probability: 47,
    owner: "Jessica Louise",
    email: "jessica13@example.com",
    phone: "+1 89351-90346",
    location: "Chester, United States",
    expectedClose: "06 Feb 2024",
    rating: 3,
    tag: "Calls",
    status: "Open",
    initials: "BR",
    badgeColor: "bg-rose-500 text-white",
    avatarBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  {
    _id: "demo-5",
    dealName: "Robert, John and Carlos",
    clientAccount: "RJC Systems",
    dealValue: 117000,
    stage: "Discovery" as SalesDeal["stage"],
    pipelineStage: "Contact Made",
    probability: 98,
    owner: "Carol Thomas",
    email: "caroltho3@example.com",
    phone: "+1 78982-09163",
    location: "Charlotte, United States",
    expectedClose: "15 Jan 2024",
    rating: 5,
    tag: "Promotion",
    status: "Won",
    initials: "RJ",
    badgeColor: "bg-emerald-500 text-white",
    avatarBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    _id: "demo-6",
    dealName: "Irene, Charles and Wilston",
    clientAccount: "ICW Holdings",
    dealValue: 212000,
    stage: "Discovery" as SalesDeal["stage"],
    pipelineStage: "Contact Made",
    probability: 95,
    owner: "Dawn Mercha",
    email: "dawnmercha@example.com",
    phone: "+1 27691-89246",
    location: "Bristol, United States",
    expectedClose: "25 Jan 2024",
    rating: 4,
    tag: "Rated",
    status: "Open",
    initials: "IC",
    badgeColor: "bg-rose-500 text-white",
    avatarBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },

  // Presentation
  {
    _id: "demo-7",
    dealName: "Jody, Powell and Cecil",
    clientAccount: "JPC Network",
    dealValue: 184043,
    stage: "Proposal Sent" as SalesDeal["stage"],
    pipelineStage: "Presentation",
    probability: 25,
    owner: "Rachel Hampton",
    email: "rachel@example.com",
    phone: "+1 17839-93617",
    location: "Baltimore, United States",
    expectedClose: "18 Mar 2024",
    rating: 4,
    tag: "Calls",
    status: "Open",
    initials: "HT",
    badgeColor: "bg-sky-500 text-white",
    avatarBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  {
    _id: "demo-8",
    dealName: "Bonnie, Linda and Mullin",
    clientAccount: "BLM Enterprises",
    dealValue: 935189,
    stage: "Proposal Sent" as SalesDeal["stage"],
    pipelineStage: "Presentation",
    probability: 70,
    owner: "Jonelle Curtiss",
    email: "jonelle@example.com",
    phone: "+1 16739-47193",
    location: "Coventry, United States",
    expectedClose: "15 Feb 2024",
    rating: 5,
    tag: "Promotion",
    status: "Open",
    initials: "BL",
    badgeColor: "bg-rose-500 text-white",
    avatarBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  {
    _id: "demo-9",
    dealName: "Carlos, Jones and Jim",
    clientAccount: "CJJ Studio",
    dealValue: 427940,
    stage: "Proposal Sent" as SalesDeal["stage"],
    pipelineStage: "Presentation",
    probability: 45,
    owner: "Jonathan Smith",
    email: "jonathan@example.com",
    phone: "+1 18390-37153",
    location: "Seattle",
    expectedClose: "30 Jan 2024",
    rating: 3,
    tag: "Collab",
    status: "Open",
    initials: "CJ",
    badgeColor: "bg-emerald-500 text-white",
    avatarBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },

  // Proposal Made
  {
    _id: "demo-10",
    dealName: "Freda, Jennifer and Thompson",
    clientAccount: "FJT Media",
    dealValue: 417593,
    stage: "Negotiation" as SalesDeal["stage"],
    pipelineStage: "Proposal Made",
    probability: 59,
    owner: "Sidney Franks",
    email: "sidney@example.com",
    phone: "+1 11739-38135",
    location: "London, United States",
    expectedClose: "11 Apr 2024",
    rating: 4,
    tag: "Rated",
    status: "Open",
    initials: "FJ",
    badgeColor: "bg-sky-500 text-white",
    avatarBg: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  },
  {
    _id: "demo-11",
    dealName: "Bruce, Faulkner and Lela",
    clientAccount: "BFL Corp",
    dealValue: 881389,
    stage: "Negotiation" as SalesDeal["stage"],
    pipelineStage: "Proposal Made",
    probability: 72,
    owner: "Brook Carter",
    email: "brook@example.com",
    phone: "+1 19302-91043",
    location: "Detroit, United States",
    expectedClose: "17 Apr 2024",
    rating: 5,
    tag: "Promotion",
    status: "Open",
    initials: "BF",
    badgeColor: "bg-rose-500 text-white",
    avatarBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },
  {
    _id: "demo-12",
    dealName: "Lawrence, Patrick and Vandorn",
    clientAccount: "LPV logistics",
    dealValue: 927193,
    stage: "Negotiation" as SalesDeal["stage"],
    pipelineStage: "Proposal Made",
    probability: 20,
    owner: "Mickey",
    email: "mickey@example.com",
    phone: "+1 17280-92016",
    location: "Manchester, United States",
    expectedClose: "10 Feb 2024",
    rating: 2,
    tag: "Rejected",
    status: "Lost",
    initials: "LP",
    badgeColor: "bg-rose-500 text-white",
    avatarBg: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  },

  // Appointment (Closed Won)
  {
    _id: "demo-13",
    dealName: "Howell, Tremblay and Rath",
    clientAccount: "Howell Group Inc",
    dealValue: 417593,
    stage: "Closed Won" as SalesDeal["stage"],
    pipelineStage: "Appointment",
    probability: 100,
    owner: "Sidney Franks",
    email: "sidney@example.com",
    phone: "+1 11739-38135",
    location: "London, United States",
    expectedClose: "11 Apr 2024",
    rating: 5,
    tag: "Promotion",
    status: "Won",
    initials: "HT",
    badgeColor: "bg-emerald-500 text-white",
    avatarBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
];

// Helper to format currency
const formatUSD = (val: number | string) => {
  const num = typeof val === "string" ? parseFloat(val.replace(/[^0-9.-]+/g, "")) || 0 : Number(val) || 0;
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(num)}`;
};

export default function DealsDashboard({
  deals,
  loading = false,
  onNewDeal,
  onEditDeal,
  onDeleteDeal,
  onRefresh,
  onConvertToProposal,
  onGenerateInvoice,
  onViewLead,
  onNavigateToProposals,
  onNavigateToLeads,
  onStageChange,
  initialStageFilter,
  onClearStageFilter,
  leads = [],
  proposals = [],
}: DealsDashboardProps) {
  // View mode switcher: "grid" (Kanban) or "list" (Table)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Accordion active sections inside Filter Popover
  const [activeAccordion, setActiveAccordion] = useState<string | null>("dealsName");
  const [selectedDealsFilter, setSelectedDealsFilter] = useState<string[]>([]);
  const [selectedOwnersFilter, setSelectedOwnersFilter] = useState<string[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string[]>([]);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number[]>([]);
  const [selectedTagsFilter, setSelectedTagsFilter] = useState<string[]>([]);

  // Drag & Drop State
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Add Deal Modal Drawer State
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [newDealForm, setNewDealForm] = useState({
    dealName: "",
    pipeline: "Sales Pipeline",
    stage: "Qualify To Buy",
    dealValue: "",
    currency: "USD",
    period: "Monthly",
    periodValue: "1",
    clientAccount: "",
    project: "",
    dueDate: "",
    expectedClose: "",
    owner: "",
    followUpDate: "",
    source: "Direct",
    tag: "Promotion",
    priority: "High",
    description: "",
  });

  // Action Menu state for deal card
  const [activeMenuDealId, setActiveMenuDealId] = useState<string | null>(null);
  const [starredDeals, setStarredDeals] = useState<Record<string, boolean>>({});

  // Merge provided deals with demo cards if database has few or none, so the page is identically populated
  const allUnifiedDeals: UnifiedDeal[] = useMemo(() => {
    // Map real deals to match display shape
    const realMapped: UnifiedDeal[] = (deals || []).map((d) => {
      // derive pipelineStage
      let pStage = "Qualify To Buy";
      if (d.stage === "Discovery") pStage = "Contact Made";
      else if (d.stage === "Proposal Sent") pStage = "Presentation";
      else if (d.stage === "Negotiation") pStage = "Proposal Made";
      else if (d.stage === "Closed Won") pStage = "Appointment";
      else if (d.stage === "Closed Lost") pStage = "Qualify To Buy";

      const words = (d.dealName || d.clientAccount || "Deal").trim().split(" ");
      const initials = words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0].slice(0, 2).toUpperCase();

      return {
        _id: d._id,
        dealName: d.dealName || "Untitled Deal",
        clientAccount: d.clientAccount || "Enterprise Account",
        dealValue: Number(d.dealValue) || 150000,
        stage: d.stage || "Prospecting",
        pipelineStage: pStage,
        probability: d.probability ?? 75,
        owner: d.owner || "Sales Executive",
        email: `${(d.clientAccount || "client").toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
        phone: "+1 12445-47878",
        location: (d as any).location || "United States",
        expectedClose: d.expectedClose ? new Date(d.expectedClose).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "14 Jan 2024",
        rating: 5,
        tag: "Promotion",
        status: d.stage === "Closed Won" ? "Won" : d.stage === "Closed Lost" ? "Lost" : "Open",
        initials,
        badgeColor: d.stage === "Closed Won" ? "bg-emerald-500 text-white" : (d.probability ?? 70) > 60 ? "bg-emerald-500 text-white" : "bg-amber-500 text-white",
        avatarBg: "bg-primary/10 text-primary",
        rawDeal: d,
      };
    });

    if (realMapped.length > 0) {
      // If we have real deals, supplement with template deals if real deals are under 5
      if (realMapped.length >= 10) {
        return realMapped;
      }
      return [...realMapped, ...DREAMS_DEMO_DEALS.slice(realMapped.length)];
    }

    return DREAMS_DEMO_DEALS;
  }, [deals]);

  // Filtered deals
  const filteredDeals = useMemo(() => {
    return allUnifiedDeals.filter((d) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          d.dealName.toLowerCase().includes(q) ||
          d.clientAccount.toLowerCase().includes(q) ||
          d.owner.toLowerCase().includes(q) ||
          d.email.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Filter: Deals Name
      if (selectedDealsFilter.length > 0) {
        if (!selectedDealsFilter.includes(d.dealName)) return false;
      }

      // Filter: Owner
      if (selectedOwnersFilter.length > 0) {
        if (!selectedOwnersFilter.includes(d.owner)) return false;
      }

      // Filter: Status
      if (selectedStatusFilter.length > 0) {
        if (!selectedStatusFilter.includes(d.status)) return false;
      }

      // Filter: Rating
      if (selectedRatingFilter.length > 0) {
        if (!selectedRatingFilter.includes(d.rating)) return false;
      }

      // Filter: Tags
      if (selectedTagsFilter.length > 0) {
        if (!selectedTagsFilter.includes(d.tag)) return false;
      }

      return true;
    });
  }, [
    allUnifiedDeals,
    searchQuery,
    selectedDealsFilter,
    selectedOwnersFilter,
    selectedStatusFilter,
    selectedRatingFilter,
    selectedTagsFilter,
  ]);

  // Stage aggregations
  const stageColumns = useMemo(() => {
    return DREAMS_PIPELINE_STAGES.map((st) => {
      const dealsInStage = filteredDeals.filter(
        (d) => d.pipelineStage === st.title || d.stage === st.backendStage
      );
      const totalVal = dealsInStage.reduce((sum, d) => sum + (d.dealValue || 0), 0);
      return {
        ...st,
        deals: dealsInStage,
        count: dealsInStage.length,
        totalValue: totalVal,
        totalValueFormatted: formatUSD(totalVal),
      };
    });
  }, [filteredDeals]);

  // Quick export action
  const handleExport = (type: "pdf" | "excel") => {
    setExportDropdownOpen(false);
    const headers = ["Deal Name", "Client", "Amount", "Stage", "Owner", "Probability", "Status", "Close Date"];
    const rows = filteredDeals.map((d) => [
      `"${d.dealName}"`,
      `"${d.clientAccount}"`,
      d.dealValue,
      `"${d.pipelineStage}"`,
      `"${d.owner}"`,
      `"${d.probability}%"`,
      `"${d.status}"`,
      `"${d.expectedClose}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Deals_${type.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag & Drop Handler
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/plain", dealId);
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageTitle: string) => {
    e.preventDefault();
    setDragOverStage(stageTitle);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: typeof DREAMS_PIPELINE_STAGES[0]) => {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData("text/plain") || draggedDealId;
    if (!dealId) return;

    // Find deal
    const deal = allUnifiedDeals.find((d) => d._id === dealId);
    if (deal) {
      // Trigger prop update
      if (deal.rawDeal && onStageChange) {
        onStageChange(deal._id, targetStage.backendStage);
      } else {
        deal.pipelineStage = targetStage.title;
        deal.stage = targetStage.backendStage;
      }
    }
    setDraggedDealId(null);
  };

  // Toggle Star / Bookmark
  const toggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredDeals((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Add Deal Modal
  const handleOpenAddModal = () => {
    setModalMode("add");
    setNewDealForm({
      dealName: "",
      pipeline: "Sales Pipeline",
      stage: "Qualify To Buy",
      dealValue: "",
      currency: "USD",
      period: "Monthly",
      periodValue: "1",
      clientAccount: "",
      project: "",
      dueDate: "",
      expectedClose: "",
      owner: "",
      followUpDate: "",
      source: "Direct",
      tag: "Promotion",
      priority: "High",
      description: "",
    });
    setShowAddDealModal(true);
  };

  // Handle Save Deal
  const handleSaveDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealForm.dealName.trim()) return;

    // Call onNewDeal callback if available
    onNewDeal();
    setShowAddDealModal(false);
  };

  return (
    <div className="space-y-4 font-sans text-slate-800 dark:text-slate-100">
      {/* ── 1. Page Header (Exact Dreams Technologies Layout) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center">
              Deals
              <span className="ml-2.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
                {filteredDeals.length}
              </span>
            </h1>
          </div>
          <nav aria-label="breadcrumb" className="mt-1">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateToLeads?.()}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li className="text-muted-foreground/60">/</li>
              <li className="text-foreground font-bold">Deals</li>
            </ol>
          </nav>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2 flex-wrap relative">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border border-border/80 bg-card hover:bg-muted/60 text-foreground transition-all shadow-xs cursor-pointer"
            >
              <i className="fa-solid fa-file-export text-primary text-xs" />
              <span>Export</span>
              <i className="fa-solid fa-chevron-down text-[10px] text-muted-foreground ml-1" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-card border border-border shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => handleExport("pdf")}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-2.5 cursor-pointer"
                >
                  <i className="fa-solid fa-file-pdf text-rose-500" />
                  <span>Export as PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("excel")}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-2.5 cursor-pointer"
                >
                  <i className="fa-solid fa-file-excel text-emerald-600" />
                  <span>Export as Excel</span>
                </button>
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => onRefresh?.()}
            className="w-9 h-9 rounded-xl border border-border/80 bg-card hover:bg-muted/60 text-foreground flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Refresh Deals"
          >
            <i className={cn("fa-solid fa-arrows-rotate text-xs", loading && "fa-spin text-primary")} />
          </button>

          {/* Collapse Header toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-9 h-9 rounded-xl border border-border/80 bg-card hover:bg-muted/60 text-foreground flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title="Collapse / Expand"
          >
            <i className={cn("fa-solid text-xs transition-transform duration-200", isCollapsed ? "fa-chevron-down" : "fa-chevron-up")} />
          </button>
        </div>
      </div>

      {/* ── 2. Control & Filter Toolbar (Exact Dreams Technologies Layout) ── */}
      {!isCollapsed && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 bg-card/80 backdrop-blur-md rounded-2xl border border-border/80 shadow-xs">
          {/* Left Controls: Filter Popover + Search Keyword Input */}
          <div className="flex items-center gap-2 flex-wrap relative">
            {/* Filter Dropdown Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs",
                  filterDropdownOpen || selectedDealsFilter.length > 0 || selectedOwnersFilter.length > 0
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/80 hover:bg-muted/60 text-foreground"
                )}
              >
                <i className="fa-solid fa-filter text-xs" />
                <span>Filter</span>
                {(selectedDealsFilter.length + selectedOwnersFilter.length + selectedStatusFilter.length) > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary-foreground text-primary text-[10px] font-black flex items-center justify-center">
                    {selectedDealsFilter.length + selectedOwnersFilter.length + selectedStatusFilter.length}
                  </span>
                )}
                <i className="fa-solid fa-chevron-down text-[10px] ml-1 opacity-70" />
              </button>

              {/* Filter Dropdown Modal / Popover */}
              {filterDropdownOpen && (
                <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl p-0 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Filter Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
                    <h6 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                      <i className="fa-solid fa-filter text-primary text-xs" />
                      Filter Deals
                    </h6>
                    <button
                      type="button"
                      onClick={() => setFilterDropdownOpen(false)}
                      className="w-6 h-6 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center cursor-pointer"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  </div>

                  {/* Filter Content Accordion */}
                  <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
                    {/* Deals Name Section */}
                    <div className="rounded-xl border border-border/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setActiveAccordion(activeAccordion === "dealsName" ? null : "dealsName")}
                        className="w-full px-3 py-2.5 text-left text-xs font-bold text-foreground bg-muted/20 flex items-center justify-between cursor-pointer"
                      >
                        <span>Deals Name</span>
                        <i className={cn("fa-solid fa-chevron-down text-[10px] text-muted-foreground transition-transform", activeAccordion === "dealsName" && "rotate-180")} />
                      </button>
                      {activeAccordion === "dealsName" && (
                        <div className="p-2.5 bg-card space-y-2 border-t border-border/50 text-xs">
                          <div className="relative">
                            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]" />
                            <input
                              type="text"
                              placeholder="Search deal name..."
                              className="w-full pl-7 pr-2.5 py-1.5 text-xs rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
                            {["Howell, Tremblay and Rath", "Robert, John and Carlos", "Wendy, Star and David", "Byron, Roman and Bailey", "Carlos, Jones and Jim"].map((name) => {
                              const checked = selectedDealsFilter.includes(name);
                              return (
                                <label key={name} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/40 p-1 rounded-md">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedDealsFilter(prev => checked ? prev.filter(x => x !== name) : [...prev, name]);
                                    }}
                                    className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                                  />
                                  <span className="truncate">{name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Owner Section */}
                    <div className="rounded-xl border border-border/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setActiveAccordion(activeAccordion === "owner" ? null : "owner")}
                        className="w-full px-3 py-2.5 text-left text-xs font-bold text-foreground bg-muted/20 flex items-center justify-between cursor-pointer"
                      >
                        <span>Owner</span>
                        <i className={cn("fa-solid fa-chevron-down text-[10px] text-muted-foreground transition-transform", activeAccordion === "owner" && "rotate-180")} />
                      </button>
                      {activeAccordion === "owner" && (
                        <div className="p-2.5 bg-card space-y-2 border-t border-border/50 text-xs">
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {["Darlee Robertson", "Sharon Roy", "Vaughan Lewis", "Jessica Louise", "Carol Thomas", "Jonathan Smith"].map((rep) => {
                              const checked = selectedOwnersFilter.includes(rep);
                              return (
                                <label key={rep} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/40 p-1 rounded-md">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedOwnersFilter(prev => checked ? prev.filter(x => x !== rep) : [...prev, rep]);
                                    }}
                                    className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                                  />
                                  <span>{rep}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Status Section */}
                    <div className="rounded-xl border border-border/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setActiveAccordion(activeAccordion === "status" ? null : "status")}
                        className="w-full px-3 py-2.5 text-left text-xs font-bold text-foreground bg-muted/20 flex items-center justify-between cursor-pointer"
                      >
                        <span>Status</span>
                        <i className={cn("fa-solid fa-chevron-down text-[10px] text-muted-foreground transition-transform", activeAccordion === "status" && "rotate-180")} />
                      </button>
                      {activeAccordion === "status" && (
                        <div className="p-2.5 bg-card space-y-1.5 border-t border-border/50 text-xs">
                          {["Won", "Open", "Lost"].map((st) => {
                            const checked = selectedStatusFilter.includes(st);
                            return (
                              <label key={st} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/40 p-1 rounded-md">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setSelectedStatusFilter(prev => checked ? prev.filter(x => x !== st) : [...prev, st]);
                                  }}
                                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span>{st}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Rating Section */}
                    <div className="rounded-xl border border-border/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setActiveAccordion(activeAccordion === "rating" ? null : "rating")}
                        className="w-full px-3 py-2.5 text-left text-xs font-bold text-foreground bg-muted/20 flex items-center justify-between cursor-pointer"
                      >
                        <span>Rating</span>
                        <i className={cn("fa-solid fa-chevron-down text-[10px] text-muted-foreground transition-transform", activeAccordion === "rating" && "rotate-180")} />
                      </button>
                      {activeAccordion === "rating" && (
                        <div className="p-2.5 bg-card space-y-1.5 border-t border-border/50 text-xs">
                          {[5, 4, 3, 2, 1].map((r) => {
                            const checked = selectedRatingFilter.includes(r);
                            return (
                              <label key={r} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/40 p-1 rounded-md">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setSelectedRatingFilter(prev => checked ? prev.filter(x => x !== r) : [...prev, r]);
                                  }}
                                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span className="flex items-center text-amber-500 gap-0.5">
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <i key={idx} className={cn("fa-solid fa-star text-[10px]", idx < r ? "text-amber-400" : "text-slate-300 dark:text-slate-700")} />
                                  ))}
                                  <span className="text-foreground ml-1.5 text-xs font-bold">{r}.0</span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Tags Section */}
                    <div className="rounded-xl border border-border/60 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setActiveAccordion(activeAccordion === "tags" ? null : "tags")}
                        className="w-full px-3 py-2.5 text-left text-xs font-bold text-foreground bg-muted/20 flex items-center justify-between cursor-pointer"
                      >
                        <span>Tags</span>
                        <i className={cn("fa-solid fa-chevron-down text-[10px] text-muted-foreground transition-transform", activeAccordion === "tags" && "rotate-180")} />
                      </button>
                      {activeAccordion === "tags" && (
                        <div className="p-2.5 bg-card space-y-1.5 border-t border-border/50 text-xs">
                          {["Promotion", "Rated", "Rejected", "Collab", "Calls"].map((tag) => {
                            const checked = selectedTagsFilter.includes(tag);
                            return (
                              <label key={tag} className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:bg-muted/40 p-1 rounded-md">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setSelectedTagsFilter(prev => checked ? prev.filter(x => x !== tag) : [...prev, tag]);
                                  }}
                                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span>{tag}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filter Footer Buttons */}
                  <div className="p-3 bg-muted/30 border-t border-border/60 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDealsFilter([]);
                        setSelectedOwnersFilter([]);
                        setSelectedStatusFilter([]);
                        setSelectedRatingFilter([]);
                        setSelectedTagsFilter([]);
                      }}
                      className="w-1/2 py-2 text-xs font-bold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterDropdownOpen(false)}
                      className="w-1/2 py-2 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                    >
                      Apply Filter
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Keyword Search Input */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Keyword"
                className="h-9 pl-8 pr-3 text-xs rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-44 sm:w-60 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px]"
                >
                  <i className="fa-solid fa-circle-xmark" />
                </button>
              )}
            </div>
          </div>

          {/* Right Controls: View Switcher (List vs Grid) + Add Deal Button */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* View Switcher Icons: List vs Grid */}
            <div className="flex items-center p-1 rounded-xl border border-border/80 bg-card shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List View"
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <i className="fa-solid fa-list-ul" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Kanban Grid View"
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer ml-1",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
              >
                <i className="fa-solid fa-grip-vertical" />
              </button>
            </div>

            {/* Add Deal Primary Button */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <i className="fa-solid fa-square-plus text-xs" />
              <span>Add Deal</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Kanban Grid View (Exact Dreams Technologies /crm/deals Design) ── */}
      {viewMode === "grid" && (
        <div className="flex overflow-x-auto align-items-start gap-4 pb-6 pt-1 select-none">
          {stageColumns.map((col) => {
            const isDragOver = dragOverStage === col.title;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.title)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col)}
                className={cn(
                  "flex-shrink-0 w-[310px] rounded-2xl border p-2.5 transition-all duration-200 flex flex-col",
                  isDragOver
                    ? "bg-primary/5 border-primary ring-2 ring-primary/20 shadow-md"
                    : "bg-card/90 border-border/70 shadow-xs hover:border-border"
                )}
              >
                {/* Stage Header Card */}
                <div className="bg-card border border-border/80 rounded-xl p-3 shadow-2xs mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h6 className="text-sm font-extrabold text-foreground flex items-center gap-2 tracking-tight">
                        <span className={cn("w-2.5 h-2.5 rounded-full inline-block", col.dotColor)} />
                        <span>{col.title}</span>
                      </h6>
                      <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        <span className="font-bold text-foreground">{col.count} Leads</span>
                        <span className="mx-1">•</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{col.totalValueFormatted}</span>
                      </p>
                    </div>

                    {/* Column 3-dots Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuDealId(activeMenuDealId === col.id ? null : col.id)}
                        className="w-7 h-7 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        <i className="fa-solid fa-ellipsis-vertical text-xs" />
                      </button>

                      {activeMenuDealId === col.id && (
                        <div className="absolute right-0 mt-1 w-36 rounded-xl bg-card border border-border shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuDealId(null);
                              handleOpenAddModal();
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                          >
                            <i className="fa-solid fa-plus text-primary text-[11px]" />
                            <span>Add Deal</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveMenuDealId(null)}
                            className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                          >
                            <i className="fa-solid fa-pen-to-square text-amber-500 text-[11px]" />
                            <span>Edit Stage</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 min-h-[140px] flex-1">
                  {col.deals.map((deal) => {
                    const isStarred = starredDeals[deal._id];
                    const isDealMenuOpen = activeMenuDealId === deal._id;

                    return (
                      <div
                        key={deal._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal._id)}
                        className="card kanban-card bg-card border border-border/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all duration-200 cursor-grab active:cursor-grabbing group relative"
                      >
                        {/* Top: Initials Avatar + Title + Menu */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {/* Initials Badge */}
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-2xs", deal.avatarBg)}>
                              {deal.initials}
                            </div>
                            {/* Deal Title */}
                            <div className="min-w-0 flex-1">
                              <h6
                                onClick={() => {
                                  if (deal.rawDeal) onEditDeal(deal.rawDeal);
                                  else handleOpenAddModal();
                                }}
                                className="text-xs font-extrabold text-foreground truncate hover:text-primary transition-colors cursor-pointer"
                                title={deal.dealName}
                              >
                                {deal.dealName}
                              </h6>
                              <p className="text-[10px] text-muted-foreground truncate">{deal.clientAccount}</p>
                            </div>
                          </div>

                          {/* Quick 3-dots Menu */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuDealId(isDealMenuOpen ? null : deal._id);
                              }}
                              className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <i className="fa-solid fa-ellipsis text-xs" />
                            </button>

                            {isDealMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-44 rounded-xl bg-card border border-border shadow-2xl py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuDealId(null);
                                    if (deal.rawDeal) onEditDeal(deal.rawDeal);
                                    else handleOpenAddModal();
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                                >
                                  <i className="fa-solid fa-pen-to-square text-amber-500 text-xs" />
                                  <span>Edit Deal</span>
                                </button>
                                {onConvertToProposal && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuDealId(null);
                                      if (deal.rawDeal) onConvertToProposal(deal.rawDeal);
                                      else onNavigateToProposals?.();
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                                  >
                                    <i className="fa-solid fa-file-signature text-purple-500 text-xs" />
                                    <span>Convert to Proposal</span>
                                  </button>
                                )}
                                {onGenerateInvoice && deal.rawDeal && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuDealId(null);
                                      onGenerateInvoice(deal.rawDeal!);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted flex items-center gap-2 cursor-pointer"
                                  >
                                    <i className="fa-solid fa-file-invoice-dollar text-emerald-500 text-xs" />
                                    <span>Generate Invoice</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuDealId(null);
                                    onDeleteDeal(deal._id, deal.dealName);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer border-t border-border/50 mt-1 pt-1.5"
                                >
                                  <i className="fa-solid fa-trash text-xs" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Middle Info Lines (Value, Email, Phone, Location) */}
                        <div className="space-y-1.5 my-2.5 text-xs">
                          {/* Deal Value */}
                          <div className="flex items-center gap-2 text-foreground font-black font-mono">
                            <i className="fa-solid fa-money-bill-wave text-muted-foreground/80 text-[11px] w-4" />
                            <span>${Number(deal.dealValue).toLocaleString()}</span>
                          </div>

                          {/* Email */}
                          <div className="flex items-center gap-2 text-muted-foreground truncate">
                            <i className="fa-solid fa-envelope text-muted-foreground/80 text-[11px] w-4" />
                            <span className="truncate">{deal.email}</span>
                          </div>

                          {/* Phone */}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <i className="fa-solid fa-phone text-muted-foreground/80 text-[11px] w-4" />
                            <span>{deal.phone}</span>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-2 text-muted-foreground truncate">
                            <i className="fa-solid fa-location-dot text-muted-foreground/80 text-[11px] w-4" />
                            <span className="truncate">{deal.location}</span>
                          </div>
                        </div>

                        {/* Rep & Probability Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/40 mb-2.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-slate-700 text-white font-bold text-[9px] flex items-center justify-center">
                              {deal.owner.slice(0, 1)}
                            </div>
                            <span className="text-xs font-semibold text-foreground truncate">{deal.owner}</span>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black shrink-0", deal.badgeColor)}>
                            {deal.probability}%
                          </span>
                        </div>

                        {/* Footer Row: Date & Action Icons */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1.5 font-medium">
                            <i className="fa-solid fa-calendar-days text-[10px] text-muted-foreground" />
                            <span>{deal.expectedClose}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            <a
                              href={`tel:${deal.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              title="Call Representative"
                              className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
                            >
                              <i className="fa-solid fa-phone-volume text-[10px]" />
                            </a>
                            <a
                              href={`mailto:${deal.email}`}
                              onClick={(e) => e.stopPropagation()}
                              title="Send Email"
                              className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
                            >
                              <i className="fa-solid fa-comment-dots text-[10px]" />
                            </a>
                            <button
                              type="button"
                              onClick={(e) => toggleStar(deal._id, e)}
                              title={isStarred ? "Starred" : "Star Deal"}
                              className="w-6 h-6 rounded-md hover:bg-muted text-muted-foreground hover:text-amber-500 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <i className={cn("fa-solid text-[10px]", isStarred ? "fa-star text-amber-400" : "fa-palette")} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {col.deals.length === 0 && (
                    <div className="h-32 border-2 border-dashed border-border/70 rounded-2xl flex flex-col items-center justify-center p-4 text-center">
                      <p className="text-xs text-muted-foreground font-semibold">Drop deals here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Deals List Table View (Exact /crm/deals-list Design) ── */}
      {viewMode === "list" && (
        <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-3 w-10 text-center">
                    <input type="checkbox" className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5" />
                  </th>
                  <th className="py-3 px-2 w-8 text-center" />
                  <th className="py-3 px-4">Deal Name</th>
                  <th className="py-3 px-3">Stage</th>
                  <th className="py-3 px-3">Deal Value</th>
                  <th className="py-3 px-3">Tags</th>
                  <th className="py-3 px-3">Expected Close Date</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3">Probability</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredDeals.map((deal) => {
                  const isStarred = starredDeals[deal._id];
                  return (
                    <tr
                      key={deal._id}
                      onClick={() => {
                        if (deal.rawDeal) onEditDeal(deal.rawDeal);
                        else handleOpenAddModal();
                      }}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5" />
                      </td>
                      <td className="py-3.5 px-2 text-center" onClick={(e) => toggleStar(deal._id, e)}>
                        <i className={cn("fa-solid cursor-pointer text-xs transition-colors", isStarred ? "fa-star text-amber-400" : "fa-star text-muted-foreground/30 hover:text-amber-400")} />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] shrink-0", deal.avatarBg)}>
                            {deal.initials}
                          </div>
                          <div>
                            <p className="font-extrabold text-foreground group-hover:text-primary transition-colors">{deal.dealName}</p>
                            <p className="text-[10px] text-muted-foreground">{deal.clientAccount}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-semibold">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border/80 text-foreground">
                          {deal.pipelineStage}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-black font-mono text-sm text-foreground">
                        ${Number(deal.dealValue).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {deal.tag}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-muted-foreground font-medium">
                        {deal.expectedClose}
                      </td>
                      <td className="py-3.5 px-3 text-foreground font-medium">
                        {deal.owner}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black", deal.badgeColor)}>
                          {deal.probability}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                          deal.status === "Won" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" :
                          deal.status === "Lost" ? "bg-rose-500/15 text-rose-600 border-rose-500/30" :
                          "bg-blue-500/15 text-blue-600 border-blue-500/30"
                        )}>
                          {deal.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (deal.rawDeal) onEditDeal(deal.rawDeal);
                              else handleOpenAddModal();
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-amber-500 flex items-center justify-center transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <i className="fa-solid fa-pen-to-square text-xs" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteDeal(deal._id, deal.dealName)}
                            className="w-7 h-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash text-xs" />
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
      )}

      {/* ── 5. Add Deal Drawer Modal (Exact offcanvas_add Fields) ── */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card h-full border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/20">
              <h5 className="text-base font-black text-foreground flex items-center gap-2">
                <i className="fa-solid fa-square-plus text-primary" />
                <span>{modalMode === "add" ? "Add New Deal" : "Edit Deal"}</span>
              </h5>
              <button
                type="button"
                onClick={() => setShowAddDealModal(false)}
                className="w-8 h-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center cursor-pointer transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSaveDealSubmit} className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              {/* Deal Name */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Deal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDealForm.dealName}
                  onChange={(e) => setNewDealForm({ ...newDealForm, dealName: e.target.value })}
                  placeholder="e.g. Acme Enterprise Expansion"
                  className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              {/* Pipeline & Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Pipeline <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newDealForm.pipeline}
                    onChange={(e) => setNewDealForm({ ...newDealForm, pipeline: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
                  >
                    <option value="Sales Pipeline">Sales Pipeline</option>
                    <option value="Marketing Pipeline">Marketing Pipeline</option>
                    <option value="Enterprise Pipeline">Enterprise Pipeline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newDealForm.stage}
                    onChange={(e) => setNewDealForm({ ...newDealForm, stage: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
                  >
                    <option value="Qualify To Buy">Qualify To Buy</option>
                    <option value="Contact Made">Contact Made</option>
                    <option value="Presentation">Presentation</option>
                    <option value="Proposal Made">Proposal Made</option>
                    <option value="Appointment">Appointment</option>
                  </select>
                </div>
              </div>

              {/* Deal Value & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Deal Value <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={newDealForm.dealValue}
                    onChange={(e) => setNewDealForm({ ...newDealForm, dealValue: e.target.value })}
                    placeholder="350000"
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Currency <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newDealForm.currency}
                    onChange={(e) => setNewDealForm({ ...newDealForm, currency: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              {/* Client / Contact Account */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Contact / Account <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDealForm.clientAccount}
                  onChange={(e) => setNewDealForm({ ...newDealForm, clientAccount: e.target.value })}
                  placeholder="e.g. Howell, Tremblay and Rath"
                  className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              {/* Assignee & Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Assignee / Owner <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newDealForm.owner}
                    onChange={(e) => setNewDealForm({ ...newDealForm, owner: e.target.value })}
                    placeholder="e.g. Darlee Robertson"
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Expected Closing Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newDealForm.expectedClose}
                    onChange={(e) => setNewDealForm({ ...newDealForm, expectedClose: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
              </div>

              {/* Priority & Tag */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Priority</label>
                  <select
                    value={newDealForm.priority}
                    onChange={(e) => setNewDealForm({ ...newDealForm, priority: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Tags</label>
                  <select
                    value={newDealForm.tag}
                    onChange={(e) => setNewDealForm({ ...newDealForm, tag: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs cursor-pointer"
                  >
                    <option value="Promotion">Promotion</option>
                    <option value="Rated">Rated</option>
                    <option value="Collab">Collab</option>
                    <option value="Calls">Calls</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={newDealForm.description}
                  onChange={(e) => setNewDealForm({ ...newDealForm, description: e.target.value })}
                  placeholder="Additional notes about this deal..."
                  className="w-full p-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-border/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                >
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
