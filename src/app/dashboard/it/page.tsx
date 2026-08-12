"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";

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
  assignedTo: string;
  department: string;
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

// ─── Utilities ───────────────────────────────────────────────────────────────

const formatCurrency = (n: number, currency: string = "USD") => {
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
};

const getCurrencySymbol = (currency?: string) => (currency === "INR" ? "₹" : "$");

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

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-border/60">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-3 bg-muted animate-pulse rounded-md" style={{ width: `${40 + Math.random() * 50}%` }} />
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

function MiniBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-16">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1 flex-1">
          <span className="text-[9px] font-bold text-foreground">{d.value}</span>
          <div className="w-full rounded-t-sm transition-all duration-500" style={{ height: `${(d.value / max) * 40}px`, backgroundColor: d.color }} />
          <span className="text-[8px] text-muted-foreground text-center leading-tight truncate w-full">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  let offset = 0;
  const r = 28, cx = 32, cy = 32, circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3">
      <svg width="64" height="64" viewBox="0 0 64 64">
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * circ;
          const gap = circ - dash;
          const rot = offset * 360;
          offset += frac;
          return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth="10" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={circ * 0.25} transform={`rotate(${rot} ${cx} ${cy})`} className="transition-all duration-500" />;
        })}
      </svg>
      <div className="flex flex-col gap-1">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[9px] text-muted-foreground">{seg.label} <span className="font-semibold text-foreground">{seg.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ access, subscriptions, devices, loading, onQuickAction }: {
  access: AccessEntry[]; subscriptions: Subscription[]; devices: Device[]; loading: boolean;
  onQuickAction?: (tab: TabKey) => void;
}) {
  const activeAccess = access.filter((a) => a.status === "Active").length;
  const activeSubs = subscriptions.filter((s) => s.status === "Active").length;
  const monthlyCost = subscriptions.filter((s) => s.status === "Active" || s.status === "Expiring Soon").reduce((a, s) => a + s.costPerMonth, 0);
  const devicesInUse = devices.filter((d) => d.status === "In Use").length;
  const expiring = subscriptions.filter((s) => s.status === "Expiring Soon").length;

  const subsByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    subscriptions.filter((s) => s.status === "Active" || s.status === "Expiring Soon").forEach((s) => { m[s.category] = (m[s.category] || 0) + s.costPerMonth; });
    return Object.entries(m).map(([label, value]) => ({ label, value: Math.round(value) }));
  }, [subscriptions]);

  const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  const accessByStatus = [
    { value: access.filter((a) => a.status === "Active").length, color: "#10b981", label: "Active" },
    { value: access.filter((a) => a.status === "Suspended").length, color: "#f59e0b", label: "Suspended" },
    { value: access.filter((a) => a.status === "Pending").length, color: "#3b82f6", label: "Pending" },
    { value: access.filter((a) => a.status === "Revoked").length, color: "#ef4444", label: "Revoked" },
  ].filter((s) => s.value > 0);

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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: "fa-solid fa-users-gear", iconCls: "bg-blue-500/15 text-blue-500", border: "border-blue-500/20", label: "Active Access Grants", value: activeAccess, sub: "across all tools" },
          { icon: "fa-solid fa-box-open", iconCls: "bg-violet-500/15 text-violet-500", border: "border-violet-500/20", label: "Active Subscriptions", value: activeSubs, sub: `${formatCurrency(monthlyCost)}/mo` },
          { icon: "fa-solid fa-laptop", iconCls: "bg-emerald-500/15 text-emerald-500", border: "border-emerald-500/20", label: "Devices In Use", value: devicesInUse, sub: `${devices.length} total assets` },
          { icon: "fa-solid fa-bell-ring", iconCls: "bg-orange-500/15 text-orange-500", border: "border-orange-500/20", label: "Expiring Soon", value: expiring, sub: "subscriptions" },
        ].map((c) => (
          <Card key={c.label} className={cn("border", c.border)}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{c.label}</span>
                  <span className="text-2xl font-bold text-foreground">{c.value}</span>
                  <span className="text-xs text-muted-foreground">{c.sub}</span>
                </div>
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", c.iconCls)}>
                  <i className={cn(c.icon, "text-lg")} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><i className="fa-solid fa-chart-bar text-violet-500" /> Spend by Category</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            {subsByCategory.length > 0 ? <MiniBarChart data={subsByCategory.map((d, i) => ({ ...d, color: COLORS[i % COLORS.length] }))} /> : <p className="text-xs text-muted-foreground py-4 text-center">No subscription data</p>}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><i className="fa-solid fa-key text-blue-500" /> Access by Status</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            {accessByStatus.length > 0 ? <DonutChart segments={accessByStatus} /> : <p className="text-xs text-muted-foreground py-4 text-center">No access data</p>}
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><i className="fa-solid fa-laptop text-emerald-500" /> Device Health</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            {devices.length > 0 ? <DonutChart segments={[
              { value: devices.filter((d) => d.condition === "Excellent").length, color: "#10b981", label: "Excellent" },
              { value: devices.filter((d) => d.condition === "Good").length, color: "#3b82f6", label: "Good" },
              { value: devices.filter((d) => d.condition === "Fair").length, color: "#f59e0b", label: "Fair" },
              { value: devices.filter((d) => d.condition === "Poor").length, color: "#ef4444", label: "Poor" },
            ].filter((s) => s.value > 0)} /> : <p className="text-xs text-muted-foreground py-4 text-center">No device data</p>}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Expired / Cancelled Subs", value: subscriptions.filter((s) => s.status === "Expired" || s.status === "Cancelled").length, cls: "text-red-500", icon: "fa-solid fa-ban" },
          { label: "Revoked Access", value: access.filter((a) => a.status === "Revoked").length, cls: "text-red-500", icon: "fa-solid fa-user-xmark" },
          { label: "Pending Access", value: access.filter((a) => a.status === "Pending").length, cls: "text-blue-500", icon: "fa-solid fa-hourglass-half" },
          { label: "Available Devices", value: devices.filter((d) => d.status === "Available").length, cls: "text-emerald-500", icon: "fa-solid fa-laptop-code" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <i className={cn(item.icon, item.cls, "text-sm")} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide leading-tight">{item.label}</p>
              <p className={cn("text-xl font-bold mt-0.5", item.cls)}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="border-border">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <i className="fa-solid fa-bolt text-amber-500" /> Quick Actions — Add & Manage
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { icon: "fa-solid fa-user-plus", label: "Grant Access", sub: "Add user tool access", tab: "access", color: "text-blue-500 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15" },
              { icon: "fa-solid fa-file-circle-plus", label: "Add Drive Link", sub: "Index new resource", tab: "drive", color: "text-violet-500 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/15" },
              { icon: "fa-solid fa-laptop-medical", label: "Register Device", sub: "Add asset entry", tab: "devices", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15" },
              { icon: "fa-solid fa-credit-card", label: "Add Subscription", sub: "Track new software", tab: "subscriptions", color: "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15" },
              { icon: "fa-solid fa-file-invoice-dollar", label: "Create Invoice", sub: "Generate client invoice", tab: "invoices", color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/15" },
            ].map((action) => (
              <button key={action.label} onClick={() => onQuickAction?.(action.tab as TabKey)} className={cn("flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-center transition-all duration-200 cursor-pointer", action.color)}>
                <i className={cn(action.icon, "text-lg")} />
                <span className="text-[11px] font-bold leading-tight">{action.label}</span>
                <span className="text-[9px] opacity-70 leading-tight">{action.sub}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Drive Links Tab ──────────────────────────────────────────────────────────

const EMPTY_DRIVE = { name: "", category: "", venture: "Ace Consultancy", platform: "Google Sheets", link: "", owner: "", accessLevel: "View - Team", lastUpdated: new Date().toISOString().slice(0, 10), reviewFrequency: "Monthly", notes: "" };

function DriveModal({ initial, onSave, onClose, saving }: { initial: Omit<DriveLink, "id">; onSave: (d: Omit<DriveLink, "id">) => void; onClose: () => void; saving?: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const fieldCls = "w-full h-8 rounded-lg border border-border bg-muted/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><i className="fa-solid fa-folder-open text-violet-500" />{(initial as any)._id ? "Edit File Link" : "Add File / Drive Link"}</h3>
          <button onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">File / Resource Name *</label><input className={fieldCls} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Brand Guidelines 2026" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Category</label><input className={fieldCls} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Ops/Admin" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Platform</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.platform} onChange={(e) => set("platform", e.target.value)}>
                {["Google Sheets", "Google Docs", "Notion", "PDF", "Other"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Owner</label><input className={fieldCls} value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="e.g. Ops Team" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Access Level</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.accessLevel} onChange={(e) => set("accessLevel", e.target.value)}>
                {["View - Team", "Edit - Team", "Admin Only", "Public"].map((a) => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Link (URL)</label><input className={fieldCls} value={form.link} onChange={(e) => set("link", e.target.value)} placeholder="https://..." /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Review Frequency</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.reviewFrequency} onChange={(e) => set("reviewFrequency", e.target.value)}>
                {["Daily", "Weekly", "Monthly", "Quarterly", "As needed"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Last Updated</label><input type="date" className={fieldCls} value={form.lastUpdated} onChange={(e) => set("lastUpdated", e.target.value)} /></div>
            <div className="col-span-2"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Notes</label><textarea className={cn(fieldCls, "h-16 py-2 resize-none")} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes…" /></div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} disabled={saving} className="flex-1 h-9 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (form.name.trim()) onSave(form); }} disabled={!form.name.trim() || saving} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5">
            {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-[10px]" />Saving…</> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DriveLinksTab({ links, loading, onAdd, onEdit, onDelete, autoOpenAdd }: {
  links: DriveLink[]; loading: boolean;
  onAdd: (d: Omit<DriveLink, "id">) => Promise<void>;
  onEdit: (id: string, d: Omit<DriveLink, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  autoOpenAdd?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterPlatform, setFilterPlatform] = useState("All");
  const [filterAccess, setFilterAccess] = useState("All");
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; item: DriveLink } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (autoOpenAdd) {
      setModal({ mode: "add" });
    }
  }, [autoOpenAdd]);

  const categories = useMemo(() => ["All", ...Array.from(new Set(links.map((d) => d.category).filter(Boolean)))], [links]);
  const platforms = useMemo(() => ["All", ...Array.from(new Set(links.map((d) => d.platform).filter(Boolean)))], [links]);
  const accessLevels = useMemo(() => ["All", ...Array.from(new Set(links.map((d) => d.accessLevel).filter(Boolean)))], [links]);

  const filtered = useMemo(() => links.filter((d) => {
    const q = search.toLowerCase();
    return (!q || d.name.toLowerCase().includes(q) || d.owner.toLowerCase().includes(q) || d.notes?.toLowerCase().includes(q))
      && (filterCat === "All" || d.category === filterCat)
      && (filterPlatform === "All" || d.platform === filterPlatform)
      && (filterAccess === "All" || d.accessLevel === filterAccess);
  }), [links, search, filterCat, filterPlatform, filterAccess]);

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

  return (
    <div className="space-y-4">
      {modal && <DriveModal initial={modal.mode === "edit" ? modal.item : EMPTY_DRIVE} onSave={handleSave} onClose={() => !saving && setModal(null)} saving={saving} />}
      {deleteId && <ConfirmDialog title="Remove File Link" message="This will permanently remove this file link." onConfirm={handleDelete} onCancel={() => !deleting && setDeleteId(null)} loading={deleting} />}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files, owners…" className="pl-8 h-8 text-xs" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={SELECT_CLS} value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
          <select className={SELECT_CLS} value={filterPlatform} onChange={(e) => setFilterPlatform(e.target.value)}>{platforms.map((p) => <option key={p}>{p}</option>)}</select>
          <select className={SELECT_CLS} value={filterAccess} onChange={(e) => setFilterAccess(e.target.value)}>{accessLevels.map((a) => <option key={a}>{a}</option>)}</select>
          <span className="text-xs text-muted-foreground whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={() => setModal({ mode: "add" })} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
            <i className="fa-solid fa-plus text-[10px]" /> Add Link
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {["File / Resource Name", "Category", "Platform", "Link", "Owner", "Access Level", "Last Updated", "Notes", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={9} />) :
              filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground"><i className="fa-solid fa-folder-open text-2xl mb-2 block opacity-30" /><p className="text-xs">{links.length === 0 ? "No file links yet. Add your first one!" : "No results match your filters."}</p></td></tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={row.id} className={cn("border-b border-border/60 hover:bg-muted/30 transition-colors group", idx % 2 === 0 ? "" : "bg-muted/10")}>
                    <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap max-w-[180px] truncate" title={row.name}>{row.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.category || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><span className="flex items-center gap-1.5"><i className={platformIcon(row.platform)} /><span className="text-muted-foreground">{row.platform}</span></span></td>
                    <td className="px-3 py-2.5 max-w-[140px]">
                      {row.link ? (
                        <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 truncate" title={row.link}>
                          <i className="fa-solid fa-arrow-up-right-from-square text-[9px]" />
                          <span className="truncate">{row.link.replace("https://", "").substring(0, 24)}…</span>
                        </a>
                      ) : <span className="text-muted-foreground italic">(uploaded file)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.owner || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><span className={statusBadge(row.accessLevel?.includes("Edit") ? "Active" : "Pending")}>{row.accessLevel || "—"}</span></td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.lastUpdated || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[160px] truncate" title={row.notes}>{row.notes || "—"}</td>
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

// ─── Access Tab ───────────────────────────────────────────────────────────────

const EMPTY_ACCESS = { tool: "", category: "", assignee: "", role: "", accessLevel: "Full Access", dateGranted: new Date().toISOString().slice(0, 10), status: "Active" as const };

function AccessModal({ initial, onSave, onClose, saving }: { initial: Omit<AccessEntry, "id">; onSave: (d: Omit<AccessEntry, "id">) => void; onClose: () => void; saving?: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const fieldCls = "w-full h-8 rounded-lg border border-border bg-muted/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground";
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
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Tool / System *</label><input className={fieldCls} value={form.tool} onChange={(e) => set("tool", e.target.value)} placeholder="e.g. Slack" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Category</label><input className={fieldCls} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Communication" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Assignee *</label><input className={fieldCls} value={form.assignee} onChange={(e) => set("assignee", e.target.value)} placeholder="Full name" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Role</label><input className={fieldCls} value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Admin, Editor…" /></div>
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

function AccessTab({ access, loading, onAdd, onEdit, onDelete, onToggleStatus, autoOpenAdd }: {
  access: AccessEntry[]; loading: boolean;
  onAdd: (d: Omit<AccessEntry, "id">) => Promise<void>;
  onEdit: (id: string, d: Omit<AccessEntry, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleStatus: (id: string, current: AccessEntry["status"]) => Promise<void>;
  autoOpenAdd?: boolean;
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

  const categories = useMemo(() => ["All", ...Array.from(new Set(access.map((a) => a.category).filter(Boolean)))], [access]);
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
      {modal && <AccessModal initial={modal.mode === "edit" ? modal.item : EMPTY_ACCESS} onSave={handleSave} onClose={() => !saving && setModal(null)} saving={saving} />}
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

function SubModal({ initial, onSave, onClose, saving }: { initial: Omit<Subscription, "id">; onSave: (d: Omit<Subscription, "id">) => void; onClose: () => void; saving?: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: string | number) => setForm((p) => ({ ...p, [k]: v }));
  const fieldCls = "w-full h-8 rounded-lg border border-border bg-muted/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground";
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
            <div className="col-span-2"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Tool Name *</label><input className={fieldCls} value={form.tool} onChange={(e) => set("tool", e.target.value)} placeholder="e.g. Slack Pro" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Category</label><input className={fieldCls} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Communication" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Plan</label><input className={fieldCls} value={form.plan} onChange={(e) => set("plan", e.target.value)} placeholder="Pro, Business…" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Cost / Month ($)</label><input type="number" min="0" step="0.01" className={fieldCls} value={form.costPerMonth} onChange={(e) => set("costPerMonth", parseFloat(e.target.value) || 0)} /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Seats</label><input type="number" min="1" className={fieldCls} value={form.seats} onChange={(e) => set("seats", parseInt(e.target.value) || 1)} /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Renewal Date</label><input type="date" className={fieldCls} value={form.renewalDate} onChange={(e) => set("renewalDate", e.target.value)} /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.status} onChange={(e) => set("status", e.target.value as Subscription["status"])}>
                {["Active", "Expiring Soon", "Expired", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="col-span-2"><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Owner</label><input className={fieldCls} value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Who manages this?" /></div>
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

function SubscriptionsTab({ subs, loading, onAdd, onEdit, onDelete, autoOpenAdd }: {
  subs: Subscription[]; loading: boolean;
  onAdd: (d: Omit<Subscription, "id">) => Promise<void>;
  onEdit: (id: string, d: Omit<Subscription, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  autoOpenAdd?: boolean;
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

  const categories = useMemo(() => ["All", ...Array.from(new Set(subs.map((s) => s.category).filter(Boolean)))], [subs]);
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

// ─── Devices Tab ──────────────────────────────────────────────────────────────

const EMPTY_DEVICE = { assetTag: "", type: "Laptop", brand: "", modelName: "", assignedTo: "", department: "", os: "", lastSeen: new Date().toISOString().slice(0, 10), condition: "Good" as const, status: "Available" as const };

function DeviceModal({ initial, onSave, onClose, saving }: { initial: Omit<Device, "id">; onSave: (d: Omit<Device, "id">) => void; onClose: () => void; saving?: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const fieldCls = "w-full h-8 rounded-lg border border-border bg-muted/60 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground";
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><i className="fa-solid fa-laptop text-emerald-500" />Register / Edit Device</h3>
          <button onClick={onClose} disabled={saving} className="text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Asset Tag *</label><input className={fieldCls} value={form.assetTag} onChange={(e) => set("assetTag", e.target.value)} placeholder="ACE-LAP-008" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Type</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.type} onChange={(e) => set("type", e.target.value)}>
                {["Laptop", "Desktop", "Monitor", "Mobile", "Tablet", "Router", "Printer", "Other"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Brand</label><input className={fieldCls} value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Apple, Dell…" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Model</label><input className={fieldCls} value={form.modelName} onChange={(e) => set("modelName", e.target.value)} placeholder="MacBook Pro 14" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Assigned To</label><input className={fieldCls} value={form.assignedTo} onChange={(e) => set("assignedTo", e.target.value)} placeholder="Full name or —" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Department</label><input className={fieldCls} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="IT, Design…" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">OS</label><input className={fieldCls} value={form.os} onChange={(e) => set("os", e.target.value)} placeholder="macOS 14, Windows 11…" /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Last Seen</label><input type="date" className={fieldCls} value={form.lastSeen} onChange={(e) => set("lastSeen", e.target.value)} /></div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Condition</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.condition} onChange={(e) => set("condition", e.target.value as Device["condition"])}>
                {["Excellent", "Good", "Fair", "Poor"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Status</label>
              <select className={cn(fieldCls, "cursor-pointer")} value={form.status} onChange={(e) => set("status", e.target.value as Device["status"])}>
                {["In Use", "Available", "In Repair", "Retired"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-border">
          <button onClick={onClose} disabled={saving} className="flex-1 h-9 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer disabled:opacity-50">Cancel</button>
          <button onClick={() => { if (form.assetTag.trim()) onSave(form); }} disabled={!form.assetTag.trim() || saving} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5">
            {saving ? <><i className="fa-solid fa-circle-notch fa-spin text-[10px]" />Saving…</> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DevicesTab({ devices, loading, onAdd, onEdit, onDelete, autoOpenAdd }: {
  devices: Device[]; loading: boolean;
  onAdd: (d: Omit<Device, "id">) => Promise<void>;
  onEdit: (id: string, d: Omit<Device, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  autoOpenAdd?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; item: Device } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (autoOpenAdd) {
      setModal({ mode: "add" });
    }
  }, [autoOpenAdd]);

  const types = useMemo(() => ["All", ...Array.from(new Set(devices.map((d) => d.type).filter(Boolean)))], [devices]);
  const filtered = useMemo(() => devices.filter((d) => {
    const q = search.toLowerCase();
    return (!q || d.assetTag.toLowerCase().includes(q) || d.brand?.toLowerCase().includes(q) || d.modelName?.toLowerCase().includes(q) || d.assignedTo?.toLowerCase().includes(q))
      && (filterType === "All" || d.type === filterType)
      && (filterStatus === "All" || d.status === filterStatus);
  }), [devices, search, filterType, filterStatus]);

  const handleSave = async (data: Omit<Device, "id">) => {
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
      {modal && <DeviceModal initial={modal.mode === "edit" ? modal.item : EMPTY_DEVICE} onSave={handleSave} onClose={() => !saving && setModal(null)} saving={saving} />}
      {deleteId && <ConfirmDialog title="Remove Device" message="Permanently remove this device from inventory?" onConfirm={handleDelete} onCancel={() => !deleting && setDeleteId(null)} loading={deleting} />}

      <div className="flex flex-wrap gap-3 items-center">
        {[
          { label: "In Use", count: devices.filter((d) => d.status === "In Use").length, cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
          { label: "Available", count: devices.filter((d) => d.status === "Available").length, cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
          { label: "In Repair", count: devices.filter((d) => d.status === "In Repair").length, cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
          { label: "Retired", count: devices.filter((d) => d.status === "Retired").length, cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
        ].map((chip) => (
          <button key={chip.label} onClick={() => setFilterStatus(filterStatus === chip.label ? "All" : chip.label)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all", chip.cls, filterStatus === chip.label ? "ring-2 ring-offset-1 ring-current" : "")}>
            <span className="text-base font-bold leading-none">{chip.count}</span>{chip.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{devices.length} total assets</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search asset tag, model, user…" className="pl-8 h-8 text-xs" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select className={SELECT_CLS} value={filterType} onChange={(e) => setFilterType(e.target.value)}>{types.map((t) => <option key={t}>{t}</option>)}</select>
          <select className={SELECT_CLS} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>{["All", "In Use", "Available", "In Repair", "Retired"].map((s) => <option key={s}>{s}</option>)}</select>
          <span className="text-xs text-muted-foreground">{filtered.length} device{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={() => setModal({ mode: "add" })} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer">
            <i className="fa-solid fa-plus text-[10px]" /> Register Device
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {["Asset Tag", "Type", "Brand / Model", "Assigned To", "Dept.", "OS", "Last Seen", "Condition", "Status", ""].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={10} />) :
              filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-muted-foreground"><i className="fa-solid fa-laptop text-2xl mb-2 block opacity-30" /><p className="text-xs">{devices.length === 0 ? "No devices registered yet." : "No results match."}</p></td></tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={row.id} className={cn("border-b border-border/60 hover:bg-muted/30 transition-colors group", idx % 2 === 0 ? "" : "bg-muted/10")}>
                    <td className="px-3 py-2.5 font-mono font-semibold text-primary whitespace-nowrap">{row.assetTag}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><span className="flex items-center gap-1.5 text-muted-foreground"><i className={cn(deviceIcon(row.type), "text-xs")} />{row.type}</span></td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap font-medium">{row.brand} {row.modelName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.assignedTo || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.department || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.os || "—"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{row.lastSeen || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><span className={statusBadge(row.condition)}>{row.condition}</span></td>
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
  taxAmount: 150,
  total: 1650,
  currency: "USD",
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
                <select className={cn(fieldCls, "cursor-pointer font-semibold text-primary")} value={form.currency || "USD"} onChange={(e) => setFormKey("currency", e.target.value)}>
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="INR">INR (₹ - Indian Rupee)</option>
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

  const filtered = useMemo(() => invoices.filter((inv) => {
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
  }), [invoices, search, filterStatus, filterCurrency, filterDateRange]);

  const totalRevenue = invoices.filter((inv) => inv.status === "Paid").reduce((acc, inv) => acc + (inv.total || 0), 0);
  const pendingAmount = invoices.filter((inv) => inv.status === "Pending" || inv.status === "Sent" || inv.status === "Overdue").reduce((acc, inv) => acc + (inv.total || 0), 0);

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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPreviewItem(null)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-primary">{previewItem.invoiceNo}</span>
                <h3 className="text-lg font-bold text-foreground">{previewItem.billedToName}</h3>
              </div>
              <span className={statusBadge(previewItem.status)}>{previewItem.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground font-semibold uppercase text-[10px]">Billed From</p>
                <p className="font-semibold text-foreground mt-1">{previewItem.businessName}</p>
                <p className="text-muted-foreground whitespace-pre-line">{previewItem.businessAddress}</p>
                <p className="text-muted-foreground">{previewItem.businessEmail}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold uppercase text-[10px]">Billed To</p>
                <p className="font-semibold text-foreground mt-1">{previewItem.billedToName}</p>
                <p className="text-muted-foreground whitespace-pre-line">{previewItem.billedToAddress}</p>
                <p className="text-muted-foreground">{previewItem.billedToEmail}</p>
              </div>
            </div>
            <div className="border border-border rounded-xl overflow-hidden text-xs">
              <table className="w-full">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] uppercase font-semibold text-muted-foreground">Description</th>
                    <th className="px-3 py-2 text-center text-[10px] uppercase font-semibold text-muted-foreground">Qty</th>
                    <th className="px-3 py-2 text-right text-[10px] uppercase font-semibold text-muted-foreground">Unit Price ({getCurrencySymbol(previewItem.currency)})</th>
                    <th className="px-3 py-2 text-right text-[10px] uppercase font-semibold text-muted-foreground">Amount ({getCurrencySymbol(previewItem.currency)})</th>
                  </tr>
                </thead>
                <tbody>
                  {previewItem.items?.map((item, idx) => (
                    <tr key={idx} className="border-b border-border/40">
                      <td className="p-3 text-foreground font-medium">{item.description}</td>
                      <td className="p-3 text-center text-muted-foreground">{item.quantity}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatCurrency(Number(item.unitPrice) || 0, previewItem.currency)}</td>
                      <td className="p-3 text-right font-semibold text-foreground">{formatCurrency(Number(item.amount) || 0, previewItem.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-end border-t border-border pt-4 text-xs">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Dates</p>
                <p className="text-muted-foreground mt-0.5">Issued: {previewItem.invoiceDate} | Due: {previewItem.dueDate}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Subtotal: {formatCurrency(previewItem.subtotal || 0, previewItem.currency)} | Tax ({previewItem.taxRate}%): {formatCurrency(previewItem.taxAmount || 0, previewItem.currency)}</p>
                <p className="text-lg font-bold text-primary mt-1">Total: {formatCurrency(previewItem.total || 0, previewItem.currency)}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button onClick={() => setPreviewItem(null)} className="px-4 py-1.5 rounded-lg border border-border bg-muted/60 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Total Invoices</p>
          <p className="text-xl font-bold text-foreground mt-1">{invoices.length}</p>
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
          <p className="text-xl font-bold text-blue-500 mt-1">{invoices.filter((i) => i.status === "Draft").length}</p>
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
            <option value="USD">USD ($)</option>
            <option value="INR">INR (₹)</option>
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

  const loadDevices = useCallback(async () => {
    try {
      const data = await apiFetch("/api/it/devices");
      setDevices((data.devices || []).map((d: any) => ({ ...normalise(d), id: d._id?.toString() || d.id })));
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

  useEffect(() => { loadLinks(); loadAccess(); loadSubs(); loadDevices(); loadInvoices(); }, [loadLinks, loadAccess, loadSubs, loadDevices, loadInvoices]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoadingLinks(true); setLoadingAccess(true); setLoadingSubs(true); setLoadingDevices(true); setLoadingInvoices(true);
    await Promise.all([loadLinks(), loadAccess(), loadSubs(), loadDevices(), loadInvoices()]);
    setRefreshing(false);
    showToast("Data refreshed", "info");
  };

  // ─── Drive Links CRUD ─────────────────────────────────────────────────────────
  const addLink = async (data: Omit<DriveLink, "id">) => {
    const res = await apiFetch("/api/it/drive-links", { method: "POST", body: JSON.stringify(data) });
    const doc = res.link;
    setLinks((p) => [{ ...doc, id: doc._id?.toString() || doc.id }, ...p]);
    showToast("File link added", "success");
  };

  const editLink = async (id: string, data: Omit<DriveLink, "id">) => {
    const res = await apiFetch(`/api/it/drive-links/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    const doc = res.link;
    setLinks((p) => p.map((l) => l.id === id ? { ...doc, id } : l));
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
    showToast("Device registered", "success");
  };

  const editDevice = async (id: string, data: Omit<Device, "id">) => {
    const res = await apiFetch(`/api/it/devices/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    const doc = res.device;
    setDevices((p) => p.map((d) => d.id === id ? { ...doc, id } : d));
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

  const totalRecords = links.length + access.length + subs.length + devices.length + invoices.length;
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
            <p className="text-xs text-muted-foreground">Manage access, subscriptions, assets, invoices & shared resources</p>
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
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/60 hover:bg-muted text-xs text-muted-foreground transition-colors cursor-pointer disabled:opacity-60">
            <i className={cn("fa-solid fa-rotate text-[10px]", refreshing && "fa-spin")} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            id={`it-tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer",
              activeTab === tab.key
                ? "bg-card text-foreground shadow-sm border border-border"
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
        {activeTab === "overview" && <OverviewTab access={access} subscriptions={subs} devices={devices} loading={overallLoading} onQuickAction={handleQuickAction} />}
        {activeTab === "drive" && <DriveLinksTab links={links} loading={loadingLinks} onAdd={addLink} onEdit={editLink} onDelete={deleteLink} autoOpenAdd={autoOpenAddTab === "drive"} />}
        {activeTab === "access" && <AccessTab access={access} loading={loadingAccess} onAdd={addAccess} onEdit={editAccess} onDelete={deleteAccess} onToggleStatus={toggleAccessStatus} autoOpenAdd={autoOpenAddTab === "access"} />}
        {activeTab === "subscriptions" && <SubscriptionsTab subs={subs} loading={loadingSubs} onAdd={addSub} onEdit={editSub} onDelete={deleteSub} autoOpenAdd={autoOpenAddTab === "subscriptions"} />}
        {activeTab === "devices" && <DevicesTab devices={devices} loading={loadingDevices} onAdd={addDevice} onEdit={editDevice} onDelete={deleteDevice} autoOpenAdd={autoOpenAddTab === "devices"} />}
        {activeTab === "invoices" && <InvoicesTab invoices={invoices} loading={loadingInvoices} onAdd={addInvoice} onEdit={editInvoice} onDelete={deleteInvoice} autoOpenAdd={autoOpenAddTab === "invoices"} />}
      </div>
    </div>
  );
}
