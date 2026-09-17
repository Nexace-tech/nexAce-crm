import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ClientContract } from "@/models/ClientContract";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
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
      "startDate", "endDate",
      "ndaAttachment", "agreementAttachment", "otherAttachments",
      "status", "notifyOnCreate", "generateInvoice", "notes",
    ];

    for (const f of scalarFields) {
      if (f in body) allowedUpdates[f] = body[f];
    }

    // Allow deep update of sender / receiver company details
    if (body.sender)   allowedUpdates.sender   = body.sender;
    if (body.receiver) allowedUpdates.receiver = body.receiver;

    const updated = await ClientContract.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name email")
      .lean();

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
