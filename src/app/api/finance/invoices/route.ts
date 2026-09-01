import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";



export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    let invoices = await FinanceInvoice.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();

    // Fetch ITInvoices (Employee Invoices) as well
    const { ITInvoice } = await import("@/models/ITInvoice");
    const itInvoices = await ITInvoice.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();
    
    const mappedEmployeeInvoices = itInvoices.map((inv: any) => ({
      _id: inv._id,
      invoiceNo: inv.invoiceNo,
      client: inv.businessName || "Unknown Employee",
      amount: inv.total || 0,
      currency: inv.currency || "USD",
      status: inv.status || "Draft",
      issuedDate: inv.invoiceDate || new Date().toISOString().split("T")[0],
      dueDate: inv.dueDate || "",
      category: "Employee Invoice",
      venture: inv.billedToName || "Ace Consultancys",
      notes: inv.notes || "",
      createdAt: inv.createdAt
    }));

    // Merge both arrays
    const allInvoices = [...invoices, ...mappedEmployeeInvoices].sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.issuedDate).getTime();
      const dateB = new Date(b.createdAt || b.issuedDate).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({ invoices: allInvoices });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/finance/invoices error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    await connectToDatabase();

    const { invoiceNo, client, amount, currency, status, issuedDate, dueDate, category, venture, notes, lineItems } = body;

    if (!client?.trim() || !invoiceNo?.trim()) {
      return NextResponse.json({ error: "Client and invoice number are required" }, { status: 400 });
    }

    const invoice = await FinanceInvoice.create({
      tenantId: tenantObjectId,
      createdBy: userObjectId,
      invoiceNo: invoiceNo.trim(),
      client: client.trim(),
      amount: Number(amount) || 0,
      currency: currency || "USD",
      status: status || "Draft",
      issuedDate: issuedDate || new Date().toISOString().split("T")[0],
      dueDate: dueDate || "",
      category: category || "Services",
      venture: venture || "Ace Consultancys",
      notes: notes || "",
      lineItems: lineItems || [],
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName || "Admin",
      action: `Created invoice: ${invoice.invoiceNo}`,
      targetName: "FinanceInvoice",
      details: `Client: ${invoice.client} | Amount: $${invoice.amount} | Status: ${invoice.status}`,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/finance/invoices error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
