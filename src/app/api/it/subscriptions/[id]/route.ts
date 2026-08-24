import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITSubscription } from "@/models/ITSubscription";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    await connectToDatabase();

    const { tool, vendor, billingCycle, cost, seats, activeUsers, renewalDate, paymentMethod, status, licenseKey, notes } = body;
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (tool !== undefined) updatePayload.tool = tool;
    if (vendor !== undefined) updatePayload.vendor = vendor;
    if (billingCycle !== undefined) updatePayload.billingCycle = billingCycle;
    if (cost !== undefined) updatePayload.cost = Number(cost);
    if (seats !== undefined) updatePayload.seats = Number(seats);
    if (activeUsers !== undefined) updatePayload.activeUsers = Number(activeUsers);
    if (renewalDate !== undefined) updatePayload.renewalDate = renewalDate ? new Date(renewalDate) : null;
    if (paymentMethod !== undefined) updatePayload.paymentMethod = paymentMethod;
    if (status !== undefined) updatePayload.status = status;
    if (licenseKey !== undefined) updatePayload.licenseKey = licenseKey;
    if (notes !== undefined) updatePayload.notes = notes;

    const updated = await ITSubscription.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: updatePayload },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_SUBSCRIPTION_UPDATED",
      targetName: updated.tool,
      details: `Updated subscription "${updated.tool}" — status: ${updated.status}`,
    });

    return NextResponse.json({ subscription: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/it/subscriptions/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await ITSubscription.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_SUBSCRIPTION_DELETED",
      targetName: deleted.tool,
      details: `Removed subscription "${deleted.tool}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/it/subscriptions/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
