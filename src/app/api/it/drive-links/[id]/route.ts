import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ITDriveLink } from "@/models/ITDriveLink";
import { ActivityLog } from "@/models/ActivityLog";
import { requireTenantSession, isAuthError } from "@/lib/auth-guard";
import mongoose from "mongoose";

const PRIVILEGED = ["Admin", "OPS", "Sub Admin", "Manager", "HR"];

/** PATCH: Update a drive link */
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

    await connectToDatabase();

    const isPrivileged = PRIVILEGED.includes(session.role);
    const existing = await ITDriveLink.findOne({ _id: id, tenantId: tenantObjectId }).lean() as any;

    if (!existing) {
      return NextResponse.json({ error: "Drive link not found" }, { status: 404 });
    }

    // Non-privileged users can only edit links they own or created
    if (!isPrivileged) {
      const ownerName = (existing.owner || "").trim().toLowerCase();
      const currentUserName = (session.userName || "").trim().toLowerCase();
      const isCreator = existing.createdBy && existing.createdBy.toString() === userObjectId.toString();
      if (ownerName !== currentUserName && !isCreator) {
        return NextResponse.json({ error: "Forbidden: You can only edit your own drive links" }, { status: 403 });
      }
    }

    const body = await request.json();
    const {
      name,
      category,
      venture,
      platform,
      link,
      owner,
      accessLevel,
      shareScope,
      sharedWith,
      lastUpdated,
      reviewFrequency,
      notes,
    } = body;

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updatePayload.name = name.trim();
    if (category !== undefined) updatePayload.category = category.trim();
    if (venture !== undefined) updatePayload.venture = venture.trim();
    if (platform !== undefined) updatePayload.platform = platform.trim();
    if (link !== undefined) updatePayload.link = link.trim();
    if (owner !== undefined && (isPrivileged || owner.trim().toLowerCase() === (session.userName || "").toLowerCase())) {
      updatePayload.owner = owner.trim();
    }
    if (accessLevel !== undefined) updatePayload.accessLevel = accessLevel.trim();
    if (shareScope !== undefined) updatePayload.shareScope = shareScope;
    if (sharedWith !== undefined) {
      updatePayload.sharedWith = Array.isArray(sharedWith) ? sharedWith.map((s: string) => s.trim()).filter(Boolean) : [];
    }
    if (lastUpdated !== undefined) updatePayload.lastUpdated = lastUpdated;
    if (reviewFrequency !== undefined) updatePayload.reviewFrequency = reviewFrequency.trim();
    if (notes !== undefined) updatePayload.notes = notes.trim();

    const updated = await ITDriveLink.findOneAndUpdate(
      { _id: id, tenantId: tenantObjectId },
      { $set: updatePayload },
      { returnDocument: "after" }
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
      details: `Updated file link "${updated.name}" (${updated.platform}) — Scope: ${updated.shareScope}`,
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
    const authResult = await requireTenantSession();
    if (isAuthError(authResult)) return authResult;
    const { tenantObjectId, userObjectId, session } = authResult;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    await connectToDatabase();

    const isPrivileged = PRIVILEGED.includes(session.role);
    const existing = await ITDriveLink.findOne({ _id: id, tenantId: tenantObjectId }).lean() as any;

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!isPrivileged) {
      const ownerName = (existing.owner || "").trim().toLowerCase();
      const currentUserName = (session.userName || "").trim().toLowerCase();
      const isCreator = existing.createdBy && existing.createdBy.toString() === userObjectId.toString();
      if (ownerName !== currentUserName && !isCreator) {
        return NextResponse.json({ error: "Forbidden: You can only delete your own drive links" }, { status: 403 });
      }
    }

    const deleted = await ITDriveLink.findOneAndDelete({ _id: id, tenantId: tenantObjectId });

    await ActivityLog.create({
      tenantId: tenantObjectId,
      userId: userObjectId,
      userName: session.userName,
      userRole: session.role,
      action: "IT_DRIVE_LINK_DELETED",
      targetName: existing.name,
      details: `Removed file link "${existing.name}"`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("DELETE /api/it/drive-links/[id] error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
