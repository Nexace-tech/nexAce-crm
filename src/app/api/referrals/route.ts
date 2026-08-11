import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Referral } from "@/models/Referral";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import { getUserDataScope } from "@/lib/dataScope";
import { isSubAdminRole } from "@/lib/roles";
import { notify, notifyAdmins } from "@/lib/notify";
import mongoose from "mongoose";

/**
 * GET: Fetch candidate referrals for the authenticated tenant.
 * - Employees (scope=own): View own submitted candidate referrals.
 * - Admins/OPS/HR/Managers (scope=all): View all organization candidate referrals.
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { tenantObjectId, userObjectId, session } = authResult;
    await connectToDatabase();

    const dataScope = await getUserDataScope(session);
    const canViewAll =
      session.role === "Admin" ||
      isSubAdminRole(session.role) ||
      session.role === "HR" ||
      session.role === "Manager" ||
      dataScope.canViewFeature("viewAllReferrals") ||
      dataScope.scope === "all";

    const queryCondition: any = { tenantId: tenantObjectId };

    if (!canViewAll) {
      queryCondition.referrerId = userObjectId;
    }

    const referrals = await Referral.find(queryCondition).sort({ createdAt: -1 });

    return NextResponse.json({ referrals, canViewAll });
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
    const {
      candidateName,
      candidateEmail,
      phone,
      position,
      department,
      experienceYears,
      candidateResumeUrl,
      rewardAmount,
      notes,
    } = body;

    if (!candidateName || !candidateEmail || !position) {
      return NextResponse.json(
        { error: "Candidate Name, Email, and Position are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check for duplicate candidate email in the current tenant
    const existingCandidate = await Referral.findOne({
      tenantId: tenantObjectId,
      candidateEmail: candidateEmail.toLowerCase().trim(),
    });

    if (existingCandidate) {
      return NextResponse.json(
        { error: `Candidate with email '${candidateEmail}' has already been referred in your workspace.` },
        { status: 400 }
      );
    }

    // Generate referral code using candidate name and random number (e.g. ALEX-8492)
    const nameSlug = (candidateName || session.userName || "REF")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .slice(0, 6) || "REF";
    const randArr = new Uint32Array(1);
    crypto.getRandomValues(randArr);
    const randomNum = 1000 + (randArr[0] % 9000);
    const generatedReferralCode = `${nameSlug}-${randomNum}`;

    const initialStageHistory = [
      {
        status: "Submitted",
        updatedBy: session.userName || "Team Member",
        updatedAt: new Date(),
        comment: "Candidate referral submitted into candidate pipeline.",
      },
    ];

    const newReferral = await Referral.create({
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.toLowerCase().trim(),
      phone: phone ? phone.trim() : "",
      position: position.trim(),
      department: department ? department.trim() : "Engineering",
      experienceYears: Number(experienceYears) || 0,
      candidateResumeUrl: candidateResumeUrl ? candidateResumeUrl.trim() : "",
      referrerName: session.userName || "Team Member",
      referrerId: userObjectId,
      referralCode: generatedReferralCode,
      status: "Submitted",
      rewardAmount: Number(rewardAmount) || 500,
      payoutStatus: "Pending",
      stageHistory: initialStageHistory,
      notes: notes ? notes.trim() : "",
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
 * PATCH: Update referral status / payout status (Admin, OPS, HR, Manager).
 */
export async function PATCH(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;

    const { session, tenantObjectId, userObjectId } = authResult;
    const dataScope = await getUserDataScope(session);
    const canManage =
      session.role === "Admin" ||
      isSubAdminRole(session.role) ||
      session.role === "HR" ||
      session.role === "Manager" ||
      dataScope.canViewFeature("manageReferrals");

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden: Permission required to update referral pipeline" }, { status: 403 });
    }

    const body = await request.json();
    const { referralId, status, payoutStatus, comment } = body;

    if (!referralId) {
      return NextResponse.json({ error: "referralId is required" }, { status: 400 });
    }

    await connectToDatabase();

    const referral = await Referral.findOne({ _id: referralId, tenantId: tenantObjectId });
    if (!referral) return NextResponse.json({ error: "Referral not found" }, { status: 404 });

    if (status && status !== referral.status) {
      referral.status = status;
      referral.stageHistory = referral.stageHistory || [];
      referral.stageHistory.push({
        status,
        updatedBy: session.userName || "HR Manager",
        updatedAt: new Date(),
        comment: comment || `Stage updated to ${status}`,
      });
    }

    if (payoutStatus) {
      referral.payoutStatus = payoutStatus;
      if (payoutStatus === "Paid") {
        referral.payoutDate = new Date();
      }
    }

    await referral.save();

    // Notify referrer of progress update
    if (referral.referrerId && referral.referrerId.toString() !== userObjectId.toString()) {
      await notify(tenantObjectId, referral.referrerId.toString(), {
        title: "Referral Status Updated",
        message: `Your referral '${referral.candidateName}' is now '${referral.status}' (Payout: ${referral.payoutStatus}).`,
        type: "referral",
        linkUrl: "/dashboard/referrals",
      });
    }

    return NextResponse.json({ referral, message: "Referral pipeline updated" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("API PATCH Referral error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
