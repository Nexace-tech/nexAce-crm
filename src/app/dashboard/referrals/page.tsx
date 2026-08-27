"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Preloader } from "@/components/ui/Preloader";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { useTabPersistence } from "@/hooks/useTabPersistence";
import { usePermissions } from "@/hooks/usePermissions";

interface IStageHistory {
  status: string;
  updatedBy: string;
  updatedAt: string;
  comment?: string;
}

interface ReferralData {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  phone?: string;
  position: string;
  department?: string;
  experienceYears?: number;
  candidateResumeUrl?: string;
  referrerName: string;
  referrerId?: string;
  referralCode?: string;
  status: "Submitted" | "Interviewing" | "Hired" | "Paid" | "Rejected";
  rewardAmount: number;
  payoutStatus: "Pending" | "Approved" | "Paid";
  payoutDate?: string;
  stageHistory?: IStageHistory[];
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

const STAGE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: string }> = {
  Submitted: { label: "Submitted", bg: "bg-sky-500/10", text: "text-sky-500", border: "border-sky-500/20", icon: "fa-solid fa-paper-plane" },
  Interviewing: { label: "Interviewing", bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", icon: "fa-solid fa-comments" },
  Hired: { label: "Hired", bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/20", icon: "fa-solid fa-user-check" },
  Paid: { label: "Paid & Completed", bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/20", icon: "fa-solid fa-sack-dollar" },
  Rejected: { label: "Rejected", bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20", icon: "fa-solid fa-user-xmark" },
};

export default function ReferralsPage() {
  const { can, isAdmin, isOPS } = usePermissions();

  const [viewMode, setViewMode] = useTabPersistence<"kanban" | "grid">("referrals_view_mode", "kanban", ["kanban", "grid"]);

  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [canViewAll, setCanViewAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("All");
  const [scopeFilter, setScopeFilter] = useState<"all" | "own">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Candidate for Drawer / Detail Modal
  const [selectedReferral, setSelectedReferral] = useState<ReferralData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [referralToDelete, setReferralToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingReferral, setIsDeletingReferral] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Submit Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    candidateName: "",
    candidateEmail: "",
    phone: "",
    position: "",
    department: "Engineering",
    experienceYears: "3",
    candidateResumeUrl: "",
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
        setCanViewAll(Boolean(data.canViewAll));
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
    if (!formData.candidateName.trim() || !formData.candidateEmail.trim() || !formData.position.trim()) {
      alert("Please fill in candidate name, email, and target position.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const resData = await res.json();

      if (res.ok) {
        setShowModal(false);
        setFormData({
          candidateName: "",
          candidateEmail: "",
          phone: "",
          position: "",
          department: "Engineering",
          experienceYears: "3",
          candidateResumeUrl: "",
          rewardAmount: 500,
          notes: "",
        });
        fetchReferrals();
      } else {
        alert(resData.error || "Failed to submit referral");
      }
    } catch (err) {
      console.error("Submit referral error:", err);
      alert("Error submitting candidate referral.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStage = async (referralId: string, newStatus: string, newPayoutStatus?: string) => {
    try {
      const res = await fetch("/api/referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralId,
          status: newStatus,
          payoutStatus: newPayoutStatus,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (selectedReferral && selectedReferral._id === referralId) {
          setSelectedReferral(data.referral);
        }
        fetchReferrals();
        showToast("Referral stage updated successfully", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update referral stage.", "error");
      }
    } catch (err) {
      console.error("Update stage error:", err);
      showToast("Failed to update referral stage.", "error");
    }
  };

  const handleDeleteReferral = async (id: string) => {
    try {
      setIsDeletingReferral(true);
      const res = await fetch(`/api/referrals/${id}`, { method: "DELETE" });
      if (res.ok) {
        setShowDetailModal(false);
        setSelectedReferral(null);
        setReferralToDelete(null);
        fetchReferrals();
        showToast("Candidate referral removed successfully.", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete referral.", "error");
      }
    } catch (err) {
      console.error("Delete referral error:", err);
      showToast("Error deleting candidate referral.", "error");
    } finally {
      setIsDeletingReferral(false);
    }
  };

  // Filtered List
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        (r.candidateName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (r.candidateEmail?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (r.position?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (r.referralCode?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (r.referrerName?.toLowerCase() || "").includes(searchQuery.toLowerCase());

      const matchesStage = stageFilter === "All" || r.status === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [referrals, searchQuery, stageFilter]);

  // Analytics Metrics
  const stats = useMemo(() => {
    const total = referrals.length;
    const interviewing = referrals.filter((r) => r.status === "Interviewing").length;
    const hired = referrals.filter((r) => r.status === "Hired" || r.status === "Paid").length;
    const paidAmount = referrals
      .filter((r) => r.payoutStatus === "Paid")
      .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);
    const pendingAmount = referrals
      .filter((r) => r.payoutStatus === "Approved" || (r.status === "Hired" && r.payoutStatus === "Pending"))
      .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

    return { total, interviewing, hired, paidAmount, pendingAmount };
  }, [referrals]);

  // Pagination for Grid View
  const totalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const paginatedReferrals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReferrals.slice(start, start + itemsPerPage);
  }, [filteredReferrals, currentPage]);

  if (loading) {
    return <Preloader label="Loading Candidate Referral Pipeline..." />;
  }

  const canManage = isAdmin || isOPS || can("manageReferrals");

  return (
    <div className="space-y-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ══ Header Banner ══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 text-primary">
              <i className="fa-solid fa-link text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Referral Pipeline
                <Badge variant="outline" className="border-primary/40 text-primary bg-primary/5 font-medium">
                  Talent Acquisition
                </Badge>
              </h1>
              <p className="text-muted-foreground text-sm">
                Nominate top external talent, track interview candidate progression, and earn referral bonus rewards.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium shadow-md cursor-pointer"
          >
            <i className="fa-solid fa-user-plus" /> Submit Candidate
          </Button>
        </div>
      </div>

      {/* ══ Analytics Cards ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Submissions</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Workspace candidates</p>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-500">
              <i className="fa-solid fa-users-viewfinder text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">In Interviewing</p>
              <p className="text-2xl font-bold text-amber-500 mt-1">{stats.interviewing}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Active hiring stages</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
              <i className="fa-solid fa-comments text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Successful Hires</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{stats.hired}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Onboarded candidates</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
              <i className="fa-solid fa-user-check text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Bonus Payouts</p>
              <p className="text-2xl font-bold text-purple-500 mt-1">₹{stats.paidAmount.toLocaleString("en-IN")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">₹{stats.pendingAmount.toLocaleString("en-IN")} pending release</p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-500">
              <i className="fa-solid fa-sack-dollar text-lg" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══ Filter & View Controls Bar ══ */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card/40">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search input */}
          <div className="relative flex-1 sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search candidate, role, code..."
              className="pl-8 h-9 text-xs bg-background"
            />
          </div>

          {/* Stage filter */}
          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 bg-background border border-input text-foreground text-xs rounded-xl px-3 focus:outline-none"
          >
            <option value="All">All Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                viewMode === "kanban" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-table-columns text-xs" /> Kanban Board
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                viewMode === "grid" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-grip text-xs" /> Grid List
            </button>
          </div>
        </div>
      </div>

      {/* ══ VIEW MODE 1: KANBAN BOARD ══ */}
      {viewMode === "kanban" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 w-full">
          {STAGES.map((stage) => {
            const stageConfig = STAGE_CONFIG[stage];
            const stageItems = filteredReferrals.filter((r) => r.status === stage);

            return (
              <div key={stage} className="flex flex-col w-full bg-card/40 rounded-2xl border border-border/70 p-3 space-y-3 shadow-2xs">
                {/* Column Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("p-1.5 rounded-lg text-xs", stageConfig.bg, stageConfig.text)}>
                      <i className={stageConfig.icon} />
                    </span>
                    <h3 className="text-xs font-bold text-foreground tracking-tight">{stageConfig.label}</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-2 py-0 font-bold border-border">
                    {stageItems.length}
                  </Badge>
                </div>

                {/* Candidate Cards Column */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin pr-1">
                  {stageItems.length === 0 ? (
                    <div className="p-4 border border-dashed border-border/60 rounded-xl text-center">
                      <p className="text-[11px] text-muted-foreground/60 italic">No candidates in {stage}</p>
                    </div>
                  ) : (
                    stageItems.map((referral) => (
                      <div
                        key={referral._id}
                        onClick={() => {
                          setSelectedReferral(referral);
                          setShowDetailModal(true);
                        }}
                        className="p-3.5 rounded-xl border border-border bg-card hover:bg-accent/30 hover:border-primary/40 transition-all shadow-xs cursor-pointer space-y-2.5 group relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                              {referral.candidateName}
                            </p>
                            <p className="text-[11px] font-medium text-muted-foreground truncate">{referral.position}</p>
                          </div>
                          {referral.referralCode && (
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0 border border-border">
                              {referral.referralCode}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                          <span className="truncate flex items-center gap-1">
                            <i className="fa-solid fa-user-tag text-[9px] text-primary" /> {referral.referrerName}
                          </span>
                          <span className="font-bold text-purple-500 font-mono">${referral.rewardAmount}</span>
                        </div>

                        {/* Payout status indicator */}
                        <div className="flex items-center justify-between text-[9px] font-medium">
                          <span className="text-muted-foreground/70">
                            {new Date(referral.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.2 rounded font-bold uppercase tracking-wider text-[8px]",
                              referral.payoutStatus === "Paid"
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : referral.payoutStatus === "Approved"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            Payout: {referral.payoutStatus}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ VIEW MODE 2: GRID / LIST VIEW ══ */}
      {viewMode === "grid" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedReferrals.length === 0 ? (
              <div className="col-span-2 p-12 rounded-2xl border border-dashed border-border text-center">
                <i className="fa-solid fa-users-slash text-3xl text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground font-medium">No candidate referrals match your search filter.</p>
              </div>
            ) : (
              paginatedReferrals.map((r) => {
                const stageCfg = STAGE_CONFIG[r.status] || STAGE_CONFIG.Submitted;

                return (
                  <Card
                    key={r._id}
                    onClick={() => {
                      setSelectedReferral(r);
                      setShowDetailModal(true);
                    }}
                    className="border-border hover:border-primary/40 transition-all cursor-pointer group hover:shadow-md"
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                              {r.candidateName}
                            </h3>
                            {r.referralCode && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                {r.referralCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                            <span>{r.position}</span>
                            {r.department && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {r.department}
                              </span>
                            )}
                          </p>
                        </div>

                        <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-0.5 gap-1.5", stageCfg.bg, stageCfg.text, stageCfg.border)}>
                          <i className={stageCfg.icon} /> {stageCfg.label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50">
                        <div>
                          <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">Referrer</p>
                          <p className="font-medium text-foreground truncate mt-0.5">{r.referrerName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold">Reward Amount</p>
                          <p className="font-bold text-purple-500 font-mono mt-0.5">${r.rewardAmount} ({r.payoutStatus})</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-envelope text-xs" /> {r.candidateEmail}
                        </span>
                        <span>{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-4 flex justify-center">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </>
      )}

      {/* ══ MODAL 1: SUBMIT NEW CANDIDATE REFERRAL ══ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-card/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary border border-primary/20">
                  <i className="fa-solid fa-user-plus text-lg" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Submit Candidate Referral</h3>
                  <p className="text-xs text-muted-foreground">Nominate top talent for open roles in your organization</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            <form onSubmit={handleSubmitReferral} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Candidate Full Name *</label>
                  <Input
                    required
                    value={formData.candidateName}
                    onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                    placeholder="e.g. Alex Johnson"
                    className="text-sm bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Candidate Email *</label>
                  <Input
                    required
                    type="email"
                    value={formData.candidateEmail}
                    onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                    placeholder="alex.j@example.com"
                    className="text-sm bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Phone Number</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="text-sm bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target Role / Position *</label>
                  <Input
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g. Senior Frontend Developer"
                    className="text-sm bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-background border border-input text-foreground text-sm rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="Marketing & Sales">Marketing & Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Human Resources">Human Resources</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Experience (Years)</label>
                  <Input
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
                    placeholder="3"
                    className="text-sm bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Resume / Portfolio URL</label>
                <Input
                  type="url"
                  value={formData.candidateResumeUrl}
                  onChange={(e) => setFormData({ ...formData, candidateResumeUrl: e.target.value })}
                  placeholder="https://drive.google.com/file/..."
                  className="text-sm bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Expected Reward Bonus ($)</label>
                <Input
                  type="number"
                  value={formData.rewardAmount}
                  onChange={(e) => setFormData({ ...formData, rewardAmount: Number(e.target.value) })}
                  placeholder="500"
                  className="text-sm bg-background font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Referral Notes & Key Highlights</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Mention why candidate is a great fit, past experience, or key achievements..."
                  className="w-full bg-background border border-input text-foreground text-xs rounded-xl p-3 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground gap-2 cursor-pointer font-medium">
                  {submitting ? "Submitting..." : "Submit Referral"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL 2: CANDIDATE DETAILS & STAGE MANAGEMENT DRAWER ══ */}
      {showDetailModal && selectedReferral && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex items-center justify-between bg-card/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                  <i className="fa-solid fa-address-card text-xl" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-foreground">{selectedReferral.candidateName}</h3>
                    {selectedReferral.referralCode && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                        {selectedReferral.referralCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedReferral.position} &middot; {selectedReferral.department || "Engineering"}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedReferral(null);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-thin">
              {/* Stage Progress Bar */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Hiring Stage Pipeline</span>
                  <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-0.5", STAGE_CONFIG[selectedReferral.status]?.bg, STAGE_CONFIG[selectedReferral.status]?.text)}>
                    {STAGE_CONFIG[selectedReferral.status]?.label}
                  </Badge>
                </div>

                {/* Stage selector buttons for HR/Admin/SubAdmin */}
                {canManage && (
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                    <span className="text-[10px] font-semibold text-muted-foreground">Move Stage:</span>
                    {STAGES.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleUpdateStage(selectedReferral._id, s)}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border",
                          selectedReferral.status === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Candidate Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact & Details</p>
                  <p className="text-xs text-foreground font-medium flex items-center gap-2">
                    <i className="fa-solid fa-envelope text-primary text-xs" /> {selectedReferral.candidateEmail}
                  </p>
                  {selectedReferral.phone && (
                    <p className="text-xs text-foreground font-medium flex items-center gap-2">
                      <i className="fa-solid fa-phone text-emerald-500 text-xs" /> {selectedReferral.phone}
                    </p>
                  )}
                  {selectedReferral.experienceYears !== undefined && (
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <i className="fa-solid fa-briefcase text-amber-500 text-xs" /> {selectedReferral.experienceYears} Years Experience
                    </p>
                  )}
                  {selectedReferral.candidateResumeUrl && (
                    <a
                      href={selectedReferral.candidateResumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline pt-1"
                    >
                      <i className="fa-solid fa-file-pdf text-rose-500" /> View Candidate Resume / Portfolio
                    </a>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referrer & Payout Status</p>
                  <p className="text-xs text-foreground font-medium flex items-center gap-2">
                    <i className="fa-solid fa-user-tag text-purple-500 text-xs" /> Referrer: <strong className="text-foreground">{selectedReferral.referrerName}</strong>
                  </p>
                  <p className="text-xs text-foreground font-medium flex items-center gap-2">
                    <i className="fa-solid fa-sack-dollar text-amber-500 text-xs" /> Bonus: <strong className="font-mono text-purple-500">${selectedReferral.rewardAmount}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <i className="fa-solid fa-credit-card text-sky-500 text-xs" /> Payout Status: <strong className="text-foreground">{selectedReferral.payoutStatus}</strong>
                  </p>

                  {/* Payout Action Buttons for HR/Admin/SubAdmin */}
                  {canManage && selectedReferral.payoutStatus !== "Paid" && (
                    <div className="pt-2 flex items-center gap-2">
                      {selectedReferral.payoutStatus === "Pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStage(selectedReferral._id, selectedReferral.status, "Approved")}
                          className="h-7 text-[11px] text-amber-500 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer"
                        >
                          Approve Payout
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStage(selectedReferral._id, "Paid", "Paid")}
                        className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        Mark Bonus Paid
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Candidate Notes */}
              {selectedReferral.notes && (
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Referral Notes</p>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{selectedReferral.notes}</p>
                </div>
              )}

              {/* Stage Audit History */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <i className="fa-solid fa-clock-rotate-left text-xs" /> Stage Progression History
                </p>
                <div className="space-y-2">
                  {selectedReferral.stageHistory && selectedReferral.stageHistory.length > 0 ? (
                    selectedReferral.stageHistory.map((hist, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {hist.status}
                          </Badge>
                          <span className="text-muted-foreground">{hist.comment}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/70 shrink-0">
                          {hist.updatedBy} &middot; {new Date(hist.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">No stage updates logged yet.</p>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              {canManage && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={() => setReferralToDelete({ id: selectedReferral._id, name: selectedReferral.candidateName })}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer gap-1.5"
                  >
                    <i className="fa-solid fa-trash-can" /> Delete Referral
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedReferral(null);
                    }}
                    className="cursor-pointer text-xs"
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2",
            toast.type === "success"
              ? "bg-emerald-500/90 text-white border-emerald-600"
              : "bg-destructive/90 text-white border-destructive"
          )}
        >
          {toast.type === "success" ? <i className="fa-solid fa-circle-check text-base" /> : <i className="fa-solid fa-circle-exclamation text-base" />}
          {toast.message}
        </div>
      )}

      {/* Delete Referral Confirmation Modal */}
      {referralToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
                <i className="fa-solid fa-triangle-exclamation text-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Delete Candidate Referral</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to remove <strong className="text-foreground">{referralToDelete.name}</strong> from the pipeline? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReferralToDelete(null)}
                disabled={isDeletingReferral}
              >
                Cancel
              </Button>
              <Button
                color="destructive"
                size="sm"
                onClick={() => handleDeleteReferral(referralToDelete.id)}
                disabled={isDeletingReferral}
                className="gap-2 font-semibold cursor-pointer"
              >
                {isDeletingReferral ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin text-xs" /> Deleting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-trash-can text-xs" /> Delete Referral
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
