"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

interface IFnFRecord {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department?: string;
  designation?: string;
  dateOfJoining?: string;
  resignationDate: string;
  lastWorkingDay: string;
  noticePeriodDays: number;
  servedNoticeDays: number;
  noticeShortfallDays: number;
  monthlyGrossSalary: number;
  perDayRate: number;
  earnings: {
    unpaidSalaryDays: number;
    unpaidSalaryAmount: number;
    leaveEncashmentDays: number;
    leaveEncashmentAmount: number;
    gratuityAmount: number;
    statutoryBonus: number;
    reimbursements: number;
    totalEarnings: number;
  };
  deductions: {
    noticeShortfallAmount: number;
    assetLossDeduction: number;
    loanAdvanceRecovery: number;
    incomeTaxTds: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netSettlementPayable: number;
  clearances: {
    it: {
      status: "Pending" | "Cleared";
      clearedBy?: string;
      clearedAt?: string;
      assetsReturned: boolean;
      notes?: string;
    };
    finance: {
      status: "Pending" | "Cleared";
      clearedBy?: string;
      clearedAt?: string;
      claimsSettled: boolean;
      notes?: string;
    };
    hr: {
      status: "Pending" | "Cleared";
      clearedBy?: string;
      clearedAt?: string;
      exitInterviewDone: boolean;
      idCardReturned: boolean;
      notes?: string;
    };
  };
  settlementStatus: "Draft" | "Pending Clearances" | "Approved" | "Disbursed";
  disbursedAt?: string;
  disbursedReference?: string;
  remarks?: string;
  createdAt: string;
}

export function FullAndFinalSettlementDesk() {
  const { user: currentUser } = useAuth();
  const { can, isAdmin } = usePermissions();
  const canManage = isAdmin || can("manageFnFSettlements");
  const canView = isAdmin || can("viewFnFSettlements");

  const [settlements, setSettlements] = useState<IFnFRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Initiate Modal States
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [resignationDate, setResignationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lastWorkingDay, setLastWorkingDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);
  const [servedNoticeDays, setServedNoticeDays] = useState(30);
  const [remarks, setRemarks] = useState("");
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View / Print Statement Modal
  const [selectedSettlement, setSelectedSettlement] = useState<IFnFRecord | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);

  // Disburse Modal State
  const [disburseRecord, setDisburseRecord] = useState<IFnFRecord | null>(null);
  const [disburseRef, setDisburseRef] = useState("");
  const [isDisbursing, setIsDisbursing] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/fnf");
      if (res.ok) {
        const data = await res.json();
        setSettlements(data.settlements || []);
      }
    } catch {
      showToast("Failed to fetch F&F settlements", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyUsers = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setCompanyUsers(data.users || []);
      }
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    fetchSettlements();
    if (canManage) fetchCompanyUsers();
  }, [canManage]);

  // Fetch calculation preview when selecting user or changing LWD in Initiate Modal
  useEffect(() => {
    if (!selectedUserId || !showInitiateModal) {
      setPreviewData(null);
      return;
    }
    const loadPreview = async () => {
      setLoadingPreview(true);
      try {
        const res = await fetch(`/api/hr/fnf?previewUserId=${selectedUserId}&lastWorkingDay=${lastWorkingDay}`);
        if (res.ok) {
          const data = await res.json();
          setPreviewData(data.preview || null);
        }
      } catch {
        // non-fatal
      } finally {
        setLoadingPreview(false);
      }
    };
    loadPreview();
  }, [selectedUserId, lastWorkingDay, showInitiateModal]);

  const handleCreateSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      showToast("Please choose an employee", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        userId: selectedUserId,
        resignationDate,
        lastWorkingDay,
        noticePeriodDays,
        servedNoticeDays,
        monthlyGrossSalary: previewData?.user?.salary || 0,
        earnings: {
          unpaidSalaryDays: previewData?.unpaidSalaryDays || 0,
          unpaidSalaryAmount: previewData?.unpaidSalaryAmount || 0,
          leaveEncashmentDays: previewData?.leaveEncashmentDays || 0,
          leaveEncashmentAmount: previewData?.leaveEncashmentAmount || 0,
          gratuityAmount: 0,
          statutoryBonus: 0,
          reimbursements: 0,
        },
        deductions: {
          noticeShortfallAmount: Math.max(0, (noticePeriodDays - servedNoticeDays) * (previewData?.perDayRate || 0)),
          assetLossDeduction: 0,
          loanAdvanceRecovery: 0,
          incomeTaxTds: 0,
          otherDeductions: 0,
        },
        remarks,
      };

      const res = await fetch("/api/hr/fnf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Full & Final settlement initiated successfully");
        setShowInitiateModal(false);
        setSelectedUserId("");
        fetchSettlements();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to create settlement", "error");
      }
    } catch {
      showToast("Network error creating settlement", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearDepartment = async (recordId: string, department: "it" | "finance" | "hr") => {
    if (!confirm(`Mark ${department.toUpperCase()} clearance as CLEARED for this employee?`)) return;

    try {
      const res = await fetch("/api/hr/fnf", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: recordId,
          department,
          status: "Cleared",
        }),
      });

      if (res.ok) {
        showToast(`${department.toUpperCase()} clearance recorded successfully`);
        fetchSettlements();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to record clearance", "error");
      }
    } catch {
      showToast("Failed to record clearance", "error");
    }
  };

  const handleConfirmDisbursement = async () => {
    if (!disburseRecord) return;
    setIsDisbursing(true);
    try {
      const res = await fetch("/api/hr/fnf", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: disburseRecord._id,
          settlementStatus: "Disbursed",
          disbursedReference: disburseRef || `BANK-DISB-${Date.now().toString().slice(-6)}`,
        }),
      });

      if (res.ok) {
        showToast("Settlement marked as Disbursed");
        setDisburseRecord(null);
        setDisburseRef("");
        fetchSettlements();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to disburse settlement", "error");
      }
    } catch {
      showToast("Failed to disburse settlement", "error");
    } finally {
      setIsDisbursing(false);
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const total = settlements.length;
    const pendingClearances = settlements.filter((s) => s.settlementStatus === "Pending Clearances").length;
    const approved = settlements.filter((s) => s.settlementStatus === "Approved").length;
    const totalDisbursed = settlements
      .filter((s) => s.settlementStatus === "Disbursed")
      .reduce((sum, s) => sum + s.netSettlementPayable, 0);

    return { total, pendingClearances, approved, totalDisbursed };
  }, [settlements]);

  // Filtered List
  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      const matchesStatus = statusFilter === "All" || s.settlementStatus === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.userName.toLowerCase().includes(q) ||
        s.userEmail.toLowerCase().includes(q) ||
        (s.department || "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [settlements, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 border",
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 backdrop-blur-md"
              : "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 backdrop-blur-md"
          )}
        >
          <i className={cn("fa-solid text-sm", toast.type === "success" ? "fa-circle-check" : "fa-circle-exclamation")} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-background to-primary/5 border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center shrink-0 text-xl shadow-xs">
            <i className="fa-solid fa-file-invoice-dollar" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              Full &amp; Final (F&amp;F) Settlement Desk
            </h2>
            <p className="text-xs text-muted-foreground">
              Automated exit calculations, 3-tier departmental clearances (IT, Finance, HR), and settlement payouts.
            </p>
          </div>
        </div>

        {canManage && (
          <Button
            type="button"
            onClick={() => setShowInitiateModal(true)}
            className="gap-2 cursor-pointer text-xs min-h-[38px] shrink-0"
          >
            <i className="fa-solid fa-user-xmark text-xs" /> Initiate Exit Settlement
          </Button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Total Settlements
              </p>
              <p className="text-xl font-bold text-foreground">{stats.total}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-users-slash text-sm" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Pending Clearances
              </p>
              <p className="text-xl font-bold text-amber-500">{stats.pendingClearances}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-shield-halved text-sm" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Approved Payouts
              </p>
              <p className="text-xl font-bold text-emerald-500">{stats.approved}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <i className="fa-solid fa-stamp text-sm" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Disbursed Total
              </p>
              <p className="text-xl font-bold text-foreground">₹{stats.totalDisbursed.toLocaleString("en-IN")}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <i className="fa-solid fa-money-check-dollar text-sm" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          {["All", "Pending Clearances", "Approved", "Disbursed"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[36px]",
                statusFilter === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee or dept..."
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Settlements Table Container */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            <i className="fa-solid fa-circle-notch fa-spin text-xl mb-2 block text-primary" />
            Loading Full &amp; Final exit settlements...
          </div>
        ) : filteredSettlements.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto text-muted-foreground/60 text-xl">
              <i className="fa-solid fa-file-invoice" />
            </div>
            <p className="text-sm font-semibold text-foreground">No Settlement Records Found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              There are no employee exit settlements matching the current status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-muted/50 text-[11px] text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold">Employee</th>
                  <th className="py-3 px-4 font-semibold">Last Working Day</th>
                  <th className="py-3 px-4 font-semibold">Department Clearances</th>
                  <th className="py-3 px-4 font-semibold">Net Payout</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSettlements.map((s) => (
                  <tr key={s._id} className="hover:bg-muted/30 transition-colors">
                    {/* Employee Info */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>
                        <p className="font-semibold text-foreground">{s.userName}</p>
                        <p className="text-[11px] text-muted-foreground">{s.userEmail}</p>
                        <span className="inline-block px-1.5 py-0.2 mt-0.5 rounded text-[10px] bg-muted border border-border text-muted-foreground font-mono">
                          {s.department || "Engineering"}
                        </span>
                      </div>
                    </td>

                    {/* Last Working Day & Shortfall */}
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                      <p className="font-semibold text-foreground">
                        {new Date(s.lastWorkingDay).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Notice: {s.servedNoticeDays}/{s.noticePeriodDays}d{" "}
                        {s.noticeShortfallDays > 0 ? (
                          <span className="text-rose-500 font-semibold">({s.noticeShortfallDays}d shortfall)</span>
                        ) : (
                          <span className="text-emerald-500 font-semibold">(Served)</span>
                        )}
                      </p>
                    </td>

                    {/* 3 Department Clearances */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {/* IT Clearance */}
                        <button
                          type="button"
                          disabled={!canManage || s.clearances.it.status === "Cleared"}
                          onClick={() => handleClearDepartment(s._id, "it")}
                          title={s.clearances.it.status === "Cleared" ? "IT Cleared" : "Click to clear IT"}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-semibold border transition-all flex items-center gap-1",
                            s.clearances.it.status === "Cleared"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                          )}
                        >
                          <i className="fa-solid fa-laptop text-[9px]" /> IT: {s.clearances.it.status}
                        </button>

                        {/* Finance Clearance */}
                        <button
                          type="button"
                          disabled={!canManage || s.clearances.finance.status === "Cleared"}
                          onClick={() => handleClearDepartment(s._id, "finance")}
                          title={s.clearances.finance.status === "Cleared" ? "Finance Cleared" : "Click to clear Finance"}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-semibold border transition-all flex items-center gap-1",
                            s.clearances.finance.status === "Cleared"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                          )}
                        >
                          <i className="fa-solid fa-coins text-[9px]" /> Fin: {s.clearances.finance.status}
                        </button>

                        {/* HR Clearance */}
                        <button
                          type="button"
                          disabled={!canManage || s.clearances.hr.status === "Cleared"}
                          onClick={() => handleClearDepartment(s._id, "hr")}
                          title={s.clearances.hr.status === "Cleared" ? "HR Cleared" : "Click to clear HR"}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-semibold border transition-all flex items-center gap-1",
                            s.clearances.hr.status === "Cleared"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                          )}
                        >
                          <i className="fa-solid fa-user-check text-[9px]" /> HR: {s.clearances.hr.status}
                        </button>
                      </div>
                    </td>

                    {/* Net Settlement Pay */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-bold text-sm text-foreground">
                        ₹{s.netSettlementPayable.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Earned: ₹{s.earnings.totalEarnings.toLocaleString("en-IN")} • Ded: ₹
                        {s.deductions.totalDeductions.toLocaleString("en-IN")}
                      </p>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                          s.settlementStatus === "Disbursed"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : s.settlementStatus === "Approved"
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            s.settlementStatus === "Disbursed"
                              ? "bg-emerald-500"
                              : s.settlementStatus === "Approved"
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          )}
                        />
                        {s.settlementStatus}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 whitespace-nowrap text-right space-x-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => {
                          setSelectedSettlement(s);
                          setShowStatementModal(true);
                        }}
                        className="gap-1 cursor-pointer text-xs min-h-[36px]"
                      >
                        <i className="fa-solid fa-file-lines text-xs text-primary" /> View Statement
                      </Button>

                      {canManage && s.settlementStatus === "Approved" && (
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => setDisburseRecord(s)}
                          className="gap-1 cursor-pointer text-xs min-h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <i className="fa-solid fa-check text-xs" /> Disburse
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Initiate Exit Settlement */}
      {showInitiateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowInitiateModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <i className="fa-solid fa-user-xmark text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Initiate F&amp;F Exit Settlement</h3>
                  <p className="text-xs text-muted-foreground">
                    Computes unpaid days, leave encashment, and initiates clearance workflows.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInitiateModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSettlement} className="overflow-y-auto overscroll-contain flex-1 pr-1 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Select Employee */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground">Select Exiting Employee *</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]"
                  >
                    <option value="">-- Choose Employee --</option>
                    {companyUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.email}) — {u.departments?.[0] || u.department || "Engineering"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resignation Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Resignation Date *</label>
                  <Input
                    type="date"
                    value={resignationDate}
                    onChange={(e) => setResignationDate(e.target.value)}
                    required
                    className="h-10 text-xs min-h-[40px]"
                  />
                </div>

                {/* Last Working Day */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Last Working Day (LWD) *</label>
                  <Input
                    type="date"
                    value={lastWorkingDay}
                    onChange={(e) => setLastWorkingDay(e.target.value)}
                    required
                    className="h-10 text-xs min-h-[40px]"
                  />
                </div>

                {/* Notice Period Days */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Required Notice (Days)</label>
                  <Input
                    type="number"
                    min="0"
                    value={noticePeriodDays}
                    onChange={(e) => setNoticePeriodDays(parseInt(e.target.value) || 0)}
                    className="h-10 text-xs min-h-[40px]"
                  />
                </div>

                {/* Served Notice Days */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Served Notice (Days)</label>
                  <Input
                    type="number"
                    min="0"
                    value={servedNoticeDays}
                    onChange={(e) => setServedNoticeDays(parseInt(e.target.value) || 0)}
                    className="h-10 text-xs min-h-[40px]"
                  />
                </div>
              </div>

              {/* Live Preview Panel */}
              {loadingPreview ? (
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-center text-xs text-muted-foreground">
                  <i className="fa-solid fa-circle-notch fa-spin text-sm mr-2" />
                  Calculating attendance logs, leave balances, and IT hardware inventory...
                </div>
              ) : previewData ? (
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-calculator text-primary text-xs" /> Auto-Calculated F&amp;F Breakdown
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Rate: ₹{previewData.perDayRate}/day
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-lg bg-background border border-border">
                      <p className="text-[10px] text-muted-foreground">Payable Working Days</p>
                      <p className="font-bold text-foreground">
                        {previewData.unpaidSalaryDays} days{" "}
                        <span className="text-[10px] text-emerald-600 font-normal">
                          (₹{previewData.unpaidSalaryAmount})
                        </span>
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background border border-border">
                      <p className="text-[10px] text-muted-foreground">Leave Encashment (EL+CL)</p>
                      <p className="font-bold text-foreground">
                        {previewData.leaveEncashmentDays} days{" "}
                        <span className="text-[10px] text-emerald-600 font-normal">
                          (₹{previewData.leaveEncashmentAmount})
                        </span>
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background border border-border">
                      <p className="text-[10px] text-muted-foreground">Assigned IT Devices</p>
                      <p className="font-bold text-foreground">
                        {previewData.assignedDevicesCount}{" "}
                        <span className="text-[10px] text-amber-600 font-normal">
                          ({previewData.assignedDevicesCount > 0 ? "Hardware pending return" : "All cleared"})
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="font-semibold text-muted-foreground">Estimated Net Payout:</span>
                    <span className="font-bold text-sm text-primary">
                      ₹{(previewData.totalEarnings - Math.max(0, (noticePeriodDays - servedNoticeDays) * previewData.perDayRate)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Remarks / Exit Notes</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Resigned to pursue higher education. Handover completed."
                  className="w-full h-16 p-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInitiateModal(false)}
                  className="text-xs min-h-[38px] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedUserId}
                  className="text-xs min-h-[38px] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin mr-1.5" /> Initializing...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check mr-1.5" /> Confirm &amp; Initiate F&amp;F
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: View Printable Statement */}
      {showStatementModal && selectedSettlement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowStatementModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <i className="fa-solid fa-file-invoice text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">F&amp;F Settlement Statement</h3>
                  <p className="text-xs text-muted-foreground">{selectedSettlement.userName} — Official Clearance</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs gap-1.5 min-h-[34px] cursor-pointer"
                >
                  <i className="fa-solid fa-print text-xs" /> Print
                </Button>
                <button
                  onClick={() => setShowStatementModal(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer p-1"
                >
                  <i className="fa-solid fa-xmark text-lg" />
                </button>
              </div>
            </div>

            {/* Statement Body */}
            <div className="overflow-y-auto overscroll-contain flex-1 pr-1 space-y-4 text-xs">
              {/* Employee & Exit Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
                <div>
                  <p className="text-muted-foreground text-[10px]">Employee</p>
                  <p className="font-bold text-foreground">{selectedSettlement.userName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Department</p>
                  <p className="font-bold text-foreground">{selectedSettlement.department}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Resignation Date</p>
                  <p className="font-bold text-foreground">
                    {new Date(selectedSettlement.resignationDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px]">Last Working Day</p>
                  <p className="font-bold text-foreground">
                    {new Date(selectedSettlement.lastWorkingDay).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Earnings vs Deductions Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="rounded-xl border border-border p-3.5 space-y-2 bg-emerald-500/5">
                  <h4 className="font-bold text-xs text-emerald-600 flex items-center justify-between">
                    <span>Earnings</span>
                    <span>₹{selectedSettlement.earnings.totalEarnings.toLocaleString("en-IN")}</span>
                  </h4>
                  <div className="divide-y divide-border text-[11px] space-y-1">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Unpaid Salary ({selectedSettlement.earnings.unpaidSalaryDays} days)</span>
                      <span className="font-semibold text-foreground">₹{selectedSettlement.earnings.unpaidSalaryAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Leave Encashment ({selectedSettlement.earnings.leaveEncashmentDays} days)</span>
                      <span className="font-semibold text-foreground">₹{selectedSettlement.earnings.leaveEncashmentAmount.toLocaleString("en-IN")}</span>
                    </div>
                    {selectedSettlement.earnings.gratuityAmount > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Gratuity</span>
                        <span className="font-semibold text-foreground">₹{selectedSettlement.earnings.gratuityAmount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deductions */}
                <div className="rounded-xl border border-border p-3.5 space-y-2 bg-rose-500/5">
                  <h4 className="font-bold text-xs text-rose-600 flex items-center justify-between">
                    <span>Deductions</span>
                    <span>₹{selectedSettlement.deductions.totalDeductions.toLocaleString("en-IN")}</span>
                  </h4>
                  <div className="divide-y divide-border text-[11px] space-y-1">
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Notice Shortfall ({selectedSettlement.noticeShortfallDays} days)</span>
                      <span className="font-semibold text-foreground">₹{selectedSettlement.deductions.noticeShortfallAmount.toLocaleString("en-IN")}</span>
                    </div>
                    {selectedSettlement.deductions.assetLossDeduction > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Asset Loss / Damage</span>
                        <span className="font-semibold text-foreground">₹{selectedSettlement.deductions.assetLossDeduction.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {selectedSettlement.deductions.otherDeductions > 0 && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Other Deductions</span>
                        <span className="font-semibold text-foreground">₹{selectedSettlement.deductions.otherDeductions.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Net Payable Banner */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary">Net Full &amp; Final Settlement Payable</p>
                  <p className="text-[10px] text-muted-foreground">Subject to bank disbursement authorization</p>
                </div>
                <p className="text-xl font-bold text-foreground">
                  ₹{selectedSettlement.netSettlementPayable.toLocaleString("en-IN")}
                </p>
              </div>

              {/* Clearance Status Table */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h4 className="font-bold text-xs text-foreground">Department Clearance Records</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[11px]">IT Clearance</span>
                      <Badge variant="soft" color={selectedSettlement.clearances.it.status === "Cleared" ? "success" : "warning"} className="text-[10px]">
                        {selectedSettlement.clearances.it.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedSettlement.clearances.it.clearedBy ? `By: ${selectedSettlement.clearances.it.clearedBy}` : "Pending hardware return"}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[11px]">Finance Clearance</span>
                      <Badge variant="soft" color={selectedSettlement.clearances.finance.status === "Cleared" ? "success" : "warning"} className="text-[10px]">
                        {selectedSettlement.clearances.finance.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedSettlement.clearances.finance.clearedBy ? `By: ${selectedSettlement.clearances.finance.clearedBy}` : "Pending expense audit"}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[11px]">HR Clearance</span>
                      <Badge variant="soft" color={selectedSettlement.clearances.hr.status === "Cleared" ? "success" : "warning"} className="text-[10px]">
                        {selectedSettlement.clearances.hr.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {selectedSettlement.clearances.hr.clearedBy ? `By: ${selectedSettlement.clearances.hr.clearedBy}` : "Pending exit interview"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirm Disbursement */}
      {disburseRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDisburseRecord(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <i className="fa-solid fa-money-check-dollar text-emerald-500" /> Confirm Disbursement
              </h3>
              <button onClick={() => setDisburseRecord(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Confirm bank disbursement of{" "}
              <strong className="text-foreground">₹{disburseRecord.netSettlementPayable.toLocaleString("en-IN")}</strong>{" "}
              for <strong className="text-foreground">{disburseRecord.userName}</strong>.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Bank Transaction / UTR Reference</label>
              <Input
                value={disburseRef}
                onChange={(e) => setDisburseRef(e.target.value)}
                placeholder="e.g. UTR-982148124 / NEFT"
                className="h-9 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setDisburseRecord(null)} className="text-xs min-h-[36px]">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isDisbursing}
                onClick={handleConfirmDisbursement}
                className="text-xs min-h-[36px] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isDisbursing ? "Processing..." : "Confirm Payout"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
