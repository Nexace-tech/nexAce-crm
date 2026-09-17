import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ClientContract } from "@/models/ClientContract";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { sendEmail } from "@/lib/mail";
import mongoose from "mongoose";

// ── PATCH /api/ops/contracts/[id] ─────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantSession();
    if (isAuthError(auth)) return auth;
    const { tenantObjectId } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
    }

    await connectToDatabase();

    const body = await req.json();

    // Prevent tenant-jump
    const existing = await ClientContract.findOne({
      _id: id,
      tenantId: tenantObjectId,
    });
    if (!existing) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Whitelist updatable fields
    const allowedUpdates: Record<string, unknown> = {};
    const scalarFields = [
      "pocName", "pocEmail", "pocPhone",
      "contractType", "customTypeLabel", "location",
      "startDate", "endDate", "budget", "currency",
      "ndaAttachment", "agreementAttachment", "otherAttachments",
      "status", "mailSent", "notifyOnCreate", "generateInvoice", "notes",
    ];

    for (const f of scalarFields) {
      if (f in body) allowedUpdates[f] = body[f];
    }

    // Allow deep update of sender / receiver company details
    if (body.sender)   allowedUpdates.sender   = body.sender;
    if (body.receiver) {
      allowedUpdates.receiver = body.receiver;
      if (body.receiver.name) allowedUpdates.clientCompany = body.receiver.name.trim();
    }

    const updated = await ClientContract.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .lean();

    // ── If mailSent toggled to true and was not previously sent, trigger email ─
    if (body.mailSent && !existing.mailSent) {
      const targetContract = updated || existing;
      const targetPocEmail = targetContract?.pocEmail;
      const targetSenderName = targetContract?.sender?.name || "Sender";
      const targetReceiverName = targetContract?.receiver?.name || "Client";
      const targetPocName = targetContract?.pocName || "Valued Client";

      if (targetPocEmail) {
        try {
          const typeLabel =
            targetContract.contractType === "Custom" && targetContract.customTypeLabel
              ? targetContract.customTypeLabel
              : (targetContract.contractType || "").replace("_", " ");

          const formattedStart = targetContract.startDate
            ? new Date(targetContract.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "Not specified";
          const formattedEnd = targetContract.endDate
            ? new Date(targetContract.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
            : "Not specified";

          await sendEmail({
            to: targetPocEmail.trim().toLowerCase(),
            subject: `Contract Agreement: ${targetSenderName} & ${targetReceiverName}`,
            text: `Dear ${targetPocName},\n\nA ${typeLabel} contract between ${targetSenderName} and ${targetReceiverName} has been confirmed.\nContract Period: ${formattedStart} to ${formattedEnd}\nStatus: ${targetContract.status || "Draft"}\n\nBest regards,\n${targetSenderName}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
                <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px;">
                  <h2 style="margin: 0; color: #1e293b; font-size: 20px; font-weight: 700;">Client Contract Confirmation</h2>
                  <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">NexAce CRM • Operations</p>
                </div>
                <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">Dear <strong>${targetPocName}</strong>,</p>
                <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
                  This email confirms that the contract agreement between <strong>${targetSenderName}</strong> and <strong>${targetReceiverName}</strong> has been updated and recorded in our system.
                </p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                    <tbody>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b; width: 35%;">Contract Type:</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${typeLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">Client (Receiver):</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${targetReceiverName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">Issuer (Sender):</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${targetSenderName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">Effective Period:</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${formattedStart} — ${formattedEnd}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #64748b;">Status:</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #1e293b;">${targetContract.status || "Draft"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
                  Generated by NexAce CRM • Automated Notification
                </div>
              </div>
            `,
          });
        } catch (mailErr) {
          console.error("[OPS/CONTRACTS PATCH] Email notification failed:", mailErr);
        }
      }
    }

    return NextResponse.json({ contract: updated });
  } catch (err) {
    console.error("[OPS/CONTRACTS PATCH]", err);
    return NextResponse.json({ error: "Failed to update contract" }, { status: 500 });
  }
}

// ── DELETE /api/ops/contracts/[id] ────────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireTenantSession();
    if (isAuthError(auth)) return auth;
    const { tenantObjectId } = auth;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
    }

    await connectToDatabase();

    const result = await ClientContract.findOneAndDelete({
      _id: id,
      tenantId: tenantObjectId,
    });

    if (!result) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[OPS/CONTRACTS DELETE]", err);
    return NextResponse.json({ error: "Failed to delete contract" }, { status: 500 });
  }
}
