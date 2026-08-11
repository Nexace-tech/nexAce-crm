import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { connectToDatabase } from "@/lib/db";
import { Referral } from "@/models/Referral";
import { getUserDataScope } from "@/lib/dataScope";
import { isSubAdminRole } from "@/lib/roles";
import mongoose from "mongoose";

/**
 * GET single candidate referral details
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const referral = await Referral.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    return NextResponse.json({ referral });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE candidate referral profile (Admin, OPS, HR only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || !session.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dataScope = await getUserDataScope(session);
    const canDelete =
      session.role === "Admin" ||
      isSubAdminRole(session.role) ||
      session.role === "HR" ||
      dataScope.canViewFeature("manageReferrals");

    if (!canDelete) {
      return NextResponse.json(
        { error: "Forbidden: Permission required to remove referrals" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await connectToDatabase();

    const referral = await Referral.findOneAndDelete({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(session.tenantId),
    });

    if (!referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Referral deleted successfully" });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
