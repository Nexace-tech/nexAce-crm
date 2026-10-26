"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShiftExtensionsDeskProps {
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

export function ShiftExtensionsDesk({
  attendanceHistory,
  onRefresh,
  onToast,
  canApprove,
  canExport,
  currentUserId,
  currentUserRole,
  currentUserDepartment,
  onBackToClock,
}: ShiftExtensionsDeskProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined">("all");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [datePreset, setDatePreset] = useState<"all" | "today" | "yesterday" | "week">("all");
  const [customDate, setCustomDate] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Approval Modal State
  const [approvalModalReq, setApprovalModalReq] = useState<any | null>(null);
  const [extensionHoursToAllocate, setExtensionHoursToAllocate] = useState(2.0);
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
  const [copiedAuditSlip, setCopiedAuditSlip] = useState(false);

  // Filter attendance records to those that have extension data
  const extensionRecords = useMemo(() => {
    return attendanceHistory.filter(
      (log) => Boolean(log.extensionRequested || log.extensionApproved || log.extensionRejected)
    );
  }, [attendanceHistory]);

  // Unique departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    extensionRecords.forEach((log) => {
      const emp = typeof log.userId === "object" ? log.userId : null;
      if (emp?.department) set.add(emp.department);
    });
    return ["All", ...Array.from(set)];
  }, [extensionRecords]);

  // Pending queue: requests awaiting approval (not yet approved and not rejected)
  const pendingQueue = useMemo(() => {
    return extensionRecords.filter(
      (log) => log.extensionRequested && !log.extensionApproved && !log.extensionRejected
    );
  }, [extensionRecords]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    const todayStr = getISTDateString();
    const pendingCount = pendingQueue.length;
    const totalApproved = extensionRecords.filter((log) => log.extensionApproved).length;
    const totalDeclined = extensionRecords.filter((log) => log.extensionRejected).length;
    const totalAllocatedHours = extensionRecords.reduce(
      (acc, log) => acc + (log.extensionApproved ? (Number(log.extensionAllocatedHours) || 0) : 0),
      0
    );
    const activeOnExtensionToday = extensionRecords.filter((log) => {
      const logDateStr = getISTDateString(new Date(log.date));
      return logDateStr === todayStr && log.extensionApproved && !log.clockOut;
    }).length;

    return {
      pendingCount,
      totalApproved,
      totalDeclined,
      totalAllocatedHours,
      activeOnExtensionToday,
      totalRecords: extensionRecords.length,
    };
  }, [extensionRecords, pendingQueue]);

  // Background 30s polling + tab visibility detection for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      onRefresh().catch(() => {});
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onRefresh().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onRefresh]);

  // Auto-scoping manager department on mount if user is a departmental manager
  useEffect(() => {
    const isGlobalRole = ["Admin", "SuperAdmin", "OPS", "HR"].includes(currentUserRole || "");
    if (!isGlobalRole && currentUserDepartment) {
      setDepartmentFilter(currentUserDepartment);
    }
  }, [currentUserRole, currentUserDepartment]);

  // Filtered Records based on user criteria
  const filteredRecords = useMemo(() => {
    const todayStr = getISTDateString();
    const yesterdayStr = getISTDateString(new Date(Date.now() - 86400000));
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

    return extensionRecords.filter((log) => {
      // Status filter
      if (statusFilter === "pending" && (!log.extensionRequested || log.extensionApproved || log.extensionRejected)) return false;
      if (statusFilter === "approved" && !log.extensionApproved) return false;
      if (statusFilter === "declined" && !log.extensionRejected) return false;

      // Department filter
      const emp = typeof log.userId === "object" ? log.userId : null;
      if (departmentFilter !== "All" && emp?.department !== departmentFilter) return false;

      // Date preset filter
      const logDate = new Date(log.date);
      const logDateStr = getISTDateString(logDate);
      if (customDate) {
        if (logDateStr !== customDate) return false;
      } else if (datePreset === "today") {
        if (logDateStr !== todayStr) return false;
      } else if (datePreset === "yesterday") {
        if (logDateStr !== yesterdayStr) return false;
      } else if (datePreset === "week") {
        if (logDate < oneWeekAgo) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = emp?.name?.toLowerCase().includes(q);
        const emailMatch = emp?.email?.toLowerCase().includes(q);
        const deptMatch = emp?.department?.toLowerCase().includes(q);
        const reasonMatch = log.extensionReason?.toLowerCase().includes(q);
        const rejectionReasonMatch = log.extensionRejectionReason?.toLowerCase().includes(q);
        const approverMatch =
          typeof log.extensionApprovedBy === "object"
            ? log.extensionApprovedBy?.name?.toLowerCase().includes(q)
            : false;
        const rejecterMatch =
          typeof log.extensionRejectedBy === "object"
            ? log.extensionRejectedBy?.name?.toLowerCase().includes(q)
            : false;
        if (!nameMatch && !emailMatch && !deptMatch && !reasonMatch && !rejectionReasonMatch && !approverMatch && !rejecterMatch) return false;
      }

      return true;
    });
  }, [extensionRecords, statusFilter, departmentFilter, datePreset, customDate, searchQuery]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + rowsPerPage);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      onToast("Shift extension records refreshed", "success");
    } catch {
      onToast("Failed to refresh records", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // 1-Click Quick Approve Handler
  const handleQuickApprove = async (req: any) => {
    const hours = req.extensionRequestedHours || 2.0;
    setIsQuickApproving(req._id);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_extension",
          attendanceId: req._id,
          allocatedHours: hours,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve extension");

      onToast(`Shift extension (+${hours.toFixed(1)}h) approved for ${req.userId?.name || "employee"}!`, "success");
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Failed to approve shift extension", "error");
    } finally {
      setIsQuickApproving(null);
    }
  };

  // Custom Hours Approve extension handler
  const handleApproveExtension = async () => {
    if (!approvalModalReq) return;
    setIsSubmittingApproval(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve_extension",
          attendanceId: approvalModalReq._id,
          allocatedHours: extensionHoursToAllocate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to approve extension");
      }

      onToast(`Shift extension (+${extensionHoursToAllocate.toFixed(1)}h) approved!`, "success");
      setApprovalModalReq(null);
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Failed to approve shift extension", "error");
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Decline Extension Handler
  const handleDeclineExtension = async () => {
    if (!declineModalReq) return;
    setIsSubmittingDecline(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject_extension",
          attendanceId: declineModalReq._id,
          rejectionReason: declineReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to decline extension request");
      }

      onToast("Shift extension request declined", "success");
      setDeclineModalReq(null);
      setDeclineReason("");
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Failed to decline shift extension", "error");
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  // Copy Audit ID to clipboard
  const handleCopyAuditId = (id: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(id);
      setCopiedAuditId(true);
      onToast("Audit Record ID copied to clipboard", "success");
      setTimeout(() => setCopiedAuditId(false), 2000);
    }
  };

  // Copy comprehensive formatted audit dossier to clipboard
  const handleCopyAuditSlip = (rec: any) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    const emp = typeof rec.userId === "object" ? rec.userId : null;
    const approver = typeof rec.extensionApprovedBy === "object" ? rec.extensionApprovedBy : null;
    const rejecter = typeof rec.extensionRejectedBy === "object" ? rec.extensionRejectedBy : null;
    const statusText = rec.extensionApproved
      ? `APPROVED & GRANTED (+${Number(rec.extensionAllocatedHours || 0).toFixed(1)} hrs by ${approver?.name || "Manager"})`
      : rec.extensionRejected
      ? `DECLINED (${rec.extensionRejectionReason || "No reason specified"} by ${rejecter?.name || "Manager"})`
      : "PENDING SUPERVISOR REVIEW";

    const regH = (rec.regularHours || 0).toFixed(1);
    const otH = (rec.overtimeHours || 0).toFixed(1);
    const totalH = ((rec.regularHours || 0) + (rec.overtimeHours || 0)).toFixed(1);

    const slip = [
      `=========================================`,
      `    NEXACE CRM SHIFT AUDIT DOSSIER      `,
      `=========================================`,
      `Record ID     : ${rec._id}`,
      `Employee      : ${emp?.name || "Team Member"}`,
      `Department    : ${emp?.department || "General"}`,
      `Designation   : ${emp?.role || "Employee"}`,
      `Shift Date    : ${new Date(rec.date).toLocaleDateString()}`,
      `Status        : ${statusText}`,
      `-----------------------------------------`,
      `Hours Worked  : ${totalH} hrs (Reg: ${regH}h | OT: ${otH}h)`,
      `Requested Ext : ${rec.extensionRequested ? `+${rec.extensionRequestedHours || 0} hrs` : "Direct Manager Allocation"}`,
      `Allocated Ext : ${rec.extensionApproved ? `+${Number(rec.extensionAllocatedHours || 0).toFixed(1)} hrs` : "0.0 hrs"}`,
      `Justification : "${rec.extensionReason || "No written reason provided"}"`,
      `-----------------------------------------`,
      `Shift Start   : ${rec.clockIn ? new Date(rec.clockIn).toLocaleTimeString() : "N/A"}`,
      `Shift End     : ${rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString() : "Active In-Progress"}`,
      `Decision At   : ${rec.extensionApprovedAt ? new Date(rec.extensionApprovedAt).toLocaleString() : rec.extensionRejectedAt ? new Date(rec.extensionRejectedAt).toLocaleString() : "Pending"}`,
      `Audit Stamp   : Cryptographically Verified`,
      `=========================================`,
    ].join("\n");

    navigator.clipboard.writeText(slip);
    setCopiedAuditSlip(true);
    onToast("Audit slip copied to clipboard!", "success");
    setTimeout(() => setCopiedAuditSlip(false), 2000);
  };

  // Bulk Selection Handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const pendingIds = paginatedRecords
      .filter((r) => r.extensionRequested && !r.extensionApproved && !r.extensionRejected)
      .map((r) => r._id);
    const allSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pendingIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pendingIds])));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkApproving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_approve_extensions",
          attendanceIds: selectedIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to bulk approve shift extensions");
      }

      onToast(data.message || `Successfully approved ${selectedIds.length} shift extensions!`, "success");
      setSelectedIds([]);
      await onRefresh();
    } catch (err: any) {
      onToast(err.message || "Failed to bulk approve shift extensions", "error");
    } finally {
      setIsBulkApproving(false);
    }
  };

  // Export to CSV handler
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      onToast("No extension records to export", "error");
      return;
    }

    const headers = [
      "Record ID",
      "Shift Date",
      "Employee Name",
      "Employee Email",
      "Department",
      "Shift Slot",
      "Hours Worked",
      "Requested Hours",
      "Justification Reason",
      "Allocated Hours",
      "Status",
      "Approved By",
      "Approved At",
      "Declined By",
      "Declined At",
      "Rejection Reason",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredRecords.map((log) => {
      const emp = typeof log.userId === "object" ? log.userId : null;
      const approver = typeof log.extensionApprovedBy === "object" ? log.extensionApprovedBy : null;
      const rejecter = typeof log.extensionRejectedBy === "object" ? log.extensionRejectedBy : null;
      const worked = ((log.regularHours || 0) + (log.overtimeHours || 0)).toFixed(1);
      const statusText = log.extensionApproved
        ? "Approved"
        : log.extensionRejected
        ? "Declined"
        : log.extensionRequested
        ? "Pending"
        : "None";

      return [
        escapeCsv(log._id),
        escapeCsv(getISTDateString(new Date(log.date))),
        escapeCsv(emp?.name || "Team Member"),
        escapeCsv(emp?.email || ""),
        escapeCsv(emp?.department || ""),
        escapeCsv(emp?.shiftName || emp?.shiftTime || "Standard"),
        escapeCsv(worked),
        escapeCsv(log.extensionRequested ? (log.extensionRequestedHours || "0") : "--"),
        escapeCsv(log.extensionReason || ""),
        escapeCsv(log.extensionApproved ? (log.extensionAllocatedHours || "0") : "--"),
        escapeCsv(statusText),
        escapeCsv(approver?.name || ""),
        escapeCsv(log.extensionApprovedAt ? new Date(log.extensionApprovedAt).toLocaleString() : ""),
        escapeCsv(rejecter?.name || ""),
        escapeCsv(log.extensionRejectedAt ? new Date(log.extensionRejectedAt).toLocaleString() : ""),
        escapeCsv(log.extensionRejectionReason || ""),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `shift-extensions-audit-${getISTDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onToast(`Exported ${filteredRecords.length} shift extension records to CSV`, "success");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Top Header Toolbar ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          {onBackToClock && (
            <button
              type="button"
              onClick={onBackToClock}
              className="w-10 h-10 rounded-xl bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border flex items-center justify-center transition-all cursor-pointer min-h-[40px] shrink-0"
              title="Back to My Shift Clock"
            >
              <i className="fa-solid fa-arrow-left text-sm" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-xs shrink-0">
            <i className="fa-solid fa-clock-rotate-left text-base" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Shift Extensions Management Desk
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Audit &amp; Approvals
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Centralized record of all employee overtime requests, reasons, and manager extension allocations.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="min-h-[38px] px-3.5 rounded-xl text-xs font-bold gap-2 text-muted-foreground hover:text-foreground border-border/80 cursor-pointer shadow-2xs"
            title="Refresh extension logs"
          >
            <i className={cn("fa-solid fa-arrows-rotate text-xs", isRefreshing && "fa-spin text-primary")} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </Button>

          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="min-h-[38px] px-3.5 rounded-xl text-xs font-bold gap-2 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 cursor-pointer shadow-2xs"
              title="Download CSV report of shift extension records"
            >
              <i className="fa-solid fa-file-csv text-xs" />
              <span>Export CSV</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 5-Card Executive KPI Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Metric 1: Awaiting Approval */}
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Awaiting Approval</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30 flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-hourglass-half" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 tracking-tight flex items-center gap-2">
            <span>{metrics.pendingCount}</span>
            {metrics.pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Pending manager review</p>
        </div>

        {/* Metric 2: Total Hours Granted */}
        <div className="p-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Hours Granted</span>
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-clock" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
            +{metrics.totalAllocatedHours.toFixed(1)} <span className="text-sm font-semibold text-muted-foreground">hrs</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Overtime allocated to date</p>
        </div>

        {/* Metric 3: Active on Extension Today */}
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Working Extended</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-user-check" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tight">
            {metrics.activeOnExtensionToday}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Approved &amp; active today</p>
        </div>

        {/* Metric 4: Declined Requests */}
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-card shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Declined</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-ban" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-500 tracking-tight">
            {metrics.totalDeclined}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Requests turned down</p>
        </div>

        {/* Metric 5: Total Recorded Extensions */}
        <div className="p-4 rounded-2xl border border-border/80 bg-gradient-to-br from-secondary/40 via-card to-card shadow-xs space-y-1 relative overflow-hidden col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Total Logged</span>
            <div className="w-8 h-8 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-list-check" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {metrics.totalRecords}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Lifetime requests recorded</p>
        </div>
      </div>

      {/* ── Actionable Pending Queue Section (if requests are awaiting review) ── */}
      {pendingQueue.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm border border-amber-500/30">
                <i className="fa-solid fa-bell animate-bounce text-xs" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Action Required: Pending Extension Requests</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/40">
                    {pendingQueue.length} Pending
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Employees who hit their shift limit and requested additional working hours today.
                </p>
              </div>
            </div>

            {canApprove && pendingQueue.length > 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={toggleSelectAll}
                className="text-xs h-8 px-2.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer gap-1.5"
              >
                <i className="fa-solid fa-check-double text-xs" />
                <span>{selectedIds.length === pendingQueue.length ? "Deselect All" : "Select All for Batch"}</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pendingQueue.map((req) => {
              const emp = typeof req.userId === "object" ? req.userId : null;
              const worked = ((req.regularHours || 0) + (req.overtimeHours || 0)).toFixed(1);
              const isSelected = selectedIds.includes(req._id);

              return (
                <div
                  key={req._id}
                  className={cn(
                    "p-4 rounded-xl bg-card border shadow-xs flex flex-col justify-between space-y-3 transition-all group relative",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 shadow-md"
                      : "border-amber-500/30 hover:border-amber-500/50"
                  )}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {canApprove && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleSelect(req._id);
                            }}
                            className="w-4 h-4 rounded border-border text-primary cursor-pointer accent-primary shrink-0"
                            title="Select for bulk approval"
                          />
                        )}
                        {emp?.photoUrl ? (
                          <Image
                            src={emp.photoUrl}
                            alt={emp.name || "Employee"}
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full object-cover border border-amber-500/30 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-xs border border-amber-500/30 shrink-0">
                            {emp?.name?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate text-foreground">{emp?.name || "Team Member"}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {emp?.role || "Employee"} {emp?.department ? `• ${emp?.department}` : ""}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
                        {worked}h Worked
                      </span>
                    </div>

                    {req.extensionReason && (
                      <div className="p-2.5 rounded-lg bg-accent/40 border border-border/70 text-xs text-foreground/90 leading-relaxed">
                        <div className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1 mb-0.5">
                          <i className="fa-solid fa-comment-dots text-amber-500/80 text-[10px]" />
                          <span>Submitted Reason:</span>
                        </div>
                        <p className="italic font-normal text-[11px] text-foreground/80">"{req.extensionReason}"</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-2 border-t border-border/60 flex-wrap">
                    {canApprove ? (
                      <>
                        {/* 1-Click Quick Approve */}
                        <Button
                          size="sm"
                          onClick={() => handleQuickApprove(req)}
                          disabled={isSubmittingApproval || isQuickApproving === req._id}
                          className="min-h-[36px] cursor-pointer gap-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs shrink-0"
                          title={`1-Click Quick Approve for requested +${req.extensionRequestedHours || 2}h`}
                        >
                          <i className={cn("fa-solid text-xs", isQuickApproving === req._id ? "fa-spinner fa-spin" : "fa-bolt")} />
                          <span>Quick (+{req.extensionRequestedHours || 2}h)</span>
                        </Button>

                        {/* Custom Allocation Modal */}
                        <Button
                          size="sm"
                          onClick={() => {
                            setExtensionHoursToAllocate(req.extensionRequestedHours || 2.0);
                            setApprovalModalReq(req);
                          }}
                          className="flex-1 min-h-[36px] cursor-pointer gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          title="Custom time allocation modal"
                        >
                          <i className="fa-solid fa-clock-rotate-left text-xs" />
                          <span>Custom</span>
                        </Button>

                        {/* Decline with Reason */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDeclineReason("");
                            setDeclineModalReq(req);
                          }}
                          className="min-h-[36px] cursor-pointer gap-1 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50"
                          title="Decline request with feedback reason"
                        >
                          <i className="fa-solid fa-ban text-xs" />
                          <span className="hidden sm:inline">Decline</span>
                        </Button>
                      </>
                    ) : (
                      <div className="text-[11px] text-amber-500 flex items-center gap-1 font-medium flex-1">
                        <i className="fa-solid fa-hourglass-start" /> Awaiting Manager Approval
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspectingRecord(req)}
                      className="min-h-[36px] cursor-pointer gap-1 text-xs text-muted-foreground hover:text-foreground shrink-0"
                      title="View full audit trail"
                    >
                      <i className="fa-solid fa-eye text-xs" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Shift Extensions Management Desk Unified Table & Card Container ── */}
      <Card className="rounded-2xl border border-border/80 shadow-2xs overflow-hidden bg-card">
        {/* Integrated Top Toolbar: Filters, Presets, Status & Search */}
        <div className="p-4 border-b border-border/80 space-y-3.5 bg-card">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center p-1 bg-secondary/80 dark:bg-muted/70 rounded-xl border border-border shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setDatePreset("all");
                  setCustomDate("");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px]",
                  datePreset === "all" && !customDate
                    ? "bg-card text-foreground shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => {
                  setDatePreset("today");
                  setCustomDate("");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px]",
                  datePreset === "today" && !customDate
                    ? "bg-card text-foreground shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  setDatePreset("yesterday");
                  setCustomDate("");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px]",
                  datePreset === "yesterday" && !customDate
                    ? "bg-card text-foreground shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={() => {
                  setDatePreset("week");
                  setCustomDate("");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px]",
                  datePreset === "week" && !customDate
                    ? "bg-card text-foreground shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Last 7 Days
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background text-xs min-h-[38px] shadow-2xs">
              <i className="fa-solid fa-calendar-day text-xs text-primary" />
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-foreground outline-none cursor-pointer font-mono text-xs w-[125px]"
                title="Select specific date"
              />
            </div>
          </div>

          {/* Right Group: Status Toggle, Department Select, View Switcher */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Filter */}
            <div className="inline-flex items-center p-1 bg-secondary/80 dark:bg-muted/70 rounded-xl border border-border shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px]",
                  statusFilter === "all"
                    ? "bg-card text-foreground shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("pending");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px]",
                  statusFilter === "pending"
                    ? "bg-card text-amber-500 shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("approved");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px]",
                  statusFilter === "approved"
                    ? "bg-card text-emerald-500 shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Approved
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("declined");
                  setCurrentPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[32px]",
                  statusFilter === "declined"
                    ? "bg-card text-rose-500 shadow-2xs font-extrabold border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Declined
              </button>
            </div>

            {/* Department Filter */}
            {departments.length > 2 && (
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground cursor-pointer shadow-2xs outline-none"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === "All" ? "All Departments" : dept}
                  </option>
                ))}
              </select>
            )}

            {/* View Mode Switcher */}
            <div className="inline-flex items-center p-1 bg-secondary/80 dark:bg-muted/70 rounded-xl border border-border shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-card text-primary font-bold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Table View"
              >
                <i className="fa-solid fa-table-list" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer",
                  viewMode === "cards"
                    ? "bg-card text-primary font-bold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Cards View"
              >
                <i className="fa-solid fa-table-cells-large" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by employee name, department, submitted reason, or approving manager..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs min-h-[38px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Data Representation (Table vs Cards vs Empty State) ── */}
      {filteredRecords.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-card/60">
          <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-500 mx-auto flex items-center justify-center text-lg">
            <i className="fa-solid fa-clock-rotate-left" />
          </div>
          <h4 className="text-sm font-bold text-foreground">No shift extension records found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {searchQuery || statusFilter !== "all" || customDate
              ? "No records match your active search and filter criteria. Try clearing filters."
              : "No employees have requested or been allocated additional shift hours yet."}
          </p>
          {(searchQuery || statusFilter !== "all" || customDate || departmentFilter !== "All") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setDepartmentFilter("All");
                setDatePreset("all");
                setCustomDate("");
              }}
              className="text-xs font-semibold gap-1.5 min-h-[36px] cursor-pointer"
            >
              <i className="fa-solid fa-filter-circle-xmark" />
              <span>Reset All Filters</span>
            </Button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  {canApprove && (
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedRecords.filter((r) => r.extensionRequested && !r.extensionApproved && !r.extensionRejected).length > 0 &&
                          paginatedRecords
                            .filter((r) => r.extensionRequested && !r.extensionApproved && !r.extensionRejected)
                            .every((r) => selectedIds.includes(r._id))
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer align-middle"
                        title="Select all pending on this page"
                      />
                    </th>
                  )}
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Shift Date</th>
                  <th className="py-3.5 px-4">Worked / Cap</th>
                  <th className="py-3.5 px-4">Requested &amp; Reason</th>
                  <th className="py-3.5 px-4">Allocated Extra</th>
                  <th className="py-3.5 px-4">Approval Status</th>
                  <th className="py-3.5 px-4">Approving / Action Manager</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRecords.map((log) => {
                  const emp = typeof log.userId === "object" ? log.userId : null;
                  const approver = typeof log.extensionApprovedBy === "object" ? log.extensionApprovedBy : null;
                  const rejecter = typeof log.extensionRejectedBy === "object" ? log.extensionRejectedBy : null;
                  const isApproved = Boolean(log.extensionApproved);
                  const isDeclined = Boolean(log.extensionRejected);
                  const isPending = Boolean(log.extensionRequested && !log.extensionApproved && !log.extensionRejected);
                  const isSelected = selectedIds.includes(log._id);
                  const worked = ((log.regularHours || 0) + (log.overtimeHours || 0)).toFixed(1);
                  const isToday = getISTDateString(new Date(log.date)) === getISTDateString();

                  return (
                    <tr
                      key={log._id}
                      onClick={() => setInspectingRecord(log)}
                      className={cn(
                        "hover:bg-accent/30 transition-colors cursor-pointer group",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox column */}
                      {canApprove && (
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {isPending ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(log._id)}
                              className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer align-middle"
                            />
                          ) : (
                            <span className="text-muted-foreground/30 text-xs">—</span>
                          )}
                        </td>
                      )}

                      {/* Employee Profile */}
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <div className="flex items-center gap-2.5 min-w-[170px]">
                          {emp?.photoUrl ? (
                            <Image
                              src={emp.photoUrl}
                              alt={emp.name || "Employee"}
                              width={32}
                              height={32}
                              className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0">
                              {emp?.name?.[0]?.toUpperCase() || "U"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate text-foreground group-hover:text-primary transition-colors">
                              {emp?.name || "Team Member"}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate font-normal">
                              {emp?.role || "Employee"} {emp?.department ? `• ${emp?.department}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shift Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-xs text-foreground">
                          {new Date(log.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        {isToday ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Today
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.date).getFullYear()}
                          </span>
                        )}
                      </td>

                      {/* Worked vs Cap */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-xs text-foreground">{worked}h worked</div>
                        <span className="text-[10px] text-muted-foreground">Limit: 10.0h</span>
                      </td>

                      {/* Requested Extra & Reason */}
                      <td className="py-3 px-4 max-w-[220px]">
                        {log.extensionRequested ? (
                          <>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-mono font-bold text-xs text-amber-500">
                                +{log.extensionRequestedHours || 0}h
                              </span>
                              <span className="text-[10px] text-muted-foreground">requested</span>
                            </div>
                            {log.extensionReason ? (
                              <p className="text-[11px] text-foreground/80 italic truncate" title={log.extensionReason}>
                                "{log.extensionReason}"
                              </p>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/60">No note provided</span>
                            )}
                          </>
                        ) : isApproved ? (
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <i className="fa-solid fa-user-shield text-[10px] text-primary" />
                              <span className="text-[11px] font-medium text-foreground">Direct Allocation</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">Allocated by Manager</span>
                          </div>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground/50">--</span>
                        )}
                      </td>

                      {/* Allocated Extra Hours */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isApproved ? (
                          <span className="font-mono font-bold text-xs text-emerald-500 flex items-center gap-1">
                            <i className="fa-solid fa-plus-circle text-[10px]" />
                            <span>{Number(log.extensionAllocatedHours || 0).toFixed(1)} hrs</span>
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground/50">--</span>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <i className="fa-solid fa-circle-check text-[10px]" />
                            <span>Approved</span>
                          </span>
                        ) : isDeclined ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <i className="fa-solid fa-ban text-[10px]" />
                            <span>Declined</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <i className="fa-solid fa-clock-rotate-left text-[10px] animate-spin-slow" />
                            <span>Awaiting Action</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Standard</span>
                        )}
                      </td>

                      {/* Approver / Rejecter Details */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {approver ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-secondary text-foreground text-[10px] font-bold flex items-center justify-center border border-border">
                              {approver.name?.[0]?.toUpperCase() || "M"}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-foreground">{approver.name}</div>
                              {log.extensionApprovedAt && (
                                <div className="text-[10px] text-muted-foreground">
                                  {new Date(log.extensionApprovedAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : isDeclined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-rose-500/15 text-rose-500 text-[10px] font-bold flex items-center justify-center border border-rose-500/30">
                              <i className="fa-solid fa-ban text-[9px]" />
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-rose-500">
                                {rejecter?.name ? `Declined by ${rejecter.name}` : "Declined"}
                              </div>
                              {log.extensionRejectedAt && (
                                <div className="text-[10px] text-muted-foreground">
                                  {new Date(log.extensionRejectedAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : isPending ? (
                          <span className="text-[11px] text-amber-500 font-medium">Pending Manager</span>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">--</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {canApprove && isPending && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled={isQuickApproving === log._id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickApprove(log);
                                }}
                                className="h-7 px-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs gap-1"
                                title={`Quick Approve requested +${log.extensionRequestedHours || 2.0}h`}
                              >
                                <i className={cn("fa-solid text-[10px]", isQuickApproving === log._id ? "fa-spinner fa-spin" : "fa-bolt")} />
                                <span className="hidden xl:inline">Quick</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExtensionHoursToAllocate(log.extensionRequestedHours || 2.0);
                                  setApprovalModalReq(log);
                                }}
                                className="h-7 px-2 rounded-lg text-xs font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shadow-xs gap-1"
                                title="Custom Hours Allocation"
                              >
                                <i className="fa-solid fa-sliders text-[10px]" />
                                <span className="hidden xl:inline">Custom</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeclineReason("");
                                  setDeclineModalReq(log);
                                }}
                                className="h-7 px-2 rounded-lg text-xs font-semibold border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer shadow-xs gap-1"
                                title="Decline request with reason"
                              >
                                <i className="fa-solid fa-ban text-[10px]" />
                                <span className="hidden xl:inline">Decline</span>
                              </Button>
                            </>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectingRecord(log);
                            }}
                            className="h-7 px-2 rounded-lg text-xs text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Inspect full audit record"
                          >
                            <span>Inspect</span>
                            <i className="fa-solid fa-chevron-right text-[10px]" />
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
          /* Cards View Mode */
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-muted/5">
          {paginatedRecords.map((log) => {
            const emp = typeof log.userId === "object" ? log.userId : null;
            const approver = typeof log.extensionApprovedBy === "object" ? log.extensionApprovedBy : null;
            const rejecter = typeof log.extensionRejectedBy === "object" ? log.extensionRejectedBy : null;
            const isApproved = Boolean(log.extensionApproved);
            const isDeclined = Boolean(log.extensionRejected);
            const isPending = Boolean(log.extensionRequested && !log.extensionApproved && !log.extensionRejected);
            const isSelected = selectedIds.includes(log._id);
            const worked = ((log.regularHours || 0) + (log.overtimeHours || 0)).toFixed(1);

            return (
              <Card
                key={log._id}
                onClick={() => setInspectingRecord(log)}
                className={cn(
                  "p-4 rounded-2xl border transition-all space-y-3 cursor-pointer bg-card flex flex-col justify-between shadow-2xs hover:shadow-md",
                  isSelected
                    ? "border-primary/60 ring-2 ring-primary/40 bg-primary/5"
                    : "border-border/80 hover:border-primary/40"
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isPending && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(log._id);
                          }}
                          className="pr-1 cursor-pointer shrink-0"
                          title="Select for bulk approval"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by parent div onClick
                            className="w-4 h-4 rounded text-primary border-border focus:ring-primary cursor-pointer"
                          />
                        </div>
                      )}
                      {emp?.photoUrl ? (
                        <Image
                          src={emp.photoUrl}
                          alt={emp.name || "Employee"}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-full object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center text-xs border border-primary/20 shrink-0">
                          {emp?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-xs truncate text-foreground">{emp?.name || "Team Member"}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {emp?.role || "Employee"} {emp?.department ? `• ${emp?.department}` : ""}
                        </div>
                      </div>
                    </div>

                    {isApproved ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                        <i className="fa-solid fa-check text-[9px]" /> Approved
                      </span>
                    ) : isDeclined ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0 flex items-center gap-1">
                        <i className="fa-solid fa-ban text-[9px]" /> Declined
                      </span>
                    ) : isPending ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 flex items-center gap-1">
                        <i className="fa-solid fa-clock text-[9px]" /> Pending
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-accent/30 border border-border/60">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Shift Date</span>
                      <strong className="text-foreground">
                        {new Date(log.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Hours Worked</span>
                      <strong className="text-foreground font-mono">{worked} hrs</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Requested</span>
                      <strong className="text-amber-500 font-mono">
                        {log.extensionRequested ? `+${log.extensionRequestedHours || 0}h` : "--"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Allocated</span>
                      <strong className="text-emerald-500 font-mono">
                        {isApproved ? `+${Number(log.extensionAllocatedHours || 0).toFixed(1)}h` : "--"}
                      </strong>
                    </div>
                  </div>

                  {log.extensionReason && (
                    <div className="text-xs text-foreground/80 italic bg-accent/20 p-2 rounded-lg border border-border/40">
                      "{log.extensionReason}"
                    </div>
                  )}

                  {isDeclined && log.extensionRejectionReason && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <i className="fa-solid fa-ban text-[9px]" /> Rejection Reason:
                      </span>
                      <p className="text-foreground italic">"{log.extensionRejectionReason}"</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/60 flex flex-col gap-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center justify-between">
                    {approver ? (
                      <span className="truncate text-emerald-600 dark:text-emerald-400 font-medium">
                        Approved by {approver.name}
                      </span>
                    ) : isDeclined ? (
                      <span className="truncate text-rose-600 dark:text-rose-400 font-medium">
                        {rejecter?.name ? `Declined by ${rejecter.name}` : "Declined by Manager"}
                      </span>
                    ) : isPending ? (
                      <span className="text-amber-500 font-medium">Awaiting Manager Action</span>
                    ) : (
                      <span className="text-muted-foreground/60">Standard shift</span>
                    )}
                  </div>

                  {canApprove && isPending && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isQuickApproving === log._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickApprove(log);
                        }}
                        className="flex-1 h-7 px-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs gap-1"
                        title={`Quick Approve +${log.extensionRequestedHours || 2.0}h`}
                      >
                        <i className={cn("fa-solid text-[10px]", isQuickApproving === log._id ? "fa-spinner fa-spin" : "fa-bolt")} />
                        <span>Quick</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExtensionHoursToAllocate(log.extensionRequestedHours || 2.0);
                          setApprovalModalReq(log);
                        }}
                        className="h-7 px-2.5 rounded-lg text-xs font-semibold border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shadow-xs gap-1"
                        title="Custom Hours Allocation"
                      >
                        <i className="fa-solid fa-sliders text-[10px]" />
                        <span>Custom</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeclineReason("");
                          setDeclineModalReq(log);
                        }}
                        className="h-7 px-2.5 rounded-lg text-xs font-semibold border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer shadow-xs gap-1"
                        title="Decline request with reason"
                      >
                        <i className="fa-solid fa-ban text-[10px]" />
                        <span>Decline</span>
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Integrated Bottom Pagination Toolbar */}
      {filteredRecords.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/80 text-xs text-muted-foreground bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-card border border-border/70 text-foreground font-semibold">
              Showing {startIndex + 1}–{Math.min(startIndex + rowsPerPage, filteredRecords.length)} of{" "}
              {filteredRecords.length} records
            </span>
            <span className="hidden md:inline text-muted-foreground">
              (Page {currentPage} of {totalPages})
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-[11px] font-medium">Rows:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-card text-foreground border border-border rounded-lg px-2 py-1 text-xs cursor-pointer outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-7 w-7 p-0 rounded-lg text-xs cursor-pointer"
                title="Previous Page"
              >
                <i className="fa-solid fa-chevron-left text-[10px]" />
              </Button>
              <span className="text-xs font-semibold px-2 text-foreground">{currentPage}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 w-7 p-0 rounded-lg text-xs cursor-pointer"
                title="Next Page"
              >
                <i className="fa-solid fa-chevron-right text-[10px]" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>

      {/* ── Shift Extension Allocation Modal ── */}
      {approvalModalReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setApprovalModalReq(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-sm border border-emerald-500/30">
                  <i className="fa-solid fa-clock-rotate-left" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Allocate Extension Time</h3>
                  <p className="text-[11px] text-muted-foreground">Authorize additional working hours past shift limit</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalReq(null)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs cursor-pointer min-h-[36px]"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto overscroll-contain flex-1">
              <div className="p-3 rounded-xl bg-accent/40 border border-border/70 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Team Member:</span>
                  <strong className="text-foreground">
                    {typeof approvalModalReq.userId === "object"
                      ? approvalModalReq.userId?.name
                      : "Employee"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Department:</span>
                  <span>
                    {typeof approvalModalReq.userId === "object"
                      ? approvalModalReq.userId?.department || "General"
                      : "General"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Requested Duration:</span>
                  <strong className="text-amber-500 font-mono">
                    +{approvalModalReq.extensionRequestedHours || 0} hrs
                  </strong>
                </div>
                {approvalModalReq.extensionReason && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-muted-foreground block text-[10px] mb-0.5">Submitted Reason:</span>
                    <p className="italic text-foreground">"{approvalModalReq.extensionReason}"</p>
                  </div>
                )}
              </div>

              {/* Quick Hours Allocation Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">Select Hours to Allocate:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0.5, 1.0, 1.5, 2.0].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtensionHoursToAllocate(h)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[38px]",
                        extensionHoursToAllocate === h
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-secondary text-muted-foreground hover:text-foreground border-border"
                      )}
                    >
                      +{h.toFixed(1)}h
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[2.5, 3.0, 4.0].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setExtensionHoursToAllocate(h)}
                      className={cn(
                        "py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[38px]",
                        extensionHoursToAllocate === h
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-secondary text-muted-foreground hover:text-foreground border-border"
                      )}
                    >
                      +{h.toFixed(1)}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovalModalReq(null)}
                className="min-h-[38px] text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApproveExtension}
                disabled={isSubmittingApproval}
                className="min-h-[38px] text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs gap-1.5"
              >
                <i className={cn("fa-solid text-xs", isSubmittingApproval ? "fa-spinner fa-spin" : "fa-check")} />
                <span>{isSubmittingApproval ? "Approving..." : `Approve (+${extensionHoursToAllocate.toFixed(1)}h)`}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shift Extension Decline Modal ── */}
      {declineModalReq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setDeclineModalReq(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center text-sm border border-rose-500/30">
                  <i className="fa-solid fa-ban" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Decline Extension Request</h3>
                  <p className="text-[11px] text-muted-foreground">Provide explanation feedback to employee</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeclineModalReq(null)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs cursor-pointer min-h-[36px]"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto overscroll-contain flex-1">
              <div className="p-3 rounded-xl bg-accent/40 border border-border/70 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Team Member:</span>
                  <strong className="text-foreground">
                    {typeof declineModalReq.userId === "object"
                      ? declineModalReq.userId?.name
                      : "Employee"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Requested Duration:</span>
                  <strong className="text-amber-500 font-mono">
                    +{declineModalReq.extensionRequestedHours || 0} hrs
                  </strong>
                </div>
                {declineModalReq.extensionReason && (
                  <div className="pt-2 border-t border-border/50">
                    <span className="text-muted-foreground block text-[10px] mb-0.5">Submitted Reason:</span>
                    <p className="italic text-foreground">"{declineModalReq.extensionReason}"</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Reason for Rejection <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Explain why this extension request cannot be granted..."
                  className="w-full h-24 p-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-rose-500 resize-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "Coverage sufficient",
                    "Budget limit reached",
                    "Overtime cap exceeded",
                    "Standard shift only",
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setDeclineReason(reason)}
                      className="px-2 py-1 rounded-lg text-[10px] font-medium bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/60 cursor-pointer transition-colors"
                    >
                      + {reason}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/70 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeclineModalReq(null)}
                className="min-h-[38px] text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeclineExtension}
                disabled={isSubmittingDecline || !declineReason.trim()}
                className="min-h-[38px] text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-xs gap-1.5 disabled:opacity-50"
              >
                <i className={cn("fa-solid text-xs", isSubmittingDecline ? "fa-spinner fa-spin" : "fa-ban")} />
                <span>{isSubmittingDecline ? "Declining..." : "Decline Extension"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Executive Shift Audit & Verification Dossier ── */}
      {inspectingRecord && (() => {
        const isInspectApproved = Boolean(inspectingRecord.extensionApproved);
        const isInspectDeclined = Boolean(inspectingRecord.extensionRejected);
        const isInspectPending = Boolean(
          inspectingRecord.extensionRequested && !inspectingRecord.extensionApproved && !inspectingRecord.extensionRejected
        );
        const empUser = typeof inspectingRecord.userId === "object" ? inspectingRecord.userId : null;
        const approverUser = typeof inspectingRecord.extensionApprovedBy === "object" ? inspectingRecord.extensionApprovedBy : null;
        const rejecterUser = typeof inspectingRecord.extensionRejectedBy === "object" ? inspectingRecord.extensionRejectedBy : null;

        const regHours = Number(inspectingRecord.regularHours || 0);
        const otHours = Number(inspectingRecord.overtimeHours || 0);
        const totalWorked = (regHours + otHours).toFixed(1);
        const allocatedHoursNum = Number(inspectingRecord.extensionAllocatedHours || 0);
        const shiftCapPercent = Math.min(100, Math.round((Number(totalWorked) / 10.0) * 100));

        // Format dates safely
        const shiftDateFormatted = new Date(inspectingRecord.date).toLocaleDateString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setInspectingRecord(null)}
          >
            <div
              className={cn(
                "w-full max-w-2xl bg-card border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-foreground animate-in zoom-in-95 duration-200 transition-all",
                isInspectApproved
                  ? "border-emerald-500/30 shadow-emerald-500/10"
                  : isInspectDeclined
                  ? "border-rose-500/30 shadow-rose-500/10"
                  : "border-amber-500/30 shadow-amber-500/10"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dynamic Status Accent Line */}
              <div
                className={cn(
                  "h-1.5 w-full shrink-0",
                  isInspectApproved
                    ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"
                    : isInspectDeclined
                    ? "bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500"
                    : "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
                )}
              />

              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between gap-3 shrink-0 bg-accent/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-base border shrink-0 shadow-xs",
                      isInspectApproved
                        ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/25"
                        : isInspectDeclined
                        ? "bg-rose-500/15 text-rose-500 border-rose-500/25"
                        : "bg-amber-500/15 text-amber-500 border-amber-500/25"
                    )}
                  >
                    <i
                      className={cn(
                        "fa-solid",
                        isInspectApproved
                          ? "fa-file-shield"
                          : isInspectDeclined
                          ? "fa-file-circle-xmark"
                          : "fa-clock-rotate-left"
                      )}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                        Shift Extension Audit Record
                      </h3>
                      <span className="hidden sm:inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <i className="fa-solid fa-lock text-[8px]" /> Official Audit Log
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <button
                        type="button"
                        onClick={() => handleCopyAuditId(inspectingRecord._id)}
                        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground font-mono transition-colors group cursor-pointer"
                        title="Click to copy Record ID"
                      >
                        <span className="truncate max-w-[200px] sm:max-w-none">Record ID: {inspectingRecord._id}</span>
                        <i
                          className={cn(
                            "fa-solid text-[10px]",
                            copiedAuditId ? "fa-check text-emerald-500" : "fa-copy opacity-60 group-hover:opacity-100"
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isInspectApproved ? (
                    <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                      <i className="fa-solid fa-circle-check text-[11px]" />
                      <span className="hidden sm:inline">Approved & Granted</span>
                      <span className="sm:hidden">Approved</span>
                    </span>
                  ) : isInspectDeclined ? (
                    <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5 shadow-xs">
                      <i className="fa-solid fa-circle-xmark text-[11px]" />
                      <span>Declined</span>
                    </span>
                  ) : (
                    <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
                      <i className="fa-solid fa-hourglass-half fa-spin text-[11px]" />
                      <span className="hidden sm:inline">Pending Review</span>
                      <span className="sm:hidden">Pending</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setInspectingRecord(null)}
                    className="w-8 h-8 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs cursor-pointer min-h-[36px] transition-colors border border-border/60"
                    title="Close"
                    aria-label="Close"
                  >
                    <i className="fa-solid fa-xmark text-sm" />
                  </button>
                </div>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto overscroll-contain flex-1 text-xs">
                {/* Employee Context Hero Banner */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-accent/30 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {empUser?.photoUrl ? (
                      <Image
                        src={empUser.photoUrl}
                        alt={empUser.name || "Employee"}
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-xl object-cover border border-primary/20 shrink-0 shadow-xs"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold flex items-center justify-center text-base border border-primary/25 shrink-0 shadow-xs">
                        {empUser?.name?.[0]?.toUpperCase() || "E"}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm sm:text-base text-foreground truncate">
                          {empUser?.name || "Team Member"}
                        </h4>
                        {empUser?.department && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                            <i className="fa-solid fa-building text-[9px]" />
                            <span>{empUser.department}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                        <span>{empUser?.email || "No email"}</span>
                        {empUser?.role && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{empUser.role}</span>
                          </>
                        )}
                        {empUser?.shiftName && (
                          <>
                            <span>•</span>
                            <span className="text-foreground/80 font-medium">{empUser.shiftName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 text-[11px] shrink-0">
                    <div className="text-muted-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-calendar-day text-primary text-[10px]" />
                      <span className="font-semibold text-foreground">{shiftDateFormatted}</span>
                    </div>
                    <div className="mt-1">
                      {!inspectingRecord.clockOut ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Shift Active (Live)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                          <i className="fa-solid fa-circle-check text-[9px]" />
                          Shift Concluded
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4-Stat Metric Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Total Worked */}
                  <div className="p-3 rounded-xl bg-accent/25 border border-border/70 flex flex-col justify-between">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Total Worked</span>
                      <i className="fa-solid fa-business-time text-primary text-[10px]" />
                    </div>
                    <div className="mt-1.5">
                      <div className="text-base sm:text-lg font-bold font-mono text-foreground">
                        {totalWorked} <span className="text-xs font-sans font-normal text-muted-foreground">hrs</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Reg: {regHours.toFixed(1)}h • OT: {otHours.toFixed(1)}h
                      </div>
                    </div>
                  </div>

                  {/* Requested Extra */}
                  <div className="p-3 rounded-xl bg-accent/25 border border-border/70 flex flex-col justify-between">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Requested</span>
                      <i className="fa-solid fa-hand-holding-hand text-amber-500 text-[10px]" />
                    </div>
                    <div className="mt-1.5">
                      <div className="text-base sm:text-lg font-bold font-mono text-amber-500">
                        {inspectingRecord.extensionRequested
                          ? `+${Number(inspectingRecord.extensionRequestedHours || 0).toFixed(1)} hrs`
                          : "Direct Grant"}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {inspectingRecord.extensionRequested ? "By Team Member" : "Direct Allocation"}
                      </div>
                    </div>
                  </div>

                  {/* Granted Extra */}
                  <div
                    className={cn(
                      "p-3 rounded-xl border flex flex-col justify-between",
                      isInspectApproved
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : isInspectDeclined
                        ? "bg-rose-500/10 border-rose-500/30"
                        : "bg-accent/25 border-border/70"
                    )}
                  >
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Granted Extra</span>
                      <i
                        className={cn(
                          "fa-solid text-[10px]",
                          isInspectApproved
                            ? "fa-shield-halved text-emerald-500"
                            : isInspectDeclined
                            ? "fa-ban text-rose-500"
                            : "fa-clock text-amber-500"
                        )}
                      />
                    </div>
                    <div className="mt-1.5">
                      <div
                        className={cn(
                          "text-base sm:text-lg font-bold font-mono",
                          isInspectApproved
                            ? "text-emerald-500"
                            : isInspectDeclined
                            ? "text-rose-500"
                            : "text-muted-foreground"
                        )}
                      >
                        {isInspectApproved
                          ? `+${allocatedHoursNum.toFixed(1)} hrs`
                          : isInspectDeclined
                          ? "0.0 hrs"
                          : "Pending"}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {isInspectApproved
                          ? "Authorized Extension"
                          : isInspectDeclined
                          ? "Declined by Manager"
                          : "Queued for Review"}
                      </div>
                    </div>
                  </div>

                  {/* Shift Cap Safety */}
                  <div className="p-3 rounded-xl bg-accent/25 border border-border/70 flex flex-col justify-between">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Shift Cap</span>
                      <i className="fa-solid fa-gauge-high text-cyan-500 text-[10px]" />
                    </div>
                    <div className="mt-1.5">
                      <div className="text-base sm:text-lg font-bold font-mono text-cyan-500">
                        {shiftCapPercent}%
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        Max 10.0h Daily Cap
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shift Visual Progress Bar */}
                <div className="p-3 rounded-xl bg-accent/20 border border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-chart-simple text-primary text-[10px]" />
                      <span>Shift Duration & Cap Distribution</span>
                    </span>
                    <span className="font-mono text-foreground font-bold">
                      {totalWorked}h / 10.0h max
                    </span>
                  </div>

                  <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden flex p-0.5 border border-border/50">
                    <div
                      style={{ width: `${Math.min(80, (Math.min(regHours, 8.0) / 10.0) * 100)}%` }}
                      className="bg-primary h-full rounded-l-full transition-all duration-300"
                      title={`Regular Shift: ${regHours.toFixed(1)}h`}
                    />
                    {otHours > 0 && (
                      <div
                        style={{ width: `${Math.min(20, (otHours / 10.0) * 100)}%` }}
                        className={cn(
                          "h-full transition-all duration-300",
                          isInspectApproved ? "bg-emerald-500" : "bg-amber-500"
                        )}
                        title={`Extension/Overtime: ${otHours.toFixed(1)}h`}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span>Base Schedule (8h)</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={cn("w-2 h-2 rounded-full", isInspectApproved ? "bg-emerald-500" : "bg-amber-500")} />
                      <span>Extension ({otHours.toFixed(1)}h)</span>
                    </span>
                    <span className="flex items-center gap-1 font-medium text-emerald-500">
                      <i className="fa-solid fa-shield-check text-[9px]" />
                      <span>Safety Compliant</span>
                    </span>
                  </div>
                </div>

                {/* Chronological Audit Trail & Lifecycle Stepper */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-timeline text-primary text-xs" />
                      <span>Audit Trail & Lifecycle Events</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">Chronological Sequence</span>
                  </div>

                  <div className="relative pl-6 sm:pl-7 space-y-3.5 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/80">
                    {/* Event 1: Shift Initiated */}
                    <div className="relative">
                      <div className="absolute -left-6 sm:-left-7 top-0.5 w-5 h-5 rounded-full bg-primary/20 text-primary border border-primary/40 flex items-center justify-center text-[9px]">
                        <i className="fa-solid fa-play" />
                      </div>
                      <div className="p-3 rounded-xl bg-accent/20 border border-border/60 space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <i className="fa-solid fa-fingerprint text-primary text-[10px]" />
                            <span>Shift Commenced</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {inspectingRecord.clockIn
                              ? new Date(inspectingRecord.clockIn).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : "Clock In Registered"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span>Team member clocked in for duty</span>
                          {inspectingRecord.clockInLocation?.latitude ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                              <i className="fa-solid fa-location-dot" /> GPS Geofence Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <i className="fa-solid fa-laptop" /> Web Portal Check-in
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Event 2: Extension Request & Justification */}
                    {(inspectingRecord.extensionRequested || inspectingRecord.extensionReason) && (
                      <div className="relative">
                        <div className="absolute -left-6 sm:-left-7 top-0.5 w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center text-[9px]">
                          <i className="fa-solid fa-paper-plane" />
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/25 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-hand-holding-hand text-[10px]" />
                              <span>Shift Extension Requested</span>
                              {inspectingRecord.extensionRequestedHours && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-500/20 text-amber-500">
                                  +{inspectingRecord.extensionRequestedHours}h
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-sans">
                              Submitted by Team Member
                            </span>
                          </div>

                          {inspectingRecord.extensionReason ? (
                            <div className="p-2.5 rounded-lg bg-background/60 border border-amber-500/20 text-foreground italic flex items-start gap-2 shadow-xs">
                              <i className="fa-solid fa-quote-left text-amber-500/60 text-xs mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block not-italic mb-0.5">
                                  Submitted Justification
                                </span>
                                <p className="not-italic text-xs font-medium text-foreground">
                                  "{inspectingRecord.extensionReason}"
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground italic">
                              Direct managerial overtime allocation without written employee justification.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Event 3: Manager Decision (Approved) */}
                    {isInspectApproved && (
                      <div className="relative">
                        <div className="absolute -left-6 sm:-left-7 top-0.5 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center text-[9px]">
                          <i className="fa-solid fa-shield-check" />
                        </div>
                        <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-circle-check text-xs" />
                              <span>Manager Authorization Granted</span>
                            </span>
                            {inspectingRecord.extensionApprovedAt && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(inspectingRecord.extensionApprovedAt).toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1 border-t border-emerald-500/20">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-[11px] border border-emerald-500/30 shrink-0">
                                {approverUser?.name?.[0]?.toUpperCase() || "M"}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-foreground text-xs truncate">
                                  Approved by {approverUser?.name || "Manager"}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {approverUser?.role || "Authorized Department Manager"}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-muted-foreground block">Allocated Time</span>
                              <span className="font-mono font-bold text-emerald-500 text-xs sm:text-sm">
                                +{allocatedHoursNum.toFixed(1)} hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Event 3: Manager Decision (Declined) */}
                    {isInspectDeclined && (
                      <div className="relative">
                        <div className="absolute -left-6 sm:-left-7 top-0.5 w-5 h-5 rounded-full bg-rose-500/20 text-rose-500 border border-rose-500/40 flex items-center justify-center text-[9px]">
                          <i className="fa-solid fa-ban" />
                        </div>
                        <div className="p-3 sm:p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-circle-xmark text-xs" />
                              <span>Shift Extension Declined</span>
                            </span>
                            {inspectingRecord.extensionRejectedAt && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {new Date(inspectingRecord.extensionRejectedAt).toLocaleString()}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3 pt-1 border-t border-rose-500/20">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-500 font-bold flex items-center justify-center text-[11px] border border-rose-500/30 shrink-0">
                                {rejecterUser?.name?.[0]?.toUpperCase() || "M"}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-foreground text-xs truncate">
                                  Declined by {rejecterUser?.name || "Manager"}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {rejecterUser?.role || "Department Supervisor"}
                                </div>
                              </div>
                            </div>
                          </div>

                          {inspectingRecord.extensionRejectionReason && (
                            <div className="p-2.5 rounded-lg bg-background/60 border border-rose-500/20 text-xs">
                              <span className="text-[10px] font-semibold text-rose-500 block mb-0.5">
                                Reason Provided by Management:
                              </span>
                              <p className="italic text-foreground">
                                "{inspectingRecord.extensionRejectionReason}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Event 3: Pending Manager Action */}
                    {isInspectPending && (
                      <div className="relative">
                        <div className="absolute -left-6 sm:-left-7 top-0.5 w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center text-[9px] animate-pulse">
                          <i className="fa-solid fa-hourglass-half" />
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-clock text-xs" />
                              <span>Awaiting Management Authorization</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold animate-pulse">
                              Pending
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            This extension request is waiting for a manager to review and allocate additional hours.
                          </p>

                          {canApprove && (
                            <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const target = inspectingRecord;
                                  setInspectingRecord(null);
                                  handleQuickApprove(target);
                                }}
                                className="h-8 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs gap-1.5"
                              >
                                <i className="fa-solid fa-bolt" />
                                <span>Quick Approve (+{inspectingRecord.extensionRequestedHours || 2.0}h)</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const target = inspectingRecord;
                                  setInspectingRecord(null);
                                  setDeclineReason("");
                                  setDeclineModalReq(target);
                                }}
                                className="h-8 px-3 rounded-xl text-xs font-semibold border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer shadow-xs gap-1.5"
                              >
                                <i className="fa-solid fa-ban" />
                                <span>Decline</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Event 4: Shift Concluded */}
                    {inspectingRecord.clockOut && (
                      <div className="relative">
                        <div className="absolute -left-6 sm:-left-7 top-0.5 w-5 h-5 rounded-full bg-muted text-muted-foreground border border-border flex items-center justify-center text-[9px]">
                          <i className="fa-solid fa-stop" />
                        </div>
                        <div className="p-3 rounded-xl bg-accent/20 border border-border/60 flex items-center justify-between">
                          <div>
                            <div className="font-bold text-foreground">Shift Completed & Finalized</div>
                            <div className="text-[10px] text-muted-foreground">Timesheet entry locked</div>
                          </div>
                          <div className="text-right font-mono text-[11px] text-muted-foreground">
                            {new Date(inspectingRecord.clockOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Digital Audit Verification Seal */}
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-[10px] text-muted-foreground flex-wrap gap-2">
                  <span className="flex items-center gap-1.5">
                    <i className="fa-solid fa-fingerprint text-primary" />
                    <span>Cryptographically Verified Audit Dossier</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-shield-halved text-emerald-500" />
                    <span>Immutable Attendance Log</span>
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:p-4 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 bg-muted/20">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyAuditSlip(inspectingRecord)}
                    className="min-h-[38px] text-xs font-semibold cursor-pointer gap-1.5 border-border/70 hover:bg-accent flex-1 sm:flex-initial"
                    title="Copy full audit slip to clipboard"
                  >
                    <i className={cn("fa-solid text-xs", copiedAuditSlip ? "fa-check text-emerald-500" : "fa-clipboard")} />
                    <span>{copiedAuditSlip ? "Audit Slip Copied!" : "Copy Audit Slip"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="min-h-[38px] text-xs font-semibold cursor-pointer gap-1.5 border-border/70 hover:bg-accent hidden sm:inline-flex"
                    title="Print audit docket"
                  >
                    <i className="fa-solid fa-print text-xs" />
                    <span>Print</span>
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setInspectingRecord(null)}
                  className="min-h-[38px] px-6 text-xs font-bold cursor-pointer w-full sm:w-auto shadow-sm"
                >
                  Close Dossier
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Floating Bulk Action Bar ── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-lg animate-in slide-in-from-bottom-5 duration-200">
          <div className="bg-card/95 backdrop-blur-md border-2 border-primary/40 rounded-2xl p-3 sm:p-4 shadow-2xl flex items-center justify-between gap-3 text-foreground">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {selectedIds.length}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate">
                  {selectedIds.length} {selectedIds.length === 1 ? "Request" : "Requests"} Selected
                </div>
                <div className="text-[10px] text-muted-foreground truncate hidden sm:block">
                  Approve requests concurrently with 1-click
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isBulkApproving}
                onClick={handleBulkApprove}
                className="h-8 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md gap-1.5"
              >
                <i className={cn("fa-solid text-xs", isBulkApproving ? "fa-spinner fa-spin" : "fa-bolt")} />
                <span>{isBulkApproving ? "Approving..." : "Approve Selected"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
