"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";

interface ReferralData {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  phone?: string;
  position: string;
  referrerName: string;
  referralCode?: string;
  status: "Submitted" | "Interviewing" | "Hired" | "Paid" | "Rejected";
  rewardAmount: number;
  payoutStatus: "Pending" | "Approved" | "Paid";
  notes?: string;
  createdAt: string;
}

const STAGES: Array<ReferralData["status"]> = [
  "Submitted",
  "Interviewing",
  "Hired",
  "Paid",
  "Rejected",
];

export default function ReferralsPage() {
  const [viewMode, setViewMode] = useTabPersistence<"kanban" | "grid">("referrals_view_mode", "kanban", ["kanban", "grid"]);

  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    phone: "",
    position: "",
    rewardAmount: 500,
    notes: "",
  });

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/referrals");
      if (res.ok) {
        const data = await res.json();
        setReferrals(data.referrals || []);
      }
    } catch (err) {
      console.error("Failed to fetch referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const handleSubmitReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          candidateName: "",
          candidateEmail: "",
          phone: "",
          position: "",
          rewardAmount: 500,
          notes: "",
        });
        fetchReferrals();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to submit referral");
      }
    } catch (err) {
      console.error("Submit referral error:", err);
    }
  };

  const handleUpdateStage = async (id: string, newStatus: ReferralData["status"]) => {
    try {
      let payoutStatusUpdate: ReferralData["payoutStatus"] | undefined = undefined;
      if (newStatus === "Hired") payoutStatusUpdate = "Approved";
      if (newStatus === "Paid") payoutStatusUpdate = "Paid";

      const res = await fetch(`/api/referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(payoutStatusUpdate && { payoutStatus: payoutStatusUpdate }),
        }),
      });

      if (res.ok) {
        fetchReferrals();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update stage");
      }
    } catch (err) {
      console.error("Update stage error:", err);
    }
  };

  const handleUpdatePayoutStatus = async (id: string, newPayoutStatus: ReferralData["payoutStatus"]) => {
    try {
      const res = await fetch(`/api/referrals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutStatus: newPayoutStatus }),
      });

      if (res.ok) {
        fetchReferrals();
      }
    } catch (err) {
      console.error("Update payout status error:", err);
    }
  };

  const handleDeleteReferral = async (id: string) => {
    if (!confirm("Are you sure you want to delete this referral record?")) return;
    try {
      const res = await fetch(`/api/referrals/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchReferrals();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete referral");
      }
    } catch (err) {
      console.error("Delete referral error:", err);
    }
  };

  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesSearch =
        r.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referrerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === "All" || r.status === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [referrals, searchQuery, stageFilter]);

  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReferrals.slice(start, start + itemsPerPage);
  }, [filteredReferrals, currentPage, itemsPerPage]);

  const metrics = useMemo(() => {
    const total = referrals.length;
    const hired = referrals.filter((r) => r.status === "Hired" || r.status === "Paid").length;
    const totalPayouts = referrals
      .filter((r) => r.payoutStatus === "Paid")
      .reduce((acc, r) => acc + (r.rewardAmount || 0), 0);
    const pendingPayouts = referrals
      .filter((r) => r.payoutStatus === "Pending" || r.payoutStatus === "Approved")
      .reduce((acc, r) => acc + (r.rewardAmount || 0), 0);

    return { total, hired, totalPayouts, pendingPayouts };
  }, [referrals]);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <i className="fa-solid fa-share-nodes text-primary text-xl" /> Referral & Reward Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track candidate pipeline stages (Submitted → Interviewing → Hired → Paid) and reward payout approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === "kanban" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-kanban text-xs" /> Pipeline Board
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === "grid" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-list text-xs" /> Card Grid
            </button>
          </div>

          <Button color="primary" size="sm" onClick={() => setShowModal(true)} className="gap-2">
            <i className="fa-solid fa-user-plus text-xs" /> Submit Referral
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Referrals</p>
              <p className="text-2xl font-bold text-foreground">{metrics.total}</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <i className="fa-solid fa-share-nodes text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hired Candidates</p>
              <p className="text-2xl font-bold text-foreground">{metrics.hired}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <i className="fa-solid fa-circle-check text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Payouts</p>
              <p className="text-2xl font-bold text-foreground">${metrics.pendingPayouts.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <i className="fa-solid fa-gift text-xl" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Rewards Paid</p>
              <p className="text-2xl font-bold text-foreground">${metrics.totalPayouts.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-sky-500/10 text-sky-500 rounded-xl">
              <i className="fa-solid fa-dollar-sign text-xl" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search candidate, position, or referrer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <Button
            variant={stageFilter === "All" ? "default" : "outline"}
            size="sm"
            onClick={() => setStageFilter("All")}
          >
            All
          </Button>
          {STAGES.map((stg) => (
            <Button
              key={stg}
              variant={stageFilter === stg ? "default" : "outline"}
              size="sm"
              onClick={() => setStageFilter(stg)}
            >
              {stg}
            </Button>
          ))}
        </div>
      </Card>

      {/* VIEW MODE 1: KANBAN PIPELINE BOARD */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageItems = filteredReferrals.filter((r) => r.status === stage);
            return (
              <div key={stage} className="bg-accent/30 p-3 rounded-xl border border-border flex flex-col min-w-[220px] space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-bold text-xs text-foreground uppercase tracking-wider">{stage}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">{stageItems.length}</Badge>
                </div>

                <div className="space-y-3 flex-1">
                  {stageItems.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-6">No candidates in {stage}</p>
                  ) : (
                    stageItems.map((ref) => (
                      <Card key={ref._id} className="p-3 space-y-2 border border-border shadow-xs hover:shadow-md transition-all bg-card">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-xs text-foreground">{ref.candidateName}</p>
                            {ref.referralCode && (
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold border border-primary/20">
                                {ref.referralCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-primary font-semibold">{ref.position}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">By: {ref.referrerName}</p>
                        </div>

                        <div className="p-2 rounded bg-muted/40 border border-border/60 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-500">${ref.rewardAmount}</span>
                          <select
                            value={ref.payoutStatus}
                            onChange={(e) => handleUpdatePayoutStatus(ref._id, e.target.value as any)}
                            className="text-[10px] font-semibold bg-background border border-border rounded px-1 py-0.5 text-foreground cursor-pointer"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Paid">Paid</option>
                          </select>
                        </div>

                        {/* Stage Transition Control */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                          <select
                            value={ref.status}
                            onChange={(e) => handleUpdateStage(ref._id, e.target.value as any)}
                            className="text-[10px] font-bold text-primary bg-background border border-border rounded px-1 py-0.5 cursor-pointer"
                          >
                            {STAGES.map((s) => (
                              <option key={s} value={s}>Stage: {s}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDeleteReferral(ref._id)}
                            className="text-destructive hover:underline text-[10px] cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: CARD GRID VIEW */}
      {viewMode === "grid" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedReferrals.map((ref) => (
              <Card key={ref._id} className="hover:shadow-md transition-all flex flex-col justify-between border-l-4 border-l-primary">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold text-foreground">{ref.candidateName}</CardTitle>
                      {ref.referralCode && (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold border border-primary/20">
                          {ref.referralCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-primary font-semibold mt-0.5">{ref.position}</p>
                  </div>
                  <Badge color={ref.status === "Hired" ? "success" : ref.status === "Paid" ? "info" : "warning"} variant="soft">
                    {ref.status}
                  </Badge>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="flex items-center gap-2"><i className="fa-solid fa-envelope text-xs" /> {ref.candidateEmail}</p>
                    <p className="text-foreground">Referred by: <strong>{ref.referrerName}</strong></p>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Bonus Reward</span>
                      <span className="font-bold text-emerald-500 text-sm">${ref.rewardAmount.toLocaleString()}</span>
                    </div>
                    <Badge color={ref.payoutStatus === "Paid" ? "success" : "warning"} variant="soft">
                      Payout: {ref.payoutStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex gap-1.5">
                      {ref.status === "Submitted" && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateStage(ref._id, "Interviewing")}>
                          Interviewing
                        </Button>
                      )}
                      {(ref.status === "Submitted" || ref.status === "Interviewing") && (
                        <Button size="sm" color="success" onClick={() => handleUpdateStage(ref._id, "Hired")}>
                          Mark Hired
                        </Button>
                      )}
                      {ref.status === "Hired" && (
                        <Button size="sm" color="primary" onClick={() => handleUpdateStage(ref._id, "Paid")}>
                          Mark Paid
                        </Button>
                      )}
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => handleDeleteReferral(ref._id)} className="h-8 w-8 text-destructive">
                      <i className="fa-solid fa-trash text-xs" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredReferrals.length}
            itemsPerPage={itemsPerPage}
          />
        </>
      )}

      {/* Submit Referral Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <i className="fa-solid fa-user-plus text-primary text-base" /> Submit Candidate Referral
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer"><i className="fa-solid fa-xmark text-sm" /></button>
            </div>
            <form onSubmit={handleSubmitReferral} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Candidate Name *</label>
                <Input
                  value={formData.candidateName}
                  onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                  placeholder="Jane Smith"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Candidate Email *</label>
                <Input
                  type="email"
                  value={formData.candidateEmail}
                  onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                  placeholder="jane@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Target Role / Position *</label>
                  <Input
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Senior Developer"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Reward Amount ($)</label>
                  <Input
                    type="number"
                    value={formData.rewardAmount}
                    onChange={(e) => setFormData({ ...formData, rewardAmount: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button color="primary" size="sm" type="submit">Submit Referral</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
