import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { FinanceInvoice, IInvoiceHistoryItem } from "@/models/FinanceInvoice";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: Params) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const query: any = { tenantId: tenantObjectId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { invoiceNo: id }];
    } else {
      query.invoiceNo = id;
    }

    const invoice: any = await FinanceInvoice.findOne(query).lean();
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const existingHistory: IInvoiceHistoryItem[] = Array.isArray(invoice.history) ? [...invoice.history] : [];

    // Synthesize legacy timeline stages into history if not already captured
    if (Array.isArray(invoice.timeline)) {
      invoice.timeline.forEach((tl: any, idx: number) => {
        const hasMatch = existingHistory.some(
          (h) =>
            h.type === "StatusChange" &&
            (h.metadata?.timelineIndex === idx || (h.title.includes(tl.status) && Math.abs(new Date(h.date).getTime() - new Date(tl.timestamp).getTime()) < 10000))
        );
        if (!hasMatch) {
          existingHistory.push({
            _id: `synth_tl_${idx}_${tl.timestamp}`,
            date: tl.timestamp || invoice.createdAt,
            type: "StatusChange",
            category: "System",
            title: `Status: ${tl.status || tl.stage}`,
            summary: tl.note ? `Note: ${tl.note}` : `Invoice moved to stage ${tl.stage}.`,
            authorName: tl.actorName || "System",
            authorRole: tl.actorRole || "System",
            authorId: tl.actorId,
            metadata: { timelineIndex: idx, stage: tl.stage },
          });
        }
      });
    }

    // Synthesize payment details if present
    if (invoice.paymentDetails?.paidAt) {
      const hasPayment = existingHistory.some((h) => h.type === "Payment");
      if (!hasPayment) {
        existingHistory.push({
          _id: `synth_pay_${invoice.paymentDetails.paidAt}`,
          date: invoice.paymentDetails.paidAt,
          type: "Payment",
          category: "Internal",
          title: `Payment Recorded: ${invoice.paymentDetails.method || "Bank Transfer"}`,
          summary: `Transaction ID: ${invoice.paymentDetails.transactionId || "N/A"} - Recorded by ${invoice.paymentDetails.paidBy || "Finance"}`,
          authorName: invoice.paymentDetails.paidBy || "Finance Controller",
          authorRole: "Finance",
          attachments: invoice.paymentDetails.screenshotUrl
            ? [{ name: invoice.paymentDetails.screenshotFileName || "Payment Receipt", url: invoice.paymentDetails.screenshotUrl }]
            : [],
        });
      }
    }

    // Synthesize creation event if empty
    if (existingHistory.length === 0) {
      existingHistory.push({
        _id: `synth_created_${invoice.createdAt}`,
        date: invoice.createdAt || invoice.issuedDate,
        type: "StatusChange",
        category: "System",
        title: "Invoice Generated & Submitted",
        summary: `Invoice ${invoice.invoiceNo} generated for ${invoice.client || "Client"} with total ${invoice.currency || "INR"} ${invoice.amount?.toLocaleString() || 0}.`,
        authorName: invoice.billedToName || "System",
        authorRole: "Creator",
      });
    }

    // Sort descending by date (newest first)
    existingHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      history: existingHistory,
      invoiceSummary: {
        _id: invoice._id,
        invoiceNo: invoice.invoiceNo,
        client: invoice.client,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        approvalStage: invoice.approvalStage,
        category: invoice.category,
      },
    });
  } catch (error: any) {
    console.error("GET /api/finance/invoices/[id]/history error:", error);
    return NextResponse.json({ error: "Failed to retrieve invoice history" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    await connectToDatabase();

    const query: any = { tenantId: tenantObjectId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { invoiceNo: id }];
    } else {
      query.invoiceNo = id;
    }

    const invoice = await FinanceInvoice.findOne(query);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const body = await req.json();
    const { type, category, title, summary, attachments } = body;

    if (!title?.trim() || !summary?.trim()) {
      return NextResponse.json({ error: "Title and Summary are required" }, { status: 400 });
    }

    const validTypes = ["Note", "Email", "Call", "Meeting", "Payment", "Audit", "StatusChange"];
    const historyType = validTypes.includes(type) ? type : "Note";

    const isInternalInvoice = invoice.invoiceNo?.startsWith("INV-SAL") || invoice.invoiceNo?.startsWith("INV-EMP");
    const defaultCategory = isInternalInvoice ? "Internal" : "External";
    const historyCategory = category && ["Internal", "External", "System"].includes(category) ? category : defaultCategory;

    const newHistoryItem: IInvoiceHistoryItem = {
      date: new Date(),
      type: historyType as any,
      category: historyCategory as any,
      title: title.trim(),
      summary: summary.trim(),
      authorName: session.userName || "Staff Member",
      authorRole: session.role || "Staff",
      authorId: userObjectId,
      attachments: Array.isArray(attachments) ? attachments.filter((a) => a.url && a.name) : [],
    };

    if (!Array.isArray(invoice.history)) {
      invoice.history = [];
    }

    invoice.history.push(newHistoryItem);
    await invoice.save();

    return NextResponse.json({
      success: true,
      message: "Interaction logged to invoice history successfully",
      historyItem: invoice.history[invoice.history.length - 1],
    });
  } catch (error: any) {
    console.error("POST /api/finance/invoices/[id]/history error:", error);
    return NextResponse.json({ error: "Failed to log interaction to invoice history" }, { status: 500 });
  }
}

