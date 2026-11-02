"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  ICompensationPolicy,
  IAllowancePreset,
  IDeductionPreset,
  IOtherCharge,
} from "@/models/CompensationPolicy";

interface CompensationPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPolicyUpdated?: (policy: ICompensationPolicy) => void;
  showToast: (message: string, type?: "success" | "error") => void;
}

type TabType = "lop" | "overtime" | "tax" | "allowances" | "deductions" | "charges" | "simulator";

const INDUSTRY_TEMPLATES = {
  indian_corporate: {
    label: "Indian Corporate Standard",
    badge: "Most Common",
    icon: "fa-solid fa-building-flag",
    divisorMode: "fixed_26",
    customDivisorDays: 26,
    graceAbsenceDays: 0,
    standardMultiplier: 1.5,
    weekendMultiplier: 2.0,
    holidayMultiplier: 2.0,
    monthlyCapHours: 40,
    defaultTaxRate: 0,
    taxMode: "exclusive",
    tdsRate: 10,
    taxLabel: "GST",
    enforcePfWageCap: false,
    enforceEsiCeiling: true,
    allowances: [
      { id: "allowance-hra", name: "House Rent Allowance (HRA)", type: "percentage" as const, value: 40, isDefault: true, targetEmploymentType: "Permanent" as const, description: "Standard 40% of basic pay" },
      { id: "allowance-special", name: "Special Allowance", type: "percentage" as const, value: 15, isDefault: true, targetEmploymentType: "Permanent" as const, description: "Performance & utility allowance" },
      { id: "allowance-conveyance", name: "Conveyance Allowance", type: "fixed" as const, value: 1600, isDefault: false, targetEmploymentType: "All" as const, description: "Fixed local transit reimbursement" },
    ],
    deductions: [
      { id: "deduct-pf", name: "Provident Fund (PF / EPF)", type: "percentage" as const, value: 12, isDefault: true, targetEmploymentType: "Permanent" as const, description: "12% statutory retirement fund" },
      { id: "deduct-pt", name: "Professional Tax (PT)", type: "fixed" as const, value: 200, isDefault: true, targetEmploymentType: "Permanent" as const, description: "Municipal statutory tax" },
      { id: "deduct-esi", name: "Employee State Insurance (ESI)", type: "percentage" as const, value: 0.75, isDefault: false, targetEmploymentType: "Permanent" as const, description: "State medical insurance" },
    ],
  },
  global_contractor: {
    label: "Global Remote Contractor",
    badge: "1099 / B2B",
    icon: "fa-solid fa-earth-americas",
    divisorMode: "calendar_days",
    customDivisorDays: 30,
    graceAbsenceDays: 0,
    standardMultiplier: 1.5,
    weekendMultiplier: 2.0,
    holidayMultiplier: 2.0,
    monthlyCapHours: 0,
    defaultTaxRate: 0,
    taxMode: "tds_withholding",
    tdsRate: 10,
    taxLabel: "TDS / Withholding",
    enforcePfWageCap: false,
    enforceEsiCeiling: false,
    allowances: [],
    deductions: [
      { id: "deduct-tds", name: "TDS / Tax Withholding", type: "percentage" as const, value: 10, isDefault: true, targetEmploymentType: "Contractor" as const, description: "10% tax withheld at source" },
    ],
  },
  flat_stipend: {
    label: "Flat Stipend (Interns / Trainees)",
    badge: "Zero Deductions",
    icon: "fa-solid fa-graduation-cap",
    divisorMode: "calendar_days",
    customDivisorDays: 30,
    graceAbsenceDays: 1,
    standardMultiplier: 1.0,
    weekendMultiplier: 1.0,
    holidayMultiplier: 1.0,
    monthlyCapHours: 0,
    defaultTaxRate: 0,
    taxMode: "exempt",
    tdsRate: 0,
    taxLabel: "None",
    enforcePfWageCap: false,
    enforceEsiCeiling: false,
    allowances: [],
    deductions: [],
  },
};

export function CompensationPolicyModal({
  isOpen,
  onClose,
  onPolicyUpdated,
  showToast,
}: CompensationPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("lop");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Master Policy Toggle
  const [policyEnabled, setPolicyEnabled] = useState<boolean>(true);

  // Form states
  const [divisorMode, setDivisorMode] = useState<string>("calendar_days");
  const [customDivisorDays, setCustomDivisorDays] = useState<number>(30);
  const [graceAbsenceDays, setGraceAbsenceDays] = useState<number>(0);
  const [autoCalculateLop, setAutoCalculateLop] = useState<boolean>(true);

  const [standardMultiplier, setStandardMultiplier] = useState<number>(1.5);
  const [weekendMultiplier, setWeekendMultiplier] = useState<number>(2.0);
  const [holidayMultiplier, setHolidayMultiplier] = useState<number>(2.0);
  const [monthlyCapHours, setMonthlyCapHours] = useState<number>(40);
  const [allowEmployeeOtClaim, setAllowEmployeeOtClaim] = useState<boolean>(true);

  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(0);
  const [taxMode, setTaxMode] = useState<string>("exclusive");
  const [tdsRate, setTdsRate] = useState<number>(10);
  const [taxLabel, setTaxLabel] = useState<string>("GST");
  const [enforcePfWageCap, setEnforcePfWageCap] = useState<boolean>(false);
  const [enforceEsiCeiling, setEnforceEsiCeiling] = useState<boolean>(true);

  const [allowancePresets, setAllowancePresets] = useState<IAllowancePreset[]>([]);
  const [deductionPresets, setDeductionPresets] = useState<IDeductionPreset[]>([]);
  const [otherCharges, setOtherCharges] = useState<IOtherCharge[]>([]);
  const [currency, setCurrency] = useState<string>("INR");
  const [notes, setNotes] = useState<string>("");

  // Live Simulator States
  const [simBaseSalary, setSimBaseSalary] = useState<number>(20000);
  const [simLopDays, setSimLopDays] = useState<number>(0);
  const [simOtHours, setSimOtHours] = useState<number>(0);
  const [simEmpType, setSimEmpType] = useState<"Permanent" | "Contractor" | "Intern">("Permanent");

  useEffect(() => {
    if (!isOpen) return;
    fetchPolicy();
  }, [isOpen]);

  const fetchPolicy = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/compensation-policy");
      if (res.ok) {
        const data = await res.json();
        const p: ICompensationPolicy = data.policy;
        if (p) {
          setPolicyEnabled(p.enabled !== false);
          setDivisorMode(p.lopFormula?.divisorMode || "calendar_days");
          setCustomDivisorDays(p.lopFormula?.customDivisorDays || 30);
          setGraceAbsenceDays(p.lopFormula?.graceAbsenceDays || 0);
          setAutoCalculateLop(p.lopFormula?.autoCalculateLop ?? true);

          setStandardMultiplier(p.overtimeRules?.standardMultiplier ?? 1.5);
          setWeekendMultiplier(p.overtimeRules?.weekendMultiplier ?? 2.0);
          setHolidayMultiplier(p.overtimeRules?.holidayMultiplier ?? 2.0);
          setMonthlyCapHours(p.overtimeRules?.monthlyCapHours ?? 40);
          setAllowEmployeeOtClaim(p.overtimeRules?.allowEmployeeOtClaim ?? true);

          setDefaultTaxRate(p.taxRules?.defaultTaxRate ?? 0);
          setTaxMode(p.taxRules?.taxMode || "exclusive");
          setTdsRate(p.taxRules?.tdsRate ?? 10);
          setTaxLabel(p.taxRules?.taxLabel || "GST");
          setEnforcePfWageCap(Boolean((p.taxRules as any)?.enforcePfWageCap));
          setEnforceEsiCeiling((p.taxRules as any)?.enforceEsiCeiling ?? true);

          setAllowancePresets(p.allowancePresets || []);
          setDeductionPresets(p.deductionPresets || []);
          setOtherCharges(p.otherCharges || []);
          setCurrency(p.currency || "INR");
          setNotes(p.notes || "");
        }
      }
    } catch (err) {
      console.error("Failed to load compensation policy:", err);
      showToast("Failed to load policy settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyIndustryTemplate = (key: keyof typeof INDUSTRY_TEMPLATES) => {
    const t = INDUSTRY_TEMPLATES[key];
    if (!t) return;
    setDivisorMode(t.divisorMode);
    setCustomDivisorDays(t.customDivisorDays);
    setGraceAbsenceDays(t.graceAbsenceDays);
    setStandardMultiplier(t.standardMultiplier);
    setWeekendMultiplier(t.weekendMultiplier);
    setHolidayMultiplier(t.holidayMultiplier);
    setMonthlyCapHours(t.monthlyCapHours);
    setDefaultTaxRate(t.defaultTaxRate);
    setTaxMode(t.taxMode);
    setTdsRate(t.tdsRate);
    setTaxLabel(t.taxLabel);
    setEnforcePfWageCap(t.enforcePfWageCap);
    setEnforceEsiCeiling(t.enforceEsiCeiling);
    setAllowancePresets([...t.allowances]);
    setDeductionPresets([...t.deductions]);
    showToast(`Applied "${t.label}" template!`, "success");
  };

  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: policyEnabled,
        lopFormula: {
          divisorMode,
          customDivisorDays: Number(customDivisorDays) || 30,
          graceAbsenceDays: Number(graceAbsenceDays) || 0,
          autoCalculateLop,
        },
        overtimeRules: {
          standardMultiplier: Number(standardMultiplier) || 1.5,
          weekendMultiplier: Number(weekendMultiplier) || 2.0,
          holidayMultiplier: Number(holidayMultiplier) || 2.0,
          monthlyCapHours: Number(monthlyCapHours) || 0,
          allowEmployeeOtClaim,
        },
        taxRules: {
          defaultTaxRate: Number(defaultTaxRate) || 0,
          taxMode,
          tdsRate: Number(tdsRate) || 0,
          taxLabel: taxLabel.trim() || "GST",
          enforcePfWageCap,
          enforceEsiCeiling,
        },
        allowancePresets,
        deductionPresets,
        otherCharges,
        currency,
        notes,
      };

      const res = await fetch("/api/finance/compensation-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(
          policyEnabled
            ? "Compensation & invoice policy updated and active!"
            : "Policy saved in Suspended / Manual Override mode.",
          "success"
        );
        if (onPolicyUpdated && data.policy) {
          onPolicyUpdated(data.policy);
        }
        onClose();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update compensation policy.", "error");
      }
    } catch {
      showToast("Network error while saving policy.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Helper additions / removals
  const handleAddAllowance = () => {
    const newItem: IAllowancePreset = {
      id: `allowance-${Date.now()}`,
      name: "",
      type: "percentage",
      value: 10,
      isDefault: true,
      targetEmploymentType: "Permanent",
      description: "",
    };
    setAllowancePresets((prev) => [...prev, newItem]);
  };

  const handleRemoveAllowance = (id: string) => {
    setAllowancePresets((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddDeduction = () => {
    const newItem: IDeductionPreset = {
      id: `deduct-${Date.now()}`,
      name: "",
      type: "percentage",
      value: 5,
      isDefault: true,
      targetEmploymentType: "Permanent",
      description: "",
    };
    setDeductionPresets((prev) => [...prev, newItem]);
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductionPresets((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddOtherCharge = () => {
    const newItem: IOtherCharge = {
      id: `charge-${Date.now()}`,
      name: "",
      type: "fixed",
      value: 0,
      isAddition: false,
      description: "",
    };
    setOtherCharges((prev) => [...prev, newItem]);
  };

  const handleRemoveOtherCharge = (id: string) => {
    setOtherCharges((prev) => prev.filter((c) => c.id !== id));
  };

  // Live Simulator Calculations
  const simResults = useMemo(() => {
    const base = Number(simBaseSalary) || 0;
    let divisor = 30;
    if (divisorMode === "working_days") divisor = 25;
    else if (divisorMode === "fixed_26") divisor = 26;
    else if (divisorMode === "fixed_30") divisor = 30;
    else if (divisorMode === "custom_divisor") divisor = Math.max(1, customDivisorDays);

    const dailyRate = divisor > 0 ? base / divisor : 0;
    const netLopDays = Math.max(0, simLopDays - graceAbsenceDays);
    const lopDeduction = Math.round(dailyRate * netLopDays);

    // Calculate Allowances matching employment type
    const applicableAllowances: Array<{ name: string; amount: number }> = [];
    if (policyEnabled && simEmpType === "Permanent") {
      allowancePresets.forEach((p) => {
        if (!p.isDefault) return;
        if (p.targetEmploymentType && p.targetEmploymentType !== "All" && p.targetEmploymentType !== simEmpType) return;
        const amt = p.type === "percentage" ? Math.round((base * p.value) / 100) : Number(p.value) || 0;
        applicableAllowances.push({ name: p.name, amount: amt });
      });
    }

    const totalAllowances = applicableAllowances.reduce((s, a) => s + a.amount, 0);
    const grossEarnings = base + totalAllowances;

    // Calculate Deductions matching employment type
    const applicableDeductions: Array<{ name: string; amount: number }> = [];
    if (policyEnabled) {
      if (simEmpType === "Permanent") {
        deductionPresets.forEach((d) => {
          if (!d.isDefault) return;
          if (d.targetEmploymentType && d.targetEmploymentType !== "All" && d.targetEmploymentType !== simEmpType) return;
          let amt = 0;
          if (d.name.includes("Provident Fund") && enforcePfWageCap) {
            amt = Math.round((Math.min(base, 15000) * d.value) / 100);
          } else if (d.name.includes("ESI") && enforceEsiCeiling && grossEarnings > 21000) {
            amt = 0; // exempt
          } else {
            amt = d.type === "percentage" ? Math.round((base * d.value) / 100) : Number(d.value) || 0;
          }
          if (amt > 0) {
            applicableDeductions.push({ name: d.name, amount: amt });
          }
        });
      } else if (simEmpType === "Contractor") {
        if (tdsRate > 0) {
          applicableDeductions.push({
            name: `${taxLabel || "TDS"} (${tdsRate}%)`,
            amount: Math.round((base * tdsRate) / 100),
          });
        }
      }
    }

    const totalStatutoryDeductions = applicableDeductions.reduce((s, d) => s + d.amount, 0);
    const grandTotalDeductions = totalStatutoryDeductions + (policyEnabled ? lopDeduction : 0);
    const netTakeHome = Math.max(0, grossEarnings - grandTotalDeductions);

    return {
      dailyRate: Math.round(dailyRate),
      divisor,
      netLopDays,
      lopDeduction,
      applicableAllowances,
      totalAllowances,
      grossEarnings,
      applicableDeductions,
      totalStatutoryDeductions,
      grandTotalDeductions,
      netTakeHome,
    };
  }, [
    simBaseSalary,
    simLopDays,
    simEmpType,
    divisorMode,
    customDivisorDays,
    graceAbsenceDays,
    policyEnabled,
    allowancePresets,
    deductionPresets,
    enforcePfWageCap,
    enforceEsiCeiling,
    tdsRate,
    taxLabel,
  ]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <i className="fa-solid fa-sliders text-sm" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-foreground">
                  Compensation &amp; Invoice Policy Rules
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                  Admin &amp; HR
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Configure organizational LOP divisor formulas, overtime multipliers, and statutory allowances.
              </p>
            </div>
          </div>

          {/* Master Policy Switch & Close */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setPolicyEnabled(!policyEnabled)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer min-h-[36px]",
                policyEnabled
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-2xs"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              )}
              title={policyEnabled ? "Click to suspend all policy rules" : "Click to activate all policy rules"}
            >
              <i className={cn("fa-solid text-sm", policyEnabled ? "fa-toggle-on text-emerald-500" : "fa-toggle-off text-amber-500")} />
              <span>{policyEnabled ? "Policy Rules Active" : "Rules Suspended (Manual)"}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* 1-Click Industry Templates Strip */}
        <div className="px-5 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
            <i className="fa-solid fa-wand-magic-sparkles text-primary text-[11px]" />
            <span>Load Quick Industry Preset:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(INDUSTRY_TEMPLATES).map(([k, t]) => (
              <button
                key={k}
                type="button"
                onClick={() => handleApplyIndustryTemplate(k as any)}
                className="px-2.5 py-1 rounded-md bg-background border border-border hover:border-primary/50 text-[11px] font-medium text-foreground hover:text-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <i className={cn(t.icon, "text-[10px] text-primary")} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-background overflow-x-auto no-scrollbar shrink-0 text-xs">
          {[
            { id: "lop", label: "LOP Formula", icon: "fa-solid fa-calculator" },
            { id: "overtime", label: "Overtime (OT)", icon: "fa-solid fa-clock" },
            { id: "tax", label: "Taxes & Caps", icon: "fa-solid fa-receipt" },
            { id: "allowances", label: "Earnings / Allowances", icon: "fa-solid fa-wallet", count: allowancePresets.length },
            { id: "deductions", label: "Statutory Deductions", icon: "fa-solid fa-percent", count: deductionPresets.length },
            { id: "charges", label: "Other Charges", icon: "fa-solid fa-circle-exclamation", count: otherCharges.length },
            { id: "simulator", label: "Live Pay Simulator", icon: "fa-solid fa-flask" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer min-h-[36px]",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <i className={cn(tab.icon, "text-[11px]")} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                    activeTab === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2 text-muted-foreground text-xs">
              <i className="fa-solid fa-spinner fa-spin text-xl text-primary" />
              <span>Loading policy configuration...</span>
            </div>
          ) : (
            <>
              {!policyEnabled && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <i className="fa-solid fa-triangle-exclamation text-amber-500 text-sm mt-0.5 shrink-0" />
                  <div>
                    <strong className="font-bold">Policy Rules are Currently Suspended:</strong>
                    <p className="text-[11px] mt-0.5 opacity-90">
                      Invoice generators will run in manual override mode without auto-populating allowances, statutory deductions, or custom LOP divisors until re-enabled.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 1: LOP FORMULA */}
              {activeTab === "lop" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1">
                    <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-calculator text-primary" /> Loss of Pay (LOP) Daily Salary Divisor
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Defines how an employee’s daily rate is calculated when deducting unapproved or unpaid leave days.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-foreground">Select Divisor Calculation Formula</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: "calendar_days", title: "Actual Calendar Days in Month", desc: "Divides base salary by 28, 29, 30, or 31 days depending on the selected month." },
                        { id: "working_days", title: "Actual Working Days in Month", desc: "Divides base salary by actual working days in month (excluding Sundays & designated weekends)." },
                        { id: "fixed_26", title: "Fixed 26 Days Divisor (Corporate Standard)", desc: "Standard statutory formula dividing monthly salary by 26 days (assumes 4 weekly offs)." },
                        { id: "fixed_30", title: "Fixed 30 Days Divisor (Flat Monthly)", desc: "Universal flat divisor dividing salary by exactly 30 days regardless of month." },
                        { id: "custom_divisor", title: "Custom Fixed Divisor Days", desc: "Specify an explicit custom divisor day count (e.g. 24 or 22 days)." },
                      ].map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => setDivisorMode(opt.id)}
                          className={cn(
                            "p-3 rounded-xl border transition-all cursor-pointer space-y-1",
                            divisorMode === opt.id
                              ? "border-primary bg-primary/5 shadow-2xs ring-1 ring-primary"
                              : "border-border hover:border-primary/40 bg-background"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-foreground">{opt.title}</span>
                            <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0", divisorMode === opt.id ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                              {divisorMode === opt.id && <i className="fa-solid fa-check text-[9px]" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                        </div>
                      ))}
                    </div>

                    {divisorMode === "custom_divisor" && (
                      <div className="p-3 bg-background border border-primary/40 rounded-xl space-y-1.5 max-w-sm">
                        <label className="text-xs font-semibold text-foreground">Custom Divisor Day Count</label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={customDivisorDays}
                          onChange={(e) => setCustomDivisorDays(Number(e.target.value))}
                          className="h-8 text-xs font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-gift text-emerald-500" /> Grace Absence Days
                      </label>
                      <p className="text-[11px] text-muted-foreground">
                        Number of unexcused absent days tolerated before LOP deductions kick in (e.g. 1 day grace).
                      </p>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={graceAbsenceDays}
                        onChange={(e) => setGraceAbsenceDays(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold w-24"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Auto-Calculate LOP Checkbox</label>
                      <p className="text-[11px] text-muted-foreground">
                        Automatically check LOP calculation box by default when opening salary generator.
                      </p>
                      <button
                        type="button"
                        onClick={() => setAutoCalculateLop(!autoCalculateLop)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer min-h-[36px]",
                          autoCalculateLop ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-muted border-border text-muted-foreground"
                        )}
                      >
                        <i className={cn("fa-solid text-sm", autoCalculateLop ? "fa-toggle-on text-emerald-500" : "fa-toggle-off text-muted-foreground")} />
                        <span>{autoCalculateLop ? "Auto LOP Enabled" : "Manual LOP Option"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OVERTIME */}
              {activeTab === "overtime" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1">
                    <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-clock text-amber-500" /> Overtime (OT) Multipliers &amp; Limits
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Configure multipliers applied to hourly and shift contractor rates when overtime hours are logged.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-background rounded-xl border border-border space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Standard Overtime Multiplier</label>
                      <p className="text-[11px] text-muted-foreground">Normal weekday extra hours (e.g. 1.5x regular pay)</p>
                      <Input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={standardMultiplier}
                        onChange={(e) => setStandardMultiplier(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="p-3 bg-background rounded-xl border border-border space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Weekend Overtime Multiplier</label>
                      <p className="text-[11px] text-muted-foreground">Hours worked on Saturday/Sunday (e.g. 2.0x pay)</p>
                      <Input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={weekendMultiplier}
                        onChange={(e) => setWeekendMultiplier(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="p-3 bg-background rounded-xl border border-border space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Holiday Overtime Multiplier</label>
                      <p className="text-[11px] text-muted-foreground">Hours worked on public company holidays (e.g. 2.0x)</p>
                      <Input
                        type="number"
                        step="0.1"
                        min="1.0"
                        max="5.0"
                        value={holidayMultiplier}
                        onChange={(e) => setHolidayMultiplier(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Monthly Overtime Cap (Hours)</label>
                      <p className="text-[11px] text-muted-foreground">Maximum billable OT hours per month (0 = unlimited)</p>
                      <Input
                        type="number"
                        min="0"
                        max="200"
                        value={monthlyCapHours}
                        onChange={(e) => setMonthlyCapHours(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold w-28"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Allow Employee OT Self-Claim</label>
                      <p className="text-[11px] text-muted-foreground">Allow contractors to input OT hours during self-invoice generation</p>
                      <button
                        type="button"
                        onClick={() => setAllowEmployeeOtClaim(!allowEmployeeOtClaim)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer min-h-[36px]",
                          allowEmployeeOtClaim ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-muted border-border text-muted-foreground"
                        )}
                      >
                        <i className={cn("fa-solid text-sm", allowEmployeeOtClaim ? "fa-toggle-on text-emerald-500" : "fa-toggle-off text-muted-foreground")} />
                        <span>{allowEmployeeOtClaim ? "Self-Claim Permitted" : "Admin Only Locked"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TAXES & STATUTORY CAPS */}
              {activeTab === "tax" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-muted/30 border border-border rounded-xl space-y-1">
                    <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-receipt text-rose-500" /> Taxes, TDS Withholding &amp; Wage Ceilings
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Configure tax mode handling, statutory TDS withholding rates, and PF/ESI wage cap rules.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-background rounded-xl border border-border space-y-2">
                      <label className="text-xs font-semibold text-foreground">Tax Calculation Mode</label>
                      <select
                        value={taxMode}
                        onChange={(e) => setTaxMode(e.target.value)}
                        className="w-full h-8 px-2.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                      >
                        <option value="exclusive">Exclusive (Added on top of invoice subtotal)</option>
                        <option value="inclusive">Inclusive (Subtotal includes tax)</option>
                        <option value="tds_withholding">TDS Withholding (Deducted from contractor payout)</option>
                        <option value="exempt">Tax Exempt (No automatic tax lines)</option>
                      </select>
                    </div>

                    <div className="p-3 bg-background rounded-xl border border-border space-y-2">
                      <label className="text-xs font-semibold text-foreground">Tax Label &amp; Name</label>
                      <Input
                        type="text"
                        value={taxLabel}
                        onChange={(e) => setTaxLabel(e.target.value)}
                        placeholder="GST, VAT, TDS, Sales Tax"
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-background rounded-xl border border-border space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Default TDS / Withholding Rate (%)</label>
                      <p className="text-[11px] text-muted-foreground">Standard 10% (Section 194J) or 1% (194C) contractor tax</p>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={tdsRate}
                        onChange={(e) => setTdsRate(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>

                    <div className="p-3 bg-background rounded-xl border border-border space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Default Corporate Tax / GST (%)</label>
                      <p className="text-[11px] text-muted-foreground">Default percentage added on B2B invoices (e.g. 18% GST)</p>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={defaultTaxRate}
                        onChange={(e) => setDefaultTaxRate(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Statutory Wage Caps */}
                  <div className="pt-2 border-t border-border space-y-3">
                    <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-shield-halved text-primary" /> Statutory Wage Thresholds
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-background rounded-xl border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground">PF Statutory Basic Cap (₹15,000)</label>
                          <input
                            type="checkbox"
                            checked={enforcePfWageCap}
                            onChange={(e) => setEnforcePfWageCap(e.target.checked)}
                            className="w-4 h-4 rounded text-primary cursor-pointer"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          When checked, PF 12% is capped at ₹1,800/mo (12% of ₹15k limit) for salaries above ₹15,000.
                        </p>
                      </div>

                      <div className="p-3 bg-background rounded-xl border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground">ESI Wage Ceiling (₹21,000)</label>
                          <input
                            type="checkbox"
                            checked={enforceEsiCeiling}
                            onChange={(e) => setEnforceEsiCeiling(e.target.checked)}
                            className="w-4 h-4 rounded text-primary cursor-pointer"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          When checked, ESI deduction automatically disables if employee monthly gross exceeds ₹21,000.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ALLOWANCES */}
              {activeTab === "allowances" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-muted/30 border border-border rounded-xl">
                    <div>
                      <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-wallet text-emerald-500" /> Standard Earnings &amp; Allowances Catalog
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Configure pre-seeded allowances (HRA, Special, Conveyance) with % of base or fixed amounts.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddAllowance}
                      className="gap-1 h-7 text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      <i className="fa-solid fa-plus text-[10px]" /> Add Allowance
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {allowancePresets.map((a, idx) => (
                      <div key={a.id || idx} className="p-3 bg-background rounded-xl border border-border space-y-2.5 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Allowance Name</label>
                            <Input
                              type="text"
                              value={a.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAllowancePresets((prev) => prev.map((item) => (item.id === a.id ? { ...item, name: val } : item)));
                              }}
                              placeholder="e.g. House Rent Allowance (HRA)"
                              className="h-8 text-xs font-semibold"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Type</label>
                            <select
                              value={a.type}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setAllowancePresets((prev) => prev.map((item) => (item.id === a.id ? { ...item, type: val } : item)));
                              }}
                              className="w-full h-8 px-2 text-xs bg-background border border-border rounded-lg text-foreground cursor-pointer"
                            >
                              <option value="percentage">% of Base</option>
                              <option value="fixed">Fixed ₹</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Value</label>
                            <Input
                              type="number"
                              value={a.value}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setAllowancePresets((prev) => prev.map((item) => (item.id === a.id ? { ...item, value: val } : item)));
                              }}
                              className="h-8 text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Target Role</label>
                            <select
                              value={a.targetEmploymentType || "Permanent"}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setAllowancePresets((prev) => prev.map((item) => (item.id === a.id ? { ...item, targetEmploymentType: val } : item)));
                              }}
                              className="w-full h-8 px-2 text-xs bg-background border border-border rounded-lg text-foreground cursor-pointer"
                            >
                              <option value="Permanent">Permanent</option>
                              <option value="Contractor">Contractor</option>
                              <option value="All">All Types</option>
                            </select>
                          </div>
                          <div className="sm:col-span-1 flex items-center justify-end pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveAllowance(a.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-trash-can text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: DEDUCTIONS */}
              {activeTab === "deductions" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-muted/30 border border-border rounded-xl">
                    <div>
                      <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-percent text-rose-500" /> Statutory &amp; Custom Deductions Catalog
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Configure Provident Fund (12%), Professional Tax (₹200), ESI, and other withholdings.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddDeduction}
                      className="gap-1 h-7 text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      <i className="fa-solid fa-plus text-[10px]" /> Add Deduction
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {deductionPresets.map((d, idx) => (
                      <div key={d.id || idx} className="p-3 bg-background rounded-xl border border-border space-y-2.5 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Deduction Name</label>
                            <Input
                              type="text"
                              value={d.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setDeductionPresets((prev) => prev.map((item) => (item.id === d.id ? { ...item, name: val } : item)));
                              }}
                              placeholder="e.g. Provident Fund (PF)"
                              className="h-8 text-xs font-semibold"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Type</label>
                            <select
                              value={d.type}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setDeductionPresets((prev) => prev.map((item) => (item.id === d.id ? { ...item, type: val } : item)));
                              }}
                              className="w-full h-8 px-2 text-xs bg-background border border-border rounded-lg text-foreground cursor-pointer"
                            >
                              <option value="percentage">% of Base</option>
                              <option value="fixed">Fixed ₹</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Value</label>
                            <Input
                              type="number"
                              value={d.value}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setDeductionPresets((prev) => prev.map((item) => (item.id === d.id ? { ...item, value: val } : item)));
                              }}
                              className="h-8 text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Target Role</label>
                            <select
                              value={d.targetEmploymentType || "Permanent"}
                              onChange={(e) => {
                                const val = e.target.value as any;
                                setDeductionPresets((prev) => prev.map((item) => (item.id === d.id ? { ...item, targetEmploymentType: val } : item)));
                              }}
                              className="w-full h-8 px-2 text-xs bg-background border border-border rounded-lg text-foreground cursor-pointer"
                            >
                              <option value="Permanent">Permanent</option>
                              <option value="Contractor">Contractor</option>
                              <option value="All">All Types</option>
                            </select>
                          </div>
                          <div className="sm:col-span-1 flex items-center justify-end pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveDeduction(d.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-trash-can text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: OTHER CHARGES */}
              {activeTab === "charges" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-muted/30 border border-border rounded-xl">
                    <div>
                      <h3 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-exclamation text-amber-500" /> Operational &amp; Miscellaneous Charges
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        Configure penalties (e.g. hardware recovery) or special credits applied conditionally.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddOtherCharge}
                      className="gap-1 h-7 text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      <i className="fa-solid fa-plus text-[10px]" /> Add Charge
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {otherCharges.map((c, idx) => (
                      <div key={c.id || idx} className="p-3 bg-background rounded-xl border border-border space-y-2.5 shadow-2xs">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-5">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Charge Title</label>
                            <Input
                              type="text"
                              value={c.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOtherCharges((prev) => prev.map((item) => (item.id === c.id ? { ...item, name: val } : item)));
                              }}
                              placeholder="e.g. Asset Recovery Deduction"
                              className="h-8 text-xs font-semibold"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Type</label>
                            <select
                              value={c.isAddition ? "addition" : "deduction"}
                              onChange={(e) => {
                                const val = e.target.value === "addition";
                                setOtherCharges((prev) => prev.map((item) => (item.id === c.id ? { ...item, isAddition: val } : item)));
                              }}
                              className="w-full h-8 px-2 text-xs bg-background border border-border rounded-lg text-foreground cursor-pointer"
                            >
                              <option value="deduction">Deduction / Surcharge (-)</option>
                              <option value="addition">Credit / Allowance (+)</option>
                            </select>
                          </div>
                          <div className="sm:col-span-3">
                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Fixed Amount</label>
                            <Input
                              type="number"
                              value={c.value}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setOtherCharges((prev) => prev.map((item) => (item.id === c.id ? { ...item, value: val } : item)));
                              }}
                              className="h-8 text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="sm:col-span-1 flex items-center justify-end pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveOtherCharge(c.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <i className="fa-solid fa-trash-can text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: LIVE SIMULATOR */}
              {activeTab === "simulator" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-xl space-y-1">
                    <h3 className="font-bold text-xs text-primary flex items-center gap-1.5">
                      <i className="fa-solid fa-flask text-primary" /> Live Salary &amp; Take-Home Simulator
                    </h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Test any sample monthly salary below to immediately inspect how current policy formulas, LOP divisors, and statutory deductions calculate take-home pay.
                    </p>
                  </div>

                  {/* Sandbox Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-background rounded-xl border border-border shadow-2xs">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Test Base Salary (₹)</label>
                      <Input
                        type="number"
                        min="0"
                        value={simBaseSalary}
                        onChange={(e) => setSimBaseSalary(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold text-primary mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Unexcused Absences (Days)</label>
                      <Input
                        type="number"
                        min="0"
                        value={simLopDays}
                        onChange={(e) => setSimLopDays(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold text-rose-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">OT Hours Logged</label>
                      <Input
                        type="number"
                        min="0"
                        value={simOtHours}
                        onChange={(e) => setSimOtHours(Number(e.target.value))}
                        className="h-8 text-xs font-mono font-bold text-amber-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">Role Archetype</label>
                      <select
                        value={simEmpType}
                        onChange={(e) => setSimEmpType(e.target.value as any)}
                        className="w-full h-8 px-2 text-xs bg-background border border-border rounded-lg text-foreground cursor-pointer mt-1 font-semibold"
                      >
                        <option value="Permanent">Permanent Staff</option>
                        <option value="Contractor">Contractor / 1099</option>
                        <option value="Intern">Intern / Trainee</option>
                      </select>
                    </div>
                  </div>

                  {/* Calculated Sandbox Breakdown Card */}
                  <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-border">
                      <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <i className="fa-solid fa-file-invoice-dollar text-emerald-500" /> Simulated Pay Slip Breakdown
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Divisor: <strong className="text-foreground">{simResults.divisor} days</strong> &bull; Daily Rate: <strong className="text-foreground">₹{simResults.dailyRate.toLocaleString()}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      {/* Earnings Column */}
                      <div className="p-3 bg-background rounded-lg border border-border space-y-2">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Earnings &amp; Allowances</span>
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Base Contractual Salary:</span>
                            <span className="font-mono font-bold text-foreground">₹{simBaseSalary.toLocaleString()}</span>
                          </div>
                          {simResults.applicableAllowances.map((a, i) => (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">{a.name}:</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">+₹{a.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-bold">
                            <span className="text-foreground">Gross Monthly Earnings:</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{simResults.grossEarnings.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deductions Column */}
                      <div className="p-3 bg-background rounded-lg border border-border space-y-2">
                        <span className="text-[10px] uppercase font-bold text-rose-500">Statutory &amp; LOP Deductions</span>
                        <div className="space-y-1.5 pt-1">
                          {simResults.applicableDeductions.length === 0 && simResults.lopDeduction === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">No deductions applicable</p>
                          ) : (
                            <>
                              {simResults.applicableDeductions.map((d, i) => (
                                <div key={i} className="flex items-center justify-between text-[11px]">
                                  <span className="text-muted-foreground">{d.name}:</span>
                                  <span className="font-mono font-bold text-rose-500">-₹{d.amount.toLocaleString()}</span>
                                </div>
                              ))}
                              {simResults.lopDeduction > 0 && (
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-muted-foreground">LOP Deduction ({simResults.netLopDays} billable days):</span>
                                  <span className="font-mono font-bold text-rose-500">-₹{simResults.lopDeduction.toLocaleString()}</span>
                                </div>
                              )}
                            </>
                          )}
                          <div className="pt-2 border-t border-border flex items-center justify-between text-xs font-bold">
                            <span className="text-foreground">Total Deductions:</span>
                            <span className="font-mono text-rose-500">-₹{simResults.grandTotalDeductions.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Net Take-Home Highlight Banner */}
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Net Estimated Take-Home Pay</span>
                        <p className="text-[11px] text-muted-foreground">Actual payout calculated by the billing engine</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          ₹{simResults.netTakeHome.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleApplyIndustryTemplate("indian_corporate")}
              className="h-8 text-xs gap-1.5 font-medium cursor-pointer"
            >
              <i className="fa-solid fa-rotate-left text-[10px]" /> Reset Standard
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              color="primary"
              size="sm"
              disabled={saving}
              onClick={handleSavePolicy}
              className="h-8 text-xs gap-1.5 font-bold cursor-pointer"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-xs" /> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk text-xs" /> Save &amp; Publish Policy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
