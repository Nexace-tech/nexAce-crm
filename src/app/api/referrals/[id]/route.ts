import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Referral } from "@/models/Referral";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

/**
 * PATCH: Update candidate referral stage, payout status, or details.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager", "HR"]);
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const { tenantObjectId, session } = authResult;
    const body = await request.json();

    await connectToDatabase();

    const referral = await Referral.findOne({ _id: id, tenantId: tenantObjectId });
    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    const allowedFields: Record<string, boolean> = {
      status: true, payoutStatus: true, rewardAmount: true, notes: true
    };

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields[key]) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const updated = await Referral.findByIdAndUpdate(id, { $set: updates }, { new: true, tenantId: tenantObjectId });
    return NextResponse.json({ referral: updated, message: "Referral updated successfully" });
  } catch (error: unknown) {
    console.error("API PATCH Referral error:", error);
    const _msg = error instanceof Error ? error.message : "Internal Server Error"; return NextResponse.json({ error: _msg }, { status: 500 });
  }
}

/**
 * DELETE: Remove a referral record (Admin / Manager only).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const { tenantObjectId } = authResult;

    await connectToDatabase();

    const deletedReferral = await Referral.findOneAndDelete({ _id: id, tenantId: tenantObjectId });
    if (!deletedReferral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Referral record deleted successfully" });
  } catch (error: unknown) {
    console.error("API DELETE Referral error:", error);
    const _msg = error instanceof Error ? error.message : "Internal Server Error"; return NextResponse.json({ error: _msg }, { status: 500 });
  }
}
