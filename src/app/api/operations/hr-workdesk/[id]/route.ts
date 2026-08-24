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

    const { employeeId, employeeName, department, role, allocatedProject, allocationPercentage, billingRate, skills, startDate, endDate, notes, status } = body;
    const updatePayload: Record<string, unknown> = {};
    if (employeeId !== undefined) updatePayload.employeeId = employeeId ? new mongoose.Types.ObjectId(employeeId) : null;
    if (employeeName !== undefined) updatePayload.employeeName = employeeName;
    if (department !== undefined) updatePayload.department = department;
    if (role !== undefined) updatePayload.role = role;
    if (allocatedProject !== undefined) updatePayload.allocatedProject = allocatedProject;
    if (allocationPercentage !== undefined) updatePayload.allocationPercentage = Number(allocationPercentage);
    if (billingRate !== undefined) updatePayload.billingRate = Number(billingRate);
    if (skills !== undefined) updatePayload.skills = skills;
    if (startDate !== undefined) updatePayload.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updatePayload.endDate = endDate ? new Date(endDate) : null;
    if (notes !== undefined) updatePayload.notes = notes;
    if (status !== undefined) updatePayload.status = status;

    const allocation = await HRResourceAllocation.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), tenantId: tenantObjectId },
      { $set: updatePayload },
      { returnDocument: 'after' }
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
