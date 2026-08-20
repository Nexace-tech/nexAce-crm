import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITInvoice } from "@/models/ITInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const SEED_IT_INVOICES = [
  {
    invoiceNo: "INV-0001",
    invoiceDate: "2026-08-01",
    dueDate: "2026-08-15",
    customerNo: "29381",
    businessName: "Hencework",
    businessAddress: "4747, Pearl Street\nRainy Day Drive, Washington DC 42156",
    businessEmail: "jampack_01@hencework.com",
    billedToName: "Synergy Global Tech",
    billedToAddress: "102 Cyber City, DLF Phase 2, Gurugram, India",
    billedToEmail: "accounts@synergyglobal.in",
    items: [
      { description: "IT Infrastructure Support & Consultancy", quantity: 1, unitPrice: 125000, amount: 125000 },
      { description: "Cloud Workstation License Setup", quantity: 5, unitPrice: 15000, amount: 75000 },
    ],
    subtotal: 200000,
    taxRate: 18,
    taxAmount: 36000,
    total: 236000,
    currency: "INR",
    status: "Sent",
    notes: "Payment due within 14 days.",
  },
  {
    invoiceNo: "INV-0002",
    invoiceDate: "2026-08-05",
    dueDate: "2026-08-20",
    customerNo: "44812",
    businessName: "Hencework",
    businessAddress: "4747, Pearl Street\nRainy Day Drive, Washington DC 42156",
    businessEmail: "jampack_01@hencework.com",
    billedToName: "Ace Consultancy Ltd",
    billedToAddress: "88 BKC Hub, Bandra East, Mumbai, India",
    billedToEmail: "billing@aceconsultancy.in",
    items: [
      { description: "Managed Cybersecurity Audit & SSO Integration", quantity: 1, unitPrice: 280000, amount: 280000 },
    ],
    subtotal: 280000,
    taxRate: 18,
    taxAmount: 50400,
    total: 330400,
    currency: "INR",
    status: "Paid",
    notes: "Thank you for your business!",
  },
  {
    invoiceNo: "INV-0003",
    invoiceDate: "2026-08-10",
    dueDate: "2026-08-24",
    customerNo: "11094",
    businessName: "Hencework",
    businessAddress: "4747, Pearl Street\nRainy Day Drive, Washington DC 42156",
    businessEmail: "jampack_01@hencework.com",
    billedToName: "Nexus Digital Agency",
    billedToAddress: "12 Design Plaza, HSR Layout, Bengaluru, India",
    billedToEmail: "finance@nexusdigital.in",
    items: [
      { description: "SaaS Enterprise Workstation Renewal", quantity: 12, unitPrice: 12500, amount: 150000 },
    ],
    subtotal: 150000,
    taxRate: 18,
    taxAmount: 27000,
    total: 177000,
    currency: "INR",
    status: "Pending",
    notes: "Awaiting client signoff.",
  },
];

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();
    let invoices = await ITInvoice.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();

    if (invoices.length === 0) {
      const seedDocs = SEED_IT_INVOICES.map((item) => ({
        ...item,
        tenantId: tenantObjectId,
        createdBy: userObjectId,
      }));
      await ITInvoice.insertMany(seedDocs);
      invoices = await ITInvoice.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({ invoices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/it/invoices error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    const {
      invoiceNo,
      invoiceDate,
      dueDate,
      customerNo,
      businessName,
      businessAddress,
      businessEmail,
      billedToName,
      billedToAddress,
      billedToEmail,
      shipToAddress,
      items,
      subtotal,
      taxRate,
      taxAmount,
      total,
      currency,
      status,
      notes,
    } = body;

    if (!invoiceNo || !billedToName) {
      return NextResponse.json({ error: "Invoice Number and Billed To Name are required." }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await ITInvoice.findOne({ tenantId: tenantObjectId, invoiceNo: invoiceNo.trim() });
    if (existing) {
      return NextResponse.json({ error: `Invoice with number ${invoiceNo} already exists.` }, { status: 400 });
    }

    const created = await ITInvoice.create({
      tenantId: tenantObjectId,
      invoiceNo: invoiceNo.trim(),
      invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      customerNo: customerNo || "",
      businessName: businessName || "Hencework",
      businessAddress: businessAddress || "4747, Pearl Street\nRainy Day Drive, Washington DC 42156",
      businessEmail: businessEmail || "jampack_01@hencework.com",
      billedToName: billedToName.trim(),
      billedToAddress: billedToAddress || "",
      billedToEmail: billedToEmail || "",
      shipToAddress: shipToAddress || "",
      items: Array.isArray(items) ? items : [],
      subtotal: Number(subtotal) || 0,
      taxRate: Number(taxRate) || 0,
      taxAmount: Number(taxAmount) || 0,
      total: Number(total) || 0,
      currency: currency || "INR",
      status: status || "Draft",
      notes: notes || "",
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_INVOICE_CREATED",
      targetName: created.invoiceNo,
      details: `Created invoice ${created.invoiceNo} for ${billedToName.trim()} (₹${total || 0})`,
    });

    return NextResponse.json({ invoice: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/it/invoices error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
