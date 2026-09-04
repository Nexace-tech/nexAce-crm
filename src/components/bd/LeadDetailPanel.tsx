"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ILeadHistoryItem {
  fromStatus?: string;
  toStatus: string;
  fromStage?: string;
  toStage?: string;
  changedByName?: string;
  notes?: string;
  timestamp: string | Date;
}

export interface Lead {
  _id: string;
  leadName: string;
  companyName: string;
  phone: string;
  email?: string;
  status: "New" | "Contacted" | "Qualified" | "Proposal" | "Negotiation" | "Closed" | "Lost";
  stage: "Inpipeline" | "Follow Up" | "Schedule Service" | "Conversation";
  leadType?: "Internal" | "External";
  source?: string;
  owner?: string;
  venture?: string;
  location?: string;
  value?: number;
  currency?: string;
  notes?: string;
  history?: ILeadHistoryItem[];
  createdAt?: string;
}

export const CURRENCY_OPTIONS = [
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "PKR", symbol: "₨", label: "PKR (₨) - Pakistani Rupee" },
  { code: "AED", symbol: "AED", label: "AED - UAE Dirham" },
  { code: "CAD", symbol: "C$", label: "CAD (C$) - Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD (A$) - Australian Dollar" },
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { code: "SAR", symbol: "SAR", label: "SAR - Saudi Riyal" },
];

export const getCurrencySymbol = (code?: string): string => {
  const match = CURRENCY_OPTIONS.find(c => c.code === code);
  return match ? match.symbol : (code ? `${code} ` : "$");
};

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange?: (lead: Lead, status: Lead["status"]) => void;
  onStageChange?: (lead: Lead, stage: Lead["stage"]) => void;
  onConvertToDeal?: (lead: Lead) => void;
  onConvertToProposal?: (lead: Lead) => void;
  relatedDeals?: Array<{ _id: string; dealName: string; dealValue: number; stage: string; expectedClose?: string }>;
  relatedProposals?: Array<{ _id: string; proposalCode: string; subject: string; totalValue: number; status: string; openTill?: string }>;
  onOpenDeal?: (dealId: string) => void;
  onOpenProposal?: (proposalId: string) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<Lead["status"], { label: string; dot: string; cls: string }> = {
  New:         { label: "New",         dot: "bg-blue-500",    cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30" },
  Contacted:   { label: "Contacted",   dot: "bg-amber-500",   cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" },
  Qualified:   { label: "Qualified",   dot: "bg-violet-500",  cls: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30" },
  Proposal:    { label: "Proposal",    dot: "bg-sky-500",     cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30" },
  Negotiation: { label: "Negotiation", dot: "bg-orange-500",  cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30" },
  Closed:      { label: "Closed",      dot: "bg-emerald-500", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" },
  Lost:        { label: "Lost",        dot: "bg-rose-500",    cls: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30" },
};

const STAGE_PIPELINE: { key: Lead["stage"]; label: string; icon: string; color: string; bg: string }[] = [
  { key: "Inpipeline",       label: "Inpipeline",       icon: "fa-filter-circle-dollar", color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/30" },
  { key: "Follow Up",        label: "Follow Up",        icon: "fa-phone-flip",            color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30" },
  { key: "Schedule Service", label: "Schedule Service", icon: "fa-calendar-check",        color: "text-amber-500",   bg: "bg-amber-500/10 border-amber-500/30" },
  { key: "Conversation",     label: "Conversation",     icon: "fa-comments",              color: "text-rose-500",    bg: "bg-rose-500/10 border-rose-500/30" },
];

const COMPANY_COLORS = [
  "from-blue-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-emerald-500 to-teal-600",
  "from-violet-500 to-purple-600",
  "from-sky-500 to-cyan-600",
];

// Mock activity timeline
const MOCK_ACTIVITIES = [
  { icon: "fa-user-plus",       color: "bg-blue-500",    text: "Lead created",              time: "Just now" },
  { icon: "fa-envelope",        color: "bg-violet-500",  text: "Email sent to contact",     time: "2 days ago" },
  { icon: "fa-phone",           color: "bg-emerald-500", text: "Phone call attempted",       time: "4 days ago" },
  { icon: "fa-file-contract",   color: "bg-amber-500",   text: "Proposal document shared",  time: "1 week ago" },
  { icon: "fa-calendar-plus",   color: "bg-sky-500",     text: "Meeting scheduled",         time: "2 weeks ago" },
];

export function LeadDetailPanel({
  lead,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onStageChange,
  onConvertToDeal,
  onConvertToProposal,
  relatedDeals = [],
  relatedProposals = [],
  onOpenDeal,
  onOpenProposal,
}: LeadDetailPanelProps) {
  const [noteText, setNoteText] = useState(lead.notes || "");
  const [savingNote, setSavingNote] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "pipeline" | "activity" | "notes">("overview");

  const sc = STATUS_CONFIG[lead.status];
  const colorIdx = lead.companyName.charCodeAt(0) % COMPANY_COLORS.length;
  const gradClass = COMPANY_COLORS[colorIdx];
  const initials = lead.companyName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const currentStageIdx = STAGE_PIPELINE.findIndex(s => s.key === lead.stage);

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await fetch(`/api/bd/leads/${lead._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteText }),
      });
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-[520px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <i className="fa-solid fa-user-tag text-primary" />
            <span>Lead Profile &amp; Pipeline</span>
          </div>
          <div className="flex items-center gap-1.5">
            {onConvertToProposal && (
              <button
                type="button"
                onClick={() => onConvertToProposal(lead)}
                className="h-8 px-2.5 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                title="Create Client Proposal for this Lead"
              >
                <i className="fa-solid fa-file-contract text-xs" />
                <span className="hidden sm:inline">Create Proposal</span>
              </button>
            )}
            {onConvertToDeal && (
              <button
                type="button"
                onClick={() => onConvertToDeal(lead)}
                className="h-8 px-2.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                title="Convert Lead into a Sales Deal"
              >
                <i className="fa-solid fa-handshake text-xs" />
                <span className="hidden sm:inline">Convert to Deal</span>
              </button>
            )}
            <button
              onClick={() => onEdit(lead)}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              title="Edit Lead"
            >
              <i className="fa-solid fa-pen text-xs" />
            </button>
            <button
              onClick={() => onDelete(lead)}
              className="w-8 h-8 rounded-lg border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Delete Lead"
            >
              <i className="fa-solid fa-trash-can text-xs" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              title="Close"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Hero: Avatar + Name ── */}
          <div className="flex flex-col items-center gap-3 px-6 py-8 border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
            <div className={cn("w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-black text-2xl shadow-lg", gradClass)}>
              {initials}
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">{lead.leadName}</h2>
              <p className="text-sm font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
                <i className="fa-solid fa-building text-xs" />{lead.companyName}
              </p>
            </div>
            {/* Status & Type badges */}
            <div className="flex items-center gap-2">
              <span className={cn("px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5", sc.cls)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />{sc.label}
              </span>
              <span className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5",
                lead.leadType === "Internal"
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
              )}>
                <i className={cn("fa-solid text-[9px]", lead.leadType === "Internal" ? "fa-building-user" : "fa-globe")} />
                {lead.leadType || "External"}
              </span>
            </div>
          </div>

          {/* ── Pipeline Stage Progress ── */}
          <div className="px-5 py-5 border-b border-border/50">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-4">Pipeline Stage</p>
            <div className="relative">
              {/* Track */}
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-border/60" />
              <div
                className="absolute top-4 left-4 h-0.5 bg-primary transition-all duration-500"
                style={{ width: `${(currentStageIdx / (STAGE_PIPELINE.length - 1)) * (100 - (8 / (STAGE_PIPELINE.length - 1)))}%` }}
              />
              {/* Steps */}
              <div className="relative flex items-start justify-between">
                {STAGE_PIPELINE.map((s, i) => {
                  const isDone = i < currentStageIdx;
                  const isCurrent = i === currentStageIdx;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => onStageChange?.(lead, s.key)}
                      className="flex flex-col items-center gap-2 group cursor-pointer"
                      title={`Set stage: ${s.label}`}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 z-10 relative",
                        isDone
                          ? "bg-primary border-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-card border-border/60 text-muted-foreground group-hover:border-primary/50"
                      )}>
                        {isDone
                          ? <i className="fa-solid fa-check text-[10px]" />
                          : <i className={`fa-solid ${s.icon} text-[10px]`} />
                        }
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold text-center leading-tight max-w-[56px]",
                        isCurrent ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Sub-nav ── */}
          <div className="flex items-center gap-1 px-5 pt-4 pb-0 overflow-x-auto">
            {(["overview", "pipeline", "activity", "notes"] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setActiveSection(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                  activeSection === s
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {s === "overview" && <><i className="fa-solid fa-circle-info text-[10px]" />Overview</>}
                {s === "pipeline" && (
                  <>
                    <i className="fa-solid fa-diagram-project text-[10px]" />
                    <span>Deals &amp; Proposals</span>
                    {(relatedDeals.length > 0 || relatedProposals.length > 0) && (
                      <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-mono">
                        {relatedDeals.length + relatedProposals.length}
                      </span>
                    )}
                  </>
                )}
                {s === "activity" && <><i className="fa-solid fa-clock-rotate-left text-[10px]" />Activity</>}
                {s === "notes" && <><i className="fa-solid fa-note-sticky text-[10px]" />Notes</>}
              </button>
            ))}
          </div>

          {/* ── Overview Section ── */}
          {activeSection === "overview" && (
            <div className="px-5 py-4 space-y-4">
              {/* Quick Conversion Banners */}
              <div className="space-y-2.5">
                {onConvertToDeal && (
                  <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-handshake text-emerald-500 text-xs" /> Convert to Sales Deal
                      </p>
                      <p className="text-[11px] text-muted-foreground">Transfer this qualified lead into the active sales pipeline.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onConvertToDeal(lead)}
                      className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      <span>Create Deal</span>
                      <i className="fa-solid fa-arrow-right text-[10px]" />
                    </button>
                  </div>
                )}

                {onConvertToProposal && (
                  <div className="bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent border border-violet-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-file-contract text-violet-500 text-xs" /> Create Client Proposal
                      </p>
                      <p className="text-[11px] text-muted-foreground">Generate a detailed proposal &amp; pricing quote for this lead.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onConvertToProposal(lead)}
                      className="h-8 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1.5 text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      <span>Create Proposal</span>
                      <i className="fa-solid fa-arrow-right text-[10px]" />
                    </button>
                  </div>
                )}
              </div>

              {/* Contact Info & Quick Actions */}
              <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Contact Information</p>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-phone text-blue-500 text-[10px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground font-medium">Phone</p>
                        <p className="text-sm font-semibold text-foreground font-mono truncate">{lead.phone || "—"}</p>
                      </div>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard?.writeText(lead.phone); }}
                          className="w-7 h-7 rounded-lg border border-border/60 bg-background hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy phone"
                        >
                          <i className="fa-solid fa-copy text-[10px]" />
                        </button>
                        <a
                          href={`tel:${lead.phone}`}
                          className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center justify-center transition-colors"
                          title="Call"
                        >
                          <i className="fa-solid fa-phone-volume text-[10px]" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <i className="fa-solid fa-envelope text-violet-500 text-[10px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground font-medium">Email</p>
                        <p className="text-sm font-semibold text-foreground truncate">{lead.email || "—"}</p>
                      </div>
                    </div>
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="w-7 h-7 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 border border-violet-500/30 flex items-center justify-center transition-colors shrink-0"
                        title="Send email"
                      >
                        <i className="fa-solid fa-paper-plane text-[10px]" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Lead Details */}
              <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Lead Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Deal Value", value: lead.value ? `${getCurrencySymbol(lead.currency)}${new Intl.NumberFormat("en-US").format(lead.value)}` : undefined, icon: "fa-money-bill-wave" },
                    { label: "Currency", value: lead.currency || "USD", icon: "fa-coins" },
                    { label: "Location", value: lead.location, icon: "fa-location-dot" },
                    { label: "Lead Type", value: lead.leadType || "External", icon: "fa-tag" },
                    { label: "Owner", value: lead.owner, icon: "fa-user" },
                    { label: "Source", value: lead.source, icon: "fa-arrow-right-to-bracket" },
                    { label: "Venture", value: lead.venture, icon: "fa-briefcase" },
                    { label: "Created", value: lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—", icon: "fa-calendar" },
                  ].map((item, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                        <i className={`fa-solid ${item.icon} text-[9px]`} />{item.label}
                      </p>
                      <p className="text-xs font-semibold text-foreground font-mono">{item.value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Changer */}
              <div className="bg-muted/30 border border-border/60 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Update Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STATUS_CONFIG) as Lead["status"][]).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = lead.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onStatusChange?.(lead, s)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                          isActive
                            ? cn(cfg.cls, "shadow-sm scale-[1.02]")
                            : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                        {cfg.label}
                        {isActive && <i className="fa-solid fa-check ml-auto text-[10px]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Pipeline & Assets Section ── */}
          {activeSection === "pipeline" && (
            <div className="px-5 py-4 space-y-5 animate-in fade-in duration-200">
              {/* Connected Sales Deals */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-handshake text-emerald-500" />
                    <span>Connected Sales Deals</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                      {relatedDeals.length}
                    </span>
                  </p>
                  {onConvertToDeal && (
                    <button
                      type="button"
                      onClick={() => onConvertToDeal(lead)}
                      className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-plus text-[10px]" /> New Deal
                    </button>
                  )}
                </div>

                {relatedDeals.length === 0 ? (
                  <div className="bg-muted/30 border border-dashed border-border rounded-xl p-4 text-center space-y-2">
                    <i className="fa-solid fa-handshake text-2xl text-muted-foreground/40 block" />
                    <p className="text-xs text-muted-foreground">No sales deals created yet for this account.</p>
                    {onConvertToDeal && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConvertToDeal(lead)}
                        className="text-xs font-bold gap-1.5 h-8 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-[10px]" /> Create Sales Deal
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {relatedDeals.map((d) => (
                      <div
                        key={d._id}
                        onClick={() => onOpenDeal?.(d._id)}
                        className="bg-card border border-border/70 hover:border-emerald-500/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">{d.dealName}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span className="font-mono font-bold text-foreground">${d.dealValue.toLocaleString()}</span>
                            {d.expectedClose && <span>&bull; Closes: {d.expectedClose.slice(0, 10)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            {d.stage}
                          </span>
                          <i className="fa-solid fa-arrow-right text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Connected Proposals */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-file-contract text-violet-500" />
                    <span>Connected Proposals</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600">
                      {relatedProposals.length}
                    </span>
                  </p>
                  {onConvertToProposal && (
                    <button
                      type="button"
                      onClick={() => onConvertToProposal(lead)}
                      className="text-xs font-bold text-violet-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-plus text-[10px]" /> New Proposal
                    </button>
                  )}
                </div>

                {relatedProposals.length === 0 ? (
                  <div className="bg-muted/30 border border-dashed border-border rounded-xl p-4 text-center space-y-2">
                    <i className="fa-solid fa-file-contract text-2xl text-muted-foreground/40 block" />
                    <p className="text-xs text-muted-foreground">No proposals created yet for this lead.</p>
                    {onConvertToProposal && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onConvertToProposal(lead)}
                        className="text-xs font-bold gap-1.5 h-8 border-violet-500/30 text-violet-600 hover:bg-violet-500/10 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-[10px]" /> Create Client Proposal
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {relatedProposals.map((p) => (
                      <div
                        key={p._id}
                        onClick={() => onOpenProposal?.(p._id)}
                        className="bg-card border border-border/70 hover:border-violet-500/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            #{p.proposalCode} - {p.subject}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span className="font-mono font-bold text-foreground">${p.totalValue.toLocaleString()}</span>
                            {p.openTill && <span>&bull; Valid till: {new Date(p.openTill).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20">
                            {p.status}
                          </span>
                          <i className="fa-solid fa-arrow-right text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Activity Section ── */}
          {activeSection === "activity" && (
            <div className="px-5 py-4 space-y-1">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Audit &amp; Stage History</p>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {lead.history?.length || 1} logged event{(lead.history?.length || 1) !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border/60" />
                <div className="space-y-4 pl-10">
                  {lead.history && lead.history.length > 0 ? (
                    // Show reverse chronological
                    [...lead.history].reverse().map((entry, idx) => {
                      const isStatus = !!entry.toStatus;
                      const isClosedWon = entry.toStatus === "Closed";
                      const isLost = entry.toStatus === "Lost";
                      const isProposal = entry.toStatus === "Proposal";
                      const isNegotiation = entry.toStatus === "Negotiation";

                      const badgeBg = isClosedWon
                        ? "bg-emerald-500"
                        : isLost
                        ? "bg-rose-500"
                        : isProposal
                        ? "bg-violet-500"
                        : isNegotiation
                        ? "bg-amber-500"
                        : "bg-primary";

                      const icon = isClosedWon
                        ? "fa-trophy"
                        : isLost
                        ? "fa-ban"
                        : isProposal
                        ? "fa-file-lines"
                        : isNegotiation
                        ? "fa-handshake"
                        : "fa-arrows-rotate";

                      return (
                        <div key={idx} className="relative flex items-start gap-3 group">
                          <div className={cn("absolute -left-[26px] w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm shrink-0", badgeBg)}>
                            <i className={`fa-solid ${icon} text-[10px]`} />
                          </div>
                          <div className="bg-card border border-border/60 rounded-xl p-3 flex-1 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-xs font-bold text-foreground">
                                {entry.fromStatus ? (
                                  <>
                                    <span className="text-muted-foreground font-normal">{entry.fromStatus}</span>
                                    <span className="text-primary mx-1.5">&rarr;</span>
                                    <span className="font-bold">{entry.toStatus}</span>
                                  </>
                                ) : (
                                  <span>Status: {entry.toStatus}</span>
                                )}
                                {entry.toStage && entry.toStage !== entry.fromStage && (
                                  <span className="ml-2 text-[11px] font-semibold text-muted-foreground">
                                    (Stage: {entry.toStage})
                                  </span>
                                )}
                              </p>
                              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                <i className="fa-solid fa-clock text-[9px]" />
                                {entry.timestamp ? new Date(entry.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now"}
                              </span>
                            </div>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-1.5 italic bg-muted/30 p-2 rounded-lg border border-border/40">
                                &ldquo;{entry.notes}&rdquo;
                              </p>
                            )}
                            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span>By: <strong className="text-foreground">{entry.changedByName || "System"}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    // Fallback to initial lead record event
                    <div className="relative flex items-start gap-3 group">
                      <div className="absolute -left-[26px] w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-sm shrink-0">
                        <i className="fa-solid fa-user-plus text-[10px]" />
                      </div>
                      <div className="bg-card border border-border/60 rounded-xl p-3 flex-1 hover:shadow-sm transition-all">
                        <p className="text-xs font-bold text-foreground">Lead Initialized</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Initial status set to <strong>{lead.status}</strong> ({lead.stage})
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-clock text-[9px]" />
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Recently"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Notes Section ── */}
          {activeSection === "notes" && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Notes</p>
              <textarea
                rows={8}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Add notes about this lead — key requirements, client context, follow-up reminders..."
                className="w-full rounded-xl border border-input bg-background text-sm px-4 py-3 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={savingNote}
                className="w-full gap-2 font-semibold cursor-pointer"
              >
                {savingNote
                  ? <><i className="fa-solid fa-spinner fa-spin text-xs" />Saving...</>
                  : <><i className="fa-solid fa-floppy-disk text-xs" />Save Notes</>
                }
              </Button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-5 py-4 border-t border-border/60 flex items-center gap-2.5">
          <Button variant="outline" size="sm" className="flex-1 gap-2 cursor-pointer" onClick={() => onEdit(lead)}>
            <i className="fa-solid fa-pen text-xs" /> Edit Lead
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-2 cursor-pointer bg-rose-500 hover:bg-rose-600 text-white"
            onClick={() => onDelete(lead)}
          >
            <i className="fa-solid fa-trash-can text-xs" /> Delete
          </Button>
        </div>
      </div>
    </>
  );
}
