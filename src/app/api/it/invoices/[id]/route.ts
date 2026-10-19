import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITInvoice } from "@/models/ITInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { User } from "@/models/User";
import { Tenant } from "@/models/Tenant";
import { Notification } from "@/models/Notification";
import { DriveFile } from "@/models/DriveFile";
import { sendEmail, EmailAttachment } from "@/lib/mail";
import { generateInvoicePdfBuffer } from "@/lib/invoice-pdf";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.resolve(path.join(process.cwd(), "src", "uploads"));

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    await connectToDatabase();

    const previousInvoice = await ITInvoice.findOne({ _id: id, tenantId: tenantObjectId }).lean();
    if (!previousInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const isReinitiating = body.action === "RE_INITIATE";
    const isCreator = (previousInvoice as any).createdBy?.toString() === userObjectId.toString();
    const isPrivileged = ["Admin", "OPS", "Sub Admin", "Manager", "HR"].includes(session.role);

    if (!isPrivileged && !(isReinitiating && isCreator)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to modify this invoice." }, { status: 403 });
    }

    // ── HR Data Isolation Check ──────────────────────────────────────────────
    if (session.role === "HR") {
      const tenantDoc = await Tenant.findById(tenantObjectId).select("isolateHRData").lean();
      if ((tenantDoc as any)?.isolateHRData && (previousInvoice as any).createdBy) {
        const creatorUser = await User.findById((previousInvoice as any).createdBy).select("hrId").lean();
        if (creatorUser?.hrId?.toString() !== userObjectId.toString()) {
          return NextResponse.json(
            { error: "Forbidden: You can only review and approve invoices for your assigned employees under HR Data Isolation." },
            { status: 403 }
          );
        }
      }
    }

    // ── MANDATORY APPROVAL GATE BEFORE PAYMENT ───────────────────────────────
    // Payment processing is strictly blocked unless the invoice has already been Approved.
    if (body.status === "Paid" || body.paymentDetails) {
      if ((previousInvoice as any).status !== "Approved") {
        return NextResponse.json(
          {
            error: "Approval Mandatory: This timesheet/invoice must be approved by an HR Partner or Admin before payment can be processed.",
          },
          { status: 400 }
        );
      }
    }

    // ── Finance Portal Screenshot: Save base64 to Drive ──────────────────────
    let paymentDetails = body.paymentDetails;
    if (paymentDetails?.screenshotUrl && paymentDetails.screenshotUrl.startsWith("data:image")) {
      try {
        const dataUrl: string = paymentDetails.screenshotUrl;
        const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1]; // e.g. image/png
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, "base64");
          const fileSize = buffer.length;

          // Build a clean filename: INV-EMP-713165_Ashish_Sharma.png
          const invoiceNo = (previousInvoice as any).invoiceNo || id;
          const employeeName = ((previousInvoice as any).businessName || "Employee")
            .trim()
            .replace(/\s+/g, "_")
            .replace(/[^a-zA-Z0-9_\-]/g, "");
          const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";
          const fileName = `${invoiceNo}_${employeeName}.${ext}`;
          const diskFileName = `${Date.now()}-${fileName}`;

          // Save to Finance Portal subfolder
          const financePortalDir = path.resolve(path.join(UPLOAD_DIR, "Finance Portal"));
          await mkdir(financePortalDir, { recursive: true });
          const filePath = path.join(financePortalDir, diskFileName);
          await writeFile(filePath, buffer);

          const relativeFilePath = `Finance Portal/${diskFileName}`;

          // Create DriveFile record
          const driveFile = await DriveFile.create({
            name: fileName,
            size: fileSize,
            mimeType,
            filePath: relativeFilePath,
            folder: "Finance Portal",
            uploadedBy: userObjectId,
            tenantId: tenantObjectId,
          });

          // Replace base64 with the secure download URL
          paymentDetails = {
            ...paymentDetails,
            screenshotUrl: `/api/drive/download?fileId=${driveFile._id}`,
            screenshotFileId: driveFile._id.toString(),
            screenshotFileName: fileName,
          };
        }
      } catch (imgErr) {
        console.error("Failed to save payment screenshot to Drive:", imgErr);
        // Non-fatal: proceed without screenshot if disk write fails
        paymentDetails = { ...paymentDetails, screenshotUrl: "" };
      }
    }

    // Build final update body
    const updateBody: Record<string, any> = { ...body, ...(paymentDetails ? { paymentDetails } : {}) };

    // Timeline event to push
    let newTimelineEvent: any = null;
    let newRejectionHistoryItem: any = null;

    // ── Handle Submitter Re-initiation ──────────────────────────────────────
    if (isReinitiating) {
      const nextRevision = Number((previousInvoice as any).revisionCount || 0) + 1;
      updateBody.status = "Pending";
      updateBody.approvalStage = "PENDING_HR";
      updateBody.revisionCount = nextRevision;
      updateBody.rejectionReason = "";
      updateBody.rejectedBy = "";
      updateBody.rejectedAt = "";

      newTimelineEvent = {
        stage: "RE_INITIATED",
        status: "Pending",
        actorName: session.userName || "Employee",
        actorRole: session.role || "Employee",
        actorId: userObjectId,
        note: body.resubmitNote?.trim() || `Revision #${nextRevision} submitted with corrections for HR review.`,
        timestamp: new Date(),
      };
    }

    // ── Handle Explicit Approval Transition ──────────────────────────────────
    if (body.status === "Approved") {
      updateBody.status = "Approved";
      updateBody.approvalStage = "PENDING_ADMIN";
      updateBody.approvedBy = session.userName || "HR";
      updateBody.approvedAt = new Date().toISOString();
      updateBody.approverRole = session.role === "HR" ? "HR" : "Admin";
      updateBody.rejectionReason = "";
      updateBody.rejectedBy = "";
      updateBody.rejectedAt = "";

      updateBody.hrReview = {
        reviewedBy: session.userName || "HR",
        reviewedById: userObjectId,
        reviewedAt: new Date(),
        verifiedHours: (previousInvoice as any).shiftAttendance?.totalHours || (previousInvoice as any).total || 0,
        notes: body.reviewNote?.trim() || "Shift clock attendance and project timesheets verified and approved.",
      };

      newTimelineEvent = {
        stage: "HR_APPROVED",
        status: "Approved",
        actorName: session.userName || "HR",
        actorRole: session.role === "HR" ? "HR" : "Admin",
        actorId: userObjectId,
        note: body.reviewNote?.trim() || "Shift clock attendance and project timesheets verified and approved.",
        timestamp: new Date(),
      };

      // 1-Click Auto-approve attached project timesheet entries
      try {
        const { TimeEntry } = await import("@/models/TimeEntry");
        const employeeId = (previousInvoice as any).createdBy;
        if (employeeId) {
          await TimeEntry.updateMany(
            {
              tenantId: tenantObjectId,
              userId: employeeId,
              status: { $in: ["Draft", "Pending", "Submitted"] },
            },
            {
              $set: {
                status: "Approved",
                approvedBy: userObjectId,
              },
            }
          );
        }
      } catch (tsErr) {
        console.warn("Could not auto-approve time entries on invoice approval:", tsErr);
      }
    }

    // ── Handle Explicit Rejection Transition ──────────────────────────────────
    if (body.status === "Rejected") {
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
      updateBody.rejectedBy = session.userName || "HR";
      updateBody.rejectedAt = new Date().toISOString();
      updateBody.approvedBy = "";
      updateBody.approvedAt = "";
      updateBody.approverRole = null;

      newTimelineEvent = {
        stage: "HR_REJECTED",
        status: "Rejected",
        actorName: session.userName || "HR",
        actorRole: session.role || "HR",
        actorId: userObjectId,
        note: reasonText,
        timestamp: new Date(),
      };

      newRejectionHistoryItem = {
        reason: reasonText,
        rejectedBy: session.userName || "HR",
        rejectedAt: new Date(),
        role: session.role || "HR",
      };
    }

    // ── Handle Paid Transition ──────────────────────────────────────────────
    if (body.status === "Paid") {
      updateBody.status = "Paid";
      updateBody.approvalStage = "PAID";
      if (!updateBody.paidDate) {
        updateBody.paidDate = new Date().toISOString().slice(0, 10);
      }

      newTimelineEvent = {
        stage: "PAID",
        status: "Paid",
        actorName: session.userName || "Admin",
        actorRole: session.role || "Admin",
        actorId: userObjectId,
        note: `Payout processed via ${updateBody.paymentDetails?.method || "Payment"}${updateBody.paymentDetails?.transactionId ? ` (Txn ID: ${updateBody.paymentDetails.transactionId})` : ""}`,
        timestamp: new Date(),
      };
    }

    // ── Stamp approver details & signature on approval / mark Paid ───────────
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

    // Prepare Mongo update operators
    const mongoUpdate: Record<string, any> = {
      $set: { ...updateBody, updatedAt: new Date() },
    };

    const pushItems: Record<string, any> = {};
    if (newTimelineEvent) {
      pushItems.timeline = newTimelineEvent;
    }
    if (newRejectionHistoryItem) {
      pushItems.rejectionHistory = newRejectionHistoryItem;
    }
    if (Object.keys(pushItems).length > 0) {
      mongoUpdate.$push = pushItems;
    }

    const updated = await ITInvoice.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      mongoUpdate,
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Background notifications to Raising User & Reviewers
    (async () => {
      try {
        const internalUser = await User.findOne({
          tenantId: tenantObjectId,
          $or: [
            ...(updated.billedToEmail ? [{ email: updated.billedToEmail.toLowerCase() }] : []),
            ...(updated.createdBy ? [{ _id: updated.createdBy }] : []),
          ],
        }).lean();

        if (isReinitiating) {
          // 1. Notify HR that revised invoice was resubmitted
          const creatorUser = await User.findById(updated.createdBy).select("hrId name").lean() as any;
          let hrRecipients: mongoose.Types.ObjectId[] = [];
          if (creatorUser?.hrId) {
            hrRecipients.push(creatorUser.hrId);
          } else {
            const activeHRs = await User.find({ tenantId: tenantObjectId, role: "HR", status: "Active" }).select("_id").lean();
            hrRecipients = activeHRs.map((h) => h._id as mongoose.Types.ObjectId);
          }

          for (const hrId of hrRecipients) {
            await Notification.create({
              tenantId: tenantObjectId,
              recipientId: hrId,
              title: `🔄 Revised Invoice Re-submitted: ${updated.invoiceNo}`,
              message: `${session.userName} revised and re-initiated invoice ${updated.invoiceNo} (Revision #${updated.revisionCount || 1}). Please review the updated timesheets.`,
              type: "finance",
              linkUrl: `/dashboard/finance?tab=invoices&invoiceNo=${encodeURIComponent(updated.invoiceNo)}`,
              read: false,
            });
          }

          // Also notify submitter
          if (internalUser) {
            await Notification.create({
              tenantId: tenantObjectId,
              recipientId: internalUser._id,
              title: `Invoice ${updated.invoiceNo} Re-submitted`,
              message: `Your revised invoice ${updated.invoiceNo} has been re-submitted to HR for verification.`,
              type: "finance",
              linkUrl: `/dashboard/settings?tab=invoice&invoiceNo=${encodeURIComponent(updated.invoiceNo)}`,
              read: false,
            });
          }
        } else if (body.status === "Approved") {
          // 2. HR Approved: Alert Submitter + Alert All Admins/OPS for payout!
          if (internalUser) {
            await Notification.create({
              tenantId: tenantObjectId,
              recipientId: internalUser._id,
              title: `✨ Timesheets Approved: ${updated.invoiceNo}`,
              message: `Your invoice (${updated.invoiceNo}) hours and attendance have been verified & approved by ${session.userName} (${session.role}). It has moved to Admin for payout disbursement.`,
              type: "finance",
              linkUrl: `/dashboard/settings?tab=invoice&invoiceNo=${encodeURIComponent(updated.invoiceNo)}`,
              read: false,
            });
          }

          // Alert Admins & OPS
          const admins = await User.find({
            tenantId: tenantObjectId,
            role: { $in: ["Admin", "OPS"] },
            status: "Active",
          }).select("_id").lean();

          for (const admin of admins) {
            await Notification.create({
              tenantId: tenantObjectId,
              recipientId: admin._id,
              title: `💳 Invoice Ready for Payout: ${updated.invoiceNo}`,
              message: `Invoice ${updated.invoiceNo} (${updated.businessName}) has been approved by HR (${session.userName}). Ready for payout disbursement.`,
              type: "finance",
              linkUrl: `/dashboard/finance?tab=invoices&invoiceNo=${encodeURIComponent(updated.invoiceNo)}`,
              read: false,
              adminOnly: true,
            });
          }
        } else if (body.status === "Rejected") {
          // 3. Rejected: Alert Submitter with mandatory reason
          if (internalUser) {
            await Notification.create({
              tenantId: tenantObjectId,
              recipientId: internalUser._id,
              title: `❌ Invoice Returned for Revision: ${updated.invoiceNo}`,
              message: `Your invoice (${updated.invoiceNo}) was rejected by ${session.userName}. Reason: ${updated.rejectionReason}. Click to fix and re-initiate.`,
              type: "finance",
              linkUrl: `/dashboard/settings?tab=invoice&invoiceNo=${encodeURIComponent(updated.invoiceNo)}`,
              read: false,
            });

            if (internalUser.email) {
              await sendEmail({
                to: internalUser.email,
                subject: `[NexAce CRM] Invoice ${updated.invoiceNo} Returned for Revision`,
                text: `Hello ${internalUser.name},\n\nYour invoice ${updated.invoiceNo} was returned for revision by ${session.userName} (${session.role}).\n\nReason: ${updated.rejectionReason}\n\nPlease log in to your portal, make the necessary corrections, and re-initiate your invoice.`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                    <h2 style="color: #e11d48; margin-top: 0;">❌ Invoice Revision Needed</h2>
                    <p style="color: #475569; font-size: 14px;">Hello <strong>${internalUser.name}</strong>,</p>
                    <p style="color: #475569; font-size: 14px;">Your invoice has been reviewed and returned for revision by <strong>${session.userName} (${session.role})</strong>.</p>
                    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; padding: 16px; border-radius: 8px; margin: 16px 0;">
                      <p style="margin: 4px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${updated.invoiceNo}</p>
                      <p style="margin: 4px 0; font-size: 14px; color: #be123c;"><strong>Rejection Reason:</strong> ${updated.rejectionReason}</p>
                    </div>
                    <p style="color: #475569; font-size: 14px;">You can review this feedback, make the required corrections to your hours or notes, and re-initiate the invoice directly.</p>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Log in to <a href="/dashboard/settings?tab=invoice" style="color: #4f46e5;">NexAce CRM</a> to fix and resubmit.</p>
                  </div>
                `,
              });
            }
          }
        } else if (body.status === "Paid" && internalUser) {
          // 4. Paid: Disburse confirmation & PDF
          const payMethod = updated.paymentDetails?.method || "Bank Transfer";
          const hasReceipt = Boolean(updated.paymentDetails?.screenshotUrl);

          await Notification.create({
            tenantId: tenantObjectId,
            recipientId: internalUser._id,
            title: `✅ Payout Processed: ${updated.invoiceNo}`,
            message: `Your invoice (${updated.invoiceNo}) has been paid via ${payMethod} by ${session.userName || "Admin"}.${hasReceipt ? " Payment receipt is attached." : ""}`,
            type: "finance",
            linkUrl: `/dashboard/settings?tab=invoice&invoiceNo=${encodeURIComponent(updated.invoiceNo)}`,
            read: false,
          });

          if (internalUser.email) {
            const attachments: EmailAttachment[] = [];
            try {
              const tenantDoc = await Tenant.findById(tenantObjectId).select("bankDetails").lean();
              const pdfBuffer = generateInvoicePdfBuffer({
                invoiceNo: updated.invoiceNo,
                invoiceDate: updated.invoiceDate,
                dueDate: updated.dueDate,
                customerNo: updated.customerNo,
                businessName: updated.businessName,
                businessAddress: updated.businessAddress,
                businessEmail: updated.businessEmail,
                billedToName: updated.billedToName,
                billedToAddress: updated.billedToAddress,
                billedToEmail: updated.billedToEmail,
                items: updated.items || [],
                subtotal: updated.subtotal || 0,
                taxRate: updated.taxRate,
                taxAmount: updated.taxAmount,
                total: updated.total || 0,
                currency: updated.currency || "INR",
                status: updated.status,
                notes: updated.notes,
                bankDetails: (updated as any).bankDetails || (tenantDoc as any)?.bankDetails,
                paymentDetails: updated.paymentDetails,
                signatureUrl: (updated as any).signatureUrl || "",
                approvedBy: (updated as any).approvedBy || "",
                approvedAt: (updated as any).approvedAt || "",
              });
              attachments.push({
                filename: `Invoice_${updated.invoiceNo}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              });
            } catch (pdfErr) {
              console.error("Failed to generate PDF attachment on payment:", pdfErr);
            }

            await sendEmail({
              to: internalUser.email,
              subject: `[NexAce CRM] Invoice Paid: ${updated.invoiceNo}`,
              text: `Hello ${internalUser.name},\n\nYour invoice ${updated.invoiceNo} has been paid via ${payMethod} by ${session.userName || "Admin"}.\n\nTotal Paid: ₹${updated.total?.toLocaleString()}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                  <h2 style="color: #10b981; margin-top: 0;">✅ Invoice Paid & Settled</h2>
                  <p style="color: #475569; font-size: 14px;">Hello <strong>${internalUser.name}</strong>,</p>
                  <p style="color: #475569; font-size: 14px;">Your invoice payout has been successfully completed by <strong>${session.userName || "Admin"}</strong>.</p>
                  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${updated.invoiceNo}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${updated.total?.toLocaleString()}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Payment Method:</strong> ${payMethod}</p>
                    ${updated.paymentDetails?.transactionId ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Transaction UTR / ID:</strong> ${updated.paymentDetails.transactionId}</p>` : ""}
                    ${updated.paymentDetails?.upiId ? `<p style="margin: 4px 0; font-size: 14px;"><strong>UPI ID:</strong> ${updated.paymentDetails.upiId}</p>` : ""}
                  </div>
                  <p style="margin: 10px 0; font-size: 13px; color: #16a34a; font-weight: bold;">📄 Official invoice PDF is attached to this email.</p>
                  ${hasReceipt ? `<p style="font-size: 13px; color: #475569;">📎 Payment screenshot is stored in your company Drive Space under 'Finance Portal'.</p>` : ""}
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Log in to your NexAce dashboard to view details.</p>
                </div>
              `,
              attachments,
            });
          }
        }
      } catch (bgErr) {
        console.error("Background notification error in PATCH invoice:", bgErr);
      }
    })();

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_INVOICE_UPDATED",
      targetName: updated.invoiceNo,
      details: `Updated invoice ${updated.invoiceNo} — status: ${updated.status}${updated.paymentDetails?.method ? `, payment: ${updated.paymentDetails.method}` : ""}`,
    });

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/it/invoices/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await ITInvoice.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    if (!deleted) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_INVOICE_DELETED",
      targetName: deleted.invoiceNo,
      details: `Deleted invoice ${deleted.invoiceNo}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/it/invoices/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
