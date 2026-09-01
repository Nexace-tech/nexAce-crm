"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  };
}

interface InvoiceDetailsViewProps {
  invoice: InvoiceDetailsData;
  onClose?: () => void;
  onStatusChange?: (newStatus: string) => void;
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
  isUpdatingStatus = false,
}: InvoiceDetailsViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
      Sent: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
      Draft: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
      Overdue: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
      Cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/30 line-through",
      Archived: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    };
    return (
      <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border", styles[status] || "bg-muted text-muted-foreground")}>
        <i className="fa-solid fa-circle text-[6px] mr-1.5 opacity-70" />
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
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 13px;
            line-height: 1.5;
          }
          .invoice-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 32px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 24px;
            margin-bottom: 24px;
          }
          .brand-logo {
            font-size: 24px;
            font-weight: 800;
            color: #00c5a0;
            letter-spacing: -0.5px;
          }
          .brand-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
          }
          .invoice-tag {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 14px;
            border-radius: 8px;
            text-align: right;
          }
          .invoice-no {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
            margin-bottom: 28px;
          }
          .info-col h4 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #94a3b8;
            margin: 0 0 8px 0;
            font-weight: 700;
          }
          .info-col .name {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .info-col p {
            margin: 2px 0;
            color: #475569;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          thead th {
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
            padding: 10px 14px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
          }
          tbody td {
            padding: 12px 14px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 12px;
            color: #334155;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .footer-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 32px;
            margin-top: 24px;
          }
          .bank-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
          }
          .bank-box h5 {
            margin: 0 0 10px 0;
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
          }
          .bank-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            margin-bottom: 4px;
            color: #475569;
          }
          .summary-box {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin-bottom: 8px;
            color: #475569;
          }
          .summary-total {
            border-top: 2px solid #e2e8f0;
            padding-top: 10px;
            margin-top: 10px;
            font-size: 16px;
            font-weight: 800;
            color: #00c5a0;
          }
          .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 36px;
            padding-top: 24px;
            border-top: 1px dashed #e2e8f0;
          }
          .terms-block {
            font-size: 11px;
            color: #64748b;
            max-width: 420px;
          }
          .sign-block {
            text-align: center;
          }
          .sign-line {
            width: 140px;
            border-bottom: 1.5px solid #0f172a;
            margin-bottom: 6px;
          }
        </style>
      </head>
      <body>
        <div class="invoice-card">
          <div class="header-row">
            <div>
              <div class="brand-logo">NEXACE</div>
              <div class="brand-subtitle">CRM &amp; Enterprise Solutions</div>
            </div>
            <div class="invoice-tag">
              <div class="invoice-no">${invoice.invoiceNo}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Status: <strong>${invoice.status}</strong></div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-col">
              <h4>Invoice Details</h4>
              <p><strong>Issued:</strong> ${invoice.invoiceDate}</p>
              <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
              <p><strong>Ref #:</strong> ${invoice.customerNo || "N/A"}</p>
            </div>
            <div class="info-col">
              <h4>Invoice From</h4>
              <div class="name">${invoice.businessName}</div>
              <p>${invoice.businessAddress || "Authorized Consultant"}</p>
              <p>${invoice.businessEmail || ""}</p>
            </div>
            <div class="info-col">
              <h4>Invoice To</h4>
              <div class="name">${invoice.billedToName}</div>
              <p>${invoice.billedToAddress || "Headquarters"}</p>
              <p>${invoice.billedToEmail || ""}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Item / Description</th>
                <th class="text-center" style="width: 80px;">Qty</th>
                <th class="text-right" style="width: 110px;">Rate</th>
                <th class="text-right" style="width: 120px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${item.description}</strong></td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${symbol}${item.unitPrice.toLocaleString()}</td>
                  <td class="text-right"><strong>${symbol}${item.amount.toLocaleString()}</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer-grid">
            <div class="bank-box">
              <h5>Bank &amp; Payment Details</h5>
              <div class="bank-row"><span>Bank:</span><strong>${invoice.bankDetails?.bankName || "Corporate Banking"}</strong></div>
              <div class="bank-row"><span>Account No:</span><strong>${invoice.bankDetails?.accountNo || "782459739212"}</strong></div>
              <div class="bank-row"><span>IFSC / Code:</span><strong>${invoice.bankDetails?.ifscCode || "NEXA0004128"}</strong></div>
              <div class="bank-row"><span>Payment Ref:</span><strong>${invoice.invoiceNo}</strong></div>
            </div>

            <div class="summary-box">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>${symbol}${invoice.subtotal.toLocaleString()}</span>
              </div>
              ${invoice.taxRate > 0 ? `
                <div class="summary-row">
                  <span>Tax (${invoice.taxRate}%):</span>
                  <span>${symbol}${invoice.taxAmount.toLocaleString()}</span>
                </div>
              ` : ""}
              <div class="summary-row summary-total">
                <span>Total Amount:</span>
                <span>${symbol}${invoice.total.toLocaleString()}</span>
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 4px; text-align: right;">
                ${numberToWords(invoice.total)}
              </div>
            </div>
          </div>

          <div class="signature-section">
            <div class="terms-block">
              <strong>Terms &amp; Conditions:</strong><br />
              Payment is due within ${invoice.paymentTerms || "14 days"} from date of invoice. Please include invoice reference # on remittance.
              ${invoice.notes ? `<br /><strong>Notes:</strong> ${invoice.notes}` : ""}
            </div>
            <div class="sign-block">
              <div class="sign-line"></div>
              <div style="font-size: 11px; font-weight: 700; color: #0f172a;">Authorized Signatory</div>
              <div style="font-size: 10px; color: #64748b;">${invoice.businessName}</div>
            </div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
              Issued on <strong className="text-foreground">{invoice.invoiceDate}</strong> • Due by <strong className="text-foreground">{invoice.dueDate}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onStatusChange && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Status:</span>
              <select
                disabled={isUpdatingStatus}
                value={invoice.status}
                onChange={(e) => onStatusChange(e.target.value)}
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
            onClick={handlePrint}
            className="gap-2 font-semibold h-9 px-4 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <i className="fa-solid fa-file-pdf text-xs" /> Download PDF
          </Button>
        </div>
      </div>

      {/* ── Main Invoice Paper Card ── */}
      <div
        ref={printRef}
        className="bg-card border border-border rounded-2xl p-6 sm:p-10 shadow-sm space-y-8 max-w-5xl mx-auto transition-all"
      >
        {/* ── Invoice Header ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-lg">
                <i className="fa-solid fa-bolt" />
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-foreground">NEXACE</span>
                <span className="block text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  CRM &amp; Enterprise Solutions
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary font-mono font-black text-sm border border-primary/20">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-muted/20 dark:bg-slate-900/40 rounded-xl border border-border/60">
          {/* Col 1: Invoice Details */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-file-lines text-primary text-xs" /> Invoice Information
            </h3>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-0.5 border-b border-border/40">
                <span className="text-muted-foreground">Invoice Date:</span>
                <span className="font-semibold text-foreground font-mono">{invoice.invoiceDate}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/40">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-semibold text-foreground font-mono">{invoice.dueDate}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-border/40">
                <span className="text-muted-foreground">Currency:</span>
                <span className="font-semibold text-foreground font-mono">{invoice.currency || "USD"} ({symbol})</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-muted-foreground">Payment Terms:</span>
                <span className="font-semibold text-foreground">{invoice.paymentTerms || "Due on receipt (14d)"}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Billing From */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-building-user text-primary text-xs" /> Invoice From
            </h3>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm text-foreground">{invoice.businessName}</p>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
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
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-location-dot text-primary text-xs" /> Invoice To (Client)
            </h3>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-sm text-foreground">{invoice.billedToName}</p>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
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

          <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 dark:bg-slate-900/60 border-b border-border font-bold text-muted-foreground uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Item &amp; Description</th>
                  <th className="py-3 px-4 text-center w-24">Qty / Hrs</th>
                  <th className="py-3 px-4 text-right w-32">Unit Price</th>
                  <th className="py-3 px-4 text-right w-36">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground text-sm">{item.description}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-medium text-foreground">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                      {symbol}{item.unitPrice.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground text-sm">
                      {symbol}{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Bottom 2-Column: Bank Details & Financial Summary ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left: Bank Details */}
          <div className="p-5 bg-muted/30 dark:bg-slate-900/40 rounded-xl border border-border/80 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-building-columns text-primary" /> Bank &amp; Payment Details
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Bank Name:</span>
                <span className="font-semibold text-foreground">{invoice.bankDetails?.bankName || "Corporate Banking Partner"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Account Number:</span>
                <span className="font-mono font-semibold text-foreground">{invoice.bankDetails?.accountNo || "782459739212"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">IFSC / Swift Code:</span>
                <span className="font-mono font-semibold text-foreground">{invoice.bankDetails?.ifscCode || "NEXA0004128"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Payment Reference:</span>
                <span className="font-mono font-bold text-primary">{invoice.invoiceNo}</span>
              </div>
            </div>
          </div>

          {/* Right: Financial Summary */}
          <div className="p-5 bg-muted/20 dark:bg-slate-900/50 rounded-xl border border-border/80 space-y-3">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-calculator text-primary" /> Financial Summary
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-muted-foreground">
                <span>Subtotal Amount:</span>
                <span className="font-mono font-semibold text-foreground">{symbol}{invoice.subtotal.toLocaleString()}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Tax / VAT ({invoice.taxRate}%):</span>
                  <span className="font-mono font-semibold text-foreground">+{symbol}{invoice.taxAmount.toLocaleString()}</span>
                </div>
              )}
              {Boolean(invoice.discount && invoice.discount > 0) && (
                <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-{symbol}{(invoice.discount || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-border text-foreground">
                <span className="text-sm font-bold">Total Payable Amount:</span>
                <span className="text-2xl font-black font-mono text-primary">
                  {symbol}{invoice.total.toLocaleString()}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground text-right italic pt-1">
                Amount in words: <strong className="text-foreground not-italic">{numberToWords(invoice.total)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ── Terms & Conditions and Signature ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-dashed border-border items-end">
          <div className="space-y-2 text-xs text-muted-foreground">
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <i className="fa-solid fa-circle-info text-primary" /> Terms &amp; Conditions
            </h4>
            <p className="leading-relaxed">
              Payment is requested within {invoice.paymentTerms || "14 business days"} of receiving this invoice statement. For inquiries or remittances, please contact the finance desk.
            </p>
            {invoice.notes && (
              <div className="p-3 bg-muted/40 rounded-lg border border-border/60 text-foreground font-medium mt-2 whitespace-pre-line leading-relaxed">
                <strong className="text-xs block text-muted-foreground uppercase text-[10px] mb-0.5">Notes &amp; Attachments:</strong>
                {invoice.notes}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center md:items-end justify-end space-y-2 text-center md:text-right">
            {/* Signature Graphic */}
            <div className="h-12 flex items-center justify-center">
              <span className="font-serif italic text-2xl text-foreground font-bold tracking-wider opacity-80 select-none">
                {invoice.businessName.split(" ")[0]}
              </span>
            </div>
            <div className="w-48 border-b-2 border-foreground/40" />
            <div>
              <p className="text-xs font-bold text-foreground">Authorized Signature</p>
              <p className="text-[11px] text-muted-foreground">{invoice.businessName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
