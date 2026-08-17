import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITDriveLink } from "@/models/ITDriveLink";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

/** PATCH: Update a drive link */
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

    const updated = await ITDriveLink.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: { ...body, updatedAt: new Date() } },
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
      action: "IT_DRIVE_LINK_UPDATED",
      targetName: updated.name,
      details: `Updated file link "${updated.name}"`,
    });

    return NextResponse.json({ link: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("PATCH /api/it/drive-links/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE: Remove a drive link */
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
    const deleted = await ITDriveLink.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_DRIVE_LINK_DELETED",
      targetName: deleted.name,
      details: `Removed file link "${deleted.name}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/it/drive-links/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
