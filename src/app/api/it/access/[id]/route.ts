import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITAccessEntry } from "@/models/ITAccessEntry";
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

    const { tool, category, assignee, assigneeEmail, roleOrLicense, status, notes } = body;
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (tool !== undefined) updatePayload.tool = tool;
    if (category !== undefined) updatePayload.category = category;
    if (assignee !== undefined) updatePayload.assignee = assignee;
    if (assigneeEmail !== undefined) updatePayload.assigneeEmail = assigneeEmail;
    if (roleOrLicense !== undefined) updatePayload.roleOrLicense = roleOrLicense;
    if (status !== undefined) updatePayload.status = status;
    if (notes !== undefined) updatePayload.notes = notes;

    const updated = await ITAccessEntry.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: updatePayload },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const action = body.status === "Revoked" ? "IT_ACCESS_REVOKED" : body.status === "Suspended" ? "IT_ACCESS_SUSPENDED" : "IT_ACCESS_UPDATED";
    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action,
      targetName: updated.assignee,
      details: `Updated access for ${updated.assignee} on "${updated.tool}" — status: ${updated.status}`,
    });

    return NextResponse.json({ entry: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/it/access/[id] error:", error);
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
    const deleted = await ITAccessEntry.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_ACCESS_DELETED",
      targetName: deleted.assignee,
      details: `Removed access record for ${deleted.assignee} on "${deleted.tool}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/it/access/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
