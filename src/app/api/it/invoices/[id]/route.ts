import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITInvoice } from "@/models/ITInvoice";
import { ActivityLog } from "@/models/ActivityLog";
import { User } from "@/models/User";
import { Notification } from "@/models/Notification";
import { sendEmail } from "@/lib/mail";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

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

    const updated = await ITInvoice.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if status changed & notify user ONLY IF recipient belongs to "Our Team" (Internal Workspace User)
    if (body.status && previousInvoice.status !== body.status) {
      const internalUser = await User.findOne({
        tenantId: tenantObjectId,
        $or: [
          ...(updated.billedToEmail ? [{ email: updated.billedToEmail.toLowerCase() }] : []),
          ...(updated.createdBy ? [{ _id: updated.createdBy }] : []),
        ],
      });

      if (internalUser) {
        // Internal Team member detected — create notification & send email alert
        await Notification.create({
          tenantId: tenantObjectId,
          recipientId: internalUser._id,
          title: `Invoice Status Updated: ${updated.invoiceNo}`,
          message: `Your invoice (${updated.invoiceNo}) status was updated to "${updated.status}" by ${session.userName || "Admin"}.`,
          type: "system",
          linkUrl: "/dashboard/settings?tab=self-invoices",
          read: false,
        });

        if (internalUser.email) {
          try {
            await sendEmail({
              to: internalUser.email,
              subject: `[NexAce CRM] Invoice Status Updated: ${updated.invoiceNo}`,
              text: `Hello ${internalUser.name},\n\nYour invoice ${updated.invoiceNo} status has been updated to "${updated.status}".\n\nLog in to your NexAce dashboard to view details.`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                  <h2 style="color: #4f46e5; margin-top: 0;">✦ Invoice Status Update</h2>
                  <p style="color: #475569; font-size: 14px;">Hello <strong>${internalUser.name}</strong>,</p>
                  <p style="color: #475569; font-size: 14px;">The status of your invoice has been updated by <strong>${session.userName || "Admin"}</strong>:</p>
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Invoice Number:</strong> ${updated.invoiceNo}</p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>New Status:</strong> <span style="color: #2563eb; font-weight: bold;">${updated.status}</span></p>
                    <p style="margin: 4px 0; font-size: 14px;"><strong>Total Amount:</strong> ₹${updated.total?.toLocaleString()}</p>
                  </div>
                  <p style="color: #94a3b8; font-size: 12px;">This update applies to internal team invoices (Our Team).</p>
                </div>
              `,
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
      details: `Updated invoice ${updated.invoiceNo} — status: ${updated.status}`,
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
