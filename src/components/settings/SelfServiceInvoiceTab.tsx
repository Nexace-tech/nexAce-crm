"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { InvoiceDetailsView } from "@/components/finance/InvoiceDetailsView";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  _id?: string;
  id?: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerNo: string;
  businessName: string;
  businessAddress?: string;
  businessEmail?: string;
  billedToName: string;
  billedToAddress?: string;
  billedToEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  currency: string;
  status: "Draft" | "Sent" | "Pending" | "Paid" | "Overdue" | "Archived" | "Cancelled";
  notes?: string;
  createdAt?: string;
  bankDetails?: {
    bankName?: string;
    accountName?: string;
    accountNo?: string;
    ifscCode?: string;
    branch?: string;
  };
  paymentDetails?: {
    method: "Bank Transfer" | "UPI" | "Cash";
    upiId?: string;
    transactionId?: string;
    screenshotUrl?: string;
    screenshotFileName?: string;
    paidAt?: string;
  };
}

function formatHoursMinutes(val: number): string {
  const totalMins = Math.round(val * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m} mins`;
  if (m === 0) return `${h} ${h === 1 ? "hr" : "hrs"}`;
  return `${h} ${h === 1 ? "hr" : "hrs"} ${m} mins`;
}

interface SelfServiceInvoiceTabProps {
  showToast: (message: string, type?: "success" | "error") => void;
}

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SelfServiceInvoiceTab({ showToast }: SelfServiceInvoiceTabProps) {
  const searchParams = useSearchParams();
  const targetInvoiceNo = searchParams.get("invoiceNo");
  const targetInvoiceId = searchParams.get("invoiceId");

  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"history" | "generate">("history");
  const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Filter & Pagination States
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Shift & Timesheet Sync States
  const [syncingTimeData, setSyncingTimeData] = useState(false);
  const [attachShiftLogs, setAttachShiftLogs] = useState(true);
  const [attachTimesheetLogs, setAttachTimesheetLogs] = useState(true);
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [shiftData, setShiftData] = useState<{
    totalHours: number;
    daysWorked: number;
    overtimeHours: number;
    records: Array<{ date: string; clockIn?: string; clockOut?: string; totalHours?: number; status?: string }>;
  }>({
    totalHours: 0,
    daysWorked: 0,
    overtimeHours: 0,
    records: [],
  });
  const [timesheetData, setTimesheetData] = useState<{
    totalHours: number;
    totalEntries: number;
    records: Array<{ date: string; hours: number; projectName?: string; taskDescription?: string; billable?: boolean }>;
  }>({
    totalHours: 0,
    totalEntries: 0,
    records: [],
  });
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>("");
  const [companyBankDetails, setCompanyBankDetails] = useState<{
    bankName?: string;
    accountName?: string;
    accountNo?: string;
    ifscCode?: string;
    branch?: string;
  }>({});

  useEffect(() => {
    fetch("/api/settings/company")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.company) {
          if (data.company.logoUrl) setCompanyLogoUrl(data.company.logoUrl);
          if (data.company.bankDetails) setCompanyBankDetails(data.company.bankDetails);
        }
      })
      .catch(() => {});
  }, []);

  const now = new Date();
  const initialStart = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const initialEnd = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const generateDefaultDescription = (role?: string, dept?: string, start?: string, end?: string) => {
    const title = dept ? `${dept} - ${role || "Professional"}` : role || "Professional Consulting";
    return `${title} Services & Technical Deliverables (${start || initialStart} to ${end || initialEnd})`;
  };

  const generateDefaultNotes = (start?: string, end?: string) => {
    return `Verified shift attendance and project timesheets attached for billing cycle ${start || initialStart} to ${end || initialEnd}. Standard Net 14 payment terms.`;
  };

  const [invoiceFormData, setInvoiceFormData] = useState({
    employeeName: user?.name || "",
    role: user?.role || "Consultant",
    rateType: "hourly" as "hourly" | "daily" | "project",
    // Hourly
    hourlyRate: 50,
    hoursWorked: 0,
    overtimeHours: 0,
    // Daily Rate
    dailyRate: 400,
    daysWorked: 0,
    // Project-Based Fixed Fee (Multiple Projects Supported)
    projectName: "Fullstack Architecture & Feature Delivery",
    projectFixedAmount: 5000,
    projects: [
      { id: "1", name: "Fullstack Architecture & Feature Delivery", amount: 5000 },
    ],
    // Common
    taxRate: 0,
    currency: "INR",
    periodPreset: "this_month" as "this_month" | "last_month" | "first_half" | "second_half" | "custom",
    startDate: initialStart,
    endDate: initialEnd,
    period: `${initialStart} to ${initialEnd}`,
    description: generateDefaultDescription(user?.role, user?.department, initialStart, initialEnd),
    billedToName: user?.tenantId?.name || "NexAce Technologies CRM",
    billedToAddress: "Headquarters - 100 Innovation Way, Suite 400",
    billedToEmail: user?.tenantId?.slug ? `finance@${user.tenantId.slug}.com` : "finance@nexace.com",
    notes: generateDefaultNotes(initialStart, initialEnd),
  });

  const handleAddProject = () => {
    setInvoiceFormData((prev) => {
      const existing = prev.projects && prev.projects.length > 0 ? prev.projects : [];
      return {
        ...prev,
        projects: [
          ...existing,
          { id: Date.now().toString(), name: "", amount: 0 },
        ],
      };
    });
  };

  const handleRemoveProject = (id: string) => {
    setInvoiceFormData((prev) => {
      const remaining = (prev.projects || []).filter((p) => p.id !== id);
      const updated = remaining.length > 0 ? remaining : [{ id: Date.now().toString(), name: "", amount: 0 }];
      return {
        ...prev,
        projects: updated,
        projectName: updated[0]?.name || "",
        projectFixedAmount: Number(updated[0]?.amount) || 0,
      };
    });
  };

  const handleProjectChange = (id: string, field: "name" | "amount", value: string | number) => {
    setInvoiceFormData((prev) => {
      const updated = (prev.projects || []).map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      );
      return {
        ...prev,
        projects: updated,
        projectName: updated[0]?.name || prev.projectName,
        projectFixedAmount: Number(updated[0]?.amount) || prev.projectFixedAmount,
      };
    });
  };

  const fetchShiftAndTimesheetData = async (startDate: string, endDate: string) => {
    try {
      setSyncingTimeData(true);

      // 1. Fetch Attendance / Shift Clock
      let calculatedShiftHrs = 0;
      let calculatedDaysCount = 0;
      let calculatedOtHrs = 0;

      const attRes = await fetch(`/api/attendance?limit=all`);
      if (attRes.ok) {
        const attJson = await attRes.json();
        const allAtt: any[] = attJson.history || [];
        // Filter records within target date range (inclusive)
        const periodAtt = allAtt.filter((r) => {
          const recDate = r.date ? toLocalDateString(new Date(r.date)) : "";
          return recDate >= startDate && recDate <= endDate;
        });

        calculatedShiftHrs = periodAtt.reduce((sum, r) => {
          // Use stored regularHours + overtimeHours for completed shifts (totalHours does not exist in DB)
          let hrs = (Number(r.regularHours) || 0) + (Number(r.overtimeHours) || 0);
          // For active sessions (clocked in, not yet clocked out) compute live elapsed time
          if (hrs === 0 && r.clockIn && !r.clockOut) {
            const diffMs = Math.max(0, Date.now() - new Date(r.clockIn).getTime());
            hrs = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
          }
          return sum + hrs;
        }, 0);

        calculatedDaysCount = periodAtt.filter((r) =>
          (Number(r.regularHours) || 0) + (Number(r.overtimeHours) || 0) > 0 || r.clockIn
        ).length;
        // Sum stored overtimeHours directly — avoids re-deriving from a daily cap
        calculatedOtHrs = periodAtt.reduce((sum, r) => sum + (Number(r.overtimeHours) || 0), 0);

        setShiftData({
          totalHours: Math.round(calculatedShiftHrs * 10) / 10,
          daysWorked: calculatedDaysCount,
          overtimeHours: Math.round(calculatedOtHrs * 10) / 10,
          records: periodAtt.map((r) => {
            // Use stored regularHours + overtimeHours for completed shifts
            let recordHrs = (Number(r.regularHours) || 0) + (Number(r.overtimeHours) || 0);
            // For active sessions compute live elapsed time
            if (recordHrs === 0 && r.clockIn && !r.clockOut) {
              const diffMs = Math.max(0, Date.now() - new Date(r.clockIn).getTime());
              recordHrs = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
            }
            return {
              date: r.date ? toLocalDateString(new Date(r.date)) : "",
              clockIn: r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
              clockOut: r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : (r.clockIn ? "Working..." : "—"),
              totalHours: Math.round(recordHrs * 10) / 10,
              status: r.status || "Present",
            };
          }),
        });
      }

      // 2. Fetch Detailed Timesheets
      let calculatedTsHrs = 0;
      let projectNamesList: string[] = [];

      const tsRes = await fetch(`/api/timesheets?start=${startDate}&end=${endDate}`);
      if (tsRes.ok) {
        const tsJson = await tsRes.json();
        const entries: any[] = tsJson.entries || [];
        calculatedTsHrs = entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
        projectNamesList = Array.from(new Set(entries.map((e) => e.projectName).filter(Boolean))) as string[];

        setTimesheetData({
          totalHours: Math.round(calculatedTsHrs * 10) / 10,
          totalEntries: entries.length,
          records: entries.map((e) => ({
            date: e.date ? toLocalDateString(new Date(e.date)) : "",
            hours: Number(e.hours) || 0,
            projectName: e.projectName || "General Project",
            taskDescription: e.taskDescription || "",
            billable: Boolean(e.billable),
          })),
        });
      }

      // 3. Auto-fill the invoice form fields directly with the verified values
      const roundedShiftHrs = Math.round(calculatedShiftHrs * 10) / 10;
      const roundedTsHrs = Math.round(calculatedTsHrs * 10) / 10;
      const roundedOt = Math.round(calculatedOtHrs * 10) / 10;
      const effectiveTotalHrs = roundedShiftHrs > 0 ? roundedShiftHrs : roundedTsHrs;
      const regularHrs = Math.max(0, Math.round((effectiveTotalHrs - roundedOt) * 10) / 10);

      setInvoiceFormData((prev) => ({
        ...prev,
        hoursWorked: regularHrs,
        daysWorked: calculatedDaysCount,
        overtimeHours: roundedOt,
        projectName: projectNamesList.length > 0 ? projectNamesList.join(", ") : prev.projectName,
      }));

      showToast(`Fetched & synced ${effectiveTotalHrs} hours (${calculatedDaysCount} days) for ${startDate} to ${endDate}!`, "success");
    } catch (err) {
      console.error("Error fetching shift & timesheet data:", err);
      showToast("Could not fetch shift/timesheet records", "error");
    } finally {
      setSyncingTimeData(false);
    }
  };

  const handleSelectPreset = (preset: "this_month" | "last_month" | "first_half" | "second_half" | "custom") => {
    const cur = new Date();
    const curYear = cur.getFullYear();
    const curMonth = cur.getMonth();

    let start = invoiceFormData.startDate;
    let end = invoiceFormData.endDate;

    if (preset === "this_month") {
      start = toLocalDateString(new Date(curYear, curMonth, 1));
      end = toLocalDateString(new Date(curYear, curMonth + 1, 0));
    } else if (preset === "last_month") {
      start = toLocalDateString(new Date(curYear, curMonth - 1, 1));
      end = toLocalDateString(new Date(curYear, curMonth, 0));
    } else if (preset === "first_half") {
      start = toLocalDateString(new Date(curYear, curMonth, 1));
      end = toLocalDateString(new Date(curYear, curMonth, 15));
    } else if (preset === "second_half") {
      start = toLocalDateString(new Date(curYear, curMonth, 16));
      end = toLocalDateString(new Date(curYear, curMonth + 1, 0));
    }

    setInvoiceFormData((prev) => ({
      ...prev,
      periodPreset: preset,
      startDate: start,
      endDate: end,
      period: `${start} to ${end}`,
      description: generateDefaultDescription(user?.role, user?.department, start, end),
      notes: generateDefaultNotes(start, end),
    }));

    fetchShiftAndTimesheetData(start, end);
  };

  const applySyncedValuesToForm = () => {
    const effectiveHours = shiftData.totalHours > 0 ? shiftData.totalHours : timesheetData.totalHours;
    const effectiveDays = shiftData.daysWorked > 0 ? shiftData.daysWorked : Math.ceil(effectiveHours / 8);
    const effectiveOT = shiftData.overtimeHours;
    const regHrs = Math.max(0, Math.round((effectiveHours - effectiveOT) * 10) / 10);

    setInvoiceFormData((prev) => ({
      ...prev,
      hoursWorked: regHrs,
      overtimeHours: effectiveOT,
      daysWorked: effectiveDays,
    }));

    showToast(`Applied ${effectiveHours} verified hours & ${effectiveDays} days to invoice!`, "success");
  };

  const fetchMyInvoiceHistory = async () => {
    if (!user?.email) return;
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/it/invoices");
      if (res.ok) {
        const data = await res.json();
        const allInvoices: Invoice[] = data.invoices || [];
        const userEmail = user.email?.trim().toLowerCase();
        const userName = user.name?.trim().toLowerCase();
        const userCleanName = userName?.replace(/\s+/g, "");

        const filtered = allInvoices.filter((inv) => {
          const invEmail = inv.businessEmail?.trim().toLowerCase();
          const invBusinessName = inv.businessName?.trim().toLowerCase();
          const invCustNo = inv.customerNo?.trim().toLowerCase();

          return (
            (userEmail && invEmail === userEmail) ||
            (userCleanName && invCustNo && invCustNo.includes(userCleanName)) ||
            (userName && invBusinessName === userName)
          );
        });

        const effectiveInvoices = filtered.length > 0 ? filtered : allInvoices;
        setMyInvoices(effectiveInvoices);

        // Auto-open target invoice if requested via notification deep-link
        if (targetInvoiceNo || targetInvoiceId) {
          const match = allInvoices.find((i) =>
            (targetInvoiceNo && i.invoiceNo?.toLowerCase() === targetInvoiceNo.toLowerCase()) ||
            (targetInvoiceId && (i._id === targetInvoiceId || i.id === targetInvoiceId))
          );
          if (match) {
            setViewInvoice(match);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching personal invoices:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchMyInvoiceHistory();
  }, [user]);

  // Sync state dynamically when user profile finishes loading from useAuth()
  useEffect(() => {
    if (user) {
      const start = toLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
      const end = toLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
      const companyName = user.tenantId?.name || "NexAce Technologies CRM";

      // 1. Set baseline defaults
      setInvoiceFormData((prev) => ({
        ...prev,
        employeeName: user.name || prev.employeeName || "",
        role: user.role || prev.role || "Employee",
        billedToName: companyName,
        billedToEmail: user.tenantId?.slug ? `finance@${user.tenantId.slug}.com` : "finance@nexace.com",
        description: generateDefaultDescription(user.role, user.department, start, end),
        notes: generateDefaultNotes(start, end),
      }));

      // 2. Fetch latest saved company profile details (address, official email, currency)
      fetch("/api/settings/company")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.company) {
            const comp = data.company;
            const fullAddress = [comp.address, comp.city, comp.state, comp.postalCode, comp.country]
              .filter(Boolean)
              .join(", ");

            if (comp.bankDetails) {
              setCompanyBankDetails(comp.bankDetails);
            }

            setInvoiceFormData((prev) => ({
              ...prev,
              billedToName: comp.name || prev.billedToName,
              billedToAddress: fullAddress || prev.billedToAddress,
              billedToEmail: comp.billingEmail || comp.email || prev.billedToEmail,
              currency: comp.currency || prev.currency,
            }));
          }
        })
        .catch((err) => console.error("Error loading company details for invoice:", err));

      // 3. Fetch verified shift clock & project timesheets
      fetchShiftAndTimesheetData(start, end);
    }
  }, [user]);

  // Reset pagination page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const handleGenerateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceFormData.employeeName.trim()) {
      showToast("Employee Name is required.", "error");
      return;
    }

    setInvoiceSubmitting(true);
    try {
      const regHours = Number(invoiceFormData.hoursWorked) || 0;
      const otHours = Number(invoiceFormData.overtimeHours) || 0;
      const hRate = Number(invoiceFormData.hourlyRate) || 0;
      const dRate = Number(invoiceFormData.dailyRate) || 0;
      const dWorked = Number(invoiceFormData.daysWorked) || 0;
      const effectiveProjects =
        invoiceFormData.projects && invoiceFormData.projects.length > 0
          ? invoiceFormData.projects
          : [{ id: "1", name: invoiceFormData.projectName || "Project Milestone", amount: Number(invoiceFormData.projectFixedAmount) || 0 }];
      const totalProjAmount = effectiveProjects.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      let subtotalVal = 0;
      const items: InvoiceItem[] = [];

      if (invoiceFormData.rateType === "hourly") {
        subtotalVal = regHours * hRate + otHours * (hRate * 1.5);
        items.push({
          description: `${invoiceFormData.description} (Regular Hours) [${invoiceFormData.period}]`,
          quantity: regHours,
          unitPrice: hRate,
          amount: regHours * hRate,
        });
        if (otHours > 0) {
          items.push({
            description: `Overtime Hours (1.5x Rate) [${invoiceFormData.period}]`,
            quantity: otHours,
            unitPrice: hRate * 1.5,
            amount: otHours * (hRate * 1.5),
          });
        }
      } else if (invoiceFormData.rateType === "daily") {
        subtotalVal = dWorked * dRate;
        items.push({
          description: `${invoiceFormData.description} (Daily Billing: ${dWorked} days @ ${invoiceFormData.currency} ${dRate}/day) [${invoiceFormData.period}]`,
          quantity: dWorked,
          unitPrice: dRate,
          amount: dWorked * dRate,
        });
      } else {
        subtotalVal = totalProjAmount;
        effectiveProjects.forEach((p, idx) => {
          const pAmount = Number(p.amount) || 0;
          items.push({
            description: `${p.name || `Project Milestone #${idx + 1}`} (Project Fixed Milestone) [${invoiceFormData.period}]`,
            quantity: 1,
            unitPrice: pAmount,
            amount: pAmount,
          });
        });
      }

      const taxRateVal = Number(invoiceFormData.taxRate) || 0;
      const taxAmountVal = (subtotalVal * taxRateVal) / 100;
      const totalVal = subtotalVal + taxAmountVal;
      const invoiceNo = `INV-EMP-${Date.now().toString().slice(-6)}`;

      let attachmentsSummary = "";
      if (attachShiftLogs && shiftData.daysWorked > 0) {
        attachmentsSummary += `\n[Attached Shift Clock Attendance]: ${shiftData.totalHours} hrs logged over ${shiftData.daysWorked} days (Overtime: ${shiftData.overtimeHours} hrs)`;
      }
      if (attachTimesheetLogs && timesheetData.totalEntries > 0) {
        attachmentsSummary += `\n[Attached Project Timesheets]: ${timesheetData.totalHours} hrs logged across ${timesheetData.totalEntries} entries`;
      }

      const combinedNotes = (invoiceFormData.notes ? `${invoiceFormData.notes}\n` : "") + attachmentsSummary.trim();

      const res = await fetch("/api/it/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNo,
          invoiceDate: new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
          customerNo: `EMP-${invoiceFormData.employeeName.replace(/\s+/g, "").toUpperCase()}`,
          businessName: invoiceFormData.employeeName,
          businessAddress: `${invoiceFormData.role} - Team Member`,
          businessEmail: user?.email || `${invoiceFormData.employeeName.toLowerCase().replace(/\s+/g, ".")}@company.com`,
          billedToName: invoiceFormData.billedToName,
          billedToAddress: invoiceFormData.billedToAddress,
          billedToEmail: invoiceFormData.billedToEmail,
          items,
          subtotal: subtotalVal,
          taxRate: taxRateVal,
          taxAmount: taxAmountVal,
          total: totalVal,
          currency: invoiceFormData.currency,
          status: "Pending",
          notes: combinedNotes,
          // Structured shift clock & timesheet data for full admin visibility
          shiftAttendance: (attachShiftLogs && shiftData.daysWorked > 0) ? {
            totalHours: shiftData.totalHours,
            daysWorked: shiftData.daysWorked,
            overtimeHours: shiftData.overtimeHours,
            records: shiftData.records,
          } : null,
          timesheetEntries: (attachTimesheetLogs && timesheetData.totalEntries > 0) ? {
            totalHours: timesheetData.totalHours,
            totalEntries: timesheetData.totalEntries,
            records: timesheetData.records,
          } : null,
        }),
      });


      if (res.ok) {
        showToast(`Invoice ${invoiceNo} generated and submitted to Finance for approval!`, "success");
        fetchMyInvoiceHistory(); // Refresh history log immediately!
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to generate invoice.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to generate invoice.", "error");
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  const handlePrintPDF = (invoiceToPrint?: Invoice) => {
    const isDraft = !invoiceToPrint;
    const invNo = isDraft ? "INV-EMP-DRAFT" : invoiceToPrint.invoiceNo;
    const date = isDraft ? new Date().toISOString().slice(0, 10) : invoiceToPrint.invoiceDate;
    const dueDateVal = isDraft ? new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) : invoiceToPrint.dueDate;
    const statusVal = isDraft ? "Draft" : invoiceToPrint.status;

    const fromName = isDraft ? invoiceFormData.employeeName : invoiceToPrint.businessName;
    const fromAddress = isDraft ? `${invoiceFormData.role} - Team Member` : invoiceToPrint.businessAddress || "";
    const fromEmail = isDraft ? user?.email || "" : invoiceToPrint.businessEmail || "";

    const toName = isDraft ? invoiceFormData.billedToName : invoiceToPrint.billedToName;
    const toAddress = isDraft ? invoiceFormData.billedToAddress : invoiceToPrint.billedToAddress || "";
    const toEmail = isDraft ? invoiceFormData.billedToEmail : invoiceToPrint.billedToEmail || "";

    const curr = isDraft ? invoiceFormData.currency : invoiceToPrint.currency;
    const subtotalVal = isDraft ? subtotal : invoiceToPrint.subtotal;
    const taxRateVal = isDraft ? taxPct : invoiceToPrint.taxRate;
    const taxAmountVal = isDraft ? taxVal : invoiceToPrint.taxAmount;
    const grandTotalVal = isDraft ? grandTotal : invoiceToPrint.total;
    const notesVal = isDraft ? invoiceFormData.notes : invoiceToPrint.notes || "";

    let draftAttachmentsSummary = "";
    if (isDraft) {
      if (attachShiftLogs && shiftData.daysWorked > 0) {
        draftAttachmentsSummary += `\n[Attached Shift Clock Attendance]: ${shiftData.totalHours} hrs logged over ${shiftData.daysWorked} days (Overtime: ${shiftData.overtimeHours} hrs)`;
      }
      if (attachTimesheetLogs && timesheetData.totalEntries > 0) {
        draftAttachmentsSummary += `\n[Attached Project Timesheets]: ${timesheetData.totalHours} hrs logged across ${timesheetData.totalEntries} entries`;
      }
    }
    const finalNotesToPrint = (notesVal ? `${notesVal}\n` : "") + draftAttachmentsSummary.trim();

    const items = isDraft
      ? invoiceFormData.rateType === "hourly"
        ? [
            {
              description: `${invoiceFormData.description} (Regular Hours) [${invoiceFormData.period}]`,
              quantity: regHours,
              unitPrice: hRate,
              amount: regHours * hRate,
            },
            ...(otHours > 0
              ? [
                  {
                    description: `Overtime Hours (1.5x Rate) [${invoiceFormData.period}]`,
                    quantity: otHours,
                    unitPrice: hRate * 1.5,
                    amount: otHours * hRate * 1.5,
                  },
                ]
              : []),
          ]
        : invoiceFormData.rateType === "daily"
        ? [
            {
              description: `${invoiceFormData.description} (Daily Rate: ${dWorked} days) [${invoiceFormData.period}]`,
              quantity: dWorked,
              unitPrice: dRate,
              amount: dWorked * dRate,
            },
          ]
        : (invoiceFormData.projects && invoiceFormData.projects.length > 0
            ? invoiceFormData.projects
            : [{ id: "1", name: invoiceFormData.projectName || "Project Milestone", amount: Number(invoiceFormData.projectFixedAmount) || 0 }]
          ).map((p, idx) => ({
            description: `${p.name || `Project Milestone #${idx + 1}`} (Project Fixed Fee) [${invoiceFormData.period}]`,
            quantity: 1,
            unitPrice: Number(p.amount) || 0,
            amount: Number(p.amount) || 0,
          }))
      : invoiceToPrint.items || [];

    try {
      downloadInvoicePdf(
        {
          invoiceNo: invNo,
          invoiceDate: date,
          dueDate: dueDateVal,
          customerNo: isDraft ? undefined : invoiceToPrint.customerNo,
          businessName: fromName || "NexAce IT Team",
          businessAddress: fromAddress,
          businessEmail: fromEmail,
          billedToName: toName || "Client",
          billedToAddress: toAddress,
          billedToEmail: toEmail,
          items,
          subtotal: subtotalVal,
          taxRate: taxRateVal,
          taxAmount: taxAmountVal,
          total: grandTotalVal,
          currency: curr || "INR",
          status: statusVal,
          notes: finalNotesToPrint,
          bankDetails: isDraft ? companyBankDetails : (invoiceToPrint.bankDetails || companyBankDetails),
          paymentDetails: isDraft ? undefined : invoiceToPrint.paymentDetails,
          logoUrl: companyLogoUrl,
        },
        `Invoice_${invNo}.pdf`
      );
      showToast(`Invoice PDF (${invNo}) downloaded successfully!`, "success");
    } catch (err) {
      console.error("Failed to auto download invoice PDF:", err);
      showToast("Failed to download PDF invoice.", "error");
    }
  };

  const regHours = Number(invoiceFormData.hoursWorked) || 0;
  const otHours = Number(invoiceFormData.overtimeHours) || 0;
  const hRate = Number(invoiceFormData.hourlyRate) || 0;
  const dRate = Number(invoiceFormData.dailyRate) || 0;
  const dWorked = Number(invoiceFormData.daysWorked) || 0;
  const effectiveProjects =
    invoiceFormData.projects && invoiceFormData.projects.length > 0
      ? invoiceFormData.projects
      : [{ id: "1", name: invoiceFormData.projectName || "Project Milestone", amount: Number(invoiceFormData.projectFixedAmount) || 0 }];
  const totalProjAmount = effectiveProjects.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const subtotal =
    invoiceFormData.rateType === "hourly"
      ? regHours * hRate + otHours * (hRate * 1.5)
      : invoiceFormData.rateType === "daily"
      ? dWorked * dRate
      : totalProjAmount;

  const taxPct = Number(invoiceFormData.taxRate) || 0;
  const taxVal = (subtotal * taxPct) / 100;
  const grandTotal = subtotal + taxVal;
  const currSymbol =
    invoiceFormData.currency === "EUR"
      ? "€"
      : invoiceFormData.currency === "GBP"
      ? "£"
      : invoiceFormData.currency === "INR"
      ? "₹"
      : "$";

  // Filter & Pagination Logic
  const filteredPersonalInvoices = myInvoices.filter((inv) => {
    if (statusFilter === "All") return true;
    return inv.status === statusFilter;
  });

  const totalPages = Math.ceil(filteredPersonalInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = filteredPersonalInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: string }> = {
      Paid: { color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: "fa-circle-check" },
      Pending: { color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: "fa-clock" },
      Sent: { color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20", icon: "fa-paper-plane" },
      Draft: { color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20", icon: "fa-pen-ruler" },
      Overdue: { color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", icon: "fa-triangle-exclamation" },
      Cancelled: { color: "bg-slate-500/10 text-slate-500 border-slate-500/20 line-through", icon: "fa-ban" },
    };
    const c = config[status] || { color: "bg-muted text-muted-foreground border-border", icon: "fa-circle-info" };
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border", c.color)}>
        <i className={cn("fa-solid text-[9px]", c.icon)} />
        {status}
      </span>
    );
  };

  if (viewInvoice) {
    return (
      <InvoiceDetailsView
        invoice={viewInvoice}
        onClose={() => setViewInvoice(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Invoice Generator Form */}
        <Card className="border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <i className="fa-solid fa-file-invoice-dollar text-primary" /> Self-Service Employee Invoice Generator
            </CardTitle>
            <CardDescription>
              Generate and submit your monthly contractor / employee fee invoice directly to Finance for approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleGenerateInvoiceSubmit} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Full Name *</label>
                  <Input
                    type="text"
                    required
                    readOnly
                    disabled
                    placeholder="Auto-filled Full Name"
                    value={invoiceFormData.employeeName}
                    className="opacity-75 cursor-not-allowed bg-muted/40 font-medium select-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Role / Designation</label>
                  <Input
                    type="text"
                    readOnly
                    disabled
                    placeholder="Auto-filled Role"
                    value={invoiceFormData.role}
                    className="opacity-75 cursor-not-allowed bg-muted/40 font-medium select-none"
                  />
                </div>
              </div>

              {/* Rate Type / Billing Model Selector */}
              <div className="space-y-1.5 p-3.5 bg-muted/30 rounded-xl border border-border">
                <label className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                  <i className="fa-solid fa-sliders text-primary" /> Billing Model / Rate Structure
                </label>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setInvoiceFormData((prev) => ({ ...prev, rateType: "hourly" }))}
                    className={cn(
                      "py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                      invoiceFormData.rateType === "hourly"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background hover:bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <i className="fa-solid fa-clock" /> Hourly Rate
                  </button>

                  <button
                    type="button"
                    onClick={() => setInvoiceFormData((prev) => ({ ...prev, rateType: "daily" }))}
                    className={cn(
                      "py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                      invoiceFormData.rateType === "daily"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background hover:bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <i className="fa-solid fa-calendar-day" /> Day Rate
                  </button>

                  <button
                    type="button"
                    onClick={() => setInvoiceFormData((prev) => ({ ...prev, rateType: "project" }))}
                    className={cn(
                      "py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
                      invoiceFormData.rateType === "project"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background hover:bg-muted text-muted-foreground border-border"
                    )}
                  >
                    <i className="fa-solid fa-briefcase" /> Project-Based
                  </button>
                </div>
              </div>

              {/* Conditional Rate Inputs */}
              {invoiceFormData.rateType === "hourly" && (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="font-semibold text-foreground">Currency</label>
                    <select
                      value={invoiceFormData.currency}
                      onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, currency: e.target.value }))}
                      className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-medium"
                    >
                      <option value="INR">INR (₹ - Indian Rupee)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                      <option value="AED">AED (Dh - UAE Dirham)</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="font-semibold text-foreground">Hourly Rate</label>
                    <Input
                      type="number"
                      required
                      min="0"
                      placeholder="50"
                      value={invoiceFormData.hourlyRate}
                      onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-foreground">Regular Hours</label>
                      <span className="text-[10px] text-primary flex items-center gap-1">
                        <i className="fa-solid fa-lock text-[9px]" /> Verified Log
                      </span>
                    </div>
                    <Input
                      type="number"
                      required
                      readOnly
                      disabled
                      placeholder="0"
                      value={invoiceFormData.hoursWorked}
                      className="opacity-85 cursor-not-allowed bg-muted/40 font-mono font-bold select-none"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-foreground">Overtime Hrs (1.5x)</label>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <i className="fa-solid fa-lock text-[9px]" /> Auto
                      </span>
                    </div>
                    <Input
                      type="number"
                      readOnly
                      disabled
                      placeholder="0"
                      value={invoiceFormData.overtimeHours}
                      className="opacity-85 cursor-not-allowed bg-muted/40 font-mono font-bold select-none"
                    />
                  </div>
                </div>
              )}

              {invoiceFormData.rateType === "daily" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1 sm:col-span-1">
                    <label className="font-semibold text-foreground">Currency</label>
                    <select
                      value={invoiceFormData.currency}
                      onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, currency: e.target.value }))}
                      className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-medium"
                    >
                      <option value="INR">INR (₹ - Indian Rupee)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                      <option value="AED">AED (Dh - UAE Dirham)</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="font-semibold text-foreground">Day / Daily Rate</label>
                    <Input
                      type="number"
                      required
                      min="0"
                      placeholder="400"
                      value={invoiceFormData.dailyRate}
                      onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, dailyRate: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-foreground">Days Worked</label>
                      <span className="text-[10px] text-primary flex items-center gap-1">
                        <i className="fa-solid fa-lock text-[9px]" /> Verified
                      </span>
                    </div>
                    <Input
                      type="number"
                      required
                      readOnly
                      disabled
                      placeholder="0"
                      value={invoiceFormData.daysWorked}
                      className="opacity-85 cursor-not-allowed bg-muted/40 font-mono font-bold select-none"
                    />
                  </div>
                </div>
              )}

              {invoiceFormData.rateType === "project" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="font-semibold text-foreground">Currency</label>
                      <select
                        value={invoiceFormData.currency}
                        onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, currency: e.target.value }))}
                        className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-medium"
                      >
                        <option value="INR">INR (₹ - Indian Rupee)</option>
                        <option value="USD">USD ($ - US Dollar)</option>
                        <option value="EUR">EUR (€ - Euro)</option>
                        <option value="GBP">GBP (£ - British Pound)</option>
                        <option value="AED">AED (Dh - UAE Dirham)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-3 pb-1 text-xs">
                      <span className="text-muted-foreground font-medium">
                        Total Project Milestone(s): <strong className="text-foreground">{invoiceFormData.projects?.length || 1}</strong>
                      </span>
                      <span className="font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 font-mono">
                        {currSymbol}{totalProjAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Projects / Milestones List */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <i className="fa-solid fa-diagram-project text-primary text-xs" />
                        Project Deliverables &amp; Milestones
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddProject}
                        className="h-7 px-2.5 text-[11px] gap-1.5 font-bold text-primary border-dashed border-primary/40 hover:bg-primary/5 cursor-pointer"
                      >
                        <i className="fa-solid fa-plus text-[10px]" /> Add Project
                      </Button>
                    </div>

                    <div className="space-y-2.5">
                      {(invoiceFormData.projects || []).map((proj, idx) => (
                        <div
                          key={proj.id || idx}
                          className="p-3 bg-muted/20 dark:bg-slate-900/40 rounded-xl border border-border/80 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center transition-all hover:border-border"
                        >
                          <div className="sm:col-span-1 flex items-center gap-1 text-muted-foreground text-xs font-mono font-bold">
                            <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-[10px] text-foreground">
                              #{idx + 1}
                            </span>
                          </div>

                          <div className="sm:col-span-7 space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-semibold text-muted-foreground">Project / Scope Title</label>
                            </div>
                            <Input
                              type="text"
                              required
                              placeholder={idx === 0 ? "e.g. Fullstack Architecture & Feature Delivery" : `e.g. Deliverable / Milestone #${idx + 1}`}
                              value={proj.name}
                              onChange={(e) => handleProjectChange(proj.id, "name", e.target.value)}
                              className="h-8.5 text-xs bg-background"
                            />
                          </div>

                          <div className="sm:col-span-3 space-y-1">
                            <label className="text-[11px] font-semibold text-muted-foreground">Milestone Fee ({currSymbol})</label>
                            <Input
                              type="number"
                              required
                              min="0"
                              placeholder="e.g. 5000"
                              value={proj.amount === 0 ? "" : proj.amount}
                              onChange={(e) => handleProjectChange(proj.id, "amount", e.target.value === "" ? 0 : Number(e.target.value))}
                              className="h-8.5 text-xs font-mono font-bold bg-background"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end sm:pt-4">
                            {(invoiceFormData.projects || []).length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveProject(proj.id)}
                                title="Remove this project"
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer rounded-lg"
                              >
                                <i className="fa-solid fa-trash-can text-xs" />
                              </Button>
                            ) : (
                              <div className="h-8 w-8" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Time Period Selection & Preset Picker */}
              <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/80">
                  <div>
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <i className="fa-solid fa-calendar-range text-primary" /> Invoice &amp; Time Tracking Period
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Select billing cycle or custom date range to fetch shift clock &amp; timesheet logs
                    </p>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { id: "this_month", label: "This Month" },
                      { id: "last_month", label: "Last Month" },
                      { id: "first_half", label: "1st - 15th" },
                      { id: "second_half", label: "16th - End" },
                      { id: "custom", label: "Custom" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p.id as any)}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer border",
                          invoiceFormData.periodPreset === p.id
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* From Date & To Date Range Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <i className="fa-solid fa-calendar-plus text-sky-500 text-[11px]" /> From Date (Start)
                    </label>
                    <Input
                      type="date"
                      required
                      value={invoiceFormData.startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setInvoiceFormData((prev) => ({
                          ...prev,
                          startDate: newStart,
                          periodPreset: "custom",
                          period: `${newStart} to ${prev.endDate}`,
                          description: generateDefaultDescription(user?.role, user?.department, newStart, prev.endDate),
                          notes: generateDefaultNotes(newStart, prev.endDate),
                        }));
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <i className="fa-solid fa-calendar-check text-emerald-500 text-[11px]" /> To Date (End)
                    </label>
                    <Input
                      type="date"
                      required
                      value={invoiceFormData.endDate}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        setInvoiceFormData((prev) => ({
                          ...prev,
                          endDate: newEnd,
                          periodPreset: "custom",
                          period: `${prev.startDate} to ${newEnd}`,
                          description: generateDefaultDescription(user?.role, user?.department, prev.startDate, newEnd),
                          notes: generateDefaultNotes(prev.startDate, newEnd),
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Shift Clock & Timesheet Sync & Attach Panel */}
              <div className="p-4 bg-primary/5 dark:bg-slate-900/60 rounded-xl border border-primary/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-primary/10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                      <i className="fa-solid fa-business-time text-xs" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Shift Clock &amp; Timesheets Audit Sync
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Selected Range: <strong className="text-foreground">{invoiceFormData.startDate}</strong> to <strong className="text-foreground">{invoiceFormData.endDate}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={syncingTimeData}
                      onClick={() => fetchShiftAndTimesheetData(invoiceFormData.startDate, invoiceFormData.endDate)}
                      className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 cursor-pointer bg-background"
                    >
                      <i className={cn("fa-solid fa-arrows-rotate text-xs text-primary", syncingTimeData && "animate-spin")} />
                      {syncingTimeData ? "Syncing..." : "Sync Range"}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={applySyncedValuesToForm}
                      className="h-7 px-3 text-[11px] font-bold gap-1.5 cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles text-xs" /> Auto-Fill Hours
                    </Button>
                  </div>
                </div>

                {/* Status KPI mini cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 bg-background/80 rounded-lg border border-border/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <i className="fa-solid fa-user-clock text-sky-500" /> Shift Attendance
                      </span>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {shiftData.totalHours} hrs <span className="text-xs font-normal text-muted-foreground">({shiftData.daysWorked} days)</span>
                      </p>
                    </div>
                    {shiftData.overtimeHours > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                        +{shiftData.overtimeHours}h OT
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 bg-background/80 rounded-lg border border-border/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <i className="fa-solid fa-list-check text-emerald-500" /> Project Timesheets
                      </span>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {timesheetData.totalHours} hrs <span className="text-xs font-normal text-muted-foreground">({timesheetData.totalEntries} entries)</span>
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                      Verified Log
                    </span>
                  </div>
                </div>

                {/* Attachment toggles & expand details */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={attachShiftLogs}
                        onChange={(e) => setAttachShiftLogs(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Attach Shift Attendance Log</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer select-none font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={attachTimesheetLogs}
                        onChange={(e) => setAttachTimesheetLogs(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Attach Timesheet Entries</span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSyncDetails((prev) => !prev)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showSyncDetails ? "Hide Log Details" : "View Log Details"}</span>
                    <i className={cn("fa-solid fa-chevron-down text-[10px] transition-transform", showSyncDetails && "rotate-180")} />
                  </button>
                </div>

                {/* Expandable Log Details */}
                {showSyncDetails && (
                  <div className="mt-2 pt-2 border-t border-border/80 space-y-3">
                    {/* Shift Logs Mini Table */}
                    <div>
                      <span className="font-bold text-[11px] text-foreground flex items-center gap-1 mb-1.5">
                        <i className="fa-solid fa-clock text-xs text-sky-500" /> Daily Shift Clock Breakdown:
                      </span>
                      {shiftData.records.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic py-1">No attendance clock records found for this period.</p>
                      ) : (
                        <div className="max-h-36 overflow-y-auto border border-border rounded-lg">
                          <table className="w-full text-[11px]">
                            <thead className="bg-muted/60 sticky top-0 text-muted-foreground">
                              <tr>
                                <th className="py-1 px-2 text-left">Date</th>
                                <th className="py-1 px-2 text-center">Clock In</th>
                                <th className="py-1 px-2 text-center">Clock Out</th>
                                <th className="py-1 px-2 text-right">Hours</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {shiftData.records.map((r, i) => (
                                <tr key={i} className="hover:bg-muted/20">
                                  <td className="py-1 px-2 font-mono font-medium">{r.date}</td>
                                  <td className="py-1 px-2 text-center font-mono text-muted-foreground">{r.clockIn}</td>
                                  <td className="py-1 px-2 text-center font-mono text-muted-foreground">{r.clockOut}</td>
                                  <td className="py-1 px-2 text-right font-mono font-bold text-primary">{r.totalHours}h</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Timesheets Mini Table */}
                    <div>
                      <span className="font-bold text-[11px] text-foreground flex items-center gap-1 mb-1.5">
                        <i className="fa-solid fa-list-check text-xs text-emerald-500" /> Project Timesheet Tasks:
                      </span>
                      {timesheetData.records.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic py-1">No project timesheet records logged for this period.</p>
                      ) : (
                        <div className="max-h-36 overflow-y-auto border border-border rounded-lg">
                          <table className="w-full text-[11px]">
                            <thead className="bg-muted/60 sticky top-0 text-muted-foreground">
                              <tr>
                                <th className="py-1 px-2 text-left">Date</th>
                                <th className="py-1 px-2 text-left">Project / Task</th>
                                <th className="py-1 px-2 text-right">Logged</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {timesheetData.records.map((e, i) => (
                                <tr key={i} className="hover:bg-muted/20">
                                  <td className="py-1 px-2 font-mono font-medium">{e.date}</td>
                                  <td className="py-1 px-2">
                                    <strong className="text-foreground">{e.projectName}:</strong> {e.taskDescription || "General task"}
                                  </td>
                                  <td className="py-1 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{e.hours}h</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tax Rate (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={invoiceFormData.taxRate}
                  onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, taxRate: Number(e.target.value) }))}
                />
              </div>

              {/* Calculated Breakdown Card */}
              <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2 text-xs">
                {invoiceFormData.rateType === "hourly" && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Regular Hours ({regHours}h @ {currSymbol}{hRate}/h):</span>
                      <span className="font-mono">{currSymbol}{(regHours * hRate).toLocaleString()}</span>
                    </div>
                    {otHours > 0 && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400">
                        <span>Overtime 1.5x ({otHours}h @ {currSymbol}{hRate * 1.5}/h):</span>
                        <span className="font-mono">{currSymbol}{(otHours * hRate * 1.5).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-foreground font-semibold">
                      <span><i className="fa-solid fa-clock mr-1 text-primary" />Total Worked Hours:</span>
                      <span className="font-mono">{formatHoursMinutes(regHours + otHours)}</span>
                    </div>
                  </>
                )}

                {invoiceFormData.rateType === "daily" && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Daily Billing ({dWorked} days @ {currSymbol}{dRate}/day):</span>
                      <span className="font-mono">{currSymbol}{(dWorked * dRate).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-foreground font-semibold">
                      <span><i className="fa-solid fa-calendar-check mr-1 text-primary" />Total Billable Days:</span>
                      <span className="font-mono">{dWorked} days</span>
                    </div>
                  </>
                )}

                {invoiceFormData.rateType === "project" && (
                  <>
                    <div className="space-y-1">
                      {effectiveProjects.map((p, i) => (
                        <div key={p.id || i} className="flex justify-between text-muted-foreground text-xs">
                          <span className="truncate max-w-[220px]">
                            <i className="fa-solid fa-diagram-project mr-1 text-[10px] text-primary" />
                            {p.name || `Project Milestone #${i + 1}`}:
                          </span>
                          <span className="font-mono font-medium">{currSymbol}{(Number(p.amount) || 0).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-foreground font-semibold pt-1 border-t border-border/40">
                      <span><i className="fa-solid fa-briefcase mr-1 text-primary" />Total Projects Fee ({effectiveProjects.length}):</span>
                      <span className="font-mono">{currSymbol}{totalProjAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}

                {taxPct > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax ({taxPct}%):</span>
                    <span className="font-mono">{currSymbol}{taxVal.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-border/60 text-sm font-bold">
                  <span className="text-foreground">Total Invoice Amount:</span>
                  <span className="text-base font-mono text-primary">{currSymbol}{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">Billed To (Company / Entity)</label>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <i className="fa-solid fa-lock text-[9px]" /> Auto-detected &amp; Locked
                  </span>
                </div>
                <Input
                  type="text"
                  readOnly
                  disabled
                  value={invoiceFormData.billedToName}
                  className="opacity-85 cursor-not-allowed bg-muted/40 font-medium select-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handlePrintPDF()}
                  className="cursor-pointer gap-2 font-semibold h-10 px-4 border-rose-500/30 hover:border-rose-500 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10"
                >
                  <i className="fa-solid fa-file-pdf text-sm" /> Export PDF Draft
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="sm"
                  disabled={invoiceSubmitting}
                  className="cursor-pointer gap-2 font-semibold h-10 px-5"
                >
                  {invoiceSubmitting ? (
                    <><i className="fa-solid fa-spinner fa-spin text-sm" /> Generating &amp; Submitting...</>
                  ) : (
                    <><i className="fa-solid fa-paper-plane text-sm" /> Generate &amp; Submit Invoice</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Personal Invoices Tracker History */}
        <Card className="border border-border shadow-sm flex flex-col h-full min-h-[500px]">
          <CardHeader className="pb-3 border-b border-border bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-primary" /> My Submitted Invoices
            </CardTitle>
            <CardDescription>
              Track approval statuses and download PDFs of your generated invoices.
            </CardDescription>
          </CardHeader>

          {/* Filter Bar */}
          <div className="p-3 border-b border-border bg-card/50 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 text-[11px] bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
            >
              <option value="All">All Invoices</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Sent">Sent</option>
              <option value="Draft">Draft</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <CardContent className="p-4 flex-1 flex flex-col justify-between">
            {loadingHistory ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex-1 flex items-center justify-center">
                <span>
                  <i className="fa-solid fa-spinner fa-spin mr-1.5 text-primary" /> Loading history...
                </span>
              </div>
            ) : filteredPersonalInvoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground flex-1 flex items-center justify-center">
                <div>
                  <i className="fa-solid fa-file-invoice text-2xl block opacity-30 mb-1.5" />
                  No matching invoices found.
                </div>
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {paginatedInvoices.map((inv) => {
                  const curr = inv.currency === "EUR" ? "€" : inv.currency === "GBP" ? "£" : inv.currency === "INR" ? "₹" : "$";
                  return (
                    <div key={inv._id || inv.id} className="rounded-xl border border-border/80 overflow-hidden">
                      <div
                        className="p-3 bg-muted/20 hover:bg-muted/30 flex items-center justify-between gap-3 text-xs transition-colors cursor-default"
                      >
                        <div className="space-y-1.5 truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary">{inv.invoiceNo}</span>
                            {getStatusBadge(inv.status)}
                            {inv.status === "Paid" && inv.paymentDetails?.method && (
                              <span className={cn(
                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border",
                                inv.paymentDetails.method === "UPI"
                                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
                                  : inv.paymentDetails.method === "Cash"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                              )}>
                                <i className={cn(
                                  "fa-solid text-[9px]",
                                  inv.paymentDetails.method === "UPI" ? "fa-qrcode" :
                                  inv.paymentDetails.method === "Cash" ? "fa-money-bill-transfer" :
                                  "fa-building-columns"
                                )} />
                                {inv.paymentDetails.method}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            Billed to: <strong className="text-foreground">{inv.billedToName}</strong>
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {inv.status === "Paid" ? (
                              <span className="text-emerald-500 font-semibold">
                                Paid: {inv.paymentDetails?.paidAt ? new Date(inv.paymentDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : inv.invoiceDate}
                              </span>
                            ) : (
                              <span>Due: {inv.dueDate}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-1.5">
                          <div className="font-mono font-extrabold text-foreground text-sm">
                            {curr}{inv.total.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setViewInvoice(inv)}
                              className="h-6 w-6 p-0 cursor-pointer text-muted-foreground hover:text-primary"
                              title="View details"
                            >
                              <i className="fa-solid fa-eye text-[10px]" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintPDF(inv)}
                              className="h-6 w-6 p-0 cursor-pointer text-rose-500 border-rose-500/10 hover:border-rose-500/40 bg-rose-500/5"
                              title="Export PDF"
                            >
                              <i className="fa-solid fa-file-pdf text-[10px]" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Payment Receipt strip — only for paid invoices with payment details */}
                      {inv.status === "Paid" && inv.paymentDetails && (
                        <div className="px-3 py-2.5 bg-emerald-500/5 border-t border-emerald-500/15 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                            <i className="fa-solid fa-circle-check shrink-0" />
                            <span className="font-semibold">
                              Paid via {inv.paymentDetails.method}
                              {inv.paymentDetails.upiId && (
                                <span className="ml-1.5 font-mono text-violet-600 dark:text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded-full border border-violet-500/20 text-[10px]">
                                  <i className="fa-solid fa-qrcode mr-1 text-[9px]" />{inv.paymentDetails.upiId}
                                </span>
                              )}
                              {inv.paymentDetails.paidAt && (
                                <span className="ml-1 text-muted-foreground font-mono">
                                  · Paid on {new Date(inv.paymentDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </span>
                              )}
                              {inv.paymentDetails.transactionId && (
                                <span className="ml-1 text-muted-foreground font-mono">
                                  · Txn: {inv.paymentDetails.transactionId}
                                </span>
                              )}
                            </span>
                          </div>
                          {inv.paymentDetails.screenshotUrl && (
                            <a
                              href={inv.paymentDetails.screenshotUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline shrink-0"
                              title={inv.paymentDetails.screenshotFileName || "View payment receipt"}
                            >
                              <i className="fa-solid fa-receipt text-[10px]" />
                              View Receipt
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {!loadingHistory && filteredPersonalInvoices.length > 0 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60 text-[11px] font-semibold text-muted-foreground">
                <span>
                  Page <strong className="text-foreground">{currentPage}</strong> of <strong className="text-foreground">{totalPages}</strong> ({filteredPersonalInvoices.length} total)
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2 text-[10px] font-bold cursor-pointer"
                  >
                    <i className="fa-solid fa-chevron-left mr-1" /> Prev
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 px-2 text-[10px] font-bold cursor-pointer"
                  >
                    Next <i className="fa-solid fa-chevron-right ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
