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
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin", "Manager"]);
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

    // Build final update body — insert processed paymentDetails
    const updateBody = { ...body, ...(paymentDetails ? { paymentDetails } : {}) };

    const updated = await ITInvoice.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: { ...updateBody, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if status changed & notify user ONLY IF recipient belongs to "Our Team" (Internal Workspace User)
    if (body.status && (previousInvoice as any).status !== body.status) {
      const internalUser = await User.findOne({
        tenantId: tenantObjectId,
        $or: [
          ...(updated.billedToEmail ? [{ email: updated.billedToEmail.toLowerCase() }] : []),
          ...(updated.createdBy ? [{ _id: updated.createdBy }] : []),
        ],
      });

      if (internalUser) {
        const isPaid = updated.status === "Paid";
        const payMethod = updated.paymentDetails?.method || "";
        const hasReceipt = isPaid && updated.paymentDetails?.screenshotUrl;

        // In-app notification
        await Notification.create({
          tenantId: tenantObjectId,
          recipientId: internalUser._id,
          title: `Invoice Status Updated: ${updated.invoiceNo}`,
          message: isPaid
            ? `Your invoice (${updated.invoiceNo}) has been approved & marked Paid via ${payMethod} by ${session.userName || "Admin"}.${hasReceipt ? " Payment receipt is attached." : ""}`
            : `Your invoice (${updated.invoiceNo}) status was updated to "${updated.status}" by ${session.userName || "Admin"}.`,
          type: "system",
          linkUrl: `/dashboard/settings?tab=invoice&invoiceNo=${encodeURIComponent(updated.invoiceNo)}`,
          read: false,
        });

        if (internalUser.email) {
          try {
            // Generate invoice PDF attachment
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
            await sendEmail({
              to: internalUser.email,
              subject: `[NexAce CRM] Invoice ${isPaid ? "Approved & Paid" : "Status Updated"}: ${updated.invoiceNo}`,
              text: isPaid
                ? `Hello ${internalUser.name},\n\nYour invoice ${updated.invoiceNo} has been approved and marked as Paid via ${payMethod} by ${session.userName || "Admin"}.\n\nTotal: ₹${updated.total?.toLocaleString()}\n\nPlease find your official invoice PDF attached.\n\nLog in to your NexAce dashboard to view payment details.`
                : `Hello ${internalUser.name},\n\nYour invoice ${updated.invoiceNo} status has been updated to "${updated.status}".\n\nPlease find your invoice PDF attached.\n\nLog in to your NexAce dashboard to view details.`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                  <h2 style="color: ${isPaid ? "#10b981" : "#4f46e5"}; margin-top: 0;">${isPaid ? "✅ Invoice Approved & Paid" : "✦ Invoice Status Update"}</h2>
                  <p style="color: #475569; font-size: 14px;">Hello <strong>${internalUser.name}</strong>,</p>
                  <p style="color: #475569; font-size: 14px;">${isPaid
                    ? `Your invoice has been <strong>approved and paid</strong> by <strong>${session.userName || "Admin"}</strong>.`
                    : `The status of your invoice has been updated by <strong>${session.userName || "Admin"}</strong>:`
                  }</p>
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${updated.invoiceNo}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: ${isPaid ? "#10b981" : "#2563eb"}; font-weight: bold;">${updated.status}</span></p>
                    ${isPaid ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Payment Method:</strong> ${payMethod}</p>` : ""}
                    ${isPaid && updated.paymentDetails?.upiId ? `<p style="margin: 4px 0; font-size: 14px;"><strong>UPI ID:</strong> ${updated.paymentDetails.upiId}</p>` : ""}
                    ${isPaid && updated.paymentDetails?.transactionId ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Transaction ID:</strong> ${updated.paymentDetails.transactionId}</p>` : ""}
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${updated.total?.toLocaleString()}</p>
                  </div>
                  <p style="margin: 10px 0; font-size: 13px; color: #16a34a; font-weight: bold;">📄 Official invoice PDF is attached to this email.</p>
                  ${receiptSection}
                  <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Log in to your NexAce dashboard to view the full invoice and payment details.</p>
                </div>
              `,
              attachments,
            });
          } catch (mailErr) {
            console.error("Failed to dispatch invoice status update email:", mailErr);
          }
        }
      }
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
