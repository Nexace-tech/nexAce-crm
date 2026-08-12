"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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

export function SelfServiceInvoiceTab({ showToast }: SelfServiceInvoiceTabProps) {
  const { user } = useAuth();
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // Filter & Pagination States
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [invoiceFormData, setInvoiceFormData] = useState({
    employeeName: user?.name || "",
    role: user?.role || "Consultant",
    hourlyRate: 50,
    hoursWorked: 160,
    overtimeHours: 0,
    taxRate: 0,
    currency: "INR",
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    description: "Professional Services & Consulting Fee",
    billedToName: "Ace Consultancys",
    billedToAddress: "Headquarters - 100 Innovation Way, Suite 400",
    billedToEmail: "finance@aceconsultancys.com",
    notes: "",
  });

  const fetchMyInvoiceHistory = async () => {
    if (!user?.email) return;
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/it/invoices");
      if (res.ok) {
        const data = await res.json();
        const allInvoices: Invoice[] = data.invoices || [];
        // Filter by current logged-in employee's email or name match
        const filtered = allInvoices.filter(
          (inv) =>
            inv.businessEmail?.trim().toLowerCase() === user.email?.trim().toLowerCase() ||
            inv.customerNo?.trim().toLowerCase().includes(user.name?.replace(/\s+/g, "").toLowerCase() || "")
        );
        setMyInvoices(filtered);
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
      setInvoiceFormData((prev) => ({
        ...prev,
        employeeName: prev.employeeName || user.name || "",
        role: prev.role === "Consultant" && user.role ? user.role : prev.role || user.role || "Consultant",
      }));
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
      const unitPrice = Number(invoiceFormData.hourlyRate) || 0;
      const subtotalVal = regHours * unitPrice + otHours * (unitPrice * 1.5);
      const taxRateVal = Number(invoiceFormData.taxRate) || 0;
      const taxAmountVal = (subtotalVal * taxRateVal) / 100;
      const totalVal = subtotalVal + taxAmountVal;
      const invoiceNo = `INV-EMP-${Date.now().toString().slice(-6)}`;

      const items = [
        {
          description: `${invoiceFormData.description} (Regular Hours) [${invoiceFormData.period}]`,
          quantity: regHours,
          unitPrice,
          amount: regHours * unitPrice,
        },
      ];

      if (otHours > 0) {
        items.push({
          description: `Overtime Hours (1.5x Rate) [${invoiceFormData.period}]`,
          quantity: otHours,
          unitPrice: unitPrice * 1.5,
          amount: otHours * (unitPrice * 1.5),
        });
      }

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
          notes: invoiceFormData.notes,
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

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Pop-up blocker is preventing export. Please allow popups.", "error");
      return;
    }

    const itemsListHtml = isDraft
      ? `
        <tr>
          <td>${invoiceFormData.description} (Regular Hours) [${invoiceFormData.period}]</td>
          <td class="text-center">${regHours}</td>
          <td class="text-right">${symbol}${rate.toLocaleString()}</td>
          <td class="text-right" style="font-weight: bold;">${symbol}${(regHours * rate).toLocaleString()}</td>
        </tr>
        ${
          otHours > 0
            ? `
          <tr>
            <td>Overtime Hours (1.5x Rate) [${invoiceFormData.period}]</td>
            <td class="text-center">${otHours}</td>
            <td class="text-right">${symbol}${(rate * 1.5).toLocaleString()}</td>
            <td class="text-right" style="font-weight: bold;">${symbol}${(otHours * rate * 1.5).toLocaleString()}</td>
          </tr>
        `
            : ""
        }
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
          notesVal
            ? `
          <div class="notes-section">
            <strong>Additional Notes:</strong>
            <p style="margin-top: 5px; white-space: pre-wrap;">${notesVal}</p>
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
  const rate = Number(invoiceFormData.hourlyRate) || 0;
  const subtotal = regHours * rate + otHours * (rate * 1.5);
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
                  <label className="font-semibold text-foreground">Employee Name *</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. David Kim"
                    value={invoiceFormData.employeeName}
                    readOnly
                    disabled
                    className="opacity-70 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Role / Designation</label>
                  <Input
                    type="text"
                    placeholder="e.g. Senior Fullstack Engineer"
                    value={invoiceFormData.role}
                    readOnly
                    disabled
                    className="opacity-70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1 sm:col-span-1">
                  <label className="font-semibold text-foreground">Currency</label>
                  <select
                    value={invoiceFormData.currency}
                    onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, currency: e.target.value }))}
                    className="w-full h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AED">AED (Dh)</option>
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
                  <label className="font-semibold text-foreground">Regular Hours</label>
                  <Input
                    type="number"
                    required
                    min="1"
                    placeholder="160"
                    value={invoiceFormData.hoursWorked}
                    onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, hoursWorked: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="font-semibold text-foreground">Overtime Hrs (1.5x)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={invoiceFormData.overtimeHours}
                    onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, overtimeHours: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Billing Month / Period</label>
                  <Input
                    type="month"
                    required
                    value={invoiceFormData.period}
                    onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, period: e.target.value }))}
                  />
                </div>
              </div>

              {/* Calculated Breakdown Card */}
              <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Regular Hours ({regHours}h @ {currSymbol}{rate}/h):</span>
                  <span className="font-mono">{currSymbol}{(regHours * rate).toLocaleString()}</span>
                </div>
                {otHours > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Overtime 1.5x ({otHours}h @ {currSymbol}{rate * 1.5}/h):</span>
                    <span className="font-mono">{currSymbol}{(otHours * rate * 1.5).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-foreground font-semibold">
                  <span><i className="fa-solid fa-clock mr-1 text-primary" />Total Worked Hours:</span>
                  <span className="font-mono">{formatHoursMinutes(regHours + otHours)}</span>
                </div>
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
                <label className="font-semibold text-foreground">Billed To (Company / Entity)</label>
                <Input
                  type="text"
                  value={invoiceFormData.billedToName}
                  onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, billedToName: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Description of Work</label>
                <Input
                  type="text"
                  placeholder="e.g. Fullstack engineering & consulting retainer"
                  value={invoiceFormData.description}
                  onChange={(e) => setInvoiceFormData((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Additional Notes</label>
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

      {/* View Details Modal for Employee */}
      {viewInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setViewInvoice(null)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <i className="fa-solid fa-file-invoice text-primary" /> Invoice {viewInvoice.invoiceNo}
                </h2>
                <p className="text-[11px] text-muted-foreground">Issued: {viewInvoice.invoiceDate} • Due: {viewInvoice.dueDate}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewInvoice(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-2.5 bg-muted/30 rounded-lg border border-border space-y-0.5">
                <span className="font-bold text-muted-foreground uppercase text-[9px]">From:</span>
                <p className="font-bold text-foreground">{viewInvoice.businessName}</p>
                <p className="text-[11px] text-muted-foreground">{viewInvoice.businessAddress}</p>
              </div>

              <div className="p-2.5 bg-muted/30 rounded-lg border border-border space-y-0.5">
                <span className="font-bold text-muted-foreground uppercase text-[9px]">Billed To:</span>
                <p className="font-bold text-foreground">{viewInvoice.billedToName}</p>
                <p className="text-[11px] text-muted-foreground">{viewInvoice.billedToAddress}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-1.5">
              <span className="font-bold text-foreground text-xs">Line Items</span>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 font-bold text-muted-foreground uppercase text-[9px]">
                    <tr>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-center">Qty / Hours</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viewInvoice.items.map((item, idx) => {
                      const curr = viewInvoice.currency === "EUR" ? "€" : viewInvoice.currency === "GBP" ? "£" : viewInvoice.currency === "INR" ? "₹" : "$";
                      return (
                        <tr key={idx}>
                          <td className="py-2 px-3">{item.description}</td>
                          <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold">{curr}{item.amount.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Calculation Card */}
            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1 text-xs">
              <div className="flex justify-between items-center font-bold text-sm">
                <span className="text-foreground">Total Invoice Amount:</span>
                <span className="text-base font-mono text-primary">
                  {(viewInvoice.currency === "EUR" ? "€" : viewInvoice.currency === "GBP" ? "£" : viewInvoice.currency === "INR" ? "₹" : "$")}{viewInvoice.total.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div>{getStatusBadge(viewInvoice.status)}</div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => handlePrintPDF(viewInvoice)}
                  className="gap-1.5 text-xs font-semibold h-8 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
                >
                  <i className="fa-solid fa-file-pdf text-xs" /> Print PDF
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setViewInvoice(null)} className="cursor-pointer">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
