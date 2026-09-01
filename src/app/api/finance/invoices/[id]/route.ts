import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;
    const { id } = await params;

    const body = await request.json();
    await connectToDatabase();

    const invoice = await FinanceInvoice.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: body },
      { new: true }
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName || "Admin",
      action: `Updated invoice: ${invoice.invoiceNo}`,
      targetName: "FinanceInvoice",
      details: `Client: ${invoice.client} | Status: ${invoice.status}`,
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/finance/invoices/[id] error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;
    const { id } = await params;

    await connectToDatabase();

    const invoice = await FinanceInvoice.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName || "Admin",
      action: `Deleted invoice: ${invoice.invoiceNo}`,
      targetName: "FinanceInvoice",
      details: `Client: ${invoice.client} | Amount: $${invoice.amount}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/finance/invoices/[id] error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
