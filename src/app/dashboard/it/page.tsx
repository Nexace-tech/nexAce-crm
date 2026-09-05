"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatISTDate, getISTDateString } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ──────────────────────────────────────────────────────────────────

interface DriveLink {
  id: string;
  name: string;
  category: string;
  venture: string;
  platform: string;
  link: string;
  owner: string;
  accessLevel: string;
  shareScope?: "All Users" | "Specific Users" | "Private";
  sharedWith?: string[];
  lastUpdated: string;
  reviewFrequency: string;
  notes: string;
}

interface AccessEntry {
  id: string;
  tool: string;
  category: string;
  assignee: string;
  role: string;
  accessLevel: string;
  dateGranted: string;
  status: "Active" | "Suspended" | "Pending" | "Revoked";
}

interface Subscription {
  id: string;
  tool: string;
  category: string;
  plan: string;
  costPerMonth: number;
  seats: number;
  renewalDate: string;
  owner: string;
  status: "Active" | "Expiring Soon" | "Expired" | "Cancelled";
}

interface Device {
  id: string;
  assetTag: string;
  type: string;
  brand: string;
  modelName: string;
  serialNumber?: string;
  specs?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  assignedTo: string;
  department: string;
  location?: string;
  os: string;
  lastSeen: string;
  condition: "Excellent" | "Good" | "Fair" | "Poor";
  status: "In Use" | "Available" | "In Repair" | "Retired";
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerNo: string;
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  billedToName: string;
  billedToAddress: string;
  billedToEmail: string;
  shipToAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: "Draft" | "Sent" | "Pending" | "Paid" | "Overdue" | "Archived" | "Cancelled";
  notes?: string;
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

/** Normalise MongoDB doc (_id → id) */
function normalise<T extends { id?: string; _id?: string }>(doc: T): T {
  if (doc._id && !doc.id) {
    (doc as any).id = doc._id.toString();
  }
  return doc;
}

async function apiFetch(url: string, opts?: RequestInit) {
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers || {}) } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Utilities & Constants ───────────────────────────────────────────────────

const formatCurrency = (n: number, currency: string = "INR") => {
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
};

const getCurrencySymbol = (_currency?: string) => "₹";

const SUB_CATEGORIES = [
  "Communication",
  "Dev Tools",
  "Design",
  "Infrastructure",
  "CRM",
  "Productivity",
  "Knowledge Base",
  "AI/Automation",
  "HR/Recruiting",
  "Finance",
  "Marketing",
  "Security",
  "Other",
];

const DRIVE_CATEGORIES = [
  "Ops/Admin",
  "IT/Access",
  "AI/Automation",
  "HR/Recruiting",
  "Brand/Design",
  "Sales/Marketing",
  "Finance",
  "Legal/Compliance",
  "Engineering",
  "Other",
];

const ACCESS_CATEGORIES = [
  "Communication",
  "Dev Tools",
  "Design",
  "Infrastructure",
  "CRM",
  "Productivity",
  "Knowledge Base",
  "AI/Automation",
  "HR/Recruiting",
  "Finance",
  "IT/Access",
  "Other",
];

interface TeamMemberOption {
  _id: string;
  name: string;
  department?: string;
  role?: string;
  email?: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Suspended: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Pending: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Revoked: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
    "Expiring Soon": "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20",
    Expired: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
    Cancelled: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
    "In Use": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Available: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    "In Repair": "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Retired: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20",
    Excellent: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Good: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Fair: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Poor: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
  };
  return cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border tracking-wide whitespace-nowrap", map[status] ?? "bg-muted text-muted-foreground border-border");
};

const platformIcon = (platform: string) => {
  if (platform === "Google Sheets") return "fa-brands fa-google text-emerald-500";
  if (platform === "Google Docs") return "fa-brands fa-google text-blue-500";
  if (platform === "Notion") return "fa-solid fa-n text-slate-500";
  if (platform === "PDF") return "fa-solid fa-file-pdf text-red-500";
  return "fa-solid fa-link text-muted-foreground";
};

const deviceIcon = (type: string) => {
  if (type === "Laptop") return "fa-solid fa-laptop";
  if (type === "Desktop") return "fa-solid fa-desktop";
  if (type === "Monitor") return "fa-solid fa-desktop";
  if (type === "Mobile") return "fa-solid fa-mobile-screen";
  if (type === "Router") return "fa-solid fa-wifi";
  if (type === "Printer") return "fa-solid fa-print";
  return "fa-solid fa-microchip";
};

const SELECT_CLS = "h-8 rounded-lg border border-border bg-muted/60 text-xs px-2 focus:outline-none focus:ring-1 focus:ring-primary text-foreground cursor-pointer";

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

const SKELETON_WIDTHS = ["70%", "85%", "60%", "75%", "50%", "80%", "65%", "90%", "55%"];

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 bg-muted animate-pulse rounded-md" style={{ width: SKELETON_WIDTHS[i % SKELETON_WIDTHS.length] }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: "success" | "error" | "info"; onClose: () => void }) {
  const cfg = {
    success: { icon: "fa-solid fa-circle-check", cls: "text-emerald-500", border: "border-emerald-500/30 bg-emerald-500/5" },
    error: { icon: "fa-solid fa-circle-xmark", cls: "text-red-500", border: "border-red-500/30 bg-red-500/5" },
    info: { icon: "fa-solid fa-circle-info", cls: "text-blue-500", border: "border-blue-500/30 bg-blue-500/5" },
  }[type];
  return (
    <div className={cn("fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm animate-in slide-in-from-bottom-2 duration-200 bg-card", cfg.border)}>
      <i className={cn(cfg.icon, cfg.cls)} />
      <span className="text-xs font-medium text-foreground flex-1">{message}</span>
      <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-xs" /></button>
    </div>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────

function ConfirmDialog({ title, message, onConfirm, onCancel, loading = false }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!loading ? onCancel : undefined} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-red-500/10">
          <i className="fa-solid fa-trash text-xl text-red-500" />
        </div>
        <h3 className="text-sm font-bold text-foreground text-center mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground text-center mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 h-8 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 h-8 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5">
            {loading ? <><i className="fa-solid fa-circle-notch fa-spin text-[10px]" />Deleting…</> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────

// ─── Mini Bar Chart ──────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-center gap-3 h-24 pt-2 px-1">
      {data.map((d) => {
        const heightPct = Math.max(16, Math.round((d.value / max) * 100));
        return (
          <div key={d.label} className="flex flex-col items-center gap-1 flex-1 max-w-[120px] group">
            <span className="text-[10px] font-bold text-foreground opacity-90 group-hover:opacity-100 tabular-nums">
              ₹{d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
            </span>
            <div className="w-full bg-muted/40 rounded-t-md h-16 flex items-end p-0.5 overflow-hidden">
              <div
                className="w-full rounded-t transition-all duration-500 shadow-sm"
                style={{ height: `${heightPct}%`, backgroundColor: d.color }}
              />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight truncate w-full" title={d.label || "General"}>
              {d.label || "General"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  let offset = 0;
  const r = 26, cx = 36, cy = 36, circ = 2 * Math.PI * r;

  return (
    <div className="flex items-center justify-around gap-3 py-1">
      <div className="relative flex items-center justify-center shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72" className="transform -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/30" />
          {segments.map((seg, i) => {
            const frac = seg.value / total;
            const dash = frac * circ;
            const gap = circ - dash;
            const rot = offset * 360;
            offset += frac;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="7"
                strokeDasharray={`${dash} ${gap}`}
                strokeLinecap="round"
                transform={`rotate(${rot} ${cx} ${cy})`}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-foreground leading-none">{total}</span>
          <span className="text-[7px] text-muted-foreground uppercase font-semibold mt-0.5">Total</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 min-w-[90px]">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
              <span className="text-[10px] text-muted-foreground truncate">{seg.label}</span>
            </div>
            <span className="text-[10px] font-bold text-foreground tabular-nums shrink-0">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ access, subscriptions, devices, loading, onNavigate, onQuickAction, allowedTabs }: {
  access: AccessEntry[]; subscriptions: Subscription[]; devices: Device[]; loading: boolean;
  onNavigate?: (tab: TabKey) => void;
  onQuickAction?: (tab: TabKey) => void;
  allowedTabs?: TabKey[];
}) {
  const activeAccess = access.filter((a) => a.status === "Active").length;
  const activeSubs = subscriptions.filter((s) => s.status === "Active").length;
  const monthlyCost = subscriptions.filter((s) => s.status === "Active" || s.status === "Expiring Soon").reduce((a, s) => a + s.costPerMonth, 0);
  const devicesInUse = devices.filter((d) => d.status === "In Use").length;
  const expiring = subscriptions.filter((s) => s.status === "Expiring Soon").length;

  const subsByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    subscriptions.filter((s) => s.status === "Active" || s.status === "Expiring Soon").forEach((s) => {
      const cat = s.category?.trim() || "General";
      m[cat] = (m[cat] || 0) + s.costPerMonth;
    });
    return Object.entries(m).map(([label, value]) => ({ label, value: Math.round(value) }));
  }, [subscriptions]);

  const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const accessByStatus = [
    { value: access.filter((a) => a.status === "Active").length, color: "#10b981", label: "Active" },
    { value: access.filter((a) => a.status === "Suspended").length, color: "#f59e0b", label: "Suspended" },
    { value: access.filter((a) => a.status === "Pending").length, color: "#3b82f6", label: "Pending" },
    { value: access.filter((a) => a.status === "Revoked").length, color: "#ef4444", label: "Revoked" },
  ].filter((s) => s.value > 0);

  // Helpers to check what the user can see
  const can = (tab: TabKey) => !allowedTabs || allowedTabs.includes(tab);
  const hasAccess = can("access");
  const hasSubs = can("subscriptions");
  const hasDevices = can("devices");

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-5 space-y-2">
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                <div className="h-2 w-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  // Build only the stat cards the user has access to
  const statCards = [
    hasAccess && { icon: "fa-solid fa-users-gear", iconCls: "bg-blue-500/15 text-blue-500", border: "border-blue-500/20", label: "Active Access Grants", value: activeAccess, sub: "across all tools", tab: "access" as TabKey },
    hasSubs && { icon: "fa-solid fa-box-open", iconCls: "bg-violet-500/15 text-violet-500", border: "border-violet-500/20", label: "Active Subscriptions", value: activeSubs, sub: `${formatCurrency(monthlyCost)}/mo`, tab: "subscriptions" as TabKey },
    hasDevices && { icon: "fa-solid fa-laptop", iconCls: "bg-emerald-500/15 text-emerald-500", border: "border-emerald-500/20", label: "Devices In Use", value: devicesInUse, sub: `${devices.length} total assets`, tab: "devices" as TabKey },
    hasSubs && { icon: "fa-solid fa-hourglass-half", iconCls: "bg-amber-500/15 text-amber-500", border: "border-amber-500/20", label: "Expiring Soon", value: expiring, sub: "subscriptions", tab: "subscriptions" as TabKey },
  ].filter(Boolean) as { icon: string; iconCls: string; border: string; label: string; value: number; sub: string; tab: TabKey }[];

  // Build only the charts the user can see
  const charts = [
    hasSubs && (
      <Card
        key="spend"
        onClick={() => onNavigate?.("subscriptions")}
        className="border-border hover:border-violet-500/50 hover:shadow-md transition-all cursor-pointer group"
        title="View Subscriptions"
      >
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
            <span className="flex items-center gap-1.5"><i className="fa-solid fa-chart-bar text-violet-500" /> Spend by Category</span>
            <i className="fa-solid fa-arrow-right text-[10px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-violet-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {subsByCategory.length > 0 ? <MiniBarChart data={subsByCategory.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] }))} /> : <p className="text-xs text-muted-foreground py-4 text-center">No subscription data</p>}
        </CardContent>
      </Card>
    ),
    hasAccess && (
      <Card
        key="access"
        onClick={() => onNavigate?.("access")}
        className="border-border hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group"
        title="View Access Grants"
      >
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
            <span className="flex items-center gap-1.5"><i className="fa-solid fa-key text-blue-500" /> Access by Status</span>
            <i className="fa-solid fa-arrow-right text-[10px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-blue-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {accessByStatus.length > 0 ? <DonutChart segments={accessByStatus} /> : <p className="text-xs text-muted-foreground py-4 text-center">No access data</p>}
        </CardContent>
      </Card>
    ),
    hasDevices && (
      <Card
        key="devices"
        onClick={() => onNavigate?.("devices")}
        className="border-border hover:border-emerald-500/50 hover:shadow-md transition-all cursor-pointer group"
        title="View Devices"
      >
        <CardHeader className="pb-1 pt-4 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between">
            <span className="flex items-center gap-1.5"><i className="fa-solid fa-laptop text-emerald-500" /> Device Health</span>
            <i className="fa-solid fa-arrow-right text-[10px] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-emerald-500" />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          {devices.length > 0 ? <DonutChart segments={[
            { value: devices.filter((d) => d.condition === "Excellent").length, color: "#10b981", label: "Excellent" },
            { value: devices.filter((d) => d.condition === "Good").length, color: "#3b82f6", label: "Good" },
            { value: devices.filter((d) => d.condition === "Fair").length, color: "#f59e0b", label: "Fair" },
            { value: devices.filter((d) => d.condition === "Poor").length, color: "#ef4444", label: "Poor" },
          ].filter((s) => s.value > 0)} /> : <p className="text-xs text-muted-foreground py-4 text-center">No device data</p>}
        </CardContent>
      </Card>
    ),
  ].filter(Boolean);

  // Build only the summary items the user can see
  const summaryItems = [
    hasSubs && { label: "Expired / Cancelled Subs", value: subscriptions.filter((s) => s.status === "Expired" || s.status === "Cancelled").length, cls: "text-red-500", icon: "fa-solid fa-ban", tab: "subscriptions" as TabKey },
    hasAccess && { label: "Revoked Access", value: access.filter((a) => a.status === "Revoked").length, cls: "text-red-500", icon: "fa-solid fa-user-xmark", tab: "access" as TabKey },
    hasAccess && { label: "Pending Access", value: access.filter((a) => a.status === "Pending").length, cls: "text-blue-500", icon: "fa-solid fa-hourglass-half", tab: "access" as TabKey },
    hasDevices && { label: "Available Devices", value: devices.filter((d) => d.status === "Available").length, cls: "text-emerald-500", icon: "fa-solid fa-laptop-code", tab: "devices" as TabKey },
  ].filter(Boolean) as { label: string; value: number; cls: string; icon: string; tab: TabKey }[];

  // Quick Actions — only for allowed tabs
  const ALL_ACTIONS = [
    { icon: "fa-solid fa-user-plus", label: "Grant Access", sub: "Add user tool access", tab: "access" as TabKey, color: "text-blue-500 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15" },
    { icon: "fa-solid fa-file-circle-plus", label: "Add Drive Link", sub: "Index new resource", tab: "drive" as TabKey, color: "text-violet-500 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/15" },
    { icon: "fa-solid fa-laptop-medical", label: "Register Device", sub: "Add asset entry", tab: "devices" as TabKey, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15" },
    { icon: "fa-solid fa-credit-card", label: "Add Subscription", sub: "Track new software", tab: "subscriptions" as TabKey, color: "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15" },
    { icon: "fa-solid fa-file-invoice-dollar", label: "Create Invoice", sub: "Generate client invoice", tab: "invoices" as TabKey, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/15" },
  ];
  const actions = allowedTabs ? ALL_ACTIONS.filter((a) => allowedTabs.includes(a.tab)) : ALL_ACTIONS;

  return (
    <div className="space-y-5">
      {/* Stat Cards — only accessible sections */}
      {statCards.length > 0 && (
        <div className={cn("grid gap-4", statCards.length === 1 ? "grid-cols-1 max-w-xs" : statCards.length === 2 ? "grid-cols-2" : statCards.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4")}>
          {statCards.map((c) => (
            <Card
              key={c.label}
              onClick={() => onNavigate?.(c.tab)}
              className={cn("border cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group", c.border)}
              title={`View ${c.tab}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide group-hover:text-foreground transition-colors">{c.label}</span>
                    <span className="text-2xl font-bold text-foreground">{c.value}</span>
                    <span className="text-xs text-muted-foreground">{c.sub}</span>
                  </div>
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform", c.iconCls)}>
                    <i className={cn(c.icon, "text-lg")} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts & Summary Cards in One Row */}
      {(charts.length > 0 || summaryItems.length > 0) && (
        <div className={cn("grid gap-4", (charts.length + summaryItems.length) <= 2 ? "grid-cols-1 md:grid-cols-2" : (charts.length + summaryItems.length) === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
          {charts}
          {summaryItems.map((item) => (
            <Card
              key={item.label}
              onClick={() => onNavigate?.(item.tab)}
              className="border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between p-4 group"
              title={`View ${item.tab}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide leading-tight group-hover:text-foreground transition-colors">{item.label}</span>
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <i className={cn(item.icon, item.cls, "text-xs")} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className={cn("text-2xl font-bold tabular-nums", item.cls)}>{item.value}</span>
                <i className="fa-solid fa-arrow-right text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      {actions.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <i className="fa-solid fa-bolt text-amber-500" /> Quick Actions — Add &amp; Manage
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={cn("grid gap-3", actions.length <= 2 ? "grid-cols-2" : actions.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-5")}>
              {actions.map((action) => (
                <button key={action.label} onClick={() => onQuickAction?.(action.tab)} className={cn("flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-center transition-all duration-200 cursor-pointer", action.color)}>
                  <i className={cn(action.icon, "text-lg")} />
                  <span className="text-[11px] font-bold leading-tight">{action.label}</span>
                  <span className="text-[9px] opacity-70 leading-tight">{action.sub}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {statCards.length === 0 && charts.length === 0 && summaryItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <i className="fa-solid fa-gauge-high text-2xl text-muted-foreground opacity-40" />
          </div>
          <p className="text-sm font-semibold text-foreground">No overview data available</p>
          <p className="text-xs text-muted-foreground mt-1">You don&apos;t have access to any monitored sections yet.</p>
        </div>
      )}
    </div>
  );
}


// ─── Drive Links Tab ──────────────────────────────────────────────────────────

const makeEmptyDrive = (userName = ""): Omit<DriveLink, "id"> => ({
  name: "",
  category: "",
  venture: "Ace Consultancy",
  platform: "Google Sheets",
  link: "",
  owner: userName || "",
  accessLevel: "View - Team",
  shareScope: "All Users",
  sharedWith: [],
  lastUpdated: new Date().toISOString().slice(0, 10),
  reviewFrequency: "Monthly",
  notes: "",
});

function DriveModal({
  initial,
  onSave,
  onClose,
  saving,
  userName,
  isPrivileged,
  teamMembers = [],
  existingCategories = [],
}: {
  initial: Omit<DriveLink, "id">;
  onSave: (d: Omit<DriveLink, "id">) => void;
  onClose: () => void;
  saving?: boolean;
  userName?: string;
  isPrivileged?: boolean;
  teamMembers?: TeamMemberOption[];
  existingCategories?: string[];
}) {
  const [form, setForm] = useState(() => ({
    ...initial,
    owner: initial.owner || userName || "Ace",
    shareScope: initial.shareScope || "All Users",
    sharedWith: initial.sharedWith || [],
  }));
  const [memberFilter, setMemberFilter] = useState("");
  const set = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const fieldCls = "w-full h-8 rounded-lg border border-border bg-muted/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground";

  const allCategories = useMemo(() => {
    return Array.from(new Set([...DRIVE_CATEGORIES, ...existingCategories.filter(Boolean)]));
  }, [existingCategories]);

  const filteredMembers = useMemo(() => {
    const q = memberFilter.toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.department && m.department.toLowerCase().includes(q))
    );
  }, [teamMembers, memberFilter]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center border border-violet-500/20">
              <i className="fa-solid fa-folder-open text-sm" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {(initial as any)._id || (initial as any).id ? "Edit File / Drive Link" : "Add File / Drive Link"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Share documents, trackers, spreadsheets &amp; SOP links across the team
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-3.5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {/* Resource Name */}
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                File / Resource Name *
              </label>
              <input
                className={fieldCls}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Brand Guidelines 2026, Q3 Financial Model…"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Category</label>
              <input
                list="drive-categories-datalist"
                className={fieldCls}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Ops/Admin, Brand/Design"
              />
              <datalist id="drive-categories-datalist">
                {allCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            {/* Platform */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Platform</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.platform} onChange={(e) => set("platform", e.target.value)}>
                {["Google Sheets", "Google Docs", "Notion", "PDF", "Figma", "Canva", "Loom", "Miro", "Other"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            {/* Owner with Quick "Set to Me" */}
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Owner</label>
                {userName && (
                  <button
                    type="button"
                    onClick={() => set("owner", userName)}
                    className="text-[9px] font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1"
                    title="Set current user as owner"
                  >
                    <i className="fa-solid fa-user-check text-[8px]" /> Set to Me ({userName})
                  </button>
                )}
              </div>
              <input
                list="drive-owners-datalist"
                className={fieldCls}
                value={form.owner}
                onChange={(e) => set("owner", e.target.value)}
                placeholder="Select or enter owner"
              />
              <datalist id="drive-owners-datalist">
                {teamMembers.map((m) => (
                  <option key={m._id || m.name} value={m.name}>
                    {m.department ? `${m.name} (${m.department})` : m.name}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Access Permission Level */}
            <div className="col-span-2 sm:col-span-1">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Access Level</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.accessLevel} onChange={(e) => set("accessLevel", e.target.value)}>
                {["View - Team", "Edit - Team", "Admin Only", "Public"].map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>

            {/* ─── Granular Share Scope Selector ─── */}
            <div className="col-span-2 space-y-2.5 p-3 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fa-solid fa-share-nodes text-primary text-xs" /> Share With / Visibility
                </label>
                <span className="text-[9px] text-muted-foreground">Select who has access to this link</span>
              </div>

              {/* 3 Scope Cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "All Users", label: "All Users", icon: "fa-solid fa-globe", sub: "Entire Team", color: "text-emerald-500" },
                  { id: "Specific Users", label: "Specific Users", icon: "fa-solid fa-user-group", sub: "Select Members", color: "text-primary" },
                  { id: "Private", label: "Only Me", icon: "fa-solid fa-lock", sub: "Private / Owner", color: "text-amber-500" },
                ].map((opt) => {
                  const isSelected = form.shareScope === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => set("shareScope", opt.id as any)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/40 font-bold"
                          : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                      )}
                    >
                      <i className={cn(opt.icon, "text-xs", isSelected ? "text-primary" : opt.color)} />
                      <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                      <span className="text-[9px] opacity-70 leading-tight">{opt.sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* Specific Users Picker & Multi-Select */}
              {form.shareScope === "Specific Users" && (
                <div className="mt-2.5 pt-2.5 border-t border-border space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search team members…"
                        value={memberFilter}
                        onChange={(e) => setMemberFilter(e.target.value)}
                        className="w-full h-7 pl-7 pr-2 rounded-md border border-border bg-background text-[11px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, sharedWith: teamMembers.map((m) => m.name) }))}
                        className="h-7 px-2 text-[10px] font-semibold rounded-md border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, sharedWith: [] }))}
                        className="h-7 px-2 text-[10px] font-semibold rounded-md border border-border bg-background hover:bg-muted text-muted-foreground cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Selected Members Badges */}
                  {(form.sharedWith || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1.5 rounded-lg bg-background border border-border">
                      {(form.sharedWith || []).map((name) => (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20"
                        >
                          <i className="fa-solid fa-user text-[8px]" />
                          {name}
                          <button
                            type="button"
                            onClick={() => setForm((p) => ({ ...p, sharedWith: (p.sharedWith || []).filter((n) => n !== name) }))}
                            className="hover:text-destructive cursor-pointer ml-0.5"
                          >
                            <i className="fa-solid fa-xmark text-[8px]" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Member Selection List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-36 overflow-y-auto p-1 border border-border/80 rounded-lg bg-background">
                    {filteredMembers.length === 0 ? (
                      <div className="col-span-2 text-center py-3 text-[11px] text-muted-foreground">
                        No team members match search
                      </div>
                    ) : (
                      filteredMembers.map((m) => {
                        const isSelected = (form.sharedWith || []).includes(m.name);
                        return (
                          <div
                            key={m._id || m.name}
                            onClick={() => {
                              setForm((p) => {
                                const curr = p.sharedWith || [];
                                return {
                                  ...p,
                                  sharedWith: isSelected ? curr.filter((n) => n !== m.name) : [...curr, m.name],
                                };
                              });
                            }}
                            className={cn(
                              "flex items-center justify-between p-1.5 rounded-md border text-xs cursor-pointer transition-colors",
                              isSelected
                                ? "bg-primary/10 border-primary/40 text-foreground font-semibold"
                                : "border-transparent hover:bg-muted text-muted-foreground"
                            )}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[9px] font-bold text-foreground shrink-0">
                                {m.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <p className="text-[11px] truncate leading-tight">{m.name}</p>
                                {m.department && <p className="text-[9px] text-muted-foreground truncate leading-none">{m.department}</p>}
                              </div>
                            </div>
                            <i className={cn(isSelected ? "fa-solid fa-circle-check text-primary text-xs" : "fa-regular fa-circle text-muted-foreground/40 text-xs", "shrink-0 ml-1")} />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Link URL */}
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Link (URL)</label>
              <input
                className={fieldCls}
                value={form.link}
                onChange={(e) => set("link", e.target.value)}
                placeholder="https://docs.google.com/… or https://notion.so/…"
              />
            </div>

            {/* Review Frequency */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Review Frequency</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.reviewFrequency} onChange={(e) => set("reviewFrequency", e.target.value)}>
                {["Daily", "Weekly", "Monthly", "Quarterly", "As needed"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            {/* Last Updated */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Last Updated</label>
              <input type="date" className={fieldCls} value={form.lastUpdated} onChange={(e) => set("lastUpdated", e.target.value)} />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Notes / Description</label>
              <textarea
                className={cn(fieldCls, "h-16 py-2 resize-none")}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional notes, instructions, or access guidelines…"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-border bg-muted/10 shrink-0">
          <button onClick={onClose} disabled={saving} className="flex-1 h-9 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => {
              if (form.name.trim()) onSave(form);
            }}
            disabled={!form.name.trim() || saving}
            className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
          >
            {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-[10px]" />Saving…</> : <><i className="fa-solid fa-check text-[10px]" />Save Link</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function DriveLinksTab({
  links,
  loading,
  onAdd,
  onEdit,
  onDelete,
  autoOpenAdd,
  userName,
  isPrivileged,
  teamMembers = [],
}: {
  links: DriveLink[];
  loading: boolean;
  onAdd: (d: Omit<DriveLink, "id">) => Promise<void>;
  onEdit: (id: string, d: Omit<DriveLink, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  autoOpenAdd?: boolean;
  userName?: string;
  isPrivileged?: boolean;
  teamMembers?: TeamMemberOption[];
}) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterPlatform, setFilterPlatform] = useState("All");
  const [filterAccess, setFilterAccess] = useState("All");
  const [filterScope, setFilterScope] = useState("All");
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; item: DriveLink } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpenAdd) {
      setModal({ mode: "add" });
    }
  }, [autoOpenAdd]);

  const categories = useMemo(() => ["All", ...Array.from(new Set([...DRIVE_CATEGORIES, ...links.map((d) => d.category)].filter(Boolean)))], [links]);
  const platforms = useMemo(() => ["All", ...Array.from(new Set(links.map((d) => d.platform).filter(Boolean)))], [links]);
  const accessLevels = useMemo(() => ["All", ...Array.from(new Set(links.map((d) => d.accessLevel).filter(Boolean)))], [links]);

  const filtered = useMemo(() => links.filter((d) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      d.name.toLowerCase().includes(q) ||
      d.owner.toLowerCase().includes(q) ||
      (d.sharedWith && d.sharedWith.some((s) => s.toLowerCase().includes(q))) ||
      d.notes?.toLowerCase().includes(q);

    const matchesScope =
      filterScope === "All" ||
      (filterScope === "All Users" && (d.shareScope === "All Users" || (!d.shareScope && d.accessLevel?.includes("Team")))) ||
      (filterScope === "Specific Users" && d.shareScope === "Specific Users") ||
      (filterScope === "Private" && (d.shareScope === "Private" || d.accessLevel === "Admin Only"));

    return matchesSearch
      && (filterCat === "All" || d.category === filterCat)
      && (filterPlatform === "All" || d.platform === filterPlatform)
      && (filterAccess === "All" || d.accessLevel === filterAccess)
      && matchesScope;
  }), [links, search, filterCat, filterPlatform, filterAccess, filterScope]);

  const handleSave = async (data: Omit<DriveLink, "id">) => {
    setSaving(true);
    try {
      if (modal?.mode === "edit") await onEdit(modal.item.id, data);
      else await onAdd(data);
      setModal(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await onDelete(deleteId); setDeleteId(null); } finally { setDeleting(false); }
  };

  const copyLinkUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-4">
      {modal && (
        <DriveModal
          initial={modal.mode === "edit" ? modal.item : makeEmptyDrive(userName)}
          onSave={handleSave}
          onClose={() => !saving && setModal(null)}
          saving={saving}
          userName={userName}
          isPrivileged={isPrivileged}
          teamMembers={teamMembers}
          existingCategories={links.map((l) => l.category)}
        />
      )}
      {deleteId && (
        <ConfirmDialog
          title="Remove File Link"
          message="This will permanently remove this file link."
          onConfirm={handleDelete}
          onCancel={() => !deleting && setDeleteId(null)}
          loading={deleting}
        />
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files, owners, shared users…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={SELECT_CLS} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className={SELECT_CLS} value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>
            {platforms.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className={SELECT_CLS} value={filterScope} onChange={(e) => setFilterScope(e.target.value)}>
            <option value="All">All Audiences</option>
            <option value="All Users">🌐 All Users</option>
            <option value="Specific Users">👥 Specific Users</option>
            <option value="Private">🔒 Private (Only Me)</option>
          </select>
          <select className={SELECT_CLS} value={filterAccess} onChange={(e) => setFilterAccess(e.target.value)}>
            {accessLevels.map((a) => <option key={a}>{a}</option>)}
          </select>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
          >
            <i className="fa-solid fa-plus text-[10px]" /> Add Link
          </button>
        </div>
      </div>

      {/* Drive Links Data Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {["File / Resource Name", "Category", "Platform", "Link", "Owner", "Audience / Sharing", "Access Level", "Last Updated", "Notes", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={10} />) :
              filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-muted-foreground">
                    <i className="fa-solid fa-folder-open text-2xl mb-2 block opacity-30" />
                    <p className="text-xs">{links.length === 0 ? "No file links registered yet." : "No results match your filters."}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => {
                  const isOwner = userName && (row.owner || "").toLowerCase() === userName.toLowerCase();
                  const shareScope = row.shareScope || (row.accessLevel?.includes("Team") ? "All Users" : "Private");
                  const sharedCount = (row.sharedWith || []).length;

                  return (
                    <tr key={row.id} className={cn("border-b border-border/60 hover:bg-muted/30 transition-colors group", idx % 2 === 0 ? "" : "bg-muted/10")}>
                      <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap max-w-[180px] truncate" title={row.name}>
                        <span className="font-semibold text-foreground">{row.name}</span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.category || "—"}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <i className={cn(platformIcon(row.platform), "text-xs text-primary")} />
                          <span className="text-muted-foreground font-medium">{row.platform}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 max-w-[160px]">
                        {row.link ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 truncate font-medium text-[11px]"
                              title={row.link}
                            >
                              <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                              <span className="truncate">{row.link.replace(/^https?:\/\//, "").substring(0, 22)}…</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => copyLinkUrl(row.id, row.link)}
                              className="text-muted-foreground hover:text-primary cursor-pointer p-0.5"
                              title="Copy URL"
                            >
                              <i className={cn(copiedId === row.id ? "fa-solid fa-check text-emerald-500" : "fa-solid fa-copy text-[9px]")} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap font-medium">
                        <span className="text-foreground">{row.owner || "—"}</span>
                        {isOwner && <span className="ml-1 text-[9px] font-bold text-primary bg-primary/10 px-1 py-0.2 rounded">You</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {shareScope === "All Users" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <i className="fa-solid fa-globe text-[9px]" /> All Users
                          </span>
                        )}
                        {shareScope === "Specific Users" && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 cursor-pointer"
                            title={`Shared with: ${(row.sharedWith || []).join(", ") || "None"}`}
                          >
                            <i className="fa-solid fa-user-group text-[9px]" />
                            {sharedCount > 0 ? `${sharedCount} member${sharedCount !== 1 ? "s" : ""}` : "Specific"}
                          </span>
                        )}
                        {shareScope === "Private" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <i className="fa-solid fa-lock text-[9px]" /> Private
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={statusBadge(row.accessLevel?.includes("Edit") ? "Active" : "Pending")}>
                          {row.accessLevel || "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-[11px]">{row.lastUpdated || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground max-w-[150px] truncate" title={row.notes}>
                        {row.notes || "—"}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModal({ mode: "edit", item: row })}
                            className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Edit Link"
                          >
                            <i className="fa-solid fa-pen text-[9px]" />
                          </button>
                          <button
                            onClick={() => setDeleteId(row.id)}
                            className="w-6 h-6 rounded-md bg-muted hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-500 cursor-pointer"
                            title="Delete"
                          >
                            <i className="fa-solid fa-trash text-[9px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Access Tab ───────────────────────────────────────────────────────────────

const EMPTY_ACCESS = { tool: "", category: "", assignee: "", role: "", accessLevel: "Full Access", dateGranted: new Date().toISOString().slice(0, 10), status: "Active" as const };

function AccessModal({ initial, onSave, onClose, saving, teamMembers = [], existingCategories = [] }: {
  initial: Omit<AccessEntry, "id">;
  onSave: (d: Omit<AccessEntry, "id">) => void;
  onClose: () => void;
  saving?: boolean;
  teamMembers?: TeamMemberOption[];
  existingCategories?: string[];
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const fieldCls = "w-full h-8 rounded-lg border border-border bg-muted/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground";

  const allCategories = useMemo(() => {
    return Array.from(new Set([...ACCESS_CATEGORIES, ...existingCategories.filter(Boolean)]));
  }, [existingCategories]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><i className="fa-solid fa-key text-blue-500" />Grant / Edit Access</h3>
          <button onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Tool / System *</label><input className={fieldCls} value={form.tool} onChange={(e) => set("tool", e.target.value)} placeholder="e.g. Slack, GitHub" /></div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Category</label>
              <input list="access-categories-datalist" className={fieldCls} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Communication" />
              <datalist id="access-categories-datalist">
                {allCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Assignee *</label>
              <input
                list="access-assignees-datalist"
                className={fieldCls}
                value={form.assignee}
                onChange={(e) => {
                  const val = e.target.value;
                  const found = teamMembers.find((m) => m.name.toLowerCase() === val.toLowerCase());
                  setForm((p) => ({
                    ...p,
                    assignee: val,
                    role: p.role || found?.role || found?.department || "",
                  }));
                }}
                placeholder="Full name"
              />
              <datalist id="access-assignees-datalist">
                {teamMembers.map((m) => <option key={m._id || m.name} value={m.name}>{m.department ? `${m.name} (${m.department})` : m.name}</option>)}
              </datalist>
            </div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Role / Designation</label><input className={fieldCls} value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Admin, Editor, User…" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Access Level</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.accessLevel} onChange={(e) => set("accessLevel", e.target.value)}>
                {["Full Access", "Edit", "View Only", "Write", "Standard", "Host"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.status} onChange={(e) => set("status", e.target.value as AccessEntry["status"])}>
                {["Active", "Suspended", "Pending", "Revoked"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Date Granted</label><input type="date" className={fieldCls} value={form.dateGranted} onChange={(e) => set("dateGranted", e.target.value)} /></div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} disabled={saving} className="flex-1 h-9 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (form.tool.trim() && form.assignee.trim()) onSave(form); }} disabled={!form.tool.trim() || !form.assignee.trim() || saving} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5">
            {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-[10px]" />Saving…</> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessTab({ access, loading, onAdd, onEdit, onDelete, onToggleStatus, autoOpenAdd, teamMembers = [] }: {
  access: AccessEntry[]; loading: boolean;
  onAdd: (d: Omit<AccessEntry, "id">) => Promise<void>;
  onEdit: (id: string, d: Omit<AccessEntry, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleStatus: (id: string, current: AccessEntry["status"]) => Promise<void>;
  autoOpenAdd?: boolean;
  teamMembers?: TeamMemberOption[];
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; item: AccessEntry } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpenAdd) {
      setModal({ mode: "add" });
    }
  }, [autoOpenAdd]);

  const categories = useMemo(() => ["All", ...Array.from(new Set([...ACCESS_CATEGORIES, ...access.map((a) => a.category)].filter(Boolean)))], [access]);
  const filtered = useMemo(() => access.filter((a) => {
    const q = search.toLowerCase();
    return (!q || a.tool.toLowerCase().includes(q) || a.assignee.toLowerCase().includes(q) || a.role?.toLowerCase().includes(q))
      && (filterStatus === "All" || a.status === filterStatus)
      && (filterCat === "All" || a.category === filterCat);
  }), [access, search, filterStatus, filterCat]);

  const handleSave = async (data: Omit<AccessEntry, "id">) => {
    setSaving(true);
    try {
      if (modal?.mode === "edit") await onEdit(modal.item.id, data);
      else await onAdd(data);
      setModal(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await onDelete(deleteId); setDeleteId(null); } finally { setDeleting(false); }
  };

  const handleToggle = async (item: AccessEntry) => {
    setToggling(item.id);
    try { await onToggleStatus(item.id, item.status); } finally { setToggling(null); }
  };

  return (
    <div className="space-y-4">
      {modal && <AccessModal initial={modal.mode === "edit" ? modal.item : EMPTY_ACCESS} onSave={handleSave} onClose={() => !saving && setModal(null)} saving={saving} teamMembers={teamMembers} existingCategories={access.map((a) => a.category)} />}
      {deleteId && <ConfirmDialog title="Remove Access Record" message="This will permanently remove this access record." onConfirm={handleDelete} onCancel={() => !deleting && setDeleteId(null)} loading={deleting} />}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tools, people…" className="pl-8 h-8 text-xs" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={SELECT_CLS} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          <select className={SELECT_CLS} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>{["All", "Active", "Suspended", "Pending", "Revoked"].map((s) => <option key={s}>{s}</option>)}</select>
          <span className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={() => setModal({ mode: "add" })} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
            <i className="fa-solid fa-user-plus text-[10px]" /> Grant Access
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {["Tool / System", "Category", "Assignee", "Role", "Access Level", "Date Granted", "Status", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={8} />) :
              filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground"><i className="fa-solid fa-key text-2xl mb-2 block opacity-30" /><p className="text-xs">{access.length === 0 ? "No access records yet." : "No records match."}</p></td></tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={row.id} className={cn("border-b border-border/60 hover:bg-muted/30 transition-colors group", idx % 2 === 0 ? "" : "bg-muted/10")}>
                    <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{row.tool}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.category || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">{row.assignee.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}</span>
                        <span className="text-foreground">{row.assignee}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.role || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.accessLevel}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.dateGranted || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button onClick={() => handleToggle(row)} disabled={toggling === row.id} className="cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50" title="Click to toggle status">
                        {toggling === row.id ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-muted text-muted-foreground"><i className="fa-solid fa-circle-notch fa-spin text-[8px]" />…</span> : <span className={statusBadge(row.status)}>{row.status}</span>}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ mode: "edit", item: row })} className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer" title="Edit"><i className="fa-solid fa-pen text-[9px]" /></button>
                        <button onClick={() => setDeleteId(row.id)} className="w-6 h-6 rounded-md bg-muted hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-500 cursor-pointer" title="Delete"><i className="fa-solid fa-trash text-[9px]" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Subscriptions Tab ────────────────────────────────────────────────────────

const EMPTY_SUB = { tool: "", category: "", plan: "", costPerMonth: 0, seats: 1, renewalDate: "", owner: "", status: "Active" as const };

function SubModal({ initial, onSave, onClose, saving }: {
  initial: Omit<Subscription, "id">;
  onSave: (d: Omit<Subscription, "id">) => void;
  onClose: () => void;
  saving?: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [activeCycle, setActiveCycle] = useState<string>(() => {
    if (!initial.renewalDate) return "";
    return "Custom";
  });

  const set = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));
  const fieldCls = "w-full h-8 rounded-lg border border-border bg-muted/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground";

  const handleSelectCycle = (label: string, months: number) => {
    setActiveCycle(label);
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    const dateStr = d.toISOString().slice(0, 10);
    setForm((p) => ({
      ...p,
      renewalDate: dateStr,
      status: "Active",
    }));
  };

  const daysRemaining = useMemo(() => {
    if (!form.renewalDate) return null;
    const renewal = new Date(form.renewalDate);
    if (isNaN(renewal.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    renewal.setHours(0, 0, 0, 0);
    return Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [form.renewalDate]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><i className="fa-solid fa-credit-card text-violet-500" />Add / Edit Subscription</h3>
          <button onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Tool Name *</label>
              <input className={fieldCls} value={form.tool} onChange={(e) => set("tool", e.target.value)} placeholder="e.g. Slack Pro, GitHub Enterprise, Figma" />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Plan</label>
              <input className={fieldCls} value={form.plan} onChange={(e) => set("plan", e.target.value)} placeholder="Pro, Business, Enterprise, Team…" />
            </div>

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Cost / Month (₹ INR)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={cn(fieldCls, "pl-6")}
                  value={form.costPerMonth}
                  onChange={(e) => set("costPerMonth", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Seats</label>
              <input type="number" min="1" className={fieldCls} value={form.seats} onChange={(e) => set("seats", parseInt(e.target.value) || 1)} />
            </div>

            {/* Auto-calculating Billing Cycle & Renewal Date */}
            <div className="col-span-2 space-y-2 p-3 rounded-xl border border-border/80 bg-muted/30">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fa-solid fa-calendar-check text-primary text-[11px]" />
                  Billing Cycle Option
                </label>
                {daysRemaining !== null && (
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                    daysRemaining < 0
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : daysRemaining <= 7
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  )}>
                    {daysRemaining < 0 ? `Expired ${Math.abs(daysRemaining)}d ago` : daysRemaining === 0 ? "Expires Today" : `Expires in ${daysRemaining} day(s)`}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "1 Month", months: 1 },
                  { label: "3 Months", months: 3 },
                  { label: "6 Months", months: 6 },
                  { label: "1 Year", months: 12 },
                ].map((cycle) => (
                  <button
                    key={cycle.label}
                    type="button"
                    onClick={() => handleSelectCycle(cycle.label, cycle.months)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer text-center",
                      activeCycle === cycle.label
                        ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent"
                    )}
                  >
                    {cycle.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    className={fieldCls}
                    value={form.renewalDate}
                    onChange={(e) => {
                      setActiveCycle("Custom");
                      set("renewalDate", e.target.value);
                    }}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                    Status
                  </label>
                  <select
                    className={cn(fieldCls, "cursor-pointer")}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value as Subscription["status"])}
                  >
                    {["Active", "Expiring Soon", "Expired", "Cancelled"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} disabled={saving} className="flex-1 h-9 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (form.tool.trim()) onSave(form); }} disabled={!form.tool.trim() || saving} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5">
            {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-[10px]" />Saving…</> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionsTab({ subs, loading, onAdd, onEdit, onDelete, autoOpenAdd, teamMembers = [] }: {
  subs: Subscription[]; loading: boolean;
  onAdd: (d: Omit<Subscription, "id">) => Promise<void>;
  onEdit: (id: string, d: Omit<Subscription, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  autoOpenAdd?: boolean;
  teamMembers?: TeamMemberOption[];
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; item: Subscription } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (autoOpenAdd) {
      setModal({ mode: "add" });
    }
  }, [autoOpenAdd]);

  const categories = useMemo(() => ["All", ...Array.from(new Set([...SUB_CATEGORIES, ...subs.map((s) => s.category)].filter(Boolean)))], [subs]);
  const filtered = useMemo(() => subs.filter((s) => {
    const q = search.toLowerCase();
    return (!q || s.tool.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q))
      && (filterStatus === "All" || s.status === filterStatus)
      && (filterCat === "All" || s.category === filterCat);
  }), [subs, search, filterStatus, filterCat]);

  const monthlyTotal = filtered.filter((s) => s.status === "Active" || s.status === "Expiring Soon").reduce((a, s) => a + s.costPerMonth, 0);

  const handleSave = async (data: Omit<Subscription, "id">) => {
    setSaving(true);
    try {
      if (modal?.mode === "edit") await onEdit(modal.item.id, data);
      else await onAdd(data);
      setModal(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await onDelete(deleteId); setDeleteId(null); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      {modal && <SubModal initial={modal.mode === "edit" ? modal.item : EMPTY_SUB} onSave={handleSave} onClose={() => !saving && setModal(null)} saving={saving} />}
      {deleteId && <ConfirmDialog title="Remove Subscription" message="Remove this subscription from the tracker?" onConfirm={handleDelete} onCancel={() => !deleting && setDeleteId(null)} loading={deleting} />}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Monthly Spend</p><p className="text-xl font-bold text-foreground mt-1">{formatCurrency(monthlyTotal)}</p></div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Active</p><p className="text-xl font-bold text-emerald-500 mt-1">{subs.filter((s) => s.status === "Active").length}</p></div>
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Expiring Soon</p><p className="text-xl font-bold text-orange-500 mt-1">{subs.filter((s) => s.status === "Expiring Soon").length}</p></div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Expired / Cancelled</p><p className="text-xl font-bold text-red-500 mt-1">{subs.filter((s) => s.status === "Expired" || s.status === "Cancelled").length}</p></div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tools, owners…" className="pl-8 h-8 text-xs" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={SELECT_CLS} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          <select className={SELECT_CLS} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>{["All", "Active", "Expiring Soon", "Expired", "Cancelled"].map((s) => <option key={s}>{s}</option>)}</select>
          <span className="text-xs text-muted-foreground">{filtered.length} subscription{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={() => setModal({ mode: "add" })} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
            <i className="fa-solid fa-plus text-[10px]" /> Add Subscription
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {["Tool", "Category", "Plan", "Cost/Month", "Seats", "Renewal Date", "Owner", "Status", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={9} />) :
              filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground"><i className="fa-solid fa-box-open text-2xl mb-2 block opacity-30" /><p className="text-xs">{subs.length === 0 ? "No subscriptions yet." : "No results match."}</p></td></tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={row.id} className={cn("border-b border-border/60 hover:bg-muted/30 transition-colors group", idx % 2 === 0 ? "" : "bg-muted/10")}>
                    <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{row.tool}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.category || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.plan || "—"}</td>
                    <td className="px-3 py-2.5 font-semibold text-foreground whitespace-nowrap">{formatCurrency(row.costPerMonth)}</td>
                    <td className="px-3 py-2.5 text-muted-foreground text-center whitespace-nowrap">{row.seats}</td>
                    <td className={cn("px-3 py-2.5 whitespace-nowrap font-medium", (row.status === "Expiring Soon" || row.status === "Expired") ? "text-orange-500" : "text-muted-foreground")}>{row.renewalDate || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.owner || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><span className={statusBadge(row.status)}>{row.status}</span></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ mode: "edit", item: row })} className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer" title="Edit"><i className="fa-solid fa-pen text-[9px]" /></button>
                        <button onClick={() => setDeleteId(row.id)} className="w-6 h-6 rounded-md bg-muted hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-500 cursor-pointer" title="Delete"><i className="fa-solid fa-trash text-[9px]" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Asset Tag Generator & Smart Presets ──────────────────────────────────────
const TYPE_CODE: Record<string, string> = {
  Laptop: "LAP", Desktop: "DES", Monitor: "MON", Mobile: "MOB",
  Tablet: "TAB", Router: "RTR", Printer: "PRT", Other: "OTH",
};

const BRAND_PRESETS: Record<string, { brands: string[]; osDefaults: Record<string, string> }> = {
  Laptop: {
    brands: ["Apple", "Dell", "Lenovo", "HP", "Asus", "Acer", "Microsoft"],
    osDefaults: { Apple: "macOS 15 Sequoia", Dell: "Windows 11 Pro", Lenovo: "Ubuntu 24.04", HP: "Windows 11 Pro", Asus: "Windows 11 Pro" },
  },
  Desktop: {
    brands: ["Dell", "HP", "Apple", "Lenovo", "Custom Build"],
    osDefaults: { Apple: "macOS 15 Sequoia", Dell: "Windows 11 Pro", HP: "Windows 11 Pro" },
  },
  Monitor: {
    brands: ["LG", "Dell", "Samsung", "BenQ", "ASUS", "ViewSonic"],
    osDefaults: {},
  },
  Mobile: {
    brands: ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi"],
    osDefaults: { Apple: "iOS 18", Samsung: "Android 15", Google: "Android 15" },
  },
  Tablet: {
    brands: ["Apple", "Samsung", "Microsoft", "Lenovo"],
    osDefaults: { Apple: "iPadOS 18", Microsoft: "Windows 11" },
  },
  Router: {
    brands: ["Cisco", "TP-Link", "Ubiquiti", "MikroTik", "Netgear"],
    osDefaults: {},
  },
  Printer: {
    brands: ["HP", "Canon", "Epson", "Brother"],
    osDefaults: {},
  },
  Other: {
    brands: ["Logitech", "Sony", "Jabra", "Anker"],
    osDefaults: {},
  },
};

function generateAssetTag(type: string, existingDevices: Device[]): string {
  const code = TYPE_CODE[type] || "OTH";
  const prefix = `ACE-${code}-`;
  const nums = existingDevices
    .map((d) => d.assetTag)
    .filter((t) => t.startsWith(prefix))
    .map((t) => parseInt(t.replace(prefix, ""), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

const makeEmptyDevice = (assignedTo = "", department = "", assetTag = ""): Omit<Device, "id"> => ({
  assetTag,
  type: "Laptop",
  brand: "",
  modelName: "",
  serialNumber: "",
  specs: "",
  purchaseDate: "",
  warrantyExpiry: "",
  assignedTo,
  department,
  location: "HQ - Main Office",
  os: "",
  lastSeen: new Date().toISOString().slice(0, 10),
  condition: "Good",
  status: "In Use",
});

function DeviceModal({
  initial,
  onSave,
  onClose,
  saving,
  lockedAssignedTo,
  lockedDepartment,
  isEditing,
  teamMembers = [],
  nextAssetTags = {},
}: {
  initial: Omit<Device, "id">;
  onSave: (d: Omit<Device, "id">) => void;
  onClose: () => void;
  saving?: boolean;
  lockedAssignedTo?: string;
  lockedDepartment?: string;
  isEditing?: boolean;
  teamMembers?: TeamMemberOption[];
  nextAssetTags?: Record<string, string>;
}) {
  const [form, setForm] = useState(initial);
  const [isGeneratingTag, setIsGeneratingTag] = useState(false);
  const [showSpecs, setShowSpecs] = useState(Boolean(initial.serialNumber || initial.specs || initial.purchaseDate));
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const currentPresets = BRAND_PRESETS[form.type] || BRAND_PRESETS.Other;

  const handleTypeChange = async (newType: string) => {
    set("type", newType);
    if (!isEditing) {
      if (nextAssetTags[newType]) {
        set("assetTag", nextAssetTags[newType]);
      }
      setIsGeneratingTag(true);
      try {
        const res = await fetch(`/api/it/devices?nextTagForType=${encodeURIComponent(newType)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.nextTag) {
            setForm((p) => ({ ...p, type: newType, assetTag: data.nextTag }));
          }
        }
      } catch {
        // keep preloaded tag
      } finally {
        setIsGeneratingTag(false);
      }
    }
  };

  const handleBrandSelect = (brandName: string) => {
    const defaultOS = currentPresets.osDefaults[brandName] || form.os;
    setForm((p) => ({
      ...p,
      brand: brandName,
      os: p.os ? p.os : defaultOS,
    }));
  };

  const handleRefreshTag = async () => {
    if (isEditing) return;
    setIsGeneratingTag(true);
    try {
      const res = await fetch(`/api/it/devices?nextTagForType=${encodeURIComponent(form.type)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.nextTag) {
          set("assetTag", data.nextTag);
        }
      }
    } catch {
      // keep current
    } finally {
      setIsGeneratingTag(false);
    }
  };

  const fieldCls = "w-full h-8 rounded-lg border border-border bg-muted/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground";
  const readonlyCls = "w-full h-8 rounded-lg border border-border bg-muted/40 text-xs px-3 text-foreground font-semibold flex items-center cursor-not-allowed opacity-80";

  const departmentOptions = useMemo(() => {
    const fromTeam = teamMembers.map((m) => m.department).filter(Boolean) as string[];
    const defaults = ["Engineering", "Design", "Product", "Operations", "HR", "Marketing", "Sales", "Finance", "IT"];
    return Array.from(new Set([...defaults, ...fromTeam]));
  }, [teamMembers]);

  const locationPresets = [
    "HQ - Main Office",
    "HQ - Floor 1",
    "HQ - Floor 2",
    "HQ - IT Lab",
    "HQ - Server Room",
    "HQ - Storage Room",
    "Remote / WFH",
    "Branch Office",
    "Client Site",
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-150 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <i className="fa-solid fa-laptop text-sm" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {isEditing ? "Edit Hardware Asset" : "Register New Hardware Asset"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {isEditing ? `Updating asset tag: ${form.assetTag}` : "Auto-assigned unique asset identifier guaranteed by database"}
              </p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 space-y-3.5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {/* Asset Tag — auto-generated, read-only */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between mb-1">
                <span>Asset Tag</span>
                <span className="text-[9px] text-emerald-500 font-semibold flex items-center gap-1">
                  <i className="fa-solid fa-shield-halved text-[8px]" /> Auto-generated
                </span>
              </label>
              <div className="relative">
                <input
                  className={cn(fieldCls, "pr-8 font-mono font-bold text-primary tracking-wider")}
                  value={isGeneratingTag ? "Generating tag..." : form.assetTag}
                  readOnly
                  placeholder="Auto-generated"
                />
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={handleRefreshTag}
                    disabled={isGeneratingTag || saving}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                    title="Sync next available asset tag from database"
                  >
                    <i className={cn("fa-solid fa-arrows-rotate text-[10px]", isGeneratingTag && "fa-spin")} />
                  </button>
                ) : (
                  <i className="fa-solid fa-lock absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Device Type */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Type</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                {["Laptop", "Desktop", "Monitor", "Mobile", "Tablet", "Router", "Printer", "Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            {/* Brand with Quick Presets */}
            <div className="col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">Brand</label>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {currentPresets.brands.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => handleBrandSelect(b)}
                      className={cn(
                        "px-1.5 py-0.5 text-[9px] font-semibold rounded-md border transition-all cursor-pointer",
                        form.brand === b
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <input
                className={fieldCls}
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="e.g. Apple, Dell, Lenovo, HP…"
              />
            </div>

            {/* Model Name */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Model Name</label>
              <input
                className={fieldCls}
                value={form.modelName}
                onChange={(e) => set("modelName", e.target.value)}
                placeholder="e.g. MacBook Pro 14, XPS 15…"
              />
            </div>

            {/* Operating System */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Operating System</label>
              <input
                className={fieldCls}
                value={form.os}
                onChange={(e) => set("os", e.target.value)}
                placeholder="e.g. macOS 15, Windows 11 Pro, Ubuntu 24.04…"
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                Assigned To {lockedAssignedTo && <i className="fa-solid fa-circle-user text-primary text-[9px]" />}
              </label>
              {lockedAssignedTo ? (
                <div className={readonlyCls}>
                  <i className="fa-solid fa-user text-[9px] text-muted-foreground mr-1.5" />{lockedAssignedTo}
                </div>
              ) : (
                <>
                  <input
                    list="device-assignees-datalist"
                    className={fieldCls}
                    value={form.assignedTo}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = teamMembers.find((m) => m.name.toLowerCase() === val.toLowerCase());
                      setForm((p) => ({
                        ...p,
                        assignedTo: val,
                        department: (!lockedDepartment && found?.department) ? found.department : p.department,
                      }));
                    }}
                    placeholder="Search or enter full name"
                  />
                  <datalist id="device-assignees-datalist">
                    {teamMembers.map((m) => (
                      <option key={m._id || m.name} value={m.name}>
                        {m.department ? `${m.name} (${m.department})` : m.name}
                      </option>
                    ))}
                  </datalist>
                </>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 mb-1">
                Department {lockedDepartment && <i className="fa-solid fa-building text-primary text-[9px]" />}
              </label>
              {lockedDepartment ? (
                <div className={readonlyCls}>
                  <i className="fa-solid fa-sitemap text-[9px] text-muted-foreground mr-1.5" />{lockedDepartment}
                </div>
              ) : (
                <>
                  <input
                    list="device-departments-datalist"
                    className={fieldCls}
                    value={form.department}
                    onChange={(e) => set("department", e.target.value)}
                    placeholder="IT, Design, Operations, HR…"
                  />
                  <datalist id="device-departments-datalist">
                    {departmentOptions.map((d) => <option key={d} value={d} />)}
                  </datalist>
                </>
              )}
            </div>

            {/* Physical Location */}
            <div className="col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <i className="fa-solid fa-location-dot text-primary text-[9px]" /> Physical Asset Location
                </label>
                <span className="text-[10px] text-muted-foreground">Quick select or type custom</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                {locationPresets.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => set("location", l)}
                    className={cn(
                      "px-2 py-0.5 text-[9px] font-semibold rounded-md border transition-all cursor-pointer whitespace-nowrap shrink-0",
                      form.location === l
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-muted/60 text-muted-foreground border-border hover:border-primary/50"
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <input
                list="device-locations-datalist"
                className={fieldCls}
                value={form.location || ""}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. HQ - Floor 2, Remote / WFH, Server Room…"
              />
              <datalist id="device-locations-datalist">
                {locationPresets.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>

            {/* Condition */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Condition</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.condition} onChange={(e) => set("condition", e.target.value as Device["condition"])}>
                {["Excellent", "Good", "Fair", "Poor"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.status} onChange={(e) => set("status", e.target.value as Device["status"])}>
                {["In Use", "Available", "In Repair", "Retired"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Toggle Hardware Specs & Warranty Section */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowSpecs(!showSpecs)}
              className="text-xs text-primary font-semibold flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <i className={cn("fa-solid fa-chevron-right text-[9px] transition-transform", showSpecs && "rotate-90")} />
              {showSpecs ? "Hide Hardware Specs & Warranty" : "+ Add Hardware Specs, Serial No. & Warranty"}
            </button>

            {showSpecs && (
              <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Serial / IMEI Number</label>
                  <input
                    className={fieldCls}
                    value={form.serialNumber || ""}
                    onChange={(e) => set("serialNumber", e.target.value)}
                    placeholder="e.g. FVFG90J4Q05D"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Hardware Specs</label>
                  <input
                    className={fieldCls}
                    value={form.specs || ""}
                    onChange={(e) => set("specs", e.target.value)}
                    placeholder="e.g. 16GB RAM, 512GB SSD, M3"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Purchase Date</label>
                  <input
                    type="date"
                    className={fieldCls}
                    value={form.purchaseDate || ""}
                    onChange={(e) => set("purchaseDate", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Warranty Expiry</label>
                  <input
                    type="date"
                    className={fieldCls}
                    value={form.warrantyExpiry || ""}
                    onChange={(e) => set("warrantyExpiry", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-border shrink-0 bg-muted/10">
          <button onClick={onClose} disabled={saving} className="flex-1 h-9 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => {
              const finalForm = {
                ...form,
                assignedTo: lockedAssignedTo || form.assignedTo,
                department: lockedDepartment || form.department,
              };
              if (finalForm.assetTag.trim()) onSave(finalForm);
            }}
            disabled={!form.assetTag.trim() || saving}
            className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm">
            {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-[10px]" />Saving…</> : <><i className="fa-solid fa-check text-[10px]" />Save Device</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const getLocationMeta = (loc?: string) => {
  const l = (loc || "HQ - Main Office").toLowerCase();
  if (l.includes("remote") || l.includes("wfh") || l.includes("home")) {
    return { icon: "fa-solid fa-house-laptop", color: "text-amber-500", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", label: loc || "Remote / WFH" };
  }
  if (l.includes("server")) {
    return { icon: "fa-solid fa-server", color: "text-violet-500", bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30", label: loc || "HQ - Server Room" };
  }
  if (l.includes("lab") || l.includes("test")) {
    return { icon: "fa-solid fa-flask-vial", color: "text-emerald-500", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", label: loc || "HQ - IT Lab" };
  }
  if (l.includes("storage") || l.includes("warehouse")) {
    return { icon: "fa-solid fa-boxes-stacked", color: "text-slate-400", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30", label: loc || "HQ - Storage Room" };
  }
  if (l.includes("branch")) {
    return { icon: "fa-solid fa-code-branch", color: "text-sky-500", bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30", label: loc || "Branch Office" };
  }
  return { icon: "fa-solid fa-building", color: "text-blue-500", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30", label: loc || "HQ - Main Office" };
};

const getWarrantyMeta = (expiry?: string) => {
  if (!expiry) return null;
  const now = new Date();
  const exp = new Date(expiry);
  if (isNaN(exp.getTime())) return null;
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { label: "Expired Warranty", cls: "bg-rose-500/10 text-rose-500 border-rose-500/30", icon: "fa-solid fa-triangle-exclamation" };
  }
  if (diffDays <= 45) {
    return { label: `${diffDays}d warranty left`, cls: "bg-amber-500/10 text-amber-500 border-amber-500/30", icon: "fa-solid fa-clock" };
  }
  return { label: "Active Warranty", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", icon: "fa-solid fa-shield-check" };
};

function DevicesTab({
  devices,
  allDevices,
  nextAssetTags = {},
  loading,
  onAdd,
  onEdit,
  onDelete,
  autoOpenAdd,
  userName,
  userDepartment,
  isPrivileged,
  teamMembers = [],
}: {
  devices: Device[];        // filtered (user-scoped) — for display
  allDevices: Device[];     // full list — for asset tag generation
  nextAssetTags?: Record<string, string>;
  loading: boolean;
  onAdd: (d: Omit<Device, "id">) => Promise<void>;
  onEdit: (id: string, d: Omit<Device, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  autoOpenAdd?: boolean;
  userName?: string;
  userDepartment?: string;
  isPrivileged?: boolean;
  teamMembers?: TeamMemberOption[];
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterCondition, setFilterCondition] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; item: Device } | null>(null);
  const [inspectDevice, setInspectDevice] = useState<Device | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [badgeDevice, setBadgeDevice] = useState<Device | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedTag, setCopiedTag] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [relocatingId, setRelocatingId] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpenAdd) {
      setModal({ mode: "add" });
    }
  }, [autoOpenAdd]);

  const types = useMemo(() => ["All", ...Array.from(new Set(devices.map((d) => d.type).filter(Boolean)))], [devices]);
  const locations = useMemo(() => ["All", ...Array.from(new Set(devices.map((d) => d.location || "HQ - Main Office").filter(Boolean)))], [devices]);
  const conditions = useMemo(() => ["All", "Excellent", "Good", "Fair", "Poor"], []);

  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    devices.forEach((d) => {
      const loc = d.location || "HQ - Main Office";
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return counts;
  }, [devices]);

  const inUseCount = devices.filter((d) => d.status === "In Use").length;
  const availableCount = devices.filter((d) => d.status === "Available").length;
  const inRepairCount = devices.filter((d) => d.status === "In Repair").length;
  const retiredCount = devices.filter((d) => d.status === "Retired").length;
  const expiringWarrantyCount = devices.filter((d) => {
    if (!d.warrantyExpiry) return false;
    const diff = Math.ceil((new Date(d.warrantyExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 45;
  }).length;

  const filtered = useMemo(() => devices.filter((d) => {
    const q = search.toLowerCase();
    const loc = d.location || "HQ - Main Office";
    const matchesSearch = !q ||
      d.assetTag.toLowerCase().includes(q) ||
      d.brand?.toLowerCase().includes(q) ||
      d.modelName?.toLowerCase().includes(q) ||
      d.assignedTo?.toLowerCase().includes(q) ||
      d.department?.toLowerCase().includes(q) ||
      loc.toLowerCase().includes(q) ||
      (d.serialNumber && d.serialNumber.toLowerCase().includes(q));

    return matchesSearch
      && (filterType === "All" || d.type === filterType)
      && (filterStatus === "All" || d.status === filterStatus)
      && (filterLocation === "All" || loc === filterLocation)
      && (filterCondition === "All" || d.condition === filterCondition);
  }), [devices, search, filterType, filterStatus, filterLocation, filterCondition]);

  const handleSave = async (data: Omit<Device, "id">) => {
    setSaving(true);
    try {
      if (modal?.mode === "edit") await onEdit(modal.item.id, data);
      else await onAdd(data);
      setModal(null);
      if (inspectDevice && modal?.mode === "edit" && modal.item.id === inspectDevice.id) {
        setInspectDevice({ ...data, id: inspectDevice.id });
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await onDelete(deleteId);
      if (inspectDevice?.id === deleteId) setInspectDevice(null);
      setDeleteId(null);
    } finally { setDeleting(false); }
  };

  const handleQuickStatusChange = async (device: Device, newStatus: Device["status"]) => {
    try {
      await onEdit(device.id, { ...device, status: newStatus });
      if (inspectDevice?.id === device.id) {
        setInspectDevice({ ...inspectDevice, status: newStatus });
      }
    } catch {
      // handled by parent
    }
  };

  const handleQuickRelocate = async (device: Device, newLocation: string) => {
    try {
      await onEdit(device.id, { ...device, location: newLocation });
      if (inspectDevice?.id === device.id) {
        setInspectDevice({ ...inspectDevice, location: newLocation });
      }
      setRelocatingId(null);
    } catch {
      // handled by parent
    }
  };

  const copyAssetTag = (tag: string, id?: string) => {
    navigator.clipboard.writeText(tag);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    } else {
      setCopiedTag(true);
      setTimeout(() => setCopiedTag(false), 2500);
    }
  };

  const copySerial = (serial: string) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerial(true);
    setTimeout(() => setCopiedSerial(false), 2500);
  };

  const QUICK_LOCATIONS = [
    "HQ - Main Office",
    "HQ - Floor 1",
    "HQ - Floor 2",
    "HQ - IT Lab",
    "HQ - Server Room",
    "HQ - Storage Room",
    "Remote / WFH",
    "Dwarka Delhi",
    "Branch Office",
  ];

  return (
    <div className="space-y-4">
      {modal && (
        <DeviceModal
          initial={modal.mode === "edit" ? modal.item : makeEmptyDevice(
            isPrivileged ? "" : (userName || ""),
            isPrivileged ? "" : (userDepartment || ""),
            modal.mode === "add" ? (nextAssetTags["Laptop"] || generateAssetTag("Laptop", allDevices)) : ""
          )}
          isEditing={modal.mode === "edit"}
          lockedAssignedTo={(!isPrivileged && modal.mode === "add") ? (userName || undefined) : undefined}
          lockedDepartment={(!isPrivileged && modal.mode === "add") ? (userDepartment || undefined) : undefined}
          onSave={handleSave}
          onClose={() => !saving && setModal(null)}
          saving={saving}
          teamMembers={teamMembers}
          nextAssetTags={nextAssetTags}
        />
      )}
      {deleteId && <ConfirmDialog title="Remove Device" message="Permanently remove this device from inventory?" onConfirm={handleDelete} onCancel={() => !deleting && setDeleteId(null)} loading={deleting} />}

      {/* ─── Device Inspection & Telemetry Modal ─── */}
      {inspectDevice && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="relative p-5 border-b border-border bg-gradient-to-r from-primary/10 via-violet-500/10 to-blue-500/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center text-xl text-primary shadow-sm">
                    <i className={deviceIcon(inspectDevice.type)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base text-foreground tracking-wider">{inspectDevice.assetTag}</span>
                      <span className={statusBadge(inspectDevice.condition)}>{inspectDevice.condition}</span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground mt-0.5">{inspectDevice.brand} {inspectDevice.modelName}</h3>
                  </div>
                </div>
                <button onClick={() => setInspectDevice(null)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1">
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <i className="fa-solid fa-location-dot text-primary" /> Physical Location
                  </span>
                  {(() => {
                    const locMeta = getLocationMeta(inspectDevice.location);
                    return (
                      <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border", locMeta.bg)}>
                        <i className={locMeta.icon} />
                        {locMeta.label}
                      </span>
                    );
                  })()}
                </div>
                
                <div className="pt-2 border-t border-border/60">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5">Quick Relocate Asset:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_LOCATIONS.map((loc) => {
                      const isCurrent = (inspectDevice.location || "HQ - Main Office") === loc;
                      return (
                        <button
                          key={loc}
                          type="button"
                          disabled={isCurrent}
                          onClick={() => handleQuickRelocate(inspectDevice, loc)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer flex items-center gap-1",
                            isCurrent
                              ? "bg-primary text-primary-foreground border-primary opacity-90 cursor-default"
                              : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground hover:bg-muted/80"
                          )}
                        >
                          <i className={getLocationMeta(loc).icon} />
                          {loc}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">Assigned Custodian</span>
                  <div className="font-bold text-foreground mt-1 flex items-center gap-1.5">
                    <i className="fa-solid fa-user-tie text-primary text-[11px]" />
                    {inspectDevice.assignedTo || "Unassigned"}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">{inspectDevice.department || "General"}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">Operating System</span>
                  <div className="font-bold text-foreground mt-1 flex items-center gap-1.5">
                    <i className="fa-solid fa-microchip text-primary text-[11px]" />
                    {inspectDevice.os || "N/A"}
                  </div>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">Last Seen: {inspectDevice.lastSeen || "Today"}</span>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">Serial / IMEI</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono font-semibold text-foreground truncate">{inspectDevice.serialNumber || "—"}</span>
                    {inspectDevice.serialNumber && (
                      <button
                        onClick={() => copySerial(inspectDevice.serialNumber!)}
                        className="text-muted-foreground hover:text-primary cursor-pointer ml-1"
                        title="Copy Serial"
                      >
                        <i className={cn(copiedSerial ? "fa-solid fa-check text-emerald-500" : "fa-solid fa-copy text-[10px]")} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block">Warranty Status</span>
                  {(() => {
                    const wMeta = getWarrantyMeta(inspectDevice.warrantyExpiry);
                    if (!wMeta) return <span className="font-medium text-muted-foreground mt-1 block">Not logged</span>;
                    return (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", wMeta.cls)}>
                          <i className={wMeta.icon} />
                          {wMeta.label}
                        </span>
                      </div>
                    );
                  })()}
                  {inspectDevice.warrantyExpiry && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5">Expires: {inspectDevice.warrantyExpiry}</span>
                  )}
                </div>
              </div>

              {inspectDevice.specs && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Hardware Specifications</span>
                  <p className="text-xs text-foreground font-medium">{inspectDevice.specs}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 p-4 border-t border-border bg-muted/20 shrink-0">
              <button
                type="button"
                onClick={() => setBadgeDevice(inspectDevice)}
                className="h-8 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <i className="fa-solid fa-print text-xs text-primary" /> Print Label
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const d = inspectDevice;
                    setInspectDevice(null);
                    setModal({ mode: "edit", item: d });
                  }}
                  className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <i className="fa-solid fa-pen text-xs" /> Edit Record
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(inspectDevice.id)}
                  className="h-8 px-2.5 rounded-lg border border-destructive/30 hover:bg-destructive/10 text-destructive text-xs font-semibold cursor-pointer"
                  title="Delete Device"
                >
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Asset Badge / QR Modal */}
      {badgeDevice && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-qrcode text-primary text-base" />
                <h4 className="text-sm font-bold text-foreground">Hardware Asset Tag</h4>
              </div>
              <button onClick={() => setBadgeDevice(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-muted/40 border-2 border-dashed border-primary/30 text-center space-y-3 print:border-solid">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                <span>NexAce IT Asset</span>
                <span>{badgeDevice.type}</span>
              </div>
              
              <div className="bg-background py-3 px-2 rounded-lg border border-border flex flex-col items-center justify-center">
                <div className="font-mono text-xl font-black text-primary tracking-widest">
                  {badgeDevice.assetTag}
                </div>
                <div className="flex gap-[2px] h-6 items-end mt-2 opacity-80">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "bg-foreground",
                        i % 4 === 0 ? "w-1 h-6" : i % 2 === 0 ? "w-[1px] h-5" : "w-[2px] h-6"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="text-left space-y-1 text-xs pt-1">
                <p className="font-bold text-foreground truncate">{badgeDevice.brand} {badgeDevice.modelName}</p>
                <p className="text-muted-foreground text-[11px]">
                  Assigned: <strong className="text-foreground font-semibold">{badgeDevice.assignedTo || "Unassigned"}</strong> ({badgeDevice.department || "General"})
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <i className="fa-solid fa-location-dot text-primary text-[10px]" />
                  Location: <span className="text-foreground font-medium">{badgeDevice.location || "HQ - Main Office"}</span>
                </p>
                {badgeDevice.serialNumber && (
                  <p className="text-[10px] font-mono text-muted-foreground">
                    S/N: <span className="text-foreground">{badgeDevice.serialNumber}</span>
                  </p>
                )}
                {badgeDevice.specs && (
                  <p className="text-[10px] text-muted-foreground italic">
                    Specs: {badgeDevice.specs}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyAssetTag(badgeDevice.assetTag)}
                className="flex-1 h-8 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer flex items-center justify-center gap-1.5"
              >
                <i className={cn(copiedTag ? "fa-solid fa-check text-emerald-500" : "fa-solid fa-copy text-xs")} />
                {copiedTag ? "Tag Copied!" : "Copy Tag"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <i className="fa-solid fa-print text-xs" />
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Premium KPI Stat Card Ribbon ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Fleet", count: devices.length, filter: "All", icon: "fa-solid fa-laptop", color: "text-primary", bg: "from-primary/10 to-primary/5", border: "border-primary/20", sub: "All registered assets" },
          { label: "In Active Use", count: inUseCount, filter: "In Use", icon: "fa-solid fa-user-check", color: "text-emerald-500", bg: "from-emerald-500/10 to-emerald-500/5", border: "border-emerald-500/20", sub: `${devices.length > 0 ? Math.round((inUseCount / devices.length) * 100) : 0}% of inventory` },
          { label: "Available Ready", count: availableCount, filter: "Available", icon: "fa-solid fa-boxes-stacked", color: "text-blue-500", bg: "from-blue-500/10 to-blue-500/5", border: "border-blue-500/20", sub: "Ready for deployment" },
          { label: "In Repair", count: inRepairCount, filter: "In Repair", icon: "fa-solid fa-wrench", color: "text-amber-500", bg: "from-amber-500/10 to-amber-500/5", border: "border-amber-500/20", sub: "Under maintenance" },
          { label: "Retired / Scrap", count: retiredCount, filter: "Retired", icon: "fa-solid fa-box-archive", color: "text-slate-400", bg: "from-slate-500/10 to-slate-500/5", border: "border-slate-500/20", sub: "Decommissioned" },
        ].map((card) => {
          const isActive = filterStatus === card.filter || (card.filter === "All" && filterStatus === "All");
          return (
            <div
              key={card.label}
              onClick={() => setFilterStatus(card.filter)}
              className={cn(
                "relative p-3.5 rounded-xl border bg-gradient-to-br transition-all cursor-pointer group shadow-2xs hover:shadow-md",
                card.bg,
                isActive ? "ring-2 ring-primary border-primary shadow-sm" : "border-border hover:border-primary/40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.label}
                </span>
                <i className={cn(card.icon, card.color, "text-xs group-hover:scale-110 transition-transform")} />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-black text-foreground tabular-nums tracking-tight">{card.count}</span>
                <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[90px]">{card.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Location Distribution Ribbon ─── */}
      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1.5 px-2">
          <i className="fa-solid fa-location-dot text-primary text-xs" /> Locations:
        </span>
        <button
          onClick={() => setFilterLocation("All")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5",
            filterLocation === "All"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
          )}
        >
          <span>All Locations</span>
          <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-bold", filterLocation === "All" ? "bg-black/20 text-white" : "bg-muted text-muted-foreground")}>
            {devices.length}
          </span>
        </button>
        {Object.entries(locationCounts).map(([loc, count]) => {
          const locMeta = getLocationMeta(loc);
          const isSelected = filterLocation === loc;
          return (
            <button
              key={loc}
              onClick={() => setFilterLocation(isSelected ? "All" : loc)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : cn("bg-background text-foreground border-border hover:border-primary/50", locMeta.bg)
              )}
            >
              <i className={cn(locMeta.icon, isSelected ? "text-primary-foreground" : locMeta.color, "text-xs")} />
              <span className="truncate">{loc}</span>
              <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-bold", isSelected ? "bg-black/20 text-white" : "bg-muted text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Search, Filters & View Mode Switcher ─── */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-start sm:items-center justify-between flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search asset tag, model, serial, user, location…"
            className="pl-8 pr-7 h-8 text-xs bg-card"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select className={SELECT_CLS} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {types.map((t) => <option key={t} value={t}>{t === "All" ? "All Types" : t}</option>)}
          </select>
          <select className={SELECT_CLS} value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
            {locations.map((l) => <option key={l} value={l}>{l === "All" ? "All Locations" : l}</option>)}
          </select>
          <select className={SELECT_CLS} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            {["All", "In Use", "Available", "In Repair", "Retired"].map((s) => <option key={s} value={s}>{s === "All" ? "All Statuses" : s}</option>)}
          </select>
          <select className={SELECT_CLS} value={filterCondition} onChange={(e) => setFilterCondition(e.target.value)}>
            {conditions.map((c) => <option key={c} value={c}>{c === "All" ? "All Conditions" : c}</option>)}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/40">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "h-7 w-7 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer",
                viewMode === "table" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              )}
              title="Table View"
            >
              <i className="fa-solid fa-table-list" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "h-7 w-7 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer",
                viewMode === "grid" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
              )}
              title="Hardware Grid Cards"
            >
              <i className="fa-solid fa-grip" />
            </button>
          </div>

          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{filtered.length} device{filtered.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-sm hover:shadow"
          >
            <i className="fa-solid fa-plus text-[10px]" /> Register Device
          </button>
        </div>
      </div>

      {/* ─── Main Content View (Table vs Cards) ─── */}
      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden bg-card/40">
          <table className="w-full text-xs">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={10} />
              ))}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-border bg-card/40">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground/60 text-xl">
            <i className="fa-solid fa-laptop" />
          </div>
          <h4 className="text-sm font-bold text-foreground">No hardware devices found</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {devices.length === 0 ? "No hardware devices have been registered yet. Click 'Register Device' to add an asset." : "No devices match your active filters or search term."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* ─── Hardware Grid Cards View ─── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filtered.map((d) => {
            const locMeta = getLocationMeta(d.location);
            const wMeta = getWarrantyMeta(d.warrantyExpiry);
            return (
              <div
                key={d.id}
                className="group relative p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Icon + Asset Tag + Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-lg shrink-0 group-hover:scale-105 transition-transform">
                        <i className={deviceIcon(d.type)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyAssetTag(d.assetTag, d.id)}
                            className="font-mono font-bold text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            title="Copy Asset Tag"
                          >
                            <span>{d.assetTag}</span>
                            <i className={cn(copiedId === d.id ? "fa-solid fa-check text-emerald-500" : "fa-solid fa-copy text-[9px] opacity-0 group-hover:opacity-100")} />
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium">{d.type}</p>
                      </div>
                    </div>
                    <span className={statusBadge(d.status)}>{d.status}</span>
                  </div>

                  {/* Brand & Model */}
                  <h4 className="text-xs font-bold text-foreground truncate">{d.brand} {d.modelName}</h4>
                  {d.specs && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{d.specs}</p>}

                  {/* Custodian & Department */}
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                        {(d.assignedTo || "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-[11px] font-semibold text-foreground truncate leading-tight">{d.assignedTo || "Unassigned"}</p>
                        <p className="text-[9px] text-muted-foreground truncate leading-none">{d.department || "General"}</p>
                      </div>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0", statusBadge(d.condition))}>
                      {d.condition}
                    </span>
                  </div>

                  {/* Location & Warranty Pills */}
                  <div className="mt-2.5 flex items-center justify-between gap-1 flex-wrap">
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border truncate max-w-[130px]", locMeta.bg)}>
                      <i className={cn(locMeta.icon, "text-[9px]")} />
                      <span className="truncate">{locMeta.label}</span>
                    </span>

                    {wMeta ? (
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border truncate", wMeta.cls)}>
                        <i className={cn(wMeta.icon, "text-[9px]")} />
                        <span>{wMeta.label}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No warranty</span>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-3.5 pt-2.5 border-t border-border flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setInspectDevice(d)}
                    className="flex-1 h-7 rounded-lg bg-muted/60 hover:bg-muted text-foreground text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <i className="fa-solid fa-eye text-[10px] text-primary" /> Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => setBadgeDevice(d)}
                    className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs cursor-pointer"
                    title="Print Label"
                  >
                    <i className="fa-solid fa-qrcode" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "edit", item: d })}
                    className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs cursor-pointer"
                    title="Edit"
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(d.id)}
                    className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center text-xs cursor-pointer"
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── Enhanced Data Table View ─── */
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Asset Tag", "Type", "Brand / Model", "Assigned Custodian", "Dept.", "Physical Location", "Warranty", "Condition", "Status", ""].map((h) => (
                  <th key={h} className="text-left px-3.5 py-3 font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const locMeta = getLocationMeta(row.location);
                const wMeta = getWarrantyMeta(row.warrantyExpiry);
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-border/50 hover:bg-muted/30 transition-colors group",
                      idx % 2 === 0 ? "bg-card" : "bg-muted/5"
                    )}
                  >
                    {/* Asset Tag */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectDevice(row)}
                          className="font-mono font-bold text-primary hover:underline flex items-center gap-1.5 cursor-pointer text-xs"
                          title="Click to inspect asset details"
                        >
                          <i className="fa-solid fa-laptop-code text-[10px] opacity-70 group-hover:opacity-100" />
                          <span>{row.assetTag}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => copyAssetTag(row.assetTag, row.id)}
                          className="text-muted-foreground hover:text-primary cursor-pointer p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy Asset Tag"
                        >
                          <i className={cn(copiedId === row.id ? "fa-solid fa-check text-emerald-500" : "fa-solid fa-copy text-[9px]")} />
                        </button>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground font-semibold">
                        <i className={cn(deviceIcon(row.type), "text-xs text-primary/80")} />
                        <span>{row.type}</span>
                      </span>
                    </td>

                    {/* Brand / Model */}
                    <td className="px-3.5 py-2.5 text-foreground whitespace-nowrap font-medium">
                      <div className="font-bold hover:text-primary cursor-pointer text-xs" onClick={() => setInspectDevice(row)}>
                        {row.brand} {row.modelName}
                      </div>
                      {row.specs && <div className="text-[10px] text-muted-foreground font-normal truncate max-w-[150px]">{row.specs}</div>}
                    </td>

                    {/* Assigned Custodian */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {(row.assignedTo || "U").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">{row.assignedTo || "Unassigned"}</span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap font-medium">{row.department || "—"}</td>

                    {/* Physical Location with Inline Quick Relocate Dropdown */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={() => setRelocatingId(relocatingId === row.id ? null : row.id)}
                          className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer hover:shadow-xs transition-all", locMeta.bg)}
                          title="Click to relocate device"
                        >
                          <i className={cn(locMeta.icon, locMeta.color)} />
                          <span>{locMeta.label}</span>
                          <i className="fa-solid fa-chevron-down text-[8px] opacity-60 ml-0.5" />
                        </button>

                        {relocatingId === row.id && (
                          <div className="absolute left-0 top-full mt-1.5 z-30 w-48 bg-card border border-border rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95">
                            <p className="text-[9px] font-bold text-muted-foreground uppercase px-2 py-1 flex items-center gap-1">
                              <i className="fa-solid fa-arrows-split-up-and-left text-primary" /> Relocate Asset
                            </p>
                            {QUICK_LOCATIONS.map((ql) => (
                              <button
                                key={ql}
                                type="button"
                                onClick={() => handleQuickRelocate(row, ql)}
                                className={cn(
                                  "w-full text-left px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5",
                                  (row.location || "HQ - Main Office") === ql
                                    ? "bg-primary/15 text-primary"
                                    : "hover:bg-muted text-foreground"
                                )}
                              >
                                <i className={cn(getLocationMeta(ql).icon, "text-[10px]")} />
                                <span className="truncate">{ql}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Warranty */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      {wMeta ? (
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border", wMeta.cls)}>
                          <i className={wMeta.icon} />
                          {wMeta.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>

                    {/* Condition */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", statusBadge(row.condition))}>
                        {row.condition}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <select
                        value={row.status}
                        onChange={(e) => handleQuickStatusChange(row, e.target.value as Device["status"])}
                        className={cn(
                          "h-6 text-[10px] font-bold rounded-full px-2 py-0.5 border cursor-pointer focus:outline-none transition-all",
                          row.status === "In Use" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" :
                          row.status === "Available" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30" :
                          row.status === "In Repair" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                          "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30"
                        )}
                      >
                        {["In Use", "Available", "In Repair", "Retired"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    {/* Action Toolbar */}
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setInspectDevice(row)}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                          title="Inspect Telemetry"
                        >
                          <i className="fa-solid fa-eye text-[10px]" />
                        </button>
                        <button
                          onClick={() => setBadgeDevice(row)}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                          title="Print Label"
                        >
                          <i className="fa-solid fa-qrcode text-[10px]" />
                        </button>
                        <button
                          onClick={() => setModal({ mode: "edit", item: row })}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen text-[10px]" />
                        </button>
                        <button
                          onClick={() => setDeleteId(row.id)}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-500 cursor-pointer shadow-2xs"
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash text-[10px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Invoices Tab ─────────────────────────────────────────────────────────────

const EMPTY_INVOICE: Omit<Invoice, "id"> = {
  invoiceNo: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  customerNo: "32321",
  businessName: "Hencework",
  businessAddress: "4747, Pearl Street\nRainy Day Drive, Washington DC 42156",
  businessEmail: "jampack_01@hencework.com",
  billedToName: "Supernova consultant",
  billedToAddress: "Sycamore Street\nSan Antonio Valley, CA 34668",
  billedToEmail: "thompson_peter@super.co",
  shipToAddress: "",
  items: [
    { description: "IT Infrastructure Consultancy", quantity: 1, unitPrice: 1500, amount: 1500 },
  ],
  subtotal: 1500,
  taxRate: 10,
  taxAmount: 180,
  total: 1180,
  currency: "INR",
  status: "Draft",
  notes: "Payment due upon receipt.",
};

function InvoiceModal({ initial, onSave, onClose, saving }: { initial: Omit<Invoice, "id">; onSave: (d: Omit<Invoice, "id">) => void; onClose: () => void; saving?: boolean }) {
  const [form, setForm] = useState(initial);
  const [items, setItems] = useState<InvoiceItem[]>(initial.items || []);

  const setFormKey = (k: keyof typeof form, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const updateItem = (index: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: val };
    if (field === "quantity" || field === "unitPrice") {
      current.amount = (Number(current.quantity) || 0) * (Number(current.unitPrice) || 0);
    }
    updated[index] = current;
    setItems(updated);
    recalcTotal(updated, form.taxRate);
  };

  const addItem = () => {
    const updated = [...items, { description: "", quantity: 1, unitPrice: 0, amount: 0 }];
    setItems(updated);
    recalcTotal(updated, form.taxRate);
  };

  const removeItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    recalcTotal(updated, form.taxRate);
  };

  const recalcTotal = (newItems: InvoiceItem[], taxRate: number) => {
    const sub = newItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const tax = (sub * (Number(taxRate) || 0)) / 100;
    const tot = sub + tax;
    setForm((p) => ({ ...p, items: newItems, subtotal: sub, taxAmount: tax, total: tot }));
  };

  const handleTaxChange = (rate: number) => {
    setFormKey("taxRate", rate);
    recalcTotal(items, rate);
  };

  const fieldCls = "w-full h-8 rounded-lg border border-border bg-muted/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-file-invoice-dollar text-primary text-base" />
            <h3 className="text-sm font-bold text-foreground">{(initial as any)._id || (initial as any).id ? "Edit Invoice" : "Create Invoice"}</h3>
          </div>
          <button onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"><i className="fa-solid fa-xmark text-sm" /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Header & Meta Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border border-border">
            <div>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-2">— Your Business Information</p>
              <div className="space-y-2">
                <input className={fieldCls} value={form.businessName} onChange={(e) => setFormKey("businessName", e.target.value)} placeholder="Business Name (Hencework)" />
                <textarea className={cn(fieldCls, "h-16 py-1.5 resize-none")} value={form.businessAddress} onChange={(e) => setFormKey("businessAddress", e.target.value)} placeholder="Business Address" />
                <input className={fieldCls} value={form.businessEmail} onChange={(e) => setFormKey("businessEmail", e.target.value)} placeholder="Business Email" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Invoice No *</label>
                <input className={fieldCls} value={form.invoiceNo} onChange={(e) => setFormKey("invoiceNo", e.target.value)} placeholder="Auto (INV-0001)" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Currency</label>
                <select className={cn(fieldCls, "cursor-pointer font-semibold text-primary")} value={form.currency || "INR"} onChange={(e) => setFormKey("currency", e.target.value)}>
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
                <select className={cn(fieldCls, "cursor-pointer")} value={form.status} onChange={(e) => setFormKey("status", e.target.value)}>
                  {["Draft", "Sent", "Pending", "Paid", "Overdue", "Archived", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Invoice Date *</label>
                <input type="date" className={fieldCls} value={form.invoiceDate} onChange={(e) => setFormKey("invoiceDate", e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Due Date *</label>
                <input type="date" className={fieldCls} value={form.dueDate} onChange={(e) => setFormKey("dueDate", e.target.value)} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Customer / Account No</label>
                <input className={fieldCls} value={form.customerNo} onChange={(e) => setFormKey("customerNo", e.target.value)} placeholder="32321" />
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border border-border">
            <div>
              <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-2 flex items-center justify-between">
                <span>Billed To Client *</span>
              </p>
              <div className="space-y-2">
                <input className={fieldCls} value={form.billedToName} onChange={(e) => setFormKey("billedToName", e.target.value)} placeholder="Client / Company Name (Supernova consultant)" />
                <textarea className={cn(fieldCls, "h-14 py-1.5 resize-none")} value={form.billedToAddress} onChange={(e) => setFormKey("billedToAddress", e.target.value)} placeholder="Billing Address" />
                <input className={fieldCls} value={form.billedToEmail} onChange={(e) => setFormKey("billedToEmail", e.target.value)} placeholder="Client Email" />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Ship To Address (Optional)</p>
              <textarea className={cn(fieldCls, "h-28 py-1.5 resize-none")} value={form.shipToAddress || ""} onChange={(e) => setFormKey("shipToAddress", e.target.value)} placeholder="Shipping address if different from billing..." />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Line Items & Services</label>
              <button type="button" onClick={addItem} className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer">
                <i className="fa-solid fa-plus text-[10px]" /> Add Item
              </button>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-[10px] uppercase">Description</th>
                    <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-[10px] uppercase w-20">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-[10px] uppercase w-28">Unit Price ({getCurrencySymbol(form.currency)})</th>
                    <th className="px-3 py-2 text-right font-semibold text-muted-foreground text-[10px] uppercase w-28">Amount ({getCurrencySymbol(form.currency)})</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-border/40">
                      <td className="p-2"><input className={fieldCls} value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="Service / item description" /></td>
                      <td className="p-2"><input type="number" min="1" className={cn(fieldCls, "text-center")} value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 0)} /></td>
                      <td className="p-2"><input type="number" min="0" step="0.01" className={cn(fieldCls, "text-right")} value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} /></td>
                      <td className="p-2 text-right font-semibold text-foreground px-3 py-2">{getCurrencySymbol(form.currency)}{(Number(item.amount) || 0).toFixed(2)}</td>
                      <td className="p-2 text-center">
                        {items.length > 1 && (
                          <button type="button" onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-500 cursor-pointer"><i className="fa-solid fa-trash text-[10px]" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Invoice Notes / Payment Terms</label>
              <textarea className={cn(fieldCls, "h-20 py-2 resize-none")} value={form.notes || ""} onChange={(e) => setFormKey("notes", e.target.value)} placeholder="Payment due upon receipt. Bank details..." />
            </div>

            <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-semibold text-foreground">{formatCurrency(form.subtotal || 0, form.currency)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  Tax Rate (%)
                  <input type="number" min="0" max="100" className={cn(fieldCls, "w-14 h-6 text-center py-0 px-1")} value={form.taxRate} onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)} />
                </span>
                <span className="font-semibold text-foreground">{formatCurrency(form.taxAmount || 0, form.currency)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-sm font-bold text-foreground">
                <span>Total Amount</span>
                <span className="text-primary text-base">{formatCurrency(form.total || 0, form.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border bg-card">
          <button onClick={onClose} disabled={saving} className="flex-1 h-9 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (form.billedToName.trim()) onSave({ ...form, items }); }} disabled={!form.billedToName.trim() || saving} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5">
            {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-[10px]" />Saving…</> : "Save Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoicesTab({ invoices, loading, onAdd, onEdit, onDelete, autoOpenAdd }: {
  invoices: Invoice[]; loading: boolean;
  onAdd: (d: Omit<Invoice, "id">) => Promise<void>;
  onEdit: (id: string, d: Omit<Invoice, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  autoOpenAdd?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCurrency, setFilterCurrency] = useState("All");
  const [filterDateRange, setFilterDateRange] = useState("All Time");
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; item: Invoice } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewItem, setPreviewItem] = useState<Invoice | null>(null);

  useEffect(() => {
    if (autoOpenAdd) {
      setModal({ mode: "add" });
    }
  }, [autoOpenAdd]);

  const isExternalITInvoice = (inv: Invoice) => {
    const cust = (inv.customerNo || "").toUpperCase();
    const notes = (inv.notes || "").toLowerCase();
    const billedTo = (inv.billedToName || "").toLowerCase();
    return cust.startsWith("EXT-") || notes.includes("proposal") || (billedTo.includes("external") && !cust.startsWith("EMP-")) || (inv as any).category === "Client Billing";
  };

  const itInvoices = useMemo(() => invoices.filter((inv) => !isExternalITInvoice(inv)), [invoices]);

  const filtered = useMemo(() => itInvoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || inv.invoiceNo.toLowerCase().includes(q) || inv.billedToName.toLowerCase().includes(q) || inv.customerNo?.toLowerCase().includes(q);
    const matchesStatus = filterStatus === "All" || inv.status === filterStatus;
    const matchesCurrency = filterCurrency === "All" || inv.currency === filterCurrency;

    let matchesDate = true;
    if (filterDateRange !== "All Time" && inv.invoiceDate) {
      const invDate = new Date(inv.invoiceDate);
      const now = new Date();
      if (filterDateRange === "This Month") {
        matchesDate = invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      } else if (filterDateRange === "Last 30 Days") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
        matchesDate = invDate >= thirtyDaysAgo;
      } else if (filterDateRange === "This Year") {
        matchesDate = invDate.getFullYear() === now.getFullYear();
      }
    }

    return matchesSearch && matchesStatus && matchesCurrency && matchesDate;
  }), [itInvoices, search, filterStatus, filterCurrency, filterDateRange]);

  const totalRevenue = itInvoices.filter((inv) => inv.status === "Paid").reduce((acc, inv) => acc + (inv.total || 0), 0);
  const pendingAmount = itInvoices.filter((inv) => inv.status === "Pending" || inv.status === "Sent" || inv.status === "Overdue").reduce((acc, inv) => acc + (inv.total || 0), 0);

  const handleSave = async (data: Omit<Invoice, "id">) => {
    setSaving(true);
    try {
      if (modal?.mode === "edit") await onEdit(modal.item.id, data);
      else await onAdd(data);
      setModal(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try { await onDelete(deleteId); setDeleteId(null); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      {modal && <InvoiceModal initial={modal.mode === "edit" ? modal.item : EMPTY_INVOICE} onSave={handleSave} onClose={() => !saving && setModal(null)} saving={saving} />}
      {deleteId && <ConfirmDialog title="Remove Invoice" message="Are you sure you want to delete this invoice? This action cannot be undone." onConfirm={handleDelete} onCancel={() => !deleting && setDeleteId(null)} loading={deleting} />}

      {/* Invoice Quick Preview Drawer Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setPreviewItem(null)} />
          <div className="relative bg-card dark:bg-slate-900 border border-border dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono font-extrabold text-primary tracking-wide">{previewItem.invoiceNo}</span>
                <h3 className="text-xl font-black text-foreground tracking-tight mt-0.5">{previewItem.billedToName}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(statusBadge(previewItem.status), "px-2.5 py-1 text-xs font-bold rounded-md")}>{previewItem.status}</span>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="w-8 h-8 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                  title="Close Modal"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Billed From / Billed To Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-muted/40 dark:bg-slate-800/60 rounded-xl border border-border/80 dark:border-slate-700/60 space-y-1.5 shadow-2xs">
                <p className="text-muted-foreground dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Billed From</p>
                <p className="font-bold text-foreground text-sm">{previewItem.businessName}</p>
                {previewItem.businessAddress && <p className="text-foreground/80 dark:text-slate-300 whitespace-pre-line leading-relaxed">{previewItem.businessAddress}</p>}
                {previewItem.businessEmail && (
                  <p className="text-sky-600 dark:text-sky-300 font-mono font-medium text-[11px] pt-1 flex items-center gap-1.5">
                    <i className="fa-solid fa-envelope text-[10px] opacity-75" />
                    <span>{previewItem.businessEmail}</span>
                  </p>
                )}
              </div>

              <div className="p-4 bg-muted/40 dark:bg-slate-800/60 rounded-xl border border-border/80 dark:border-slate-700/60 space-y-1.5 shadow-2xs">
                <p className="text-muted-foreground dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">Billed To</p>
                <p className="font-bold text-foreground text-sm">{previewItem.billedToName}</p>
                {previewItem.billedToAddress && <p className="text-foreground/80 dark:text-slate-300 whitespace-pre-line leading-relaxed">{previewItem.billedToAddress}</p>}
                {previewItem.billedToEmail && (
                  <p className="text-sky-600 dark:text-sky-300 font-mono font-medium text-[11px] pt-1 flex items-center gap-1.5">
                    <i className="fa-solid fa-envelope text-[10px] opacity-75" />
                    <span>{previewItem.billedToEmail}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-border dark:border-slate-800 rounded-xl overflow-hidden text-xs shadow-2xs">
              <table className="w-full">
                <thead className="bg-muted/70 dark:bg-slate-800/80 border-b border-border dark:border-slate-800 font-bold">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] uppercase font-bold text-muted-foreground dark:text-slate-300">Description</th>
                    <th className="px-4 py-2.5 text-center text-[11px] uppercase font-bold text-muted-foreground dark:text-slate-300">Qty / Hrs</th>
                    <th className="px-4 py-2.5 text-right text-[11px] uppercase font-bold text-muted-foreground dark:text-slate-300">Unit Price ({getCurrencySymbol(previewItem.currency)})</th>
                    <th className="px-4 py-2.5 text-right text-[11px] uppercase font-bold text-muted-foreground dark:text-slate-300">Amount ({getCurrencySymbol(previewItem.currency)})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 dark:divide-slate-800">
                  {previewItem.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-foreground font-semibold">{item.description}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground font-mono font-medium">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground font-mono font-medium">{formatCurrency(Number(item.unitPrice) || 0, previewItem.currency)}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground font-mono">{formatCurrency(Number(item.amount) || 0, previewItem.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dates & Subtotal / Total Calculation Summary */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-t border-border dark:border-slate-800 pt-4 text-xs">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground dark:text-slate-400 uppercase tracking-wider">Invoice Timeline</p>
                <p className="text-foreground dark:text-slate-200 font-medium">
                  <span className="text-muted-foreground">Issued:</span> <strong className="font-semibold text-foreground">{previewItem.invoiceDate}</strong> • <span className="text-muted-foreground">Due:</span> <strong className="font-semibold text-foreground">{previewItem.dueDate}</strong>
                </p>
              </div>

              <div className="text-right space-y-1 bg-muted/30 dark:bg-slate-800/50 p-3 rounded-xl border border-border/60 dark:border-slate-700/60">
                <p className="text-xs text-muted-foreground dark:text-slate-300">
                  Subtotal: <strong className="font-mono text-foreground">{formatCurrency(previewItem.subtotal || 0, previewItem.currency)}</strong> | Tax ({previewItem.taxRate}%): <strong className="font-mono text-foreground">{formatCurrency(previewItem.taxAmount || 0, previewItem.currency)}</strong>
                </p>
                <p className="text-xl font-black text-emerald-500 dark:text-emerald-400 tracking-tight pt-1">
                  Total: {formatCurrency(previewItem.total || 0, previewItem.currency)}
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 border-t border-border dark:border-slate-800 pt-4">
              <button
                onClick={() => setPreviewItem(null)}
                className="px-5 py-2 rounded-xl border border-border bg-muted/60 hover:bg-muted text-xs font-bold text-foreground transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Total Invoices</p>
          <p className="text-xl font-bold text-foreground mt-1">{itInvoices.length}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Paid Revenue</p>
          <p className="text-xl font-bold text-emerald-500 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Pending / Sent</p>
          <p className="text-xl font-bold text-amber-500 mt-1">{formatCurrency(pendingAmount)}</p>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Drafts</p>
          <p className="text-xl font-bold text-blue-500 mt-1">{itInvoices.filter((i) => i.status === "Draft").length}</p>
        </div>
      </div>

      {/* Filter & Action Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice #, client, customer #…" className="pl-8 h-8 text-xs" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={SELECT_CLS} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} title="Filter by Status">
            <option value="All">All Statuses</option>
            {["Draft", "Sent", "Pending", "Paid", "Overdue", "Archived", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={SELECT_CLS} value={filterCurrency} onChange={(e) => setFilterCurrency(e.target.value)} title="Filter by Currency">
            <option value="All">All Currencies</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
          </select>
          <select className={SELECT_CLS} value={filterDateRange} onChange={(e) => setFilterDateRange(e.target.value)} title="Filter by Date">
            <option value="All Time">All Time</option>
            <option value="This Month">This Month</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="This Year">This Year</option>
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={() => setModal({ mode: "add" })} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
            <i className="fa-solid fa-plus text-[10px]" /> Create Invoice
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {["Invoice No", "Billed To Client", "Date", "Due Date", "Customer No", "Total", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={8} />) :
              filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground"><i className="fa-solid fa-file-invoice-dollar text-2xl mb-2 block opacity-30" /><p className="text-xs">{invoices.length === 0 ? "No invoices created yet." : "No matching invoices found."}</p></td></tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={row.id} className={cn("border-b border-border/60 hover:bg-muted/30 transition-colors group", idx % 2 === 0 ? "" : "bg-muted/10")}>
                    <td className="px-3 py-2.5 font-mono font-semibold text-primary whitespace-nowrap">{row.invoiceNo}</td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap font-medium">{row.billedToName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.invoiceDate}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.dueDate}</td>
                    <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">{row.customerNo || "—"}</td>
                    <td className="px-3 py-2.5 font-bold text-foreground whitespace-nowrap">{formatCurrency(row.total || 0, row.currency)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><span className={statusBadge(row.status)}>{row.status}</span></td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setPreviewItem(row)} className="px-2 py-1 rounded bg-muted hover:bg-accent text-muted-foreground hover:text-foreground text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors" title="Preview Invoice"><i className="fa-solid fa-eye text-[9px]" /> Preview</button>
                        <button onClick={() => setModal({ mode: "edit", item: row })} className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer" title="Edit"><i className="fa-solid fa-pen text-[9px]" /></button>
                        <button onClick={() => setDeleteId(row.id)} className="w-6 h-6 rounded-md bg-muted hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-500 cursor-pointer" title="Delete"><i className="fa-solid fa-trash text-[9px]" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type TabKey = "overview" | "drive" | "access" | "subscriptions" | "devices" | "invoices";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "fa-solid fa-gauge-high" },
  { key: "drive", label: "File & Drive Links", icon: "fa-solid fa-folder-open" },
  { key: "access", label: "Access & IDs", icon: "fa-solid fa-key" },
  { key: "subscriptions", label: "Subscriptions", icon: "fa-solid fa-credit-card" },
  { key: "devices", label: "Devices", icon: "fa-solid fa-laptop" },
  { key: "invoices", label: "Invoices", icon: "fa-solid fa-file-invoice-dollar" },
];

export default function ITCommandCenterPage() {
  const { can, isAdmin, isOPS } = usePermissions();
  const { user } = useAuth();
  const isPrivileged = isAdmin || isOPS;
  const [activeTab, setActiveTab] = useTabPersistence<TabKey>("it_command_center_tab", "overview", ["overview", "drive", "access", "subscriptions", "devices", "invoices"]);
  const [autoOpenAddTab, setAutoOpenAddTab] = useState<TabKey | null>(null);

  const handleQuickAction = (tab: TabKey) => {
    setActiveTab(tab);
    setAutoOpenAddTab(tab);
    // Reset autoOpen trigger after modal is mounted
    setTimeout(() => setAutoOpenAddTab(null), 300);
  };

  // ─── State ───────────────────────────────────────────────────────────────────
  const [links, setLinks] = useState<DriveLink[]>([]);
  const [access, setAccess] = useState<AccessEntry[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([]);

  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ─── Data Loaders ─────────────────────────────────────────────────────────────
  const loadLinks = useCallback(async () => {
    try {
      const data = await apiFetch("/api/it/drive-links");
      setLinks((data.links || []).map((d: any) => ({ ...normalise(d), id: d._id?.toString() || d.id })));
    } catch (e: any) { showToast(e.message || "Failed to load file links", "error"); }
    finally { setLoadingLinks(false); }
  }, [showToast]);

  const loadAccess = useCallback(async () => {
    try {
      const data = await apiFetch("/api/it/access");
      setAccess((data.entries || []).map((d: any) => ({ ...normalise(d), id: d._id?.toString() || d.id })));
    } catch (e: any) { showToast(e.message || "Failed to load access records", "error"); }
    finally { setLoadingAccess(false); }
  }, [showToast]);

  const loadSubs = useCallback(async () => {
    try {
      const data = await apiFetch("/api/it/subscriptions");
      setSubs((data.subscriptions || []).map((d: any) => ({ ...normalise(d), id: d._id?.toString() || d.id })));
    } catch (e: any) { showToast(e.message || "Failed to load subscriptions", "error"); }
    finally { setLoadingSubs(false); }
  }, [showToast]);

  const [nextAssetTags, setNextAssetTags] = useState<Record<string, string>>({});

  const loadDevices = useCallback(async () => {
    try {
      const data = await apiFetch("/api/it/devices");
      setDevices((data.devices || []).map((d: any) => ({ ...normalise(d), id: d._id?.toString() || d.id })));
      if (data.nextAssetTags) {
        setNextAssetTags(data.nextAssetTags);
      }
    } catch (e: any) { showToast(e.message || "Failed to load devices", "error"); }
    finally { setLoadingDevices(false); }
  }, [showToast]);

  const loadInvoices = useCallback(async () => {
    try {
      const data = await apiFetch("/api/it/invoices");
      setInvoices((data.invoices || []).map((d: any) => ({ ...normalise(d), id: d._id?.toString() || d.id })));
    } catch (e: any) { showToast(e.message || "Failed to load invoices", "error"); }
    finally { setLoadingInvoices(false); }
  }, [showToast]);

  const loadTeamMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/team?all=true");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.users || data.team || []);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    loadLinks();
    loadAccess();
    loadSubs();
    loadDevices();
    loadInvoices();
    loadTeamMembers();
  }, [loadLinks, loadAccess, loadSubs, loadDevices, loadInvoices, loadTeamMembers]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoadingLinks(true); setLoadingAccess(true); setLoadingSubs(true); setLoadingDevices(true); setLoadingInvoices(true);
    await Promise.all([loadLinks(), loadAccess(), loadSubs(), loadDevices(), loadInvoices(), loadTeamMembers()]);
    setRefreshing(false);
    showToast("Data refreshed", "info");
  };

  // ─── Drive Links CRUD ─────────────────────────────────────────────────────────
  const addLink = async (data: Omit<DriveLink, "id">) => {
    const res = await apiFetch("/api/it/drive-links", { method: "POST", body: JSON.stringify(data) });
    const doc = res.link;
    const item = doc ? { ...normalise(doc), id: doc._id?.toString() || doc.id } : { ...data, id: String(Date.now()) };
    setLinks((p) => [item, ...p]);
    await loadLinks();
    showToast("File link added", "success");
  };

  const editLink = async (id: string, data: Omit<DriveLink, "id">) => {
    const res = await apiFetch(`/api/it/drive-links/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    const doc = res.link;
    const item = doc ? { ...normalise(doc), id: doc._id?.toString() || id } : { ...data, id };
    setLinks((p) => p.map((l) => (l.id === id ? item : l)));
    showToast("File link updated", "success");
  };

  const deleteLink = async (id: string) => {
    await apiFetch(`/api/it/drive-links/${id}`, { method: "DELETE" });
    setLinks((p) => p.filter((l) => l.id !== id));
    showToast("File link removed", "info");
  };

  // ─── Access CRUD ──────────────────────────────────────────────────────────────
  const addAccess = async (data: Omit<AccessEntry, "id">) => {
    const res = await apiFetch("/api/it/access", { method: "POST", body: JSON.stringify(data) });
    const doc = res.entry;
    setAccess((p) => [{ ...doc, id: doc._id?.toString() || doc.id }, ...p]);
    showToast("Access granted", "success");
  };

  const editAccess = async (id: string, data: Omit<AccessEntry, "id">) => {
    const res = await apiFetch(`/api/it/access/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    const doc = res.entry;
    setAccess((p) => p.map((a) => a.id === id ? { ...doc, id } : a));
    showToast("Access record updated", "success");
  };

  const deleteAccess = async (id: string) => {
    await apiFetch(`/api/it/access/${id}`, { method: "DELETE" });
    setAccess((p) => p.filter((a) => a.id !== id));
    showToast("Access record removed", "info");
  };

  const toggleAccessStatus = async (id: string, current: AccessEntry["status"]) => {
    const cycle: Record<string, AccessEntry["status"]> = { Active: "Suspended", Suspended: "Active", Pending: "Active", Revoked: "Active" };
    const next = cycle[current] ?? "Active";
    // Optimistic update
    setAccess((p) => p.map((a) => a.id === id ? { ...a, status: next } : a));
    try {
      const res = await apiFetch(`/api/it/access/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      const doc = res.entry;
      setAccess((p) => p.map((a) => a.id === id ? { ...doc, id } : a));
      showToast(`Status updated to ${next}`, "info");
    } catch (e: any) {
      // Rollback
      setAccess((p) => p.map((a) => a.id === id ? { ...a, status: current } : a));
      showToast(e.message || "Failed to update status", "error");
    }
  };

  // ─── Subscriptions CRUD ───────────────────────────────────────────────────────
  const addSub = async (data: Omit<Subscription, "id">) => {
    const res = await apiFetch("/api/it/subscriptions", { method: "POST", body: JSON.stringify(data) });
    const doc = res.subscription;
    setSubs((p) => [{ ...doc, id: doc._id?.toString() || doc.id }, ...p]);
    showToast("Subscription added", "success");
  };

  const editSub = async (id: string, data: Omit<Subscription, "id">) => {
    const res = await apiFetch(`/api/it/subscriptions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    const doc = res.subscription;
    setSubs((p) => p.map((s) => s.id === id ? { ...doc, id } : s));
    showToast("Subscription updated", "success");
  };

  const deleteSub = async (id: string) => {
    await apiFetch(`/api/it/subscriptions/${id}`, { method: "DELETE" });
    setSubs((p) => p.filter((s) => s.id !== id));
    showToast("Subscription removed", "info");
  };

  // ─── Devices CRUD ─────────────────────────────────────────────────────────────
  const addDevice = async (data: Omit<Device, "id">) => {
    const res = await apiFetch("/api/it/devices", { method: "POST", body: JSON.stringify(data) });
    const doc = res.device;
    setDevices((p) => [{ ...doc, id: doc._id?.toString() || doc.id }, ...p]);
    await loadDevices();
    showToast(`Device registered (${doc.assetTag || res.assetTag})`, "success");
  };

  const editDevice = async (id: string, data: Omit<Device, "id">) => {
    const res = await apiFetch(`/api/it/devices/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    const doc = res.device;
    const updatedItem = doc ? { ...normalise(doc), id: doc._id?.toString() || id } : { ...data, id };
    setDevices((p) => p.map((d) => (d.id === id ? updatedItem : d)));
    showToast("Device updated", "success");
  };

  const deleteDevice = async (id: string) => {
    await apiFetch(`/api/it/devices/${id}`, { method: "DELETE" });
    setDevices((p) => p.filter((d) => d.id !== id));
    showToast("Device removed", "info");
  };

  // ─── Invoices CRUD ────────────────────────────────────────────────────────────
  const addInvoice = async (data: Omit<Invoice, "id">) => {
    const res = await apiFetch("/api/it/invoices", { method: "POST", body: JSON.stringify(data) });
    const doc = res.invoice;
    setInvoices((p) => [{ ...doc, id: doc._id?.toString() || doc.id }, ...p]);
    showToast("Invoice created successfully", "success");
  };

  const editInvoice = async (id: string, data: Omit<Invoice, "id">) => {
    const res = await apiFetch(`/api/it/invoices/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    const doc = res.invoice;
    setInvoices((p) => p.map((i) => i.id === id ? { ...doc, id } : i));
    showToast("Invoice updated", "success");
  };

  const deleteInvoice = async (id: string) => {
    await apiFetch(`/api/it/invoices/${id}`, { method: "DELETE" });
    setInvoices((p) => p.filter((i) => i.id !== id));
    showToast("Invoice deleted", "info");
  };

  const visibleTabs = useMemo(() => {
    return TABS.filter((tab) => {
      if (tab.key === "overview") return true;
      if (tab.key === "drive") return isAdmin || isOPS || can("viewDriveFiles");
      if (tab.key === "access") return isAdmin || isOPS || can("manageITAccess") || can("viewITPortal");
      if (tab.key === "subscriptions") return isAdmin || isOPS || can("manageITSubscriptions") || can("viewITPortal");
      if (tab.key === "devices") return isAdmin || isOPS || can("manageITDevices") || can("viewITPortal");
      // Invoices tab: only privileged users (Admin / OPS)
      if (tab.key === "invoices") return isPrivileged || can("manageITInvoices");
      return true;
    });
  }, [isAdmin, isOPS, isPrivileged, can]);

  const handleExportTabCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    const filename = `it_${activeTab}_${getISTDateString()}.csv`;

    if (activeTab === "drive") {
      headers = ["File / Resource Name", "Category", "Platform", "Link", "Owner", "Audience / Sharing", "Shared With", "Access Level", "Last Updated", "Notes"];
      rows = links.map((l) => [
        l.name,
        l.category,
        l.platform,
        l.link,
        l.owner,
        l.shareScope || (l.accessLevel?.includes("Team") ? "All Users" : "Private"),
        (l.sharedWith || []).join("; "),
        l.accessLevel,
        l.lastUpdated,
        l.notes || "",
      ]);
    } else if (activeTab === "access") {
      headers = ["Tool / System", "Category", "Assignee", "Role", "Access Level", "Date Granted", "Status"];
      rows = access.map((a) => [a.tool, a.category, a.assignee, a.role, a.accessLevel, a.dateGranted, a.status]);
    } else if (activeTab === "subscriptions") {
      headers = ["Tool Name", "Category", "Plan", "Cost/Month", "Seats", "Renewal Date", "Owner", "Status"];
      rows = subs.map((s) => [s.tool, s.category, s.plan, s.costPerMonth.toString(), (s.seats || 0).toString(), s.renewalDate, s.owner, s.status]);
    } else if (activeTab === "devices") {
      headers = ["Asset Tag", "Type", "Brand", "Model", "Assigned To", "Department", "Location", "OS", "Condition", "Status", "Last Seen"];
      rows = devices.map((d) => [d.assetTag, d.type, d.brand, d.modelName, d.assignedTo || "", d.department || "", d.location || "HQ - Main Office", d.os || "", d.condition, d.status, d.lastSeen || ""]);
    } else if (activeTab === "invoices") {
      headers = ["Invoice No", "Billed To Client", "Date", "Due Date", "Customer No", "Subtotal", "Tax", "Total", "Currency", "Status"];
      rows = invoices.map((i) => [i.invoiceNo, i.billedToName, i.invoiceDate, i.dueDate, i.customerNo, i.subtotal.toString(), i.taxAmount.toString(), i.total.toString(), i.currency, i.status]);
    } else {
      // Overview export
      headers = ["Category", "Metric", "Value"];
      rows = [
        ["Access", "Active Grants", access.filter((a) => a.status === "Active").length.toString()],
        ["Subscriptions", "Active Tools", subs.filter((s) => s.status === "Active").length.toString()],
        ["Subscriptions", "Monthly Spend", subs.filter((s) => s.status === "Active").reduce((sum, s) => sum + s.costPerMonth, 0).toString()],
        ["Devices", "In Use Assets", devices.filter((d) => d.status === "In Use").length.toString()],
        ["Invoices", "Total Invoices", invoices.length.toString()],
      ];
    }

    const csvContent = [headers.map((h) => `"${h}"`).join(","), ...rows.map((r) => r.map((c) => `"${(c || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${activeTab} CSV`, "info");
  };

  // ─── Server already returns user-scoped data — no client-side filtering needed ─
  const totalRecords = links.length + access.length + subs.length + devices.length + (isPrivileged ? invoices.length : 0);
  const overallLoading = loadingLinks && loadingAccess && loadingSubs && loadingDevices && loadingInvoices;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary flex items-center justify-center border border-primary/20 shadow-sm">
            <i className="fa-solid fa-terminal text-base" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">IT Portal</h1>
            <p className="text-xs text-muted-foreground">
              {isPrivileged
                ? "Manage access, subscriptions, assets, invoices & shared resources (IST Standard)"
                : `Showing your assigned resources${user?.name ? ` — ${user.name}` : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-semibold">Live Data</span>
          </div>
          {!overallLoading && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
              <i className="fa-solid fa-database text-[10px]" />
              <span className="font-medium">{totalRecords} records</span>
            </div>
          )}
          <button onClick={handleExportTabCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-xs text-muted-foreground transition-colors cursor-pointer" title="Export Current Tab CSV">
            <i className="fa-solid fa-file-csv text-[10px] text-primary" />
            <span>Export CSV</span>
          </button>
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-xs text-muted-foreground transition-colors cursor-pointer disabled:opacity-60">
            <i className={cn("fa-solid fa-rotate text-[10px]", refreshing && "fa-spin")} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border overflow-x-auto no-scrollbar">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            id={`it-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer",
              activeTab === tab.key
                ? "bg-card text-foreground shadow-sm border border-border font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60"
            )}
          >
            <i className={cn(tab.icon, "text-[11px]", activeTab === tab.key ? "text-primary" : "")} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && <OverviewTab access={access} subscriptions={subs} devices={devices} loading={overallLoading} onNavigate={(tab) => setActiveTab(tab)} onQuickAction={handleQuickAction} allowedTabs={visibleTabs.map((t) => t.key).filter((k) => k !== "overview")} />}
        {activeTab === "drive" && <DriveLinksTab links={links} loading={loadingLinks} onAdd={addLink} onEdit={editLink} onDelete={deleteLink} autoOpenAdd={autoOpenAddTab === "drive"} userName={user?.name} isPrivileged={isPrivileged} teamMembers={teamMembers} />}
        {activeTab === "access" && <AccessTab access={access} loading={loadingAccess} onAdd={addAccess} onEdit={editAccess} onDelete={deleteAccess} onToggleStatus={toggleAccessStatus} autoOpenAdd={autoOpenAddTab === "access"} teamMembers={teamMembers} />}
        {activeTab === "subscriptions" && <SubscriptionsTab subs={subs} loading={loadingSubs} onAdd={addSub} onEdit={editSub} onDelete={deleteSub} autoOpenAdd={autoOpenAddTab === "subscriptions"} teamMembers={teamMembers} />}
        {activeTab === "devices" && <DevicesTab devices={devices} allDevices={devices} nextAssetTags={nextAssetTags} loading={loadingDevices} onAdd={addDevice} onEdit={editDevice} onDelete={deleteDevice} autoOpenAdd={autoOpenAddTab === "devices"} userName={user?.name} userDepartment={user?.department} isPrivileged={isPrivileged} teamMembers={teamMembers} />}
        {activeTab === "invoices" && isPrivileged && <InvoicesTab invoices={invoices} loading={loadingInvoices} onAdd={addInvoice} onEdit={editInvoice} onDelete={deleteInvoice} autoOpenAdd={autoOpenAddTab === "invoices"} />}
      </div>
    </div>
  );
}

