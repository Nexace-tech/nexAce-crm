"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { downloadElementAsPdf } from "@/lib/invoice-dom-pdf";

export interface InvoiceDetailsItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceDetailsData {
  _id?: string;
  id?: string;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerNo?: string;
  businessName: string;
  businessAddress?: string;
  businessEmail?: string;
  billedToName: string;
  billedToAddress?: string;
  billedToEmail?: string;
  shipToAddress?: string;
  items: InvoiceDetailsItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount?: number;
  total: number;
  currency: string;
  status: "Draft" | "Sent" | "Pending" | "Paid" | "Overdue" | "Archived" | "Cancelled";
  notes?: string;
  paymentTerms?: string;
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifscCode?: string;
    branch?: string;
    upiId?: string;
  };
  shiftAttendance?: {
    totalHours: number;
    daysWorked: number;
    overtimeHours: number;
    records: Array<{
      date: string;
      clockIn: string;
      clockOut: string;
      totalHours: number;
      status: string;
    }>;
  } | null;
  timesheetEntries?: {
    totalHours: number;
    totalEntries: number;
    records: Array<{
      date: string;
      hours: number;
      projectName: string;
      taskDescription: string;
      billable: boolean;
    }>;
  } | null;
  paymentDetails?: {
    method: "Bank Transfer" | "UPI" | "Cash";
    upiId?: string;
    transactionId?: string;
    screenshotUrl?: string;
    screenshotFileName?: string;
    paidAt?: string;
  };
  signatureUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface InvoiceDetailsViewProps {
  invoice: InvoiceDetailsData;
  onClose?: () => void;
  onStatusChange?: (newStatus: string) => void;
  onPaymentConfirm?: () => void; // intercepts "Paid" selection to open payment modal
  isUpdatingStatus?: boolean;
}

function numberToWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero";

  const numStr = Math.floor(Math.abs(num)).toString();
  if (numStr.length > 9) return "Amount exceeds range";

  const n = ("000000000" + numStr).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";

  let str = "";
  str += Number(n[1]) !== 0 ? (a[Number(n[1])] || b[Number(n[1][0])] + " " + a[Number(n[1][1])]) + " Crore " : "";
  str += Number(n[2]) !== 0 ? (a[Number(n[2])] || b[Number(n[2][0])] + " " + a[Number(n[2][1])]) + " Lakh " : "";
  str += Number(n[3]) !== 0 ? (a[Number(n[3])] || b[Number(n[3][0])] + " " + a[Number(n[3][1])]) + " Thousand " : "";
  str += Number(n[4]) !== 0 ? (a[Number(n[4])] || b[Number(n[4][0])] + " " + a[Number(n[4][1])]) + " Hundred " : "";
  str += Number(n[5]) !== 0 ? ((str !== "" ? "and " : "") + (a[Number(n[5])] || b[Number(n[5][0])] + " " + a[Number(n[5][1])]) + " ") : "";

  return str.trim() + " Only";
}

export function InvoiceDetailsView({
  invoice,
  onClose,
  onStatusChange,
  onPaymentConfirm,
  isUpdatingStatus = false,
}: InvoiceDetailsViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>("");
  const [companySignatureUrl, setCompanySignatureUrl] = useState<string>("");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/settings/company")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.company) {
          if (data.company.logoUrl) setCompanyLogoUrl(data.company.logoUrl);
          if (data.company.signatureUrl) setCompanySignatureUrl(data.company.signatureUrl);
        }
      })
      .catch(() => {});
  }, []);

  const getCurrencySymbol = (curr: string = "INR") => {
    switch (curr?.toUpperCase()) {
      case "USD": return "$";
      case "EUR": return "€";
      case "GBP": return "£";
      case "AED": return "AED ";
      case "INR":
      default:
        return "₹";
    }
  };

  const symbol = getCurrencySymbol(invoice.currency);

  const headerSubtitle = invoice.businessAddress?.trim()
    ? invoice.businessAddress.trim()
    : invoice.businessName && !invoice.businessName.toLowerCase().includes("nexace")
    ? "Professional Services & Consulting"
    : "CRM & Enterprise Solutions";

  const isEmployeeInvoice =
    (invoice.invoiceNo && invoice.invoiceNo.startsWith("INV-SAL")) ||
    (invoice.customerNo && (invoice.customerNo.startsWith("EMP-") || invoice.customerNo.includes("SAL"))) ||
    Boolean((invoice as any).businessSubtitle && (invoice as any).businessSubtitle.toUpperCase().includes("EMPLOYEE"));

  const signatoryEntity = isEmployeeInvoice
    ? (invoice.billedToName || "Nex Ace")
    : (invoice.businessName || "NexAce Technologies");

  const displaySignature = isEmployeeInvoice
    ? companySignatureUrl
    : (companySignatureUrl || invoice.signatureUrl);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { style: string; label: string }> = {
      Paid: { style: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700", label: "PAID IN FULL" },
      Pending: { style: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/80 dark:border-amber-700", label: "PENDING" },
      Sent: { style: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300/80 dark:border-sky-700", label: "SENT" },
      Draft: { style: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700", label: "DRAFT" },
      Overdue: { style: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/80 dark:border-rose-700", label: "OVERDUE" },
      Cancelled: { style: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 line-through", label: "CANCELLED" },
      Archived: { style: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300/80 dark:border-purple-700", label: "ARCHIVED" },
    };
    const c = config[status] || { style: "bg-muted text-muted-foreground border-border", label: status.toUpperCase() };
    return (
      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border shadow-2xs", c.style)}>
        {c.label}
      </span>
    );
  };

  const formatSignatoryName = (raw: string) => {
    if (!raw) return "NexAce";
    const first = raw.trim().split(" ")[0] || "NexAce";
    if (first.toUpperCase() === "NEXACE") return "NexAce";
    if (first === first.toUpperCase()) {
      return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
    }
    return first;
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${invoice.invoiceNo}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Dancing+Script:wght@500;600;700&family=Great+Vibes&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          * { box-sizing: border-box; }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 4mm;
            font-size: 11.5px;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-card {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 28px 32px;
            max-width: 820px;
            margin: 0 auto;
            position: relative;
            background: #ffffff;
          }
          .top-accent {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 4px;
            background: linear-gradient(90deg, #10b981 0%, #14b8a6 50%, #0ea5e9 100%);
            border-radius: 16px 16px 0 0;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 20px;
            margin-bottom: 20px;
            border-bottom: 1px solid #f1f5f9;
          }
          .brand-row { display: flex; align-items: center; gap: 14px; }
          .brand-logo-img {
            width: 48px; height: 48px; object-fit: contain;
            border-radius: 12px; border: 1px solid #e2e8f0; padding: 2px;
          }
          .brand-logo-box {
            width: 46px; height: 46px; border-radius: 50%;
            background: #f0fdfa; border: 2px solid #14b8a6;
            display: flex; align-items: center; justify-content: center;
            color: #0f172a; font-weight: 900; font-size: 13px;
            letter-spacing: 0.05em;
          }
          .brand-name { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; }
          .brand-subtitle { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
          .header-box {
            background: #f8fafc; border: 1px solid #e2e8f0;
            border-radius: 10px; padding: 8px 14px;
            display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
            min-width: 220px;
          }
          .ci-label { font-size: 8.5px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; }
          .inv-number { font-size: 15px; font-weight: 900; color: #0f172a; font-family: ui-monospace, monospace; }
          .status-badge {
            display: inline-flex; align-items: center; gap: 4px;
            padding: 2px 9px; border-radius: 999px;
            font-size: 9.5px; font-weight: 800; border: 1px solid;
          }
          .appr-line { font-size: 9.5px; font-weight: 700; color: #059669; }
          .ref-line { font-size: 9.5px; color: #64748b; }
          .ref-line strong { color: #0f172a; font-family: ui-monospace, monospace; }

          /* 3-Column Flat Info Section matching PDF */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 22px;
          }
          .info-col {
            display: flex;
            flex-direction: column;
          }
          .info-col-header {
            font-size: 10px; font-weight: 800; color: #94a3b8;
            text-transform: uppercase; letter-spacing: 0.08em;
            margin-bottom: 8px;
          }
          .info-row {
            display: flex; justify-content: flex-start; align-items: center; gap: 8px;
            font-size: 10.5px; padding: 2px 0;
          }
          .info-label { color: #64748b; width: 65px; flex-shrink: 0; }
          .info-val { font-weight: 700; color: #0f172a; font-family: ui-monospace, monospace; }
          .info-val-em { font-weight: 700; color: #059669; font-family: ui-monospace, monospace; }
          .party-name { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 3px; }
          .party-addr { font-size: 10.5px; color: #64748b; line-height: 1.45; white-space: pre-line; }
          .party-email {
            font-size: 10.5px; color: #0284c7; font-family: ui-monospace, monospace;
            margin-top: 4px; display: flex; align-items: center; gap: 5px;
          }

          /* Table section */
          .table-header-row {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 8px;
          }
          .table-title {
            display: flex; align-items: center; gap: 7px;
            font-size: 11px; font-weight: 800; color: #0f172a;
            text-transform: uppercase; letter-spacing: 0.06em;
          }
          .table-title i { color: #0d9488; }
          .item-count { font-size: 10px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 999px; }
          .items-table {
            width: 100%; border-collapse: separate; border-spacing: 0;
            border: 1px solid #e2e8f0; border-radius: 12px;
            overflow: hidden; margin-bottom: 22px;
          }
          .items-table thead th {
            background: #f1f5f9; border-bottom: 1px solid #e2e8f0;
            padding: 10px 14px; font-size: 10px; font-weight: 800;
            text-transform: uppercase; color: #475569; letter-spacing: 0.06em;
          }
          .items-table tbody td {
            padding: 12px 14px; border-bottom: 1px solid #f1f5f9;
            font-size: 11.5px; color: #334155;
          }
          .items-table tbody tr:nth-child(even) td { background: #fafafa; }
          .items-table tbody tr:last-child td { border-bottom: none; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }

          /* Bottom 2-col */
          .bottom-grid {
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 16px; margin-bottom: 22px; align-items: start;
          }
          .settle-card {
            border-radius: 12px; border: 1px solid;
            padding: 14px 16px;
          }
          .settle-card-paid { background: rgba(16, 185, 129, 0.04); border-color: rgba(16, 185, 129, 0.25); }
          .settle-card-unpaid { background: #f8fafc; border-color: #e2e8f0; }
          .settle-header {
            display: flex; justify-content: space-between; align-items: center;
            margin-bottom: 10px; padding-bottom: 6px;
            border-bottom: 1px solid rgba(0,0,0,0.06);
          }
          .settle-title-text {
            display: flex; align-items: center; gap: 6px;
            font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
          }
          .settle-badge {
            font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px;
            text-transform: uppercase; letter-spacing: 0.05em;
          }

          .summary-card {
            border-radius: 12px; background: #f8fafc;
            border: 1px solid #e2e8f0; padding: 14px 16px;
          }
          .summary-header {
            display: flex; align-items: center; gap: 6px;
            font-size: 10.5px; font-weight: 800; color: #0f172a;
            text-transform: uppercase; letter-spacing: 0.06em;
            margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0;
          }
          .summary-header i { color: #0d9488; }
          .summary-row {
            display: flex; justify-content: space-between; align-items: center;
            font-size: 11px; padding: 3px 0; color: #64748b;
          }
          .summary-row strong { color: #0f172a; font-family: ui-monospace, monospace; }
          .total-row {
            display: flex; justify-content: space-between; align-items: baseline;
            margin-top: 8px; padding-top: 8px;
            border-top: 1px solid #f1f5f9;
          }
          .total-label { font-size: 13px; font-weight: 800; color: #0d9488; }
          .total-amount { font-size: 22px; font-weight: 900; color: #059669; font-family: ui-monospace, monospace; letter-spacing: -0.02em; }
          .in-words { font-size: 9.5px; color: #64748b; text-align: right; margin-top: 4px; font-style: italic; }

          /* Sign-off section */
          .signoff-section {
            display: flex; justify-content: space-between; align-items: flex-end;
            padding-top: 14px; margin-bottom: 18px;
            border-top: 1px solid #f1f5f9;
          }
          .sign-block { min-width: 180px; }
          .sign-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
          .sign-line { width: 224px; border: none; border-bottom: 2px solid #0f172a; margin: 4px 0 6px; }
          .sign-line-right { margin-left: auto; }
          .sign-name { font-size: 12px; font-weight: 800; color: #0f172a; }
          .sign-role { font-size: 10.5px; color: #64748b; }
          .sign-verified { font-size: 9.5px; font-weight: 800; color: #059669; margin-top: 3px; display: flex; align-items: center; gap: 4px; }
          .sign-cursive { font-family: 'Alex Brush', 'Great Vibes', 'Dancing Script', cursive; font-style: normal; font-size: 58px; font-weight: 400; color: #0f172a; height: 76px; display: flex; align-items: flex-end; line-height: 1.05; transform: rotate(-2deg); transform-origin: bottom left; }
          .sign-stamp-box {
            display: inline-flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 5px 14px; border-radius: 8px;
            background: #ecfdf5;
            border: 1px solid rgba(167, 243, 208, 0.8);
            color: #047857; text-align: center;
          }
          .sign-stamp-title { font-size: 9px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; display: flex; align-items: center; gap: 4px; }
          .sign-stamp-sub { font-size: 8px; color: #64748b; font-weight: 500; margin-top: 2px; }

          /* Terms & Notes */
          .terms-box {
            background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
            padding: 12px 16px; margin-bottom: 16px;
          }
          .terms-item { display: flex; align-items: flex-start; gap: 8px; font-size: 10.5px; color: #475569; }
          .terms-item i { color: #0d9488; margin-top: 2px; font-size: 11px; }

          /* Micro Footer */
          .micro-footer {
            display: flex; justify-content: space-between; align-items: center;
            font-size: 9px; color: #94a3b8; padding-top: 8px; border-top: 1px solid #f1f5f9;
          }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <div class="top-accent"></div>

          <!-- Header -->
          <div class="header-row">
            <div class="brand-row">
              ${companyLogoUrl
                ? `<img src="${companyLogoUrl}" class="brand-logo-img" alt="Logo" />`
                : `<div class="brand-logo-box">CRM</div>`
              }
              <div>
                <div class="brand-name">${invoice.businessName || "Ashish Sharma"}</div>
                <div class="brand-subtitle">${headerSubtitle}</div>
              </div>
            </div>
            <div class="header-box">
              <div class="ci-label">${isEmployeeInvoice ? "Employee Invoice" : "Commercial Invoice"}</div>
              <div class="inv-number">#${invoice.invoiceNo}</div>
            </div>
          </div>

          <!-- 3-Column Flat Info Section matching PDF -->
          <div class="info-grid">
            <!-- Col 1: Details -->
            <div class="info-col">
              <div class="info-col-header">INVOICE DETAILS</div>
              <div class="info-row">
                <span class="info-label">Issued:</span>
                <span class="info-val">${invoice.invoiceDate}</span>
              </div>
              ${invoice.status === "Paid" ? `
              <div class="info-row">
                <span class="info-label">Paid Date:</span>
                <span class="info-val-em">${(invoice as any).paymentDetails?.paidAt ? new Date((invoice as any).paymentDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : invoice.invoiceDate}</span>
              </div>` : `
              <div class="info-row">
                <span class="info-label">Due Date:</span>
                <span class="info-val">${invoice.dueDate}</span>
              </div>`}
              <div class="info-row">
                <span class="info-label">Ref #:</span>
                <span class="info-val">${invoice.customerNo || `REF-${invoice.invoiceNo}`}</span>
              </div>
            </div>

            <!-- Col 2: From -->
            <div class="info-col">
              <div class="info-col-header">INVOICE FROM</div>
              <div class="party-name">${invoice.businessName}</div>
              <div class="party-addr">${(invoice as any).businessSubtitle || invoice.businessAddress || "Employee • Engineering"}</div>
              ${invoice.businessEmail ? `<div class="party-email">${invoice.businessEmail}</div>` : ""}
            </div>

            <!-- Col 3: To -->
            <div class="info-col">
              <div class="info-col-header">INVOICE TO</div>
              <div class="party-name">${invoice.billedToName}</div>
              <div class="party-addr">${invoice.billedToAddress || "Building no 1254, Tower B Zone, Gurgaon, Noida, 110078, India"}</div>
              ${invoice.billedToEmail ? `<div class="party-email">${invoice.billedToEmail}</div>` : ""}
            </div>
          </div>

          <!-- Items Table -->
          <div class="table-header-row">
            <div class="table-title">
              <i class="fa-solid fa-layer-group"></i>
              Products / Service Items
            </div>
            <div class="item-count">${invoice.items.length} ${invoice.items.length === 1 ? "Item" : "Items"}</div>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width:44px;text-align:center;">#</th>
                <th>Item &amp; Description</th>
                <th class="text-center" style="width:90px;">Qty / Hrs</th>
                <th class="text-right" style="width:120px;">Unit Rate</th>
                <th class="text-right" style="width:130px;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, idx) => `
                <tr>
                  <td style="text-align:center;color:#94a3b8;font-family:ui-monospace,monospace;font-weight:700;">${idx + 1}</td>
                  <td>
                    <div style="font-weight:700;color:#0f172a;">${item.description}</div>
                  </td>
                  <td class="text-center" style="font-family:ui-monospace,monospace;font-weight:600;">${item.quantity}</td>
                  <td class="text-right" style="color:#64748b;font-family:ui-monospace,monospace;">${symbol}${item.unitPrice.toLocaleString()}</td>
                  <td class="text-right" style="font-family:ui-monospace,monospace;font-weight:800;color:#0f172a;">${symbol}${item.amount.toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <!-- Bottom Grid: Settlement + Financial Summary -->
          <div class="bottom-grid">
            <!-- Left: Settlement -->
            <div class="settle-card ${(invoice as any).paymentDetails?.method ? "settle-card-paid" : "settle-card-unpaid"}">
              ${(invoice as any).paymentDetails?.method ? `
                <div class="settle-header">
                  <div class="settle-title-text" style="color:#059669;">
                    <i class="fa-solid fa-circle-check"></i>
                    Payment Received (${(invoice as any).paymentDetails.method})
                  </div>
                  <span class="settle-badge" style="background:#d1fae5;color:#047857;border:1px solid #a7f3d0;">Settled</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Payment Method:</span>
                  <span class="info-val" style="color:#0f172a;">${(invoice as any).paymentDetails.method === "Cash" ? "Cash Settlement" : (invoice as any).paymentDetails.method}</span>
                </div>
                ${(invoice as any).paymentDetails.method === "Bank Transfer" ? `
                  <div class="info-row"><span class="info-label">Bank Name:</span><span class="info-val">${invoice.bankDetails?.bankName || "Corporate Banking"}</span></div>
                  <div class="info-row"><span class="info-label">Account No:</span><span class="info-val">${invoice.bankDetails?.accountNo || "782459739212"}</span></div>
                  <div class="info-row"><span class="info-label">IFSC / Code:</span><span class="info-val">${invoice.bankDetails?.ifscCode || "NEXA0004128"}</span></div>
                ` : ""}
                ${(invoice as any).paymentDetails.method === "UPI" ? `
                  <div class="info-row"><span class="info-label">${(invoice as any).paymentDetails.fromUpiId && (invoice as any).paymentDetails.toUpiId ? "Paid From:" : "UPI ID:"}</span>
                    <span class="info-val">${(invoice as any).paymentDetails.fromUpiId || (invoice as any).paymentDetails.upiId || invoice.bankDetails?.upiId || "nexace@okaxis"}</span></div>
                  ${(invoice as any).paymentDetails.toUpiId ? `<div class="info-row"><span class="info-label">Paid To:</span><span class="info-val">${(invoice as any).paymentDetails.toUpiId}</span></div>` : ""}
                  ${(invoice as any).paymentDetails.transactionId ? `<div class="info-row"><span class="info-label">Transaction ID:</span><span class="info-val">${(invoice as any).paymentDetails.transactionId}</span></div>` : ""}
                ` : ""}
                <div class="info-row">
                  <span class="info-label">Paid Date:</span>
                  <span class="info-val-em">${(invoice as any).paymentDetails.paidAt ? new Date((invoice as any).paymentDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : invoice.invoiceDate}</span>
                </div>
                ${invoice.approvedBy ? `<div class="info-row"><span class="info-label">Approved By:</span><span class="info-val-em">${invoice.approvedBy}</span></div>` : ""}
              ` : `
                <div class="settle-header">
                  <div class="settle-title-text" style="color:#0f172a;">
                    <i class="fa-solid fa-building-columns" style="color:#0d9488;"></i>
                    Bank &amp; Remittance Details
                  </div>
                </div>
                <div class="info-row"><span class="info-label">Bank Name:</span><span class="info-val">${invoice.bankDetails?.bankName || "Corporate Banking Partner"}</span></div>
                <div class="info-row"><span class="info-label">Account No:</span><span class="info-val">${invoice.bankDetails?.accountNo || "782459739212"}</span></div>
                <div class="info-row"><span class="info-label">IFSC / Swift:</span><span class="info-val">${invoice.bankDetails?.ifscCode || "NEXA0004128"}</span></div>
                <div class="info-row"><span class="info-label">Payment Ref:</span><span class="info-val" style="color:#0d9488;">${invoice.invoiceNo}</span></div>
              `}
            </div>

            <!-- Right: Financial Summary -->
            <div class="summary-card">
              <div class="summary-header">
                <i class="fa-solid fa-calculator"></i>
                Financial Summary
              </div>
              <div class="summary-row">
                <span>Subtotal:</span>
                <strong>${symbol}${invoice.subtotal.toLocaleString()}</strong>
              </div>
              ${invoice.taxRate > 0 ? `
              <div class="summary-row">
                <span>Tax / VAT (${invoice.taxRate}%):</span>
                <strong>+${symbol}${invoice.taxAmount.toLocaleString()}</strong>
              </div>` : ""}
              ${(invoice as any).discount > 0 ? `
              <div class="summary-row" style="color:#059669;">
                <span>Discount Applied:</span>
                <strong style="color:#059669;">-${symbol}${((invoice as any).discount).toLocaleString()}</strong>
              </div>` : ""}
              <div class="total-row">
                <div class="total-label">Total Amount:</div>
                <div class="total-amount">${symbol}${invoice.total.toLocaleString()}</div>
              </div>
              <div class="in-words">${numberToWords(invoice.total)}</div>
            </div>
          </div>

          <!-- Dual Sign-Off Grid -->
          <div class="signoff-section">
            ${isEmployeeInvoice ? `
            <div class="sign-block">
              <div class="sign-label">PREPARED &amp; CLAIMED BY</div>
              ${invoice.signatureUrl
                ? `<img src="${invoice.signatureUrl}" style="height:36px;max-width:150px;object-fit:contain;display:block;" />`
                : `<div class="sign-cursive">${invoice.businessName}</div>`
              }
              <div class="sign-line"></div>
              <div class="sign-name">${invoice.businessName}</div>
              <div class="sign-role">${(invoice as any).businessSubtitle || "Employee • Engineering (Permanent Staff)"}</div>
              <div class="sign-verified"><i class="fa-solid fa-circle-check"></i> Claimant / Payee Verified</div>
            </div>
            ` : `<div></div>`}

            <div class="sign-block" style="text-align:right;">
              <div class="sign-label" style="text-align:right;">VERIFIED &amp; AUTHORIZED BY</div>
              ${displaySignature
                ? `<img src="${displaySignature}" style="height:36px;max-width:150px;object-fit:contain;display:block;margin-left:auto;" />`
                : invoice.approvedBy
                ? `<div style="display:flex;justify-content:flex-end;">
                    <div class="sign-stamp-box">
                      <div class="sign-stamp-title">• DIGITALLY AUTHORIZED •</div>
                      <div class="sign-stamp-sub">Corporate Finance Desk • Verified</div>
                    </div>
                  </div>`
                : `<div class="sign-cursive" style="justify-content:flex-end;transform-origin:bottom right;">${formatSignatoryName(signatoryEntity)}</div>`
              }
              <div class="sign-line sign-line-right"></div>
              <div class="sign-name">Authorized Signatory</div>
              ${invoice.approvedBy ? `<div class="sign-verified" style="justify-content:flex-end;"><i class="fa-solid fa-circle-check"></i> Approved by ${invoice.approvedBy}</div>` : ""}
              <div class="sign-role" style="margin-top:5px;">${signatoryEntity}</div>
            </div>
          </div>

          <!-- Terms & Notes -->
          <div class="terms-box">
            <div class="terms-item">
              <i class="fa-solid fa-file-contract"></i>
              <div>
                <strong style="color:#0f172a;text-transform:uppercase;font-size:9.5px;letter-spacing:0.06em;margin-right:6px;">Terms &amp; Conditions:</strong>
                Payment is requested within ${invoice.paymentTerms || "14 business days"} of receiving this invoice statement. For inquiries or remittances, please quote reference #${invoice.invoiceNo}.
              </div>
            </div>
            ${invoice.notes ? `
              <div class="terms-item" style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;">
                <i class="fa-solid fa-clipboard-check" style="color:#059669;"></i>
                <div>
                  <strong style="color:#0f172a;text-transform:uppercase;font-size:9.5px;letter-spacing:0.06em;margin-right:6px;">Notes &amp; Verified Records:</strong>
                  ${invoice.notes}
                </div>
              </div>
            ` : ""}
          </div>

          <!-- Micro Footer -->
          <div class="micro-footer">
            <span>Official Commercial Document • NexAce Financial Desk</span>
            <span>Electronic Document • Legally valid without physical seal</span>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };


  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      if (printRef.current) {
        await downloadElementAsPdf(printRef.current, {
          fileName: `Invoice_${invoice.invoiceNo}.pdf`,
          widthPx: 860,
          marginMm: 6,
        });
      } else {
        downloadInvoicePdf(
          {
            invoiceNo: invoice.invoiceNo,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            customerNo: invoice.customerNo,
            businessName: invoice.businessName || "NexAce IT Team",
            businessSubtitle: (invoice as any).businessSubtitle || (isEmployeeInvoice ? "Employee • Engineering (Permanent Staff)" : undefined),
            businessAddress: invoice.businessAddress,
            businessEmail: invoice.businessEmail,
            billedToName: invoice.billedToName || "Client",
            billedToAddress: invoice.billedToAddress,
            billedToEmail: invoice.billedToEmail,
            items: invoice.items || [],
            subtotal: invoice.subtotal || 0,
            taxRate: invoice.taxRate,
            taxAmount: invoice.taxAmount,
            total: invoice.total || 0,
            currency: invoice.currency || "INR",
            status: invoice.status,
            notes: invoice.notes,
            paymentTerms: invoice.paymentTerms || "14 business days",
            bankDetails: invoice.bankDetails,
            paymentDetails: invoice.paymentDetails,
            logoUrl: companyLogoUrl || (invoice as any).logoUrl,
            signatureUrl: invoice.signatureUrl,
            orgSignatureUrl: companySignatureUrl,
            employeeSignatureUrl: isEmployeeInvoice ? invoice.signatureUrl : undefined,
            approvedBy: invoice.approvedBy,
            approvedAt: invoice.approvedAt,
          },
          `Invoice_${invoice.invoiceNo}.pdf`
        );
      }
    } catch (err) {
      console.error("DOM PDF export failed, falling back to direct PDF generator:", err);
      try {
        downloadInvoicePdf(
          {
            invoiceNo: invoice.invoiceNo,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            customerNo: invoice.customerNo,
            businessName: invoice.businessName || "NexAce IT Team",
            businessSubtitle: (invoice as any).businessSubtitle || (isEmployeeInvoice ? "Employee • Engineering (Permanent Staff)" : undefined),
            businessAddress: invoice.businessAddress,
            businessEmail: invoice.businessEmail,
            billedToName: invoice.billedToName || "Client",
            billedToAddress: invoice.billedToAddress,
            billedToEmail: invoice.billedToEmail,
            items: invoice.items || [],
            subtotal: invoice.subtotal || 0,
            taxRate: invoice.taxRate,
            taxAmount: invoice.taxAmount,
            total: invoice.total || 0,
            currency: invoice.currency || "INR",
            status: invoice.status,
            notes: invoice.notes,
            paymentTerms: invoice.paymentTerms || "14 business days",
            bankDetails: invoice.bankDetails,
            paymentDetails: invoice.paymentDetails,
            logoUrl: companyLogoUrl || (invoice as any).logoUrl,
            signatureUrl: invoice.signatureUrl,
            orgSignatureUrl: companySignatureUrl,
            employeeSignatureUrl: isEmployeeInvoice ? invoice.signatureUrl : undefined,
            approvedBy: invoice.approvedBy,
            approvedAt: invoice.approvedAt,
          },
          `Invoice_${invoice.invoiceNo}.pdf`
        );
      } catch (fallbackErr) {
        console.error("Fallback PDF download also failed:", fallbackErr);
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Top Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="gap-1.5 font-semibold h-8 px-3 cursor-pointer hover:bg-muted text-foreground shrink-0"
            >
              <i className="fa-solid fa-arrow-left text-[11px]" /> Back
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 truncate">
              <i className="fa-solid fa-file-invoice text-primary text-sm" />
              Invoice&nbsp;<span className="font-mono">#{invoice.invoiceNo}</span>
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Issued <strong className="text-foreground">{invoice.invoiceDate}</strong>
              {invoice.status === "Paid" ? (
                <> &bull; Paid{" "}
                  <strong className="text-emerald-500">
                    {(invoice as any).paymentDetails?.paidAt
                      ? new Date((invoice as any).paymentDetails.paidAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })
                      : invoice.invoiceDate}
                  </strong>
                </>
              ) : (
                <> &bull; Due <strong className="text-foreground">{invoice.dueDate}</strong>
                  {(invoice as any).updatedAt && (
                    <> &bull; Updated <strong className="text-foreground">{new Date((invoice as any).updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</strong></>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {onStatusChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">Status:</span>
              <select
                disabled={isUpdatingStatus}
                value={invoice.status}
                onChange={(e) => {
                  const newVal = e.target.value;
                  if (newVal === "Paid" && onPaymentConfirm) {
                    onPaymentConfirm();
                  } else {
                    onStatusChange(newVal);
                  }
                }}
                className="h-8 px-2.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-bold"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5 font-semibold h-8 px-3 cursor-pointer bg-card hover:bg-muted text-foreground border-border"
          >
            <i className="fa-solid fa-print text-[11px]" /> Print
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="gap-1.5 font-semibold h-8 px-3.5 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-70"
          >
            {isDownloadingPdf ? (
              <i className="fa-solid fa-spinner fa-spin text-[11px]" />
            ) : (
              <i className="fa-solid fa-download text-[11px]" />
            )}
            {isDownloadingPdf ? "Downloading..." : "Download Invoice"}
          </Button>
        </div>
      </div>

      {/* ── Main Invoice Paper Card ── */}
      <div
        ref={printRef}
        className="bg-card border border-border/80 rounded-2xl shadow-xl max-w-5xl mx-auto transition-all relative overflow-hidden"
      >
        {/* Executive top accent brand stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500" />

        <div className="p-5 sm:p-7 md:p-8 space-y-5">
          {/* ── Invoice Header ── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 pb-5 border-b border-border/70">
            <div className="flex items-center gap-4">
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt="Organization Logo"
                  className="w-13 h-13 rounded-full object-contain border border-border/80 bg-background p-1.5 shadow-xs"
                />
              ) : (
                <div className="w-13 h-13 rounded-full border-2 border-teal-500/80 bg-teal-50/70 dark:bg-teal-950/40 flex items-center justify-center relative shadow-xs">
                  <span className="font-black text-slate-900 dark:text-white text-xs tracking-wider">CRM</span>
                  <span className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 rounded-full bg-teal-600" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-teal-600" />
                </div>
              )}
              <div>
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground block">
                  {invoice.businessName || "Ashish Sharma"}
                </span>
                <span className="block text-[11px] font-extrabold text-muted-foreground uppercase tracking-[0.12em] mt-1">
                  {headerSubtitle}
                </span>
              </div>
            </div>

            <div className="bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 sm:min-w-[210px] text-right space-y-1 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/80 block">
                {isEmployeeInvoice ? "Employee Invoice" : "Commercial Invoice"}
              </span>
              <div className="text-base sm:text-lg font-black font-mono text-foreground tracking-tight">
                #{invoice.invoiceNo}
              </div>
            </div>
          </div>

          {/* ── 3-Column Flat Info Section matching PDF ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-1">
            {/* Col 1: Invoice Details */}
            <div className="space-y-2 text-xs">
              <h4 className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2.5">
                INVOICE DETAILS
              </h4>
              <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                <span className="text-muted-foreground w-20 shrink-0">Issued:</span>
                <span className="font-bold text-foreground font-mono">{invoice.invoiceDate}</span>
              </div>
              {invoice.status === "Paid" ? (
                <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                  <span className="text-muted-foreground w-20 shrink-0">Paid Date:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {(invoice as any).paymentDetails?.paidAt
                      ? new Date((invoice as any).paymentDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : invoice.invoiceDate}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                  <span className="text-muted-foreground w-20 shrink-0">Due Date:</span>
                  <span className="font-bold text-foreground font-mono">{invoice.dueDate}</span>
                </div>
              )}
              <div className="flex items-center justify-between sm:justify-start sm:gap-6">
                <span className="text-muted-foreground w-20 shrink-0">Ref #:</span>
                <span className="font-bold text-foreground font-mono truncate">{invoice.customerNo || `REF-${invoice.invoiceNo}`}</span>
              </div>
            </div>

            {/* Col 2: Invoice From */}
            <div className="space-y-1 text-xs">
              <h4 className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2.5">
                INVOICE FROM
              </h4>
              <p className="font-bold text-sm text-foreground">{invoice.businessName}</p>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {(invoice as any).businessSubtitle || invoice.businessAddress || "Employee • Engineering"}
              </p>
              {invoice.businessEmail && (
                <p className="text-sky-600 dark:text-sky-400 font-mono pt-1">
                  {invoice.businessEmail}
                </p>
              )}
            </div>

            {/* Col 3: Invoice To */}
            <div className="space-y-1 text-xs">
              <h4 className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider mb-2.5">
                INVOICE TO
              </h4>
              <p className="font-bold text-sm text-foreground">{invoice.billedToName}</p>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {invoice.billedToAddress || "Building no 1254, Tower B Zone, Gurgaon, Noida, 110078, India"}
              </p>
              {invoice.billedToEmail && (
                <p className="text-sky-600 dark:text-sky-400 font-mono pt-1">
                  {invoice.billedToEmail}
                </p>
              )}
            </div>
          </div>

          {/* ── Products / Services Table ── */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Products / Service Items
            </h3>

            <div className="border border-border/80 rounded-2xl overflow-hidden shadow-xs bg-card">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead>
                    <tr className="bg-muted/60 dark:bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">Item &amp; Description</th>
                      <th className="py-3.5 px-4 text-center w-28">Qty / Hrs</th>
                      <th className="py-3.5 px-4 text-right w-36">Unit Rate</th>
                      <th className="py-3.5 px-4 text-right w-40">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-xs">
                    {invoice.items.map((item, idx) => {
                      // Smart split for items with dates/period details like [2026-09-01 to 2026-09-30]
                      const bracketMatch = item.description.match(/^(.*?)\s*(\[.*?\]|\(.*?\))\s*$/);
                      const mainTitle = bracketMatch ? bracketMatch[1] : item.description;
                      const subPeriod = bracketMatch ? bracketMatch[2] : null;

                      return (
                        <tr
                          key={idx}
                          className={cn(
                            "transition-colors hover:bg-muted/30",
                            idx % 2 === 1 && "bg-muted/15"
                          )}
                        >
                          <td className="py-4 px-4 text-center">
                            <span className="w-6 h-6 rounded-full bg-muted/80 border border-border/60 flex items-center justify-center text-[10px] font-bold text-muted-foreground mx-auto font-mono">
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-foreground text-sm leading-snug">{mainTitle}</div>
                            {subPeriod && (
                              <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                                {subPeriod.replace(/[\[\]]/g, "")}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-mono font-semibold text-foreground text-xs bg-muted/50 px-2.5 py-1 rounded-md border border-border/40">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="font-mono text-muted-foreground text-xs">{symbol}{item.unitPrice.toLocaleString()}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="font-mono font-extrabold text-foreground text-sm">{symbol}{item.amount.toLocaleString()}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Shift Clock & Timesheet Audit Breakdown (Admin View) ── */}
          {(invoice.shiftAttendance?.records?.length || invoice.timesheetEntries?.records?.length) ? (
            <div className={cn("space-y-4", !invoice.timesheetEntries?.records?.length && "pdf-exclude-shift")}>
              {/* Shift Attendance Breakdown */}
              {invoice.shiftAttendance && invoice.shiftAttendance.records.length > 0 && (
                <div className="pdf-exclude-shift space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-clock-rotate-left text-primary" /> Shift Clock &amp; Attendance Breakdown
                  </h3>
                  <div className="border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full min-w-[500px] text-left text-xs">
                      <thead className="bg-muted/50 border-b border-border font-bold text-muted-foreground uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-3">Clock In</th>
                          <th className="py-3 px-3">Clock Out</th>
                          <th className="py-3 px-3 text-right">Hours</th>
                          <th className="py-3 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {invoice.shiftAttendance.records.map((rec, idx) => (
                          <tr key={idx} className="hover:bg-muted/10 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-semibold text-foreground">{rec.date}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">{rec.clockIn}</td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {rec.clockOut === "Working..." ? (
                                <span className="text-emerald-500 font-semibold">Active</span>
                              ) : rec.clockOut}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">{rec.totalHours}h</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {rec.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Timesheet Entries Breakdown */}
              {invoice.timesheetEntries && invoice.timesheetEntries.records.length > 0 && (
                <div className="border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <i className="fa-solid fa-table-list text-primary text-xs" /> Project Timesheets
                    </span>
                    <div className="flex items-center gap-3 text-xs font-semibold">
                      <span className="text-muted-foreground">{invoice.timesheetEntries.totalEntries} entries</span>
                      <span className="text-foreground font-mono">{invoice.timesheetEntries.totalHours} hrs</span>
                    </div>
                  </div>
                  <table className="w-full min-w-[500px] text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border font-bold text-muted-foreground uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-3">Project</th>
                        <th className="py-3 px-3">Task</th>
                        <th className="py-3 px-3 text-right">Hours</th>
                        <th className="py-3 px-3 text-center">Billable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {invoice.timesheetEntries.records.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-muted/10 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-semibold text-foreground">{entry.date}</td>
                          <td className="py-2.5 px-3 font-medium text-foreground">{entry.projectName || "—"}</td>
                          <td className="py-2.5 px-3 text-muted-foreground max-w-[200px] truncate">{entry.taskDescription || "—"}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">{entry.hours}h</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                              entry.billable
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}>
                              {entry.billable ? "Billable" : "Non-Bill"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {/* ── Bottom 2-Column: Bank Details & Financial Summary ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Dynamic Payment / Bank Details */}
            {invoice.status === "Paid" && invoice.paymentDetails?.method ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                  <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    Payment Received ({invoice.paymentDetails.method})
                  </h4>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                    Settled
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/25">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-bold text-foreground">
                      {invoice.paymentDetails.method === "Cash" ? "Cash Settlement" : invoice.paymentDetails.method}
                    </span>
                  </div>

                  {invoice.paymentDetails.method === "UPI" && (
                    <>
                      {(invoice.paymentDetails as any).fromUpiId && (
                        <div className="flex justify-between items-center py-1 border-b border-border/25">
                          <span className="text-muted-foreground">Paid From UPI</span>
                          <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-md border border-sky-500/20">
                            {(invoice.paymentDetails as any).fromUpiId}
                          </span>
                        </div>
                      )}
                      {(invoice.paymentDetails as any).toUpiId ? (
                        <div className="flex justify-between items-center py-1 border-b border-border/25">
                          <span className="text-muted-foreground">Paid To UPI</span>
                          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                            {(invoice.paymentDetails as any).toUpiId}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center py-1 border-b border-border/25">
                          <span className="text-muted-foreground">UPI ID</span>
                          <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-md border border-violet-500/20">
                            {invoice.paymentDetails.upiId || invoice.bankDetails?.upiId || "nexace@okaxis"}
                          </span>
                        </div>
                      )}
                      {invoice.paymentDetails.transactionId && (
                        <div className="flex justify-between items-center py-1 border-b border-border/25">
                          <span className="text-muted-foreground">Transaction ID</span>
                          <span className="font-mono text-xs font-semibold text-foreground bg-muted/80 px-2.5 py-0.5 rounded-md border border-border/60">
                            {invoice.paymentDetails.transactionId}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  {invoice.paymentDetails.method === "Bank Transfer" && (
                    <>
                      <div className="flex justify-between items-center py-1 border-b border-border/25">
                        <span className="text-muted-foreground">Bank Name</span>
                        <span className="font-bold text-foreground">{invoice.bankDetails?.bankName || "Corporate Banking Partner"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/25">
                        <span className="text-muted-foreground">Account Number</span>
                        <span className="font-mono text-xs font-bold text-foreground">{invoice.bankDetails?.accountNo || "782459739212"}</span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/25">
                        <span className="text-muted-foreground">IFSC / Code</span>
                        <span className="font-mono text-xs font-bold text-foreground">{invoice.bankDetails?.ifscCode || "NEXA0004128"}</span>
                      </div>
                    </>
                  )}

                  {invoice.paymentDetails.method === "Cash" && (
                    <div className="flex justify-between items-center py-1 border-b border-border/25">
                      <span className="text-muted-foreground">Settlement</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Verified &amp; Settled in Cash</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Paid On</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {(invoice as any).paymentDetails?.paidAt
                        ? new Date((invoice as any).paymentDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                        : invoice.invoiceDate}
                    </span>
                  </div>

                  {(invoice.approvedBy || invoice.approvedAt) && (
                    <div className="pt-2 mt-1 border-t border-emerald-500/20 space-y-2">
                      {invoice.approvedBy && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Approved By</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                            <i className="fa-solid fa-circle-check text-[10px]" />
                            {invoice.approvedBy}
                          </span>
                        </div>
                      )}
                      {invoice.approvedAt && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Approved On</span>
                          <span className="font-semibold text-foreground">
                            {new Date(invoice.approvedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-muted/20 dark:bg-slate-900/40 p-4 sm:p-5 shadow-xs space-y-3">
                <div className="pb-3 border-b border-border/60">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                    Bank &amp; Payment Details
                  </h4>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-border/25">
                    <span className="text-muted-foreground">Bank Name</span>
                    <span className="font-bold text-foreground">{invoice.bankDetails?.bankName || "Corporate Banking Partner"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/25">
                    <span className="text-muted-foreground">Account Number</span>
                    <span className="font-mono text-xs font-bold text-foreground">{invoice.bankDetails?.accountNo || "782459739212"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-border/25">
                    <span className="text-muted-foreground">IFSC / Swift Code</span>
                    <span className="font-mono text-xs font-bold text-foreground">{invoice.bankDetails?.ifscCode || "NEXA0004128"}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Payment Reference</span>
                    <span className="font-mono text-xs font-extrabold text-primary">{invoice.invoiceNo}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Right: Financial Summary */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 dark:bg-slate-900/40 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="pb-3 border-b border-border/60">
                <h4 className="text-xs font-black text-foreground uppercase tracking-wider">
                  Financial Summary
                </h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-border/25">
                  <span className="text-muted-foreground">Subtotal Amount</span>
                  <span className="font-mono text-xs font-bold text-foreground">{symbol}{invoice.subtotal.toLocaleString()}</span>
                </div>
                {invoice.taxRate > 0 && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/25">
                    <span className="text-muted-foreground">Tax / VAT ({invoice.taxRate}%)</span>
                    <span className="font-mono text-xs font-bold text-foreground">+{symbol}{invoice.taxAmount.toLocaleString()}</span>
                  </div>
                )}
                {Boolean(invoice.discount && invoice.discount > 0) && (
                  <div className="flex justify-between items-center py-1.5 border-b border-border/25">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">Discount Applied</span>
                    <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">-{symbol}{(invoice.discount || 0).toLocaleString()}</span>
                  </div>
                )}

                {/* Total Amount clean row matching PDF */}
                <div className="pt-3 flex items-center justify-between border-t border-border/60">
                  <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400">
                    Total Amount:
                  </span>
                  <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 dark:text-emerald-400 tracking-tight">
                    {symbol}{invoice.total.toLocaleString()}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground text-right italic pt-1 font-medium">
                  {numberToWords(invoice.total)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Dual Sign-Off Grid ── */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-8 border-t border-border/70">
            {isEmployeeInvoice ? (
              <div className="flex flex-col items-start space-y-1.5">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  PREPARED &amp; CLAIMED BY
                </p>
                <div className="min-h-[76px] sm:min-h-[84px] flex items-end pb-1 overflow-visible">
                  {invoice.signatureUrl ? (
                    <img
                      src={invoice.signatureUrl}
                      alt="Claimant Signature"
                      className="h-14 max-w-[200px] object-contain mix-blend-multiply dark:mix-blend-screen"
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: "'Alex Brush', 'Great Vibes', 'Dancing Script', cursive",
                        fontSize: "58px",
                        lineHeight: "1.05",
                        transform: "rotate(-2.5deg)",
                        transformOrigin: "bottom left",
                      }}
                      className="text-slate-900 dark:text-slate-100 font-normal tracking-wide select-none inline-block pl-1 transition-transform"
                    >
                      {invoice.businessName || "Ashish Sharma"}
                    </span>
                  )}
                </div>
                <div className="w-56 sm:w-64 border-b-2 border-slate-700/80 dark:border-slate-300/80 my-1" />
                <div className="space-y-0.5">
                  <p className="text-sm font-extrabold text-foreground">{invoice.businessName}</p>
                  <p className="text-xs text-muted-foreground">{(invoice as any).businessSubtitle || "Employee • Engineering (Permanent Staff)"}</p>
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    • Claimant / Payee Verified
                  </p>
                </div>
              </div>
            ) : (
              <div />
            )}

            <div className="flex flex-col items-end text-right space-y-1.5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                VERIFIED &amp; AUTHORIZED BY
              </p>
              <div className="min-h-[76px] sm:min-h-[84px] flex items-end justify-end pb-1 overflow-visible">
                {displaySignature ? (
                  <img
                    src={displaySignature}
                    alt="Authorized Signature"
                    className="h-14 max-w-[200px] object-contain mix-blend-multiply dark:mix-blend-screen"
                  />
                ) : (
                  <span
                    style={{
                      fontFamily: "'Alex Brush', 'Great Vibes', 'Dancing Script', cursive",
                      fontSize: "58px",
                      lineHeight: "1.05",
                      transform: "rotate(-2deg)",
                      transformOrigin: "bottom right",
                    }}
                    className="text-slate-900 dark:text-slate-100 font-normal tracking-wide select-none inline-block pr-1 transition-transform"
                  >
                    {formatSignatoryName(signatoryEntity)}
                  </span>
                )}
              </div>
              <div className="w-56 sm:w-64 border-b-2 border-slate-700/80 dark:border-slate-300/80 my-1 ml-auto" />
              <div className="space-y-0.5">
                <p className="text-sm font-extrabold text-foreground">Authorized Signatory</p>
                {invoice.approvedBy && (
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1.5 mt-1">
                    • Approved by {invoice.approvedBy}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{signatoryEntity}</p>
              </div>
            </div>
          </div>

          {/* ── Terms & Conditions + Notes ── */}
          <div className="rounded-xl border border-border/80 bg-muted/15 dark:bg-slate-900/30 p-3.5 sm:p-4 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground uppercase tracking-wider text-[10px] font-black mr-1.5">TERMS &amp; CONDITIONS:</strong>
              Payment is requested within {invoice.paymentTerms || "14 business days"} of receiving this invoice statement. For inquiries or remittances, please quote invoice reference <strong className="font-mono text-foreground font-bold">#{invoice.invoiceNo}</strong>.
            </p>

            {invoice.notes && (
              <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/40">
                <strong className="text-foreground uppercase tracking-wider text-[10px] font-black mr-1.5">NOTES &amp; VERIFIED RECORDS:</strong>
                {invoice.notes}
              </p>
            )}
          </div>

          {/* ── Micro Footer ── */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-[10px] text-muted-foreground/70 font-medium border-t border-border/40 gap-2">
            <span>Official Commercial Document • NexAce Financial Desk</span>
            <span>Electronic Document • Legally valid without physical seal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
