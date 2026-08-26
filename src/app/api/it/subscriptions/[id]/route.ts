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
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const isPrivileged = ["Admin", "OPS", "Sub Admin"].includes(session.role);

    await connectToDatabase();

    const existing = await ITSubscription.findOne({ _id: id, tenantId: tenantObjectId });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!isPrivileged && !existing.createdBy?.equals(userObjectId) && existing.owner !== session.userName) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to modify this subscription" }, { status: 403 });
    }

    const body = await request.json();
    const { tool, category, plan, costPerMonth, seats, renewalDate, owner, status } = body;
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (tool !== undefined) updatePayload.tool = tool;
    if (category !== undefined) updatePayload.category = category;
    if (plan !== undefined) updatePayload.plan = plan;
    if (costPerMonth !== undefined) updatePayload.costPerMonth = Number(costPerMonth);
    if (seats !== undefined) updatePayload.seats = Number(seats);
    if (renewalDate !== undefined) updatePayload.renewalDate = renewalDate;
    if (owner !== undefined) updatePayload.owner = owner;
    if (status !== undefined) updatePayload.status = status;

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
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const isPrivileged = ["Admin", "OPS", "Sub Admin"].includes(session.role);

    await connectToDatabase();

    const existing = await ITSubscription.findOne({ _id: id, tenantId: tenantObjectId });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!isPrivileged && !existing.createdBy?.equals(userObjectId) && existing.owner !== session.userName) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete this subscription" }, { status: 403 });
    }

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
