import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { User } from "@/models/User";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId } = authResult;

    await connectToDatabase();

    const invoices = await FinanceInvoice.find({ tenantId: tenantObjectId })
      .populate("createdBy", "name email bankDetails upiId")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch ITInvoices (Employee Invoices) as well
    const { ITInvoice } = await import("@/models/ITInvoice");
    const itInvoices = await ITInvoice.find({ tenantId: tenantObjectId })
      .populate("createdBy", "name email bankDetails upiId")
      .sort({ createdAt: -1 })
      .lean();

    // Load tenant users to accurately match the invoice payee
    const tenantUsers = await User.find({ tenantId: tenantObjectId })
      .select("name email bankDetails upiId")
      .lean();

    // Helper to find the actual payee's bank/UPI details
    const getInvoicePayeeInfo = (inv: any) => {
      // 1. Explicitly stored on the invoice itself
      if (inv.bankDetails?.upiId?.trim()) {
        return {
          userUpiId: inv.bankDetails.upiId.trim(),
          bankDetails: inv.bankDetails,
        };
      }

      // 2. If already Paid, return the confirmed toUpiId
      if (inv.status === "Paid" && inv.paymentDetails?.toUpiId?.trim()) {
        return {
          userUpiId: inv.paymentDetails.toUpiId.trim(),
          bankDetails: inv.bankDetails,
        };
      }

      // 3. Match payee by businessEmail or client name against employee accounts
      const payeeEmail = (inv.businessEmail || "").toLowerCase().trim();
      const payeeName = (inv.businessName || inv.client || "").toLowerCase().trim();

      const matchedUser = tenantUsers.find((u: any) => {
        const uEmail = (u.email || "").toLowerCase().trim();
        const uName = (u.name || "").toLowerCase().trim();
        if (payeeEmail && uEmail === payeeEmail) return true;
        if (
          payeeName &&
          payeeName !== "ace consultancys" &&
          payeeName !== "nex ace" &&
          payeeName !== "unknown employee" &&
          uName === payeeName
        ) {
          return true;
        }
        return false;
      });

      if (matchedUser) {
        const upi = (matchedUser.bankDetails?.upiId || (matchedUser as any).upiId || "").trim();
        return {
          userUpiId: upi,
          bankDetails: inv.bankDetails || matchedUser.bankDetails || undefined,
        };
      }

      // 4. No payee user found — DO NOT fall back to createdBy (who is just the CRM admin/recorder)
      return {
        userUpiId: "",
        bankDetails: inv.bankDetails || undefined,
      };
    };

    const mappedFinanceInvoices = invoices.map((inv: any) => {
      const payeeInfo = getInvoicePayeeInfo(inv);
      return {
        ...inv,
        userUpiId: payeeInfo.userUpiId,
        bankDetails: payeeInfo.bankDetails,
      };
    });

    const mappedEmployeeInvoices = itInvoices.map((inv: any) => {
      const payeeInfo = getInvoicePayeeInfo(inv);
      return {
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
        createdAt: inv.createdAt,
        userUpiId: payeeInfo.userUpiId,
        bankDetails: payeeInfo.bankDetails,
        paymentDetails: inv.paymentDetails,
      };
    });

    // Merge both arrays
    const allInvoices = [...mappedFinanceInvoices, ...mappedEmployeeInvoices].sort((a: any, b: any) => {
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
