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
    const updateBody: Record<string, unknown> = { ...body };

    if (body.status === "Approved") {
      updateBody.approvedBy = session.userName || "Admin";
      updateBody.approvedAt = new Date().toISOString();
      updateBody.approverRole = session.role === "HR" ? "HR" : "Admin";
      updateBody.rejectionReason = "";
      updateBody.rejectedBy = "";
      updateBody.rejectedAt = "";
    }

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
      updateBody.approverRole = "";
    }

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

    const invoice = await FinanceInvoice.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: updateBody },
      { new: true }
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

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
