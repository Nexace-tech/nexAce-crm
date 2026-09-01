"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface AdminInvoicesTabProps {
  showToast: (message: string, type?: "success" | "error") => void;
}

export function AdminInvoicesTab({ showToast }: AdminInvoicesTabProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/it/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      } else {
        showToast("Failed to fetch invoices", "error");
      }
    } catch (err) {
      console.error("Error fetching invoices:", err);
      showToast("Error loading invoices", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    setUpdatingId(invoiceId);
    try {
      const res = await fetch(`/api/it/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        setInvoices((prev) =>
          prev.map((inv) => ((inv._id || inv.id) === invoiceId ? { ...inv, status: data.invoice.status } : inv))
        );
        showToast(`Invoice status updated to "${newStatus}"`, "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update invoice status", "error");
      }
    } catch (err) {
      console.error("Error updating invoice status:", err);
      showToast("Error updating invoice status", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesSearch =
      inv.invoiceNo.toLowerCase().includes(q) ||
      inv.businessName.toLowerCase().includes(q) ||
      inv.billedToName.toLowerCase().includes(q) ||
      inv.customerNo.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Paid: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      Sent: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      Draft: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
      Overdue: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      Cancelled: "bg-slate-500/10 text-slate-505 border-slate-500/20 line-through",
      Archived: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    };
    return (
      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border", colors[status] || "bg-muted text-muted-foreground")}>
        {status}
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = "INR") => {
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "AED" ? "AED " : "₹";
    return `${symbol}${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  const handleExportPDF = (invoice: Invoice) => {
    const symbol = invoice.currency === "USD" ? "$" : invoice.currency === "EUR" ? "€" : invoice.currency === "GBP" ? "£" : invoice.currency === "AED" ? "AED " : "₹";
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Pop-up blocker is preventing export. Please allow popups.", "error");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoice.invoiceNo}</title>
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
          @media print {
            body { margin: 20px; }
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
            <div style="font-weight: bold; font-size: 16px;">Invoice #: ${invoice.invoiceNo}</div>
            <div style="margin-top: 5px;">Date: ${invoice.invoiceDate}</div>
            <div>Due Date: ${invoice.dueDate}</div>
            <div>Status: ${invoice.status}</div>
          </div>
        </div>

        <div class="grid-addresses">
          <div class="address-box">
            <div class="address-title">From:</div>
            <div class="address-name">${invoice.businessName}</div>
            <div class="address-text">${invoice.businessAddress || ""}</div>
            <div class="address-text" style="font-family: monospace;">${invoice.businessEmail || ""}</div>
          </div>
          <div class="address-box">
            <div class="address-title">To:</div>
            <div class="address-name">${invoice.billedToName}</div>
            <div class="address-text">${invoice.billedToAddress || ""}</div>
            <div class="address-text" style="font-family: monospace;">${invoice.billedToEmail || ""}</div>
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
            ${invoice.items
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
              .join("")}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span style="font-family: monospace;">${symbol}${invoice.subtotal.toLocaleString()}</span>
          </div>
          ${
            invoice.taxRate > 0
              ? `
            <div class="totals-row">
              <span>Tax (${invoice.taxRate}%):</span>
              <span style="font-family: monospace;">${symbol}${invoice.taxAmount.toLocaleString()}</span>
            </div>
          `
              : ""
          }
          <div class="totals-row grand-total">
            <span>Grand Total:</span>
            <span style="font-family: monospace;">${symbol}${invoice.total.toLocaleString()}</span>
          </div>
        </div>

        ${
          invoice.notes
            ? `
          <div class="notes-section">
            <strong>Additional Notes:</strong>
            <p style="margin-top: 5px; white-space: pre-wrap;">${invoice.notes}</p>
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

  const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const pendingInvoiced = invoices.filter((inv) => inv.status === "Pending").reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidInvoiced = invoices.filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + (inv.total || 0), 0);

  if (viewInvoice) {
    return (
      <InvoiceDetailsView
        invoice={viewInvoice}
        onClose={() => setViewInvoice(null)}
        onStatusChange={(newStatus) => {
          const invId = viewInvoice._id || viewInvoice.id;
          if (invId) handleStatusChange(invId, newStatus);
        }}
        isUpdatingStatus={Boolean(updatingId)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Invoices</p>
              <p className="text-xl font-bold text-foreground">{invoices.length} ({formatCurrency(totalInvoiced)})</p>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <i className="fa-solid fa-file-invoice text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pending Approval</p>
              <p className="text-xl font-bold text-foreground">
                {invoices.filter((i) => i.status === "Pending").length} ({formatCurrency(pendingInvoiced)})
              </p>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
              <i className="fa-solid fa-clock text-lg" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Approved / Paid</p>
              <p className="text-xl font-bold text-foreground">
                {invoices.filter((i) => i.status === "Paid").length} ({formatCurrency(paidInvoiced)})
              </p>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <i className="fa-solid fa-circle-check text-lg" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <i className="fa-solid fa-file-invoice-dollar text-primary" /> Admin Master Invoice Management Center
            </CardTitle>
            <CardDescription className="text-xs">
              Review, approve, update status, and manage all employee self-generated and client invoices.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchInvoices}
            className="gap-1.5 text-xs font-semibold h-8 cursor-pointer shrink-0"
          >
            <i className="fa-solid fa-rotate-right text-xs" /> Refresh List
          </Button>
        </CardHeader>

        {/* Filter Bar */}
        <div className="p-4 border-b border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search invoice #, employee, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Sent">Sent</option>
              <option value="Draft">Draft</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {(search || statusFilter !== "All") && (
              <button
                onClick={() => { setSearch(""); setStatusFilter("All"); }}
                className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <i className="fa-solid fa-xmark" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Invoice Table */}
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border font-bold text-muted-foreground uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Issued By (Employee)</th>
                <th className="py-3 px-3">Billed To (Entity)</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions / Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <i className="fa-solid fa-spinner fa-spin mr-2 text-primary" /> Loading all invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No invoices found matching your search.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const invId = inv._id || inv.id || "";
                  const isUpdating = updatingId === invId;
                  return (
                    <tr key={invId} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-primary">{inv.invoiceNo}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-foreground">{inv.businessName}</div>
                        <div className="text-muted-foreground text-[11px] font-medium">{inv.businessAddress || "Employee"}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{inv.billedToName}</div>
                        <div className="text-muted-foreground text-[11px] font-mono">{inv.billedToEmail || "—"}</div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-mono">{inv.invoiceDate}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground text-sm">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>
                      <td className="py-3 px-3 text-center">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setViewInvoice(inv)}
                            className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer"
                            title="View Invoice Details"
                          >
                            <i className="fa-solid fa-eye text-[10px] text-primary" /> View
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportPDF(inv)}
                            className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer border-rose-500/20 hover:border-rose-500/50 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10"
                            title="Export Invoice to PDF"
                          >
                            <i className="fa-solid fa-file-pdf text-[10px]" /> PDF
                          </Button>

                          {inv.status === "Pending" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(invId, "Paid")}
                              className="gap-1 text-xs font-semibold h-7 px-2 cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              title="Approve & Mark as Paid"
                            >
                              <i className="fa-solid fa-check text-[10px]" /> Approve
                            </Button>
                          )}

                          <select
                            disabled={isUpdating}
                            value={inv.status}
                            onChange={(e) => handleStatusChange(invId, e.target.value)}
                            className="h-7 px-1.5 text-[11px] bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Sent">Sent</option>
                            <option value="Draft">Draft</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
