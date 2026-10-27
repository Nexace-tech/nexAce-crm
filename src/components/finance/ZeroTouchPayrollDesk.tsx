"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ZeroTouchPayrollDeskProps {
  currentUserId?: string;
  currentUserRole?: string;
  canManagePayroll: boolean;
  onToast: (msg: string, type?: "success" | "error") => void;
}

interface SalarySlipData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    photoUrl?: string;
    department?: string;
    role?: string;
    salary?: number;
    bankDetails?: {
      bankName?: string;
      accountNo?: string;
      ifscCode?: string;
      upiId?: string;
    };
  };
  month: number;
  year: number;
  payPeriod: string;
  employmentType: string;
  designation?: string;
  department?: string;
  joiningDate?: string;

  totalDays: number;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;

  baseSalary: number;
  basicPay: number;
  hra: number;
  specialAllowance: number;
  overtimePay: number;
  bonus: number;
  reimbursements: number;
  grossEarnings: number;

  lossOfPayDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  totalDeductions: number;

  netPayable: number;

  paymentStatus: "Draft" | "Processing" | "Paid";
  disbursedAt?: string;
  disbursedBy?: { name: string; email: string };
  transactionReference?: string;
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifscCode?: string;
    upiId?: string;
  };
  notes?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function ZeroTouchPayrollDesk({
  currentUserId,
  currentUserRole,
  canManagePayroll,
  onToast,
}: ZeroTouchPayrollDeskProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Period Selector State (defaults to current month/year)
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const [slips, setSlips] = useState<SalarySlipData[]>([]);
  const [kpis, setKpis] = useState({
    totalGross: 0,
    totalNet: 0,
    totalLopDeductions: 0,
    totalOvertimePaid: 0,
    headcount: 0,
    paidCount: 0,
    processingCount: 0,
    draftCount: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<"All" | "Draft" | "Processing" | "Paid">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Interactive Modals
  const [viewSlipModal, setViewSlipModal] = useState<SalarySlipData | null>(null);
  const [editSlipModal, setEditSlipModal] = useState<SalarySlipData | null>(null);
  const [editBonus, setEditBonus] = useState(0);
  const [editReimb, setEditReimb] = useState(0);
  const [editOtherDeduct, setEditOtherDeduct] = useState(0);
  const [editNotes, setEditNotes] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Disbursement Modal
  const [disburseModalSlip, setDisburseModalSlip] = useState<SalarySlipData | null>(null);
  const [txRef, setTxRef] = useState("");
  const [submittingDisburse, setSubmittingDisburse] = useState(false);

  // Fetch Slips & Metrics
  const fetchPayroll = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/hr/payroll?month=${selectedMonth}&year=${selectedYear}`);
      if (res.ok) {
        const data = await res.json();
        setSlips(data.slips || []);
        if (data.kpis) setKpis(data.kpis);
      } else {
        onToast("Failed to fetch payroll data", "error");
      }
    } catch (err) {
      console.error("Fetch payroll error:", err);
      onToast("Network error fetching payroll", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear, onToast]);

  useEffect(() => {
    fetchPayroll();
  }, [fetchPayroll]);

  // Generate / Compute Zero-Touch Payroll
  const handleGeneratePayroll = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate payroll");

      onToast(data.message || "Payroll generated successfully!", "success");
      await fetchPayroll();
    } catch (err: any) {
      onToast(err.message || "Failed to compute zero-touch payroll", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Disburse / Mark as Paid
  const handleConfirmDisburse = async () => {
    if (!disburseModalSlip) return;
    setSubmittingDisburse(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_paid",
          slipIds: [disburseModalSlip._id],
          transactionReference: txRef.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to disburse salary");

      onToast("Salary marked as Paid and notification sent!", "success");
      setDisburseModalSlip(null);
      setTxRef("");
      await fetchPayroll();
    } catch (err: any) {
      onToast(err.message || "Failed to update disbursement status", "error");
    } finally {
      setSubmittingDisburse(false);
    }
  };

  // Save Slip Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSlipModal) return;
    setSubmittingEdit(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_slip",
          slipId: editSlipModal._id,
          bonus: editBonus,
          reimbursements: editReimb,
          otherDeductions: editOtherDeduct,
          notes: editNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update slip");

      onToast("Salary slip adjusted successfully!", "success");
      setEditSlipModal(null);
      await fetchPayroll();
    } catch (err: any) {
      onToast(err.message || "Failed to save adjustment", "error");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Filtered Slips List
  const filteredSlips = useMemo(() => {
    return slips.filter((s) => {
      if (statusFilter !== "All" && s.paymentStatus !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const empName = typeof s.userId === "object" ? s.userId?.name?.toLowerCase() || "" : "";
        const dept = s.department?.toLowerCase() || "";
        if (!empName.includes(q) && !dept.includes(q)) return false;
      }
      return true;
    });
  }, [slips, statusFilter, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredSlips.length === 0) {
      onToast("No salary records to export", "error");
      return;
    }

    const headers = [
      "Employee Name",
      "Email",
      "Department",
      "Pay Period",
      "Working Days",
      "Present Days",
      "Paid Leaves",
      "LOP Days",
      "Overtime Hours",
      "Base Salary",
      "Gross Earnings",
      "LOP Deduction",
      "Tax Deduction",
      "Net Payable",
      "Status",
      "Disbursed Date",
      "Transaction Ref",
    ];

    const rows = filteredSlips.map((s) => {
      const emp = typeof s.userId === "object" ? s.userId : null;
      return [
        `"${emp?.name || "Unknown"}"`,
        `"${emp?.email || "—"}"`,
        `"${s.department || "General"}"`,
        `"${s.payPeriod}"`,
        s.workingDays,
        s.presentDays,
        s.paidLeaveDays,
        s.unpaidLeaveDays,
        s.overtimeHours,
        s.baseSalary,
        s.grossEarnings,
        s.lossOfPayDeduction,
        s.taxDeduction,
        s.netPayable,
        s.paymentStatus,
        s.disbursedAt ? new Date(s.disbursedAt).toLocaleDateString("en-IN") : "—",
        `"${s.transactionReference || "—"}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `payroll_export_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast("Payroll report exported successfully!", "success");
  };

  return (
    <div className="space-y-6">
      {/* ─── Header & Period Selector ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <i className="fa-solid fa-money-check-dollar text-sm" />
            </span>
            Zero-Touch Automated Payroll
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 ml-11">
            Auto-aggregate attendance punches, compute Loss of Pay (LOP) deductions, process overtime, and disburse
            audit-compliant pay slips.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            aria-label="Select pay month"
            className="min-h-[38px] px-3 text-xs font-semibold rounded-lg border border-border bg-background text-foreground cursor-pointer focus:ring-1 focus:ring-primary"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            aria-label="Select pay year"
            className="min-h-[38px] px-3 text-xs font-semibold rounded-lg border border-border bg-background text-foreground cursor-pointer focus:ring-1 focus:ring-primary"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          {/* Compute Batch Button (Manager/Admin) */}
          {canManagePayroll && (
            <Button
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="min-h-[38px] px-3.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-2 cursor-pointer shadow-xs"
            >
              <i className={cn("fa-solid fa-calculator text-xs", generating && "animate-spin")} />
              {generating ? "Computing..." : "Run Zero-Touch Batch"}
            </Button>
          )}

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="min-h-[38px] px-3 text-xs rounded-lg border-border hover:bg-muted/60 gap-1.5 cursor-pointer"
          >
            <i className="fa-solid fa-file-csv text-xs text-emerald-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayroll}
            disabled={refreshing}
            className="min-h-[38px] px-2.5 text-xs rounded-lg border-border hover:bg-muted/60 cursor-pointer"
          >
            <i className={cn("fa-solid fa-rotate-right text-xs", refreshing && "animate-spin text-primary")} />
          </Button>
        </div>
      </div>

      {/* ─── Metric KPI Badges ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Gross */}
        <Card className="border border-border bg-card/60 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Gross Payroll</span>
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs">
              <i className="fa-solid fa-sack-dollar" />
            </div>
          </div>
          <p className="text-xl font-black text-foreground mt-1">₹{kpis.totalGross.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{kpis.headcount} Team Members</p>
        </Card>

        {/* Total Net Payout */}
        <Card className="border border-border bg-card/60 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Net Payable</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs">
              <i className="fa-solid fa-wallet" />
            </div>
          </div>
          <p className="text-xl font-black text-foreground mt-1">₹{kpis.totalNet.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {kpis.paidCount} Paid • {kpis.draftCount + kpis.processingCount} Pending
          </p>
        </Card>

        {/* LOP Saved */}
        <Card className="border border-border bg-card/60 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">LOP Deductions</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500 text-xs">
              <i className="fa-solid fa-calendar-xmark" />
            </div>
          </div>
          <p className="text-xl font-black text-foreground mt-1">₹{kpis.totalLopDeductions.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Automated Absenteeism Adjustments</p>
        </Card>

        {/* Overtime Paid */}
        <Card className="border border-border bg-card/60 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Overtime Paid</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 text-xs">
              <i className="fa-solid fa-clock text-xs" />
            </div>
          </div>
          <p className="text-xl font-black text-foreground mt-1">₹{kpis.totalOvertimePaid.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Authorized Extra Shift Compensation</p>
        </Card>
      </div>

      {/* ─── Filter & Search Bar ─── */}
      <Card className="border border-border bg-card/60 overflow-hidden shadow-xs">
        <div className="p-3 sm:p-4 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: "All", label: "All Slips", icon: "fa-list" },
                { id: "Draft", label: "Draft", icon: "fa-pencil" },
                { id: "Processing", label: "Processing", icon: "fa-hourglass-half" },
                { id: "Paid", label: "Paid", icon: "fa-circle-check" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "min-h-[38px] px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer",
                  statusFilter === f.id
                    ? "bg-foreground text-background shadow-xs font-bold"
                    : "bg-background/80 text-muted-foreground hover:bg-muted border border-border/60 hover:text-foreground"
                )}
              >
                <i className={cn("fa-solid text-[10px]", f.icon)} />
                {f.label}
              </button>
            ))}
          </div>

          {/* Search & View Mode */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none" />
              <input
                type="text"
                placeholder="Search employee, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[38px] pl-8 pr-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

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

        {/* ─── Content (Table vs Cards) ─── */}
        {filteredSlips.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mx-auto mb-3 text-muted-foreground">
              <i className="fa-solid fa-money-check text-xl" />
            </div>
            <p className="text-sm font-semibold text-foreground">No Salary Slips for This Period</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Click &quot;Run Zero-Touch Batch&quot; to automatically pull attendance, deduct loss-of-pay, add overtime,
              and compute payroll.
            </p>
            {canManagePayroll && (
              <div className="mt-4">
                <Button
                  onClick={handleGeneratePayroll}
                  disabled={generating}
                  className="min-h-[38px] px-3.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-calculator text-xs" />
                  Compute {MONTH_NAMES[selectedMonth - 1]} {selectedYear} Payroll
                </Button>
              </div>
            )}
          </div>
        ) : viewMode === "table" ? (
          /* ─── Touch-Scrolling Table Container (min-w-[760px]) ─── */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground font-semibold">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Attendance Stats</th>
                  <th className="py-3 px-3">Base Salary</th>
                  <th className="py-3 px-3">Deductions (LOP)</th>
                  <th className="py-3 px-3">Net Payable</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredSlips.map((s) => {
                  const emp = typeof s.userId === "object" ? s.userId : null;
                  const isPaid = s.paymentStatus === "Paid";
                  const isDraft = s.paymentStatus === "Draft";

                  return (
                    <tr key={s._id} className="transition-colors hover:bg-muted/30">
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
                              {s.department || "General"} • {s.designation || "Staff"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Attendance Breakdown */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-[11px] space-y-0.5">
                          <p>
                            <span className="text-muted-foreground">Present:</span>{" "}
                            <span className="font-bold text-emerald-600">{s.presentDays}</span> / {s.workingDays}d
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Leaves: {s.paidLeaveDays}d paid •{" "}
                            <span className="text-rose-500 font-semibold">{s.unpaidLeaveDays}d LOP</span>
                            {s.overtimeHours > 0 && (
                              <span className="text-amber-500 font-semibold ml-1">+{s.overtimeHours}h OT</span>
                            )}
                          </p>
                        </div>
                      </td>

                      {/* Base Salary */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-foreground">
                        ₹{s.baseSalary.toLocaleString()}
                      </td>

                      {/* Deductions */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="text-rose-500 font-semibold">
                          -₹{(s.lossOfPayDeduction + s.taxDeduction + (s.otherDeductions || 0)).toLocaleString()}
                        </span>
                        {s.lossOfPayDeduction > 0 && (
                          <p className="text-[10px] text-muted-foreground">LOP: ₹{s.lossOfPayDeduction.toLocaleString()}</p>
                        )}
                      </td>

                      {/* Net Payable */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-black text-foreground text-sm">₹{s.netPayable.toLocaleString()}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            <i className="fa-solid fa-circle-check text-[9px]" />
                            Paid
                          </span>
                        )}
                        {isDraft && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                            <i className="fa-solid fa-clock text-[9px]" />
                            Draft
                          </span>
                        )}
                        {s.paymentStatus === "Processing" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            <i className="fa-solid fa-spinner animate-spin text-[9px]" />
                            Processing
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManagePayroll && !isPaid && (
                            <Button
                              size="sm"
                              onClick={() => setDisburseModalSlip(s)}
                              className="min-h-[32px] h-8 px-2.5 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                            >
                              <i className="fa-solid fa-check text-[10px]" />
                              Disburse
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewSlipModal(s)}
                            className="min-h-[32px] h-8 px-2.5 text-[11px] font-semibold rounded-lg border-border hover:bg-muted gap-1 cursor-pointer"
                          >
                            <i className="fa-solid fa-receipt text-xs text-primary" />
                            View Slip
                          </Button>

                          {canManagePayroll && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditSlipModal(s);
                                setEditBonus(s.bonus || 0);
                                setEditReimb(s.reimbursements || 0);
                                setEditOtherDeduct(s.otherDeductions || 0);
                                setEditNotes(s.notes || "");
                              }}
                              title="Adjust Allowance / Deductions"
                              className="w-8 h-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <i className="fa-solid fa-sliders text-xs" />
                            </Button>
                          )}
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
            {filteredSlips.map((s) => {
              const emp = typeof s.userId === "object" ? s.userId : null;
              const isPaid = s.paymentStatus === "Paid";

              return (
                <div
                  key={s._id}
                  className="p-4 rounded-xl border border-border/80 bg-background flex flex-col justify-between gap-3 shadow-xs hover:border-primary/40 transition-all"
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
                          <p className="text-[10px] text-muted-foreground">{s.department || "General"}</p>
                        </div>
                      </div>
                      <Badge color={isPaid ? "success" : "warning"}>{s.paymentStatus}</Badge>
                    </div>

                    <div className="mt-3 p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[11px]">Base Salary:</span>
                        <span className="font-semibold text-foreground">₹{s.baseSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[11px]">Attendance:</span>
                        <span className="text-emerald-600 font-semibold">{s.presentDays} / {s.workingDays}d Present</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[11px]">Loss of Pay:</span>
                        <span className="text-rose-500 font-semibold">-₹{s.lossOfPayDeduction.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-border/60">
                        <span className="text-foreground font-bold text-[11px]">Net Payable:</span>
                        <span className="text-foreground font-black text-xs">₹{s.netPayable.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewSlipModal(s)}
                      className="min-h-[36px] h-8 px-2.5 text-xs rounded-lg gap-1 border-border cursor-pointer"
                    >
                      <i className="fa-solid fa-receipt text-xs text-primary" />
                      View Slip
                    </Button>

                    {canManagePayroll && !isPaid && (
                      <Button
                        size="sm"
                        onClick={() => setDisburseModalSlip(s)}
                        className="min-h-[36px] h-8 px-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        Disburse
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: Official Printable Salary Slip
         ═══════════════════════════════════════════════════════════════ */}
      {viewSlipModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <i className="fa-solid fa-file-invoice text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Official Pay Slip</h4>
                  <p className="text-[11px] text-muted-foreground">{viewSlipModal.payPeriod}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="min-h-[36px] h-8 px-2.5 text-xs rounded-lg gap-1 border-border cursor-pointer"
                >
                  <i className="fa-solid fa-print text-xs" /> Print / Save PDF
                </Button>
                <button
                  onClick={() => setViewSlipModal(null)}
                  className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Scrollable Slip Content */}
            <div className="p-5 space-y-5 flex-1 overflow-y-auto overscroll-contain text-xs bg-background">
              {/* Slip Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-4">
                <div>
                  <h2 className="text-lg font-black text-foreground uppercase tracking-wider">NexAce Technologies</h2>
                  <p className="text-[11px] text-muted-foreground">Monthly Salary Disbursement & Tax Computation Slip</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground">Pay Period: {viewSlipModal.payPeriod}</p>
                  <Badge color={viewSlipModal.paymentStatus === "Paid" ? "success" : "warning"}>
                    {viewSlipModal.paymentStatus}
                  </Badge>
                </div>
              </div>

              {/* Employee & Bank Info Grid */}
              <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-muted/30 border border-border/60">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Employee Name:</p>
                  <p className="font-bold text-foreground text-sm">
                    {typeof viewSlipModal.userId === "object" ? viewSlipModal.userId?.name : "Staff Member"}
                  </p>
                  <p className="text-muted-foreground mt-1">Designation & Dept:</p>
                  <p className="font-medium text-foreground">
                    {viewSlipModal.designation || "Staff"} • {viewSlipModal.department || "General"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-muted-foreground">Bank Account:</p>
                  <p className="font-bold text-foreground">
                    {viewSlipModal.bankDetails?.bankName
                      ? `${viewSlipModal.bankDetails.bankName} (A/C: ${viewSlipModal.bankDetails.accountNo || "—"})`
                      : "Direct Deposit"}
                  </p>
                  <p className="text-muted-foreground mt-1">IFSC / UPI:</p>
                  <p className="font-medium text-foreground">
                    {viewSlipModal.bankDetails?.ifscCode || viewSlipModal.bankDetails?.upiId || "Registered on file"}
                  </p>
                </div>
              </div>

              {/* Attendance & Shift Breakdown */}
              <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-xl border border-border/80 bg-card">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Month Days</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{viewSlipModal.totalDays}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Work Days</p>
                  <p className="text-base font-bold text-foreground mt-0.5">{viewSlipModal.workingDays}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Present Days</p>
                  <p className="text-base font-bold text-emerald-600 mt-0.5">{viewSlipModal.presentDays}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">LOP Days</p>
                  <p className="text-base font-bold text-rose-500 mt-0.5">{viewSlipModal.unpaidLeaveDays}</p>
                </div>
              </div>

              {/* Earnings & Deductions Comparison Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-border/80 rounded-xl overflow-hidden">
                  <div className="p-2.5 bg-emerald-500/10 border-b border-border/80 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    Earnings
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Basic Salary (50%):</span>
                      <span className="font-semibold text-foreground">₹{viewSlipModal.basicPay.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">House Rent Allowance (HRA):</span>
                      <span className="font-semibold text-foreground">₹{viewSlipModal.hra.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Special Allowance:</span>
                      <span className="font-semibold text-foreground">
                        ₹{viewSlipModal.specialAllowance.toLocaleString()}
                      </span>
                    </div>
                    {viewSlipModal.overtimePay > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>Overtime Pay ({viewSlipModal.overtimeHours}h):</span>
                        <span className="font-semibold">+₹{viewSlipModal.overtimePay.toLocaleString()}</span>
                      </div>
                    )}
                    {viewSlipModal.bonus > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Performance Bonus:</span>
                        <span className="font-semibold">+₹{viewSlipModal.bonus.toLocaleString()}</span>
                      </div>
                    )}
                    {viewSlipModal.reimbursements > 0 && (
                      <div className="flex justify-between text-primary">
                        <span>Reimbursements:</span>
                        <span className="font-semibold">+₹{viewSlipModal.reimbursements.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border font-bold text-foreground">
                      <span>Gross Earnings:</span>
                      <span>₹{viewSlipModal.grossEarnings.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-border/80 rounded-xl overflow-hidden">
                  <div className="p-2.5 bg-rose-500/10 border-b border-border/80 text-rose-700 dark:text-rose-400 font-bold text-xs">
                    Deductions
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between text-rose-600">
                      <span>Loss of Pay (LOP):</span>
                      <span className="font-semibold">₹{viewSlipModal.lossOfPayDeduction.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TDS / Professional Tax:</span>
                      <span className="font-semibold text-foreground">
                        ₹{viewSlipModal.taxDeduction.toLocaleString()}
                      </span>
                    </div>
                    {viewSlipModal.otherDeductions > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Other Adjustments:</span>
                        <span className="font-semibold text-foreground">
                          ₹{viewSlipModal.otherDeductions.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border font-bold text-rose-600">
                      <span>Total Deductions:</span>
                      <span>₹{viewSlipModal.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Payout Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Net Take-Home Salary</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Direct deposit to designated bank account</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-foreground">₹{viewSlipModal.netPayable.toLocaleString()}</p>
                </div>
              </div>

              {/* Transaction Ref & Disclaimer */}
              {viewSlipModal.transactionReference && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs">
                  <span className="font-semibold text-muted-foreground">Bank Transaction Reference:</span>{" "}
                  <span className="font-mono text-foreground">{viewSlipModal.transactionReference}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/80 flex items-center justify-end shrink-0 bg-muted/20">
              <Button
                size="sm"
                onClick={() => setViewSlipModal(null)}
                className="min-h-[38px] px-4 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close Slip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: Disburse Salary / Mark Paid
         ═══════════════════════════════════════════════════════════════ */}
      {disburseModalSlip && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-emerald-500/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <i className="fa-solid fa-money-bill-transfer text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Disburse Salary</h4>
                  <p className="text-[11px] text-muted-foreground">
                    For {typeof disburseModalSlip.userId === "object" ? disburseModalSlip.userId?.name : "Employee"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDisburseModalSlip(null)}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto text-xs">
              <div className="p-3 rounded-xl bg-muted/40 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Amount:</span>
                  <span className="font-bold text-foreground text-sm">
                    ₹{disburseModalSlip.netPayable.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pay Period:</span>
                  <span className="font-semibold text-foreground">{disburseModalSlip.payPeriod}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Bank Transaction Reference / UTR #
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-20261027-849204"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full min-h-[40px] px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border/80 flex items-center justify-end gap-2 shrink-0 bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDisburseModalSlip(null)}
                disabled={submittingDisburse}
                className="min-h-[38px] px-3 text-xs rounded-lg cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDisburse}
                disabled={submittingDisburse}
                className="min-h-[38px] px-4 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
              >
                <i className={cn("fa-solid fa-check text-xs", submittingDisburse && "animate-spin")} />
                {submittingDisburse ? "Processing..." : "Confirm Disbursement"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: Adjust Bonus / Deductions
         ═══════════════════════════════════════════════════════════════ */}
      {editSlipModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between shrink-0 bg-muted/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <i className="fa-solid fa-sliders text-sm" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Adjust Salary Slip</h4>
                  <p className="text-[11px] text-muted-foreground">Add bonus, reimbursement, or manual deductions</p>
                </div>
              </div>
              <button
                onClick={() => setEditSlipModal(null)}
                className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto text-xs">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Performance Bonus (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={editBonus}
                  onChange={(e) => setEditBonus(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 text-xs rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Reimbursements (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={editReimb}
                  onChange={(e) => setEditReimb(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 text-xs rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Other Deductions (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={editOtherDeduct}
                  onChange={(e) => setEditOtherDeduct(Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 text-xs rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Notes / Justification</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Reason for adjustment..."
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditSlipModal(null)}
                  disabled={submittingEdit}
                  className="min-h-[38px] px-3 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingEdit}
                  className="min-h-[38px] px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground gap-1.5 cursor-pointer"
                >
                  <i className={cn("fa-solid fa-check text-xs", submittingEdit && "animate-spin")} />
                  {submittingEdit ? "Saving..." : "Save Adjustments"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
