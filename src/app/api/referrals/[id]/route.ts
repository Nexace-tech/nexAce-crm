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
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { id } = await params;
    const { tenantObjectId } = authResult;
    const body = await request.json();

    await connectToDatabase();

    const referral = await Referral.findOne({ _id: id, tenantId: tenantObjectId });
    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    if (body.candidateName !== undefined) referral.candidateName = body.candidateName;
    if (body.candidateEmail !== undefined) referral.candidateEmail = body.candidateEmail;
    if (body.phone !== undefined) referral.phone = body.phone;
    if (body.position !== undefined) referral.position = body.position;
    if (body.status !== undefined) referral.status = body.status;
    if (body.rewardAmount !== undefined) referral.rewardAmount = Number(body.rewardAmount);
    if (body.payoutStatus !== undefined) referral.payoutStatus = body.payoutStatus;
    if (body.notes !== undefined) referral.notes = body.notes;

    await referral.save();

    return NextResponse.json({ referral, message: "Referral updated successfully" });
  } catch (error: any) {
    console.error("API PATCH Referral error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
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
  } catch (error: any) {
    console.error("API DELETE Referral error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
