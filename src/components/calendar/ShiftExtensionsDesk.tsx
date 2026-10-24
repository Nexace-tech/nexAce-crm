"use client";

import React, { useState, useMemo } from "react";
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
  onBackToClock,
}: ShiftExtensionsDeskProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");
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

  // Detail / Audit Inspector Drawer
  const [inspectingRecord, setInspectingRecord] = useState<any | null>(null);

  // Filter attendance records to those that have extension data
  const extensionRecords = useMemo(() => {
    return attendanceHistory.filter(
      (log) => Boolean(log.extensionRequested || log.extensionApproved || log.extensionAllocatedHours)
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

  // Pending queue: requests awaiting approval
  const pendingQueue = useMemo(() => {
    return extensionRecords.filter((log) => log.extensionRequested && !log.extensionApproved);
  }, [extensionRecords]);

  // Key KPI Metrics
  const metrics = useMemo(() => {
    const todayStr = getISTDateString();
    const pendingCount = pendingQueue.length;
    const totalApproved = extensionRecords.filter((log) => log.extensionApproved).length;
    const totalAllocatedHours = extensionRecords.reduce(
      (acc, log) => acc + (Number(log.extensionAllocatedHours) || 0),
      0
    );
    const activeOnExtensionToday = extensionRecords.filter((log) => {
      const logDateStr = getISTDateString(new Date(log.date));
      return logDateStr === todayStr && log.extensionApproved && !log.clockOut;
    }).length;

    return {
      pendingCount,
      totalApproved,
      totalAllocatedHours,
      activeOnExtensionToday,
      totalRecords: extensionRecords.length,
    };
  }, [extensionRecords, pendingQueue]);

  // Filtered Records based on user criteria
  const filteredRecords = useMemo(() => {
    const todayStr = getISTDateString();
    const yesterdayStr = getISTDateString(new Date(Date.now() - 86400000));
    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

    return extensionRecords.filter((log) => {
      // Status filter
      if (statusFilter === "pending" && (!log.extensionRequested || log.extensionApproved)) return false;
      if (statusFilter === "approved" && !log.extensionApproved) return false;

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
        const approverMatch =
          typeof log.extensionApprovedBy === "object"
            ? log.extensionApprovedBy?.name?.toLowerCase().includes(q)
            : false;
        if (!nameMatch && !emailMatch && !deptMatch && !reasonMatch && !approverMatch) return false;
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

  // Approve extension handler
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
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredRecords.map((log) => {
      const emp = typeof log.userId === "object" ? log.userId : null;
      const approver = typeof log.extensionApprovedBy === "object" ? log.extensionApprovedBy : null;
      const worked = ((log.regularHours || 0) + (log.overtimeHours || 0)).toFixed(1);
      const statusText = log.extensionApproved ? "Approved" : log.extensionRequested ? "Pending" : "None";

      return [
        escapeCsv(log._id),
        escapeCsv(getISTDateString(new Date(log.date))),
        escapeCsv(emp?.name || "Team Member"),
        escapeCsv(emp?.email || ""),
        escapeCsv(emp?.department || ""),
        escapeCsv(emp?.shiftName || emp?.shiftTime || "Standard"),
        escapeCsv(worked),
        escapeCsv(log.extensionRequestedHours || "1.0"),
        escapeCsv(log.extensionReason || ""),
        escapeCsv(log.extensionAllocatedHours || (log.extensionApproved ? "1.0" : "0")),
        escapeCsv(statusText),
        escapeCsv(approver?.name || ""),
        escapeCsv(log.extensionApprovedAt ? new Date(log.extensionApprovedAt).toLocaleString() : ""),
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

      {/* ── 4-Card Executive KPI Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
            <span>Extension Hours Granted</span>
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
            <span>Extended &amp; Working Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 flex items-center justify-center text-xs shadow-2xs">
              <i className="fa-solid fa-user-check" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-500 tracking-tight">
            {metrics.activeOnExtensionToday}
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">Approved &amp; active right now</p>
        </div>

        {/* Metric 4: Total Recorded Extensions */}
        <div className="p-4 rounded-2xl border border-border/80 bg-gradient-to-br from-secondary/40 via-card to-card shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Total Extensions</span>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pendingQueue.map((req) => {
              const emp = typeof req.userId === "object" ? req.userId : null;
              const worked = ((req.regularHours || 0) + (req.overtimeHours || 0)).toFixed(1);

              return (
                <div
                  key={req._id}
                  className="p-4 rounded-xl bg-card border border-amber-500/30 shadow-xs flex flex-col justify-between space-y-3 hover:border-amber-500/50 transition-all group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
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

                  <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                    {canApprove ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setExtensionHoursToAllocate(req.extensionRequestedHours || 2.0);
                          setApprovalModalReq(req);
                        }}
                        className="flex-1 min-h-[36px] cursor-pointer gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <i className="fa-solid fa-clock-rotate-left text-xs" />
                        <span>Allocate &amp; Approve</span>
                      </Button>
                    ) : (
                      <div className="text-[11px] text-amber-500 flex items-center gap-1 font-medium">
                        <i className="fa-solid fa-hourglass-start" /> Awaiting Manager Approval
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInspectingRecord(req)}
                      className="min-h-[36px] cursor-pointer gap-1 text-xs text-muted-foreground hover:text-foreground"
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

      {/* ── Filter & Search Controls Bar ── */}
      <Card className="p-4 rounded-2xl border border-border/80 shadow-2xs space-y-3.5 bg-card">
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
      </Card>

      {/* ── Main Data Representation (Table vs Cards) ── */}
      {filteredRecords.length === 0 ? (
        <Card className="p-12 rounded-2xl border border-dashed border-border text-center space-y-3 bg-card/60">
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
        </Card>
      ) : viewMode === "table" ? (
        <Card className="rounded-2xl border border-border/80 shadow-2xs overflow-hidden bg-card">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Shift Date</th>
                  <th className="py-3.5 px-4">Worked / Cap</th>
                  <th className="py-3.5 px-4">Requested &amp; Reason</th>
                  <th className="py-3.5 px-4">Allocated Extra</th>
                  <th className="py-3.5 px-4">Approval Status</th>
                  <th className="py-3.5 px-4">Approving Manager</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedRecords.map((log) => {
                  const emp = typeof log.userId === "object" ? log.userId : null;
                  const approver = typeof log.extensionApprovedBy === "object" ? log.extensionApprovedBy : null;
                  const isApproved = Boolean(log.extensionApproved);
                  const isPending = Boolean(log.extensionRequested && !log.extensionApproved);
                  const worked = ((log.regularHours || 0) + (log.overtimeHours || 0)).toFixed(1);
                  const isToday = getISTDateString(new Date(log.date)) === getISTDateString();

                  return (
                    <tr
                      key={log._id}
                      onClick={() => setInspectingRecord(log)}
                      className="hover:bg-accent/30 transition-colors cursor-pointer group"
                    >
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
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono font-bold text-xs text-amber-500">
                            +{log.extensionRequestedHours || "1.0"}h
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
                      </td>

                      {/* Allocated Extra Hours */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isApproved ? (
                          <span className="font-mono font-bold text-xs text-emerald-500 flex items-center gap-1">
                            <i className="fa-solid fa-plus-circle text-[10px]" />
                            <span>{Number(log.extensionAllocatedHours || 1.0).toFixed(1)} hrs</span>
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
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <i className="fa-solid fa-clock-rotate-left text-[10px] animate-spin-slow" />
                            <span>Awaiting Action</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Standard</span>
                        )}
                      </td>

                      {/* Approver Details */}
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
                            <Button
                              type="button"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExtensionHoursToAllocate(log.extensionRequestedHours || 2.0);
                                setApprovalModalReq(log);
                              }}
                              className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs gap-1"
                              title="Approve extra hours"
                            >
                              <i className="fa-solid fa-check text-[10px]" />
                              <span>Approve</span>
                            </Button>
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

          {/* Pagination Toolbar */}
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
        </Card>
      ) : (
        /* Cards View Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {paginatedRecords.map((log) => {
            const emp = typeof log.userId === "object" ? log.userId : null;
            const approver = typeof log.extensionApprovedBy === "object" ? log.extensionApprovedBy : null;
            const isApproved = Boolean(log.extensionApproved);
            const isPending = Boolean(log.extensionRequested && !log.extensionApproved);
            const worked = ((log.regularHours || 0) + (log.overtimeHours || 0)).toFixed(1);

            return (
              <Card
                key={log._id}
                onClick={() => setInspectingRecord(log)}
                className="p-4 rounded-2xl border border-border/80 shadow-2xs hover:border-primary/40 hover:shadow-md transition-all space-y-3 cursor-pointer bg-card flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
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
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                        Approved
                      </span>
                    ) : isPending ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                        Pending
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
                      <strong className="text-amber-500 font-mono">+{log.extensionRequestedHours || "1.0"}h</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Allocated</span>
                      <strong className="text-emerald-500 font-mono">
                        {isApproved ? `+${Number(log.extensionAllocatedHours || 1.0).toFixed(1)}h` : "--"}
                      </strong>
                    </div>
                  </div>

                  {log.extensionReason && (
                    <div className="text-xs text-foreground/80 italic bg-accent/20 p-2 rounded-lg border border-border/40">
                      "{log.extensionReason}"
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                  {approver ? (
                    <span className="truncate">Approved by {approver.name}</span>
                  ) : (
                    <span>Awaiting Manager</span>
                  )}
                  {canApprove && isPending && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExtensionHoursToAllocate(log.extensionRequestedHours || 2.0);
                        setApprovalModalReq(log);
                      }}
                      className="h-6 px-2 text-[10px] bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
                    +{approvalModalReq.extensionRequestedHours || "1.0"} hrs
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

      {/* ── Slide-over Shift Audit & Details Drawer ── */}
      {inspectingRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setInspectingRecord(null)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] flex flex-col text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center text-sm border border-primary/20">
                  <i className="fa-solid fa-file-lines" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Shift Extension Audit Record</h3>
                  <p className="text-[11px] text-muted-foreground">Record ID: {inspectingRecord._id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRecord(null)}
                className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs cursor-pointer min-h-[36px]"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto overscroll-contain flex-1 text-xs">
              <div className="p-3.5 rounded-xl bg-accent/30 border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Employee:</span>
                  <strong className="text-foreground">
                    {typeof inspectingRecord.userId === "object"
                      ? inspectingRecord.userId?.name
                      : "Team Member"}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Shift Date:</span>
                  <span>{new Date(inspectingRecord.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-bold">
                    {inspectingRecord.extensionApproved
                      ? "Approved & Granted"
                      : inspectingRecord.extensionRequested
                      ? "Pending Manager Action"
                      : "Standard"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-accent/30 border border-border/70 space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Hours Worked:</span>
                  <span>{((inspectingRecord.regularHours || 0) + (inspectingRecord.overtimeHours || 0)).toFixed(1)} hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Requested Extra:</span>
                  <span className="text-amber-500">+{inspectingRecord.extensionRequestedHours || "1.0"} hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-sans">Allocated Extra:</span>
                  <span className="text-emerald-500">
                    {inspectingRecord.extensionApproved
                      ? `+${Number(inspectingRecord.extensionAllocatedHours || 1.0).toFixed(1)} hrs`
                      : "Pending"}
                  </span>
                </div>
              </div>

              {inspectingRecord.extensionReason && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <span className="text-amber-500 font-bold block text-[11px]">Submitted Justification:</span>
                  <p className="italic text-foreground">"{inspectingRecord.extensionReason}"</p>
                </div>
              )}

              {inspectingRecord.extensionApprovedBy && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
                  <span className="text-emerald-500 font-bold block text-[11px]">Manager Authorization:</span>
                  <div className="text-foreground">
                    Approved by{" "}
                    <strong>
                      {typeof inspectingRecord.extensionApprovedBy === "object"
                        ? inspectingRecord.extensionApprovedBy?.name
                        : "Manager"}
                    </strong>
                    {inspectingRecord.extensionApprovedAt && (
                      <span className="text-muted-foreground block text-[10px] mt-0.5">
                        Timestamp: {new Date(inspectingRecord.extensionApprovedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border/70 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingRecord(null)}
                className="min-h-[38px] text-xs cursor-pointer"
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
