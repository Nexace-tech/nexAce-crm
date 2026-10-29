"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

export interface EmployeeLeaveDeskProps {
  currentUserId?: string;
  currentUserRole?: string;
  currentUserName?: string;
  canApproveLeaves: boolean;
  onToast: (msg: string, type?: "success" | "error") => void;
}

interface LeaveRecord {
  _id: string;
  userId: string | { _id: string; name: string; email: string; photoUrl?: string; department?: string };
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayType?: "First Half" | "Second Half";
  balanceDeducted?: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  approvedBy?: string;
  approverName?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

interface LeaveCategoryBalance {
  allocated: number;
  used: number;
  pending: number;
}

interface LeaveBalanceData {
  _id?: string;
  year: number;
  casualLeave: LeaveCategoryBalance;
  sickLeave: LeaveCategoryBalance;
  earnedLeave: LeaveCategoryBalance;
  compOff: LeaveCategoryBalance;
  unpaidLeave: { used: number };
}

export function EmployeeLeaveDesk({
  currentUserId,
  currentUserRole,
  currentUserName,
  canApproveLeaves,
  onToast,
}: EmployeeLeaveDeskProps) {
  const { can, isAdmin, isOPS } = usePermissions();
  const canViewBalances = Boolean(isAdmin || can("viewLeaveBalances"));
  const canApply = Boolean(isAdmin || can("applyLeaves") || can("applyLeave"));

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [balance, setBalance] = useState<LeaveBalanceData | null>(null);

  // Filters & State
  const [activeView, setActiveView] = useState<"my_leaves" | "team_requests">("my_leaves");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Apply Leave Modal State
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveType, setLeaveType] = useState<"Casual" | "Sick" | "Earned" | "Unpaid" | "Maternity" | "Paternity">("Casual");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState<"First Half" | "Second Half">("First Half");
  const [reason, setReason] = useState("");
  const [submittingApply, setSubmittingApply] = useState(false);

  // Decline Modal State
  const [declineModalLeave, setDeclineModalLeave] = useState<LeaveRecord | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [submittingDecline, setSubmittingDecline] = useState(false);

  // Leave Details Modal State
  const [selectedDetails, setSelectedDetails] = useState<LeaveRecord | null>(null);

  // 1-Click Approve Loading Tracker
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchLeaveData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [leavesRes, balanceRes] = await Promise.all([
        fetch("/api/hr/leaves"),
        fetch("/api/hr/leaves/balances"),
      ]);

      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setLeaves(data.leaves || []);
      }
      if (balanceRes.ok) {
        const balData = await balanceRes.json();
        setBalance(balData.balance || null);
      }
    } catch (err) {
      console.error("Failed to fetch leave data:", err);
      onToast("Failed to load leave records", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  // Balance calculation helpers
  const clAvailable = useMemo(() => {
    if (!balance) return 12;
    return Math.max(0, (balance.casualLeave?.allocated || 12) - (balance.casualLeave?.used || 0));
  }, [balance]);

  const slAvailable = useMemo(() => {
    if (!balance) return 10;
    return Math.max(0, (balance.sickLeave?.allocated || 10) - (balance.sickLeave?.used || 0));
  }, [balance]);

  const elAvailable = useMemo(() => {
    if (!balance) return 15;
    return Math.max(0, (balance.earnedLeave?.allocated || 15) - (balance.earnedLeave?.used || 0));
  }, [balance]);

  // Projected days calculation for modal
  const requestedDaysCount = useMemo(() => {
    if (isHalfDay) return 0.5;
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 1;
    const diffMs = Math.abs(end.getTime() - start.getTime());
    return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate, isHalfDay]);

  // Remaining balance check for the currently selected type in modal
  const selectedTypeRemaining = useMemo(() => {
    if (leaveType === "Casual") return clAvailable;
    if (leaveType === "Sick") return slAvailable;
    if (leaveType === "Earned") return elAvailable;
    return 99; // Maternity/Unpaid
  }, [leaveType, clAvailable, slAvailable, elAvailable]);

  const isExceedingBalance = useMemo(() => {
    if (["Unpaid", "Maternity", "Paternity"].includes(leaveType)) return false;
    return requestedDaysCount > selectedTypeRemaining;
  }, [leaveType, requestedDaysCount, selectedTypeRemaining]);

  // Filtered lists
  const myLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const uId = typeof l.userId === "object" ? l.userId?._id : l.userId;
      return String(uId) === String(currentUserId);
    });
  }, [leaves, currentUserId]);

  const teamPendingLeaves = useMemo(() => {
    return leaves.filter((l) => l.status === "Pending");
  }, [leaves]);

  const displayList = useMemo(() => {
    const base = activeView === "my_leaves" ? myLeaves : leaves;
    return base.filter((l) => {
      if (statusFilter !== "All" && l.status !== statusFilter) return false;
      if (typeFilter !== "All" && l.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empName = l.userName?.toLowerCase() || "";
        const rsn = l.reason?.toLowerCase() || "";
        if (!empName.includes(q) && !rsn.includes(q)) return false;
      }
      return true;
    });
  }, [activeView, myLeaves, leaves, statusFilter, typeFilter, searchQuery]);

  // Submit Leave Application
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      onToast("Please select valid start and end dates", "error");
      return;
    }
    if (!reason.trim()) {
      onToast("Please provide a reason for your leave request", "error");
      return;
    }

    setSubmittingApply(true);
    try {
      const res = await fetch("/api/hr/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: leaveType,
          startDate,
          endDate: isHalfDay ? startDate : endDate,
          isHalfDay,
          halfDayType: isHalfDay ? halfDayType : undefined,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit leave request");

      onToast("Leave application submitted successfully!", "success");
      setShowApplyModal(false);
      setReason("");
      setIsHalfDay(false);
      await fetchLeaveData();
    } catch (err: any) {
      onToast(err.message || "Failed to submit leave application", "error");
    } finally {
      setSubmittingApply(false);
    }
  };

  // Quick 1-Click Approve (Manager/Admin)
  const handleQuickApprove = async (leaveId: string) => {
    setApprovingId(leaveId);
    try {
      const res = await fetch("/api/hr/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId,
          status: "Approved",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve leave request");

      onToast("Leave request approved and attendance auto-synced!", "success");
      await fetchLeaveData();
    } catch (err: any) {
      onToast(err.message || "Failed to approve leave request", "error");
    } finally {
      setApprovingId(null);
    }
  };

  // Decline Handler
  const handleDeclineConfirm = async () => {
    if (!declineModalLeave) return;
    setSubmittingDecline(true);
    try {
      const res = await fetch("/api/hr/leaves", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId: declineModalLeave._id,
          status: "Rejected",
          rejectionReason: declineReason.trim() || "Leave request declined by manager.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to decline leave request");

      onToast("Leave request declined", "success");
      setDeclineModalLeave(null);
      setDeclineReason("");
      await fetchLeaveData();
    } catch (err: any) {
      onToast(err.message || "Failed to decline leave request", "error");
    } finally {
      setSubmittingDecline(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Header & ESS Balance Cards ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <i className="fa-solid fa-plane-departure text-sm" />
            </span>
            Leave & Time-Off Central
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 ml-11">
            Track annual quotas, submit half/full-day time off, and manage team absences with zero-touch attendance sync.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canApply && (
            <Button
              onClick={() => setShowApplyModal(true)}
              className="min-h-[38px] sm:min-h-[40px] px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground gap-2 cursor-pointer shadow-xs"
            >
              <i className="fa-solid fa-plus text-xs" />
              Apply for Leave
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeaveData}
            disabled={refreshing}
            className="min-h-[38px] sm:min-h-[40px] px-3 text-xs rounded-lg border-border hover:bg-muted/60 gap-1.5 cursor-pointer"
          >
            <i className={cn("fa-solid fa-rotate-right text-xs", refreshing && "animate-spin text-primary")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ─── Keka / Zoho Style ESS Leave Balance Cards ─── */}
      {canViewBalances && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Casual Leave */}
        <Card className="border border-border bg-card/60 overflow-hidden shadow-xs relative">
          <div className="p-4 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Casual Leave (CL)</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-foreground">{clAvailable}</span>
                <span className="text-xs text-muted-foreground font-semibold">
                  / {balance?.casualLeave?.allocated || 12} Available
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                <span>Taken: {balance?.casualLeave?.used || 0}d</span>
                <span>•</span>
                <span className="text-amber-500">Pending: {balance?.casualLeave?.pending || 0}d</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <i className="fa-solid fa-umbrella-beach text-base" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-muted/60">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  (((balance?.casualLeave?.used || 0) + (balance?.casualLeave?.pending || 0)) /
                    (balance?.casualLeave?.allocated || 12)) *
                    100
                )}%`,
              }}
            />
          </div>
        </Card>

        {/* Sick Leave */}
        <Card className="border border-border bg-card/60 overflow-hidden shadow-xs relative">
          <div className="p-4 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Sick Leave (SL)</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-foreground">{slAvailable}</span>
                <span className="text-xs text-muted-foreground font-semibold">
                  / {balance?.sickLeave?.allocated || 10} Available
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                <span>Taken: {balance?.sickLeave?.used || 0}d</span>
                <span>•</span>
                <span className="text-amber-500">Pending: {balance?.sickLeave?.pending || 0}d</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <i className="fa-solid fa-heart-pulse text-base" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-muted/60">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  (((balance?.sickLeave?.used || 0) + (balance?.sickLeave?.pending || 0)) /
                    (balance?.sickLeave?.allocated || 10)) *
                    100
                )}%`,
              }}
            />
          </div>
        </Card>

        {/* Earned Leave */}
        <Card className="border border-border bg-card/60 overflow-hidden shadow-xs relative">
          <div className="p-4 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Earned Leave (EL / PL)</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-foreground">{elAvailable}</span>
                <span className="text-xs text-muted-foreground font-semibold">
                  / {balance?.earnedLeave?.allocated || 15} Available
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                <span>Taken: {balance?.earnedLeave?.used || 0}d</span>
                <span>•</span>
                <span className="text-amber-500">Pending: {balance?.earnedLeave?.pending || 0}d</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <i className="fa-solid fa-trophy text-base" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-muted/60">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  (((balance?.earnedLeave?.used || 0) + (balance?.earnedLeave?.pending || 0)) /
                    (balance?.earnedLeave?.allocated || 15)) *
                    100
                )}%`,
              }}
            />
          </div>
        </Card>

        {/* Comp-Off & LOP Tracker */}
        <Card className="border border-border bg-card/60 overflow-hidden shadow-xs relative">
          <div className="p-4 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Comp-Off & LOP</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-foreground">{balance?.compOff?.allocated || 0}</span>
                <span className="text-xs text-muted-foreground font-semibold">Comp-Off Available</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                <span className="text-rose-500 font-semibold">Unpaid LOP: {balance?.unpaidLeave?.used || 0}d</span>
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
              <i className="fa-solid fa-business-time text-base" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-muted/60">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: "100%" }} />
          </div>
        </Card>
      </div>
      )}

      {/* ─── Filter & Navigation Bar ─── */}
      <Card className="border border-border bg-card/60 overflow-hidden shadow-xs">
        <div className="p-3 sm:p-4 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* View Selection Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveView("my_leaves")}
              className={cn(
                "min-h-[38px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                activeView === "my_leaves"
                  ? "bg-foreground text-background shadow-xs font-bold"
                  : "bg-background/80 text-muted-foreground hover:bg-muted border border-border/60 hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-user text-xs" />
              My Leaves ({myLeaves.length})
            </button>

            {canApproveLeaves && (
              <button
                onClick={() => setActiveView("team_requests")}
                className={cn(
                  "min-h-[38px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                  activeView === "team_requests"
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "bg-background/80 text-muted-foreground hover:bg-muted border border-border/60 hover:text-foreground"
                )}
              >
                <i className="fa-solid fa-users-gear text-xs" />
                Team Approvals
                {teamPendingLeaves.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {teamPendingLeaves.length}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Status & Search Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter by status"
              className="min-h-[38px] px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Declined</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by leave type"
              className="min-h-[38px] px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Casual">Casual Leave</option>
              <option value="Sick">Sick Leave</option>
              <option value="Earned">Earned Leave</option>
              <option value="Unpaid">Unpaid / LOP</option>
            </select>

            <div className="relative flex-1 sm:w-52">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
              <input
                type="text"
                placeholder="Search leaves..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[38px] pl-8 pr-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* ─── Touch-Scrolling Table Container ─── */}
        {displayList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <i className="fa-solid fa-calendar-check text-xl" />
            </div>
            <p className="text-sm font-semibold text-foreground">No Leave Records Found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "All" || typeFilter !== "All"
                ? "No leave requests match your search filters."
                : "No leave applications have been submitted yet. Apply for time-off anytime."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px] border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Leave Type</th>
                  <th className="py-3 px-3">Duration & Type</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayList.map((l) => {
                  const emp = typeof l.userId === "object" ? l.userId : null;
                  const isPending = l.status === "Pending";
                  const isApproved = l.status === "Approved";
                  const isRejected = l.status === "Rejected";

                  return (
                    <tr key={l._id} className="transition-colors hover:bg-muted/30">
                      {/* Employee Profile */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 overflow-hidden">
                            {emp?.photoUrl ? (
                              <Image src={emp.photoUrl} alt={l.userName} width={32} height={32} className="w-full h-full object-cover" />
                            ) : (
                              l.userName?.charAt(0) || "U"
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate max-w-[150px]">{l.userName}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {emp?.department || "General"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          {l.type} Leave
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div>
                          <p className="font-semibold text-foreground">
                            {new Date(l.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            {l.startDate !== l.endDate && (
                              <> — {new Date(l.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {l.isHalfDay ? (
                              <span className="text-amber-500 font-semibold">Half Day ({l.halfDayType}) • 0.5d</span>
                            ) : (
                              <span>Full Day • {l.balanceDeducted || 1}d</span>
                            )}
                          </p>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <p className="truncate text-foreground font-medium" title={l.reason}>
                          {l.reason}
                        </p>
                        {l.rejectionReason && (
                          <p className="text-[10px] text-rose-500 truncate" title={l.rejectionReason}>
                            Declined: {l.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <i className="fa-solid fa-hourglass-half text-[9px]" />
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <i className="fa-solid fa-circle-check text-[9px]" />
                            Approved
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <i className="fa-solid fa-circle-xmark text-[9px]" />
                            Declined
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && canApproveLeaves && activeView === "team_requests" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleQuickApprove(l._id)}
                                disabled={approvingId === l._id}
                                className="min-h-[32px] h-8 px-2.5 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                              >
                                <i className={cn("fa-solid fa-check text-[10px]", approvingId === l._id && "animate-spin")} />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeclineModalLeave(l)}
                                className="min-h-[32px] h-8 px-2.5 text-[11px] font-semibold rounded-lg border-rose-500/30 text-rose-600 hover:bg-rose-500/10 gap-1 cursor-pointer"
                              >
                                <i className="fa-solid fa-xmark text-[10px]" />
                                Decline
                              </Button>
                            </>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDetails(l)}
                            title="Show Details"
                            className="w-8 h-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <i className="fa-solid fa-file-lines text-xs" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: Apply For Leave (Employee View)
         ═══════════════════════════════════════════════════════════════ */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <i className="fa-solid fa-plane-departure text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Apply for Time-Off</h4>
                  <p className="text-[11px] text-muted-foreground">Select leave category and schedule your absence</p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
              {/* Leave Type Selector with Badges */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Leave Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: "Casual", label: "Casual Leave", bal: clAvailable },
                      { id: "Sick", label: "Sick Leave", bal: slAvailable },
                      { id: "Earned", label: "Earned Leave", bal: elAvailable },
                      { id: "Unpaid", label: "Unpaid / LOP", bal: "No limit" },
                      { id: "Maternity", label: "Maternity", bal: "Special" },
                      { id: "Paternity", label: "Paternity", bal: "Special" },
                    ] as const
                  ).map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setLeaveType(t.id as any)}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                        leaveType === t.id
                          ? "bg-primary/10 border-primary text-primary shadow-xs"
                          : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <p className="text-xs font-bold text-foreground">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t.bal} left</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Day vs Half Day Toggle */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Half-Day Leave</p>
                  <p className="text-[11px] text-muted-foreground">Request 0.5 day time off instead of a full day</p>
                </div>
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  aria-label="Half-Day leave toggle"
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Half Day Session Choice */}
              {isHalfDay && (
                <div className="grid grid-cols-2 gap-2 animate-in fade-in">
                  <button
                    type="button"
                    onClick={() => setHalfDayType("First Half")}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all",
                      halfDayType === "First Half"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <i className="fa-solid fa-sun mr-1.5" />
                    First Half (Morning)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHalfDayType("Second Half")}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all",
                      halfDayType === "Second Half"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <i className="fa-solid fa-moon mr-1.5" />
                    Second Half (Evening)
                  </button>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    {isHalfDay ? "Date" : "Start Date"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (isHalfDay) setEndDate(e.target.value);
                    }}
                    required
                    className="w-full min-h-[40px] px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
                {!isHalfDay && (
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      End Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full min-h-[40px] px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Reason & Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide brief context for your manager..."
                  rows={3}
                  required
                  className="w-full p-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Balance Summary & Warnings */}
              <div
                className={cn(
                  "p-3 rounded-xl border text-xs",
                  isExceedingBalance
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                    : "bg-muted/40 border-border text-muted-foreground"
                )}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>Requested Absence:</span>
                  <span className="text-foreground font-bold">{requestedDaysCount} Day(s)</span>
                </div>
                {isExceedingBalance && (
                  <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                    <i className="fa-solid fa-triangle-exclamation mr-1" />
                    Notice: Requested days exceed your current available balance ({selectedTypeRemaining}d left). Excess days
                    will be accounted as Unpaid Leave (Loss of Pay).
                  </p>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowApplyModal(false)}
                  disabled={submittingApply}
                  className="min-h-[38px] px-3 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingApply}
                  className="min-h-[38px] px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground gap-1.5 cursor-pointer"
                >
                  <i className={cn("fa-solid fa-paper-plane text-xs", submittingApply && "animate-spin")} />
                  {submittingApply ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: Decline Leave Request with Reason
         ═══════════════════════════════════════════════════════════════ */}
      {declineModalLeave && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-rose-500/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <i className="fa-solid fa-circle-xmark text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Decline Leave Request</h4>
                  <p className="text-[11px] text-muted-foreground">For {declineModalLeave.userName}</p>
                </div>
              </div>
              <button
                onClick={() => setDeclineModalLeave(null)}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Please enter a reason for declining this request. It will be recorded in the audit trail and sent to the
                employee.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Reason for declining leave request..."
                rows={3}
                className="w-full p-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="p-4 border-t border-border/80 flex items-center justify-end gap-2 shrink-0 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeclineModalLeave(null)}
                disabled={submittingDecline}
                className="min-h-[38px] px-3 text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeclineConfirm}
                disabled={submittingDecline}
                className="min-h-[38px] px-3.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white gap-1.5 cursor-pointer"
              >
                <i className={cn("fa-solid fa-circle-xmark text-xs", submittingDecline && "animate-spin")} />
                {submittingDecline ? "Declining..." : "Confirm Decline"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: Leave Record Details
         ═══════════════════════════════════════════════════════════════ */}
      {selectedDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <i className="fa-solid fa-file-lines text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Leave Record Details</h4>
                  <p className="text-[11px] text-muted-foreground">{selectedDetails.userName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDetails(null)}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto text-xs">
              <div className="p-3 rounded-xl bg-muted/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-bold text-foreground">{selectedDetails.type} Leave</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Period:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(selectedDetails.startDate).toLocaleDateString("en-IN")} —{" "}
                    {new Date(selectedDetails.endDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deduction:</span>
                  <span className="font-semibold text-foreground">
                    {selectedDetails.isHalfDay
                      ? `0.5 Day (${selectedDetails.halfDayType})`
                      : `${selectedDetails.balanceDeducted || 1} Day(s)`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-bold text-foreground">{selectedDetails.status}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-border space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Reason</span>
                <p className="text-foreground font-medium">{selectedDetails.reason}</p>
              </div>

              {selectedDetails.approverName && (
                <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Decision Trail</span>
                  <p className="text-foreground font-medium">
                    {selectedDetails.status} by {selectedDetails.approverName}
                  </p>
                  {selectedDetails.rejectionReason && (
                    <p className="text-rose-500 text-[11px] mt-1">Reason: {selectedDetails.rejectionReason}</p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/80 flex items-center justify-end shrink-0 bg-muted/20">
              <Button
                size="sm"
                onClick={() => setSelectedDetails(null)}
                className="min-h-[38px] px-4 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
