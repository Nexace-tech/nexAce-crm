"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { InvoiceDetailsView } from "@/components/finance/InvoiceDetailsView";

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
    // Project-Based Fixed Fee
    projectName: "Fullstack Architecture & Feature Delivery",
    projectFixedAmount: 5000,
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
          let hrs = Number(r.totalHours) || 0;
          if (hrs === 0 && r.clockIn && !r.clockOut) {
            const diffMs = Math.max(0, Date.now() - new Date(r.clockIn).getTime());
            hrs = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
          }
          return sum + hrs;
        }, 0);

        calculatedDaysCount = periodAtt.filter((r) => (Number(r.totalHours) || 0) > 0 || r.clockIn).length;
        const standardCap = calculatedDaysCount * 8;
        calculatedOtHrs = Math.max(0, calculatedShiftHrs - standardCap);

        setShiftData({
          totalHours: Math.round(calculatedShiftHrs * 10) / 10,
          daysWorked: calculatedDaysCount,
          overtimeHours: Math.round(calculatedOtHrs * 10) / 10,
          records: periodAtt.map((r) => {
            let recordHrs = Number(r.totalHours) || 0;
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

        setMyInvoices(filtered.length > 0 ? filtered : allInvoices);
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
      const projAmount = Number(invoiceFormData.projectFixedAmount) || 0;

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
        subtotalVal = projAmount;
        items.push({
          description: `${invoiceFormData.projectName || invoiceFormData.description} (Project Fixed Milestone) [${invoiceFormData.period}]`,
          quantity: 1,
          unitPrice: projAmount,
          amount: projAmount,
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
    const symbol = curr === "EUR" ? "€" : curr === "GBP" ? "£" : curr === "INR" ? "₹" : "$";

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

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Pop-up blocker is preventing export. Please allow popups.", "error");
      return;
    }

    const itemsListHtml = isDraft
      ? invoiceFormData.rateType === "hourly"
        ? `
          <tr>
            <td>${invoiceFormData.description} (Regular Hours) [${invoiceFormData.period}]</td>
            <td class="text-center">${regHours}</td>
            <td class="text-right">${symbol}${hRate.toLocaleString()}</td>
            <td class="text-right" style="font-weight: bold;">${symbol}${(regHours * hRate).toLocaleString()}</td>
          </tr>
          ${
            otHours > 0
              ? `
            <tr>
              <td>Overtime Hours (1.5x Rate) [${invoiceFormData.period}]</td>
              <td class="text-center">${otHours}</td>
              <td class="text-right">${symbol}${(hRate * 1.5).toLocaleString()}</td>
              <td class="text-right" style="font-weight: bold;">${symbol}${(otHours * hRate * 1.5).toLocaleString()}</td>
            </tr>
          `
              : ""
          }
        `
        : invoiceFormData.rateType === "daily"
        ? `
          <tr>
            <td>${invoiceFormData.description} (Daily Rate: ${dWorked} days) [${invoiceFormData.period}]</td>
            <td class="text-center">${dWorked}</td>
            <td class="text-right">${symbol}${dRate.toLocaleString()}</td>
            <td class="text-right" style="font-weight: bold;">${symbol}${(dWorked * dRate).toLocaleString()}</td>
          </tr>
        `
        : `
          <tr>
            <td>${invoiceFormData.projectName || invoiceFormData.description} (Project Fixed Fee) [${invoiceFormData.period}]</td>
            <td class="text-center">1</td>
            <td class="text-right">${symbol}${projAmount.toLocaleString()}</td>
            <td class="text-right" style="font-weight: bold;">${symbol}${projAmount.toLocaleString()}</td>
          </tr>
        `
      : invoiceToPrint.items
          .map(
            (item) => `
        <tr>
          <td>${item.description}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">${symbol}${item.unitPrice.toLocaleString()}</td>
          <td class="text-right" style="font-weight: bold;">${symbol}${item.amount.toLocaleString()}</td>
        </tr>
      `
          )
          .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invNo}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            margin: 20mm;
            color: #333;
            background-color: #fff;
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #0d9488;
          }
          .invoice-details {
            text-align: right;
            font-size: 14px;
          }
          .grid-addresses {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          .address-box {
            background-color: #fcfcfc;
            border: 1px solid #f0f0f0;
            padding: 20px;
            border-radius: 8px;
          }
          .address-title {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: bold;
            color: #666;
            margin-bottom: 8px;
          }
          .address-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .address-text {
            font-size: 13px;
            color: #555;
            line-height: 1.5;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f9f9f9;
            border-bottom: 2px solid #eee;
            padding: 12px;
            font-size: 12px;
            text-transform: uppercase;
            font-weight: bold;
            color: #555;
          }
          td {
            border-bottom: 1px solid #eee;
            padding: 12px;
            font-size: 13px;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .totals-section {
            float: right;
            width: 300px;
            margin-bottom: 40px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-bottom: 8px;
          }
          .grand-total {
            border-top: 1.5px solid #eee;
            padding-top: 10px;
            font-size: 16px;
            font-weight: bold;
            color: #0d9488;
          }
          .notes-section {
            clear: both;
            border-top: 1px solid #eee;
            padding-top: 20px;
            font-size: 12px;
            color: #666;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div>
            <div class="invoice-title">NEXACE</div>
            <div style="font-size: 13px; color: #666; margin-top: 5px;">Invoice Statement</div>
          </div>
          <div class="invoice-details">
            <div style="font-weight: bold; font-size: 16px;">Invoice #: ${invNo}</div>
            <div style="margin-top: 5px;">Date: ${date}</div>
            <div>Due Date: ${dueDateVal}</div>
            <div>Status: ${statusVal}</div>
          </div>
        </div>

        <div class="grid-addresses">
          <div class="address-box">
            <div class="address-title">From:</div>
            <div class="address-name">${fromName}</div>
            <div class="address-text">${fromAddress}</div>
            <div class="address-text" style="font-family: monospace;">${fromEmail}</div>
          </div>
          <div class="address-box">
            <div class="address-title">To:</div>
            <div class="address-name">${toName}</div>
            <div class="address-text">${toAddress}</div>
            <div class="address-text" style="font-family: monospace;">${toEmail}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center" style="width: 100px;">Qty / Hours</th>
              <th class="text-right" style="width: 120px;">Rate</th>
              <th class="text-right" style="width: 150px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsListHtml}
        </table>

        <div class="totals-section">
          <div class="totals-row">
            <span>Total Worked Hours:</span>
            <span style="font-family: monospace; font-weight: bold;">${formatHoursMinutes(isDraft ? regHours + otHours : (invoiceToPrint?.items || []).reduce((acc, item) => acc + item.quantity, 0))}</span>
          </div>
          <div class="totals-row">
            <span>Subtotal:</span>
            <span style="font-family: monospace;">${symbol}${subtotalVal.toLocaleString()}</span>
          </div>
          ${
            taxRateVal > 0
              ? `
            <div class="totals-row">
              <span>Tax (${taxRateVal}%):</span>
              <span style="font-family: monospace;">${symbol}${taxAmountVal.toLocaleString()}</span>
            </div>
          `
              : ""
          }
          <div class="totals-row grand-total">
            <span>Grand Total:</span>
            <span style="font-family: monospace;">${symbol}${grandTotalVal.toLocaleString()}</span>
          </div>
        </div>

        ${
          finalNotesToPrint
            ? `
          <div class="notes-section">
            <strong>Notes &amp; Attachments:</strong>
            <p style="margin-top: 5px; white-space: pre-wrap;">${finalNotesToPrint}</p>
          </div>
        `
            : ""
        }

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const regHours = Number(invoiceFormData.hoursWorked) || 0;
  const otHours = Number(invoiceFormData.overtimeHours) || 0;
  const hRate = Number(invoiceFormData.hourlyRate) || 0;
  const dRate = Number(invoiceFormData.dailyRate) || 0;
  const dWorked = Number(invoiceFormData.daysWorked) || 0;
  const projAmount = Number(invoiceFormData.projectFixedAmount) || 0;

  const subtotal =
    invoiceFormData.rateType === "hourly"
      ? regHours * hRate + otHours * (hRate * 1.5)
      : invoiceFormData.rateType === "daily"
      ? dWorked * dRate
      : projAmount;

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
    const colors: Record<string, string> = {
      Paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      Sent: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      Draft: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      Overdue: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      Cancelled: "bg-slate-500/10 text-slate-500 border-slate-500/20 line-through",
    };
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border", colors[status] || "bg-muted text-muted-foreground")}>
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
                    <label className="font-semibold text-foreground">Project / Milestone Fee</label>
                    <Input
                      type="number"
                      required
                      min="0"
                      placeholder="5000"
                      value={invoiceFormData.projectFixedAmount}
                      onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, projectFixedAmount: Number(e.target.value) }))}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-1">
                    <label className="font-semibold text-foreground">Project / Scope Title</label>
                    <Input
                      type="text"
                      required
                      placeholder="e.g. Backend API Migration"
                      value={invoiceFormData.projectName}
                      onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, projectName: e.target.value }))}
                    />
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
                    <div className="flex justify-between text-muted-foreground">
                      <span>Project Milestone Scope:</span>
                      <span className="font-semibold text-foreground truncate max-w-[200px]">{invoiceFormData.projectName || "Fixed Deliverable"}</span>
                    </div>
                    <div className="flex justify-between text-foreground font-semibold">
                      <span><i className="fa-solid fa-briefcase mr-1 text-primary" />Project Base Fee:</span>
                      <span className="font-mono">{currSymbol}{projAmount.toLocaleString()}</span>
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

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">Description of Work</label>
                  <button
                    type="button"
                    onClick={() => setInvoiceFormData((prev) => ({ ...prev, description: generateDefaultDescription(user?.role, user?.department, prev.startDate, prev.endDate) }))}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder="e.g. Fullstack engineering & consulting retainer"
                  value={invoiceFormData.description}
                  onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">Additional Notes</label>
                  <button
                    type="button"
                    onClick={() => setInvoiceFormData((prev) => ({ ...prev, notes: generateDefaultNotes(prev.startDate, prev.endDate) }))}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    Reset to Default
                  </button>
                </div>
                <Input
                  type="text"
                  placeholder="e.g. Bank transfer details, project references..."
                  value={invoiceFormData.notes}
                  onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, notes: e.target.value }))}
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
                    <div
                      key={inv._id || inv.id}
                      className="p-3 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/80 flex items-center justify-between gap-3 text-xs transition-colors"
                    >
                      <div className="space-y-1.5 truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{inv.invoiceNo}</span>
                          {getStatusBadge(inv.status)}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          Billed to: <strong className="text-foreground">{inv.billedToName}</strong>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground">
                          Due: {inv.dueDate}
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
