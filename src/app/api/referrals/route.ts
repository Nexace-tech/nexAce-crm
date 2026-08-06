import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Referral } from "@/models/Referral";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { notify, notifyAdmins } from "@/lib/notify";

/**
 * GET: Fetch all candidate referrals for the authenticated tenant.
 */
export async function GET() {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId } = authResult;
    await connectToDatabase();

    const referrals = await Referral.find({ tenantId: tenantObjectId }).sort({ createdAt: -1 });

    return NextResponse.json({ referrals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API GET Referrals error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST: Submit a new candidate referral.
 */
export async function POST(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
    const body = await request.json();
    const { candidateName, candidateEmail, phone, position, rewardAmount, notes } = body;

    if (!candidateName || !candidateEmail || !position) {
      return NextResponse.json(
        { error: "Candidate Name, Email, and Position are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Generate referral code using name and random number (e.g. JOHN-8492)
    const nameSlug = (candidateName || session.userName || "REF")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 6) || "REF";
    const randArr = new Uint32Array(1);
    crypto.getRandomValues(randArr);
    const randomNum = 1000 + (randArr[0] % 9000);
    const generatedReferralCode = `${nameSlug}-${randomNum}`;

    const newReferral = await Referral.create({
      candidateName,
      candidateEmail,
      phone: phone || "",
      position,
      referrerName: session.userName || "Team Member",
      referrerId: userObjectId,
      referralCode: generatedReferralCode,
      status: "Submitted",
      rewardAmount: Number(rewardAmount) || 500,
      payoutStatus: "Pending",
      notes: notes || "",
      tenantId: tenantObjectId,
    });

    // Notify Admins and HR when a new candidate referral is submitted
    await notifyAdmins(tenantObjectId, {
      title: "New Candidate Referral",
      message: `${session.userName} referred candidate '${candidateName}' for ${position}`,
      type: "referral",
      linkUrl: "/dashboard/referrals",
    });

    return NextResponse.json({ referral: newReferral, message: "Referral submitted successfully" }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API POST Referral error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH: Update referral status (Admin/HR only) and notify the referrer.
 */
export async function PATCH(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "Manager", "HR"]);
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId } = authResult;
    const body = await request.json();
    const { referralId, status, payoutStatus } = body;

    if (!referralId || !status) {
      return NextResponse.json({ error: "referralId and status are required" }, { status: 400 });
    }

    await connectToDatabase();

    const updates: any = { status };
    if (payoutStatus) updates.payoutStatus = payoutStatus;

    const referral = await Referral.findOneAndUpdate(
      { _id: referralId, tenantId: tenantObjectId },
      updates,
      { new: true }
    );

    if (!referral) return NextResponse.json({ error: "Referral not found" }, { status: 404 });

    // Notify the person who submitted the referral
    if (referral.referrerId && referral.referrerId.toString() !== userObjectId.toString()) {
      await notify(tenantObjectId, referral.referrerId.toString(), {
        title: "Referral Status Updated",
        message: `Your referral for ${referral.candidateName} has been updated to '${status}'.`,
        type: "referral",
        linkUrl: "/dashboard/referrals",
      });
    }

    return NextResponse.json({ referral, message: "Referral updated" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PATCH Referral error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
