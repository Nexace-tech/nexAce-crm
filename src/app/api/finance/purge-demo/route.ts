import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { FinanceExpense } from "@/models/FinanceExpense";
import { SalesDeal } from "@/models/SalesDeal";
import { ITInvoice } from "@/models/ITInvoice";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

// One-shot endpoint — deletes ALL finance demo records for the current tenant.
// Only Admins / OPS can call this.
export async function DELETE() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session } = authResult;

    if (!["Admin", "OPS"].includes(session.role)) {
      return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
    }

    await connectToDatabase();

    const [inv, exp, deals, itInv] = await Promise.all([
      FinanceInvoice.deleteMany({ tenantId: tenantObjectId }),
      FinanceExpense.deleteMany({ tenantId: tenantObjectId }),
      SalesDeal.deleteMany({ tenantId: tenantObjectId }),
      ITInvoice.deleteMany({ tenantId: tenantObjectId }),
    ]);

    return NextResponse.json({
      success: true,
      deleted: {
        financeInvoices: inv.deletedCount,
        financeExpenses: exp.deletedCount,
        salesDeals: deals.deletedCount,
        employeeInvoices: itInv.deletedCount,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/finance/purge-demo error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
