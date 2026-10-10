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
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin", "Manager", "HR"]);
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

    // Build final update body — insert processed paymentDetails and paidDate
    const updateBody: Record<string, any> = { ...body, ...(paymentDetails ? { paymentDetails } : {}) };

    if (body.status === "Paid" && !body.paidDate && !(previousInvoice as any).paidDate) {
      updateBody.paidDate = new Date().toISOString().slice(0, 10);
    } else if (body.paidDate) {
      updateBody.paidDate = body.paidDate;
    }

    // ── Handle Explicit Approval Transition ──────────────────────────────────
    if (body.status === "Approved") {
      updateBody.approvedBy = session.userName || "Admin";
      updateBody.approvedAt = new Date().toISOString();
      updateBody.approverRole = session.role === "HR" ? "HR" : "Admin";
      updateBody.rejectionReason = "";
      updateBody.rejectedBy = "";
      updateBody.rejectedAt = "";

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
      updateBody.rejectionReason = body.rejectionReason.trim();
      updateBody.rejectedBy = session.userName || "Admin";
      updateBody.rejectedAt = new Date().toISOString();
      updateBody.approvedBy = "";
      updateBody.approvedAt = "";
      updateBody.approverRole = null;
    }

    // ── Stamp approver details & signature on approval / mark Paid ───────────
    if (body.status === "Paid" || body.status === "Approved") {
      if (!updateBody.approvedBy) updateBody.approvedBy = session.userName || "Admin";
      if (!updateBody.approvedAt) updateBody.approvedAt = new Date().toISOString();

      try {
        let effectiveSig = "";
        // 1. Organization signature from Tenant (Primary company signature as requested by user)
        const tenantForSig = await Tenant.findById(tenantObjectId).select("signatureUrl").lean();
        if ((tenantForSig as any)?.signatureUrl?.trim()) {
          effectiveSig = (tenantForSig as any).signatureUrl.trim();
        }

        // 2. Fallback: Approver's user profile signature
        if (!effectiveSig) {
          const approverUser = await User.findById(userObjectId).select("signatureUrl name").lean();
          if ((approverUser as any)?.signatureUrl?.trim()) {
            effectiveSig = (approverUser as any).signatureUrl.trim();
          }
        }

        // 3. Fallback: Check if any Admin in this tenant has a signature
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

    const updated = await ITInvoice.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: { ...updateBody, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Fire-and-forget: send notification + email AFTER returning the response
    // so the API doesn't block on PDF generation or SMTP handshake.
    if (body.status && (previousInvoice as any).status !== body.status) {
      (async () => {
        try {
          const internalUser = await User.findOne({
            tenantId: tenantObjectId,
            $or: [
              ...(updated.billedToEmail ? [{ email: updated.billedToEmail.toLowerCase() }] : []),
              ...(updated.createdBy ? [{ _id: updated.createdBy }] : []),
            ],
          }).lean();

          if (!internalUser) return;

          const isPaid = updated.status === "Paid";
          const isApproved = updated.status === "Approved";
          const isRejected = updated.status === "Rejected";
          const payMethod = updated.paymentDetails?.method || "";
          const hasReceipt = isPaid && updated.paymentDetails?.screenshotUrl;

          let notifTitle = `Invoice Status Updated: ${updated.invoiceNo}`;
          let notifMsg = `Your invoice (${updated.invoiceNo}) status was updated to "${updated.status}" by ${session.userName || "Admin"}.`;

          if (isPaid) {
            notifTitle = `✅ Invoice Paid: ${updated.invoiceNo}`;
            notifMsg = `Your invoice (${updated.invoiceNo}) has been paid via ${payMethod} by ${session.userName || "Admin"}.${hasReceipt ? " Payment receipt is attached." : ""}`;
          } else if (isApproved) {
            notifTitle = `✨ Invoice Approved: ${updated.invoiceNo}`;
            notifMsg = `Your invoice & attached timesheets (${updated.invoiceNo}) have been approved by ${session.userName} (${session.role}) and authorized for payout.`;
          } else if (isRejected) {
            notifTitle = `❌ Invoice Rejected: ${updated.invoiceNo}`;
            notifMsg = `Your invoice (${updated.invoiceNo}) was rejected by ${session.userName} (${session.role}). Reason: ${updated.rejectionReason || "Please review and resubmit."}`;
          }

          // In-app notification
          await Notification.create({
            tenantId: tenantObjectId,
            recipientId: internalUser._id,
            title: notifTitle,
            message: notifMsg,
            type: "system",
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
              console.error("Failed to generate PDF invoice attachment for email:", pdfErr);
            }

            const receiptSection = hasReceipt
              ? `<p style="margin:8px 0;font-size:13px;">📎 <strong>Payment Receipt:</strong> A screenshot of the payment has been attached in your Finance Portal under Drive Space.</p>`
              : "";

            const emailSubject = isPaid
              ? `[NexAce CRM] Invoice Approved & Paid: ${updated.invoiceNo}`
              : isApproved
              ? `[NexAce CRM] Invoice Approved: ${updated.invoiceNo}`
              : isRejected
              ? `[NexAce CRM] Invoice Rejected: ${updated.invoiceNo}`
              : `[NexAce CRM] Invoice Status Updated: ${updated.invoiceNo}`;

            const emailHeading = isPaid
              ? "✅ Invoice Paid"
              : isApproved
              ? "✨ Invoice & Timesheet Approved"
              : isRejected
              ? "❌ Invoice Rejected"
              : "✦ Invoice Status Update";

            const headingColor = isPaid
              ? "#10b981"
              : isApproved
              ? "#059669"
              : isRejected
              ? "#e11d48"
              : "#4f46e5";

            await sendEmail({
              to: internalUser.email,
              subject: emailSubject,
              text: notifMsg,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                  <h2 style="color: ${headingColor}; margin-top: 0;">${emailHeading}</h2>
                  <p style="color: #475569; font-size: 14px;">Hello <strong>${internalUser.name}</strong>,</p>
                  <p style="color: #475569; font-size: 14px;">${
                    isPaid
                      ? `Your invoice has been <strong>paid</strong> by <strong>${session.userName || "Admin"}</strong>.`
                      : isApproved
                      ? `Your invoice and attached work hours have been <strong>approved</strong> by <strong>${session.userName} (${session.role})</strong> and authorized for payment processing.`
                      : isRejected
                      ? `Your invoice was <strong>rejected</strong> by <strong>${session.userName} (${session.role})</strong>.`
                      : `The status of your invoice has been updated by <strong>${session.userName || "Admin"}</strong>:`
                  }</p>
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${updated.invoiceNo}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: ${headingColor}; font-weight: bold;">${updated.status}</span></p>
                    ${isRejected && updated.rejectionReason ? `<p style="margin: 6px 0; font-size: 14px; color: #e11d48; background-color: #ffe4e6; padding: 8px; border-radius: 6px;"><strong>Rejection Reason:</strong> ${updated.rejectionReason}</p>` : ""}
                    ${isApproved && updated.approvedBy ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Approved By:</strong> ${updated.approvedBy} (${updated.approverRole || session.role})</p>` : ""}
                    ${isPaid ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Payment Method:</strong> ${payMethod}</p>` : ""}
                    ${isPaid && updated.paymentDetails?.upiId ? `<p style="margin: 4px 0; font-size: 14px;"><strong>UPI ID:</strong> ${updated.paymentDetails.upiId}</p>` : ""}
                    ${isPaid && updated.paymentDetails?.transactionId ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Transaction ID:</strong> ${updated.paymentDetails.transactionId}</p>` : ""}
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${updated.total?.toLocaleString()}</p>
                  </div>
                  <p style="margin: 10px 0; font-size: 13px; color: #16a34a; font-weight: bold;">📄 Official invoice PDF is attached to this email.</p>
                  ${receiptSection}
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Log in to your NexAce dashboard to view details.</p>
                </div>
              `,
              attachments,
            });
          }
        } catch (bgErr) {
          console.error("Background notification/email for invoice update failed:", bgErr);
        }
      })();
    }

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
