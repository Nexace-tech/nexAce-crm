import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FinanceExpense } from "@/models/FinanceExpense";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";



export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    const expenses = await FinanceExpense.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ expenses });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("GET /api/finance/expenses error:", error);
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

    const { title, category, amount, currency, date, paidBy, department, venture, status, notes } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Expense title is required" }, { status: 400 });
    }

    const expense = await FinanceExpense.create({
      tenantId: tenantObjectId,
      createdBy: userObjectId,
      title: title.trim(),
      category: category || "Operations",
      amount: Number(amount) || 0,
      currency: currency || "USD",
      date: date || new Date().toISOString().split("T")[0],
      paidBy: paidBy || session.userName || "",
      department: department || "General",
      venture: venture || "Ace Consultancys",
      status: status || "Pending",
      notes: notes || "",
    });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName || "Admin",
      action: `Logged expense: ${expense.title}`,
      targetName: "FinanceExpense",
      details: `Category: ${expense.category} | Amount: $${expense.amount} | Dept: ${expense.department}`,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/finance/expenses error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
