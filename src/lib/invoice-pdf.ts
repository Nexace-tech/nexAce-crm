import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface InvoicePdfData {
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  customerNo?: string;
  businessName: string;
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

  // Outer border card
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, 10, 190, 277, 3, 3, "FD");

  // ── Header Row ─────────────────────────────────────────────────────────────
  // Organization Icon / Brand Emblem
  let hasRenderedImgLogo = false;
  if (invoice.logoUrl && (invoice.logoUrl.startsWith("data:image") || invoice.logoUrl.startsWith("http"))) {
    try {
      const format = invoice.logoUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(invoice.logoUrl, format, 18, 16, 14, 14);
      hasRenderedImgLogo = true;
    } catch {
      hasRenderedImgLogo = false;
    }
  }

  if (!hasRenderedImgLogo) {
    // Official Organization Brand Icon Badge
    doc.setFillColor(0, 197, 160); // #00c5a0 brand teal
    doc.roundedRect(18, 16, 13, 13, 2.5, 2.5, "F");

    // Icon emblem symbol / Initial letter
    const initialChar = (invoice.businessName || "N").charAt(0).toUpperCase();
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(initialChar, 24.5, 25.2, { align: "center" });
  }

  // Brand Name & Subtitle
  const brandName = invoice.businessName || "NEXACE";
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // #0f172a slate-900
  doc.text(brandName, 34, 23);

  // Dynamic Subtitle / Employee Role
  const headerSubtitle = (invoice.businessAddress && invoice.businessAddress.trim())
    ? invoice.businessAddress.toUpperCase()
    : invoice.businessName && !invoice.businessName.toLowerCase().includes("nexace")
    ? "PROFESSIONAL SERVICES & CONSULTING"
    : "CRM & ENTERPRISE SOLUTIONS";

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text(headerSubtitle, 34, 28);

  // Invoice Tag (Right Box)
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(132, 16, 60, 18, 2, 2, "FD");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text(invoice.invoiceNo, 188, 23, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Status: ", 162, 29, { align: "right" });

  if (isPaid) {
    doc.setTextColor(16, 185, 129); // #10b981 emerald
    doc.setFont("helvetica", "bold");
    doc.text("Paid", 188, 29, { align: "right" });
  } else if (invoice.status === "Pending") {
    doc.setTextColor(245, 158, 11); // amber
    doc.setFont("helvetica", "bold");
    doc.text(invoice.status, 188, 29, { align: "right" });
  } else {
    doc.setTextColor(59, 130, 246); // blue
    doc.setFont("helvetica", "bold");
    doc.text(invoice.status, 188, 29, { align: "right" });
  }

  // Divider below header
  doc.setDrawColor(241, 245, 249); // #f1f5f9
  doc.setLineWidth(0.6);
  doc.line(18, 38, 192, 38);

  // ── Info Grid (3 Columns) ──────────────────────────────────────────────────
  const gridY = 44;

  // Column 1: Invoice Details
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text("INVOICE DETAILS", 18, gridY);

  const valColX = 35; // Uniform aligned X position for all values

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Issued:", 18, gridY + 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoiceDate || "-", valColX, gridY + 6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  if (isPaid) {
    const paidDateVal = invoice.paymentDetails?.paidAt
      ? new Date(invoice.paymentDetails.paidAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : invoice.invoiceDate;
    doc.text("Paid Date:", 18, gridY + 11.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(paidDateVal, valColX, gridY + 11.5);
  } else {
    doc.text("Due Date:", 18, gridY + 11.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.dueDate || "-", valColX, gridY + 11.5);
  }

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Ref #:", 18, gridY + 17);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const refText = invoice.customerNo || invoice.invoiceNo;
  const splitRef = doc.splitTextToSize(refText, 38);
  doc.text(splitRef, valColX, gridY + 17);

  // Column 2: Invoice From
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(148, 163, 184);
  doc.text("INVOICE FROM", 78, gridY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.businessName || "NexAce IT Team", 78, gridY + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const fromAddress = invoice.businessAddress ? doc.splitTextToSize(invoice.businessAddress, 50) : ["Employee - Team Member"];
  doc.text(fromAddress, 78, gridY + 11.5);
  if (invoice.businessEmail) {
    doc.text(invoice.businessEmail, 78, gridY + 17);
  }

  // Column 3: Invoice To
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(148, 163, 184);
  doc.text("INVOICE TO", 138, gridY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.billedToName || "Client", 138, gridY + 6);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const toAddress = invoice.billedToAddress ? doc.splitTextToSize(invoice.billedToAddress, 50) : ["Building no 1254, Tower B Zone, Gurgaon, Noida, 110078, India"];
  doc.text(toAddress, 138, gridY + 11.5);
  if (invoice.billedToEmail) {
    doc.text(invoice.billedToEmail, 138, gridY + 17);
  }

  // ── Items Table ────────────────────────────────────────────────────────────
  const tableData = invoice.items.map((item, idx) => [
    (idx + 1).toString(),
    item.description,
    item.unitPrice < 0
      ? `-${currencySymbol}${Math.abs(item.unitPrice).toLocaleString()}`
      : `${currencySymbol}${item.unitPrice.toLocaleString()}`,
    item.amount < 0
      ? `-${currencySymbol}${Math.abs(item.amount).toLocaleString()}`
      : `${currencySymbol}${item.amount.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 68,
    margin: { left: 18, right: 18 },
    head: [["#", "Item / Description", "Qty", "Rate", "Amount"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252], // #f8fafc
      textColor: [100, 116, 139], // #64748b
      fontSize: 8,
      fontStyle: "bold",
      halign: "left",
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      lineColor: [226, 232, 240],
      lineWidth: { top: 0.3, bottom: 0.3, left: 0, right: 0 },
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto", fontStyle: "bold" },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 32, halign: "right", fontStyle: "bold" },
    },
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      textColor: [51, 65, 85], // #334155
      lineColor: [241, 245, 249],
      lineWidth: { bottom: 0.3 },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // ── Dynamic Footer Box Height Calculation ──────────────────────────────────
  const isBankTransfer = isPaid && invoice.paymentDetails?.method === "Bank Transfer";
  const isUpi = isPaid && invoice.paymentDetails?.method === "UPI";
  const isCash = isPaid && invoice.paymentDetails?.method === "Cash";

  const leftBoxH = isBankTransfer
    ? 45
    : isUpi
    ? (invoice.paymentDetails?.transactionId ? 38 : 34)
    : isCash
    ? 30
    : !isPaid
    ? 40
    : 34;
  const leftBoxW = 90;

  if (isPaid && invoice.paymentDetails?.method) {
    doc.setFillColor(240, 253, 244); // #f0fdf4
    doc.setDrawColor(187, 247, 208); // #bbf7d0
    doc.roundedRect(18, finalY, leftBoxW, leftBoxH, 2, 2, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald
    doc.text("Payment Received", 22, finalY + 6);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    let payY = finalY + 12;
    doc.text("Method:", 22, payY);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.paymentDetails.method, 104, payY, { align: "right" });

    if (invoice.paymentDetails.method === "Bank Transfer") {
      payY += 5;
      doc.setFont("helvetica", "normal");
      doc.text("Bank:", 22, payY);
      doc.setFont("helvetica", "bold");
      doc.text(invoice.bankDetails?.bankName || "Corporate Banking", 104, payY, { align: "right" });

      payY += 5;
      doc.setFont("helvetica", "normal");
      doc.text("Account No:", 22, payY);
      doc.setFont("helvetica", "bold");
      doc.text(invoice.bankDetails?.accountNo || "782459739212", 104, payY, { align: "right" });

      payY += 5;
      doc.setFont("helvetica", "normal");
      doc.text("IFSC / Code:", 22, payY);
      doc.setFont("helvetica", "bold");
      doc.text(invoice.bankDetails?.ifscCode || "NEXA0004128", 104, payY, { align: "right" });
    } else if (invoice.paymentDetails.method === "UPI") {
      const effectiveUpiId =
        (invoice.paymentDetails.upiId && invoice.paymentDetails.upiId.trim()) ||
        (invoice.bankDetails?.upiId && invoice.bankDetails.upiId.trim()) ||
        "nexace@okaxis";

      payY += 5;
      doc.setFont("helvetica", "normal");
      doc.text("UPI ID:", 22, payY);
      doc.setFont("helvetica", "bold");
      doc.text(effectiveUpiId, 104, payY, { align: "right" });

      if (invoice.paymentDetails.transactionId) {
        payY += 5;
        doc.setFont("helvetica", "normal");
        doc.text("Txn ID:", 22, payY);
        doc.setFont("helvetica", "bold");
        doc.text(invoice.paymentDetails.transactionId, 104, payY, { align: "right" });
      }
    }

    payY += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Paid Date:", 22, payY);
    doc.setFont("helvetica", "bold");
    const paidDate = invoice.paymentDetails.paidAt
      ? new Date(invoice.paymentDetails.paidAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : invoice.invoiceDate;
    doc.text(paidDate, 104, payY, { align: "right" });
  } else {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(18, finalY, leftBoxW, leftBoxH, 2, 2, "FD");

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Bank & Payment Details", 22, finalY + 6);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    let bankY = finalY + 12;
    doc.text("Bank:", 22, bankY);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.bankDetails?.bankName || "Corporate Banking", 104, bankY, { align: "right" });

    bankY += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Account No:", 22, bankY);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.bankDetails?.accountNo || "782459739212", 104, bankY, { align: "right" });

    bankY += 5;
    doc.setFont("helvetica", "normal");
    doc.text("IFSC / Code:", 22, bankY);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.bankDetails?.ifscCode || "NEXA0004128", 104, bankY, { align: "right" });

    bankY += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Payment Ref:", 22, bankY);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.invoiceNo, 104, bankY, { align: "right" });
  }

  // Right Box: Summary Box
  const rightBoxX = 114;
  const rightBoxW = 78;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightBoxX, finalY, rightBoxW, leftBoxH, 2, 2, "FD");

  let sumY = finalY + 7;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Subtotal:", rightBoxX + 4, sumY);
  doc.text(`${currencySymbol}${invoice.subtotal.toLocaleString()}`, rightBoxX + rightBoxW - 4, sumY, { align: "right" });

  if (invoice.taxRate && invoice.taxRate > 0) {
    sumY += 5;
    doc.text(`Tax (${invoice.taxRate}%):`, rightBoxX + 4, sumY);
    doc.text(`${currencySymbol}${(invoice.taxAmount || 0).toLocaleString()}`, rightBoxX + rightBoxW - 4, sumY, { align: "right" });
  }

  // Total Amount Line
  sumY += 7;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(rightBoxX + 4, sumY - 2, rightBoxX + rightBoxW - 4, sumY - 2);

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 197, 160); // #00c5a0 teal
  doc.text("Total Amount:", rightBoxX + 4, sumY + 3);
  doc.text(`${currencySymbol}${invoice.total.toLocaleString()}`, rightBoxX + rightBoxW - 4, sumY + 3, { align: "right" });

  // Amount in words
  sumY += 8;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(numberToWords(invoice.total), rightBoxX + rightBoxW - 4, sumY + 2, { align: "right" });

  // ── Signature & Terms Section ──────────────────────────────────────────────
  // Anchored to the bottom of the A4 page (297mm height) for balanced professional layout
  const sigY = Math.max(finalY + leftBoxH + 14, 238);

  doc.setDrawColor(226, 232, 240);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(18, sigY, 192, sigY);
  doc.setLineDashPattern([], 0); // reset dash

  // Terms & Conditions (Left)
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Terms & Conditions:", 18, sigY + 6);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  const termsText = `Payment is due within ${invoice.paymentTerms || "14 days"} from invoice date. Please quote invoice ref #${invoice.invoiceNo} on remittance.`;
  const splitTerms = doc.splitTextToSize(termsText, 105);
  doc.text(splitTerms, 18, sigY + 11);

  if (invoice.notes) {
    const notesHeading = `Notes: ${invoice.notes}`;
    const splitNotes = doc.splitTextToSize(notesHeading, 105);
    doc.text(splitNotes, 18, sigY + 19);
  }

  // Authorized Signatory (Right)
  const signCenterX = 164;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(signCenterX - 22, sigY + 18, signCenterX + 22, sigY + 18);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Authorized Signatory", signCenterX, sigY + 22, { align: "center" });

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(invoice.businessName || "NexAce Technologies", signCenterX, sigY + 26, { align: "center" });

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
