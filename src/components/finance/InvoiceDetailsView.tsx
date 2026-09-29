"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";

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
    const config: Record<string, { style: string; icon: string }> = {
      Paid: { style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", icon: "fa-circle-check" },
      Pending: { style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: "fa-clock" },
      Sent: { style: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30", icon: "fa-paper-plane" },
      Draft: { style: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30", icon: "fa-pen-ruler" },
      Overdue: { style: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30", icon: "fa-triangle-exclamation" },
      Cancelled: { style: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30 line-through", icon: "fa-ban" },
      Archived: { style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30", icon: "fa-box-archive" },
    };
    const c = config[status] || { style: "bg-muted text-muted-foreground border-border", icon: "fa-circle-info" };
    return (
      <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs", c.style)}>
        <i className={cn("fa-solid text-[10px]", c.icon)} />
        {status}
      </span>
    );
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoice.invoiceNo}</title>
        <style>
          @page { size: A4; margin: 0; }
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 10mm;
            font-size: 12px;
            line-height: 1.5;
            box-sizing: border-box;
          }
          .invoice-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            max-width: 800px;
            margin: 0 auto;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
          }
          .top-accent {
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 5px;
            background: linear-gradient(to right, #10b981, #14b8a6, #00c5a0);
            border-radius: 12px 12px 0 0;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1.5px solid #f1f5f9;
            padding-bottom: 16px;
            margin-bottom: 16px;
            padding-top: 8px;
          }
          .brand-row { display: flex; align-items: center; gap: 14px; }
          .brand-logo-box {
            width: 44px; height: 44px;
            border-radius: 10px;
            background: linear-gradient(135deg,#00c5a020,#14b8a615);
            border: 1px solid #00c5a030;
            display: flex; align-items: center; justify-content: center;
            color: #00c5a0; font-weight: 900; font-size: 22px;
          }
          .brand-name { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
          .brand-subtitle { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 2px; }
          .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
          .ci-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }
          .inv-row { display: flex; align-items: center; gap: 8px; }
          .inv-pill {
            background: #f0fdfa; border: 1px solid #99f6e4;
            color: #0d9488; font-family: monospace; font-weight: 900;
            font-size: 13px; padding: 2px 10px; border-radius: 8px;
          }
          .status-badge {
            display: inline-flex; align-items: center; gap: 5px;
            padding: 3px 10px; border-radius: 999px;
            font-size: 10px; font-weight: 800; border: 1px solid;
          }
          .status-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
          .ref-line { font-size: 10px; color: #64748b; }
          .ref-line strong { color: #0f172a; font-family: monospace; }
          /* 3-Column Executive Cards */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 14px;
            margin-bottom: 18px;
          }
          .info-card {
            padding: 12px 14px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            border-top: 2.5px solid transparent;
          }
          .info-card-emerald { border-top-color: #10b981; }
          .info-card-teal { border-top-color: #14b8a6; }
          .info-card-sky { border-top-color: #0ea5e9; }
          .info-card-header {
            display: flex; align-items: center; gap: 7px;
            font-size: 9.5px; font-weight: 800; color: #64748b;
            text-transform: uppercase; letter-spacing: 0.07em;
            margin-bottom: 10px;
          }
          .info-icon {
            width: 18px; height: 18px; border-radius: 4px;
            display: flex; align-items: center; justify-content: center;
            font-size: 9px; font-weight: 900;
          }
          .icon-emerald { background: #ecfdf5; border: 1px solid #a7f3d0; color: #10b981; }
          .icon-teal { background: #f0fdfa; border: 1px solid #99f6e4; color: #14b8a6; }
          .icon-sky { background: #f0f9ff; border: 1px solid #bae6fd; color: #0ea5e9; }
          .info-row {
            display: flex; justify-content: space-between;
            font-size: 10.5px; padding: 3px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #64748b; }
          .info-val { font-weight: 700; color: #0f172a; font-family: monospace; font-size: 10.5px; }
          .info-val-em { font-weight: 700; color: #10b981; font-family: monospace; font-size: 10.5px; }
          .info-name { font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 5px; }
          .info-addr { font-size: 10.5px; color: #475569; margin-bottom: 4px; line-height: 1.4; }
          .info-email { font-size: 10px; color: #0284c7; font-family: monospace; }
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
          .table-dot { width: 8px; height: 8px; border-radius: 50%; background: #0d9488; }
          .item-count { font-size: 10px; font-weight: 700; color: #64748b; }
          table {
            width: 100%; border-collapse: collapse;
            border: 1px solid #e2e8f0; border-radius: 10px;
            overflow: hidden; margin-bottom: 18px;
          }
          thead th {
            background: #f8fafc; border-bottom: 1px solid #e2e8f0;
            padding: 9px 12px; font-size: 10px; font-weight: 800;
            text-transform: uppercase; color: #64748b; letter-spacing: 0.04em;
          }
          tbody td {
            padding: 11px 12px; border-bottom: 1px solid #f1f5f9;
            font-size: 11.5px; color: #334155;
          }
          tbody tr:last-child td { border-bottom: none; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          /* Bottom 2-col grid */
          .footer-grid {
            display: grid; grid-template-columns: 1fr 1fr;
            gap: 16px; margin-bottom: 18px;
          }
          .settle-box {
            padding: 14px; border-radius: 10px; border: 1px solid;
          }
          .settle-box-paid { background: #f0fdf4; border-color: #bbf7d0; }
          .settle-box-bank { background: #f8fafc; border-color: #e2e8f0; }
          .settle-title {
            display: flex; align-items: center; justify-content: space-between;
            margin-bottom: 10px;
          }
          .settle-title-text {
            display: flex; align-items: center; gap: 6px;
            font-size: 10.5px; font-weight: 800;
          }
          .settle-title-text-paid { color: #059669; }
          .settle-title-text-bank { color: #0f172a; }
          .settle-badge-paid {
            font-size: 9px; font-weight: 800; color: #059669;
            background: #d1fae5; border: 1px solid #a7f3d0;
            border-radius: 999px; padding: 1px 8px;
          }
          .settle-row {
            display: flex; justify-content: space-between;
            font-size: 10.5px; padding: 3.5px 0;
            border-bottom: 1px solid rgba(0,0,0,0.06);
          }
          .settle-row:last-child { border-bottom: none; }
          .settle-label { color: #64748b; }
          .settle-val { font-weight: 700; color: #0f172a; }
          .settle-val-paid { font-weight: 700; color: #059669; }
          .summary-box { padding: 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
          .summary-title {
            display: flex; align-items: center; gap: 7px;
            font-size: 10.5px; font-weight: 800; color: #0f172a;
            margin-bottom: 10px;
          }
          .summary-dot { width: 8px; height: 8px; border-radius: 50%; background: #0d9488; }
          .summary-row {
            display: flex; justify-content: space-between;
            font-size: 10.5px; margin-bottom: 5px; color: #64748b;
          }
          .summary-row strong { color: #0f172a; }
          .summary-row-disc { color: #059669; font-weight: 700; }
          .total-payable-banner {
            background: #f0fdfa; border: 1px solid #99f6e4;
            border-radius: 10px; padding: 10px 12px;
            display: flex; justify-content: space-between; align-items: center;
            margin-top: 8px; margin-bottom: 6px;
          }
          .total-payable-left .label { font-size: 10px; font-weight: 900; color: #0d9488; text-transform: uppercase; letter-spacing: 0.06em; }
          .total-payable-left .sublabel { font-size: 9px; color: #64748b; margin-top: 2px; }
          .total-payable-amount { font-size: 20px; font-weight: 900; color: #0d9488; font-family: monospace; }
          .in-words { font-size: 9.5px; color: #64748b; text-align: right; }
          /* Sign-off */
          .signoff-row {
            border-top: 1.5px solid #e2e8f0;
            padding-top: 16px; margin-top: 4px;
            display: flex; justify-content: space-between; align-items: flex-end;
          }
          .sign-block { }
          .sign-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 8px; }
          .sign-label-right { text-align: right; }
          .sign-cursive { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 20px; font-weight: 700; color: #0f172a; height: 38px; display: flex; align-items: flex-end; }
          .sign-cursive-right { justify-content: flex-end; }
          .sign-stamp {
            display: inline-flex; flex-direction: column; align-items: center;
            padding: 6px 14px; background: linear-gradient(135deg, #ecfdf5, #f0fdfa);
            border: 1px solid #10b981; border-radius: 8px; color: #059669;
            font-size: 9.5px; font-weight: 800; letter-spacing: 0.06em;
            text-transform: uppercase; min-height: 38px; justify-content: center;
          }
          .sign-stamp sub { font-size: 8px; font-weight: 500; color: #64748b; text-transform: none; letter-spacing: 0; margin-top: 2px; }
          .sign-line { width: 150px; border-bottom: 1.5px solid #334155; margin-top: 4px; margin-bottom: 6px; }
          .sign-line-right { margin-left: auto; }
          .sign-name { font-size: 12px; font-weight: 800; color: #0f172a; }
          .sign-name-right { text-align: right; }
          .sign-role { font-size: 10px; color: #64748b; }
          .sign-role-right { text-align: right; }
          .sign-verified { font-size: 9px; font-weight: 800; color: #059669; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
          .sign-verified-right { justify-content: flex-end; }
          /* Terms */
          .terms-card {
            padding: 12px 16px; background: #f8fafc;
            border: 1px solid #e2e8f0; border-radius: 10px;
            font-size: 10.5px; color: #475569; line-height: 1.55;
            margin-top: 16px;
          }
          .terms-row { display: flex; align-items: flex-start; gap: 10px; }
          .terms-icon {
            width: 20px; height: 20px; flex-shrink: 0;
            border-radius: 5px; display: flex; align-items: center;
            justify-content: center; font-weight: 900; font-size: 11px; margin-top: 1px;
          }
          .terms-icon-main { background: #f0fdfa; border: 1px solid #99f6e4; color: #0d9488; }
          .terms-icon-notes { background: #ecfdf5; border: 1px solid #a7f3d0; color: #10b981; }
          .terms-divider { border-top: 1px solid #e2e8f0; margin: 8px 0; }
          .micro-footer {
            display: flex; justify-content: space-between;
            font-size: 9px; color: #94a3b8; margin-top: 12px; padding: 0 2px;
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
                ? `<img src="${companyLogoUrl}" style="width:44px;height:44px;object-fit:contain;border-radius:10px;border:1px solid #e2e8f0;padding:2px;" />`
                : `<div class="brand-logo-box">${(invoice.businessName || "NEXACE").charAt(0)}</div>`
              }
              <div>
                <div class="brand-name">${invoice.businessName || "NEXACE"}</div>
                <div class="brand-subtitle">${headerSubtitle}</div>
              </div>
            </div>
            <div class="header-right">
              <div class="ci-label">Commercial Invoice</div>
              <div class="inv-row">
                <div class="inv-pill">#${invoice.invoiceNo}</div>
                ${invoice.status === "Paid"
                  ? `<span class="status-badge" style="background:#f0fdf4;border-color:#bbf7d0;color:#059669;"><span class="status-dot" style="background:#10b981;"></span> PAID IN FULL</span>`
                  : invoice.status === "Pending"
                  ? `<span class="status-badge" style="background:#fffbeb;border-color:#fde68a;color:#d97706;"><span class="status-dot" style="background:#f59e0b;"></span> PENDING</span>`
                  : invoice.status === "Overdue"
                  ? `<span class="status-badge" style="background:#fff1f2;border-color:#fecdd3;color:#e11d48;"><span class="status-dot" style="background:#f43f5e;"></span> OVERDUE</span>`
                  : `<span class="status-badge" style="background:#f8fafc;border-color:#e2e8f0;color:#64748b;"><span class="status-dot" style="background:#94a3b8;"></span> ${invoice.status.toUpperCase()}</span>`
                }
              </div>
              <div class="ref-line">Reference: <strong>${invoice.customerNo || `REF-${invoice.invoiceNo}`}</strong></div>
            </div>
          </div>

          <!-- 3-Column Executive Info Cards -->
          <div class="info-grid">
            <!-- Card 1: Invoice Details -->
            <div class="info-card info-card-emerald">
              <div class="info-card-header">
                <div class="info-icon icon-emerald">&#9783;</div>
                Invoice Details
              </div>
              <div class="info-row">
                <span class="info-label">Invoice Date:</span>
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
                <span class="info-label">Currency:</span>
                <span class="info-val">${invoice.currency || "INR"} (${symbol})</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Terms:</span>
                <span class="info-val">${invoice.paymentTerms || "Due on receipt"}</span>
              </div>
            </div>

            <!-- Card 2: Invoice From -->
            <div class="info-card info-card-teal">
              <div class="info-card-header">
                <div class="info-icon icon-teal">&#9906;</div>
                Invoice From
              </div>
              <div class="info-name">${invoice.businessName}</div>
              <div class="info-addr">${invoice.businessAddress || "Professional Services &amp; Team Member"}</div>
              ${invoice.businessEmail ? `<div class="info-email">${invoice.businessEmail}</div>` : ""}
            </div>

            <!-- Card 3: Invoice To -->
            <div class="info-card info-card-sky">
              <div class="info-card-header">
                <div class="info-icon icon-sky">&#9993;</div>
                Invoice To (Client)
              </div>
              <div class="info-name">${invoice.billedToName}</div>
              <div class="info-addr">${invoice.billedToAddress || "Headquarters - Corporate Office"}</div>
              ${invoice.billedToEmail ? `<div class="info-email">${invoice.billedToEmail}</div>` : ""}
            </div>
          </div>

          <!-- Products / Service Items Table -->
          <div class="table-header-row">
            <div class="table-title">
              <div class="table-dot"></div>
              Products / Service Items
            </div>
            <div class="item-count">${invoice.items.length} ${invoice.items.length === 1 ? "Item" : "Items"}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:40px;text-align:center;">#</th>
                <th>Item &amp; Description</th>
                <th class="text-center" style="width:90px;">Qty / Hrs</th>
                <th class="text-right" style="width:110px;">Unit Price</th>
                <th class="text-right" style="width:120px;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, idx) => `
                <tr>
                  <td style="text-align:center;color:#94a3b8;font-family:monospace;">${idx + 1}</td>
                  <td><strong>${item.description}</strong></td>
                  <td class="text-center" style="font-family:monospace;font-weight:600;">${item.quantity}</td>
                  <td class="text-right" style="color:#64748b;font-family:monospace;">${symbol}${item.unitPrice.toLocaleString()}</td>
                  <td class="text-right" style="font-family:monospace;font-weight:800;font-size:13px;">${symbol}${item.amount.toLocaleString()}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <!-- Bottom 2-Column: Settlement + Financial Summary -->
          <div class="footer-grid">
            <!-- Left: Payment/Bank -->
            <div class="settle-box ${(invoice as any).paymentDetails?.method ? "settle-box-paid" : "settle-box-bank"}">
              ${(invoice as any).paymentDetails?.method ? `
                <div class="settle-title">
                  <div class="settle-title-text settle-title-text-paid">
                    ✓ Payment Received (${(invoice as any).paymentDetails.method})
                  </div>
                  <span class="settle-badge-paid">Paid</span>
                </div>
                <div class="settle-row">
                  <span class="settle-label">Payment Method:</span>
                  <span class="settle-val">${(invoice as any).paymentDetails.method === "Cash" ? "Cash Settlement" : (invoice as any).paymentDetails.method}</span>
                </div>
                ${(invoice as any).paymentDetails.method === "Bank Transfer" ? `
                  <div class="settle-row"><span class="settle-label">Bank Name:</span><span class="settle-val">${invoice.bankDetails?.bankName || "Corporate Banking"}</span></div>
                  <div class="settle-row"><span class="settle-label">Account No:</span><span class="settle-val" style="font-family:monospace;">${invoice.bankDetails?.accountNo || "782459739212"}</span></div>
                  <div class="settle-row"><span class="settle-label">IFSC / Code:</span><span class="settle-val" style="font-family:monospace;">${invoice.bankDetails?.ifscCode || "NEXA0004128"}</span></div>
                ` : ""}
                ${(invoice as any).paymentDetails.method === "UPI" ? `
                  <div class="settle-row"><span class="settle-label">${(invoice as any).paymentDetails.fromUpiId && (invoice as any).paymentDetails.toUpiId ? "Paid From:" : "UPI ID:"}</span>
                    <span class="settle-val" style="font-family:monospace;">${(invoice as any).paymentDetails.fromUpiId || (invoice as any).paymentDetails.upiId || invoice.bankDetails?.upiId || "nexace@okaxis"}</span></div>
                  ${(invoice as any).paymentDetails.toUpiId ? `<div class="settle-row"><span class="settle-label">Paid To:</span><span class="settle-val" style="font-family:monospace;">${(invoice as any).paymentDetails.toUpiId}</span></div>` : ""}
                  ${(invoice as any).paymentDetails.transactionId ? `<div class="settle-row"><span class="settle-label">Transaction ID:</span><span class="settle-val" style="font-family:monospace;">${(invoice as any).paymentDetails.transactionId}</span></div>` : ""}
                ` : ""}
                ${(invoice as any).paymentDetails.method === "Cash" ? `
                  <div class="settle-row"><span class="settle-label">Settlement:</span><span class="settle-val">Verified &amp; Settled in Cash</span></div>
                ` : ""}
                <div class="settle-row">
                  <span class="settle-label">Paid Date:</span>
                  <span class="settle-val-paid">${(invoice as any).paymentDetails.paidAt ? new Date((invoice as any).paymentDetails.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : invoice.invoiceDate}</span>
                </div>
                ${invoice.approvedBy ? `<div class="settle-row"><span class="settle-label">Approved By:</span><span class="settle-val-paid">${invoice.approvedBy}</span></div>` : ""}
                ${invoice.approvedAt ? `<div class="settle-row"><span class="settle-label">Approved On:</span><span class="settle-val">${new Date(invoice.approvedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>` : ""}
              ` : `
                <div class="settle-title">
                  <div class="settle-title-text settle-title-text-bank">
                    &#9632; Bank &amp; Payment Details
                  </div>
                </div>
                <div class="settle-row"><span class="settle-label">Bank Name:</span><span class="settle-val">${invoice.bankDetails?.bankName || "Corporate Banking Partner"}</span></div>
                <div class="settle-row"><span class="settle-label">Account No:</span><span class="settle-val" style="font-family:monospace;">${invoice.bankDetails?.accountNo || "782459739212"}</span></div>
                <div class="settle-row"><span class="settle-label">IFSC / Swift Code:</span><span class="settle-val" style="font-family:monospace;">${invoice.bankDetails?.ifscCode || "NEXA0004128"}</span></div>
                <div class="settle-row"><span class="settle-label">Payment Reference:</span><span class="settle-val" style="color:#00c5a0;font-family:monospace;">${invoice.invoiceNo}</span></div>
              `}
            </div>

            <!-- Right: Financial Summary -->
            <div class="summary-box">
              <div class="summary-title">
                <div class="summary-dot"></div>
                Financial Summary
              </div>
              <div class="summary-row">
                <span>Subtotal Amount:</span>
                <strong style="font-family:monospace;">${symbol}${invoice.subtotal.toLocaleString()}</strong>
              </div>
              ${invoice.taxRate > 0 ? `
              <div class="summary-row">
                <span>Tax / VAT (${invoice.taxRate}%):</span>
                <strong style="font-family:monospace;">+${symbol}${invoice.taxAmount.toLocaleString()}</strong>
              </div>` : ""}
              ${(invoice as any).discount > 0 ? `
              <div class="summary-row summary-row-disc">
                <span>Discount Applied:</span>
                <span style="font-family:monospace;">-${symbol}${((invoice as any).discount).toLocaleString()}</span>
              </div>` : ""}
              <div class="total-payable-banner">
                <div class="total-payable-left">
                  <div class="label">Total Payable</div>
                  <div class="sublabel">All applicable taxes &amp; fees included</div>
                </div>
                <div class="total-payable-amount">${symbol}${invoice.total.toLocaleString()}</div>
              </div>
              <div class="in-words">In Words: <em>${numberToWords(invoice.total)}</em></div>
            </div>
          </div>

          <!-- Dual Sign-Off Grid -->
          <div class="signoff-row">
            ${isEmployeeInvoice ? `
            <div class="sign-block">
              <div class="sign-label">Prepared &amp; Claimed By</div>
              ${invoice.signatureUrl
                ? `<img src="${invoice.signatureUrl}" style="height:38px;max-width:150px;object-fit:contain;display:block;mix-blend-mode:multiply;" />`
                : `<div class="sign-cursive">${invoice.businessName.split(" ")[0]}</div>`
              }
              <div class="sign-line"></div>
              <div class="sign-name">${invoice.businessName}</div>
              <div class="sign-role">${(invoice as any).businessSubtitle || "Employee • Engineering"}</div>
              <div class="sign-verified">✓ Claimant / Payee Verified</div>
            </div>
            ` : `<div></div>`}

            <div class="sign-block">
              <div class="sign-label sign-label-right">Verified &amp; Authorized By</div>
              ${displaySignature
                ? `<img src="${displaySignature}" style="height:38px;max-width:150px;object-fit:contain;display:block;margin-left:auto;mix-blend-mode:multiply;" />`
                : invoice.approvedBy
                ? `<div style="display:flex;justify-content:flex-end;"><div class="sign-stamp">• DIGITALLY AUTHORIZED •<sub>Corporate Finance Desk • Verified</sub></div></div>`
                : `<div class="sign-cursive sign-cursive-right">${signatoryEntity.split(" ")[0]}</div>`
              }
              <div class="sign-line sign-line-right"></div>
              <div class="sign-name sign-name-right">Authorized Signatory</div>
              ${invoice.approvedBy ? `<div class="sign-verified sign-verified-right">✓ Approved by ${invoice.approvedBy}</div>` : ""}
              <div class="sign-role sign-role-right">${signatoryEntity}</div>
            </div>
          </div>

          <!-- Terms & Conditions Card -->
          <div class="terms-card">
            <div class="terms-row">
              <div class="terms-icon terms-icon-main">&#9783;</div>
              <div>
                <strong style="color:#0f172a;text-transform:uppercase;font-size:9.5px;letter-spacing:0.05em;margin-right:6px;">Terms &amp; Conditions:</strong>
                Payment is requested within ${invoice.paymentTerms || "14 business days"} of receiving this invoice statement. For inquiries or remittances, please quote invoice reference #${invoice.invoiceNo}.
              </div>
            </div>
            ${invoice.notes ? `
              <div class="terms-divider"></div>
              <div class="terms-row">
                <div class="terms-icon terms-icon-notes">✓</div>
                <div>
                  <strong style="color:#0f172a;text-transform:uppercase;font-size:9.5px;letter-spacing:0.05em;margin-right:6px;">Notes &amp; Verified Records:</strong>
                  ${invoice.notes}
                </div>
              </div>
            ` : ""}
          </div>

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


  const handleDownloadPdf = () => {
    try {
      downloadInvoicePdf(
        {
          invoiceNo: invoice.invoiceNo,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          customerNo: invoice.customerNo,
          businessName: invoice.businessName || "NexAce IT Team",
          businessSubtitle: (invoice as any).businessSubtitle || (isEmployeeInvoice ? "Employee • Engineering" : undefined),
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
    } catch (err) {
      console.error("Failed to download PDF invoice:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Bar with Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="gap-2 font-semibold h-9 cursor-pointer hover:bg-muted text-foreground"
            >
              <i className="fa-solid fa-arrow-left text-xs" /> Back to Invoices
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <i className="fa-solid fa-file-invoice text-primary text-base" />
              Invoice #{invoice.invoiceNo}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issued on <strong className="text-foreground">{invoice.invoiceDate}</strong> •{" "}
              {invoice.status === "Paid" ? (
                <>
                  Paid on{" "}
                  <strong className="text-emerald-500 font-semibold">
                    {(invoice as any).paymentDetails?.paidAt
                      ? new Date((invoice as any).paymentDetails.paidAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : invoice.invoiceDate}
                  </strong>
                </>
              ) : (
                <>
                  Due by <strong className="text-foreground">{invoice.dueDate}</strong>
                  {(invoice as any).updatedAt && (
                    <span> • Updated: <strong className="text-foreground">{new Date((invoice as any).updatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}</strong></span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onStatusChange && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Status:</span>
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
                className="h-9 px-3 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer font-bold"
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
            className="gap-2 font-semibold h-9 px-3.5 cursor-pointer bg-card hover:bg-muted text-foreground border-border shadow-xs"
          >
            <i className="fa-solid fa-print text-xs" /> Print
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleDownloadPdf}
            className="gap-2 font-semibold h-9 px-4 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <i className="fa-solid fa-file-pdf text-xs" /> Download PDF
          </Button>
        </div>
      </div>

      {/* ── Main Invoice Paper Card ── */}
      <div
        ref={printRef}
        className="bg-card border border-border rounded-2xl p-5 sm:p-7 shadow-sm space-y-5 max-w-5xl mx-auto transition-all relative overflow-hidden"
      >
        {/* Executive top accent brand stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-primary" />

        {/* ── Invoice Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/80">
          <div>
            <div className="flex items-center gap-3">
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt="Organization Logo"
                  className="w-11 h-11 rounded-xl object-contain border border-border/80 bg-background p-1 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-teal-500/10 border border-primary/25 flex items-center justify-center text-primary font-black text-lg shadow-xs">
                  <i className="fa-solid fa-building-circle-check" />
                </div>
              )}
              <div>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-sans">{invoice.businessName || "NEXACE"}</span>
                <span className="block text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mt-0.5">
                  {headerSubtitle}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Commercial Invoice
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-black text-sm border border-primary/20">
                #{invoice.invoiceNo}
              </span>
              {getStatusBadge(invoice.status)}
            </div>
            <span className="text-xs text-muted-foreground">
              Reference: <strong className="text-foreground font-mono">{invoice.customerNo || `REF-${invoice.invoiceNo}`}</strong>
            </span>
          </div>
        </div>

        {/* ── 3-Column Info Block ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Col 1: Invoice Details */}
          <div className="p-3.5 bg-muted/15 dark:bg-slate-900/30 rounded-xl border border-border/70 border-t-2 border-t-emerald-500/80 space-y-2 shadow-2xs">
            <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-4.5 h-4.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <i className="fa-solid fa-file-invoice text-[9px]" />
              </span>
              Invoice Details
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-0.5 border-b border-border/40">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span className="font-semibold text-foreground font-mono">{invoice.invoiceDate}</span>
              </div>
              {invoice.status === "Paid" ? (
                <div className="flex justify-between py-0.5 border-b border-border/40">
                  <span className="text-muted-foreground">Paid Date:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {(invoice as any).paymentDetails?.paidAt
                      ? new Date((invoice as any).paymentDetails.paidAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : invoice.invoiceDate}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between py-0.5 border-b border-border/40">
                  <span className="text-muted-foreground">Due Date:</span>
                  <span className="font-semibold text-foreground font-mono">{invoice.dueDate}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5 border-b border-border/40">
                <span className="text-muted-foreground">Currency:</span>
                <span className="font-semibold text-foreground font-mono">{invoice.currency || "INR"} ({symbol})</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Payment Terms:</span>
                <span className="font-semibold text-foreground">{invoice.paymentTerms || "Due on receipt (14d)"}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Billing From */}
          <div className="p-3.5 bg-muted/15 dark:bg-slate-900/30 rounded-xl border border-border/70 border-t-2 border-t-teal-500/80 space-y-2 shadow-2xs">
            <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-4.5 h-4.5 rounded-md bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
                <i className="fa-solid fa-user-tie text-[9px]" />
              </span>
              Invoice From
            </h3>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm text-foreground">{invoice.businessName}</p>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed text-[11px]">
                {invoice.businessAddress || "Professional Services & Team Member"}
              </p>
              {invoice.businessEmail && (
                <p className="text-sky-600 dark:text-sky-400 font-mono text-[11px] pt-1 flex items-center gap-1.5">
                  <i className="fa-solid fa-envelope text-[10px] opacity-75" />
                  <span>{invoice.businessEmail}</span>
                </p>
              )}
            </div>
          </div>

          {/* Col 3: Billing To */}
          <div className="p-3.5 bg-muted/15 dark:bg-slate-900/30 rounded-xl border border-border/70 border-t-2 border-t-sky-500/80 space-y-2 shadow-2xs">
            <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <span className="w-4.5 h-4.5 rounded-md bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                <i className="fa-solid fa-building-circle-check text-[9px]" />
              </span>
              Invoice To (Client)
            </h3>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm text-foreground">{invoice.billedToName}</p>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed text-[11px]">
                {invoice.billedToAddress || "Headquarters - Corporate Office"}
              </p>
              {invoice.billedToEmail && (
                <p className="text-sky-600 dark:text-sky-400 font-mono text-[11px] pt-1 flex items-center gap-1.5">
                  <i className="fa-solid fa-envelope text-[10px] opacity-75" />
                  <span>{invoice.billedToEmail}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Products / Services Table ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-layer-group text-primary" /> Products / Service Items
            </h3>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {invoice.items.length} {invoice.items.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          <div className="border border-border rounded-xl overflow-x-auto shadow-2xs">
            <table className="w-full min-w-[550px] text-left text-xs">
              <thead className="bg-muted/60 dark:bg-slate-900/60 border-b border-border font-bold text-muted-foreground uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3.5 w-12 text-center">#</th>
                  <th className="py-2.5 px-3.5">Item &amp; Description</th>
                  <th className="py-2.5 px-3.5 text-center w-24">Qty / Hrs</th>
                  <th className="py-2.5 px-3.5 text-right w-32">Unit Price</th>
                  <th className="py-2.5 px-3.5 text-right w-36">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5 text-center font-mono text-muted-foreground">{idx + 1}</td>
                    <td className="py-2.5 px-3.5">
                      <div className="font-bold text-foreground text-sm">{item.description}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-medium text-foreground">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-muted-foreground">
                      {symbol}{item.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold text-foreground text-sm">
                      {symbol}{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Shift Clock & Timesheet Audit Breakdown (Admin View) ── */}
        {(invoice.shiftAttendance?.records?.length || invoice.timesheetEntries?.records?.length) ? (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left text-primary" /> Shift Clock &amp; Timesheet Audit
            </h3>

            {/* Shift Attendance Breakdown */}
            {invoice.shiftAttendance && invoice.shiftAttendance.records.length > 0 && (
              <div className="border border-border rounded-xl overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-3">Clock In</th>
                      <th className="py-2.5 px-3">Clock Out</th>
                      <th className="py-2.5 px-3 text-right">Hours</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
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
            )}

            {/* Timesheet Entries Breakdown */}
            {invoice.timesheetEntries && invoice.timesheetEntries.records.length > 0 && (
              <div className="border border-border rounded-xl overflow-x-auto">
                <div className="px-4 py-2.5 bg-primary/5 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-2">
                    <i className="fa-solid fa-table-list text-primary text-xs" /> Project Timesheets
                  </span>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="text-muted-foreground">{invoice.timesheetEntries.totalEntries} entries</span>
                    <span className="text-foreground font-mono">{invoice.timesheetEntries.totalHours} hrs</span>
                  </div>
                </div>
                <table className="w-full min-w-[500px] text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-3">Project</th>
                      <th className="py-2.5 px-3">Task</th>
                      <th className="py-2.5 px-3 text-right">Hours</th>
                      <th className="py-2.5 px-3 text-center">Billable</th>
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
          {/* Left: Dynamic Payment / Bank Details based on Status & Method */}
          {invoice.status === "Paid" && invoice.paymentDetails?.method ? (
            <div className="p-5 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-500" /> Payment Received
                  {invoice.paymentDetails.method === "UPI" && " (UPI)"}
                  {invoice.paymentDetails.method === "Cash" && " (Cash)"}
                  {invoice.paymentDetails.method === "Bank Transfer" && " (Bank Transfer)"}
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Paid
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className={cn(
                    "font-bold flex items-center gap-1.5",
                    invoice.paymentDetails.method === "UPI" ? "text-violet-600 dark:text-violet-400" :
                    invoice.paymentDetails.method === "Cash" ? "text-emerald-600 dark:text-emerald-400" :
                    "text-sky-600 dark:text-sky-400"
                  )}>
                    <i className={cn(
                      "fa-solid text-[10px]",
                      invoice.paymentDetails.method === "UPI" ? "fa-qrcode" :
                      invoice.paymentDetails.method === "Cash" ? "fa-money-bill-transfer" :
                      "fa-building-columns"
                    )} />
                    {invoice.paymentDetails.method === "Cash" ? "Cash Settlement" : invoice.paymentDetails.method}
                  </span>
                </div>

                {invoice.paymentDetails.method === "UPI" && (
                  <>
                    {(invoice.paymentDetails as any).fromUpiId && (
                      <div className="flex justify-between py-1 border-b border-border/50">
                        <span className="text-muted-foreground">Paid From UPI:</span>
                        <span className="font-mono font-bold text-foreground bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20 text-sky-600 dark:text-sky-400">
                          <i className="fa-solid fa-arrow-up-right-from-square mr-1 text-[9px]" />
                          {(invoice.paymentDetails as any).fromUpiId}
                        </span>
                      </div>
                    )}
                    {(invoice.paymentDetails as any).toUpiId ? (
                      <div className={cn("flex justify-between py-1", invoice.paymentDetails.transactionId ? "border-b border-border/50" : "")}>
                        <span className="text-muted-foreground">Paid To UPI:</span>
                        <span className="font-mono font-bold text-foreground bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <i className="fa-solid fa-arrow-down-left-and-up-right-to-ceiling mr-1 text-[9px]" />
                          {(invoice.paymentDetails as any).toUpiId}
                        </span>
                      </div>
                    ) : (
                      <div className={cn("flex justify-between py-1", invoice.paymentDetails.transactionId ? "border-b border-border/50" : "")}>
                        <span className="text-muted-foreground">UPI ID:</span>
                        <span className="font-mono font-bold text-foreground bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 text-violet-600 dark:text-violet-400">
                          <i className="fa-solid fa-qrcode mr-1 text-[9px]" />
                          {invoice.paymentDetails.upiId || invoice.bankDetails?.upiId || "nexace@okaxis"}
                        </span>
                      </div>
                    )}
                    {invoice.paymentDetails.transactionId && (
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Transaction ID:</span>
                        <span className="font-mono font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded">
                          {invoice.paymentDetails.transactionId}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {invoice.paymentDetails.method === "Bank Transfer" && (
                  <>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Bank Name:</span>
                      <span className="font-semibold text-foreground">{invoice.bankDetails?.bankName || "Corporate Banking"}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-mono font-semibold text-foreground">{invoice.bankDetails?.accountNo || "782459739212"}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">IFSC / Code:</span>
                      <span className="font-mono font-semibold text-foreground">{invoice.bankDetails?.ifscCode || "NEXA0004128"}</span>
                    </div>
                  </>
                )}

                {invoice.paymentDetails.method === "Cash" && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Settlement Status:</span>
                    <span className="font-semibold text-foreground">Verified &amp; Settled in Cash</span>
                  </div>
                )}

                {invoice.approvedBy && (
                  <div className="flex justify-between py-1 border-t border-border/50">
                    <span className="text-muted-foreground">Approved By:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <i className="fa-solid fa-circle-check text-[10px]" />
                      {invoice.approvedBy}
                    </span>
                  </div>
                )}
                {invoice.approvedAt && (
                  <div className="flex justify-between py-1 border-t border-border/50">
                    <span className="text-muted-foreground">Approved On:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(invoice.approvedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                {invoice.paymentDetails.screenshotUrl && (
                  <div className="pt-2 border-t border-border/50 flex justify-end">
                    <a
                      href={invoice.paymentDetails.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      <i className="fa-solid fa-receipt text-[10px]" />
                      View Payment Receipt
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/30 dark:bg-slate-900/40 rounded-xl border border-border/80 space-y-2.5">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <i className="fa-solid fa-building-columns text-primary" /> Bank &amp; Payment Details
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 border-b border-border/50">
                  <span className="text-muted-foreground">Bank Name:</span>
                  <span className="font-semibold text-foreground">{invoice.bankDetails?.bankName || "Corporate Banking Partner"}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-border/50">
                  <span className="text-muted-foreground">Account Number:</span>
                  <span className="font-mono font-semibold text-foreground">{invoice.bankDetails?.accountNo || "782459739212"}</span>
                </div>
                <div className="flex justify-between py-0.5 border-b border-border/50">
                  <span className="text-muted-foreground">IFSC / Swift Code:</span>
                  <span className="font-mono font-semibold text-foreground">{invoice.bankDetails?.ifscCode || "NEXA0004128"}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-muted-foreground">Payment Reference:</span>
                  <span className="font-mono font-bold text-primary">{invoice.invoiceNo}</span>
                </div>
              </div>
            </div>
          )}

          {/* Right: Financial Summary */}
          <div className="p-4 bg-muted/20 dark:bg-slate-900/50 rounded-xl border border-border/80 space-y-2.5">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-calculator text-primary" /> Financial Summary
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-0.5 text-muted-foreground">
                <span>Subtotal Amount:</span>
                <span className="font-mono font-semibold text-foreground">{symbol}{invoice.subtotal.toLocaleString()}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between py-0.5 text-muted-foreground">
                  <span>Tax / VAT ({invoice.taxRate}%):</span>
                  <span className="font-mono font-semibold text-foreground">+{symbol}{invoice.taxAmount.toLocaleString()}</span>
                </div>
              )}
              {Boolean(invoice.discount && invoice.discount > 0) && (
                <div className="flex justify-between py-0.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-{symbol}{(invoice.discount || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-foreground mt-2 shadow-2xs">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider block text-primary">Total Payable</span>
                  <span className="text-[10px] text-muted-foreground font-medium">All applicable taxes &amp; fees included</span>
                </div>
                <span className="text-xl font-black font-mono text-primary tracking-tight">
                  {symbol}{invoice.total.toLocaleString()}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground text-right pt-0.5 font-medium">
                In Words: <span className="text-foreground font-semibold italic">{numberToWords(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dual Sign-Off Grid ── */}
        <div className="pt-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          {isEmployeeInvoice ? (
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
              <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">
                Prepared &amp; Claimed By
              </p>
              <div className="h-10 flex items-end pb-0.5">
                {invoice.signatureUrl ? (
                  <img
                    src={invoice.signatureUrl}
                    alt="Claimant Signature"
                    className="h-9 max-w-[150px] object-contain mix-blend-multiply dark:mix-blend-screen"
                  />
                ) : (
                  <span className="font-serif italic text-xl text-foreground font-bold tracking-wider opacity-80 select-none">
                    {invoice.businessName.split(" ")[0]}
                  </span>
                )}
              </div>
              <div className="w-44 border-b-2 border-foreground/30" />
              <div>
                <p className="text-sm font-bold text-foreground">{invoice.businessName}</p>
                <p className="text-xs text-muted-foreground font-medium">{(invoice as any).businessSubtitle || "Employee • Engineering"}</p>
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center justify-center sm:justify-start gap-1">
                  <i className="fa-solid fa-circle-check text-[9px]" /> Claimant / Payee Verified
                </p>
              </div>
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-col items-center sm:items-end text-center sm:text-right space-y-1.5">
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest">
              Verified &amp; Authorized By
            </p>
            <div className="h-10 flex items-end pb-0.5">
              {displaySignature ? (
                <img
                  src={displaySignature}
                  alt="Authorized Signature"
                  className="h-9 max-w-[150px] object-contain mix-blend-multiply dark:mix-blend-screen"
                />
              ) : invoice.approvedBy ? (
                <div className="inline-flex flex-col items-center px-3.5 py-1.5 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-500/30 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-[9.5px] font-black tracking-widest uppercase">
                    <i className="fa-solid fa-stamp text-[10px] text-emerald-600 dark:text-emerald-400" />
                    <span>• DIGITALLY AUTHORIZED •</span>
                  </div>
                  <span className="text-[8.5px] font-medium text-muted-foreground mt-0.5">Corporate Finance Desk • Verified</span>
                </div>
              ) : (
                <span className="font-serif italic text-xl text-foreground font-bold tracking-wider opacity-80 select-none">
                  {signatoryEntity.split(" ")[0]}
                </span>
              )}
            </div>
            <div className="w-44 border-b-2 border-foreground/30" />
            <div>
              <p className="text-sm font-bold text-foreground">Authorized Signatory</p>
              {invoice.approvedBy && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-end gap-1 my-0.5">
                  <i className="fa-solid fa-circle-check text-[10px]" />
                  Approved by {invoice.approvedBy}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{signatoryEntity}</p>
            </div>
          </div>
        </div>

        {/* ── Bottom Footer: Terms & Conditions and Notes ── */}
        <div className="pt-3 border-t border-dashed border-border/80 space-y-2.5">
          <div className="p-3 bg-muted/20 dark:bg-slate-900/30 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
                <i className="fa-solid fa-file-contract text-[10px]" />
              </span>
              <p className="leading-relaxed">
                <strong className="text-foreground uppercase tracking-wider text-[11px] font-bold mr-1.5">
                  Terms &amp; Conditions:
                </strong>
                Payment is requested within {invoice.paymentTerms || "14 business days"} of receiving this invoice statement. For inquiries or remittances, please quote invoice reference #{invoice.invoiceNo}.
              </p>
            </div>

            {invoice.notes && (
              <div className="flex items-start gap-2.5 pt-2.5 border-t border-border/40">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                  <i className="fa-solid fa-clipboard-check text-[10px]" />
                </span>
                <div className="leading-relaxed text-foreground">
                  <strong className="text-muted-foreground uppercase tracking-wider text-[10px] font-bold mr-1.5">
                    Notes &amp; Verified Records:
                  </strong>
                  {invoice.notes}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[10px] text-muted-foreground/80 px-1 gap-1">
            <span>Official Commercial Document • NexAce Financial Desk</span>
            <span>Electronic Document • Legally valid without physical seal</span>
          </div>
        </div>
      </div>
    </div>
  );
}
