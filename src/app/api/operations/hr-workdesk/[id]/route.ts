import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { HRResourceAllocation } from "@/models/HRResourceAllocation";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const body = await request.json();
    await connectToDatabase();

    const allocation = await HRResourceAllocation.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), tenantId: tenantObjectId },
      { $set: body },
      { new: true }
    );

    if (!allocation) return NextResponse.json({ error: "Allocation not found" }, { status: 404 });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "HR_ALLOCATION_UPDATED",
      targetName: allocation.employeeName,
      details: `Updated resource allocation for "${allocation.employeeName}"`,
    });

    return NextResponse.json({ allocation });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authResult = await requireTenantSession(["Admin", "Sub Admin", "OPS"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    await connectToDatabase();

    const allocation = await HRResourceAllocation.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: tenantObjectId,
    });

    if (!allocation) return NextResponse.json({ error: "Allocation not found" }, { status: 404 });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "HR_ALLOCATION_DELETED",
      targetName: allocation.employeeName,
      details: `Deleted resource allocation for "${allocation.employeeName}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
