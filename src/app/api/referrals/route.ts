import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Referral } from "@/models/Referral";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";

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
  } catch (error: any) {
    console.error("API GET Referrals error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
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
    const randomNum = Math.floor(1000 + Math.random() * 9000);
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

    return NextResponse.json({ referral: newReferral, message: "Referral submitted successfully" }, { status: 201 });
  } catch (error: any) {
    console.error("API POST Referral error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
