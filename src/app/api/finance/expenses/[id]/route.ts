import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FinanceExpense } from "@/models/FinanceExpense";
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

    const expense = await FinanceExpense.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: body },
      { new: true }
    );

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName || "Admin",
      action: `Updated expense: ${expense.title}`,
      targetName: "FinanceExpense",
      details: `Category: ${expense.category} | Amount: $${expense.amount}`,
    });

    return NextResponse.json({ expense });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/finance/expenses/[id] error:", error);
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

    const expense = await FinanceExpense.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName || "Admin",
      action: `Deleted expense: ${expense.title}`,
      targetName: "FinanceExpense",
      details: `Category: ${expense.category} | Amount: $${expense.amount}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/finance/expenses/[id] error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
