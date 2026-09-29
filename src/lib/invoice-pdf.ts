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

  // Premium top accent brand band (seamlessly integrated with the card's top rounded corners)
  doc.setFillColor(0, 197, 160); // #00c5a0 brand teal
  doc.roundedRect(10, 10, 190, 3, 3, 3, "F");
  doc.rect(10, 11.5, 190, 1.5, "F"); // square off bottom of band for sharp straight edge

  // ── Header Row ─────────────────────────────────────────────────────────────
  // Organization Icon / Brand Emblem
  const headerY = 17.5;
  let hasRenderedImgLogo = false;
  if (invoice.logoUrl && (invoice.logoUrl.startsWith("data:image") || invoice.logoUrl.startsWith("http"))) {
    try {
      const format = invoice.logoUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(invoice.logoUrl, format, 18, headerY, 14, 14);
      hasRenderedImgLogo = true;
    } catch {
      hasRenderedImgLogo = false;
    }
  }

  if (!hasRenderedImgLogo) {
    // Official Organization Brand Icon Badge
    doc.setFillColor(0, 197, 160); // #00c5a0 brand teal
    doc.roundedRect(18, headerY, 13, 13, 2.5, 2.5, "F");

    // Icon emblem symbol / Initial letter
    const initialChar = (invoice.businessName || "N").charAt(0).toUpperCase();
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(initialChar, 24.5, headerY + 9.2, { align: "center" });
  }

  // Brand Name & Subtitle
  const brandName = invoice.businessName || "NEXACE";
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // #0f172a slate-900
  doc.text(brandName, 35, headerY + 6.5);

  // Dynamic Subtitle / Employee Role
  const headerSubtitle = (invoice.businessAddress && invoice.businessAddress.trim())
    ? invoice.businessAddress.toUpperCase()
    : invoice.businessName && !invoice.businessName.toLowerCase().includes("nexace")
    ? "PROFESSIONAL SERVICES & CONSULTING"
    : "CRM & ENTERPRISE SOLUTIONS";

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text(headerSubtitle, 35, headerY + 11.5);

  // Header Right: Commercial Invoice, Invoice No Pill, Status Badge & Reference matching Preview
  const refText = invoice.customerNo || `REF-${invoice.invoiceNo}`;

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text("COMMERCIAL INVOICE", 192, 18.5, { align: "right" });

  // Status Badge Pill Data
  const statusText = isPaid
    ? "PAID IN FULL"
    : invoice.status === "Pending"
    ? "PENDING"
    : (invoice.status || "DRAFT").toUpperCase();

  const statusTextColor: [number, number, number] = isPaid
    ? [16, 185, 129] // emerald-600
    : invoice.status === "Pending"
    ? [217, 119, 6]  // amber-600
    : [37, 99, 235];  // blue-600

  const statusBg: [number, number, number] = isPaid
    ? [240, 253, 244] // emerald-50
    : invoice.status === "Pending"
    ? [254, 243, 199] // amber-100
    : [239, 246, 255]; // blue-50

  const statusBorder: [number, number, number] = isPaid
    ? [187, 247, 208] // emerald-200
    : invoice.status === "Pending"
    ? [253, 230, 138] // amber-200
    : [191, 219, 254]; // blue-200

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  const statTextW = doc.getTextWidth(statusText);
  const statDotR = 0.8;
  const statPadH = 3;
  const statPillW = statTextW + statDotR * 2 + 2 + statPadH * 2;
  const statPillH = 5;
  const statPillX = 192 - statPillW;
  const statPillY = 21.5;

  doc.setFillColor(...statusBg);
  doc.setDrawColor(...statusBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(statPillX, statPillY, statPillW, statPillH, 2.5, 2.5, "FD");

  // Indicator dot
  doc.setFillColor(...statusTextColor);
  doc.circle(statPillX + statPadH + statDotR, statPillY + statPillH / 2, statDotR, "F");

  // Status text (clean ASCII only, never corrupts)
  doc.setTextColor(...statusTextColor);
  doc.text(statusText, statPillX + statPadH + statDotR * 2 + 1.8, statPillY + 3.5);

  // Invoice Number Badge (Teal mono pill matching preview)
  const invNoText = `#${invoice.invoiceNo}`;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  const invNoTextW = doc.getTextWidth(invNoText);
  const invNoPadH = 3;
  const invNoPillW = invNoTextW + invNoPadH * 2;
  const invNoPillX = statPillX - invNoPillW - 2.5;

  doc.setFillColor(240, 253, 250); // teal-50 (#f0fdfa)
  doc.setDrawColor(153, 246, 228); // teal-200 (#99f6e4)
  doc.setLineWidth(0.3);
  doc.roundedRect(invNoPillX, statPillY, invNoPillW, statPillH, 1.8, 1.8, "FD");

  doc.setTextColor(13, 148, 136); // teal-600
  doc.text(invNoText, invNoPillX + invNoPadH, statPillY + 3.6);

  // Reference Line matching preview
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // #64748b
  const refLabel = "Reference: ";
  const refFull = refLabel + refText;
  const refFullW = doc.getTextWidth(refFull);
  doc.text(refLabel, 192 - refFullW, 30.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // #0f172a
  const refLabelW = doc.getTextWidth(refLabel);
  doc.text(refText, 192 - refFullW + refLabelW, 30.5);

  // Divider below header
  doc.setDrawColor(241, 245, 249); // #f1f5f9
  doc.setLineWidth(0.6);
  doc.line(18, 35, 192, 35);

  // ── Info Grid (3 Executive Cards matching Preview) ─────────────────────────
  const infoCardY = 39;
  const infoCardW = 55;
  const infoCardH = 25.5;
  const card1X = 18;
  const card2X = 77.5;
  const card3X = 137;

  // Background and border for 3 cards
  [card1X, card2X, card3X].forEach((cx) => {
    doc.setFillColor(248, 250, 252); // #f8fafc (muted/15)
    doc.setDrawColor(226, 232, 240); // #e2e8f0 (border/70)
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, infoCardY, infoCardW, infoCardH, 2, 2, "FD");
  });

  // Top accent bars (matching preview border-t-2)
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(card1X + 1, infoCardY, infoCardW - 2, 0.7, "F");

  doc.setFillColor(20, 184, 166); // teal-500
  doc.rect(card2X + 1, infoCardY, infoCardW - 2, 0.7, "F");

  doc.setFillColor(14, 165, 233); // sky-500
  doc.rect(card3X + 1, infoCardY, infoCardW - 2, 0.7, "F");

  // --- CARD 1: INVOICE DETAILS ---
  // Header Icon badge
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.2);
  doc.roundedRect(card1X + 3, infoCardY + 2.5, 3.6, 3.6, 0.8, 0.8, "FD");
  // Mini doc icon lines inside badge
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.25);
  doc.line(card1X + 4.1, infoCardY + 3.8, card1X + 5.5, infoCardY + 3.8);
  doc.line(card1X + 4.1, infoCardY + 4.8, card1X + 5.5, infoCardY + 4.8);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("INVOICE DETAILS", card1X + 7.8, infoCardY + 5.1);

  // Rows inside Card 1
  let c1RowY = infoCardY + 9.5;
  const c1RightX = card1X + infoCardW - 3.2;

  // Row 1: Invoice Date
  doc.setFontSize(6.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Invoice Date:", card1X + 3.2, c1RowY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoiceDate || "-", c1RightX, c1RowY, { align: "right" });
  doc.setDrawColor(241, 245, 249);
  doc.setLineWidth(0.2);
  doc.line(card1X + 3.2, c1RowY + 1.2, c1RightX, c1RowY + 1.2);

  // Row 2: Paid Date / Due Date
  c1RowY += 3.8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  if (isPaid) {
    const paidDateVal = invoice.paymentDetails?.paidAt
      ? new Date(invoice.paymentDetails.paidAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : invoice.invoiceDate;
    doc.text("Paid Date:", card1X + 3.2, c1RowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(paidDateVal, c1RightX, c1RowY, { align: "right" });
  } else {
    doc.text("Due Date:", card1X + 3.2, c1RowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.dueDate || "-", c1RightX, c1RowY, { align: "right" });
  }
  doc.setDrawColor(241, 245, 249);
  doc.line(card1X + 3.2, c1RowY + 1.2, c1RightX, c1RowY + 1.2);

  // Row 3: Currency
  c1RowY += 3.8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Currency:", card1X + 3.2, c1RowY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${invoice.currency || "INR"} (${currencySymbol})`, c1RightX, c1RowY, { align: "right" });
  doc.setDrawColor(241, 245, 249);
  doc.line(card1X + 3.2, c1RowY + 1.2, c1RightX, c1RowY + 1.2);

  // Row 4: Payment Terms
  c1RowY += 3.8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Payment Terms:", card1X + 3.2, c1RowY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const termsText = invoice.paymentTerms || "Due on receipt";
  const trunTerms = termsText.length > 18 ? termsText.slice(0, 16) + "..." : termsText;
  doc.text(trunTerms, c1RightX, c1RowY, { align: "right" });

  // --- CARD 2: INVOICE FROM ---
  // Header Icon badge
  doc.setFillColor(240, 253, 250); // teal-50
  doc.setDrawColor(153, 246, 228); // teal-200
  doc.setLineWidth(0.2);
  doc.roundedRect(card2X + 3, infoCardY + 2.5, 3.6, 3.6, 0.8, 0.8, "FD");
  doc.setFillColor(20, 184, 166);
  doc.circle(card2X + 4.8, infoCardY + 3.6, 0.7, "F");
  doc.setDrawColor(20, 184, 166);
  doc.line(card2X + 3.9, infoCardY + 5.2, card2X + 5.7, infoCardY + 5.2);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("INVOICE FROM", card2X + 7.8, infoCardY + 5.1);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const fromName = invoice.businessName || "NexAce IT Team";
  doc.text(fromName.length > 28 ? fromName.slice(0, 26) + "..." : fromName, card2X + 3.2, infoCardY + 9.5);

  doc.setFontSize(6.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const fromAddrText = invoice.businessAddress || "Professional Services & Team Member";
  const fromAddrLines = doc.splitTextToSize(fromAddrText, 48).slice(0, 2);
  doc.text(fromAddrLines, card2X + 3.2, infoCardY + 13.5);

  if (invoice.businessEmail) {
    doc.setFontSize(6);
    doc.setTextColor(2, 132, 199); // sky-600
    doc.text(invoice.businessEmail, card2X + 3.2, infoCardY + 22.5);
  }

  // --- CARD 3: INVOICE TO (CLIENT) ---
  // Header Icon badge
  doc.setFillColor(240, 249, 255); // sky-50
  doc.setDrawColor(186, 230, 253); // sky-200
  doc.setLineWidth(0.2);
  doc.roundedRect(card3X + 3, infoCardY + 2.5, 3.6, 3.6, 0.8, 0.8, "FD");
  doc.setFillColor(14, 165, 233);
  doc.circle(card3X + 4.8, infoCardY + 4.3, 0.8, "F");

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("INVOICE TO (CLIENT)", card3X + 7.8, infoCardY + 5.1);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const toName = invoice.billedToName || "Client";
  doc.text(toName.length > 28 ? toName.slice(0, 26) + "..." : toName, card3X + 3.2, infoCardY + 9.5);

  doc.setFontSize(6.2);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const toAddrText = invoice.billedToAddress || "Headquarters - Corporate Office";
  const toAddrLines = doc.splitTextToSize(toAddrText, 48).slice(0, 2);
  doc.text(toAddrLines, card3X + 3.2, infoCardY + 13.5);

  if (invoice.billedToEmail) {
    doc.setFontSize(6);
    doc.setTextColor(2, 132, 199); // sky-600
    doc.text(invoice.billedToEmail, card3X + 3.2, infoCardY + 22.5);
  }

  // ── Items Table ────────────────────────────────────────────────────────────
  const tableData = invoice.items.map((item, idx) => [
    (idx + 1).toString(),
    item.description,
    (item.quantity ?? 1).toString(),
    item.unitPrice < 0
      ? `-${currencySymbol}${Math.abs(item.unitPrice).toLocaleString()}`
      : `${currencySymbol}${item.unitPrice.toLocaleString()}`,
    item.amount < 0
      ? `-${currencySymbol}${Math.abs(item.amount).toLocaleString()}`
      : `${currencySymbol}${item.amount.toLocaleString()}`,
  ]);

  const itemCount = invoice.items.length;
  const isCompact = itemCount > 4;

  // ── Products / Services Section Header Matching Preview ───────────────────
  const tableHeaderY = infoCardY + infoCardH + 4; // 68.5 mm

  // Mini primary indicator dot
  doc.setFillColor(13, 148, 136); // teal-600
  doc.circle(19.5, tableHeaderY - 0.9, 1.1, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text("PRODUCTS / SERVICE ITEMS", 22, tableHeaderY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text(`${itemCount} ${itemCount === 1 ? "Item" : "Items"}`, 192, tableHeaderY, { align: "right" });

  autoTable(doc, {
    startY: tableHeaderY + 2.5,
    margin: { left: 18, right: 18 },
    head: [["#", "Item & Description", "Qty / Hrs", "Unit Price", "Total Amount"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252], // #f8fafc
      textColor: [100, 116, 139], // #64748b
      fontSize: isCompact ? 7.5 : 8,
      fontStyle: "bold",
      halign: "left",
      cellPadding: { top: isCompact ? 2.5 : 3.5, bottom: isCompact ? 2.5 : 3.5, left: 3, right: 3 },
      lineColor: [226, 232, 240],
      lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 },
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto", fontStyle: "bold" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 32, halign: "right", fontStyle: "bold" },
    },
    styles: {
      fontSize: isCompact ? 8 : 8.5,
      cellPadding: { top: isCompact ? 2.5 : 3.5, bottom: isCompact ? 2.5 : 3.5, left: 3, right: 3 },
      textColor: [51, 65, 85], // #334155
      lineColor: [241, 245, 249],
      lineWidth: { bottom: 0.3 },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + (isCompact ? 5.5 : 7.5);

  // ── Dynamic Footer Box Height Calculation ──────────────────────────────────
  const isBankTransfer = isPaid && invoice.paymentDetails?.method === "Bank Transfer";
  const isUpi = isPaid && invoice.paymentDetails?.method === "UPI";
  const isCash = isPaid && invoice.paymentDetails?.method === "Cash";
  const hasTax = Boolean(invoice.taxRate && invoice.taxRate > 0);
  const hasDiscount = Boolean(invoice.discount && invoice.discount > 0);
  const hasApprovedBy = Boolean(invoice.approvedBy);
  const hasApprovedAt = Boolean(invoice.approvedAt);

  const leftBoxW = 90;
  const rightBoxX = 114;
  const rightBoxW = 78;

  // Calculate balanced symmetrical box height
  let leftItemCount = 1; // method
  if (isBankTransfer) leftItemCount += 3; // bank, account, ifsc
  else if (isUpi) leftItemCount += ((invoice.paymentDetails as any)?.fromUpiId && (invoice.paymentDetails as any)?.toUpiId ? 2 : 1) + (invoice.paymentDetails?.transactionId ? 1 : 0);
  else if (isCash) leftItemCount += 1;
  else if (!isPaid) leftItemCount += 4; // bank, account, ifsc, ref

  if (isPaid) leftItemCount += 1; // paid date
  if (hasApprovedBy) leftItemCount += 1;
  if (hasApprovedAt) leftItemCount += 1;

  const leftCalcH = 12 + leftItemCount * 3.8;
  const rightCalcH = 14 + (1 + (hasTax ? 1 : 0) + (hasDiscount ? 1 : 0)) * 3.6 + 10 + 6; // header + rows + banner + words
  const settlementBoxH = Math.max(30, Math.max(leftCalcH, rightCalcH));

  // ── LEFT BOX: Payment Received or Bank Details ──
  if (isPaid && invoice.paymentDetails?.method) {
    doc.setFillColor(240, 253, 244); // #f0fdf4 (emerald-50)
    doc.setDrawColor(187, 247, 208); // #bbf7d0 (emerald-200)
    doc.roundedRect(18, finalY, leftBoxW, settlementBoxH, 2, 2, "FD");

    // Green check indicator before title
    doc.setFillColor(16, 185, 129);
    doc.circle(21.5, finalY + 4.8, 1.2, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(20.9, finalY + 4.8, 21.3, finalY + 5.2);
    doc.line(21.3, finalY + 5.2, 22.1, finalY + 4.3);

    const payMethodTitle = `Payment Received (${invoice.paymentDetails.method})`;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105); // emerald-700
    doc.text(payMethodTitle, 24, finalY + 5.5);

    // Top-right Paid badge
    doc.setFillColor(209, 250, 229); // emerald-100
    doc.setDrawColor(167, 243, 208);
    doc.setLineWidth(0.2);
    doc.roundedRect(18 + leftBoxW - 13.5, finalY + 2.5, 10.5, 4, 1.2, 1.2, "FD");
    doc.setFontSize(5.8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("Paid", 18 + leftBoxW - 8.25, finalY + 5.3, { align: "center" });

    let payY = finalY + 10;
    const lValX = 18 + leftBoxW - 3.5;

    const drawPayRow = (label: string, val: string, isValBold = true, isEmerald = false) => {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label, 22, payY);

      doc.setFont("helvetica", isValBold ? "bold" : "normal");
      doc.setTextColor(isEmerald ? 5 : 15, isEmerald ? 150 : 23, isEmerald ? 105 : 42);
      doc.text(val, lValX, payY, { align: "right" });

      doc.setDrawColor(220, 252, 231); // emerald-100 divider
      doc.setLineWidth(0.18);
      doc.line(22, payY + 1.1, lValX, payY + 1.1);
      payY += 3.7;
    };

    drawPayRow("Payment Method:", invoice.paymentDetails.method === "Cash" ? "Cash Settlement" : invoice.paymentDetails.method);

    if (invoice.paymentDetails.method === "Bank Transfer") {
      drawPayRow("Bank Name:", invoice.bankDetails?.bankName || "Corporate Banking");
      drawPayRow("Account No:", invoice.bankDetails?.accountNo || "782459739212");
      drawPayRow("IFSC / Code:", invoice.bankDetails?.ifscCode || "NEXA0004128");
    } else if (invoice.paymentDetails.method === "UPI") {
      const fromUpi = (invoice.paymentDetails as any).fromUpiId;
      const toUpi = (invoice.paymentDetails as any).toUpiId;

      if (fromUpi && toUpi) {
        drawPayRow("Paid From:", fromUpi);
        drawPayRow("Paid To:", toUpi);
      } else {
        const effectiveUpiId =
          (invoice.paymentDetails.upiId && invoice.paymentDetails.upiId.trim()) ||
          toUpi ||
          fromUpi ||
          (invoice.bankDetails?.upiId && invoice.bankDetails.upiId.trim()) ||
          "nexace@okaxis";
        drawPayRow("UPI ID:", effectiveUpiId);
      }

      if (invoice.paymentDetails.transactionId) {
        drawPayRow("Transaction ID:", invoice.paymentDetails.transactionId);
      }
    } else if (invoice.paymentDetails.method === "Cash") {
      drawPayRow("Settlement Status:", "Verified & Settled in Cash");
    }

    const paidDate = invoice.paymentDetails.paidAt
      ? new Date(invoice.paymentDetails.paidAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : invoice.invoiceDate;
    drawPayRow("Paid Date:", paidDate, true, true);

    if (invoice.approvedBy) {
      drawPayRow("Approved By:", invoice.approvedBy, true, true);
    }
    if (invoice.approvedAt) {
      const appDate = new Date(invoice.approvedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      drawPayRow("Approved On:", appDate, true, false);
    }
  } else {
    // Unpaid: Bank & Payment Details
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(18, finalY, leftBoxW, settlementBoxH, 2, 2, "FD");

    // Mini primary indicator dot
    doc.setFillColor(13, 148, 136);
    doc.circle(21.5, finalY + 4.8, 1, "F");

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Bank & Payment Details", 24, finalY + 5.5);

    let bankY = finalY + 10;
    const lValX = 18 + leftBoxW - 3.5;

    const drawBankRow = (label: string, val: string) => {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(label, 22, bankY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(val, lValX, bankY, { align: "right" });

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.18);
      doc.line(22, bankY + 1.1, lValX, bankY + 1.1);
      bankY += 3.7;
    };

    drawBankRow("Bank Name:", invoice.bankDetails?.bankName || "Corporate Banking Partner");
    drawBankRow("Account No:", invoice.bankDetails?.accountNo || "782459739212");
    drawBankRow("IFSC / Swift Code:", invoice.bankDetails?.ifscCode || "NEXA0004128");
    drawBankRow("Payment Ref:", invoice.invoiceNo);
  }

  // ── RIGHT BOX: Financial Summary with Total Payable Banner ──
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(rightBoxX, finalY, rightBoxW, settlementBoxH, 2, 2, "FD");

  // Mini primary indicator dot
  doc.setFillColor(13, 148, 136);
  doc.circle(rightBoxX + 4.5, finalY + 4.8, 1, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Financial Summary", rightBoxX + 7, finalY + 5.5);

  let sumRowY = finalY + 9.8;
  const rValX = rightBoxX + rightBoxW - 3.5;

  // Subtotal Row
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal Amount:", rightBoxX + 3.5, sumRowY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${currencySymbol}${invoice.subtotal.toLocaleString()}`, rValX, sumRowY, { align: "right" });

  if (hasTax) {
    sumRowY += 3.6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Tax / VAT (${invoice.taxRate}%):`, rightBoxX + 3.5, sumRowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`+${currencySymbol}${(invoice.taxAmount || 0).toLocaleString()}`, rValX, sumRowY, { align: "right" });
  }

  if (hasDiscount) {
    sumRowY += 3.6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(5, 150, 105);
    doc.text("Discount Applied:", rightBoxX + 3.5, sumRowY);
    doc.setFont("helvetica", "bold");
    doc.text(`-${currencySymbol}${(invoice.discount || 0).toLocaleString()}`, rValX, sumRowY, { align: "right" });
  }

  // Highlighted Total Payable Banner Box matching preview
  const bannerY = sumRowY + 3.2;
  const bannerX = rightBoxX + 3;
  const bannerW = rightBoxW - 6;
  const bannerH = 9.8;

  doc.setFillColor(240, 253, 250); // teal-50 (#f0fdfa)
  doc.setDrawColor(153, 246, 228); // teal-200 (#99f6e4)
  doc.setLineWidth(0.3);
  doc.roundedRect(bannerX, bannerY, bannerW, bannerH, 1.8, 1.8, "FD");

  // Inside banner: Left
  doc.setFontSize(6.8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text("TOTAL PAYABLE", bannerX + 2.5, bannerY + 4.2);

  doc.setFontSize(5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text("All taxes & fees included", bannerX + 2.5, bannerY + 7.6);

  // Inside banner: Right
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 148, 136); // teal-600
  doc.text(`${currencySymbol}${invoice.total.toLocaleString()}`, bannerX + bannerW - 2.5, bannerY + 6.3, { align: "right" });

  // In Words row below banner
  const wordsY = bannerY + bannerH + 3.5;
  doc.setFontSize(5.8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const wordsLabel = "In Words: ";
  const wordsValue = numberToWords(invoice.total);
  const wordsFull = wordsLabel + wordsValue;
  const splitWords = doc.splitTextToSize(wordsFull, rightBoxW - 6);
  doc.text(splitWords, rValX, wordsY, { align: "right" });

  // ── Bottom Section: Sign-Off Grid followed by Terms & Conditions at Bottom ──
  const isEmployeeInvoice =
    (invoice.invoiceNo && invoice.invoiceNo.startsWith("INV-SAL")) ||
    (invoice.customerNo && (invoice.customerNo.startsWith("EMP-") || invoice.customerNo.includes("SAL"))) ||
    Boolean(invoice.businessSubtitle && invoice.businessSubtitle.toUpperCase().includes("EMPLOYEE"));

  const companySignatoryName = isEmployeeInvoice
    ? (invoice.billedToName || "Nex Ace")
    : (invoice.businessName || "NexAce Technologies");

  // Signatures
  const effectiveOrgSig = invoice.orgSignatureUrl || (!isEmployeeInvoice ? invoice.signatureUrl : undefined);
  const employeeClaimSig = isEmployeeInvoice ? (invoice.employeeSignatureUrl || invoice.signatureUrl) : undefined;

  // Bottom of payment & summary boxes
  const boxBottom = finalY + settlementBoxH;

  // ── Divider Line Above Signatures Matching Preview ──
  const sigDividerY = boxBottom + (isCompact ? 4.5 : 6);
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.35);
  doc.line(18, sigDividerY, 192, sigDividerY);

  const signBlockH = 26;
  let sigY = sigDividerY + (isCompact ? 4.5 : 5.5);

  // Strict page limit check
  if (sigY + signBlockH + 26 > 278) {
    doc.addPage();
    sigY = 22;
  }

  if (isEmployeeInvoice) {
    // ── EMPLOYEE / CLAIMANT BLOCK (LEFT) ──
    const leftX = 18;
    const lineWidth = 52;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("PREPARED & CLAIMED BY", leftX, sigY);

    // Claimant Signature graphic
    if (employeeClaimSig && (employeeClaimSig.startsWith("data:image") || employeeClaimSig.startsWith("http"))) {
      try {
        doc.addImage(employeeClaimSig, "PNG", leftX, sigY + 1.5, 36, 12);
      } catch (e) {
        console.warn("Could not render claimant signature:", e);
      }
    } else {
      // Cursive script fallback matching preview
      doc.setFont("times", "italic");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(invoice.businessName || "Claimant", leftX + 4, sigY + 10);
    }

    // Horizontal line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(leftX, sigY + 14, leftX + lineWidth, sigY + 14);

    // Name & Title
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.businessName, leftX, sigY + 18);

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(invoice.businessSubtitle || "Employee • Engineering", leftX, sigY + 21.5);

    // Green check badge: Claimant / Payee Verified
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.circle(leftX + 1.5, sigY + 25.2 - 0.9, 1.2, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(leftX + 1, sigY + 25.2 - 0.9, leftX + 1.4, sigY + 25.2 - 0.5);
    doc.line(leftX + 1.4, sigY + 25.2 - 0.5, leftX + 2.2, sigY + 25.2 - 1.4);

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("Claimant / Payee Verified", leftX + 4, sigY + 25.2);
  }

  // ── AUTHORIZED SIGNATORY BLOCK (RIGHT) ──
  const rightX = 192;
  const lineWidth = 52;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("VERIFIED & AUTHORIZED BY", rightX, sigY, { align: "right" });

  if (effectiveOrgSig && (effectiveOrgSig.startsWith("data:image") || effectiveOrgSig.startsWith("http"))) {
    try {
      doc.addImage(effectiveOrgSig, "PNG", rightX - 38, sigY + 1.5, 36, 12);
    } catch (e) {
      console.warn("Could not render signature in PDF:", e);
    }
  } else if (invoice.approvedBy) {
    // Elegant Digital Authorization Stamp matching preview
    const stampW = 48;
    const stampH = 10.5;
    const stampX = rightX - stampW;
    const stampY = sigY + 1.5;

    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(0.3);
    doc.setFillColor(240, 253, 244); // emerald-50 (#ecfdf5)
    doc.roundedRect(stampX, stampY, stampW, stampH, 1.5, 1.5, "FD");

    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("•  DIGITALLY AUTHORIZED  •", stampX + stampW / 2, stampY + 4.2, { align: "center" });

    doc.setFontSize(5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Corporate Finance Desk • Verified", stampX + stampW / 2, stampY + 8.2, { align: "center" });
  } else {
    doc.setFont("times", "italic");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(companySignatoryName.split(" ")[0], rightX - 4, sigY + 10, { align: "right" });
  }

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(rightX - lineWidth, sigY + 14, rightX, sigY + 14);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Authorized Signatory", rightX, sigY + 18, { align: "right" });

  if (invoice.approvedBy) {
    const approvedText = `Approved by ${invoice.approvedBy}`;
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    const appW = doc.getTextWidth(approvedText);
    const circleX = rightX - appW - 2.5;

    doc.setFillColor(16, 185, 129);
    doc.circle(circleX, sigY + 21.5 - 0.9, 1.2, "F");
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(circleX - 0.5, sigY + 21.5 - 0.9, circleX - 0.1, sigY + 21.5 - 0.5);
    doc.line(circleX - 0.1, sigY + 21.5 - 0.5, circleX + 0.7, sigY + 21.5 - 1.4);

    doc.text(approvedText, rightX, sigY + 21.5, { align: "right" });

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(companySignatoryName, rightX, sigY + 25.2, { align: "right" });
  } else {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(companySignatoryName, rightX, sigY + 21.5, { align: "right" });
  }

  // ── Bottom Tier: Terms & Conditions and Notes Card matching preview ──
  const cardX = 18;
  const cardW = 174;
  const cardY = sigY + (isCompact ? 27 : 28.5);
  const textX = cardX + 8;
  const availableW = cardW - 11;

  const termsBody = `Payment is requested within ${invoice.paymentTerms || "14 business days"} of receiving this invoice statement. For inquiries or remittances, please quote invoice reference #${invoice.invoiceNo}.`;
  const termsLabel = "TERMS & CONDITIONS: ";

  doc.setFontSize(6.2);
  const termsLines = doc.splitTextToSize(termsLabel + termsBody, availableW);
  const termsHeight = Math.max(4.5, termsLines.length * 3.3);

  const hasNotes = Boolean(invoice.notes && invoice.notes.trim());
  const notesLabel = "NOTES & VERIFIED RECORDS: ";
  const notesLines = hasNotes ? doc.splitTextToSize(notesLabel + invoice.notes!.trim(), availableW) : [];
  const notesHeight = hasNotes ? Math.max(4.5, notesLines.length * 3.3) : 0;

  const cardPadding = 3;
  const dividerGap = 2;
  const totalCardH = cardPadding * 2 + termsHeight + (hasNotes ? (dividerGap * 2 + 0.3 + notesHeight) : 0);

  // Background and border card
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.3);
  doc.roundedRect(cardX, cardY, cardW, totalCardH, 2.5, 2.5, "FD");

  // Row 1: Terms Icon box
  const termsBoxY = cardY + cardPadding;
  doc.setFillColor(240, 253, 250); // teal-50 (#f0fdfa)
  doc.setDrawColor(153, 246, 228); // teal-200 (#99f6e4)
  doc.roundedRect(cardX + 2.2, termsBoxY + 0.2, 4.2, 4.2, 0.8, 0.8, "FD");
  // Document icon glyph
  doc.setFillColor(13, 148, 136); // teal-600
  doc.rect(cardX + 3.1, termsBoxY + 0.9, 2.4, 2.8, "F");
  doc.setFillColor(240, 253, 250);
  doc.rect(cardX + 3.5, termsBoxY + 1.4, 1.6, 0.4, "F");
  doc.rect(cardX + 3.5, termsBoxY + 2.2, 1.6, 0.4, "F");

  // Row 1: Terms Text
  let currY = termsBoxY + 2.8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text(termsLabel, textX, currY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105); // #475569
  const labelW = doc.getTextWidth(termsLabel);
  const firstRemainder = termsLines[0].substring(termsLabel.length);
  doc.text(firstRemainder, textX + labelW, currY);

  for (let i = 1; i < termsLines.length; i++) {
    currY += 3.3;
    doc.text(termsLines[i], textX, currY);
  }

  // Row 2: Notes & Verified Records (if present)
  if (hasNotes) {
    const divY = cardY + cardPadding + termsHeight + dividerGap;
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.25);
    doc.line(cardX + 2.2, divY, cardX + cardW - 2.2, divY);

    const notesBoxY = divY + dividerGap;
    doc.setFillColor(236, 253, 245); // emerald-50 (#ecfdf5)
    doc.setDrawColor(167, 243, 208); // emerald-200 (#a7f3d0)
    doc.roundedRect(cardX + 2.2, notesBoxY + 0.2, 4.2, 4.2, 0.8, 0.8, "FD");

    // Checkmark glyph
    doc.setDrawColor(5, 150, 105); // emerald-600
    doc.setLineWidth(0.4);
    doc.line(cardX + 3.0, notesBoxY + 2.2, cardX + 3.9, notesBoxY + 3.2);
    doc.line(cardX + 3.9, notesBoxY + 3.2, cardX + 5.4, notesBoxY + 1.4);

    let noteCurrY = notesBoxY + 2.8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    doc.text(notesLabel, textX, noteCurrY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85); // #334155
    const notesLabelW = doc.getTextWidth(notesLabel);
    const firstNoteRem = notesLines[0].substring(notesLabel.length);
    doc.text(firstNoteRem, textX + notesLabelW, noteCurrY);

    for (let i = 1; i < notesLines.length; i++) {
      noteCurrY += 3.3;
      doc.text(notesLines[i], textX, noteCurrY);
    }
  }

  // ── Official Document Certification Micro-Text directly below card ──
  const microFooterGap = isCompact ? 4 : 5;
  const microFooterY = cardY + totalCardH + microFooterGap;

  // Subtle separator line above micro-footer matching preview
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.25);
  doc.line(18, microFooterY - 2.5, 192, microFooterY - 2.5);

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text("Official Commercial Document • NexAce Financial Desk", 18, microFooterY);
  doc.text("Electronic Document • Legally valid without physical seal", 192, microFooterY, { align: "right" });

  // ── Auto-Height Outer Card Boundary: Perfectly wraps content with balanced padding ──
  const finalCardBottom = Math.min(287, microFooterY + (isCompact ? 4.5 : 5.5));
  const finalCardHeight = finalCardBottom - 10;

  const pageCount = doc.getNumberOfPages();
  if (pageCount === 1) {
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.35);
    doc.roundedRect(10, 10, 190, finalCardHeight, 3, 3, "S");
  } else {
    // If multi-page, frame page 1 with full height and last page with auto content height
    doc.setPage(1);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.roundedRect(10, 10, 190, 277, 3, 3, "S");

    doc.setPage(pageCount);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.35);
    doc.roundedRect(10, 10, 190, finalCardHeight, 3, 3, "S");
  }

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
