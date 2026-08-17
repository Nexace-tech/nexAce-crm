import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ExternalTeam } from "@/models/ExternalTeam";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    await connectToDatabase();

    const updated = await ExternalTeam.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ error: "External team member not found." }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "EXTERNAL_TEAM_MEMBER_UPDATED",
      targetName: updated.name,
      details: `Updated external team member: ${updated.name}`,
    });

    return NextResponse.json({ externalMember: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/operations/external-teams/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTenantSession(["Admin", "OPS", "Sub Admin", "Manager"]);
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();
    const deleted = await ExternalTeam.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    if (!deleted) {
      return NextResponse.json({ error: "External team member not found." }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "EXTERNAL_TEAM_MEMBER_DELETED",
      targetName: deleted.name,
      details: `Removed external team member: ${deleted.name}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/operations/external-teams/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
