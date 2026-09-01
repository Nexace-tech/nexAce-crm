"use client";

import React, { useState, useEffect } from "react";
import { SalesWorkdeskDashboard, SalesDeal } from "@/components/operations/SalesWorkdeskDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

export default function SalesWorkdeskPage() {
  const { can, isAdmin, isOPS } = usePermissions();

  // ── State ──
  const [salesDeals, setSalesDeals] = useState<SalesDeal[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [editingSalesDeal, setEditingSalesDeal] = useState<SalesDeal | null>(null);
  const [salesSubmitting, setSalesSubmitting] = useState(false);
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

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──
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

  useEffect(() => {
    fetchSalesDeals();
  }, []);

  // ── Handlers ──
  const handleOpenSalesModal = (deal?: SalesDeal) => {
    if (deal) {
      setEditingSalesDeal(deal);
      setSalesFormData({
        clientAccount: deal.clientAccount,
        dealName: deal.dealName,
        dealValue: String(deal.dealValue),
        stage: deal.stage,
        probability: deal.probability,
        owner: deal.owner,
        expectedClose: deal.expectedClose ? deal.expectedClose.split("T")[0] : "",
        venture: deal.venture,
        notes: deal.notes || "",
      });
    } else {
      setEditingSalesDeal(null);
      setSalesFormData({
        clientAccount: "",
        dealName: "",
        dealValue: "",
        stage: "Prospecting",
        probability: 50,
        owner: "",
        expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        venture: "Ace Consultancys",
        notes: "",
      });
    }
    setShowSalesModal(true);
  };

  const handleSaveSalesDeal = async (e: React.FormEvent) => {
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
        showToast(editingSalesDeal ? "Deal updated successfully." : "Deal created successfully.");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to save deal.", "error");
      }
    } catch {
      showToast("Failed to save deal.", "error");
    } finally {
      setSalesSubmitting(false);
    }
  };

  const handleDeleteDeal = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/operations/sales-deals/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setSalesDeals(prev => prev.filter(d => d._id !== deleteTarget.id));
        showToast("Deal deleted successfully.");
        setDeleteTarget(null);
      } else {
        showToast("Failed to delete deal.", "error");
      }
    } catch {
      showToast("Failed to delete deal.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const inputCls = "h-9 text-sm bg-background border-input focus:ring-1 focus:ring-primary";
  const labelCls = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-semibold max-w-sm animate-in slide-in-from-right-5",
          toast.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
        )}>
          <i className={cn("fa-solid text-base", toast.type === "success" ? "fa-circle-check" : "fa-circle-xmark")} />
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <i className="fa-solid fa-handshake text-primary text-xl" /> Sales Workdesk
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your full sales pipeline — track deals, stages, and revenue forecasts.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchSalesDeals} className="gap-2 h-8 font-semibold cursor-pointer">
            <i className="fa-solid fa-rotate-right text-xs" /> Refresh
          </Button>
          {(isAdmin || isOPS || can("createClients")) && (
            <Button size="sm" onClick={() => handleOpenSalesModal()} className="gap-2 font-semibold h-8 cursor-pointer">
              <i className="fa-solid fa-plus text-xs" /> New Deal
            </Button>
          )}
        </div>
      </div>

      {/* Sales Dashboard */}
      <SalesWorkdeskDashboard
        deals={salesDeals}
        loading={salesLoading}
        onNewDeal={() => handleOpenSalesModal()}
        onEditDeal={(deal) => handleOpenSalesModal(deal)}
        onDeleteDeal={(id, name) => setDeleteTarget({ id, name })}
        onRefresh={fetchSalesDeals}
      />

      {/* ── Add / Edit Deal Modal ── */}
      {showSalesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowSalesModal(false)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <i className="fa-solid fa-handshake text-primary" />
                {editingSalesDeal ? "Edit Deal" : "New Sales Deal"}
              </h2>
              <button
                onClick={() => setShowSalesModal(false)}
                className="p-1.5 hover:bg-muted rounded-lg cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleSaveSalesDeal} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className={labelCls}>Client / Account <span className="text-rose-500">*</span></label>
                <Input
                  className={inputCls}
                  value={salesFormData.clientAccount}
                  onChange={e => setSalesFormData(p => ({ ...p, clientAccount: e.target.value }))}
                  placeholder="e.g. Apex Digital Labs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Deal Name <span className="text-rose-500">*</span></label>
                <Input
                  className={inputCls}
                  value={salesFormData.dealName}
                  onChange={e => setSalesFormData(p => ({ ...p, dealName: e.target.value }))}
                  placeholder="e.g. Enterprise CRM Package"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Deal Value ($)</label>
                  <Input
                    type="number"
                    min="0"
                    className={inputCls}
                    value={salesFormData.dealValue}
                    onChange={e => setSalesFormData(p => ({ ...p, dealValue: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Probability (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className={inputCls}
                    value={salesFormData.probability}
                    onChange={e => setSalesFormData(p => ({ ...p, probability: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Stage</label>
                  <select
                    value={salesFormData.stage}
                    onChange={e => setSalesFormData(p => ({ ...p, stage: e.target.value as SalesDeal["stage"] }))}
                    className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {["Prospecting", "Discovery", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Expected Close</label>
                  <Input
                    type="date"
                    className={inputCls}
                    value={salesFormData.expectedClose}
                    onChange={e => setSalesFormData(p => ({ ...p, expectedClose: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Owner</label>
                  <Input
                    className={inputCls}
                    value={salesFormData.owner}
                    onChange={e => setSalesFormData(p => ({ ...p, owner: e.target.value }))}
                    placeholder="Deal owner name"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Venture</label>
                  <select
                    value={salesFormData.venture}
                    onChange={e => setSalesFormData(p => ({ ...p, venture: e.target.value }))}
                    className="w-full h-9 rounded-md border border-input bg-background text-sm px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {["Ace Consultancys", "NexAce Tech", "Ziqsy", "Other"].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Notes</label>
                <textarea
                  rows={2}
                  className="w-full rounded-md border border-input bg-background text-sm px-3 py-2 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={salesFormData.notes}
                  onChange={e => setSalesFormData(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSalesModal(false)} disabled={salesSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={salesSubmitting} className="gap-2 font-semibold cursor-pointer">
                  {salesSubmitting ? (
                    <><i className="fa-solid fa-spinner fa-spin text-xs" /> Saving...</>
                  ) : (
                    <><i className="fa-solid fa-floppy-disk text-xs" /> {editingSalesDeal ? "Update Deal" : "Create Deal"}</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete Sales Deal</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to delete <strong className="text-foreground">{deleteTarget.name}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={handleDeleteDeal}
                disabled={isDeleting}
                className="gap-2 font-semibold cursor-pointer"
              >
                {isDeleting ? (
                  <><i className="fa-solid fa-spinner fa-spin text-xs" /> Deleting...</>
                ) : (
                  <><i className="fa-solid fa-trash-can text-xs" /> Confirm Delete</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
