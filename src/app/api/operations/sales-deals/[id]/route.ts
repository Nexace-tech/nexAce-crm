import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { SalesDeal } from "@/models/SalesDeal";
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

    const { dealName, clientName, value, stage, probability, owner, expectedCloseDate, notes, priority } = body;
    const updatePayload: Record<string, unknown> = {};
    if (dealName !== undefined) updatePayload.dealName = dealName;
    if (clientName !== undefined) updatePayload.clientName = clientName;
    if (value !== undefined) updatePayload.value = Number(value);
    if (stage !== undefined) updatePayload.stage = stage;
    if (probability !== undefined) updatePayload.probability = Number(probability);
    if (owner !== undefined) updatePayload.owner = owner;
    if (expectedCloseDate !== undefined) updatePayload.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
    if (notes !== undefined) updatePayload.notes = notes;
    if (priority !== undefined) updatePayload.priority = priority;

    const deal = await SalesDeal.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), tenantId: tenantObjectId },
      { $set: updatePayload },
      { returnDocument: 'after' }
    );

    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "SALES_DEAL_UPDATED",
      targetName: deal.dealName,
      details: `Updated sales deal "${deal.dealName}"`,
    });

    return NextResponse.json({ deal });
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

    const deal = await SalesDeal.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      tenantId: tenantObjectId,
    });

    if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "SALES_DEAL_DELETED",
      targetName: deal.dealName,
      details: `Deleted sales deal "${deal.dealName}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
