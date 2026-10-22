import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { FinanceInvoice, IInvoiceObjection } from "@/models/FinanceInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { Tenant } from "@/models/Tenant";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin", "Manager", "HR"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;
    const { id } = await params;

    const body = await request.json();
    await connectToDatabase();

    // Fetch previous state from FinanceInvoice, fallback to ITInvoice if needed
    let isITInvoice = false;
    let previousInvoice = await FinanceInvoice.findOne({ _id: id, tenantId: tenantObjectId }).lean();
    if (!previousInvoice) {
      const { ITInvoice } = await import("@/models/ITInvoice");
      previousInvoice = await ITInvoice.findOne({ _id: id, tenantId: tenantObjectId }).lean();
      if (!previousInvoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      isITInvoice = true;
    }

    // ── MANDATORY APPROVAL GATE BEFORE PAYMENT ───────────────────────────────
    // Payment processing can only be executed by Admin or OPS. HR is strictly prohibited.
    if (body.status === "Paid") {
      if (session.role === "HR") {
        return NextResponse.json(
          {
            error: "Forbidden: Payment processing can only be executed by Admin or OPS. HR is authorized for attendance & timesheet verification only.",
          },
          { status: 403 }
        );
      }
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
      updateBody.rejectionRemark = "";
      updateBody.objections = [];
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
      updateBody.rejectionRemark = "";
      updateBody.objections = [];
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
      let formattedObjections: IInvoiceObjection[] = [];
      if (Array.isArray(body.objections) && body.objections.length > 0) {
        formattedObjections = body.objections
          .filter((o: any) => o && (o.category || o.remark))
          .map((o: any) => ({
            category: String(o.category || "General Discrepancy").trim(),
            itemRef: String(o.itemRef || "").trim(),
            remark: String(o.remark || "").trim(),
            attachmentUrl: String(o.attachmentUrl || "").trim(),
            attachmentName: String(o.attachmentName || "").trim(),
          }));
      }

      const primaryCategory = (
        (formattedObjections.length > 0 ? formattedObjections[0].category : "") ||
        body.rejectionReason ||
        body.reason ||
        "General Discrepancy"
      ).trim();

      const primaryRemark = (
        (formattedObjections.length > 0 ? formattedObjections[0].remark : "") ||
        body.rejectionRemark ||
        body.remark ||
        body.rejectionReason ||
        ""
      ).trim();

      if (!primaryRemark && !primaryCategory && formattedObjections.length === 0) {
        return NextResponse.json(
          { error: "Rejection reason and actionable remarks are mandatory" },
          { status: 400 }
        );
      }

      if (formattedObjections.length === 0) {
        formattedObjections = [
          {
            category: primaryCategory,
            itemRef: String(body.itemRef || "").trim(),
            remark: primaryRemark,
            attachmentUrl: String(body.attachmentUrl || "").trim(),
            attachmentName: String(body.attachmentName || "").trim(),
          },
        ];
      }

      updateBody.status = "Rejected";
      updateBody.approvalStage = "REJECTED";
      updateBody.rejectionReason = primaryCategory;
      updateBody.rejectionRemark = primaryRemark;
      updateBody.objections = formattedObjections;
      updateBody.rejectedBy = session.userName || "Admin";
      updateBody.rejectedAt = new Date().toISOString();
      updateBody.approvedBy = "";
      updateBody.approvedAt = "";
      updateBody.approverRole = "";

      const objSummary = formattedObjections.length > 1
        ? `[${formattedObjections.length} Issues Flagged] ${formattedObjections.map((o, idx) => `#${idx + 1} ${o.category}${o.itemRef ? ` (${o.itemRef})` : ""}: ${o.remark}${o.attachmentUrl ? " 📎" : ""}`).join(" | ")}`
        : `[${primaryCategory}${formattedObjections[0]?.itemRef ? ` (${formattedObjections[0]?.itemRef})` : ""}] ${primaryRemark}${formattedObjections[0]?.attachmentUrl ? " 📎" : ""}`;

      newTimelineEvent = {
        stage: "REJECTED",
        status: "Rejected",
        actorName: session.userName || "Admin",
        actorRole: session.role,
        actorId: userObjectId,
        note: objSummary,
        timestamp: new Date(),
      };

      newRejectionHistoryItem = {
        reason: primaryCategory,
        remark: primaryRemark,
        objections: formattedObjections,
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

    let invoice = null;
    if (isITInvoice) {
      const { ITInvoice } = await import("@/models/ITInvoice");
      invoice = await ITInvoice.findOneAndUpdate(
        { _id: id, tenantId: tenantObjectId },
        mongoUpdate,
        { new: true }
      );
    } else {
      invoice = await FinanceInvoice.findOneAndUpdate(
        { _id: id, tenantId: tenantObjectId },
        mongoUpdate,
        { new: true }
      );
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Notify submitter/creator
    (async () => {
      try {
        const { User } = await import("@/models/User");
        
        // 1. Resolve the employee payee account
        let employeeUser: any = null;
        if (invoice.targetUserId) {
          employeeUser = await User.findById(invoice.targetUserId).select("_id email name").lean();
        }
        if (!employeeUser) {
          const payeeEmail = (invoice.businessEmail || invoice.customerNo || "").trim().toLowerCase();
          const payeeName = (invoice.client || invoice.businessName || "").trim().toLowerCase();
          const searchOr: any[] = [];
          if (payeeEmail && payeeEmail.includes("@")) {
            searchOr.push({ email: new RegExp(`^${payeeEmail}$`, "i") });
          }
          if (payeeName && payeeName !== "ace consultancys" && payeeName !== "nexace") {
            searchOr.push({ name: new RegExp(`^${payeeName}$`, "i") });
          }
          if (searchOr.length > 0) {
            employeeUser = await User.findOne({
              tenantId: tenantObjectId,
              $or: searchOr,
            }).select("_id email name").lean();
          }
        }

        const payMethod = invoice.paymentDetails?.method || "Bank Transfer";
        const hasReceipt = Boolean(invoice.paymentDetails?.screenshotUrl);
        const currSym = invoice.currency === "INR" || !invoice.currency ? "₹" : `${invoice.currency} `;
        const formattedAmount = `${currSym}${Number(invoice.amount || 0).toLocaleString("en-IN")}`;

        // 2. Notify Employee Payee if found
        if (employeeUser) {
          let empTitle = `Invoice ${invoice.invoiceNo} Status: ${invoice.status}`;
          let empMsg = `Your invoice ${invoice.invoiceNo} status is now ${invoice.status}.`;
          if (invoice.status === "Approved") {
            empTitle = `✨ Timesheets & Invoice Approved: ${invoice.invoiceNo}`;
            empMsg = `Your invoice (${invoice.invoiceNo}) for ${formattedAmount} has been verified and approved by ${session.userName}. It is queued for disbursement.`;
          } else if (invoice.status === "Paid") {
            empTitle = `✅ Payout Processed: ${invoice.invoiceNo}`;
            empMsg = `Your payment for invoice ${invoice.invoiceNo} (${formattedAmount}) has been settled via ${payMethod} by ${session.userName}.${hasReceipt ? " Payment receipt is attached." : ""}`;
          } else if (invoice.status === "Rejected") {
            empTitle = `❌ Invoice Returned: ${invoice.invoiceNo}`;
            empMsg = `Your invoice ${invoice.invoiceNo} was returned by ${session.userName}. Reason: ${invoice.rejectionReason || "Discrepancy"}. Remark: ${invoice.rejectionRemark || "Please check objections and resubmit."}`;
          }

          await Notification.create({
            tenantId: tenantObjectId,
            recipientId: employeeUser._id,
            title: empTitle,
            message: empMsg,
            type: "finance",
            linkUrl: `/dashboard/settings?tab=invoice&invoiceNo=${encodeURIComponent(invoice.invoiceNo)}`,
            read: false,
          });
        }

        // 3. Notify Creator (HR/Admin) if different from the employee
        const creatorIdStr = invoice.createdBy ? invoice.createdBy.toString() : "";
        const empIdStr = employeeUser ? employeeUser._id.toString() : "";

        if (creatorIdStr && creatorIdStr !== empIdStr && creatorIdStr !== userObjectId.toString()) {
          let creatorTitle = `Invoice ${invoice.invoiceNo} Updated`;
          let creatorMsg = `Invoice ${invoice.invoiceNo} for ${invoice.client} marked as ${invoice.status} by ${session.userName}.`;
          if (invoice.status === "Approved") {
            creatorTitle = `✨ Invoice ${invoice.invoiceNo} Approved`;
            creatorMsg = `Invoice ${invoice.invoiceNo} for ${invoice.client} approved by ${session.userName}.`;
          } else if (invoice.status === "Paid") {
            creatorTitle = `✅ Invoice ${invoice.invoiceNo} Settled`;
            creatorMsg = `Payment for invoice ${invoice.invoiceNo} (${invoice.client}) settled via ${payMethod} by ${session.userName}.`;
          } else if (invoice.status === "Rejected") {
            creatorTitle = `❌ Invoice ${invoice.invoiceNo} Rejected`;
            creatorMsg = `Invoice ${invoice.invoiceNo} was rejected by ${session.userName}.`;
          }

          await Notification.create({
            tenantId: tenantObjectId,
            recipientId: invoice.createdBy,
            title: creatorTitle,
            message: creatorMsg,
            type: "finance",
            linkUrl: `/dashboard/finance?tab=invoices&invoiceNo=${encodeURIComponent(invoice.invoiceNo)}`,
            read: false,
          });
        }
      } catch (notifErr) {
        console.error("Failed to send invoice status notification:", notifErr);
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
