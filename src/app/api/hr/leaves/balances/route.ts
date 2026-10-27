import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { LeaveBalance } from "@/models/LeaveBalance";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

export async function GET(request: Request) {
  try {
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, session, userObjectId } = authResult;

    const { searchParams } = new URL(request.url);
    const targetUserIdParam = searchParams.get("userId");
    const yearParam = searchParams.get("year");
    const currentYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    await connectToDatabase();

    const isElevated = ["Admin", "SuperAdmin", "OPS", "HR", "Manager"].includes(session.role);
    let targetUserId = userObjectId;

    if (targetUserIdParam && isElevated) {
      if (mongoose.Types.ObjectId.isValid(targetUserIdParam)) {
        targetUserId = new mongoose.Types.ObjectId(targetUserIdParam);
      }
    }

    // Find or initialize leave balance record for the employee and year
    let balance = await LeaveBalance.findOne({
      tenantId: tenantObjectId,
      userId: targetUserId,
      year: currentYear,
    }).populate("userId", "name email department role photoUrl");

    if (!balance) {
      balance = await LeaveBalance.create({
        tenantId: tenantObjectId,
        userId: targetUserId,
        year: currentYear,
        casualLeave: { allocated: 12, used: 0, pending: 0 },
        sickLeave: { allocated: 10, used: 0, pending: 0 },
        earnedLeave: { allocated: 15, used: 0, pending: 0 },
        compOff: { allocated: 0, used: 0, pending: 0 },
        unpaidLeave: { used: 0 },
      });
      await balance.populate("userId", "name email department role photoUrl");
    }

    // If caller wants all team balances (Admin/HR/OPS)
    const listAll = searchParams.get("all") === "true";
    let teamBalances: any[] = [];
    if (listAll && isElevated) {
      teamBalances = await LeaveBalance.find({
        tenantId: tenantObjectId,
        year: currentYear,
      })
        .populate("userId", "name email department role photoUrl")
        .sort({ updatedAt: -1 })
        .lean();
    }

    return NextResponse.json({
      balance,
      teamBalances,
      year: currentYear,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await requireTenantSession(["Admin", "SuperAdmin", "OPS", "HR"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId } = authResult;

    const body = await request.json();
    const { userId, year, casualAllocated, sickAllocated, earnedAllocated, compOffAllocated } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Valid userId is required" }, { status: 400 });
    }

    const currentYear = year ? parseInt(year, 10) : new Date().getFullYear();
    await connectToDatabase();

    const updateQuery: Record<string, unknown> = {};
    if (casualAllocated !== undefined) updateQuery["casualLeave.allocated"] = Math.max(0, Number(casualAllocated));
    if (sickAllocated !== undefined) updateQuery["sickLeave.allocated"] = Math.max(0, Number(sickAllocated));
    if (earnedAllocated !== undefined) updateQuery["earnedLeave.allocated"] = Math.max(0, Number(earnedAllocated));
    if (compOffAllocated !== undefined) updateQuery["compOff.allocated"] = Math.max(0, Number(compOffAllocated));

    const balance = await LeaveBalance.findOneAndUpdate(
      {
        tenantId: tenantObjectId,
        userId: new mongoose.Types.ObjectId(userId),
        year: currentYear,
      },
      { $set: updateQuery },
      { upsert: true, returnDocument: "after" }
    ).populate("userId", "name email department role photoUrl");

    return NextResponse.json({
      success: true,
      message: "Leave balances updated successfully",
      balance,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
