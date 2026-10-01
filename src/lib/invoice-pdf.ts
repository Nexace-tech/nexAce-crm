import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoicePdfData {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerNo?: string;
  businessName: string;
  businessSubtitle?: string;
  businessAddress?: string;
  businessEmail?: string;
  logoUrl?: string;
  billedToName: string;
  billedToAddress?: string;
  billedToEmail?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
  currency?: string;
  status: string;
  notes?: string;
  paymentTerms?: string;
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifscCode?: string;
    upiId?: string;
    branch?: string;
  };
  paymentDetails?: {
    method?: string;
    upiId?: string;
    transactionId?: string;
    paidAt?: Date | string;
  };
  signatureUrl?: string;
  orgSignatureUrl?: string;
  employeeSignatureUrl?: string;
  approvedBy?: string;
  approvedAt?: string;
}

function numberToWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  if (num === 0) return "Zero Rupees Only";

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

  return str.trim() + " Rupees Only";
}

export function generateInvoicePdfDoc(invoice: InvoicePdfData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const currencySymbol =
    invoice.currency === "USD"
      ? "$"
      : invoice.currency === "EUR"
      ? "€"
      : invoice.currency === "GBP"
      ? "£"
      : invoice.currency === "AED"
      ? "AED "
      : "Rs. ";

  const isPaid = invoice.status === "Paid";
  const leftX = 14;
  const rightX = 196;
  const contentWidth = rightX - leftX; // 182mm

  // ── Executive Top Gradient Accent Bar (emerald → teal → sky) ─────────────
  {
    const barH = 2;
    const barW = 210;
    const steps = 80;
    const from = [16, 185, 129];  // #10b981 emerald-500
    const mid  = [20, 184, 166];  // #14b8a6 teal-400
    const to   = [14, 165, 233];  // #0ea5e9 sky-500
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      let r, g, b;
      if (t < 0.5) {
        const t2 = t * 2;
        r = Math.round(from[0] + (mid[0] - from[0]) * t2);
        g = Math.round(from[1] + (mid[1] - from[1]) * t2);
        b = Math.round(from[2] + (mid[2] - from[2]) * t2);
      } else {
        const t2 = (t - 0.5) * 2;
        r = Math.round(mid[0] + (to[0] - mid[0]) * t2);
        g = Math.round(mid[1] + (to[1] - mid[1]) * t2);
        b = Math.round(mid[2] + (to[2] - mid[2]) * t2);
      }
      const sliceW = barW / steps;
      doc.setFillColor(r, g, b);
      doc.rect(i * sliceW, 0, sliceW + 0.2, barH, "F");
    }
  }

  // ── Header Row ─────────────────────────────────────────────────────────────
  const headerY = 16;
  let hasRenderedImgLogo = false;
  if (invoice.logoUrl && (invoice.logoUrl.startsWith("data:image") || invoice.logoUrl.startsWith("http"))) {
    try {
      const format = invoice.logoUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(invoice.logoUrl, format, leftX, headerY, 15, 15);
      hasRenderedImgLogo = true;
    } catch {
      hasRenderedImgLogo = false;
    }
  }

  if (!hasRenderedImgLogo) {
    // Official CRM Circular Emblem matching screenshot reference
    const emblemCenterX = leftX + 7.5;
    const emblemCenterY = headerY + 7.5;
    doc.setFillColor(240, 253, 250); // teal-50
    doc.setDrawColor(20, 184, 166); // teal-500
    doc.setLineWidth(0.6);
    doc.circle(emblemCenterX, emblemCenterY, 7.5, "FD");

    // "CRM" text in center
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("CRM", emblemCenterX, emblemCenterY + 2.8, { align: "center" });

    // Decorative cyclic arrow dots
    doc.setFillColor(13, 148, 136);
    doc.circle(emblemCenterX - 5.5, emblemCenterY - 3, 0.7, "F");
    doc.circle(emblemCenterX + 5.5, emblemCenterY + 3, 0.7, "F");
  }

  // Brand Name & Subtitle
  const brandName = invoice.businessName || "Ashish Sharma";
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text(brandName, leftX + 18, headerY + 6.5);

  // Dynamic Subtitle / Employee Role
  const headerSubtitle = (invoice.businessSubtitle && invoice.businessSubtitle.trim())
    ? invoice.businessSubtitle.toUpperCase()
    : (invoice.businessAddress && invoice.businessAddress.trim())
    ? invoice.businessAddress.toUpperCase()
    : invoice.businessName && !invoice.businessName.toLowerCase().includes("nexace")
    ? "PROFESSIONAL SERVICES & CONSULTING"
    : "CRM & ENTERPRISE SOLUTIONS";

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text(headerSubtitle, leftX + 18, headerY + 11.5);

  // Header Right: Elegant Invoice Box matching preview
  const invBoxW = 68;
  const invBoxH = 22;
  const invBoxX = rightX - invBoxW;
  const invBoxY = headerY - 2;

  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.35);
  doc.roundedRect(invBoxX, invBoxY, invBoxW, invBoxH, 2.5, 2.5, "FD");

  // Commercial Invoice Small Cap Header
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("COMMERCIAL INVOICE", invBoxX + invBoxW - 4, invBoxY + 4.5, { align: "right" });

  // Invoice Number
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoiceNo, invBoxX + invBoxW - 4, invBoxY + 9.8, { align: "right" });

  // Status Pill Badge matching reference screenshot
  const pillW = 28;
  const pillH = 5;
  const pillX = invBoxX + invBoxW - 4 - pillW;
  const pillY = invBoxY + 11.2;

  if (isPaid) {
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.setLineWidth(0.25);
    doc.roundedRect(pillX, pillY, pillW, pillH, 2.5, 2.5, "FD");

    // Vector checkmark
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.4);
    doc.line(pillX + 2.5, pillY + 2.6, pillX + 3.6, pillY + 3.6);
    doc.line(pillX + 3.6, pillY + 3.6, pillX + 5.2, pillY + 1.6);

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text("PAID IN FULL", pillX + 6.4, pillY + 3.6);
  } else if (invoice.status === "Pending") {
    doc.setFillColor(254, 243, 199); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.setLineWidth(0.25);
    doc.roundedRect(pillX, pillY, pillW, pillH, 2.5, 2.5, "FD");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text("PENDING", pillX + pillW / 2, pillY + 3.6, { align: "center" });
  } else {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(pillX, pillY, pillW, pillH, 2.5, 2.5, "FD");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text((invoice.status || "DRAFT").toUpperCase(), pillX + pillW / 2, pillY + 3.6, { align: "center" });
  }

  // Approved or Reference Line
  if (invoice.approvedBy) {
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text(`Approved: ${invoice.approvedBy}`, invBoxX + invBoxW - 4, invBoxY + 19.5, { align: "right" });
  } else {
    const refText = invoice.customerNo || `REF-${invoice.invoiceNo}`;
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Ref: ${refText}`, invBoxX + invBoxW - 4, invBoxY + 19.5, { align: "right" });
  }

  // Subtle divider below header
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.4);
  doc.line(leftX, 39, rightX, 39);

  // ── 3-Column Info Section (Details, From, To) ─────────────────────────
  const infoY = 44;
  const col1X = leftX;
  const col2X = leftX + 60;
  const col3X = leftX + 122;

  // Column 1: INVOICE DETAILS
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("INVOICE DETAILS", col1X, infoY);

  const drawDetailRow = (lbl: string, val: string, yPos: number, isGreen = false) => {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(lbl, col1X, yPos);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(isGreen ? 5 : 15, isGreen ? 150 : 23, isGreen ? 105 : 42);
    doc.text(val, col1X + 19, yPos);
  };

  drawDetailRow("Issued:", invoice.invoiceDate || "-", infoY + 5.5);

  const paidDateVal = invoice.paymentDetails?.paidAt
    ? new Date(invoice.paymentDetails.paidAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : invoice.invoiceDate;

  if (isPaid) {
    drawDetailRow("Paid Date:", paidDateVal || "-", infoY + 10.5, true);
  } else {
    drawDetailRow("Due Date:", invoice.dueDate || "-", infoY + 10.5, false);
  }

  const refCode = invoice.customerNo || `REF-${invoice.invoiceNo}`;
  const truncRef = refCode.length > 20 ? refCode.slice(0, 18) + ".." : refCode;
  drawDetailRow("Ref #:", truncRef, infoY + 15.5);

  // Column 2: INVOICE FROM
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(148, 163, 184);
  doc.text("INVOICE FROM", col2X, infoY);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const fromName = invoice.businessName || "Ashish Sharma";
  doc.text(fromName, col2X, infoY + 5.5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const fromSubtitle = (invoice as any).businessSubtitle || invoice.businessAddress || "Employee • Engineering (Permanent Staff)";
  const fromLines = doc.splitTextToSize(fromSubtitle, 56).slice(0, 2);
  doc.text(fromLines, col2X, infoY + 9.5);

  if (invoice.businessEmail) {
    doc.setFontSize(6.5);
    doc.setTextColor(2, 132, 199); // sky-600
    doc.text(invoice.businessEmail, col2X, infoY + 16.5);
  }

  // Column 3: INVOICE TO
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(148, 163, 184);
  doc.text("INVOICE TO", col3X, infoY);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const toName = invoice.billedToName || "Nex Ace";
  doc.text(toName, col3X, infoY + 5.5);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const toAddr = invoice.billedToAddress || "Building no 1254, Tower B Zone, Gurgaon, Noida, 110078, India";
  const toLines = doc.splitTextToSize(toAddr, 58).slice(0, 2);
  doc.text(toLines, col3X, infoY + 9.5);

  if (invoice.billedToEmail) {
    doc.setFontSize(6.5);
    doc.setTextColor(2, 132, 199);
    doc.text(invoice.billedToEmail, col3X, infoY + 16.5);
  }

  // ── Items Table ────────────────────────────────────────────────────────────
  const tableData = invoice.items.map((item, idx) => {
    const bracketMatch = item.description.match(/^(.*?)\s*(\[.*?\]|\(.*?\))\s*$/);
    const mainTitle = bracketMatch ? bracketMatch[1] : item.description;
    const subPeriod = bracketMatch ? bracketMatch[2].replace(/[\[\]]/g, "") : null;
    const descText = subPeriod ? `${mainTitle} [${subPeriod}]` : mainTitle;

    return [
      (idx + 1).toString(),
      descText,
      (item.quantity ?? 1).toString(),
      item.unitPrice < 0
        ? `-${currencySymbol}${Math.abs(item.unitPrice).toLocaleString()}`
        : `${currencySymbol}${item.unitPrice.toLocaleString()}`,
      item.amount < 0
        ? `-${currencySymbol}${Math.abs(item.amount).toLocaleString()}`
        : `${currencySymbol}${item.amount.toLocaleString()}`,
    ];
  });

  autoTable(doc, {
    startY: 68,
    margin: { left: leftX, right: 210 - rightX },
    head: [["#", "Item / Description", "Qty", "Rate", "Amount"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252], // #f8fafc
      textColor: [71, 85, 105], // #475569
      fontSize: 8,
      fontStyle: "bold",
      halign: "left",
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      lineColor: [226, 232, 240],
      lineWidth: { top: 0.35, bottom: 0.35, left: 0, right: 0 },
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto", fontStyle: "bold" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 32, halign: "right", fontStyle: "bold" },
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      textColor: [15, 23, 42], // #0f172a
      lineColor: [241, 245, 249],
      lineWidth: { bottom: 0.3 },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
  });

  // Draw rounded border around the complete table
  const tableStartY = 68;
  const tableEndY = (doc as any).lastAutoTable.finalY;
  const tableH = tableEndY - tableStartY;
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.4);
  doc.roundedRect(leftX, tableStartY, contentWidth, tableH, 2.5, 2.5, "S");

  const finalY = tableEndY + 8;

  // ── Settlement & Financial Summary Boxes ─────────────────────────────────
  const isBankTransfer = isPaid && invoice.paymentDetails?.method === "Bank Transfer";
  const isUpi = isPaid && invoice.paymentDetails?.method === "UPI";
  const isCash = isPaid && invoice.paymentDetails?.method === "Cash";
  const hasTax = Boolean(invoice.taxRate && invoice.taxRate > 0);
  const hasDiscount = Boolean(invoice.discount && invoice.discount > 0);

  const leftBoxW = 87;
  const rightBoxX = 107;
  const rightBoxW = 89;
  const boxesH = 46;

  // --- LEFT BOX: Payment Received / Bank Details ---
  if (isPaid) {
    doc.setFillColor(240, 253, 244); // #f0fdf4
    doc.setDrawColor(167, 243, 208); // #a7f3d0
    doc.setLineWidth(0.4);
    doc.roundedRect(leftX, finalY, leftBoxW, boxesH, 2.5, 2.5, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text("Payment Received", leftX + 4.5, finalY + 7);

    let payRowY = finalY + 13.5;
    const lValX = leftX + leftBoxW - 4.5;

    const drawPayItem = (label: string, val: string, isValBold = true) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label, leftX + 4.5, payRowY);

      doc.setFont("helvetica", isValBold ? "bold" : "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(val, lValX, payRowY, { align: "right" });
      payRowY += 4.8;
    };

    drawPayItem("Method:", invoice.paymentDetails?.method || "Bank Transfer");

    if (isBankTransfer || (!isUpi && !isCash)) {
      drawPayItem("Bank:", invoice.bankDetails?.bankName || "Axis Bank");
      drawPayItem("Account No:", invoice.bankDetails?.accountNo || "48571847770003");
      drawPayItem("IFSC / Code:", invoice.bankDetails?.ifscCode || "UTIB00078L");
    } else if (isUpi) {
      const fromUpi = (invoice.paymentDetails as any)?.fromUpiId || "nexace@axl";
      const toUpi = (invoice.paymentDetails as any)?.toUpiId || "linuxclaw@axl";
      drawPayItem("Paid From:", fromUpi);
      drawPayItem("Paid To:", toUpi);
      if (invoice.paymentDetails?.transactionId) {
        drawPayItem("Txn ID:", invoice.paymentDetails.transactionId);
      }
    } else if (isCash) {
      drawPayItem("Status:", "Verified & Settled in Cash");
    }

    drawPayItem("Paid Date:", paidDateVal || invoice.invoiceDate);
  } else {
    // Unpaid: Bank & Payment Details
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.roundedRect(leftX, finalY, leftBoxW, boxesH, 2.5, 2.5, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Bank & Payment Details", leftX + 4.5, finalY + 7);

    let bankRowY = finalY + 13.5;
    const lValX = leftX + leftBoxW - 4.5;

    const drawBankItem = (label: string, val: string) => {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label, leftX + 4.5, bankRowY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(val, lValX, bankRowY, { align: "right" });
      bankRowY += 4.8;
    };

    drawBankItem("Bank:", invoice.bankDetails?.bankName || "Axis Bank");
    drawBankItem("Account No:", invoice.bankDetails?.accountNo || "48571847770003");
    drawBankItem("IFSC / Code:", invoice.bankDetails?.ifscCode || "UTIB00078L");
    drawBankItem("Payment Ref:", invoice.invoiceNo);
  }

  // --- RIGHT BOX: Financial Summary ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(rightBoxX, finalY, rightBoxW, boxesH, 2.5, 2.5, "FD");

  let sumY = finalY + 8;
  const rValX = rightBoxX + rightBoxW - 5;

  // Subtotal
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal:", rightBoxX + 5, sumY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${currencySymbol}${invoice.subtotal.toLocaleString()}`, rValX, sumY, { align: "right" });

  if (hasTax) {
    sumY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Tax (${invoice.taxRate}%):`, rightBoxX + 5, sumY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`+${currencySymbol}${(invoice.taxAmount || 0).toLocaleString()}`, rValX, sumY, { align: "right" });
  }

  if (hasDiscount) {
    sumY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(5, 150, 105);
    doc.text("Discount:", rightBoxX + 5, sumY);
    doc.setFont("helvetica", "bold");
    doc.text(`-${currencySymbol}${(invoice.discount || 0).toLocaleString()}`, rValX, sumY, { align: "right" });
  }

  // Divider line
  sumY += 4.5;
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.3);
  doc.line(rightBoxX + 5, sumY, rValX, sumY);

  // Total Amount Row
  sumY += 7.5;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 148, 136); // teal-600 #0d9488
  doc.text("Total Amount:", rightBoxX + 5, sumY);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105); // emerald-600 #059669
  doc.text(`${currencySymbol}${invoice.total.toLocaleString()}`, rValX, sumY, { align: "right" });

  // In Words
  sumY += 5.5;
  doc.setFontSize(6);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  const wordsValue = numberToWords(invoice.total);
  doc.text(wordsValue, rValX, sumY, { align: "right" });

  // ── Dual Sign-Off Grid (Signatures BEFORE Terms & Notes) ──────────────────
  const isEmployeeInvoice =
    (invoice.invoiceNo && invoice.invoiceNo.startsWith("INV-SAL")) ||
    (invoice.customerNo && (invoice.customerNo.startsWith("EMP-") || invoice.customerNo.includes("SAL"))) ||
    Boolean(invoice.businessSubtitle && invoice.businessSubtitle.toUpperCase().includes("EMPLOYEE"));

  const companySignatoryName = isEmployeeInvoice
    ? (invoice.billedToName || "Nex Ace")
    : (invoice.businessName || "NexAce Technologies");

  const effectiveOrgSig = invoice.orgSignatureUrl || (!isEmployeeInvoice ? invoice.signatureUrl : undefined);
  const employeeClaimSig = isEmployeeInvoice ? (invoice.employeeSignatureUrl || invoice.signatureUrl) : undefined;

  let sigY = finalY + boxesH + 11;
  const signBlockH = 26;

  // Strict page limit check
  if (sigY + signBlockH + 28 > 280) {
    doc.addPage();
    sigY = 22;
  }

  // ── EMPLOYEE / CLAIMANT BLOCK (LEFT) ──
  if (isEmployeeInvoice) {
    const leftSigX = leftX;
    const lineWidth = 58;
    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139); // #64748b
    doc.text("PREPARED & CLAIMED BY", leftSigX, sigY);

    if (employeeClaimSig && (employeeClaimSig.startsWith("data:image") || employeeClaimSig.startsWith("http"))) {
      try {
        doc.addImage(employeeClaimSig, "PNG", leftSigX, sigY + 1.5, 36, 10);
      } catch (e) {
        console.warn("Could not render claimant signature:", e);
      }
    } else {
      doc.setFont("times", "italic");
      doc.setFontSize(14.5);
      doc.setTextColor(15, 23, 42);
      doc.text(invoice.businessName || "Ashish Sharma", leftSigX + 3, sigY + 8.5);
    }

    // Bold solid line (border-b-2)
    doc.setDrawColor(15, 23, 42); // #0f172a
    doc.setLineWidth(0.6);
    doc.line(leftSigX, sigY + 11.5, leftSigX + lineWidth, sigY + 11.5);

    // Name & Title
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.businessName, leftSigX, sigY + 16);

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(invoice.businessSubtitle || "Employee • Engineering (Permanent Staff)", leftSigX, sigY + 19.8);

    // Green check badge: Claimant / Payee Verified
    const checkBadgeY = sigY + 23.8;
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.circle(leftSigX + 1.3, checkBadgeY - 0.9, 1.2, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(leftSigX + 0.8, checkBadgeY - 0.9, leftSigX + 1.2, checkBadgeY - 0.5);
    doc.line(leftSigX + 1.2, checkBadgeY - 0.5, leftSigX + 1.8, checkBadgeY - 1.3);

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text("Claimant / Payee Verified", leftSigX + 3.8, checkBadgeY);
  }

  // ── AUTHORIZED SIGNATORY BLOCK (RIGHT) ──
  const rightSigX = rightX;
  const rightLineWidth = 58;
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("VERIFIED & AUTHORIZED BY", rightSigX, sigY, { align: "right" });

  if (effectiveOrgSig && (effectiveOrgSig.startsWith("data:image") || effectiveOrgSig.startsWith("http"))) {
    try {
      doc.addImage(effectiveOrgSig, "PNG", rightSigX - 38, sigY + 1.5, 36, 10);
    } catch (e) {
      console.warn("Could not render signature in PDF:", e);
    }
  } else if (invoice.approvedBy) {
    // Digitally Authorized Stamp Badge
    const stampW = 54;
    const stampH = 9.8;
    const stampX = rightSigX - stampW;
    const stampY = sigY + 0.5;

    doc.setDrawColor(167, 243, 208); // emerald-200
    doc.setLineWidth(0.35);
    doc.setFillColor(240, 253, 244); // emerald-50
    doc.roundedRect(stampX, stampY, stampW, stampH, 2.5, 2.5, "FD");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text("•  DIGITALLY AUTHORIZED  •", stampX + stampW / 2, stampY + 4.3, { align: "center" });

    doc.setFontSize(5.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Corporate Finance Desk • Verified", stampX + stampW / 2, stampY + 8.1, { align: "center" });
  } else {
    doc.setFont("times", "italic");
    doc.setFontSize(14.5);
    doc.setTextColor(15, 23, 42);
    doc.text(companySignatoryName.split(" ")[0], rightSigX - 3, sigY + 8.5, { align: "right" });
  }

  // Bold solid line (border-b-2)
  doc.setDrawColor(15, 23, 42); // #0f172a
  doc.setLineWidth(0.6);
  doc.line(rightSigX - rightLineWidth, sigY + 11.5, rightSigX, sigY + 11.5);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Authorized Signatory", rightSigX, sigY + 16, { align: "right" });

  if (invoice.approvedBy) {
    const approvedText = `Approved by ${invoice.approvedBy}`;
    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    const appW = doc.getTextWidth(approvedText);
    const circleX = rightSigX - appW - 2.5;
    const circleY = sigY + 19.8 - 0.9;

    doc.setFillColor(16, 185, 129);
    doc.circle(circleX, circleY, 1.2, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(circleX - 0.5, circleY, circleX - 0.1, circleY + 0.4);
    doc.line(circleX - 0.1, circleY + 0.4, circleX + 0.5, circleY - 0.4);

    doc.text(approvedText, rightSigX, sigY + 19.8, { align: "right" });

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(companySignatoryName, rightSigX, sigY + 23.8, { align: "right" });
  } else {
    doc.setFontSize(6.8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(companySignatoryName, rightSigX, sigY + 19.8, { align: "right" });
  }

  // ── Terms & Conditions and Notes Box (AT THE BOTTOM) ─────────────────────
  const cardY = sigY + 28;
  const cardW = contentWidth;
  const textX = leftX + 9;
  const availableW = cardW - 12;

  const termsLabel = "TERMS & CONDITIONS: ";
  const termsBodyBeforeRef = `Payment is requested within ${invoice.paymentTerms || "14 business days"} of receiving this invoice statement. For inquiries or remittances, please quote invoice reference `;
  const invoiceRefText = `#${invoice.invoiceNo}`;
  const termsFullText = `${termsLabel}${termsBodyBeforeRef}${invoiceRefText}.`;

  doc.setFontSize(6.8);
  const termsLines = doc.splitTextToSize(termsFullText, availableW);
  const termsLineHeight = 3.6;
  const termsHeight = Math.max(4.8, termsLines.length * termsLineHeight);

  const hasNotes = Boolean(invoice.notes && invoice.notes.trim());
  const notesLabel = "NOTES & VERIFIED RECORDS: ";
  const cleanNotes = invoice.notes ? invoice.notes.replace(/\r\n/g, " ").replace(/\n/g, " ").trim() : "";
  const notesLines = hasNotes ? doc.splitTextToSize(notesLabel + cleanNotes, availableW) : [];
  const notesLineHeight = 3.6;
  const notesHeight = hasNotes ? Math.max(4.8, notesLines.length * notesLineHeight) : 0;

  const cardPadding = 3.8;
  const dividerGap = 2.5;
  const totalCardH = cardPadding * 2 + termsHeight + (hasNotes ? (dividerGap * 2 + 0.3 + notesHeight) : 0);

  // Background and border card
  doc.setFillColor(248, 250, 252); // #f8fafc (muted/15)
  doc.setDrawColor(226, 232, 240); // #e2e8f0 (border/80)
  doc.setLineWidth(0.35);
  doc.roundedRect(leftX, cardY, cardW, totalCardH, 2.8, 2.8, "FD");

  // Row 1: Terms Icon glyph (file lines)
  const termsBoxY = cardY + cardPadding;
  doc.setFillColor(240, 253, 250); // teal-500/10
  doc.setDrawColor(153, 246, 228); // teal-500/20
  doc.setLineWidth(0.25);
  doc.roundedRect(leftX + 2.4, termsBoxY + 0.2, 4.4, 4.4, 1.0, 1.0, "FD");
  doc.setFillColor(13, 148, 136); // teal-600
  doc.rect(leftX + 3.4, termsBoxY + 1.0, 2.4, 2.8, "F");
  doc.setFillColor(240, 253, 250);
  doc.rect(leftX + 3.8, termsBoxY + 1.5, 1.6, 0.35, "F");
  doc.rect(leftX + 3.8, termsBoxY + 2.3, 1.6, 0.35, "F");

  // Row 1: Terms Text
  let currY = termsBoxY + 3.3;
  for (let i = 0; i < termsLines.length; i++) {
    const line = termsLines[i];
    let cursorX = textX;

    if (i === 0 && line.startsWith(termsLabel)) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.setTextColor(15, 23, 42); // foreground
      doc.text("TERMS & CONDITIONS: ", cursorX, currY);
      cursorX += doc.getTextWidth("TERMS & CONDITIONS: ") + 0.8;

      const restOfLine = line.substring(termsLabel.length).trim();
      // Check if reference is in this line
      if (restOfLine.includes(invoiceRefText)) {
        const parts = restOfLine.split(invoiceRefText);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(parts[0], cursorX, currY);
        cursorX += doc.getTextWidth(parts[0]);

        doc.setFont("courier", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(invoiceRefText, cursorX, currY);
        cursorX += doc.getTextWidth(invoiceRefText);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(parts[1] || "", cursorX, currY);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(restOfLine, cursorX, currY);
      }
    } else {
      if (line.includes(invoiceRefText)) {
        const parts = line.split(invoiceRefText);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(parts[0], cursorX, currY);
        cursorX += doc.getTextWidth(parts[0]);

        doc.setFont("courier", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(invoiceRefText, cursorX, currY);
        cursorX += doc.getTextWidth(invoiceRefText);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(parts[1] || "", cursorX, currY);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(line, cursorX, currY);
      }
    }
    currY += termsLineHeight;
  }

  // Row 2: Notes & Verified Records (if present)
  if (hasNotes) {
    const divY = cardY + cardPadding + termsHeight + dividerGap;
    doc.setDrawColor(226, 232, 240); // border/40
    doc.setLineWidth(0.25);
    doc.line(leftX + 2.4, divY, leftX + cardW - 2.4, divY);

    const notesBoxY = divY + dividerGap;
    doc.setFillColor(236, 253, 245); // emerald-500/10
    doc.setDrawColor(167, 243, 208); // emerald-500/20
    doc.setLineWidth(0.25);
    doc.roundedRect(leftX + 2.4, notesBoxY + 0.2, 4.4, 4.4, 1.0, 1.0, "FD");

    // Emerald check icon inside
    doc.setDrawColor(5, 150, 105); // emerald-600
    doc.setLineWidth(0.35);
    doc.line(leftX + 3.2, notesBoxY + 2.3, leftX + 4.1, notesBoxY + 3.3);
    doc.line(leftX + 4.1, notesBoxY + 3.3, leftX + 5.7, notesBoxY + 1.5);

    let noteCurrY = notesBoxY + 3.3;
    for (let i = 0; i < notesLines.length; i++) {
      const line = notesLines[i];
      let cursorX = textX;

      if (i === 0 && line.startsWith(notesLabel)) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42); // foreground
        doc.text("NOTES & VERIFIED RECORDS: ", cursorX, noteCurrY);
        cursorX += doc.getTextWidth("NOTES & VERIFIED RECORDS: ") + 0.8;

        const restOfLine = line.substring(notesLabel.length).trim();
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(restOfLine, cursorX, noteCurrY);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(line, cursorX, noteCurrY);
      }
      noteCurrY += notesLineHeight;
    }
  }

  // ── Official Document Certification Micro-Footer ──────────────────────────
  const microFooterY = cardY + totalCardH + 7;

  doc.setDrawColor(226, 232, 240); // border/40
  doc.setLineWidth(0.3);
  doc.line(leftX, microFooterY - 3, rightX, microFooterY - 3);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // #94a3b8 (muted-foreground/70)
  doc.text("Official Commercial Document • NexAce Financial Desk", leftX, microFooterY);
  doc.text("Electronic Document • Legally valid without physical seal", rightX, microFooterY, { align: "right" });

  return doc;
}

export function generateInvoicePdfBuffer(invoice: InvoicePdfData): Buffer {
  const doc = generateInvoicePdfDoc(invoice);
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export function downloadInvoicePdf(invoice: InvoicePdfData, customFileName?: string): void {
  const doc = generateInvoicePdfDoc(invoice);
  const name = customFileName || `Invoice_${invoice.invoiceNo || "Document"}.pdf`;
  doc.save(name);
}
