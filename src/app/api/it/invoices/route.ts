import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITInvoice } from "@/models/ITInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

const SEED_INVOICES = [
  {
    invoiceNo: "INV-0001",
    invoiceDate: "2026-08-01",
    dueDate: "2026-08-15",
    customerNo: "32321",
    businessName: "Hencework",
    businessAddress: "4747, Pearl Street\nRainy Day Drive, Washington DC 42156",
    businessEmail: "jampack_01@hencework.com",
    billedToName: "Supernova Consultant",
    billedToAddress: "Sycamore Street, San Antonio Valley, CA 34668",
    billedToEmail: "thompson_peter@super.co",
    items: [
      { description: "IT Infrastructure Support & Consultancy", quantity: 1, unitPrice: 1500, amount: 1500 },
      { description: "Cloud Workstation License Setup", quantity: 5, unitPrice: 200, amount: 1000 },
    ],
    subtotal: 2500,
    taxRate: 10,
    taxAmount: 250,
    total: 2750,
    currency: "USD",
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
    billedToAddress: "88 Executive Tower, San Francisco, CA 94105",
    billedToEmail: "billing@aceconsultancy.io",
    items: [
      { description: "Managed Cybersecurity Audit & SSO Integration", quantity: 1, unitPrice: 3200, amount: 3200 },
    ],
    subtotal: 3200,
    taxRate: 8,
    taxAmount: 256,
    total: 3456,
    currency: "USD",
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
    billedToAddress: "12 Design Plaza, New York, NY 10001",
    billedToEmail: "finance@nexusdigital.com",
    items: [
      { description: "SaaS Enterprise Workstation Renewal", quantity: 12, unitPrice: 150, amount: 1800 },
    ],
    subtotal: 1800,
    taxRate: 5,
    taxAmount: 90,
    total: 1890,
    currency: "USD",
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
      const seedDocs = SEED_INVOICES.map((item) => ({
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

    if (!billedToName?.trim()) {
      return NextResponse.json({ error: "Billed To Client/Name is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Auto-generate invoice number if not provided
    let finalInvoiceNo = invoiceNo?.trim();
    if (!finalInvoiceNo) {
      const count = await ITInvoice.countDocuments({ tenantId: tenantObjectId });
      finalInvoiceNo = `INV-${String(count + 1).padStart(4, "0")}`;
    }

    const doc = await ITInvoice.create({
      tenantId: tenantObjectId,
      invoiceNo: finalInvoiceNo,
      invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || new Date().toISOString().slice(0, 10),
      customerNo: customerNo?.trim() || "",
      businessName: businessName?.trim() || "Hencework",
      businessAddress: businessAddress?.trim() || "",
      businessEmail: businessEmail?.trim() || "",
      billedToName: billedToName.trim(),
      billedToAddress: billedToAddress?.trim() || "",
      billedToEmail: billedToEmail?.trim() || "",
      shipToAddress: shipToAddress?.trim() || "",
      items: items || [],
      subtotal: Number(subtotal) || 0,
      taxRate: Number(taxRate) || 0,
      taxAmount: Number(taxAmount) || 0,
      total: Number(total) || 0,
      currency: currency || "USD",
      status: status || "Draft",
      notes: notes?.trim() || "",
      createdBy: userObjectId,
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_INVOICE_CREATED",
      targetName: finalInvoiceNo,
      details: `Created invoice ${finalInvoiceNo} for ${billedToName.trim()} ($${total || 0})`,
    });

    return NextResponse.json({ invoice: doc }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/it/invoices error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
