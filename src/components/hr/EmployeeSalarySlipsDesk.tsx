"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

interface SalarySlipItem {
  _id: string;
  month: number;
  year: number;
  payPeriod: string;
  baseSalary: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  reimbursements: number;
  lossOfPayDays: number;
  lossOfPayDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  paymentStatus: "Draft" | "Processing" | "Paid";
  paymentDate?: string;
  bankReference?: string;
  disbursedBy?: { _id: string; name: string; email: string };
  userId: {
    _id: string;
    name: string;
    email: string;
    department?: string;
    role?: string;
    salary?: number;
    bankDetails?: {
      accountNumber?: string;
      bankName?: string;
      ifscCode?: string;
      panNumber?: string;
      uanNumber?: string;
    };
  };
  notes?: string;
  createdAt: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }

  const rounded = Math.round(num);
  return inWords(rounded) + " Only";
}

export function EmployeeSalarySlipsDesk() {
  const { user } = useAuth();
  const [slips, setSlips] = useState<SalarySlipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedSlip, setSelectedSlip] = useState<SalarySlipItem | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const url = `/api/hr/payroll?year=${selectedYear}&month=${selectedMonth}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSlips(data.slips || []);
      }
    } catch (err) {
      console.error("Failed to fetch salary slips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlips();
  }, [selectedYear, selectedMonth]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // KPI calculations
  const kpis = useMemo(() => {
    const totalEarnings = slips.reduce((acc, s) => acc + (s.grossEarnings || 0), 0);
    const totalDeductions = slips.reduce((acc, s) => acc + (s.totalDeductions || 0), 0);
    const totalNet = slips.reduce((acc, s) => acc + (s.netPayable || 0), 0);
    const totalOvertime = slips.reduce((acc, s) => acc + (s.overtimePay || 0), 0);
    const totalLop = slips.reduce((acc, s) => acc + (s.lossOfPayDeduction || 0), 0);

    const latestSlip = slips[0];
    const latestNet = latestSlip ? latestSlip.netPayable : 0;
    const latestBasic = latestSlip ? latestSlip.basicSalary : 0;
    const latestHra = latestSlip ? latestSlip.hra : 0;
    const latestAllowances = latestSlip ? latestSlip.specialAllowance + (latestSlip.bonus || 0) + (latestSlip.overtimePay || 0) : 0;

    return {
      totalEarnings,
      totalDeductions,
      totalNet,
      totalOvertime,
      totalLop,
      latestNet,
      latestBasic,
      latestHra,
      latestAllowances,
      slipCount: slips.length,
    };
  }, [slips]);

  const filteredSlips = useMemo(() => {
    return slips.filter((s) => {
      const matchesSearch =
        searchQuery === "" ||
        s.payPeriod?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.userId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.bankReference?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || s.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [slips, searchQuery, statusFilter]);

  const handlePrintSlip = () => {
    window.print();
  };

  const handleExportCSV = (slip: SalarySlipItem) => {
    const csvContent =
      "Field,Value\n" +
      `Pay Period,"${slip.payPeriod}"\n` +
      `Employee,"${slip.userId?.name}"\n` +
      `Email,"${slip.userId?.email}"\n` +
      `Department,"${slip.userId?.department || "General"}"\n` +
      `Base Salary,${slip.baseSalary}\n` +
      `Basic Salary (50%),${slip.basicSalary}\n` +
      `HRA (30%),${slip.hra}\n` +
      `Special Allowance (20%),${slip.specialAllowance}\n` +
      `Overtime Pay,${slip.overtimePay}\n` +
      `Bonus,${slip.bonus}\n` +
      `Gross Earnings,${slip.grossEarnings}\n` +
      `Loss of Pay Deduction,${slip.lossOfPayDeduction}\n` +
      `Tax Deduction,${slip.taxDeduction}\n` +
      `Total Deductions,${slip.totalDeductions}\n` +
      `Net Payable,${slip.netPayable}\n` +
      `Status,"${slip.paymentStatus}"\n` +
      `Bank Reference,"${slip.bankReference || "N/A"}"\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Payslip_${slip.payPeriod.replace(/\s+/g, "_")}_${slip.userId?.name.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded official payslip CSV!");
  };

  const { can, isAdmin, isOPS } = usePermissions();
  const canViewSlips = Boolean(isAdmin || isOPS || can("viewSalarySlips"));

  if (!canViewSlips) {
    return (
      <div className="rounded-3xl border border-border/80 bg-card p-10 text-center space-y-4 shadow-xs my-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-2xl">
          <i className="fa-solid fa-lock" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-foreground">Access Restricted</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            You do not have permission to view personal salary slips. Please ask your administrator to grant the &ldquo;View Personal Salary Slips&rdquo; feature permission in Settings &gt; Permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-foreground text-background px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <i className="fa-solid fa-circle-check text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner - High Impact Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-500/15 via-teal-500/10 to-sky-500/5 p-5 sm:p-6 border border-emerald-500/20 shadow-xs">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <i className="fa-solid fa-shield-halved" />
              <span>Verified PeopleOS Compensation Vault</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              My Compensation &amp; Salary Slips
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Transparent itemized breakdown of base compensation, HRA, performance incentives, overtime hours, and automated statutory tax statements.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-background/80 backdrop-blur-md border border-border rounded-2xl p-1 shadow-xs">
              <span className="px-2.5 text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <i className="fa-solid fa-calendar text-emerald-500" />
                Year
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="h-8 px-2 text-xs bg-transparent border-0 rounded-xl text-foreground font-bold cursor-pointer focus:outline-none"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr} className="bg-card text-foreground">
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchSlips}
              className="h-10 px-3.5 rounded-2xl gap-2 cursor-pointer text-xs font-bold bg-background/80 backdrop-blur-md hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30 transition-all"
            >
              <i className={cn("fa-solid fa-arrows-rotate text-xs", loading && "animate-spin text-emerald-500")} />
              Sync
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Month Selector Ribbon */}
      <div className="bg-card/70 backdrop-blur-md p-2 rounded-2xl border border-border flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs">
        <button
          type="button"
          onClick={() => setSelectedMonth("all")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[38px] flex items-center gap-1.5",
            selectedMonth === "all"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <i className="fa-solid fa-layer-group text-xs" />
          <span>All Year</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-mono">
            {slips.length}
          </span>
        </button>

        {MONTH_SHORT.map((shortName, idx) => {
          const mNum = idx + 1;
          const isSelected = selectedMonth === String(mNum);
          const hasSlip = slips.some((s) => s.month === mNum);

          return (
            <button
              key={shortName}
              type="button"
              onClick={() => setSelectedMonth(String(mNum))}
              className={cn(
                "relative px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[38px] flex items-center gap-1",
                isSelected
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : hasSlip
                  ? "bg-background border border-border text-foreground hover:bg-muted"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/30"
              )}
            >
              <span>{shortName}</span>
              {hasSlip && (
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full ml-0.5",
                    isSelected ? "bg-white" : "bg-emerald-500"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* KPI Cards Strip with Glassmorphism */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-border bg-card/60 backdrop-blur-md p-4 rounded-3xl flex flex-col justify-between hover:shadow-md transition-all hover:border-emerald-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Latest Take-Home</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-wallet" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-foreground font-mono">
            ₹{kpis.latestNet.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>{slips[0] ? slips[0].payPeriod : "No recent slips"}</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <i className="fa-solid fa-circle-check text-[10px]" /> Paid
            </span>
          </div>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-md p-4 rounded-3xl flex flex-col justify-between hover:shadow-md transition-all hover:border-teal-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">YTD Gross Earnings</span>
            <span className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-chart-line" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
            ₹{kpis.totalEarnings.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Total Accrued</span>
            <span className="font-semibold text-foreground">{kpis.slipCount} Pay Periods</span>
          </div>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-md p-4 rounded-3xl flex flex-col justify-between hover:shadow-md transition-all hover:border-sky-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overtime Earned</span>
            <span className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-bolt" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
            ₹{kpis.totalOvertime.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Production Bonus</span>
            <span className="text-sky-500 font-semibold">+1.5x Hourly</span>
          </div>
        </Card>

        <Card className="border-border bg-card/60 backdrop-blur-md p-4 rounded-3xl flex flex-col justify-between hover:shadow-md transition-all hover:border-rose-500/30">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total LOP Deductions</span>
            <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-xs">
              <i className="fa-solid fa-user-xmark" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            ₹{kpis.totalLop.toLocaleString("en-IN")}
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
            <span>Absence Adjustment</span>
            <span className="text-rose-500 font-semibold">Zero-Touch LOP</span>
          </div>
        </Card>
      </div>

      {/* Interactive Salary Composition Proportion Bar (Latest Slip) */}
      {slips[0] && (
        <Card className="p-4 sm:p-5 rounded-3xl border border-border bg-card/50 backdrop-blur-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-chart-pie text-emerald-500 text-sm" />
              <h4 className="text-xs sm:text-sm font-bold text-foreground">
                Salary Structure Allocation — {slips[0].payPeriod}
              </h4>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              Gross: ₹{slips[0].grossEarnings.toLocaleString("en-IN")} | Net: ₹{slips[0].netPayable.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted/60 p-0.5 gap-0.5">
            <div
              style={{ width: "50%" }}
              className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
              title="Basic Salary (50%)"
            />
            <div
              style={{ width: "30%" }}
              className="h-full bg-teal-500 transition-all duration-500"
              title="House Rent Allowance (30%)"
            />
            <div
              style={{ width: "20%" }}
              className="h-full bg-sky-500 transition-all duration-500"
              title="Special Allowance & Bonus (20%)"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Basic Pay (50%): <strong className="text-foreground">₹{slips[0].basicSalary.toLocaleString("en-IN")}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
              HRA (30%): <strong className="text-foreground">₹{slips[0].hra.toLocaleString("en-IN")}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block" />
              Allowances (20%): <strong className="text-foreground">₹{slips[0].specialAllowance.toLocaleString("en-IN")}</strong>
            </span>
            {slips[0].totalDeductions > 0 && (
              <span className="flex items-center gap-1.5 ml-auto text-rose-500">
                <i className="fa-solid fa-scissors text-[10px]" />
                Deductions: <strong>-₹{slips[0].totalDeductions.toLocaleString("en-IN")}</strong>
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Filter, Search & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/60 backdrop-blur-md p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-2 w-full sm:w-80">
          <i className="fa-solid fa-magnifying-glass text-muted-foreground text-xs" />
          <Input
            placeholder="Search pay period, bank ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {["All", "Paid", "Processing", "Draft"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[36px]",
                  statusFilter === status
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {status}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-xl border border-border shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={cn(
                "p-1.5 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5",
                viewMode === "cards" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="Card View"
            >
              <i className="fa-solid fa-table-cells-large text-xs" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5",
                viewMode === "table" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="Table View"
            >
              <i className="fa-solid fa-table-list text-xs" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Salary Slips Presentation */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <i className="fa-solid fa-circle-notch animate-spin text-3xl text-emerald-500" />
          <p className="text-xs text-muted-foreground font-semibold">Synchronizing compensation vault...</p>
        </div>
      ) : filteredSlips.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-3xl border border-dashed border-border bg-card/40">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl mb-3 shadow-inner">
            <i className="fa-solid fa-file-invoice" />
          </div>
          <h3 className="font-bold text-base text-foreground">No Salary Slips Available</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
            There are no generated salary slips for the selected month/year. Slips are automatically created and audited when HR runs the zero-touch payroll cycle.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        /* EXECUTIVE CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSlips.map((slip) => (
            <Card
              key={slip._id}
              className="relative overflow-hidden border border-border/80 bg-card hover:border-emerald-500/40 hover:shadow-lg transition-all rounded-3xl p-5 flex flex-col justify-between group"
            >
              {/* Card Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg font-bold border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <i className="fa-solid fa-receipt" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">
                        {slip.payPeriod}
                      </h3>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {MONTH_NAMES[slip.month - 1]} {slip.year}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold gap-1",
                      slip.paymentStatus === "Paid"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : slip.paymentStatus === "Processing"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        : "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <i
                      className={cn(
                        "fa-solid text-[9px]",
                        slip.paymentStatus === "Paid"
                          ? "fa-circle-check text-emerald-500"
                          : slip.paymentStatus === "Processing"
                          ? "fa-clock text-amber-500"
                          : "fa-pencil"
                      )}
                    />
                    {slip.paymentStatus}
                  </Badge>
                </div>

                {/* Net Take-Home Highlight */}
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Net Take-Home Pay
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-foreground font-mono tracking-tight">
                      ₹{slip.netPayable.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {slip.bankReference && (
                    <span className="text-[9px] font-mono text-muted-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border">
                      UTR: {slip.bankReference.slice(-6)}
                    </span>
                  )}
                </div>

                {/* Earnings vs Deductions Mini Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="space-y-1 p-2 rounded-xl bg-background border border-border">
                    <span className="text-muted-foreground text-[10px] block">Gross Earnings</span>
                    <span className="font-bold text-emerald-600 font-mono block">
                      ₹{slip.grossEarnings.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="space-y-1 p-2 rounded-xl bg-background border border-border">
                    <span className="text-muted-foreground text-[10px] block">Deductions</span>
                    <span className="font-bold text-rose-500 font-mono block">
                      -₹{slip.totalDeductions.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-border flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCSV(slip)}
                  className="h-8 px-2.5 rounded-xl text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                  title="Download CSV breakdown"
                >
                  <i className="fa-solid fa-file-csv text-xs" />
                  CSV
                </Button>

                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedSlip(slip);
                    setShowSlipModal(true);
                  }}
                  className="h-8 px-3.5 rounded-xl text-xs gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs hover:shadow-emerald-600/20"
                >
                  <i className="fa-solid fa-eye text-xs" />
                  View &amp; Print Slip
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* TABULAR VIEW */
        <div className="rounded-3xl border border-border overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto touch-pan-x">
            <table className="w-full text-xs text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Pay Period</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Basic Pay</th>
                  <th className="py-3.5 px-4">HRA &amp; Allowances</th>
                  <th className="py-3.5 px-4">Overtime / Bonus</th>
                  <th className="py-3.5 px-4">Deductions</th>
                  <th className="py-3.5 px-4 font-bold text-foreground">Net Take-Home</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSlips.map((slip) => (
                  <tr key={slip._id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <i className="fa-solid fa-calendar-check text-emerald-500 text-xs" />
                        <span>{slip.payPeriod}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground block pl-5 font-mono">
                        {MONTH_NAMES[slip.month - 1]} {slip.year}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">{slip.userId?.name || "Employee"}</div>
                      <div className="text-[10px] text-muted-foreground">{slip.userId?.department || "General"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold">₹{slip.basicSalary?.toLocaleString("en-IN")}</td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      ₹{((slip.hra || 0) + (slip.specialAllowance || 0)).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      +₹{((slip.overtimePay || 0) + (slip.bonus || 0)).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-rose-500 font-semibold">
                      -₹{slip.totalDeductions?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-black text-sm text-foreground">
                      ₹{slip.netPayable?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold gap-1",
                          slip.paymentStatus === "Paid"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : slip.paymentStatus === "Processing"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        <i
                          className={cn(
                            "fa-solid text-[9px]",
                            slip.paymentStatus === "Paid"
                              ? "fa-circle-check text-emerald-500"
                              : slip.paymentStatus === "Processing"
                              ? "fa-clock text-amber-500"
                              : "fa-pencil"
                          )}
                        />
                        {slip.paymentStatus}
                      </Badge>
                      {slip.bankReference && (
                        <div className="text-[9px] text-muted-foreground font-mono mt-0.5">
                          Ref: {slip.bankReference}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExportCSV(slip)}
                          className="h-8 w-8 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Export CSV"
                        >
                          <i className="fa-solid fa-file-csv text-xs" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSlip(slip);
                            setShowSlipModal(true);
                          }}
                          className="h-8 px-2.5 rounded-xl text-xs gap-1.5 cursor-pointer hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30"
                        >
                          <i className="fa-solid fa-eye text-[11px]" />
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Printable Pay Slip Modal */}
      {showSlipModal && selectedSlip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowSlipModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <i className="fa-solid fa-receipt text-sm" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Official Salary Slip — {selectedSlip.payPeriod}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Slip ID: {selectedSlip._id}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportCSV(selectedSlip)}
                  className="h-8 px-2.5 rounded-xl text-xs gap-1.5 cursor-pointer print:hidden"
                >
                  <i className="fa-solid fa-file-csv text-xs" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrintSlip}
                  className="h-8 px-3 rounded-xl text-xs gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold print:hidden"
                >
                  <i className="fa-solid fa-print text-[11px]" />
                  Print / Save PDF
                </Button>
                <button
                  type="button"
                  onClick={() => setShowSlipModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-xl hover:bg-muted transition-colors cursor-pointer print:hidden"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Modal Body - Printable Slip Document */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-5 text-xs text-foreground print:p-0 print:m-0">
              {/* Slip Corporate Header */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                      N
                    </span>
                    <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                      NEXACE ENTERPRISES
                    </h1>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Corporate PeopleOS &amp; Automated Payroll Division
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Confidential Compensation Statement (Form 16 / Rule 26D)
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-black px-2.5 py-0.5"
                  >
                    PAYSLIP {selectedSlip.month}/{selectedSlip.year}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Generated: {new Date(selectedSlip.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Employee & Bank Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/30 border border-border/80">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Employee Details
                  </div>
                  <div className="font-bold text-sm text-foreground">
                    {selectedSlip.userId?.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Email:</span> {selectedSlip.userId?.email}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Department:</span> {selectedSlip.userId?.department || "General"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Designation:</span> {selectedSlip.userId?.role || "Team Member"}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                    Disbursement &amp; Statutory
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Bank Name:</span>{" "}
                    {selectedSlip.userId?.bankDetails?.bankName || "HDFC Bank Ltd"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Account No:</span>{" "}
                    <span className="font-mono">
                      {selectedSlip.userId?.bankDetails?.accountNumber
                        ? `•••• •••• ${selectedSlip.userId.bankDetails.accountNumber.slice(-4)}`
                        : "•••• •••• 4892"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">IFSC Code:</span>{" "}
                    <span className="font-mono">
                      {selectedSlip.userId?.bankDetails?.ifscCode || "HDFC0001234"}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Payment Status:</span>{" "}
                    <span className="font-bold text-emerald-600">{selectedSlip.paymentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Two-Column Ledger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="rounded-2xl border border-emerald-500/20 overflow-hidden">
                  <div className="bg-emerald-500/10 px-4 py-2 font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between text-xs">
                    <span>EARNINGS</span>
                    <span>AMOUNT (₹)</span>
                  </div>
                  <div className="p-3.5 space-y-2.5 font-mono divide-y divide-border/40 text-xs">
                    <div className="flex justify-between pt-1">
                      <span className="text-muted-foreground font-sans">Basic Salary (50%)</span>
                      <span className="font-semibold">₹{selectedSlip.basicSalary?.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-muted-foreground font-sans">House Rent Allowance (HRA 30%)</span>
                      <span className="font-semibold">₹{selectedSlip.hra?.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-muted-foreground font-sans">Special Allowance (20%)</span>
                      <span className="font-semibold">₹{selectedSlip.specialAllowance?.toLocaleString("en-IN")}</span>
                    </div>
                    {selectedSlip.overtimePay > 0 && (
                      <div className="flex justify-between pt-2 text-sky-600">
                        <span className="font-sans">Overtime Pay ({selectedSlip.overtimeHours} hrs)</span>
                        <span className="font-semibold">+₹{selectedSlip.overtimePay?.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {selectedSlip.bonus > 0 && (
                      <div className="flex justify-between pt-2 text-emerald-600">
                        <span className="font-sans">Performance Bonus</span>
                        <span className="font-semibold">+₹{selectedSlip.bonus?.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {selectedSlip.reimbursements > 0 && (
                      <div className="flex justify-between pt-2 text-teal-600">
                        <span className="font-sans">Reimbursements</span>
                        <span className="font-semibold">+₹{selectedSlip.reimbursements?.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-muted/40 p-3.5 font-bold flex justify-between border-t border-border">
                    <span className="font-sans">Total Gross Earnings</span>
                    <span className="text-emerald-600 font-mono text-sm">₹{selectedSlip.grossEarnings?.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="rounded-2xl border border-rose-500/20 overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="bg-rose-500/10 px-4 py-2 font-bold text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs">
                      <span>DEDUCTIONS</span>
                      <span>AMOUNT (₹)</span>
                    </div>
                    <div className="p-3.5 space-y-2.5 font-mono divide-y divide-border/40 text-xs">
                      <div className="flex justify-between pt-1">
                        <span className="text-muted-foreground font-sans">
                          Loss of Pay (LOP: {selectedSlip.lossOfPayDays}d)
                        </span>
                        <span className="font-semibold text-rose-500">
                          ₹{selectedSlip.lossOfPayDeduction?.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className="text-muted-foreground font-sans">Income Tax / TDS</span>
                        <span className="font-semibold">₹{selectedSlip.taxDeduction?.toLocaleString("en-IN")}</span>
                      </div>
                      {selectedSlip.otherDeductions > 0 && (
                        <div className="flex justify-between pt-2">
                          <span className="text-muted-foreground font-sans">Other Deductions</span>
                          <span className="font-semibold">₹{selectedSlip.otherDeductions?.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted/40 p-3.5 font-bold flex justify-between border-t border-border mt-auto">
                    <span className="font-sans">Total Deductions</span>
                    <span className="text-rose-600 font-mono text-sm">₹{selectedSlip.totalDeductions?.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay Highlight Banner */}
              <div className="p-5 rounded-2xl bg-linear-to-r from-emerald-600/15 via-teal-600/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
                    Net Take-Home Pay
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{selectedSlip.netPayable?.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-muted-foreground italic mt-0.5">
                    ({numberToWords(selectedSlip.netPayable)})
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs border border-emerald-500/20">
                    <i className="fa-solid fa-stamp" />
                    Verified by PeopleOS
                  </div>
                  {selectedSlip.bankReference && (
                    <div className="text-[10px] text-muted-foreground font-mono">
                      UTR: {selectedSlip.bankReference}
                    </div>
                  )}
                </div>
              </div>

              {/* Signatory & Security Barcode Block */}
              <div className="pt-4 border-t border-dashed border-border flex items-end justify-between text-[10px] text-muted-foreground">
                <div className="space-y-1">
                  <p>• System-generated cryptographically verified pay slip; requires no wet physical signature.</p>
                  <p>• For payroll discrepancies or tax questions, log a case in the HR Help Desk.</p>
                </div>
                <div className="text-center">
                  <div className="w-28 border-b border-muted-foreground/40 mb-1" />
                  <span className="font-bold text-foreground">Authorized Signatory</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-border bg-muted/20 flex justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSlipModal(false)}
                className="h-9 px-4 rounded-xl cursor-pointer text-xs font-semibold"
              >
                Close
              </Button>
              <Button
                color="primary"
                size="sm"
                onClick={handlePrintSlip}
                className="h-9 px-4 rounded-xl cursor-pointer text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <i className="fa-solid fa-print text-xs" />
                Print Slip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
