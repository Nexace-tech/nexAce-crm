import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FinanceInvoice } from "@/models/FinanceInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin", "Manager", "HR"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;
    const { id } = await params;

    const body = await request.json();
    await connectToDatabase();

    // Fetch previous state so we can check if signatureUrl is already set
    const previousInvoice = await FinanceInvoice.findOne({ _id: id, tenantId: tenantObjectId }).lean();
    if (!previousInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // ── MANDATORY APPROVAL GATE BEFORE PAYMENT ───────────────────────────────
    if (body.status === "Paid") {
      if ((previousInvoice as any).status !== "Approved") {
        return NextResponse.json(
          {
            error: "Approval Mandatory: This invoice must be approved by HR or Admin before payment can be processed.",
          },
          { status: 400 }
        );
      }
    }

    // ── Stamp approver details & signature on approval ───────────────────────
    const updateBody: Record<string, any> = { ...body };
    let newTimelineEvent: any = null;
    let newRejectionHistoryItem: any = null;

    if (body.action === "RE_INITIATE") {
      const nextRev = Number((previousInvoice as any).revisionCount || 0) + 1;
      updateBody.status = "Pending";
      updateBody.approvalStage = "PENDING_REVIEW";
      updateBody.revisionCount = nextRev;
      updateBody.rejectionReason = "";
      updateBody.rejectedBy = "";
      updateBody.rejectedAt = "";

      newTimelineEvent = {
        stage: "RE_INITIATED",
        status: "Pending",
        actorName: session.userName || "User",
        actorRole: session.role || "User",
        actorId: userObjectId,
        note: body.resubmitNote?.trim() || `Revision #${nextRev} submitted with corrections.`,
        timestamp: new Date(),
      };
    } else if (body.status === "Approved") {
      updateBody.status = "Approved";
      updateBody.approvalStage = "PENDING_PAYMENT";
      updateBody.approvedBy = session.userName || "Admin";
      updateBody.approvedAt = new Date().toISOString();
      updateBody.approverRole = session.role === "HR" ? "HR" : "Admin";
      updateBody.rejectionReason = "";
      updateBody.rejectedBy = "";
      updateBody.rejectedAt = "";

      newTimelineEvent = {
        stage: "APPROVED",
        status: "Approved",
        actorName: session.userName || "Admin",
        actorRole: session.role,
        actorId: userObjectId,
        note: "Invoice verified and approved for payment collection.",
        timestamp: new Date(),
      };
    } else if (body.status === "Rejected") {
      if (!body.rejectionReason || !body.rejectionReason.trim()) {
        return NextResponse.json(
          { error: "Rejection feedback reason is mandatory" },
          { status: 400 }
        );
      }
      const reasonText = body.rejectionReason.trim();
      updateBody.status = "Rejected";
      updateBody.approvalStage = "REJECTED";
      updateBody.rejectionReason = reasonText;
      updateBody.rejectedBy = session.userName || "Admin";
      updateBody.rejectedAt = new Date().toISOString();
      updateBody.approvedBy = "";
      updateBody.approvedAt = "";
      updateBody.approverRole = "";

      newTimelineEvent = {
        stage: "REJECTED",
        status: "Rejected",
        actorName: session.userName || "Admin",
        actorRole: session.role,
        actorId: userObjectId,
        note: reasonText,
        timestamp: new Date(),
      };

      newRejectionHistoryItem = {
        reason: reasonText,
        rejectedBy: session.userName || "Admin",
        rejectedAt: new Date(),
        role: session.role,
      };
    } else if (body.status === "Paid") {
      updateBody.status = "Paid";
      updateBody.approvalStage = "PAID";
      newTimelineEvent = {
        stage: "PAID",
        status: "Paid",
        actorName: session.userName || "Admin",
        actorRole: session.role,
        actorId: userObjectId,
        note: `Payment settled via ${updateBody.paymentDetails?.method || "Bank/Wire"}`,
        timestamp: new Date(),
      };
    }

    if (body.status === "Paid" || body.status === "Approved") {
      if (!updateBody.approvedBy) updateBody.approvedBy = session.userName || "Admin";
      if (!updateBody.approvedAt) updateBody.approvedAt = new Date().toISOString();

      try {
        let effectiveSig = "";
        const tenantForSig = await Tenant.findById(tenantObjectId).select("signatureUrl").lean();
        if ((tenantForSig as any)?.signatureUrl?.trim()) {
          effectiveSig = (tenantForSig as any).signatureUrl.trim();
        }

        if (!effectiveSig) {
          const approverUser = await User.findById(userObjectId).select("signatureUrl name").lean();
          if ((approverUser as any)?.signatureUrl?.trim()) {
            effectiveSig = (approverUser as any).signatureUrl.trim();
          }
        }

        if (!effectiveSig) {
          const adminWithSig = await User.findOne({
            tenantId: tenantObjectId,
            role: { $in: ["Admin", "Owner"] },
            signatureUrl: { $exists: true, $ne: "" },
          }).select("signatureUrl").lean();
          if (adminWithSig && (adminWithSig as any).signatureUrl) {
            effectiveSig = (adminWithSig as any).signatureUrl.trim();
          }
        }

        if (effectiveSig) {
          updateBody.signatureUrl = effectiveSig;
        }
      } catch (sigErr) {
        console.error("Could not fetch signature for approval stamp:", sigErr);
      }
    }

    const mongoUpdate: Record<string, any> = {
      $set: { ...updateBody, updatedAt: new Date() },
    };
    const pushOps: Record<string, any> = {};
    if (newTimelineEvent) pushOps.timeline = newTimelineEvent;
    if (newRejectionHistoryItem) pushOps.rejectionHistory = newRejectionHistoryItem;
    if (Object.keys(pushOps).length > 0) mongoUpdate.$push = pushOps;

    const invoice = await FinanceInvoice.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      mongoUpdate,
      { new: true }
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Notify submitter/creator
    (async () => {
      try {
        const { Notification } = await import("@/models/Notification");
        if (invoice.createdBy) {
          let title = `Invoice ${invoice.invoiceNo} Updated`;
          let message = `Invoice ${invoice.invoiceNo} status changed to ${invoice.status}`;
          if (invoice.status === "Approved") {
            title = `✨ Invoice ${invoice.invoiceNo} Approved`;
            message = `Your invoice ${invoice.invoiceNo} for ${invoice.client} has been approved by ${session.userName}.`;
          } else if (invoice.status === "Rejected") {
            title = `❌ Invoice ${invoice.invoiceNo} Needs Revision`;
            message = `Your invoice ${invoice.invoiceNo} was rejected by ${session.userName}. Reason: ${invoice.rejectionReason}`;
          } else if (invoice.status === "Paid") {
            title = `✅ Invoice ${invoice.invoiceNo} Paid`;
            message = `Payment for invoice ${invoice.invoiceNo} has been marked as settled by ${session.userName}.`;
          }
          await Notification.create({
            tenantId: tenantObjectId,
            recipientId: invoice.createdBy,
            title,
            message,
            type: "finance",
            linkUrl: `/dashboard/finance?tab=invoices&invoiceNo=${encodeURIComponent(invoice.invoiceNo)}`,
            read: false,
          });
        }
      } catch (notifErr) {
        console.error("Finance invoice notification error:", notifErr);
      }
    })();

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
