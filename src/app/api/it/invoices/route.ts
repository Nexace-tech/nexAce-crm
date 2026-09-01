import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITInvoice } from "@/models/ITInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";


import { User } from "@/models/User";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const isPrivileged = ["Admin", "OPS", "Sub Admin"].includes(session.role);

    await connectToDatabase();

    let query: Record<string, any> = { tenantId: tenantObjectId };

    if (!isPrivileged) {
      const userDoc = await User.findById(userObjectId).select("email").lean();
      const userEmail = (userDoc as { email?: string } | null)?.email;
      const orConditions: any[] = [{ createdBy: userObjectId }];
      if (userEmail) {
        orConditions.push({ businessEmail: new RegExp(`^${userEmail.trim()}$`, "i") });
      }
      if (session.userName) {
        orConditions.push({ businessName: new RegExp(`^${session.userName.trim()}$`, "i") });
      }
      query.$or = orConditions;
    }

    const invoices = await ITInvoice.find(query).sort({ createdAt: -1 }).lean();

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
