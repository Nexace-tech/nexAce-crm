"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AttendanceRegularizationDeskProps {
  attendanceHistory: any[];
  onRefresh: () => Promise<void>;
  onToast: (msg: string, type?: "success" | "error") => void;
  canApprove: boolean;
  canExport: boolean;
  currentUserId?: string;
  currentUserRole?: string;
  currentUserDepartment?: string;
  onBackToClock?: () => void;
}

// Helper to format IST dates cleanly
function getISTDateString(d: Date = new Date()): string {
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, "0");
  const day = String(ist.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return "—";
  }
}

function formatDisplayTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return "—";
  }
}

const REGULARIZATION_REASONS = [
  "Biometric Machine Glitch / Device Offline",
  "Network Connectivity / System Outage",
  "Client Meeting / On-Field Assignment",
  "Forgot to Clock In / Out",
  "Shift Schedule / Roster Adjustment",
  "Emergency Work From Home",
  "Other Operational Reason",
];

export function AttendanceRegularizationDesk({
  attendanceHistory,
  onRefresh,
  onToast,
  canApprove,
  canExport,
  currentUserId,
  currentUserRole,
  currentUserDepartment,
  onBackToClock,
}: AttendanceRegularizationDeskProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "week">("all");
  const [customDate, setCustomDate] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Request Modal State (Employee self-service)
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestDate, setRequestDate] = useState(getISTDateString());
  const [requestClockIn, setRequestClockIn] = useState("09:00");
  const [requestClockOut, setRequestClockOut] = useState("18:00");
  const [requestReasonCategory, setRequestReasonCategory] = useState(REGULARIZATION_REASONS[0]);
  const [requestCustomReason, setRequestCustomReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Approval Modal State
  const [approvalModalReq, setApprovalModalReq] = useState<any | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Decline Modal State
  const [declineModalReq, setDeclineModalReq] = useState<any | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkApproving, setIsBulkApproving] = useState(false);

  // Quick Approval State
  const [isQuickApproving, setIsQuickApproving] = useState<string | null>(null);

  // Detail / Audit Inspector Drawer
  const [inspectingRecord, setInspectingRecord] = useState<any | null>(null);
  const [copiedAuditId, setCopiedAuditId] = useState(false);

  // Filter attendance records to those that have regularization data
  const regularizationRecords = useMemo(() => {
    return attendanceHistory.filter(
      (log) => Boolean(log.regularizationRequested || log.regularizationStatus)
    );
  }, [attendanceHistory]);

  // Unique departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    regularizationRecords.forEach((log) => {
      const emp = typeof log.userId === "object" ? log.userId : null;
      if (emp?.department) set.add(emp.department);
    });
    return ["All", ...Array.from(set)];
  }, [regularizationRecords]);

  // Pending queue: requests awaiting approval
  const pendingQueue = useMemo(() => {
    return regularizationRecords.filter(
      (log) => log.regularizationRequested && log.regularizationStatus === "Pending"
    );
  }, [regularizationRecords]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    const pendingCount = pendingQueue.length;
    const totalApproved = regularizationRecords.filter((log) => log.regularizationStatus === "Approved").length;
    const totalRejected = regularizationRecords.filter((log) => log.regularizationStatus === "Rejected").length;

    return {
      pendingCount,
      totalApproved,
      totalRejected,
      totalRecords: regularizationRecords.length,
    };
  }, [regularizationRecords, pendingQueue]);

  // Filtered Records based on user criteria
  const filteredRecords = useMemo(() => {
    const todayStr = getISTDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getISTDateString(yesterdayDate);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return regularizationRecords.filter((log) => {
      // 1. Status Filter
      if (statusFilter === "pending") {
        if (!log.regularizationRequested && log.regularizationStatus !== "Pending") return false;
      } else if (statusFilter === "approved") {
        if (log.regularizationStatus !== "Approved") return false;
      } else if (statusFilter === "rejected") {
        if (log.regularizationStatus !== "Rejected") return false;
      }

      // 2. Department Filter
      if (departmentFilter !== "All") {
        const emp = typeof log.userId === "object" ? log.userId : null;
        if (emp?.department !== departmentFilter) return false;
      }

      // 3. Date Presets Filter
      const logDate = new Date(log.date);
      const logDateStr = getISTDateString(logDate);
      if (datePreset === "today" && logDateStr !== todayStr) return false;
      if (datePreset === "yesterday" && logDateStr !== yesterdayStr) return false;
      if (datePreset === "week" && logDate < sevenDaysAgo) return false;
      if (customDate && logDateStr !== customDate) return false;

      // 4. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const emp = typeof log.userId === "object" ? log.userId : null;
        const nameMatch = emp?.name?.toLowerCase().includes(q);
        const emailMatch = emp?.email?.toLowerCase().includes(q);
        const deptMatch = emp?.department?.toLowerCase().includes(q);
        const reasonMatch = log.regularizationReason?.toLowerCase().includes(q);
        const rejectionMatch = log.regularizationRejectionReason?.toLowerCase().includes(q);
        const approverMatch = typeof log.regularizedBy === "object" ? log.regularizedBy?.name?.toLowerCase().includes(q) : false;

        if (!nameMatch && !emailMatch && !deptMatch && !reasonMatch && !rejectionMatch && !approverMatch) {
          return false;
        }
      }

      return true;
    });
  }, [regularizationRecords, statusFilter, departmentFilter, datePreset, customDate, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + rowsPerPage);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      onToast("Attendance regularization records refreshed", "success");
    } catch {
      onToast("Failed to refresh records", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Submit Request Regularization (Employee)
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDate) {
      onToast("Please select a date for regularization", "error");
      return;
    }
    if (!requestClockIn) {
      onToast("Please provide a requested Clock-In time", "error");
      return;
    }

    const fullReason = requestReasonCategory === "Other Operational Reason" && requestCustomReason.trim()
      ? `Other: ${requestCustomReason.trim()}`
      : requestCustomReason.trim()
      ? `${requestReasonCategory} — ${requestCustomReason.trim()}`
      : requestReasonCategory;

    // Combine date + time into ISO Date strings in IST
    const clockInIso = new Date(`${requestDate}T${requestClockIn}:00+05:30`).toISOString();
    const clockOutIso = requestClockOut ? new Date(`${requestDate}T${requestClockOut}:00+05:30`).toISOString() : undefined;

    setIsSubmittingRequest(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_regularization",
          date: requestDate,
          requestedClockIn: clockInIso,
          requestedClockOut: clockOutIso,
          reason: fullReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request");

      onToast("Attendance regularization request submitted successfully!", "success");
      setShowRequestModal(false);
      setRequestCustomReason("");
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Failed to submit regularization request", "error");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Quick Approve Handler (Manager/Admin)
  const handleQuickApprove = async (req: any) => {
    setIsQuickApproving(req._id);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_regularization",
          targetAttendanceId: req._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve regularization");

      onToast(`Regularization approved for ${req.userId?.name || "employee"}!`, "success");
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Failed to approve regularization", "error");
    } finally {
      setIsQuickApproving(null);
    }
  };

  // Detailed Modal Approve Handler
  const handleApproveModal = async () => {
    if (!approvalModalReq) return;
    setIsSubmittingApproval(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_regularization",
          targetAttendanceId: approvalModalReq._id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve regularization");

      onToast(`Regularization approved for ${approvalModalReq.userId?.name || "employee"}!`, "success");
      setApprovalModalReq(null);
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Failed to approve regularization", "error");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Decline Handler
  const handleDeclineRegularization = async () => {
    if (!declineModalReq) return;
    setIsSubmittingDecline(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject_regularization",
          targetAttendanceId: declineModalReq._id,
          reason: declineReason.trim() || "Regularization request declined by manager.",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to decline regularization");

      onToast(`Regularization request declined for ${declineModalReq.userId?.name || "employee"}`, "success");
      setDeclineModalReq(null);
      setDeclineReason("");
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Failed to decline regularization", "error");
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  // Bulk Approve Handler
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_approve_regularizations",
          attendanceIds: selectedIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to bulk approve");

      onToast(`Successfully approved ${data.approvedCount || selectedIds.length} regularization requests!`, "success");
      setSelectedIds([]);
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Failed to bulk approve requests", "error");
    } finally {
      setIsBulkApproving(false);
    }
  };

  const handleSelectAllPending = () => {
    const pendingIds = paginatedRecords
      .filter((r) => r.regularizationStatus === "Pending" || r.regularizationRequested)
      .map((r) => r._id);

    if (selectedIds.length === pendingIds.length && pendingIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingIds);
    }
  };

  const toggleSelectRecord = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      onToast("No records available to export", "error");
      return;
    }

    const headers = [
      "Employee Name",
      "Employee Email",
      "Department",
      "Date",
      "Requested In",
      "Requested Out",
      "Original In",
      "Original Out",
      "Regular Hours",
      "Overtime Hours",
      "Status",
      "Reason",
      "Decided By",
      "Decision Date",
    ];

    const rows = filteredRecords.map((log) => {
      const emp = typeof log.userId === "object" ? log.userId : null;
      const decider = typeof log.regularizedBy === "object" ? log.regularizedBy?.name : "—";
      return [
        `"${emp?.name || "Unknown"}"`,
        `"${emp?.email || "—"}"`,
        `"${emp?.department || "General"}"`,
        `"${formatDisplayDate(log.date)}"`,
        `"${formatDisplayTime(log.requestedClockIn)}"`,
        `"${formatDisplayTime(log.requestedClockOut)}"`,
        `"${formatDisplayTime(log.clockIn)}"`,
        `"${formatDisplayTime(log.clockOut)}"`,
        log.regularHours || 0,
        log.overtimeHours || 0,
        `"${log.regularizationStatus || "Pending"}"`,
        `"${(log.regularizationReason || "").replace(/"/g, '""')}"`,
        `"${decider}"`,
        `"${log.regularizedAt ? formatDisplayDate(log.regularizedAt) : "—"}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_regularization_export_${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast("Regularization report exported successfully!", "success");
  };

  return (
    <Card className="border border-border bg-card/60 overflow-hidden shadow-sm">
      {/* ─── Header & Top Actions ─── */}
      <div className="p-4 sm:p-5 border-b border-border/60 bg-gradient-to-r from-card via-card/80 to-muted/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <i className="fa-solid fa-clock-rotate-left text-amber-500 text-base" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-foreground">Attendance Regularization Desk</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  {metrics.pendingCount} Pending
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage forgotten punches, device glitches, field visits, and audit-compliant timesheet adjustments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Request Regularization (Self-Service) */}
            <Button
              onClick={() => setShowRequestModal(true)}
              className="min-h-[38px] sm:min-h-[40px] px-3.5 text-xs font-semibold rounded-lg gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs" />
              Request Regularization
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="min-h-[38px] sm:min-h-[40px] px-3 text-xs rounded-lg gap-1.5 border-border hover:bg-muted/60 cursor-pointer"
            >
              <i className={cn("fa-solid fa-rotate-right text-xs", isRefreshing && "animate-spin text-primary")} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Export */}
            {canExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="min-h-[38px] sm:min-h-[40px] px-3 text-xs rounded-lg gap-1.5 border-border hover:bg-muted/60 cursor-pointer"
              >
                <i className="fa-solid fa-file-csv text-xs text-emerald-500" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            )}

            {/* Optional Back to Clock */}
            {onBackToClock && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBackToClock}
                className="min-h-[38px] sm:min-h-[40px] px-2.5 text-xs rounded-lg gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <i className="fa-solid fa-arrow-left text-xs" />
                <span className="hidden sm:inline">Shift Clock</span>
              </Button>
            )}
          </div>
        </div>

        {/* ─── Metric KPI Badges ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Pending Review</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{metrics.pendingCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
              <i className="fa-solid fa-hourglass-half text-sm" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Approved</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{metrics.totalApproved}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <i className="fa-solid fa-circle-check text-sm" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Declined</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{metrics.totalRejected}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
              <i className="fa-solid fa-circle-xmark text-sm" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-indigo-600 uppercase tracking-wider">Total Handled</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{metrics.totalRecords}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <i className="fa-solid fa-list-check text-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filter Pills, Search & Mode Bar ─── */}
      <div className="p-3 sm:p-4 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {(
            [
              { id: "all", label: "All Requests", icon: "fa-list" },
              { id: "pending", label: "Pending", icon: "fa-hourglass-half" },
              { id: "approved", label: "Approved", icon: "fa-circle-check" },
              { id: "rejected", label: "Declined", icon: "fa-circle-xmark" },
            ] as const
          ).map((pill) => (
            <button
              key={pill.id}
              onClick={() => {
                setStatusFilter(pill.id);
                setCurrentPage(1);
              }}
              className={cn(
                "min-h-[38px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                statusFilter === pill.id
                  ? "bg-foreground text-background shadow-xs font-bold"
                  : "bg-background/80 text-muted-foreground hover:bg-muted border border-border/60 hover:text-foreground"
              )}
            >
              <i className={cn("fa-solid text-[10px]", pill.icon)} />
              {pill.label}
              {pill.id === "pending" && metrics.pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {metrics.pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Department Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          {departments.length > 2 && (
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by department"
              className="min-h-[38px] px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Depts" : d}
                </option>
              ))}
            </select>
          )}

          {/* Date Preset */}
          <select
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value as any);
              if (e.target.value !== "custom") setCustomDate("");
              setCurrentPage(1);
            }}
            aria-label="Filter by date preset"
            className="min-h-[38px] px-2.5 py-1 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Past 7 Days</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
            <input
              type="text"
              placeholder="Search employee, reason..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full min-h-[38px] pl-8 pr-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-background">
            <button
              onClick={() => setViewMode("table")}
              aria-label="Table view"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer",
                viewMode === "table" ? "bg-muted text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-table-list" />
            </button>
            <button
              onClick={() => setViewMode("cards")}
              aria-label="Card view"
              className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer",
                viewMode === "cards" ? "bg-muted text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <i className="fa-solid fa-grip" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Bulk Action Bar (when records are selected) ─── */}
      {selectedIds.length > 0 && canApprove && (
        <div className="p-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-medium text-foreground">
              {selectedIds.length} {selectedIds.length === 1 ? "request" : "requests"} selected for bulk action
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
              className="min-h-[38px] px-3.5 text-xs font-semibold rounded-lg gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <i className={cn("fa-solid fa-check-double text-xs", isBulkApproving && "animate-spin")} />
              Approve Selected ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds([])}
              className="min-h-[38px] px-2.5 text-xs rounded-lg border-border hover:bg-muted cursor-pointer"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* ─── Records Content (Table vs Cards) ─── */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <i className="fa-solid fa-clock-rotate-left text-xl" />
          </div>
          <p className="text-sm font-semibold text-foreground">No Attendance Regularization Records Found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all" || departmentFilter !== "All"
              ? "No requests match your selected filters. Try clearing your search or status selection."
              : "No regularization requests have been submitted yet. Employees can request punch adjustments anytime."}
          </p>
          <div className="mt-4">
            <Button
              onClick={() => setShowRequestModal(true)}
              className="min-h-[38px] px-3 text-xs font-semibold rounded-lg gap-1.5 cursor-pointer"
            >
              <i className="fa-solid fa-plus text-xs" />
              Submit Regularization
            </Button>
          </div>
        </div>
      ) : viewMode === "table" ? (
        /* ─── Touch Scrolling Table Container (Mandatory min-w-[640px]) ─── */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                {canApprove && (
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedRecords.filter((r) => r.regularizationStatus === "Pending").length > 0 &&
                        selectedIds.length ===
                          paginatedRecords.filter((r) => r.regularizationStatus === "Pending").length
                      }
                      onChange={handleSelectAllPending}
                      aria-label="Select all pending regularization requests"
                      className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                    />
                  </th>
                )}
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Requested Punch</th>
                <th className="py-3 px-3">Original Record</th>
                <th className="py-3 px-3">Reason</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedRecords.map((log) => {
                const emp = typeof log.userId === "object" ? log.userId : null;
                const isPending = log.regularizationStatus === "Pending" || (!log.regularizationStatus && log.regularizationRequested);
                const isApproved = log.regularizationStatus === "Approved";
                const isRejected = log.regularizationStatus === "Rejected";

                return (
                  <tr
                    key={log._id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      selectedIds.includes(log._id) && "bg-primary/5"
                    )}
                  >
                    {/* Checkbox */}
                    {canApprove && (
                      <td className="py-3 px-3 text-center">
                        {isPending ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(log._id)}
                            onChange={() => toggleSelectRecord(log._id)}
                            aria-label={`Select request for ${emp?.name || "employee"}`}
                            className="rounded border-border text-primary focus:ring-primary cursor-pointer w-4 h-4"
                          />
                        ) : (
                          <span className="text-muted-foreground/40 text-[10px]">—</span>
                        )}
                      </td>
                    )}

                    {/* Employee Profile */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 overflow-hidden">
                          {emp?.photoUrl ? (
                            <Image src={emp.photoUrl} alt={emp.name || "User"} width={32} height={32} className="w-full h-full object-cover" />
                          ) : (
                            emp?.name?.charAt(0) || "U"
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate max-w-[150px]">{emp?.name || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                            {emp?.department || "General"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Target Date */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-medium text-foreground">{formatDisplayDate(log.date)}</span>
                    </td>

                    {/* Requested Punch (In - Out) */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold text-[11px]">
                          <i className="fa-solid fa-arrow-right-to-bracket text-[9px] mr-1" />
                          {formatDisplayTime(log.requestedClockIn)}
                        </span>
                        <i className="fa-solid fa-arrow-right text-[9px] text-muted-foreground/60" />
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold text-[11px]">
                          <i className="fa-solid fa-arrow-right-from-bracket text-[9px] mr-1" />
                          {log.requestedClockOut ? formatDisplayTime(log.requestedClockOut) : "—"}
                        </span>
                      </div>
                    </td>

                    {/* Original Punch Times */}
                    <td className="py-3 px-3 whitespace-nowrap text-muted-foreground">
                      <div className="text-[11px]">
                        <span>In: {log.clockIn ? formatDisplayTime(log.clockIn) : "Missing"}</span>
                        <span className="mx-1 text-muted-foreground/40">•</span>
                        <span>Out: {log.clockOut ? formatDisplayTime(log.clockOut) : "Missing"}</span>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="py-3 px-3 max-w-[200px]">
                      <p className="truncate text-foreground font-medium" title={log.regularizationReason}>
                        {log.regularizationReason || "—"}
                      </p>
                      {log.regularizationRejectionReason && (
                        <p className="text-[10px] text-rose-500 truncate" title={log.regularizationRejectionReason}>
                          Declined: {log.regularizationRejectionReason}
                        </p>
                      )}
                    </td>

                    {/* Status Badge */}
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
                        {isPending && canApprove && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleQuickApprove(log)}
                              disabled={isQuickApproving === log._id}
                              className="min-h-[32px] h-8 px-2.5 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                            >
                              <i className={cn("fa-solid fa-check text-[10px]", isQuickApproving === log._id && "animate-spin")} />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeclineModalReq(log)}
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
                          onClick={() => setInspectingRecord(log)}
                          title="View Audit Details"
                          className="w-8 h-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <i className="fa-solid fa-receipt text-xs" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ─── Responsive Cards Grid ─── */
        <div className="p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginatedRecords.map((log) => {
            const emp = typeof log.userId === "object" ? log.userId : null;
            const isPending = log.regularizationStatus === "Pending" || (!log.regularizationStatus && log.regularizationRequested);
            const isApproved = log.regularizationStatus === "Approved";
            const isRejected = log.regularizationStatus === "Rejected";

            return (
              <div
                key={log._id}
                className={cn(
                  "p-4 rounded-xl border border-border/80 bg-background flex flex-col justify-between gap-3 shadow-xs transition-all hover:border-primary/40",
                  selectedIds.includes(log._id) && "border-primary bg-primary/5"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0 overflow-hidden">
                        {emp?.photoUrl ? (
                          <Image src={emp.photoUrl} alt={emp.name || "User"} width={36} height={36} className="w-full h-full object-cover" />
                        ) : (
                          emp?.name?.charAt(0) || "U"
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-xs">{emp?.name || "Unknown"}</p>
                        <p className="text-[10px] text-muted-foreground">{emp?.department || "General"}</p>
                      </div>
                    </div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Pending
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Approved
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                        Declined
                      </span>
                    )}
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-muted/40 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Date:</span>
                      <span className="font-semibold text-foreground">{formatDisplayDate(log.date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Requested Punch:</span>
                      <span className="font-semibold text-emerald-600 text-[11px]">
                        {formatDisplayTime(log.requestedClockIn)} – {log.requestedClockOut ? formatDisplayTime(log.requestedClockOut) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px]">Original Punch:</span>
                      <span className="text-muted-foreground text-[11px]">
                        {log.clockIn ? formatDisplayTime(log.clockIn) : "Missing"} – {log.clockOut ? formatDisplayTime(log.clockOut) : "Missing"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <p className="text-[11px] text-muted-foreground line-clamp-2 italic">
                      &quot;{log.regularizationReason || "No explanation provided"}&quot;
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInspectingRecord(log)}
                    className="min-h-[36px] h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <i className="fa-solid fa-receipt mr-1 text-xs" />
                    Audit Slip
                  </Button>

                  {isPending && canApprove && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => handleQuickApprove(log)}
                        disabled={isQuickApproving === log._id}
                        className="min-h-[36px] h-8 px-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeclineModalReq(log)}
                        className="min-h-[36px] h-8 px-2 text-xs font-semibold rounded-lg border-rose-500/30 text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Pagination Footer ─── */}
      {totalPages > 1 && (
        <div className="p-3 sm:p-4 border-t border-border/60 bg-muted/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
            <span className="font-semibold text-foreground">
              {Math.min(startIndex + rowsPerPage, filteredRecords.length)}
            </span>{" "}
            of <span className="font-semibold text-foreground">{filteredRecords.length}</span> requests
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="min-h-[36px] px-2.5 text-xs rounded-lg border-border cursor-pointer"
            >
              <i className="fa-solid fa-chevron-left text-[10px] mr-1" />
              Prev
            </Button>
            <span className="px-2 font-semibold text-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="min-h-[36px] px-2.5 text-xs rounded-lg border-border cursor-pointer"
            >
              Next
              <i className="fa-solid fa-chevron-right text-[10px] ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: Request Regularization (Employee View)
         ═══════════════════════════════════════════════════════════════ */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <i className="fa-solid fa-calendar-check text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Request Attendance Regularization</h4>
                  <p className="text-[11px] text-muted-foreground">Submit punch correction for management authorization</p>
                </div>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Scrollable Body */}
            <form onSubmit={handleSubmitRequest} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Target Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={requestDate}
                  max={getISTDateString()}
                  onChange={(e) => setRequestDate(e.target.value)}
                  required
                  className="w-full min-h-[40px] px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Select the calendar date requiring timesheet adjustment</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Clock-In Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={requestClockIn}
                    onChange={(e) => setRequestClockIn(e.target.value)}
                    required
                    className="w-full min-h-[40px] px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Clock-Out Time</label>
                  <input
                    type="time"
                    value={requestClockOut}
                    onChange={(e) => setRequestClockOut(e.target.value)}
                    className="w-full min-h-[40px] px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Reason Category <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {REGULARIZATION_REASONS.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setRequestReasonCategory(cat)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left cursor-pointer",
                        requestReasonCategory === cat
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted border border-border/60 hover:text-foreground"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Additional Notes / Justification
                </label>
                <textarea
                  value={requestCustomReason}
                  onChange={(e) => setRequestCustomReason(e.target.value)}
                  placeholder="Provide context for manager approval (e.g. client name, support ticket #, power failure window)..."
                  rows={3}
                  className="w-full p-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                <i className="fa-solid fa-circle-info mr-1.5 text-amber-500" />
                Once submitted, this request will be forwarded to your Department Manager, HR, and Admin for authorization.
              </div>

              {/* Fixed Footer */}
              <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRequestModal(false)}
                  disabled={isSubmittingRequest}
                  className="min-h-[38px] px-3 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="min-h-[38px] px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground gap-1.5 cursor-pointer"
                >
                  <i className={cn("fa-solid fa-paper-plane text-xs", isSubmittingRequest && "animate-spin")} />
                  {isSubmittingRequest ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: Decline Regularization with Reason
         ═══════════════════════════════════════════════════════════════ */}
      {declineModalReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-rose-500/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <i className="fa-solid fa-circle-xmark text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Decline Regularization</h4>
                  <p className="text-[11px] text-muted-foreground">
                    For {typeof declineModalReq.userId === "object" ? declineModalReq.userId?.name : "Employee"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeclineModalReq(null)}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Please enter a decline reason. This will be recorded in the audit log and dispatched directly to the employee.
              </p>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Reason for declining regularization request..."
                rows={3}
                className="w-full p-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="p-4 border-t border-border/80 flex items-center justify-end gap-2 shrink-0 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeclineModalReq(null)}
                disabled={isSubmittingDecline}
                className="min-h-[38px] px-3 text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeclineRegularization}
                disabled={isSubmittingDecline}
                className="min-h-[38px] px-3.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white gap-1.5 cursor-pointer"
              >
                <i className={cn("fa-solid fa-circle-xmark text-xs", isSubmittingDecline && "animate-spin")} />
                {isSubmittingDecline ? "Declining..." : "Confirm Decline"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: Audit Slip / Inspector Drawer
         ═══════════════════════════════════════════════════════════════ */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                  <i className="fa-solid fa-receipt text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Attendance Regularization Audit Slip</h4>
                  <p className="text-[11px] text-muted-foreground">Immutable compliance record & authorization trail</p>
                </div>
              </div>
              <button
                onClick={() => setInspectingRecord(null)}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto overscroll-contain text-xs">
              {/* Employee Summary Card */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0 overflow-hidden">
                  {typeof inspectingRecord.userId === "object" && inspectingRecord.userId?.photoUrl ? (
                    <Image
                      src={inspectingRecord.userId.photoUrl}
                      alt={inspectingRecord.userId?.name || "User"}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (typeof inspectingRecord.userId === "object" ? inspectingRecord.userId?.name?.charAt(0) : "U") || "U"
                  )}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">
                    {typeof inspectingRecord.userId === "object" ? inspectingRecord.userId?.name : "Unknown Employee"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {typeof inspectingRecord.userId === "object" ? inspectingRecord.userId?.email : "—"} •{" "}
                    {typeof inspectingRecord.userId === "object" ? inspectingRecord.userId?.department : "General"}
                  </p>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-border bg-background space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original Punch</p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">In:</span>{" "}
                    <span className="font-semibold text-foreground">
                      {inspectingRecord.clockIn ? formatDisplayTime(inspectingRecord.clockIn) : "Missing"}
                    </span>
                  </p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Out:</span>{" "}
                    <span className="font-semibold text-foreground">
                      {inspectingRecord.clockOut ? formatDisplayTime(inspectingRecord.clockOut) : "Missing"}
                    </span>
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Requested Punch</p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">In:</span>{" "}
                    <span className="font-semibold text-emerald-600">
                      {formatDisplayTime(inspectingRecord.requestedClockIn)}
                    </span>
                  </p>
                  <p className="text-xs">
                    <span className="text-muted-foreground">Out:</span>{" "}
                    <span className="font-semibold text-emerald-600">
                      {inspectingRecord.requestedClockOut ? formatDisplayTime(inspectingRecord.requestedClockOut) : "—"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Justification */}
              <div className="p-3 rounded-xl border border-border bg-background space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reason & Justification</p>
                <p className="text-xs text-foreground font-medium">{inspectingRecord.regularizationReason || "—"}</p>
              </div>

              {/* Decision Metadata */}
              <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Authorization Details</p>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Status:</span>
                  <span className="font-bold text-foreground">
                    {inspectingRecord.regularizationStatus || "Pending Review"}
                  </span>
                </div>
                {inspectingRecord.regularizedBy && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Authorized By:</span>
                    <span className="font-semibold text-foreground">
                      {typeof inspectingRecord.regularizedBy === "object"
                        ? inspectingRecord.regularizedBy?.name
                        : "Manager"}
                    </span>
                  </div>
                )}
                {inspectingRecord.regularizedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Decision Timestamp:</span>
                    <span className="text-foreground">{formatDisplayDate(inspectingRecord.regularizedAt)}</span>
                  </div>
                )}
                {inspectingRecord.regularizationRejectionReason && (
                  <div className="text-rose-500 text-xs mt-1">
                    <span className="font-semibold">Decline Reason:</span> {inspectingRecord.regularizationRejectionReason}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/80 flex items-center justify-between gap-2 shrink-0 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(inspectingRecord._id);
                  setCopiedAuditId(true);
                  setTimeout(() => setCopiedAuditId(false), 2000);
                }}
                className="min-h-[38px] px-3 text-xs rounded-lg gap-1.5 cursor-pointer"
              >
                <i className={cn("fa-solid", copiedAuditId ? "fa-check text-emerald-500" : "fa-copy")} />
                {copiedAuditId ? "ID Copied" : "Copy Audit ID"}
              </Button>
              <Button
                size="sm"
                onClick={() => setInspectingRecord(null)}
                className="min-h-[38px] px-4 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close Slip
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
